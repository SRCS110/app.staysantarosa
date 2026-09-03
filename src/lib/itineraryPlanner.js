// The itinerary builder's brain: turns a flat list of plan stops into a
// day-by-day route with suggested clock times. Runs entirely on-device,
// re-runnable any time via the Plan tab's "Auto-arrange" button, and never
// authoritative — dragging a stop to a new spot always wins over whatever
// this suggested.
//
// Three passes:
//   1. Group stops into `tripDays` day-buckets by geography (a light
//      k-means over lat/lng), closest-to-home bucket first, so each day
//      covers a walkable area instead of zig-zagging across town. An
//      event with a real calendar date inside the trip's own date range
//      is pinned to its matching day instead of being clustered.
//   2. Within a day, order stops by a coarse time-of-day slot (breakfast
//      → morning → lunch → afternoon/wine → dinner → evening), then by
//      nearest-neighbor within a slot so the walk stays sensible.
//   3. Derive a suggested clock time for each stop by walking the ordered
//      list forward from a 9 AM start, adding real travel time (via
//      lib/geo.js) plus a per-category dwell estimate. Times are always
//      derived from the current order, never stored — so a drag-reorder
//      instantly implies new times with no extra bookkeeping.

import { haversineMiles, estimateFrom } from './geo.js';
import { mealSlotHint, formatMinutes } from './hours.js';

const SLOT = { breakfast: 0, morning: 1, lunch: 2, wine: 3, afternoon: 3.5, dinner: 4, evening: 5 };
// A floor each slot's suggested time never falls earlier than — keeps a
// "dinner" stop from showing up at 12:44 PM just because it happened to
// be the fourth thing that day. Only ever pushes the clock forward.
const SLOT_ANCHOR_MINUTES = {
  [SLOT.breakfast]: 8 * 60,
  [SLOT.morning]: 9 * 60 + 30,
  [SLOT.lunch]: 11 * 60 + 30,
  [SLOT.wine]: 13 * 60,
  [SLOT.afternoon]: 13 * 60,
  [SLOT.dinner]: 17 * 60 + 30,
  [SLOT.evening]: 19 * 60,
};
const DWELL_MINUTES = { dining: 75, wine: 90, attractions: 60, events: 90 };
const DAY_START_MINUTES = 9 * 60; // 9:00 AM

// Suggested times are shown on a 30-minute grid — nobody plans a vacation
// day down to "10:47 AM". Derived arrivals are rounded up to the next
// half hour (never down, so the clock still allows for real travel time).
const TIME_STEP_MINUTES = 30;
const LATEST_AUTO_MINUTES = 23 * 60 + 30; // 11:30 PM
const roundUpToStep = (mins) => Math.ceil(mins / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
const normalizeMinutes = (mins) => (((Math.round(mins) % 1440) + 1440) % 1440);

export function slotFor(place) {
  if (place.guideKey === 'dining') {
    const hint = mealSlotHint(place.hours);
    if (hint === 'breakfast') return SLOT.breakfast;
    if (hint === 'dinner') return SLOT.dinner;
    return SLOT.lunch;
  }
  if (place.guideKey === 'wine') return SLOT.wine;
  if (place.guideKey === 'attractions') return SLOT.morning;
  if (place.guideKey === 'events') {
    const d = place.dateStart ? new Date(place.dateStart) : null;
    if (d && !Number.isNaN(d.getTime())) {
      const h = d.getHours();
      if (h && h < 11) return SLOT.morning;
      if (h && h < 16) return SLOT.afternoon;
    }
    return SLOT.evening;
  }
  return SLOT.afternoon;
}

function dwellFor(place) {
  if (place.guideKey === 'events' && place.dateStart && place.dateEnd) {
    const start = new Date(place.dateStart).getTime();
    const end = new Date(place.dateEnd).getTime();
    const mins = (end - start) / 60000;
    if (Number.isFinite(mins) && mins > 0) return Math.min(240, Math.round(mins));
  }
  return DWELL_MINUTES[place.guideKey] || 60;
}

// Light k-means over {lat,lng}, seeded from evenly-spaced points along a
// longitude sort so it's deterministic rather than random. Good enough for
// grouping a handful of downtown/wine-country stops into walkable-ish
// day clusters — this isn't trying to be an optimal solver.
function kmeansLabels(points, k) {
  if (k <= 1 || points.length <= 1) return points.map(() => 0);
  const order = points.map((_, i) => i).sort((a, b) => points[a].lng - points[b].lng);
  const centroids = [];
  for (let i = 0; i < k; i += 1) {
    const idx = order[Math.min(order.length - 1, Math.floor(((i + 0.5) * order.length) / k))];
    centroids.push({ lat: points[idx].lat, lng: points[idx].lng });
  }
  let labels = points.map(() => 0);
  for (let iter = 0; iter < 8; iter += 1) {
    labels = points.map((p) => {
      let best = 0;
      let bestDist = Infinity;
      centroids.forEach((c, ci) => {
        const d = (p.lat - c.lat) ** 2 + (p.lng - c.lng) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = ci;
        }
      });
      return best;
    });
    const sums = centroids.map(() => ({ lat: 0, lng: 0, n: 0 }));
    points.forEach((p, i) => {
      const s = sums[labels[i]];
      s.lat += p.lat;
      s.lng += p.lng;
      s.n += 1;
    });
    sums.forEach((s, i) => {
      if (s.n > 0) centroids[i] = { lat: s.lat / s.n, lng: s.lng / s.n };
    });
  }
  return labels;
}

