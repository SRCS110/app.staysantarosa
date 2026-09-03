// Sponsored placements for the Build home page's "Sponsored" section.
// Each entry is a real place already in data/guides.js — the app never
// invents a business — and the section is labelled "Sponsored" in the UI
// so guests can tell paid placement from the editorial guide.
//
// IMPORTANT: as of this writing NO advertiser has actually paid for these
// slots. The list below is house placeholders (walkable downtown spots)
// so the section isn't empty before the property sells the inventory.
// When real sponsors sign on, replace these with their places and keep
// the count small (≈5). The `why` line is ad copy — keep it factual;
// don't add ratings/hours/photos that aren't in guides.js.

export const FEATURED = [
  {
    guideKey: 'dining',
    name: "Crook's Coffee",
    why: 'Closest good espresso to both hotels — a 2-minute walk.',
  },
  {
    guideKey: 'dining',
    name: 'Omelet Express',
    why: 'Downtown breakfast institution on 4th Street, open early daily.',
  },
  {
    guideKey: 'wine',
    name: 'Stonemason Cellars',
    why: 'Highest-rated tasting room in the wine guide, open into the evening.',
  },
  {
    guideKey: 'wine',
    name: 'Russian River Brewing Company',
    why: 'The Pliny brewery — a short walk from the square.',
  },
  {
    guideKey: 'attractions',
    name: 'Charles M. Schulz Museum',
    why: "Santa Rosa's signature museum, dedicated to the Peanuts creator.",
  },
];
