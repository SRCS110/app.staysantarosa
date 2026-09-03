// Turns the visitor's plan into a shareable link — still no accounts, no
// server: the whole plan is packed into the URL itself. Sending someone
// the link hands them the same plan, they can open it in their own
// browser, and importing it doesn't touch what's already in theirs unless
// they choose to.

const PARAM = 'plan';

// Compact, URL-safe encoding: "guideKey:name|guideKey:name|..." then
// base64url. Simple beats clever here — plans are a handful of stops, and
// this stays trivially readable if anyone inspects the URL.
export function encodePlanToParam(stops) {
  const raw = stops.map((s) => `${s.guideKey}:${s.name}`).join('|');
  const b64 = btoa(unescape(encodeURIComponent(raw)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildShareUrl(stops) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.set(PARAM, encodePlanToParam(stops));
  return url.toString();
}

// Returns [{guideKey, name}] or null if the current URL carries no
// (or an unreadable) shared plan.
export function readSharedPlanFromUrl() {
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(PARAM);
    if (!raw) return null;
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const decoded = decodeURIComponent(escape(atob(padded)));
    const refs = decoded
      .split('|')
      .map((token) => {
        const idx = token.indexOf(':');
        if (idx === -1) return null;
        return { guideKey: token.slice(0, idx), name: token.slice(idx + 1) };
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
