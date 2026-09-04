// Turns the visitor's trip into a shareable link — still no accounts, no
// server: the whole itinerary is packed into the URL itself. Sending
// someone the link hands them the same day-by-day plan, they can open it
// in their own browser, and importing it doesn't touch what's already in
// theirs unless they choose to.

const PARAM = 'plan';

// Compact JSON tuples — [guideKey, name, day, order, durationMin, startMin,
// note] — then base64url. JSON (not a hand-rolled delimiter format) so a
// place name is never at risk of colliding with the separator.
//
// `day` is 0 for a saved-but-unscheduled stop (JSON has no shorter null),
// and the tuple is trimmed of trailing empties so a plain plan produces a
// short link. Readers below tolerate any tuple length, so links made by
// older builds (which only carried the first four values) still open.
// Trims only the optional tail (duration, pinned time, note). The first
// four values always stay: `day` is 0 for an unscheduled stop, and trimming
// a trailing 0 away would make it read as a *missing* day — which the
// decoder treats as a legacy link and resolves to Day 1, quietly scheduling
// something the sharer had deliberately left unscheduled.
function trimTuple(tuple) {
  const out = tuple.slice();
  while (out.length > 4 && (out[out.length - 1] === null || out[out.length - 1] === 0)) out.pop();
  return out;
}

export function encodePlanToParam(stops) {
  const compact = stops.map((s) =>
    trimTuple([
      s.guideKey,
      s.name,
      s.day == null ? 0 : s.day,
      s.order ?? 0,
      Number.isFinite(s.durationMin) ? s.durationMin : null,
      Number.isFinite(s.startMin) ? s.startMin : null,
      s.note || null,
    ])
  );
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
        const [guideKey, name, day, order, durationMin, startMin, note] = entry;
        if (!guideKey || !name) return null;
        return {
          guideKey,
          name,
          // A missing day means this link came from an older build, where
          // everything was scheduled — Day 1 is the right reading there.
          // An explicit 0 means the sharer had it saved but unscheduled.
          day: Number.isFinite(day) ? (day >= 1 ? day : null) : 1,
          order: Number.isFinite(order) ? order : 0,
          durationMin: Number.isFinite(durationMin) && durationMin > 0 ? durationMin : null,
          startMin: Number.isFinite(startMin) && startMin >= 0 && startMin < 1440 ? startMin : null,
          note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 280) : null,
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
