// Device-local storage for the visitor's self-built itinerary. No
// account, no server — matches the app's "nothing stored but locally, and
// only if the visitor builds something" ethos. A plan entry is
// {guideKey, name, visited, day, order, time?} — the minimal ref needed to
// look the place back up in GUIDES_BY_KEY, whether they've checked it off,
// where it sits in the itinerary (`day` a 1-indexed day number, `order` a
// sort key within that day — see lib/itineraryPlanner.js, which assigns
// both automatically and is also what drag-reordering rewrites directly),
// and an optional `time` (minutes-from-midnight) when the visitor has
// overridden the auto-suggested clock time for that stop.

const KEY = 'ssr-plan-v1';

export function loadPlan() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s, i) => ({
      guideKey: s.guideKey,
      name: s.name,
      visited: !!s.visited,
      // Older saved plans (pre-itinerary-builder) had no day/order — treat
      // everything as Day 1 in its existing sequence rather than losing it.
      day: Number.isFinite(s.day) && s.day >= 1 ? Math.round(s.day) : 1,
      order: Number.isFinite(s.order) ? s.order : i,
      ...(Number.isFinite(s.time) ? { time: Math.round(s.time) } : {}),
    }));
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
