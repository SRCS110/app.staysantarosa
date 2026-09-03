import React from 'react';
import { WifiOffIcon } from './icons.jsx';

// The service worker already caches the app shell and anything the
// visitor has loaded before (cache-first with a network refresh — see
// public/sw.js), so the app keeps working with no signal. This banner
// just tells the visitor that's what's happening, so a place that hasn't
// been opened before reads as "not cached yet," not "broken."
export default function OfflineBanner() {
  return (
    <div className="offline-banner">
      <WifiOffIcon size={14} />
      <span>You're offline — showing what's already loaded.</span>
    </div>
  );
}
