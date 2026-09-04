import { html } from '../preact.js';
import { CloudRainIcon, XIcon } from './icons.js';

// Shown on the Build tab only when the live Santa Rosa forecast (see
// lib/weather.js) comes back rainy, and only ever suggests attractions
// already flagged `indoor: true` in guides.js — an objective call this
// app made (museums, the performing-arts center), not sourced from the
// site. Silent no-op if the weather fetch fails or it isn't rainy.
export default function WeatherNudge({ tempF, indoorPlaces, onOpenPlace, onDismiss }) {
  if (!indoorPlaces.length) return null;
  return html`
    <div className="weather-nudge">
      <div className="weather-nudge-head">
        <span className="weather-nudge-icon">
          <${CloudRainIcon} size=${16} />
        </span>
        <span className="weather-nudge-title">
          Rainy in Santa Rosa${tempF != null ? ` · ${Math.round(tempF)}°F` : ''} — indoor picks for today
        </span>
        <button
          type="button"
          className="weather-nudge-dismiss"
          onClick=${onDismiss}
          aria-label="Dismiss"
        >
          <${XIcon} size=${13} />
        </button>
      </div>
      <div className="weather-nudge-row">
        ${indoorPlaces.map(
          (p) => html`
            <button
              key=${p.name}
              type="button"
              className="weather-nudge-chip"
              onClick=${() => onOpenPlace(p, 'attractions')}
            >
              ${p.name}
            </button>
          `
        )}
      </div>
    </div>
  `;
}
