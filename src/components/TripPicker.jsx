import React, { useState } from 'react';
import { XIcon } from './icons.jsx';

// A one-time, dismissible sheet: how many days are you in town? Answering
// turns the Plan tab from a single list into day-by-day columns, each
// auto-arranged by lib/itineraryPlanner.js. Reopenable later from the
// Plan tab's "Trip" affordance to change the length or add the arrival
// date it didn't ask for the first time. Nothing is sent anywhere — just
// a localStorage value read by lib/tripStorage.js.
export default function TripPicker({ trip, onSave, onSkip }) {
  const [days, setDays] = useState(trip?.days || 2);
  const [startDate, setStartDate] = useState(trip?.startDate || '');

  function save() {
    onSave({ days, startDate: startDate || null });
  }

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label="How many days are you in town?">
      <div className="hotel-picker-sheet trip-picker-sheet">
        <button type="button" className="sheet-close" onClick={onSkip} aria-label="Skip">
          <XIcon size={16} />
        </button>
        <p className="sheet-kicker">Plan your visit</p>
        <h2 className="sheet-title">How many days are you in town?</h2>
        <p className="sheet-copy">
          We'll group your plan into day-by-day stops with suggested times — you can always drag things around
          after.
        </p>

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

        <label className="trip-picker-date-label" htmlFor="trip-start-date">
          Arriving on <span className="trip-picker-optional">(optional)</span>
        </label>
        <input
          id="trip-start-date"
          type="date"
          className="trip-picker-date-input"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <button type="button" className="btn btn-primary btn-block trip-picker-save" onClick={save}>
          Build my itinerary
        </button>
        <button type="button" className="hotel-picker-skip" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
