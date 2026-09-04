# Stay Santa Rosa App — Handoff

Status snapshot for whoever picks this up next (another session, another
developer, or future-you). For end-user-facing feature documentation see
`README.md` in this same folder — this file is about *state and next
steps*, not how each feature works day to day.

## What this is

A free, no-account PWA for Art House Santa Rosa and Hotel E guests:
browse four real content guides (Dining, Wine & Beer, Attractions,
Events), build a multi-day itinerary with auto-arranged stops and
suggested times, and view it on a live map — phone-first, responsive up
to desktop. No backend, no accounts, no database — everything is a
static Vite build plus `localStorage` on the visitor's own device.

- **Stack:** React 18 + Vite 5, Leaflet for maps (no API key, CARTO
  Voyager tiles), plain CSS on the licensed "Organic" design system
  tokens (`src/styles/organic.css` + `src/styles/app.css`). No state
  library, no router — a handful of `useState`/`useMemo` in `App.jsx`.
- **Run it:** `npm install && npm run dev`. `npm run build` outputs a
  static `dist/` — deploys as-is to Vercel/Netlify/GitHub Pages/any
  static host.
- **Content source:** real data scraped from staysantarosa.com's own
  guide pages, documented in detail in the header comment of
  `src/data/guides.js` (which fields are site-sourced vs. this app's own
  additions, and why — e.g. no per-place photography exists on the real
  site, so none was fabricated here).

## Current feature set (all built and synced as of this handoff)

- Four guides (Dining/Wine/Attractions/Events) with real addresses,
  phone, hours, ratings where the source data has them.
- Self-built plan: add/remove stops, mark visited, share as a URL.
- **Full itinerary builder**: trip length (`TripPicker`,
  `lib/tripStorage.js`), a saved tray for places added but not yet
  scheduled, auto-arrange by geography + meal/time-of-day with a
  cross-day rebalance (`lib/itineraryPlanner.js`), a real derived
  timeline (per-stop arrival/departure from duration + travel time),
  editable per-stop duration, pinned times, per-stop and per-day notes,
  travel-leg chips between stops, day totals and end time,
  closed-on-arrival and over-long-day warnings, per-day optimize / swap /
  clear, one-level undo on every destructive action, drag-to-reorder
  within and across days (and into the saved tray) via Pointer Events,
  per-day Google Maps handoff, print view, and .ics calendar export
  (`lib/itineraryExport.js`).
- Map tab: plan-only (no guide browsing), labeled cards instead of bare
  pins, day-color-coded, an All/Day-N filter for multi-day trips.
- Home-hotel picker → personalizes every walk/drive time app-wide.
- Rainy-day nudge (open-meteo, no key), install-to-home-screen prompt,
  foreground-only closing-soon reminders, curated one-tap itineraries,
  tag filter chips, offline banner (the existing service worker in
  `public/sw.js` already provided real offline caching — this just
  surfaces it in the UI).
- **Responsive desktop layout** (≥900px): sidebar nav instead of a
  floating bottom bar, Build's map pinned beside a scrollable list
  instead of stacked above it, Plan's day columns lay out side-by-side
  (kanban-style) instead of stacked. Pure CSS media queries in
  `app.css` plus two layout wrapper `<div>`s in `App.jsx` — no separate
  desktop build or JS branching on screen size.

## Architecture notes worth knowing before touching this

- **Data flow is single-directional through `App.jsx`.** It owns
  `planStops` (persisted via `lib/planStorage.js`), `trip` (persisted
  via `lib/tripStorage.js`), and every other piece of state; components
  are largely presentational and call back up (`onToggleInPlan`,
  `onReorder`, etc.). If you add a new piece of durable state, follow
  this pattern rather than introducing local component state that needs
  to survive a re-render.
- **The plan stop is the whole data model.** Each carries `day` (1-indexed,
  or **`null` = saved but not scheduled**), `order`, `durationMin` (null =
  use the category default), `startMin` (null = derive it; a number is a
  *pinned* commitment) and `note`. Everything the Plan tab shows is either
  one of those five fields or derived from them. The null-`day` state is
  load-bearing: adding a place from a guide saves it unscheduled, and
  scheduling it is a separate act (drag, stop editor, or Auto-arrange).
  Days and the saved tray are the same kind of container in the UI, so
  one drag gesture covers reorder, move-between-days, and unschedule.
