// Calendar export. A .ics file is just text, so this needs no server and no
// account — the visitor taps once and the whole itinerary lands in whatever
// calendar app they already use, which is the cheapest way this app can
// leave the phone and stay useful.
//
// Times are written as real UTC instants rather than floating local times,
// so the events land at the right moment regardless of the device's own
// timezone. Santa Rosa is America/Los_Angeles year-round, and the Pacific
// UTC offset changes with daylight saving, so the offset is resolved
// per-date via Intl rather than hardcoded.
//
// Export requires the trip to have a real start date: without one the app
// has no idea what calendar dates "Day 1, Day 2" mean, and writing guessed
// dates into someone's calendar would be worse than not exporting at all.

const TZ = 'America/Los_Angeles';

// The UTC offset (in minutes) in effect in Santa Rosa at a given instant.
function pacificOffsetMinutes(instant) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return (asUtc - instant.getTime()) / 60000;
}

// A wall-clock time in Santa Rosa → the UTC instant it actually happens.
// Two passes so a time sitting near a DST boundary resolves correctly.
export function pacificToUtc(dateIso, minutes) {
  const [y, m, d] = dateIso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const naive = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), Math.round(minutes % 60));
  let offset = pacificOffsetMinutes(new Date(naive));
  let utc = naive - offset * 60000;
  offset = pacificOffsetMinutes(new Date(utc));
  utc = naive - offset * 60000;
  return new Date(utc);
}

function icsStamp(date) {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

// RFC 5545 wants CRLF line endings, backslash-escaped separators, and lines
// folded at 75 octets — skipping any of it is what makes a hand-built .ics
// silently fail to import.
function escapeText(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function fold(line) {
  if (line.length <= 75) return line;
  const chunks = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest.length) chunks.push(` ${rest}`);
  return chunks.join('\r\n');
}

function uidFor(dayNumber, stop, index) {
  const slug = `${stop.guideKey}-${stop.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `ssr-d${dayNumber}-${index}-${slug}@staysantarosa.com`;
}

// `days` is [{ dayNumber, dateIso, rows }] where each row is a scheduled
// stop from buildDaySchedule (arriveMin/departMin/address/note/...).
export function buildIcs(days, { calendarName = 'Stay Santa Rosa itinerary' } = {}) {
  const now = new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stay Santa Rosa//Itinerary//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-TIMEZONE:${TZ}`,
  ];

  days.forEach(({ dayNumber, dateIso, rows }) => {
    if (!dateIso) return;
    rows.forEach((row, index) => {
      const start = pacificToUtc(dateIso, row.arriveMin);
      const end = pacificToUtc(dateIso, row.departMin);
      if (!start || !end) return;
      const description = [row.note, row.phone ? `Phone: ${row.phone}` : null, row.website || null]
        .filter(Boolean)
        .join('\n');
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uidFor(dayNumber, row, index)}`,
        `DTSTAMP:${icsStamp(now)}`,
        `DTSTART:${icsStamp(start)}`,
        `DTEND:${icsStamp(end)}`,
        fold(`SUMMARY:${escapeText(row.name)}`),
        ...(row.address ? [fold(`LOCATION:${escapeText(row.address)}`)] : []),
        ...(description ? [fold(`DESCRIPTION:${escapeText(description)}`)] : []),
        'END:VEVENT'
      );
    });
  });

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

// Hands the file to the browser. Returns false when there was nothing
// schedulable to export, so the caller can say so rather than appearing to
// have done something.
export function downloadIcs(days, filename = 'stay-santa-rosa-itinerary.ics') {
  const hasDated = days.some((d) => d.dateIso && d.rows.length);
  if (!hasDated) return false;
  const ics = buildIcs(days);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
