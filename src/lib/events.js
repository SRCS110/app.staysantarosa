// Sorts the Events guide by real-world date proximity and drops anything
// whose window has already fully passed — using each event's `dateStart`/
// `dateEnd` (see the header comment in data/guides.js: these are this
// app's own best-guess next occurrence, not the site's published dates,
// used only to order/hide the list). Places without a dateStart sort last
// rather than being hidden, so nothing silently disappears from a data
// gap. Re-evaluated against the real current time on every call, so this
// stays correct no matter when the app is actually opened.
export function sortUpcomingEvents(places) {
  const now = Date.now();
  return places
    .filter((p) => !p.dateEnd || new Date(`${p.dateEnd}T23:59:59`).getTime() >= now)
    .slice()
    .sort((a, b) => {
      if (!a.dateStart && !b.dateStart) return 0;
      if (!a.dateStart) return 1;
      if (!b.dateStart) return -1;
      return new Date(a.dateStart) - new Date(b.dateStart);
    });
}
