import React from 'react';
import { DownloadIcon, XIcon } from './icons.jsx';

// A slim, dismissible banner offering the native "Add to Home Screen"
// install prompt — the real lever for a guest reopening this across a
// multi-day stay instead of re-finding it in a browser tab each time.
// App.jsx only renders this once it has actually captured a
// beforeinstallprompt event (Chrome/Edge/Android; iOS Safari never fires
// one — there's nothing to show there, which App.jsx already accounts for).
export default function InstallPrompt({ onInstall, onDismiss }) {
  return (
    <div className="install-banner">
      <span className="install-banner-icon">
        <DownloadIcon size={18} />
      </span>
      <span className="install-banner-text">
        <strong>Add to your home screen</strong>
        <span>Open it like an app for the rest of your stay — no browser tab to hunt for.</span>
      </span>
      <button type="button" className="install-banner-cta" onClick={onInstall}>
        Install
      </button>
      <button type="button" className="install-banner-dismiss" onClick={onDismiss} aria-label="Dismiss">
        <XIcon size={14} />
      </button>
    </div>
  );
}
