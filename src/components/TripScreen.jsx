import React, { useState } from 'react';
import TopNav from './TopNav.jsx';
import { ChevronLeft, BedIcon, PencilIcon } from './icons.jsx';

// Trip details — a full page (not the first-run modal) to change the two
// things that personalize the whole app: which hotel every walk/drive
// time is measured from, and how many days the visitor is in town (plus
// an optional arrival date). Everything is device-local, same as before.
export default function TripScreen({
  hotels,
  homeHotelKey,
  trip,
  planCount,
  onSaveHotel,
  onSaveTrip,
  onClearPlan,
  onBack,
  onSelectTab,
}) {
  const [days, setDays] = useState(Math.max(1, trip?.days || 2));
  const [startDate, setStartDate] = useState(trip?.startDate || '');
  const [hotelKey, setHotelKey] = useState(homeHotelKey || 'courthouseSquare');
  const [savedFlash, setSavedFlash] = useState(false);

  function save() {
    onSaveHotel(hotelKey);
    onSaveTrip({ days, startDate: startDate || null });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  }

  const hotelOptions = [
    { key: 'artHouse', label: hotels.artHouse.fullName, hint: 'A few blocks from Old Courthouse Square' },
    { key: 'courthouseSquare', label: hotels.courthouseSquare.fullName, hint: 'Right on the square — the app default' },
  ];

  return (
    <div className="screen screen-trip">
      <div className="screen-topbar">
        <button type="button" className="icon-circle-btn" onClick={onBack} aria-label="Back">
          <ChevronLeft />
        </button>
        <span className="screen-kicker">Trip details</span>
        <span className="screen-pill screen-pill-static">{planCount ? `${planCount} in plan` : 'No stops yet'}</span>
      </div>

      <TopNav activeTab="trip" onSelect={onSelectTab} planCount={planCount} />

      <div className="screen-body trip-body">
        <h1 className="trip-page-title">Your trip</h1>
        <p className="trip-page-sub">
          Free to use, no account or sign-in. These settings stay on this device and personalize every
          walking and driving time in the app.
        </p>

        <section className="trip-card">
          <h2 className="trip-card-title">
            <BedIcon size={15} /> Where you're staying
          </h2>
          <p className="trip-card-note">Walk and drive times are measured from here.</p>
          <div className="trip-hotel-options">
            {hotelOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`trip-hotel-option${hotelKey === opt.key ? ' trip-hotel-option-active' : ''}`}
                onClick={() => setHotelKey(opt.key)}
                aria-pressed={hotelKey === opt.key}
              >
                <span className="trip-hotel-name">{opt.label}</span>
                <span className="trip-hotel-hint">{opt.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="trip-card">
          <h2 className="trip-card-title">
            <PencilIcon size={15} /> How long you're in town
          </h2>
          <p className="trip-card-note">Sets the number of day columns on your Plan.</p>
          <div className="trip-picker-days">
            <button
              type="button"
              className="trip-picker-step"
              onClick={() => setDays((d) => Math.max(1, d - 1))}
              aria-label="Fewer days"
              disabled={days <= 1}
            >
              −
            </button>
            <span className="trip-picker-days-value">
              {days} {days === 1 ? 'day' : 'days'}
            </span>
            <button
              type="button"
              className="trip-picker-step"
              onClick={() => setDays((d) => Math.min(14, d + 1))}
              aria-label="More days"
              disabled={days >= 14}
            >
              +
            </button>
          </div>

          <label className="trip-picker-date-label" htmlFor="trip-page-start-date">
            Arriving on <span className="trip-picker-optional">(optional)</span>
          </label>
          <input
            id="trip-page-start-date"
            type="date"
            className="trip-picker-date-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </section>

        <button type="button" className="btn btn-primary btn-block trip-save-btn" onClick={save}>
          {savedFlash ? '✓ Saved' : 'Save trip details'}
        </button>

        {planCount > 0 && (
          <button type="button" className="trip-clear-link" onClick={onClearPlan}>
            Clear all {planCount} {planCount === 1 ? 'stop' : 'stops'} from my plan
          </button>
        )}
      </div>
    </div>
  );
}
