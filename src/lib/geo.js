// Shared distance/time helpers. Used at build time (see data/guides.js
// comments) for the static from-hotel numbers, and live in the browser to
// estimate distance from the visitor's own location once they opt in.

export function haversineMiles(a, b) {
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

export function walkMinutes(miles) {
  return Math.max(1, Math.ceil((miles / 2.9) * 60));
}

export function driveMinutes(miles) {
  return Math.max(4, Math.ceil((miles / 22) * 60) + 2);
}

// Live estimate from an arbitrary point (the visitor) to a place — mirrors
// the walk/drive threshold used to precompute the static hotel numbers.
export function estimateFrom(origin, place) {
  const miles = haversineMiles(origin, place);
  if (miles <= 1.0) {
    return { min: walkMinutes(miles), mode: 'walk', miles };
  }
  return { min: driveMinutes(miles), mode: 'drive', miles };
}

export function formatMiles(miles) {
  if (miles < 0.1) return 'under 0.1 mi';
  return `${miles.toFixed(1)} mi`;
}

// Walking-time rings (direction 1c) — radius in meters for a given number
// of minutes at the same average pace used for the static hotel numbers.
export const RING_MINUTES = [5, 12, 25];
const MILES_TO_METERS = 1609.34;

export function ringRadiusMeters(min) {
  return (min / 60) * 2.9 * MILES_TO_METERS;
}
