import { html, useMemo, useState } from '../preact.js';
import { GuideIcon, StarIcon } from './icons.js';
import { openStatus } from '../lib/hours.js';

// The "ticket stub" sheet — perforated top edge (a row of pill notches cut
// into the dark panel above it), guide title/count, a secondary filter-chip
// row built from whatever tags this guide's own places actually carry, and
// the place list. Each row opens the place; the +/✓ toggle on the right
// adds or removes it from the visitor's self-built plan without leaving
// the list.
export default function StubList({ guide, onOpenPlace, isInPlan, onTogglePlan, homeLabel = 'Courthouse Square' }) {
  const [activeTags, setActiveTags] = useState([]);

  // Tags worth offering as filters — skip the "Walkable"/"Drive" ones,
  // which just restate the walk time already shown on every row.
  const availableTags = useMemo(() => {
    const skip = new Set(['Walkable', 'Drive']);
    const seen = new Set();
    guide.places.forEach((p) =>
      p.tags.forEach((t) => {
        if (!skip.has(t)) seen.add(t);
      })
    );
    return Array.from(seen);
  }, [guide]);

  function toggleTag(tag) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  const visiblePlaces = activeTags.length
    ? guide.places.filter((p) => activeTags.every((t) => p.tags.includes(t)))
    : guide.places;

  return html`
    <div className="stub-sheet">
      <div className="stub-perforation" aria-hidden="true">
        ${Array.from({ length: 10 }).map((_, i) => html`<span key=${i} className="stub-notch" />`)}
      </div>

      <div className="stub-header">
        <div>
          <h2 className="stub-title">${guide.title}</h2>
          <p className="stub-count">
            ${visiblePlaces.length} ${visiblePlaces.length === 1 ? 'place' : 'places'}${activeTags.length
              ? ` of ${guide.places.length}`
              : ''}
          </p>
        </div>
      </div>

      ${availableTags.length > 1 &&
      html`
        <div className="stub-tag-row" key=${guide.key}>
          ${availableTags.map(
            (tag) => html`
              <button
                key=${tag}
                type="button"
                className=${`stub-tag-chip${activeTags.includes(tag) ? ' stub-tag-chip-active' : ''}`}
                onClick=${() => toggleTag(tag)}
                aria-pressed=${activeTags.includes(tag)}
              >
                ${tag}
              </button>
            `
          )}
        </div>
      `}

      <p className="stub-caption">walk · from ${homeLabel}</p>

      <div className="stub-list">
        ${visiblePlaces.length === 0 &&
        html`<p className="stub-empty">Nothing matches those filters — try clearing one.</p>`}
        ${visiblePlaces.map((p) => {
          const inPlan = isInPlan ? isInPlan(p) : false;
          const status = p.hours ? openStatus(p.hours) : null;
          return html`
            <div key=${p.l} className="stub-row">
              <button type="button" className="stub-row-tap" onClick=${() => onOpenPlace(p)}>
                <span className="stub-letter">
                  <${GuideIcon} guideKey=${guide.key} size=${14} />
                </span>
                <span className="stub-info">
                  <span className="stub-name-row">
                    <span className="stub-name">${p.name}</span>
                    ${status &&
                    html`<span
                      className=${`stub-open-dot${status.open ? ' stub-open-dot-open' : ''}`}
                      aria-hidden="true"
                    />`}
                  </span>
                  <span className="stub-note">
                    ${p.note}
                    ${p.rating != null &&
                    html`<span className="stub-rating"><${StarIcon} size=${10} /> ${p.rating.toFixed(1)}</span>`}
                  </span>
                </span>
                <span className="stub-walk">
                  <span>${p.walk.min} min${p.walk.mode === 'drive' ? ' drive' : ''}</span>
                </span>
              </button>
              ${onTogglePlan &&
              html`
                <button
                  type="button"
                  className=${`stub-plan-toggle${inPlan ? ' stub-plan-toggle-active' : ''}`}
                  onClick=${() => onTogglePlan(p)}
                  aria-pressed=${inPlan}
                  aria-label=${inPlan ? `Remove ${p.name} from plan` : `Add ${p.name} to plan`}
                >
                  ${inPlan ? '✓' : '+'}
                </button>
              `}
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
