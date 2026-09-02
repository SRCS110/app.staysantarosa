# Stay Santa Rosa — City Guide (mobile app)

A free, no-account mobile guide for Art House Santa Rosa and Hotel E guests: an illustrated downtown plan plus four guides (Dining, Wine & Beer, Attractions, Walks), each place showing walking time from both hotels. Built to the "1b — Ticket stub" direction from the design handoff, on the Organic design system with the client's softer-white background override baked in.

## Run it

```
npm install
npm run dev
```

Open the printed local URL — resize the browser to phone width, or use its device-toolbar/responsive mode, to see it as intended. `npm run build` outputs a static `dist/` folder that deploys as-is to Vercel, Netlify, GitHub Pages, or any static host — no server, no environment variables, no database.

## What's real vs. placeholder

- **Real:** every place name, address, phone, hours and rating in `src/data/guides.js` came from staysantarosa.com's own restaurant/wine/attractions guide pages and its walking-Santa-Rosa blog post.
- **Placeholder, by design:** walking/driving times are estimated from straight-line distance (no routed directions), and the two hotels' coordinates plus every pin's `x`/`y` plan position are approximate — the plan itself is a schematic drawing, not a real map, per the handoff's own "high-fidelity style, low-fidelity map geometry" note. All photo slots are hatched placeholders labeled with what belongs there.

Before shipping: swap in a real illustrated downtown plan (or one generated from OpenStreetMap and styled to match) and re-author each place's `x`/`y` against it; get verified addresses/coordinates for the two hotels; replace photo placeholders; and double check hours, phones and "closed" days, which change.

## Structure

- `src/data/guides.js` — the whole content bundle (4 guides × places). Edit this file to add/remove/edit places — no other file needs to change.
- `src/components/PlanPanel.jsx` — the schematic plan + pins.
- `src/components/GuideChips.jsx` — the four filter chips.
- `src/components/StubList.jsx` — the perforated "ticket stub" place list.
- `src/components/PlaceDetail.jsx` — the second screen (back chevron, photo plate, tags, walk-time cards, Show on plan / Get directions).
- `src/styles/organic.css` — the licensed Organic design-system token sheet, unmodified except for the client's five background-token overrides (documented inline).
- `src/styles/app.css` — this app's component styles, built only from `var(--*)` tokens.

## Not in this build (per the handoff's scope)

No accounts, no saved lists, no offline place caching beyond the app shell, no open-now filtering, no sharing, no curated itineraries, no hotel-switching rings (that's direction 1c, not built). The two things the handoff calls out as **not yet implemented, to build next**: tapping a stub row always opens detail (done), but "Show on plan" currently just returns to the plan and pulses the pin — wire it to actually scroll/center that pin once the plan is a real scrollable illustration rather than a fixed-aspect panel.
