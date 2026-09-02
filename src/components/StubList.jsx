import React from 'react';
import { GuideIcon } from './icons.jsx';

// The "ticket stub" sheet — perforated top edge (a row of pill notches cut
// into the dark panel above it), guide title/count, and the place list.
// Each row opens the place; the +/✓ toggle on the right adds or removes it
// from the visitor's self-built plan without leaving the list.
export default function StubList({ guide, onOpenPlace, isInPlan, onTogglePlan }) {
  return (
    <div className="stub-sheet">
      <div className="stub-perforation" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="stub-notch" />
        ))}
      </div>

      <div className="stub-header">
        <div>
          <h2 className="stub-title">{guide.title}</h2>
          <p className="stub-count">
            {guide.places.length} {guide.places.length === 1 ? 'place' : 'places'}
          </p>
        </div>
      </div>

      <p className="stub-caption">walk · from Courthouse Square</p>

      <div className="stub-list">
        {guide.places.map((p) => {
          const inPlan = isInPlan ? isInPlan(p) : false;
          return (
            <div key={p.l} className="stub-row">
              <button type="button" className="stub-row-tap" onClick={() => onOpenPlace(p)}>
                <span className="stub-letter">
                  <GuideIcon guideKey={guide.key} size={14} />
                </span>
                <span className="stub-info">
                  <span className="stub-name">{p.name}</span>
                  <span className="stub-note">{p.note}</span>
                </span>
                <span className="stub-walk">
                  <span>
                    {p.walk.min} min{p.walk.mode === 'drive' ? ' drive' : ''}
                  </span>
                </span>
              </button>
              {onTogglePlan && (
                <button
                  type="button"
                  className={`stub-plan-toggle${inPlan ? ' stub-plan-toggle-active' : ''}`}
                  onClick={() => onTogglePlan(p)}
                  aria-pressed={inPlan}
                  aria-label={inPlan ? `Remove ${p.name} from plan` : `Add ${p.name} to plan`}
                >
                  {inPlan ? '✓' : '+'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
