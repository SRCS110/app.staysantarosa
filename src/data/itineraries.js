// Curated cross-guide bundles for one-tap planning — every stop here is a
// real place already in data/guides.js (nothing invented for this list).
// Picked by hand for geographic sense (Railroad Square, downtown) or by an
// honest data signal already on the places themselves (staffPick, indoor),
// not randomly. "Add all" just calls the same addManyToPlan the +/✓ toggle
// uses, so anything already in the plan is left alone, not duplicated.

export const ITINERARIES = [
  {
    key: 'railroad-square',
    title: 'Railroad Square Crawl',
    blurb: 'Breakfast to nightcap without leaving the historic depot district.',
    refs: [
      { guideKey: 'dining', name: 'Besame Mucho' },
      { guideKey: 'dining', name: "Jackson's Bar and Oven" },
      { guideKey: 'dining', name: 'The Goose & Fern' },
      { guideKey: 'dining', name: "Grossman's Noshery & Bar" },
    ],
  },
  {
    key: 'wine-walk',
    title: 'Downtown Wine Walk',
    blurb: 'Three walkable tasting rooms and breweries, all a few blocks from the square.',
    refs: [
      { guideKey: 'wine', name: 'Russian River Brewing Company' },
      { guideKey: 'wine', name: 'Stonemason Cellars' },
      { guideKey: 'wine', name: 'Shady Oak Brewing Company' },
    ],
  },
  {
    key: 'museums',
    title: 'Museums & Culture',
    blurb: 'A cultural half-day — two museums and a garden, one short drive between them.',
    refs: [
      { guideKey: 'attractions', name: 'Museum of Sonoma County' },
      { guideKey: 'attractions', name: 'Luther Burbank Home & Gardens' },
      { guideKey: 'attractions', name: 'Charles M. Schulz Museum' },
    ],
  },
  {
    key: 'staff-picks',
    title: 'Staff Picks Sampler',
    blurb: "Four walkable spots the site's own guide flags as staff favorites.",
    refs: [
      { guideKey: 'dining', name: 'J & A Lounge' },
      { guideKey: 'dining', name: "Ca'Bianca" },
      { guideKey: 'dining', name: "Crook's Coffee" },
      { guideKey: 'dining', name: "Lococo's" },
    ],
  },
];
