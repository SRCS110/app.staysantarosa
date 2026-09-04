import { html } from '../preact.js';
import { GuideIcon } from './icons.js';

// Build home: the sponsored-placement section (data/featured.js). Cards
// carry a visible "Sponsored" disclosure so guests can tell paid
// placement from the editorial guide. Every entry is still a real place
// in data/guides.js and the walk time is the real figure — see
// featured.js for the note on which slots are sold vs. house placeholders.
export default function FeaturedPicks({ picks, onOpenPlace }) {
  if (!picks.length) return null;
  return html`
    <section className="featured" aria-label="Sponsored places">
      <div className="featured-head">
        <h2 className="featured-title">Sponsored</h2>
        <p className="featured-sub">Local businesses featured in this guide</p>
      </div>
      <div className="featured-list">
        ${picks.map(
          (p) => html`
            <button
              key=${`${p.guideKey}:${p.name}`}
              type="button"
              className="featured-card"
              onClick=${() => onOpenPlace(p, p.guideKey)}
            >
              <span className="featured-card-glyph">
                <${GuideIcon} guideKey=${p.guideKey} size=${15} />
              </span>
              <span className="featured-card-body">
                <span className="featured-card-tag">Sponsored</span>
                <span className="featured-card-name">${p.name}</span>
                <span className="featured-card-why">${p.why}</span>
              </span>
              <span className="featured-card-walk">
                ${p.walk.min} min${p.walk.mode === 'drive' ? ' drive' : ''}
              </span>
            </button>
          `
        )}
      </div>
    </section>
  `;
}
