import React from 'react';
import { Compass, MapFoldIcon } from './icons.jsx';

// Secondary navigation, above the fold on every primary screen. The phone
// bottom bar is kept to three targets (Build / Plan / Events), so the two
// remaining destinations — Browse (the full filterable dining/wine/
// attractions list) and Map (the plan on the real map) — live here. On
// desktop the sidebar covers everything, but this strip stays visible and
// harmless there too.
const LINKS = [
  { key: 'browse', label: 'Browse', Icon: Compass },
  { key: 'map', label: 'Map', Icon: MapFoldIcon },
];

export default function TopNav({ activeTab, onSelect, planCount = 0 }) {
  return (
    <div className="top-nav" role="navigation" aria-label="More">
      {LINKS.map(({ key, label, Icon }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            className={`top-nav-link${active ? ' top-nav-link-active' : ''}`}
            onClick={() => onSelect(key)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={14} />
            {label}
            {key === 'map' && planCount > 0 && <span className="top-nav-count">{planCount}</span>}
          </button>
        );
      })}
    </div>
  );
}
