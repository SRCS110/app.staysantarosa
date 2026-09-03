// A tiny, no-key weather check against open-meteo.com (free, CORS-enabled,
// no signup) for Santa Rosa's coordinates, used only to power the "rainy
// day — here are indoor picks" nudge. Fails silently and returns null on
// any network error or blocked request, since this is a nice-to-have, not
// core functionality, and the app must work exactly as before without it.

const LAT = 38.4404;
const LNG = -122.7141;
const CACHE_KEY = 'ssr-weather-cache-v1';
const CACHE_MS = 30 * 60 * 1000; // 30 minutes — plenty fresh for a same-day nudge

// WMO weather codes open-meteo returns for `current.weather_code` that
// mean rain, drizzle, showers or thunderstorms.
const RAINY_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

export async function getWeatherNudge() {
  try {
    const cached = window.sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.fetchedAt < CACHE_MS) return parsed.result;
    }
  } catch {
    // ignore cache errors, just fetch fresh
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current=weather_code,temperature_2m&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const code = data?.current?.weather_code;
    const tempF = data?.current?.temperature_2m;
    if (code == null) return null;
    const result = { isRainy: RAINY_CODES.has(code), tempF: tempF ?? null };
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), result }));
    } catch {
      // best-effort cache only
    }
    return result;
  } catch {
    return null;
  }
}
