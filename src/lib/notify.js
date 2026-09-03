// Local reminder notifications — opt-in, device-only, no server. Honest
// limitation, worth stating plainly: without a backend to hold a push
// subscription, these can only fire while this tab is open (or briefly
// backgrounded) and the visitor returns to it — there is no true
// background push here. What it actually does: each time the app becomes
// visible again, it checks the next unvisited plan stop's real hours
// (dining places only — the only guide with structured `hours`) and, if
// it closes soon, fires one local Notification. Never nags twice for the
// same stop on the same day.

import { openStatus } from './hours.js';

const ENABLED_KEY = 'ssr-notify-enabled-v1';
const NOTIFIED_KEY = 'ssr-notify-last-v1';
const CLOSING_SOON_MINUTES = 45;

export function isNotifySupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isNotifyEnabled() {
  if (!isNotifySupported()) return false;
  try {
    return window.localStorage.getItem(ENABLED_KEY) === '1' && Notification.permission === 'granted';
  } catch {
    return false;
  }
}

export async function enableNotify() {
  if (!isNotifySupported()) return false;
  const permission = await Notification.requestPermission();
  const granted = permission === 'granted';
  try {
    window.localStorage.setItem(ENABLED_KEY, granted ? '1' : '0');
  } catch {
    // best-effort only
  }
  return granted;
}

export function disableNotify() {
  try {
    window.localStorage.setItem(ENABLED_KEY, '0');
  } catch {
    // best-effort only
  }
}

// Call this on visibilitychange (tab foregrounded) with the next unvisited
// plan stop. Fires at most one Notification per stop per day.
export function checkNextStopClosingSoon(nextStop) {
  if (!isNotifyEnabled() || !nextStop || !nextStop.hours) return;
  const status = openStatus(nextStop.hours);
  if (!status || !status.open || !status.closesAt) return;

  const now = new Date();
  const [, closeHourRaw, closeMinRaw, meridiem] = status.closesAt.match(/(\d+):(\d+)\s(AM|PM)/) || [];
  if (!closeHourRaw) return;
  let closeHour = parseInt(closeHourRaw, 10) % 12;
  if (meridiem === 'PM') closeHour += 12;
  const nowPacific = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const closeToday = new Date(nowPacific);
  closeToday.setHours(closeHour, parseInt(closeMinRaw, 10), 0, 0);
  let minutesUntilClose = (closeToday - nowPacific) / 60000;
  if (minutesUntilClose < 0) minutesUntilClose += 24 * 60; // closes after midnight

  if (minutesUntilClose > CLOSING_SOON_MINUTES) return;

  const dedupeKey = `${nextStop.name}:${new Date().toDateString()}`;
  try {
    if (window.localStorage.getItem(NOTIFIED_KEY) === dedupeKey) return;
    window.localStorage.setItem(NOTIFIED_KEY, dedupeKey);
  } catch {
    // if we can't dedupe, skip rather than risk repeat nagging
    return;
  }

  try {
    new Notification(`${nextStop.name} closes at ${status.closesAt}`, {
      body: 'Next stop on your plan — tap to open Stay Santa Rosa.',
      icon: '/icons/icon-192.png',
    });
  } catch {
    // Notification constructor can throw in some contexts (e.g. iOS Safari) — ignore
  }
}
