// Parses the real per-day hours strings carried on dining places (e.g.
// "11:30 AM – 2:30 PM, 4:30 – 9:00 PM" or "Closed") into an Open now /
// Closed · opens at line. Only dining places sourced from the site's own
// RESTAURANTS array carry structured `hours` — everything else (wine,
// attractions, events, and the 5 dining-only additions) has none, so
// callers should treat a missing/undefined `hours` object as "unknown"
// and simply not show an open/closed line rather than guessing.
//
// Santa Rosa is always Pacific time regardless of the visitor's own device
// timezone, so "now" is read via Intl with timeZone: 'America/Los_Angeles'.

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseTimeToken(token, inferMeridiem) {
  const m = String(token).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const meridiem = (m[3] || inferMeridiem || '').toUpperCase();
  if (!meridiem) return null;
  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

// A single "H:MM AM/PM – H:MM AM/PM" range. The site's own copy sometimes
// drops AM/PM off the start time in a second same-line range (e.g. the
// "4:30" in "11:30 AM – 2:30 PM, 4:30 – 9:00 PM") — inferred from the end.
function parseRange(rangeStr) {
  const parts = rangeStr.split(/[–-]/).map((s) => s.trim());
  if (parts.length !== 2) return null;
  const endMeridiemMatch = parts[1].match(/AM|PM/i);
  const endMeridiem = endMeridiemMatch ? endMeridiemMatch[0] : null;
  const start = parseTimeToken(parts[0], endMeridiem);
  const end = parseTimeToken(parts[1], null);
  if (start == null || end == null) return null;
  return [start, end <= start ? end + 24 * 60 : end];
}

function parseDayRanges(dayStr) {
  if (!dayStr || /closed/i.test(dayStr)) return [];
  return dayStr
    .split(',')
    .map((s) => parseRange(s))
    .filter(Boolean);
}

// A coarse "when does this place tend to be open" hint used only for
// itinerary ordering (lib/itineraryPlanner.js) — not shown to the visitor.
// 'breakfast' = opens before 8 AM any day; 'dinner' = never opens before
// 3 PM; 'lunch' = everything in between (including typical all-day
// places). Returns null when there's no hours data to go on.
export function mealSlotHint(hours) {
  if (!hours) return null;
  let earliestStart = Infinity;
  for (const day of DAYS) {
    for (const [start] of parseDayRanges(hours[day])) {
      if (start < earliestStart) earliestStart = start;
    }
  }
  if (!Number.isFinite(earliestStart)) return null;
  if (earliestStart < 8 * 60) return 'breakfast';
  if (earliestStart >= 15 * 60) return 'dinner';
  return 'lunch';
}

// The open windows for one weekday (0 = Sunday), as [startMin, endMin]
// pairs measured from that day's midnight. An end past 1440 means the
// window runs into the next morning. Returns null — meaning "unknown", NOT
// "closed" — when the place carries no hours data at all, so callers can
// tell a real closure apart from missing data (see the header note above).
export function windowsForWeekday(hours, weekdayIndex) {
  if (!hours) return null;
  const name = DAYS[((weekdayIndex % 7) + 7) % 7];
  return parseDayRanges(hours[name]);
}

// Would this place be open at `minutes` past midnight on `weekdayIndex`?
// Returns null when hours are unknown (never a guess), true/false otherwise.
// Accounts for the previous day's window spilling past midnight.
export function isOpenAt(hours, weekdayIndex, minutes) {
  const today = windowsForWeekday(hours, weekdayIndex);
  if (today == null) return null;
  for (const [start, end] of today) {
    if (minutes >= start && minutes < end) return true;
  }
  const yesterday = windowsForWeekday(hours, weekdayIndex - 1) || [];
  for (const [, end] of yesterday) {
    if (end > 1440 && minutes < end - 1440) return true;
  }
  return false;
}

// "11:30 AM – 9:00 PM" for the given weekday, or null when unknown, or
// 'Closed' when the day has no windows at all. Used to explain a
// closed-on-arrival warning instead of just flagging it.
export function windowLabelForWeekday(hours, weekdayIndex) {
  const windows = windowsForWeekday(hours, weekdayIndex);
  if (windows == null) return null;
  if (!windows.length) return 'Closed';
  return windows.map(([s, e]) => `${formatMinutes(s)} – ${formatMinutes(e)}`).join(', ');
}

export function formatMinutes(totalMinutes) {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  let hour = Math.floor(m / 60);
  const minute = m % 60;
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${meridiem}`;
}

function nowInSantaRosa(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekday = get('weekday');
  let hour = parseInt(get('hour'), 10);
  const minute = parseInt(get('minute'), 10);
  if (hour === 24) hour = 0;
  return { dayIndex: DAYS.indexOf(weekday), minutes: hour * 60 + minute };
}

// Returns null when `hours` is missing (unknown, not "closed"). Otherwise
// { open: true, closesAt } or { open: false, opensAt, opensLabel }, where
// opensLabel is a short "opens Tue 6 AM" style string for the next window
// found within the coming week.
export function openStatus(hours, date = new Date()) {
  if (!hours) return null;
  const { dayIndex, minutes } = nowInSantaRosa(date);

  const todayRanges = parseDayRanges(hours[DAYS[dayIndex]]);
  for (const [start, end] of todayRanges) {
    if (minutes >= start && minutes < end) {
      return { open: true, closesAt: formatMinutes(end) };
    }
  }
  // Yesterday's range may spill past midnight into this morning.
  const yesterdayIdx = (dayIndex + 6) % 7;
  const yesterdayRanges = parseDayRanges(hours[DAYS[yesterdayIdx]]);
  for (const [, end] of yesterdayRanges) {
    if (end > 1440 && minutes < end - 1440) {
      return { open: true, closesAt: formatMinutes(end - 1440) };
    }
  }

  // Not open now — find the next opening within the next 7 days.
  for (let offset = 0; offset < 7; offset += 1) {
    const idx = (dayIndex + offset) % 7;
    const ranges = parseDayRanges(hours[DAYS[idx]]);
    for (const [start] of ranges) {
      const absoluteStart = offset === 0 ? start : start; // start is same-day minutes
      if (offset === 0 && absoluteStart <= minutes) continue;
      const dayLabel = offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : DAYS[idx].slice(0, 3);
      return { open: false, opensLabel: `opens ${dayLabel} ${formatMinutes(start)}` };
    }
  }
  return { open: false, opensLabel: null };
}
