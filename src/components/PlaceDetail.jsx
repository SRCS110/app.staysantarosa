import React from 'react';
import { ChevronLeft, ArrowRight, ExternalLink, MapPinIcon } from './icons.jsx';

const TAG_KIND = ['tag-accent', 'tag-accent-2', 'tag-neutral'];

function directionsUrl(place) {
  if (place.mapsUrl && place.mapsUrl !== 'https://maps.google.com/?cid=?') return place.mapsUrl;
  return `https://maps.google.com/?q=${encodeURIComponent(place.address || place.name)}`;
}

export default function PlaceDetail({ place, guideTitle, onBack, onShowOnPlan }) {
  const hasPin = place.x !== undefined;

  return (
    <div className="detail-screen">
      <div className="detail-topbar">
        <button type="button" className="icon-circle-btn" onClick={onBack} aria-label="Back">
          <ChevronLeft />
        </button>
      </div>

      <div className="detail-body">
        <h1 className="detail-title">{place.name}</h1>
        <p className="detail-subtitle">
          {guideTitle} · pin {place.l}
        </p>

        <div className="detail-photo-plate">
          <span>{place.note} photo</span>
        </div>

        <div className="detail-tags">
          {place.tags.slice(0, 3).map((t, i) => (
            <span key={t} className={`tag ${TAG_KIND[i % TAG_KIND.length]}`}>
              {t}
            </span>
          ))}
        </div>

        <p className="detail-copy">{place.description}</p>

        {place.address && <p className="detail-meta">{place.address}</p>}
        {place.hoursNote && <p className="detail-meta detail-meta-muted">{place.hoursNote}</p>}

        <div className="detail-walk-cards">
          <div className="walk-card">
            <span className="walk-card-label">From Art House</span>
            <span className="walk-card-value">{place.walk.artHouse.min}</span>
            <span className="walk-card-detail">min {place.walk.artHouse.mode}</span>
          </div>
          <div className="walk-card">
            <span className="walk-card-label">From Hotel E</span>
            <span className="walk-card-value">{place.walk.hotelE.min}</span>
            <span className="walk-card-detail">min {place.walk.hotelE.mode}</span>
          </div>
        </div>

        <div className="detail-actions">
          {hasPin ? (
            <button type="button" className="btn btn-primary btn-block detail-primary" onClick={onShowOnPlan}>
              Show on plan <ArrowRight size={16} />
            </button>
          ) : (
            <a
              className="btn btn-primary btn-block detail-primary"
              href={directionsUrl(place)}
              target="_blank"
              rel="noreferrer"
            >
              Get directions <ArrowRight size={16} />
            </a>
          )}
          <a
            className="icon-circle-btn icon-circle-btn-outline"
            href={directionsUrl(place)}
            target="_blank"
            rel="noreferrer"
            aria-label={hasPin ? 'Get directions' : 'Open website'}
            title={hasPin ? 'Get directions' : 'Open website'}
          >
            {hasPin ? <MapPinIcon size={20} /> : <ExternalLink size={20} />}
          </a>
        </div>
      </div>
    </div>
  );
}
