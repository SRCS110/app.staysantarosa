# Stay Santa Rosa — City Guide (mobile app)

A free, no-account mobile guide for Art House Santa Rosa and Hotel E guests: a real interactive map, four curated guides (Dining, Wine & Beer, Attractions, Events), a self-built walking plan with Google Maps handoff, and opt-in live location tracking. Built on the Organic design system (direction 1b, "Ticket stub"), with the client's softer-white background override baked in. Each guide has its own category glyph (fork & knife, wine glass, mask, calendar) used on the list badges, chip row, and map pins in place of generic letters.

## Run it

```
npm install
npm run dev
```

Open the printed local URL — resize the browser to phone width, or use its device-toolbar/responsive mode. `npm run build` outputs a static `dist/` folder that deploys as-is to Vercel, Netlify, GitHub Pages, or any static host — no server, no environment variables, no database. Location tracking needs a secure context (`https://`, or `localhost` during dev) — browsers refuse the Geolocation API otherwise.

## Navigation — a floating bottom nav, three tabs

A rounded, frosted-glass nav floats over the bottom of every screen with three tabs — switching between them doesn't push a new screen or lose scroll position, it's a flat tab switch:

1. **Build** — the old home screen: a small live map (real OpenStreetMap/CARTO tiles via Leaflet, not a drawing) at the top, the four guide filter chips, and the place list below. Tap **+** on any row to add that place to your plan without leaving the list.
2. **Plan** — your self-built itinerary on its own page, no map underneath. Numbered stops, tap a stop's number to mark it visited, reorder with ↑/↓, remove or clear stops, and hand the whole route to Google Maps as a multi-stop walking route (`Open in Google Maps`, up to ~8 waypoints). The bottom nav's Plan tab shows a live stop count badge.
3. **Map** — everything shown relative to you: the map is a fixed-height section up top; a normal part of the scrolling page, not a fixed-viewport takeover. Your plan still renders on it as numbered stops with a route line and a **Next stop** banner (distance from your live location if it's on, otherwise from Courthouse Square). The **Pins / Rings** toggle switches to direction 1c's walking-time rings — 5/12/25-minute dashed circles from Courthouse Square or your own location, with the origin switcher and a live per-ring place count in normal flow right underneath the map.

Tapping a place (from Build's list or Map's pins) opens **Place detail** as a full-screen overlay on top of the current tab — photo plate, tags, description, walking/driving time from Courthouse Square (and a third live card, "From you", once location is on), an **Add to plan** button, a **Mark as visited** toggle once it's in your plan, and an outlined pin button that opens it in Google/Apple Maps for turn-by-turn directions. Its back arrow returns to whichever tab you opened it from; the bottom nav hides while it's open.

## Map gestures (cooperative, not trapped scroll)

Both maps (Build's mini map and the Map tab's full map) sit inside a page that scrolls, so they use the same "cooperative" gesture handling embedded Google Maps uses, instead of grabbing every touch/scroll that crosses them: on touch, one finger always scrolls the page — two fingers pan or pinch-zoom the map; on a trackpad or mouse, a plain scroll scrolls the page — hold **Ctrl** (**⌘** on Mac) **+ scroll** to zoom the map. A brief on-map hint ("Use two fingers…" / "Use ⌘/Ctrl + scroll…") shows when a gesture falls through to the page instead of moving the map. Desktop click-and-drag still pans the map directly, since it doesn't compete with page scrolling the way touch/wheel gestures do.

## Live location

Tap the compass button (bottom-right of any map) to start tracking — it's the browser's native permission prompt, opt-in, off by default, and nothing is sent anywhere: `navigator.geolocation.watchPosition` updates a marker on the map and feeds the live distance numbers, all client-side. Tapping the button again stops tracking and drops the stored position. No location is persisted to `localStorage` or anywhere else.

## The plan (device-local only)

Stops you add live in `localStorage` under `ssr-plan-v1` — nothing leaves the device, matching the "no accounts, no personal data" constraint from the design handoff. Clearing site data or using a different browser starts a fresh plan.

## What's real vs. placeholder

- **Real:** every place name, address, phone, hours and rating in `src/data/guides.js` came from staysantarosa.com's own restaurant/wine/attractions guide pages (Dining, Wine & Beer, Attractions) and its "Major Events" annual calendar (Events) — see the comment at the top of that file for exactly what's sourced vs. estimated, including the two hotels/Courthouse Square and the event-venue coordinates.
- **Placeholder, by design:** the static walk/drive minutes are straight-line estimates, not routed directions (Leaflet has no built-in routing engine; the map itself is now real, but turn-by-turn distance still needs a directions API — Google's handoff button covers that today). Photo slots are hatched placeholders labeled with what belongs there.

**One reference point:** all static walk/drive times are measured from Old Courthouse Square rather than from each hotel separately. Hotel E's address (37 Old Courthouse Square) is that same point, so its former per-place numbers were kept as-is and simply relabeled — Art House remains on the map as a landmark but is no longer a distance origin.

Before shipping: get a verified coordinate for Courthouse Square/Art House (currently estimated from the site's own "N min walk to X" copy); replace photo placeholders; and double-check hours, phones and "closed" days, which change.

## Structure

- `src/data/guides.js` — the whole content bundle (4 guides × places, each with lat/lng). Edit this file to add/remove/edit places.
- `src/lib/geo.js` — haversine distance, walk/drive time estimates, walking-ring radii.
- `src/lib/planStorage.js` — localStorage read/write for the plan.
- `src/components/BottomNav.jsx` — the floating Build/Plan/Map tab bar.
- `src/components/MapView.jsx` — the real Leaflet map (pins mode + rings mode), used both small (Build tab) and full-bleed (Map tab).
- `src/components/PlanPanel.jsx` — Build tab's mini map wrapper.
- `src/components/GuideChips.jsx` / `StubList.jsx` — the four filter chips and the perforated "ticket stub" place list (with the plan +/✓ toggle).
- `src/components/PlaceDetail.jsx` — the place-detail overlay opened from Build or Map.
- `src/components/FullMapScreen.jsx` — the Map tab: map + Pins/Rings toggle + next-stop banner, ring-origin switcher in normal flow underneath (Rings mode only).
- `src/components/PlanScreen.jsx` — the Plan tab's page frame around `PlanSheet.jsx`.
- `src/components/PlanSheet.jsx` / `RingOriginSheet.jsx` — the plan list (Plan tab) and the ring-origin switcher (Map tab, Rings mode).
- `src/styles/organic.css` — the licensed Organic token sheet, unmodified except the client's five background-token overrides (documented inline).
- `src/styles/app.css` — this app's component styles, built only from `var(--*)` tokens, plus the Leaflet chrome overrides.

## Not in this build

No accounts, no server-side storage, no offline place caching beyond the app shell, no open-now filtering, no sharing, no curated (pre-built) itineraries — only the ones a visitor builds themselves. Routed (turn-by-turn) distances aren't computed in-app; the Google Maps handoff covers that on real roads/sidewalks instead of straight-line estimates.

## A note on how this was built

I couldn't run `npm install` myself to test this — this build environment has no npm registry access — so every component that doesn't touch the Leaflet map was rendered server-side with React as a smoke test (all four guides × every place × every plan/visited/location state), and every file was syntax-checked. `MapView.jsx` (the one file that talks to Leaflet directly) could only be checked by careful reading against the Leaflet API, not executed, since Leaflet needs a real browser DOM. Give the map, the plan builder, and location tracking a real run-through before calling this done.
