# Stay Santa Rosa — City Guide (mobile app)

A free, no-account guide and full itinerary builder for Art House Santa Rosa and Hotel E guests: a real interactive map, four curated guides (Dining, Wine & Beer, Attractions, Events), a day-by-day trip planner with auto-arranged stops, suggested times, drag-to-reorder, Google Maps handoff and a shareable link, opt-in live location tracking, and a set of retention features layered on top — curated itineraries, "Open now," staff-pick badges, a rainy-day nudge, install-to-home-screen, and foreground closing-soon reminders. Responsive from phone to desktop — a floating bottom nav and stacked layout below ~900px, a sidebar nav with a side-by-side map/list and kanban-style day columns above it. Built on the Organic design system (direction 1b, "Ticket stub"), with the client's softer-white background override baked in. Each guide has its own category glyph (fork & knife, wine glass, mask, calendar) used on the list badges, chip row, and map pins in place of generic letters.

## Run it

```
npm install
npm run dev
```

Open the printed local URL — resize the browser to phone width, or use its device-toolbar/responsive mode. `npm run build` outputs a static `dist/` folder that deploys as-is to Vercel, Netlify, GitHub Pages, or any static host — no server, no environment variables, no database. Location tracking and installability both need a secure context (`https://`, or `localhost` during dev) — browsers refuse the Geolocation API and `beforeinstallprompt` otherwise.

## Navigation — a floating bottom nav, three tabs

A rounded, frosted-glass nav floats over the bottom of every screen with three tabs — switching between them doesn't push a new screen or lose scroll position, it's a flat tab switch:

1. **Build** — the old home screen: a small live map (real OpenStreetMap/CARTO tiles via Leaflet, not a drawing) at the top, an install banner and rainy-day nudge when they apply, a row of curated-itinerary cards, the four guide filter chips, a secondary row of tag filter chips (built from whatever tags the active guide's places actually carry), and the place list. Tap **+** on any row to add that place to your plan without leaving the list.
2. **Plan** — a **Saved** tray of places you've added but not scheduled, then your itinerary in **Day 1, Day 2, …** columns. Each stop shows its arrival time, how long you're there, the travel leg that got you there, your own note, and any warning (closed on arrival, a fixed time you can't reach). Drag the grip handle to reorder within a day, move between days, or drop something back into Saved; tap the pencil to set duration, pin a time, change day or add a note; tap a stop to mark it visited. Per day: optimize, swap with the next day, empty it back to Saved, add a day note, and hand it to Google Maps as its own multi-stop walking route. Across the trip: **Auto-arrange**, **Share** as a link, **Print**, **Calendar** (.ics), and one-level **Undo** on anything destructive. The bottom nav's Plan tab shows a live stop count badge.
3. **Map** — your plan, and only your plan, on the real map, filling the whole viewport: a topbar (live stop count) and, for a multi-day trip, a row of **All / Day 1 / Day 2 / …** filter chips, then the map taking every remaining pixel below (standard Leaflet touch/wheel handling — any touch pans it, pinch or scroll zooms it, no gesture gating). No guide browsing here — that's what Build's list and mini map are for — so each stop renders as a labeled card (number + category glyph + the place's own name, tinted by day when "All" is selected) rather than a bare pin, linked by a route line, plus a **Next stop** banner (distance from your live location if it's on, otherwise from your chosen home hotel). An empty plan shows a hint to add places from Build instead of a blank map.

Tapping a place (from Build's list or Map's pins) opens **Place detail** as a full-screen overlay on top of the current tab — a badge row (real rating/review count, a staff-pick badge, dog-friendly, and an Open now/Closes at line for dining places with real hours), photo plate, tags, description, walking/driving time from your home hotel (and a third live card, "From you," once location is on), an **Add to plan** button, a **Mark as visited** toggle once it's in your plan, an outlined pin button for turn-by-turn directions, and a phone button that dials straight from the app when a number's on file. Its back arrow returns to whichever tab you opened it from; the bottom nav hides while it's open.

## Home hotel & personalized distances

The first time the app opens, a one-time sheet asks which hotel you're staying at (or lets you skip it). Answering swaps every walk/drive time app-wide — Build's list, Place detail, the Map tab's Next-stop banner, Plan's Google Maps origin — from the shared Old Courthouse Square default (already baked into `guides.js`) to a live estimate from Art House, computed the same way the "From you" live-location card already was (`lib/geo.js`'s `estimateFrom`). The choice lives in `localStorage` (`ssr-home-hotel-v1`) — nothing is sent anywhere, and skipping just keeps the existing Courthouse Square numbers.

## Full itinerary builder

A second one-time sheet (right after the hotel question) asks how many days you're in town, plus an optional arrival date — reopenable any time from Plan's "Trip" button.

**Saved vs. scheduled.** Adding a place from a guide saves it *unscheduled*, into the Plan tab's Saved tray at the top. Wanting to go somewhere and having decided when are different things, and the app keeps them apart instead of quietly dropping everything on Day 1. Scheduling is a separate act: drag it into a day, pick a day in the stop editor, or hit Auto-arrange. Days and the Saved tray are the same kind of container, so a single drag gesture covers reordering within a day, moving between days, and pulling something back off the schedule. Curated itineraries and shared plans are different — those already *are* plans, so they land scheduled.

**How the schedule is built.** `lib/itineraryPlanner.js` groups stops geographically (a light k-means over lat/lng, closest area first) so each day stays walkable instead of zig-zagging across town, then runs a rebalancing pass that moves stops between days when one day is over your available hours or is simply carrying most of the trip while another sits nearly empty. Within a day, stops with a fixed time hold their slot and the rest are ordered breakfast → morning → lunch → wine/afternoon → dinner → evening, nearest-neighbour within each slot.

Clock times are then *derived*, never stored: the day's schedule walks forward from your day-start time, adding real travel time (`lib/geo.js`) and each stop's own visit length, so a drag instantly implies new times with nothing stale left behind. Each day shows its start-to-end window, time at stops vs. time getting around, and a travel chip between consecutive stops (how many minutes, walking or driving, and the distance).

**Per-stop control.** Tap the pencil on any stop to set how long you want there (the app's own per-category estimates — 75 min for a meal, 90 for a winery, 60 for an attraction — are the default, and are labelled as estimates, not sourced data), pin a fixed time for a reservation or tour, move it to another day or back to Saved, and add your own note. A pinned time is a real commitment: the rest of the day schedules around it, and if the running schedule can't physically reach it you get told so rather than having one silently rewritten.

**Warnings.** If your trip has a real arrival date, the app checks each stop against its published hours and flags anything you'd arrive at while it's closed, with the actual open window. Without an arrival date it says nothing — it can't know which weekday a stop falls on, and guessing would be worse than staying quiet. Days that run past your wrap-up time are flagged too.

**Day-level tools.** Each day has optimize (reorders just that day by walking distance, leaving every other day alone), swap with the next day, move the whole day back to Saved, and a day note. Every destructive action — auto-arrange, clear, remove, swap, day-clear — offers a single Undo rather than a confirm dialog.

**Getting it off the phone.** Print produces a clean paper itinerary from the same markup (no separate template to drift out of sync), and Calendar exports a real `.ics` with one event per stop at the right Pacific-time instant, DST included (`lib/itineraryExport.js`). Export needs an arrival date for the same reason the hours check does. Shared plan links carry each stop's day, position, duration, pinned time and note, and links made by older builds still open.

An event with its own real calendar date (and an arrival date on file) is pinned to the matching day instead of clustered, and shows its own published time rather than a derived one. Auto-arrange is always a deliberate tap — it never runs itself.

## Curated itineraries

Four bundle cards on Build — Railroad Square Crawl, Downtown Wine Walk, Museums & Culture, and a Staff Picks Sampler — each **Add all to plan** in one tap. Every stop in them is a real place already in `data/itineraries.js`/`guides.js` (nothing invented for the list); the Staff Picks bundle specifically pulls from the `staffPick` flag sourced from the site's own restaurant data. Adding is additive — a stop already in your plan is left alone, not duplicated.

## Ratings, staff picks & Open now

The 30 dining places sourced from staysantarosa.com's own `RESTAURANTS` data array now carry their real rating, review count, a staff-pick flag, a dog-friendly flag (true only for La Rosa), and real per-day hours. `lib/hours.js` parses those hours client-side (multi-range days, hours that cross midnight, "Closed") into an Open now / Closes at / opens-next line, shown on both the list and Place detail — Pacific time always, regardless of the visitor's own device timezone. The 5 dining-only additions (Beer Baron, Darbar Kitchen, Grossman's, The Goose & Fern, Jackson's) and every wine/attractions/events place have none of this — it isn't fabricated for them, so no rating or Open now line shows there.

## Rainy-day nudge

A no-key fetch to open-meteo.com (`lib/weather.js`) checks the live Santa Rosa forecast; if it's rainy, a dismissible banner on Build surfaces the attractions this app has objectively flagged `indoor: true` (the two museums and the performing-arts center — not sourced from the site, a plain factual call). Fails silently and shows nothing if the fetch is blocked or it isn't raining — never blocks the rest of the app.

## Install & reminders

An install banner appears on Build once the browser actually offers the native `beforeinstallprompt` (Chrome/Android/Edge — iOS Safari never fires one, so there's nothing to show there); tapping **Install** triggers the OS's own add-to-home-screen flow. A bell icon next to the plan pill opts into local closing-soon reminders: worth stating plainly, since there's no server here to hold a push subscription, these can only fire while the tab is open or briefly backgrounded and you return to it — never true background push. What it does: each time the app is foregrounded, it checks your next unvisited plan stop's real hours and fires one `Notification` if it closes within 45 minutes, never twice for the same stop on the same day.

## Share a plan

**Share** on the Plan tab packs your stops into the page's own URL (`lib/share.js`, `?plan=...`) and hands it to the OS share sheet (`navigator.share`) or copies it to the clipboard as a fallback — still no accounts, no server round-trip. Opening a shared link offers **Add to my plan** on Build without touching whatever's already saved unless you say yes.

## Live location

Tap the compass button (bottom-right of any map) to start tracking — it's the browser's native permission prompt, opt-in, off by default, and nothing is sent anywhere: `navigator.geolocation.watchPosition` updates a marker on the map and feeds the live distance numbers, all client-side. Tapping the button again stops tracking and drops the stored position. No location is persisted to `localStorage` or anywhere else.

## The plan (device-local only)

Stops you add live in `localStorage` under `ssr-plan-v1` — nothing leaves the device, matching the "no accounts, no personal data" constraint from the design handoff. Clearing site data or using a different browser starts a fresh plan (or opens whatever shared-plan link brought you here).

## Offline

`public/sw.js` was already a cache-first service worker for the app shell plus a network-with-cache-fallback pass-through for everything else it sees a visitor request (tiles included) — so a guest who's opened the app before keeps using it with no signal. The only addition here is `OfflineBanner.jsx`, a `navigator.onLine`-driven strip telling the visitor that's what's happening, so a place that hasn't loaded before reads as "not cached yet" rather than "broken."

## What's real vs. placeholder

- **Real:** every place name, address, phone, hours and rating in `src/data/guides.js` came from staysantarosa.com's own restaurant/wine/attractions guide pages (Dining, Wine & Beer, Attractions) and its "Major Events" annual calendar (Events) — see the comment at the top of that file for exactly what's sourced vs. estimated. The Dining guide carries all 35 real restaurants staysantarosa.com lists (30 with full structured data including rating/reviews/staffPick/dogFriendly/hours; 5 dining-only additions with just address/website from public listings, no fabricated rating or hours).
- **This app's own additions, clearly separated from the site's data:** the `indoor` flag on attractions, the `dateStart`/`dateEnd` used to sort/hide events (the site's own copy only ever gave a month or date range — these are a best-guess next occurrence, used purely for ordering, never shown as the site's published date), and the four curated itineraries.
- **Placeholder, by design:** the static walk/drive minutes are straight-line estimates, not routed directions (Leaflet has no built-in routing engine; the map itself is real, but turn-by-turn distance still needs a directions API — Google's handoff button covers that today). Photo slots are hatched placeholders labeled with what belongs there — the site itself has no per-restaurant/per-attraction photography to draw from, only generic hero art, so nothing was substituted in rather than risk showing the wrong picture for a real business.

**One reference point, personalizable:** every static walk/drive time is baked in relative to Old Courthouse Square (Hotel E's own address), and recomputed live from Art House instead when that's the chosen home hotel — see "Home hotel & personalized distances" above.

Before shipping: get a verified coordinate for Courthouse Square/Art House (currently estimated from the site's own "N min walk to X" copy); replace photo placeholders; and double-check hours, phones, ratings and "closed" days, which change.

## Desktop version

The same app, no separate build — everything above ~900px wide switches from the floating bottom nav to a fixed left sidebar, Build's map pins to the right of a scrollable place list instead of sitting above it, and the Plan tab's day sections lay out side by side as scrollable columns instead of stacking, so a multi-day trip reads like a board at a glance. First-run and trip-length sheets center on screen instead of anchoring to the bottom edge. It's all CSS media queries (`src/styles/app.css`, the block at the bottom) plus two small layout wrapper elements in `App.jsx` — no separate desktop build, no JS branching on screen size.

## Structure

- `src/data/guides.js` — the whole content bundle (4 guides × places, each with lat/lng). Edit this file to add/remove/edit places.
- `src/data/itineraries.js` — the curated cross-guide "Add all to plan" bundles.
- `src/lib/geo.js` — haversine distance, walk/drive time estimates, walking-ring radii.
- `src/lib/hours.js` — parses real per-day hours strings into an Open now / Closes at / opens-next line.
- `src/lib/events.js` — sorts the Events guide by real-world date proximity, drops fully-past ones.
- `src/lib/hotelStorage.js` — localStorage read/write for the chosen home hotel.
- `src/lib/weather.js` — no-key open-meteo fetch for the rainy-day nudge.
- `src/lib/share.js` — encode/decode a plan into/from a URL param.
- `src/lib/notify.js` — foreground-only closing-soon reminders.
- `src/lib/planStorage.js` — localStorage read/write for the plan (now with each stop's day + order).
- `src/lib/tripStorage.js` — localStorage read/write for trip length + optional start date.
- `src/lib/itineraryPlanner.js` — the auto-arrange algorithm: geographic day-clustering, meal/time-of-day ordering, suggested-time derivation.
- `src/components/TripPicker.jsx` — the first-run/"Trip length" trip-setup sheet.
- `src/components/BottomNav.jsx` — the floating Build/Plan/Map tab bar (a left sidebar on desktop, see above).
- `src/components/MapView.jsx` — the real Leaflet map, used both small (Build tab, browsing the active guide's pins) and full-bleed (Map tab, plan stops only, rendered as labeled cards).
- `src/components/PlanPanel.jsx` — Build tab's mini map wrapper.
- `src/components/GuideChips.jsx` / `StubList.jsx` — the four filter chips, the per-guide tag filter row, and the perforated "ticket stub" place list (with the plan +/✓ toggle, Open now dot, and rating).
- `src/components/PlaceDetail.jsx` — the place-detail overlay opened from Build or Map.
- `src/components/FullMapScreen.jsx` — the Map tab: full-bleed map of just your plan + next-stop banner + empty-plan hint.
- `src/components/PlanScreen.jsx` / `PlanSheet.jsx` — the Plan tab and its list, Share button, and Google Maps handoff.
- `src/components/HotelPicker.jsx` — the first-run home-hotel sheet.
- `src/components/InstallPrompt.jsx` / `WeatherNudge.jsx` / `ItineraryPicks.jsx` / `OfflineBanner.jsx` — the Build-tab banners and curated-itinerary row.
- `src/styles/organic.css` — the licensed Organic token sheet, unmodified except the client's five background-token overrides (documented inline).
- `src/styles/app.css` — this app's component styles, built only from `var(--*)` tokens, plus the Leaflet chrome overrides.

## Not in this build

No accounts, no server-side storage. Routed (turn-by-turn) distances aren't computed in-app; the Google Maps handoff covers that on real roads/sidewalks instead of straight-line estimates. Reminders are foreground-only (see "Install & reminders" above) — true background push would need a server to hold subscriptions, which is outside this app's no-backend scope.

## A note on how this was built

I couldn't run `npm install` myself to test this — this build environment has no npm registry access — so every component that doesn't touch the Leaflet map was rendered server-side with React as a smoke test (all four guides × every place × every plan/visited/location state, plus the new badges, itinerary cards, hotel picker, install/weather/offline banners, and a content-level check that real staff-pick/dog-friendly/rating/tel-link data actually renders), and every file was syntax-checked. `MapView.jsx` (the one file that talks to Leaflet directly) could only be checked by careful reading against the Leaflet API, not executed, since Leaflet needs a real browser DOM. `lib/weather.js`'s live fetch and `beforeinstallprompt`/`Notification`/`navigator.share` couldn't be exercised in this environment either — they're standard browser APIs used defensively (try/catch, feature-detected, silent fallback), but give install, the rainy-day nudge, share, and reminders a real run-through before calling this done, alongside the map, the plan builder, and location tracking.
