# Stay Santa Rosa — City Guide (mobile app)

A free, no-account, **no-build** static PWA guide and full itinerary builder for Art House Santa Rosa and Hotel E guests: a real interactive map, four curated guides (Dining, Wine & Beer, Attractions, Events), a day-by-day trip planner with auto-arranged stops, suggested times, drag-to-reorder, Google Maps handoff and a shareable link, opt-in live location tracking, and a set of retention features layered on top — curated itineraries, "Open now," staff-pick badges, a rainy-day nudge, install-to-home-screen, and foreground closing-soon reminders. Responsive from phone to desktop — a three-tab floating bottom nav (Build/Plan/Events) plus a Browse/Map top nav and stacked layout below ~900px, a sidebar nav with kanban-style day columns above it. Built on the Organic design system (direction 1b, "Ticket stub"), with the client's softer-white background override baked in. Each guide has its own category glyph (fork & knife, wine glass, mask, calendar) used on the list badges, chip row, and map pins in place of generic letters.

## Run it

**No build step, no `npm install`, no dependencies.** It's plain ES modules + an import map. Serve the repo root with any static server:

```
npm run dev            # → node serve.mjs 5173 (zero-dep, in this repo)
# or: python3 -m http.server 5173
# or: npx serve
```

Open `http://localhost:5173`. To deploy: push the repo to Vercel / Netlify / GitHub Pages with **no build command and no output directory** — the root *is* the site. No server, no environment variables, no database. Location tracking and installability both need a secure context (`https://`, or `localhost` during dev) — browsers refuse the Geolocation API and `beforeinstallprompt` otherwise.

### Stack

- **Preact + htm** (`/vendor`, ~16 KB total) for the view layer — the `html\`\`` tagged template in `src/preact.js` stands in for JSX. No React, no bundler, no transpile.
- **Leaflet 1.9** (`/vendor/leaflet.js`, loaded as a plain `<script>`, keyless Esri basemap) for the map.
- Plain CSS on the licensed Organic tokens (`src/styles/`), linked from `index.html`.
- Total repo footprint ~600 KB (was ~48 MB of `node_modules` under the old Vite setup).

## Navigation — a three-tab bottom nav plus a top nav

A rounded, frosted-glass nav floats over the bottom of every screen with three tabs — **Build**, **Plan**, **Events**. Two more destinations — **Browse** and **Map** — live in a small top nav on every primary screen, keeping the phone bottom bar to three targets. Switching is a flat tab switch: no new screen pushed, no lost scroll position. On desktop (≥900px) a left sidebar replaces the bottom bar and the top nav stays put.

Every screen's topbar has a **trip-details button** (in place of the old "Free · No sign-in" pill) showing the trip length and plan count; it opens the **Trip details** page ([`TripScreen.js`](src/components/TripScreen.js)) where the visitor sets their home hotel, trip length, and arrival date — the same values the first-run sheets collect, editable any time. Plan's "Trip details" toolbar button and the empty-plan CTA both route here.