// Steals one stop from the fullest day to fill any day left with zero
// stops, so a 3-day trip with plenty of stops doesn't leave a day blank
// just because k-means happened to collapse two clusters together.
function fillEmptyDays(labels, k) {
  const counts = new Array(k).fill(0);
  labels.forEach((l) => {
    counts[l] += 1;
  });
  for (let d = 0; d < k; d += 1) {
    if (counts[d] > 0) continue;
    let largest = counts.indexOf(Math.max(...counts));
    if (counts[largest] <= 1) break;
    const idx = labels.indexOf(largest);
    labels[idx] = d;
    counts[largest] -= 1;
    counts[d] += 1;
  }
  return labels;
}

function nearestNeighborOrder(stops, startPoint) {
  const bySlot = new Map();
  stops.forEach((s) => {
    const slot = slotFor(s);
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot).push(s);
  });
  const slots = [...bySlot.keys()].sort((a, b) => a - b);
  const ordered = [];
  let cursor = startPoint;
  slots.forEach((slot) => {
    const remaining = bySlot.get(slot).slice();
    while (remaining.length) {
      let bestIdx = 0;
      let bestDist = Infinity;
      remaining.forEach((p, i) => {
        const d = haversineMiles(cursor, p);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      const [next] = remaining.splice(bestIdx, 1);
      ordered.push(next);
      cursor = next;
    }
  });
  return ordered;
}

// Given a day's stops already in visit order (from auto-arrange, or from
// a manual drag), returns the same places with a `suggestedMinutes`
// (minutes-from-midnight, on a 30-min grid), `suggestedTime` (formatted)
// and `timeEdited` (true when the visitor set the time by hand) attached.
// The derived times are never persisted — always recomputed from whatever
// order is current — but a per-stop `time` override IS persisted and wins
// here, and also carries the clock forward for the stops after it.
export function suggestTimesForDay(orderedStops, homeOrigin) {
  let clock = DAY_START_MINUTES;
  let cursor = homeOrigin;
  return orderedStops.map((place) => {
    const travel = cursor ? estimateFrom(cursor, place) : { min: 0 };
    let arrival = clock + travel.min;
    let fixedTime = false;

    // 1. The visitor's own edited time wins over everything.
    if (Number.isFinite(place.time)) {
      arrival = normalizeMinutes(place.time);
      fixedTime = true;
    } else if (place.guideKey === 'events' && place.dateStart) {
      // 2. A real event with its own time of day (not just a bare date)
      //    is a fixed commitment — honor it over the derived sequence.
      const d = new Date(place.dateStart);
      if (!Number.isNaN(d.getTime()) && d.getHours() >= 6) {
        arrival = d.getHours() * 60 + d.getMinutes();
        fixedTime = true;
      }
    }

    if (!fixedTime) {
      const anchor = SLOT_ANCHOR_MINUTES[slotFor(place)];
      if (anchor != null && anchor > arrival) arrival = anchor;
      arrival = roundUpToStep(arrival);
      // Don't let an auto-derived time roll into the small hours (e.g. when
      // it's cascading off a very late hand-set stop) — park it at 11:30 PM.
      if (arrival > LATEST_AUTO_MINUTES) arrival = LATEST_AUTO_MINUTES;
    }

    const suggestedMinutes = arrival;
    clock = arrival + dwellFor(place);
    cursor = place;
    return {
      ...place,
      suggestedMinutes,
      suggestedTime: formatMinutes(suggestedMinutes),
      timeEdited: Number.isFinite(place.time),
    };
  });
}

function daysBetween(startIso, targetIso) {
  const a = new Date(`${startIso}T00:00:00`);
  const b = new Date(`${targetIso}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// The main entry point. `places` is the resolved plan-stop objects
// (guideKey, name, lat, lng, hours/dateStart as applicable). `trip` is
// {days, startDate|null}. `homeOrigin` is {lat,lng} — where each day's
// first travel-time estimate starts from. Returns a flat array of
// {guideKey, name, day, order} ready to hand back to setPlanStops.
export function autoArrangePlan(places, trip, homeOrigin) {
  if (!places.length) return [];
  const tripDays = Math.max(1, trip?.days || 1);

  const fixed = new Map(); // dayNumber -> places[]
  const flexible = [];
  places.forEach((p) => {
    if (p.guideKey === 'events' && p.dateStart && trip?.startDate) {
      const dayOffset = daysBetween(trip.startDate, p.dateStart.slice(0, 10));
      if (dayOffset != null && dayOffset >= 0 && dayOffset < tripDays) {
        const day = dayOffset + 1;
        if (!fixed.has(day)) fixed.set(day, []);
        fixed.get(day).push(p);
        return;
      }
    }
    flexible.push(p);
  });

  const k = Math.max(1, Math.min(tripDays, flexible.length || 1));
  let dayIndexForFlexible = [];
  if (flexible.length) {
    const labels = fillEmptyDays(kmeansLabels(flexible, k), k);
    const centroids = Array.from({ length: k }, (_, label) => {
      const pts = flexible.filter((_, i) => labels[i] === label);
      if (!pts.length) return null;
      const lat = pts.reduce((sum, p) => sum + p.lat, 0) / pts.length;
      const lng = pts.reduce((sum, p) => sum + p.lng, 0) / pts.length;
      return { lat, lng };
    });
    const rankByDistance = centroids
      .map((c, label) => ({ label, dist: c ? haversineMiles(homeOrigin, c) : Infinity }))
      .sort((a, b) => a.dist - b.dist);
    const labelToDay = new Array(k);
    rankByDistance.forEach(({ label }, dayIdx) => {
      labelToDay[label] = dayIdx + 1;
    });
    dayIndexForFlexible = labels.map((l) => labelToDay[l]);
  }

  const byDay = new Map();
  flexible.forEach((p, i) => {
    const day = dayIndexForFlexible[i];
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(p);
  });
  fixed.forEach((stops, day) => {
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.set(day, byDay.get(day).concat(stops));
  });

  const result = [];
  byDay.forEach((stops, day) => {
    const ordered = nearestNeighborOrder(stops, homeOrigin);
    ordered.forEach((p, order) => {
      result.push({ guideKey: p.guideKey, name: p.name, day, order });
    });
  });
  return result;
}
