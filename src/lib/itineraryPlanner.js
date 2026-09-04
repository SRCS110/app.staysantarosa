// The itinerary builder's brain. Runs entirely on-device, no API, no
// routing service — straight-line distance estimates and this file's own
// heuristics are all it has, and it is written to be honest about that.
//
// Structure follows the model the established day-planners converged on
// (Sygic Travel's public trip schema, Wanderlog's list/day mechanics,
// TripIt's derived-timeline approach), adapted to a fixed local dataset:
//
//   • A place's *typical visit duration* is a property of the place;
//     a stop's duration starts as a copy of it and is then the visitor's
//     to change. Duration is what actually drives the day's clock.
//   • A stop's time is DERIVED from the day's running schedule unless the
//     visitor pins one. Derived times are never stored — they're recomputed
//     from whatever order is current, so a drag instantly implies new times
//     with no stale bookkeeping. Pinned times are stored and are treated as
//     hard commitments the rest of the day builds around.
//   • Travel between consecutive stops is a property of the *arriving*
//     stop (`travel`), so inserting or removing a stop only invalidates
//     its own leg and the following one — nothing else needs recomputing.
//   • A day reports its own totals (time at stops, time travelling, end
//     time), and legs whose duration is unknown are excluded from the
//     totals rather than being counted as zero.
//
// Nothing here fabricates data. Visit durations are category-level
// estimates made by this app (documented below, not sourced from the
// site), event durations come from the event's own start/end when it has
// them, and opening-hours checks only run when the trip has a real start
// date — without one the app cannot know which weekday a stop falls on, so
// it stays silent instead of guessing.

import { haversineMiles, estimateFrom } from './geo.js';
import { mealSlotHint, formatMinutes, isOpenAt, windowLabelForWeekday } from './hours.js';

const SLOT = { breakfast: 0, morning: 1, lunch: 2, wine: 3, afternoon: 3.5, dinner: 4, evening: 5 };

// A floor each slot's derived time never falls earlier than — keeps a
// "dinner" stop from showing up at 12:44 PM just because it happened to be
// the fourth thing that day. Only ever pushes the clock forward.
const SLOT_ANCHOR_MINUTES = {
  [SLOT.breakfast]: 8 * 60,
  [SLOT.morning]: 9 * 60 + 30,
  [SLOT.lunch]: 11 * 60 + 30,
  [SLOT.wine]: 13 * 60,
  [SLOT.afternoon]: 13 * 60,
  [SLOT.dinner]: 17 * 60 + 30,
  [SLOT.evening]: 19 * 60,
};

// This app's own typical-visit estimates, by guide — NOT sourced from
// staysantarosa.com, which publishes no visit durations. They exist to give
// the schedule a realistic shape out of the box; every one is overridable
// per stop, and the UI presents them as estimates.
export const DEFAULT_DURATION_MIN = { dining: 75, wine: 90, attractions: 60, events: 120 };
const FALLBACK_DURATION_MIN = 60;

// Options a visitor can pick from when changing a stop's length.
export const DURATION_CHOICES = [30, 45, 60, 90, 120, 180];

// A place's typical visit length. An event that carries a real start AND
// end gets its actual published length (capped at 4h so an all-day festival
// doesn't swallow the whole schedule); everything else gets its guide's
// category estimate.
export function placeDurationMin(place) {
  if (place.guideKey === 'events' && place.dateStart && place.dateEnd) {
    const start = new Date(place.dateStart).getTime();
    const end = new Date(place.dateEnd).getTime();
    const mins = (end - start) / 60000;
    if (Number.isFinite(mins) && mins > 0) return Math.min(240, Math.round(mins));
  }
  return DEFAULT_DURATION_MIN[place.guideKey] || FALLBACK_DURATION_MIN;
}

// The duration actually used for a stop: the visitor's override if they set
// one, otherwise the place's estimate.
export function stopDurationMin(stop) {
  return Number.isFinite(stop.durationMin) && stop.durationMin > 0 ? stop.durationMin : placeDurationMin(stop);
}

