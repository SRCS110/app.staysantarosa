// Device-local "which hotel are you staying at" choice — the same
// no-account, localStorage-only pattern as the plan itself. Nothing is
// sent anywhere; picking a hotel just swaps which point every walk/drive
// time in the app is measured from (via lib/geo.js's estimateFrom), in
// place of the shared Old Courthouse Square default used when a visitor
// skips the question or hasn't answered it yet.

const KEY = 'ssr-home-hotel-v1';

// Keep in sync with the keys in data/guides.js's HOTELS object.
const VALID_KEYS = ['artHouse', 'courthouseSquare', 'hyattRegency', 'hotelLaRose', 'acHotel', 'flamingo'];

export function loadHomeHotelKey() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return VALID_KEYS.includes(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveHomeHotelKey(key) {
  try {
    if (key) window.localStorage.setItem(KEY, key);
    else window.localStorage.removeItem(KEY);
  } catch {
    // best-effort only
  }
}

// Whether the first-run picker has already been shown/dismissed, so it
// only ever interrupts a visitor once even if they skip without choosing.
const ASKED_KEY = 'ssr-home-hotel-asked-v1';

export function hasAskedHomeHotel() {
  try {
    return window.localStorage.getItem(ASKED_KEY) === '1';
  } catch {
    return true;
  }
}

export function markAskedHomeHotel() {
  try {
    window.localStorage.setItem(ASKED_KEY, '1');
  } catch {
    // best-effort only
  }
}
