// Device-local storage for the visitor's self-built itinerary. No account,
// no server — matches the app's "nothing stored but locally, and only if
// the visitor builds something" ethos.
//
// A plan entry is the minimal reference needed to look the place back up in
// GUIDES_BY_KEY, plus this visitor's own decisions about it:
//
//   guideKey, name   — the lookup key into data/guides.js
//   visited          — checked off on the trip
//   day              — 1-indexed day number, or NULL for "saved but not
//                      scheduled yet". This null state is deliberate and
//                      load-bearing: a place you're interested in and a
//                      place you've committed to a day are different things,
//                      and forcing everything onto Day 1 (as this app used
//                      to) collapses that distinction and makes the plan
//                      lie about what's actually scheduled.
//   order            — sort key within its day (or within the saved tray)
//   durationMin      — how long to spend here. NULL means "use the
//                      category default" (lib/itineraryPlanner.js's
//                      placeDurationMin); a number is this visitor's own
//                      override. Stored per stop, not per place, so the
//                      same restaurant can get 45 minutes on one trip and
//                      two hours on another.
//   startMin         — a PINNED clock time (minutes from midnight), or
//                      null. Null is the normal case: the time shown is
//                      derived from the day's running schedule. A pinned
//                      time is a real commitment (a reservation, a tour
//                      slot) that the scheduler must honor and build
//                      around rather than recompute away.
//   note             — the visitor's own free text for this stop.
//
// Everything except guideKey/name is optional and nullable, and the loader
// below fills in safe defaults, so a plan saved by an older build of the
// app (which only had guideKey/name/visited/day/order) still loads intact.

const KEY = 'ssr-plan-v1';

const clampMinutes = (v) => (Number.isFinite(v) && v >= 0 && v < 1440 ? Math.round(v) : null);

function normalizeStop(s, i) {
  if (!s || typeof s.guideKey !== 'string' || typeof s.name !== 'string') return null;
  return {
    guideKey: s.guideKey,
    name: s.name,
    visited: !!s.visited,
    // `day: null` is the saved-but-unscheduled tray. Anything that isn't a
    // usable day number becomes null rather than being forced onto Day 1 —
    // except that plans written by the pre-null builds always carried a
    // real day, so nothing existing is silently unscheduled by this.
    day: Number.isFinite(s.day) && s.day >= 1 ? Math.round(s.day) : s.day === null ? null : 1,
    order: Number.isFinite(s.order) ? s.order : i,
    durationMin: Number.isFinite(s.durationMin) && s.durationMin > 0 ? Math.round(s.durationMin) : null,
    startMin: clampMinutes(s.startMin),
    note: typeof s.note === 'string' && s.note.trim() ? s.note.trim().slice(0, 280) : null,
  };
}

export function loadPlan() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStop).filter(Boolean);
  } catch {
    return [];
  }
}

export function savePlan(stops) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stops));
  } catch {
    // best-effort only — a full/blocked localStorage shouldn't break the app
  }
}

export const stopId = (ref) => `${ref.guideKey}:${ref.name}`;

// A blank stop record for a newly added place. Callers set `day`/`order`.
export function newStop(guideKey, name, extra = {}) {
  return {
    guideKey,
    name,
    visited: false,
    day: null,
    order: 0,
    durationMin: null,
    startMin: null,
    note: null,
    ...extra,
  };
}
