import React, { useState } from 'react';
import { XIcon, PinIcon, ClockIcon } from './icons.jsx';
import { DURATION_CHOICES, formatDuration, placeDurationMin } from '../lib/itineraryPlanner.js';
import { formatMinutes } from '../lib/hours.js';

// Everything a visitor can decide about one stop, in one sheet: how long
// they want there, whether the time is a real commitment or just where the
// schedule happened to land it, which day it belongs to, and their own note.
//
// The three decisions map exactly to the three stored fields on a plan stop
// (durationMin / startMin / day) — nothing here is derived or guessed, and
// clearing any of them hands the stop back to the scheduler.
export default function StopEditor({ stop, tripDays, onClose, onChange, onRemove }) {
  const suggested = placeDurationMin(stop);
  const [timeDraft, setTimeDraft] = useState(
    Number.isFinite(stop.startMin)
      ? `${String(Math.floor(stop.startMin / 60)).padStart(2, '0')}:${String(stop.startMin % 60).padStart(2, '0')}`
      : ''
  );
  // `userNote` — not `note`, which on a resolved place is the guide's own
  // category label ("Breakfast / Diner") coming straight from guides.js.
  const [noteDraft, setNoteDraft] = useState(stop.userNote || '');

  function commitTime(value) {
    setTimeDraft(value);
    if (!value) {
      onChange({ startMin: null });
      return;
    }
    const m = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return;
    const mins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    if (mins >= 0 && mins < 1440) onChange({ startMin: mins });
  }

  const dayOptions = Array.from({ length: tripDays }, (_, i) => i + 1);

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label={`Edit ${stop.name}`}>
      <div className="hotel-picker-sheet stop-editor-sheet">
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
          <XIcon size={16} />
        </button>
        <p className="sheet-kicker">Edit stop</p>
        <h2 className="sheet-title">{stop.name}</h2>

        <div className="stop-editor-block">
          <p className="stop-editor-label">How long here?</p>
          <div className="stop-editor-chips">
            {DURATION_CHOICES.map((min) => (
              <button
                type="button"
                key={min}
                className={`stop-editor-chip${stop.durationMin === min ? ' stop-editor-chip-on' : ''}`}
                onClick={() => onChange({ durationMin: min })}
              >
                {formatDuration(min)}
              </button>
            ))}
            <button
              type="button"
              className={`stop-editor-chip${stop.durationMin == null ? ' stop-editor-chip-on' : ''}`}
              onClick={() => onChange({ durationMin: null })}
            >
              Suggested ({formatDuration(suggested)})
            </button>
          </div>
        </div>

        <div className="stop-editor-block">
          <p className="stop-editor-label">
            <PinIcon size={13} filled={Number.isFinite(stop.startMin)} /> Fixed time
          </p>
          <div className="stop-editor-time-row">
            <input
              type="time"
              className="stop-editor-time"
              value={timeDraft}
              onChange={(e) => commitTime(e.target.value)}
              aria-label="Fixed start time"
            />
            {timeDraft && (
              <button type="button" className="btn btn-ghost stop-editor-clear" onClick={() => commitTime('')}>
                Clear
              </button>
            )}
          </div>
          <p className="stop-editor-hint">
            {Number.isFinite(stop.startMin)
              ? `Pinned to ${formatMinutes(stop.startMin)} — the rest of the day schedules around it.`
              : 'Leave empty and the time follows wherever this sits in the day.'}
          </p>
        </div>

        <div className="stop-editor-block">
          <p className="stop-editor-label">Day</p>
          <div className="stop-editor-chips">
            {dayOptions.map((d) => (
              <button
                type="button"
                key={d}
                className={`stop-editor-chip${stop.day === d ? ' stop-editor-chip-on' : ''}`}
                onClick={() => onChange({ day: d })}
              >
                Day {d}
              </button>
            ))}
            <button
              type="button"
              className={`stop-editor-chip${stop.day == null ? ' stop-editor-chip-on' : ''}`}
              onClick={() => onChange({ day: null })}
            >
              <ClockIcon size={12} /> Saved, unscheduled
            </button>
          </div>
        </div>

        <div className="stop-editor-block">
          <p className="stop-editor-label">Note</p>
          <textarea
            className="stop-editor-note"
            rows={2}
            maxLength={280}
            placeholder="Reservation under…, ask about…, bring…"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => onChange({ note: noteDraft.trim() || null })}
          />
        </div>

        <div className="stop-editor-actions">
          <button type="button" className="btn btn-ghost stop-editor-remove" onClick={onRemove}>
            Remove from plan
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
