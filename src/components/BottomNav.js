import { html } from '../preact.js';
import { GridIcon, ChecklistIcon, CalendarIcon } from './icons.js';

// Floating, rounded, frosted-glass bottom nav — the app's three primary
// destinations on phones. Build is the home screen, Plan is the visitor's
// self-built itinerary, Events is the community-events calendar. Browse
// (the full filterable dining/wine/attractions list) and Map are reached
// from the top nav instead, to keep this bar to three targets.
const TABS = [
  { key: 'build', label: 'Build', Icon: GridIcon },
  { key: 'plan', label: 'Plan', Icon: ChecklistIcon },
  { key: 'events', label: 'Events', Icon: CalendarIcon },
];

export default function BottomNav({ activeTab, onSelect, planCount }) {
  return html`
    <nav className="bottom-nav" aria-label="Main">
      <div className="bottom-nav-bar">
        ${TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return html`
            <button
              key=${key}
              type="button"
              className=${`bottom-nav-btn${active ? ' bottom-nav-btn-active' : ''}`}
              onClick=${() => onSelect(key)}
              aria-current=${active ? 'page' : undefined}
            >
              <span className="bottom-nav-icon-wrap">
                <${Icon} size=${19} />
                ${key === 'plan' &&
                planCount > 0 &&
                html`<span className="bottom-nav-badge">${planCount > 9 ? '9+' : planCount}</span>`}
              </span>
              <span className="bottom-nav-label">${label}</span>
            </button>
          `;
        })}
      </div>
    </nav>
  `;
}
