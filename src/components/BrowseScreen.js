import { html } from '../preact.js';
import TopNav from './TopNav.js';
import GuideChips from './GuideChips.js';
import StubList from './StubList.js';
import { GearIcon } from './icons.js';

// Browse — the full filterable list, broken out of the old Build page.
// Dining / Wine & Beer / Attractions only; Events has its own page.
const BROWSE_GUIDES = ['dining', 'wine', 'attractions'];

export default function BrowseScreen({
  guideKey,
  onSelectGuide,
  guide,
  onOpenPlace,
  isInPlan,
  onTogglePlan,
  homeLabel,
  planCount,
  tripLabel,
  onSelectTab,
}) {
  return html`
    <div className="screen screen-browse">
      <div className="screen-topbar">
        <span className="screen-kicker">Browse · Santa Rosa</span>
        <button type="button" className="screen-trip-btn" onClick=${() => onSelectTab('trip')}>
          <${GearIcon} size=${13} />
          <span>${tripLabel}</span>
          ${planCount > 0 && html`<span className="screen-trip-count">${planCount}</span>`}
        </button>
      </div>

      <${TopNav} activeTab="browse" onSelect=${onSelectTab} planCount=${planCount} />

      <div className="screen-body screen-body-flush">
        <${GuideChips} activeKey=${guideKey} onSelect=${onSelectGuide} only=${BROWSE_GUIDES} />
        <${StubList}
          guide=${guide}
          onOpenPlace=${(p) => onOpenPlace(p, guideKey)}
          isInPlan=${(p) => isInPlan(p, guideKey)}
          onTogglePlan=${(p) => onTogglePlan(p, guideKey)}
          homeLabel=${homeLabel}
        />
      </div>
    </div>
  `;
}