- **Clock times are derived, never stored** — `buildDaySchedule()` walks a
  day's stops carrying a clock through travel time + each stop's duration,
  and returns arrival/departure, the travel leg, per-stop warnings and the
  day's totals. It is pure and safe to call on every render. The one
  exception is `startMin`: a *pinned* time is stored, because it's a real
  commitment (a reservation, a tour slot) the rest of the day must build
  around rather than recompute away. Don't store derived times — they'd go
  stale the moment someone drags a stop.
- **Travel is a property of the arriving stop** (`row.travel`), not a
  separate edges list. Inserting or removing a stop therefore only
  invalidates its own leg and the next one.
- **Auto-arrange is undoable and rebalances.** `autoArrangePlan()` clusters
  by geography, pins date-bound events to their real day, then runs a
  cross-day rebalancing pass so a dense downtown cluster doesn't leave a
  6/3/1 split across a 3-day trip. Every destructive plan action snapshots
  first through App.jsx's single `undoState`; there's one Undo, not a
  confirm dialog per action. `optimizeDay()` is the narrower version —
  one day, everything else untouched.
- **Opening-hours warnings only fire when the trip has a real start date.**
  Without one the app can't know which weekday a stop lands on, and
  `buildDaySchedule` is written to stay silent rather than warn on a guess.
  Same rule governs .ics export, which refuses rather than inventing dates.
- **Drag-and-drop is hand-rolled** (Pointer Events, no library) to avoid
  an `npm install` step on the user's machine for every sync — see the
  implementation notes at the top of `PlanSheet.jsx`. It's good-enough,
  not pixel-perfect (there's a documented one-frame edge case in the
  insert-position calculation during the very first `pointermove` of a
  drag). If this ever gets flaky in practice, that's the first place to
  look, and reaching for `@dnd-kit/core` at that point is reasonable —
  just remember to `npm install` on the device afterward.
- **Reminders are foreground-only** (`lib/notify.js`) — there's no
  server, so no real background push. Documented in the README; don't
  let a future ask for "real notifications" quietly get scoped as if
  it's a small addition — it needs a backend.
- **Everything is honesty-constrained on data.** Don't add ratings,
  hours, photos, or any other field to a place unless there's a real
  source for it — see the sourcing header comment in `guides.js` for the
  standard this project has held to (e.g. 5 dining places intentionally
  carry no rating/hours because no real source was found for them).

## Pending — NOT yet built (recorded 2026-09-03)

A restructuring of the Build page and navigation was requested and
explicitly deferred (user said to record it, not implement it). Full
spec is saved as a project doc (`claude/app-itinerary-builder-notes.md`
in the attached Claude Project) — summary:

1. Build (home) page loses the map; becomes prebuilt-plan cards + a
   small sponsored selection of dining + wineries + the attractions
   list.
2. A new standalone page: the full filterable list of dining/wine/
   attractions (today's `StubList` + `GuideChips`, broken out of Build).
3. A new standalone Events page, separate from the above.
4. Nav direction from the user: keep the mobile bottom nav to 3 tabs;
   surface Map and the new Browse page via a top nav instead of adding
   bottom-nav tabs. Events' entry point and the exact 3-tab set weren't
   pinned down — several open questions are listed in that project doc
   and need the user's confirmation before implementation starts.

**Do not start building this without checking that project doc first
and getting the user's go-ahead** — it was deliberately not built yet.

## Known limitations (by design, not bugs)

- No accounts, no server-side storage — a plan/trip only exists in the
  browser that built it (or wherever a share link is opened).
- Distances are straight-line estimates (`lib/geo.js`), not routed —
  the Google Maps handoff covers real-road routing instead.
- A handful of dining places and all wine/attractions/events places
  have no rating/hours/photo — intentional, not missing data to chase.
- Event `dateStart`/`dateEnd` are this app's own best-guess next
  occurrence for sorting only, not the site's actual published dates.

## Where files land

Delivered zips get synced into the user's connected `Apps--staysantarosa`
folder (`~/Desktop/Apps/staysantarosa` on their machine). **When syncing
via the device bridge, always extract the zip to a scratch location
OUTSIDE that connected folder first, then `rsync -a --delete` into it —
extracting inside the folder and rsyncing `--delete` over it has
previously wiped the entire connected folder** (rsync deletes its own
extraction-in-progress source mid-transfer). See git history / prior
session notes if this needs re-explaining to a future session.
