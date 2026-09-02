import React from 'react';
import { GUIDES } from '../data/guides.js';

export default function GuideChips({ activeKey, onSelect }) {
  return (
    <div className="chip-row" role="tablist" aria-label="Guides">
      {GUIDES.map((g) => {
        const active = g.key === activeKey;
        return (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={0}
            className={`guide-chip${active ? ' guide-chip-active' : ''}`}
            onClick={() => onSelect(g.key)}
          >
            {g.tab}
          </button>
        );
      })}
    </div>
  );
}