1. **Build** — the home screen, no map: an install banner and rainy-day nudge when they apply, a row of ready-made itinerary cards, a **Sponsored** section of paid-placement local businesses (each card carries a visible "Sponsored" label; `data/featured.js` — real places from `guides.js`, currently house placeholders until advertisers sign on), an Events teaser card, the full Attractions list, and a "Browse all" link into the Browse page. Tap **+** on any row to add a place to your plan without leaving the list.
2. **Browse** (top nav) — the full filterable list, split out of the old Build page: Dining / Wine & Beer / Attractions chips, the tag filter chips for the active guide, and the place list with **+** to add.
3. **Events** (bottom tab) — the community-events calendar on its own page, sorted by next occurrence with fully-past ones dropped; each row shows the date and opens the event detail, **+** adds it to the plan.
4. **Plan** — your day-by-day itinerary, grouped into **Day 1, Day 2, …** columns (however many days you said you're in town for). Each stop shows a suggested time on a 30-minute grid; **tap the time to change it** (a 30-min picker from 6:00 AM to 11:30 PM, or "Auto" to hand it back to the planner) — an edited time sticks, shows a marked underline, and carries the clock forward for the auto stops after it. Drag a stop's grip handle to reorder within a day or move it to a different day, tap a stop to mark it visited, remove or clear stops, **Auto-arrange** to re-run the planner from scratch, **Share** the plan as a link, edit your trip length any time, and hand each day to Google Maps as its own multi-stop walking route. The bottom nav's Plan tab shows a live stop count badge. Opened before anything's been added, it shows a **skeleton preview** — the day columns with ghost placeholder rows plus "Browse places to add" / "Edit trip details" CTAs — instead of a blank page.
5. **Map** (top nav) — your plan, and only your plan, on the real map, filling the whole viewport: a topbar (live stop count) and, for a multi-day trip, a row of **All / Day 1 / Day 2 / …** filter chips, then the map taking every remaining pixel below (standard Leaflet touch/wheel handling — any touch pans it, pinch or scroll zooms it, no gesture gating). Each stop renders as a labeled card (number + category glyph + the place's own name, tinted by day when "All" is selected) rather than a bare pin, linked by a **walking route line that follows real sidewalks/streets** (per day, colored to match) — fetched from a keyless public OSRM instance (`lib/routing.js`), with a straight dashed line shown instantly as the fallback if that lookup is slow or blocked — plus a **Next stop** banner (distance from your live location if it's on, otherwise from your chosen home hotel). An empty plan shows a hint to add places from Build instead of a blank map.

Tapping a place (from Build, Browse, Events, or Map's pins) opens **Place detail** as a full-screen overlay on top of the current tab — a badge row (real rating/review count, a staff-pick badge, dog-friendly, and an Open now/Closes at line for dining places with real hours), photo plate, tags, description, walking/driving time from your home hotel (and a third live card, "From you," once location is on), an **Add to plan** button, a **Mark as visited** toggle once it's in your plan, an outlined pin button for turn-by-turn directions, and a phone button that dials straight from the app when a number's on file. Its back arrow returns to whichever tab you opened it from; the bottom nav hides while it's open.

## Home hotel & personalized distances

The first time the app opens, a one-time sheet asks which hotel you're staying at (or lets you skip it). Answering swaps every walk/drive time app-wide — Build's list, Place detail, the Map tab's Next-stop banner, Plan's Google Maps origin — from the shared Old Courthouse Square default (already baked into `guides.js`) to a live estimate from Art House, computed the same way the "From you" live-location card already was (`lib/geo.js`'s `estimateFrom`). The choice lives in `localStorage` (`ssr-home-hotel-v1`) — nothing is sent anywhere, and skipping just keeps the existing Courthouse Square numbers.

## Full itinerary builder

A second one-time sheet (right after the hotel question) asks how many days you're in town, plus an optional arrival date — reopenable any time from Plan's "Trip length" button. `lib/itineraryPlanner.js` then auto-arranges your plan into those day columns: it groups stops geographically (a light k-means over lat/lng, closest area first) so each day stays walkable instead of zig-zagging across town, orders each day breakfast → morning → lunch → wine/afternoon → dinner → evening using real hours data where it exists, and derives a suggested clock time per stop by walking the day forward from 9 AM with real travel time (`lib/geo.js`) plus a per-category dwell estimate, rounded to the next half hour and capped at 11:30 PM — these derived times are never stored, always recomputed from whatever order is current. A stop can also carry a **hand-set `time`** (persisted, and included in share links): that wins over the derived time and moves the clock for the stops after it. An event with its own real calendar date (and an arrival date on file) is pinned to the matching day instead of clustered, and shows its own real time rather than a derived one. Auto-arrange is a deliberate action (the Plan tab's button) — it never runs itself and never overwrites a manual drag until you ask it to. Drag-to-reorder works within a day or across days (touch and mouse, via Pointer Events) and always wins over the suggestion. Shared plan links now carry each stop's day and position, so whoever opens the link gets the same day-by-day trip, not just a flat list.

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

`sw.js` (repo root) is a cache-first service worker: it precaches the module entry graph + `/vendor` libs + styles on install, then does a network-with-cache-fallback pass-through for everything else a visitor requests (tiles, guide images, lazily-hit modules) — so a guest who's opened the app before keeps using it with no signal. `OfflineBanner.js` is a `navigator.onLine`-driven strip telling the visitor that's what's happening, so a place that hasn't loaded before reads as "not cached yet" rather than "broken."

## What's real vs. placeholder

- **Real:** every place name, address, phone, hours and rating in `src/data/guides.js` came from staysantarosa.com's own restaurant/wine/attractions guide pages (Dining, Wine & Beer, Attractions) and its "Major Events" annual calendar (Events) — see the comment at the top of that file for exactly what's sourced vs. estimated. The Dining guide carries all 35 real restaurants staysantarosa.com lists (30 with full structured data including rating/reviews/staffPick/dogFriendly/hours; 5 dining-only additions with just address/website from public listings, no fabricated rating or hours).
- **This app's own additions, clearly separated from the site's data:** the `indoor` flag on attractions, the `dateStart`/`dateEnd` used to sort/hide events (the site's own copy only ever gave a month or date range — these are a best-guess next occurrence, used purely for ordering, never shown as the site's published date), and the four curated itineraries.
- **Placeholder, by design:** the static walk/drive *minutes* are straight-line estimates, not routed durations. The map's route *line* does follow real streets (keyless OSRM, `lib/routing.js`), but the per-stop time figures and the Next-stop distance are still crow-flies; exact turn-by-turn timing is what Google's handoff button covers. Photo slots are hatched placeholders labeled with what belongs there — the site itself has no per-restaurant/per-attraction photography to draw from, only generic hero art, so nothing was substituted in rather than risk showing the wrong picture for a real business.

**One reference point, personalizable:** every static walk/drive time is baked in relative to Old Courthouse Square (Hotel E's own address), and recomputed live from Art House instead when that's the chosen home hotel — see "Home hotel & personalized distances" above.

Before shipping: get a verified coordinate for Courthouse Square/Art House (currently estimated from the site's own "N min walk to X" copy); replace photo placeholders; and double-check hours, phones, ratings and "closed" days, which change.

## Desktop version

The same app, no separate build — everything above ~900px wide switches from the floating bottom nav to a fixed left sidebar (the Browse/Map top nav stays visible), the Build shortlist and Events list go to a two-column grid, and the Plan tab's day sections lay out side by side as scrollable columns instead of stacking, so a multi-day trip reads like a board at a glance. First-run and trip-length sheets center on screen instead of anchoring to the bottom edge. It's all CSS media queries (`src/styles/app.css`, the blocks at the bottom) — no separate desktop build, no JS branching on screen size.

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
- `src/components/TripPicker.js` — the first-run/"Trip length" trip-setup sheet.
- `src/components/BottomNav.js` — the floating Build/Plan/Events tab bar (a left sidebar on desktop, see above).
- `src/components/TopNav.js` — the Browse/Map top nav shown on every primary screen.
- `src/components/BuildScreen.js` — the slimmed home page (ready-made itineraries, Start-here shortlist, Events teaser, Attractions list).
- `src/components/BrowseScreen.js` — the full filterable Dining/Wine/Attractions list, split out of Build.
- `src/components/EventsScreen.js` — the standalone community-events page.
- `src/components/TripScreen.js` — the Trip details page (home hotel, trip length, arrival date), opened from every topbar's trip button.
- `src/components/MapView.js` — the real Leaflet map, full-bleed on the Map screen (plan stops only, rendered as labeled cards). Basemap is Esri "Light Gray Canvas" (muted grey base + sparse street-name reference layer) so the pins carry the visual weight — keyless, no account.
- `src/preact.js` — the view-layer barrel: re-exports Preact + hooks and the `html\`\`` (htm) tagged template every component uses instead of JSX.
- `src/main.js` — entry point: renders `<App/>` and registers the service worker.
- `serve.mjs` — the zero-dependency local static server (`npm run dev`). Not needed in production.
- `src/components/GuideChips.js` / `StubList.js` — the guide filter chips (Browse passes `only` to drop Events), the per-guide tag filter row, and the "ticket stub" place list (with the plan +/✓ toggle, Open now dot, and rating).
- `src/components/FeaturedPicks.js` — Build's Sponsored section cards (with the per-card "Sponsored" disclosure).
- `src/components/PlaceDetail.js` — the place-detail overlay opened from any screen.
- `src/components/FullMapScreen.js` — the Map screen: full-bleed map of just your plan + next-stop banner + empty-plan hint.
- `src/components/PlanScreen.js` / `PlanSheet.js` — the Plan tab and its list, Share button, and Google Maps handoff.
- `src/components/HotelPicker.js` — the first-run home-hotel sheet.
- `src/data/featured.js` — the Sponsored section's entries (real places from `guides.js`; house placeholders until real advertisers are sold — see the file header).
- `src/components/InstallPrompt.js` / `WeatherNudge.js` / `ItineraryPicks.js` / `OfflineBanner.js` — the Build-tab banners and ready-made-itinerary row.
- `src/styles/organic.css` — the licensed Organic token sheet, unmodified except the client's five background-token overrides (documented inline).
- `src/styles/app.css` — this app's component styles, built only from `var(--*)` tokens, plus the Leaflet chrome overrides.

## Not in this build

No accounts, no server-side storage. The map's route line follows real sidewalks (keyless OSRM), but routed turn-by-turn *durations* aren't computed in-app — the Google Maps handoff covers exact timing. Reminders are foreground-only (see "Install & reminders" above) — true background push would need a server to hold subscriptions, which is outside this app's no-backend scope.

## A note on how this was built

Originally a React 18 + Vite 5 app; converted to a no-build static site (Preact + htm for the view layer, Leaflet loaded as a plain `<script>`, everything served straight from the repo root) to drop the ~48 MB build toolchain — the running app is unchanged. After the conversion every screen was exercised in a real browser: all four guides, Browse/Events/Trip pages, the plan builder with drag-reorder and editable 30-minute times, the Leaflet map with road-following route lines, place detail, and the first-run sheets. `lib/weather.js`'s live fetch and `beforeinstallprompt`/`Notification`/`navigator.share` are standard browser APIs used defensively (try/catch, feature-detected, silent fallback) — give install, the rainy-day nudge, share, and reminders a run-through on a deployed `https://` origin before calling this done.
