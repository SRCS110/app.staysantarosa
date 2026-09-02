import React from 'react';
import { GridIcon, ChecklistIcon, MapFoldIcon } from './icons.jsx';

// Floating, rounded, frosted-glass bottom nav — the app's three top-level
// tabs. Build is the old home screen (filters + mini map + place list),
// Plan is the visitor's self-built itinerary, Map is the full map with
// everything (pins, plan route, live location) shown relative to you.
const TABS = [
  { key: 'build', label: 'Build', Icon: GridIcon },
  { key: 'plan', label: 'Plan', Icon: ChecklistIcon },
  { key: 'map', label: 'Map', Icon: MapFoldIcon },
];

export default function BottomNav({ activeTab, onSelect, planCount }) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="bottom-nav-bar">
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              className={`bottom-nav-btn${active ? ' bottom-nav-btn-active' : ''}`}
              onClick={() => onSelect(key)}
              aria-current={active ? 'page' : undefined}
            >
              <span className="bottom-nav-icon-wrap">
                <Icon size={19} />
                {key === 'plan' && planCount > 0 && (
                  <span className="bottom-nav-badge">{planCount > 9 ? '9+' : planCount}</span>
                )}
              </span>
              <span className="bottom-nav-label">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
