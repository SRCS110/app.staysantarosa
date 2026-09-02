import React from 'react';
import { ChevronLeft, ExternalLink, MapPinIcon, GuideIcon } from './icons.jsx';
import { estimateFrom } from '../lib/geo.js';

const TAG_KIND = ['tag-accent', 'tag-accent-2', 'tag-neutral'];

function directionsUrl(place) {
  if (place.mapsUrl && place.mapsUrl !== 'https://maps.google.com/?cid=?') return place.mapsUrl;
  return `https://maps.google.com/?q=${encodeURIComponent(place.address || place.name)}`;
}

export default function PlaceDetail({
  place,
  guideTitle,
  userLocation,
  inPlan,
  visited,
  onBack,
  onToggleInPlan,
  onToggleVisited,
}) {
  const liveWalk = userLocation ? estimateFrom(userLocation, place) : null;

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
          <GuideIcon guideKey={place.guideKey} size={13} /> {guideTitle}
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
          {liveWalk && (
            <div className="walk-card walk-card-live">
              <span className="walk-card-label">From you</span>
              <span className="walk-card-value">{liveWalk.min}</span>
              <span className="walk-card-detail">min {liveWalk.mode}</span>
            </div>
          )}
          <div className="walk-card">
            <span className="walk-card-label">From Courthouse Square</span>
            <span className="walk-card-value">{place.walk.min}</span>
            <span className="walk-card-detail">min {place.walk.mode}</span>
          </div>
        </div>

        {inPlan && (
          <button
            type="button"
            className={`visited-toggle${visited ? ' visited-toggle-active' : ''}`}
            onClick={onToggleVisited}
            aria-pressed={visited}
          >
            {visited ? '✓ Visited' : 'Mark as visited'}
          </button>
        )}

        <div className="detail-actions">
          <button
            type="button"
            className={`btn btn-primary btn-block detail-primary${inPlan ? ' detail-primary-active' : ''}`}
            onClick={onToggleInPlan}
            aria-pressed={inPlan}
          >
            {inPlan ? '✓ In plan' : 'Add to plan'}
          </button>

          <a
            className="icon-circle-btn-outline"
            href={directionsUrl(place)}
            target="_blank"
            rel="noreferrer"
            aria-label="Get directions"
            title="Get directions"
          >
            <MapPinIcon size={20} />
          </a>
        </div>

        {place.website && (
          <a className="detail-website-link" href={place.website} target="_blank" rel="noreferrer">
            Visit website <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
