// Device-local storage for the visitor's trip length — how many days
// they're in town, and optionally the date they arrive. Powers the
// itinerary builder's day columns (see lib/itineraryPlanner.js). No
// account, no server — same ethos as planStorage.js/hotelStorage.js.

const KEY = 'ssr-trip-v1';
const ASKED_KEY = 'ssr-trip-asked-v1';

// dayStartMin / dayEndMin bound the visitor's day: the scheduler starts
// each day's clock at dayStartMin and flags a day that runs past dayEndMin
// as over-long. They're trip-level rather than per-day — one setting the
// visitor understands, instead of fourteen they'd have to maintain.
// dayNotes is a { [dayNumber]: string } map of the visitor's own per-day
// notes, kept here (with the trip) rather than on the plan stops, since a
// note belongs to the day itself and must survive every stop moving out.
const DEFAULT_TRIP = { days: 2, startDate: null, dayStartMin: 9 * 60, dayEndMin: 22 * 60, dayNotes: {} };

const clampDayMinute = (v, fallback) =>
  Number.isFinite(v) && v >= 0 && v < 1440 ? Math.round(v) : fallback;

export function loadTrip() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_TRIP, dayNotes: {} };
    const parsed = JSON.parse(raw);
    const days = Number(parsed.days);
    const dayNotes = {};
    if (parsed.dayNotes && typeof parsed.dayNotes === 'object') {
      Object.entries(parsed.dayNotes).forEach(([k, v]) => {
        const n = Number(k);
        if (Number.isFinite(n) && n >= 1 && typeof v === 'string' && v.trim()) {
          dayNotes[n] = v.trim().slice(0, 500);
        }
      });
    }
    let start = clampDayMinute(Number(parsed.dayStartMin), DEFAULT_TRIP.dayStartMin);
    let end = clampDayMinute(Number(parsed.dayEndMin), DEFAULT_TRIP.dayEndMin);
    // A window that doesn't describe a real day (end at or before start)
    // can't be repaired by fixing one side — fall back to both defaults,
    // since a stored 11:20 PM start is corrupt either way.
    if (end <= start) {
      start = DEFAULT_TRIP.dayStartMin;
      end = DEFAULT_TRIP.dayEndMin;
    }
    return {
      days: Number.isFinite(days) && days >= 1 && days <= 14 ? Math.round(days) : DEFAULT_TRIP.days,
      startDate: typeof parsed.startDate === 'string' && parsed.startDate ? parsed.startDate : null,
      dayStartMin: start,
      dayEndMin: end,
      dayNotes,
    };
  } catch {
    return { ...DEFAULT_TRIP, dayNotes: {} };
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

// The weekday index (0 = Sunday) for a given 1-indexed day number, or null
// when the trip has no start date. Null matters: without a real date the
// app cannot know which day's opening hours apply, and the scheduler is
// written to skip hours validation entirely rather than warn on a guess.
export function weekdayForDay(trip, dayNumber) {
  const iso = dateForDay(trip, dayNumber);
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getDay();
}

export function formatDayDate(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
