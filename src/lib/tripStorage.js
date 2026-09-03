// Device-local storage for the visitor's trip length — how many days
// they're in town, and optionally the date they arrive. Powers the
// itinerary builder's day columns (see lib/itineraryPlanner.js). No
// account, no server — same ethos as planStorage.js/hotelStorage.js.

const KEY = 'ssr-trip-v1';
const ASKED_KEY = 'ssr-trip-asked-v1';

const DEFAULT_TRIP = { days: 2, startDate: null };

export function loadTrip() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_TRIP };
    const parsed = JSON.parse(raw);
    const days = Number(parsed.days);
    return {
      days: Number.isFinite(days) && days >= 1 && days <= 14 ? Math.round(days) : DEFAULT_TRIP.days,
      startDate: typeof parsed.startDate === 'string' && parsed.startDate ? parsed.startDate : null,
    };
  } catch {
    return { ...DEFAULT_TRIP };
  }
}

export function saveTrip(trip) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(trip));
  } catch {
    // best-effort only
  }
}

export function hasAskedTrip() {
  try {
    return window.localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markAskedTrip() {
  try {
    window.localStorage.setItem(ASKED_KEY, '1');
  } catch {
    // best-effort only
  }
}

// Given the trip's start date, returns the calendar date (YYYY-MM-DD) for
// a given 1-indexed day number, or null if no start date was set.
export function dateForDay(trip, dayNumber) {
  if (!trip.startDate) return null;
  const start = new Date(`${trip.startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const d = new Date(start);
  d.setDate(d.getDate() + (dayNumber - 1));
  return d.toISOString().slice(0, 10);
}

export function formatDayDate(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
