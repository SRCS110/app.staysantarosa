import React from 'react';

// The "ticket stub" sheet — perforated top edge (a row of pill notches cut
// into the dark panel above it), guide title/count, and the place list.
export default function StubList({ guide, onOpenPlace }) {
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

      <p className="stub-caption">walk · Art House / Hotel E</p>

      <div className="stub-list">
        {guide.places.map((p) => (
          <button key={p.l} type="button" className="stub-row" onClick={() => onOpenPlace(p)}>
            <span className="stub-letter">{p.l}</span>
            <span className="stub-info">
              <span className="stub-name">{p.name}</span>
              <span className="stub-note">{p.note}</span>
            </span>
            <span className="stub-walk">
              <span>
                {p.walk.artHouse.min} min{p.walk.artHouse.mode === 'drive' ? ' drive' : ''}
              </span>
              <span>
                {p.walk.hotelE.min} min{p.walk.hotelE.mode === 'drive' ? ' drive' : ''}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
