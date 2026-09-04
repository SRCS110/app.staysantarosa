import React from 'react';
import { XIcon } from './icons.jsx';

// Ordered list of hotel keys to offer in the picker — Art House and Hotel E
// (courthouseSquare) first since those are the two the app was originally
// built for, then the four added 2026-09-04, in the order they were
// requested.
const HOTEL_ORDER = ['artHouse', 'courthouseSquare', 'hyattRegency', 'hotelLaRose', 'acHotel', 'flamingo'];

// A one-time, dismissible sheet: which hotel are you staying at? Answering
// swaps every walk/drive time in the app to be measured from that hotel
// instead of the shared Old Courthouse Square default (Hotel E's own
// address happens to be right on the square, so picking Hotel E and
// skipping look the same). Nothing is sent anywhere — just a localStorage
// flag read by lib/hotelStorage.js.
export default function HotelPicker({ hotels, onPick, onSkip }) {
  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label="Which hotel are you staying at?">
      <div className="hotel-picker-sheet">
        <button type="button" className="sheet-close" onClick={onSkip} aria-label="Skip">
          <XIcon size={16} />
        </button>
        <p className="sheet-kicker">Welcome</p>
        <h2 className="sheet-title">Which hotel are you staying at?</h2>
        <p className="sheet-copy">
          We'll measure every walking and driving time in the guide from there instead of Old Courthouse Square.
        </p>
        <div className="hotel-picker-options">
          {HOTEL_ORDER.filter((key) => hotels[key]).map((key) => (
            <button type="button" className="hotel-picker-option" key={key} onClick={() => onPick(key)}>
              <span className="hotel-picker-name">{hotels[key].fullName}</span>
              <span className="hotel-picker-hint">Use this as my starting point</span>
            </button>
          ))}
        </div>
        <button type="button" className="hotel-picker-skip" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