// An event with a real time of day is a fixed commitment even if the
// visitor never explicitly pinned it — the event starts when it starts.
export function implicitStartMin(place) {
  if (place.guideKey !== 'events' || !place.dateStart) return null;
  const d = new Date(place.dateStart);
  if (Number.isNaN(d.getTime())) return null;
  const mins = d.getHours() * 60 + d.getMinutes();
  return d.getHours() >= 6 ? mins : null;
}

// The clock time a stop is anchored to, if any: an explicit pin beats an
// event's own published time.
export function anchorStartMin(stop) {
  if (Number.isFinite(stop.startMin)) return stop.startMin;
  return implicitStartMin(stop);
}

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
    const start = implicitStartMin(place);
    if (start != null) {
      if (start < 11 * 60) return SLOT.morning;
      if (start < 16 * 60) return SLOT.afternoon;
    }
    return SLOT.evening;
  }
  return SLOT.afternoon;
}

export function formatDuration(min) {
  if (!Number.isFinite(min) || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── The day schedule ──────────────────────────────────────────────────────
//
// Walks a day's stops in order, carrying a clock forward through travel and
// dwell time, and returns everything the UI needs to render that day:
// per-stop arrival/departure, the travel leg that got there, any warnings,
// and the day's own totals. Pure — no storage, no side effects — so it can
// be called freely on every render.
//
// `weekdayIndex` may be null (trip has no start date); opening-hours checks
// are skipped entirely in that case rather than guessed at.
export function buildDaySchedule(orderedStops, options = {}) {
  const { origin = null, dayStartMin = 9 * 60, dayEndMin = 22 * 60, weekdayIndex = null } = options;

  let clock = dayStartMin;
  let cursor = origin;
  let travelTotal = 0;
  let dwellTotal = 0;
  const rows = [];

  orderedStops.forEach((stop) => {
    const travel = cursor ? estimateFrom(cursor, stop) : null;
    const earliest = clock + (travel ? travel.min : 0);
    const duration = stopDurationMin(stop);
    const anchor = anchorStartMin(stop);
    const warnings = [];

    let arriveMin;
    if (anchor != null) {
      arriveMin = anchor;
      // The visitor committed to a time the running schedule can't reach —
      // say so plainly rather than silently rewriting either one.
      if (anchor < earliest) {
        warnings.push({
          kind: 'tight',
          text: `Only reachable by ${formatMinutes(earliest)} at this point in the day`,
        });
      }
    } else {
      arriveMin = earliest;
      const floor = SLOT_ANCHOR_MINUTES[slotFor(stop)];
      if (floor != null && floor > arriveMin) arriveMin = floor;
    }

    if (weekdayIndex != null) {
      const open = isOpenAt(stop.hours, weekdayIndex, arriveMin);
      if (open === false) {
        const label = windowLabelForWeekday(stop.hours, weekdayIndex);
        warnings.push({
          kind: 'closed',
          text: label === 'Closed' ? 'Closed this day' : `Closed at ${formatMinutes(arriveMin)} — open ${label}`,
        });
      }
    }

    const departMin = arriveMin + duration;
    if (travel) travelTotal += travel.min;
    dwellTotal += duration;

    rows.push({
      ...stop,
      travel,
      arriveMin,
      departMin,
      durationMin: duration,
      isDurationOverridden: Number.isFinite(stop.durationMin) && stop.durationMin > 0,
      pinnedMin: Number.isFinite(stop.startMin) ? stop.startMin : null,
      isTimeFixed: anchor != null,
      isEventTime: !Number.isFinite(stop.startMin) && anchor != null,
      arriveLabel: formatMinutes(arriveMin),
      departLabel: formatMinutes(departMin),
      warnings,
    });

    clock = departMin;
    cursor = stop;
  });

  const endMin = rows.length ? rows[rows.length - 1].departMin : null;
  const dayWarnings = [];
  if (endMin != null && endMin > dayEndMin) {
    dayWarnings.push({
      kind: 'long',
      text: `Runs to ${formatMinutes(endMin)} — past your ${formatMinutes(dayEndMin)} wrap-up`,
    });
  }

  return {
    rows,
    startMin: rows.length ? rows[0].arriveMin : null,
    endMin,
    travelMin: travelTotal,
    dwellMin: dwellTotal,
    totalMin: rows.length ? endMin - dayStartMin : 0,
    warnings: dayWarnings,
  };
}

// ── Ordering ──────────────────────────────────────────────────────────────

// Light k-means over {lat,lng}, seeded from evenly-spaced points along a
// longitude sort so it's deterministic rather than random. Good enough for
// grouping a handful of downtown/wine-country stops into walkable-ish day
// clusters — this isn't trying to be an optimal solver.
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
    const largest = counts.indexOf(Math.max(...counts));
    if (counts[largest] <= 1) break;
    const idx = labels.indexOf(largest);
    labels[idx] = d;
    counts[largest] -= 1;
    counts[d] += 1;
  }
  return labels;
}

