// Turns the visitor's trip into a shareable link — still no accounts, no
// server: the whole itinerary is packed into the URL itself. Sending
// someone the link hands them the same day-by-day plan, they can open it
// in their own browser, and importing it doesn't touch what's already in
// theirs unless they choose to.

const PARAM = 'plan';

// Compact JSON tuples — [guideKey, name, day, order, time?] — then
// base64url. JSON (not a hand-rolled delimiter format) so a place name is
// never at risk of colliding with the separator. `time` (minutes from
// midnight, when the sharer edited that stop's clock time) is only
// appended when set, so older 4-element links still read fine.
export function encodePlanToParam(stops) {
  const compact = stops.map((s) => {
    const tuple = [s.guideKey, s.name, s.day || 1, s.order ?? 0];
    if (Number.isFinite(s.time)) tuple.push(Math.round(s.time));
    return tuple;
  });
  const raw = JSON.stringify(compact);
  const b64 = btoa(unescape(encodeURIComponent(raw)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildShareUrl(stops) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.set(PARAM, encodePlanToParam(stops));
  return url.toString();
}

// Returns [{guideKey, name, day, order}] or null if the current URL
// carries no (or an unreadable) shared plan.
export function readSharedPlanFromUrl() {
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(PARAM);
    if (!raw) return null;
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const decoded = decodeURIComponent(escape(atob(padded)));
    const compact = JSON.parse(decoded);
    if (!Array.isArray(compact)) return null;
    const refs = compact
      .map((entry) => {
        if (!Array.isArray(entry) || entry.length < 2) return null;
        const [guideKey, name, day, order, time] = entry;
        if (!guideKey || !name) return null;
        return {
          guideKey,
          name,
          day: Number.isFinite(day) && day >= 1 ? day : 1,
          order: Number.isFinite(order) ? order : 0,
          ...(Number.isFinite(time) ? { time: Math.round(time) } : {}),
        };
      })
      .filter(Boolean);
    return refs.length ? refs : null;
  } catch {
    return null;
  }
}

// Strips the shared-plan param from the URL bar without a page reload,
// once it's been read (accepted or dismissed) — so refreshing later
// doesn't keep re-prompting.
export function clearSharedPlanFromUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(PARAM);
    window.history.replaceState({}, '', url.toString());
  } catch {
    // best-effort only
  }
}
