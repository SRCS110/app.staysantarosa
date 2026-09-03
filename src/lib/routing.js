// Walking-route geometry for the Map screen's route line, so it follows
// sidewalks/streets instead of cutting straight through blocks.
//
// Uses the FOSSGIS public OSRM instance (routed-foot profile) — keyless,
// no account, CORS-open, same "free external service" tier as the
// open-meteo weather call. It's best-effort: every caller already draws a
// straight-line fallback first and only upgrades to the routed geometry
// if this resolves, so a blocked/slow/offline request just leaves the
// simple line in place. Per-request results are memoised (including
// failures) so repeated map redraws don't re-hit the server.

const OSRM_FOOT = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/';

const cache = new Map();

function keyFor(points) {
  return points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');
}

// points: [{ lat, lng }] in visiting order (2+). Resolves to an array of
// [lat, lng] pairs tracing the walking route, or null if unavailable.
export async function fetchWalkingRoute(points) {
  if (!Array.isArray(points) || points.length < 2) return null;

  const key = keyFor(points);
  if (cache.has(key)) return cache.get(key);

  const coordStr = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_FOOT}${coordStr}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    const coords = data && data.routes && data.routes[0] && data.routes[0].geometry
      ? data.routes[0].geometry.coordinates
      : null;
    if (!Array.isArray(coords) || coords.length < 2) throw new Error('no geometry');
    const latlngs = coords.map(([lng, lat]) => [lat, lng]);
    cache.set(key, latlngs);
    return latlngs;
  } catch {
    cache.set(key, null); // negative-cache this exact stop set for the session
    return null;
  }
}