// Roughly what a day's stops will cost in minutes — dwell plus a flat
// per-hop travel allowance. Deliberately cheap and approximate: this only
// decides how to *balance* days, and the real per-leg numbers come from
// buildDaySchedule afterwards.
const HOP_ALLOWANCE_MIN = 12;
function dayLoadMinutes(stops) {
  const dwell = stops.reduce((sum, p) => sum + stopDurationMin(p), 0);
  return dwell + Math.max(0, stops.length - 1) * HOP_ALLOWANCE_MIN;
}

function centroidOf(stops) {
  if (!stops.length) return null;
  return {
    lat: stops.reduce((s, p) => s + p.lat, 0) / stops.length,
    lng: stops.reduce((s, p) => s + p.lng, 0) / stops.length,
  };
}

// Clustering alone reliably produces lopsided days — downtown is dense, so
// one bucket swallows most of the trip while another gets a single stop.
// This is the repair pass: while some day is over its time budget and
// another has room, move one stop across, choosing the stop that fits the
// receiving day geographically (or, for an empty day, the heavy day's
// farthest-out stop, so the new day is seeded with its own area rather
// than a stop torn out of the middle of a walkable cluster).
//
// Stops fixed to a day by their own calendar date never move. Bounded
// iterations, and it stops as soon as no day is over budget — this is a
// balancing heuristic, not a solver.
function rebalanceDays(byDay, tripDays, budgetMin) {
  for (let pass = 0; pass < 16; pass += 1) {
    let heavy = null;
    let light = null;
    for (let d = 1; d <= tripDays; d += 1) {
      const load = dayLoadMinutes(byDay.get(d) || []);
      if (!heavy || load > heavy.load) heavy = { day: d, load };
      if (!light || load < light.load) light = { day: d, load };
    }
    if (!heavy || !light || heavy.day === light.day) return;
    // Two reasons to move a stop: a day that genuinely won't fit in the
    // hours available, and — just as important — a day carrying most of the
    // trip while another carries almost nothing. A 6/3/1 split isn't
    // over-booked, it's simply not what someone asked for when they said
    // they had three days.
    const spread = heavy.load - light.load;
    if (heavy.load <= budgetMin && spread <= Math.max(90, budgetMin * 0.25)) return;

    const heavyStops = byDay.get(heavy.day) || [];
    const movable = heavyStops.filter((p) => !p.__fixedDay);
    if (movable.length < 2) return;

    const lightStops = byDay.get(light.day) || [];
    const target = centroidOf(lightStops);
    let pick;
    if (target) {
      pick = movable.reduce((best, p) =>
        haversineMiles(p, target) < haversineMiles(best, target) ? p : best
      );
    } else {
      const heavyCentroid = centroidOf(heavyStops);
      pick = movable.reduce((best, p) =>
        haversineMiles(p, heavyCentroid) > haversineMiles(best, heavyCentroid) ? p : best
      );
    }
    // Only accept a move that strictly lowers the worst day's load. That
    // guarantees this terminates instead of ping-ponging one stop between
    // two days forever.
    const afterHeavy = dayLoadMinutes(heavyStops.filter((p) => p !== pick));
    const afterLight = dayLoadMinutes([...lightStops, pick]);
    if (Math.max(afterHeavy, afterLight) >= heavy.load) return;

    byDay.set(
      heavy.day,
      heavyStops.filter((p) => p !== pick)
    );
    byDay.set(light.day, [...lightStops, pick]);
  }
}

