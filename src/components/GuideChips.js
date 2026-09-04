import { html } from '../preact.js';
import { GUIDES } from '../data/guides.js';
import { GuideIcon } from './icons.js';

// Guide filter chips. `only` narrows the set (Browse shows dining/wine/
// attractions — Events has its own page now); default is every guide.
export default function GuideChips({ activeKey, onSelect, only }) {
  const guides = only ? GUIDES.filter((g) => only.includes(g.key)) : GUIDES;
  return html`
    <div className="chip-row" role="tablist" aria-label="Guides">
      ${guides.map((g) => {
        const active = g.key === activeKey;
        return html`
          <button
            key=${g.key}
            type="button"
            role="tab"
            aria-selected=${active}
            tabIndex=${0}
            className=${`guide-chip${active ? ' guide-chip-active' : ''}`}
            onClick=${() => onSelect(g.key)}
          >
            <${GuideIcon} guideKey=${g.key} size=${14} />
            ${g.tab}
          </button>
        `;
      })}
    </div>
  `;
}
