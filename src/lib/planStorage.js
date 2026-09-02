// Device-local storage for the visitor's self-built walking plan. No
// account, no server — matches the app's "nothing stored but locally, and
// only if the visitor builds something" ethos. A plan entry is
// {guideKey, name, visited} — the minimal ref needed to look the place back
// up in GUIDES_BY_KEY, plus whether they've checked it off.

const KEY = 'ssr-plan-v1';

export function loadPlan() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s) => ({ guideKey: s.guideKey, name: s.name, visited: !!s.visited }));
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