// Orders one day's stops: fixed-time stops (a pinned reservation, an event
// with a published start) hold their place on the clock, and everything
// else is sequenced by time-of-day slot, then nearest-neighbor within the
// slot so the walking stays sensible.
export function orderDayStops(stops, startPoint) {
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
    const group = bySlot.get(slot);
    // Within a slot, anything with a fixed clock time goes in clock order
    // first — a 6:30 seating can't be shuffled to suit the walking route.
    const fixed = group.filter((s) => anchorStartMin(s) != null).sort((a, b) => anchorStartMin(a) - anchorStartMin(b));
    const remaining = group.filter((s) => anchorStartMin(s) == null);
    fixed.forEach((s) => {
      ordered.push(s);
      cursor = s;
    });
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

function daysBetween(startIso, targetIso) {
  const a = new Date(`${startIso}T00:00:00`);
  const b = new Date(`${targetIso}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// Reorders ONE day, leaving every other day untouched — the single-day
// scope the mainstream planners settled on, because a whole-trip reshuffle
// throws away decisions the visitor already made. Returns [{guideKey, name,
// day, order}] for just that day.
export function optimizeDay(dayStops, day, homeOrigin) {
  const ordered = orderDayStops(dayStops, homeOrigin);
  return ordered.map((p, order) => ({ guideKey: p.guideKey, name: p.name, day, order }));
}

// The whole-plan arrange. `places` is the resolved plan-stop objects
// (guideKey, name, lat, lng, hours/dateStart/startMin as applicable),
// INCLUDING ones currently sitting unscheduled in the saved tray — placing
// those is most of the point. `trip` is {days, startDate}. `homeOrigin` is
// where each day's first travel estimate starts from.
//
// Returns a flat array of {guideKey, name, day, order} for the caller to
// apply. Callers should snapshot the plan first: this deliberately
// overrides manual arrangement, and is only ever run on an explicit tap.
export function autoArrangePlan(places, trip, homeOrigin) {
  if (!places.length) return [];
  const tripDays = Math.max(1, trip?.days || 1);
  const dayStart = Number.isFinite(trip?.dayStartMin) ? trip.dayStartMin : 9 * 60;
  const dayEnd = Number.isFinite(trip?.dayEndMin) ? trip.dayEndMin : 22 * 60;
  const budgetMin = Math.max(120, dayEnd - dayStart);

  const fixed = new Map(); // dayNumber -> places[]
  const flexible = [];
  places.forEach((p) => {
    // An event on a real calendar date inside the trip belongs on that
    // day — no clustering decision to make.
    if (p.guideKey === 'events' && p.dateStart && trip?.startDate) {
      const dayOffset = daysBetween(trip.startDate, p.dateStart.slice(0, 10));
      if (dayOffset != null && dayOffset >= 0 && dayOffset < tripDays) {
        const day = dayOffset + 1;
        if (!fixed.has(day)) fixed.set(day, []);
        // Marked so the rebalancing pass below never moves it — this stop's
        // day is a fact about the event, not a scheduling choice.
        fixed.get(day).push({ ...p, __fixedDay: true });
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

  rebalanceDays(byDay, tripDays, budgetMin);

  const result = [];
  byDay.forEach((stops, day) => {
    result.push(...optimizeDay(stops, day, homeOrigin));
  });
  return result;
}
