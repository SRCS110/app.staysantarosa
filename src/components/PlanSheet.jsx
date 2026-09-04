import React, { useMemo, useRef, useState } from 'react';
import {
  XIcon,
  ArrowRight,
  MapPinIcon,
  ShareIcon,
  GripIcon,
  WandIcon,
  PencilIcon,
  GuideIcon,
  ClockIcon,
  PinIcon,
  AlertIcon,
  PrinterIcon,
  CalendarExportIcon,
  UndoIcon,
  SwapIcon,
  WalkIcon,
  CarIcon,
} from './icons.jsx';
import { buildDaySchedule, formatDuration } from '../lib/itineraryPlanner.js';
import { formatMinutes } from '../lib/hours.js';
import { formatDayDate, dateForDay, weekdayForDay } from '../lib/tripStorage.js';
import StopEditor from './StopEditor.jsx';

// Up to ~8 waypoints work reliably in Google Maps' free directions URL.
function googleMapsUrl(stops, origin) {
  if (!stops.length) return null;
  const pts = stops.map((s) => `${s.lat},${s.lng}`);
  const destination = pts[pts.length - 1];
  const waypoints = pts.slice(0, -1);
  const params = new URLSearchParams({ api: '1', travelmode: 'walking', destination });
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`);
  if (waypoints.length) params.set('waypoints', waypoints.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

const keyOf = (s) => `${s.guideKey}:${s.name}`;

// Bucket 0 is the saved tray (stops with no day yet); bucket N is Day N.
// Days and the saved tray are deliberately the same kind of container —
// one drag mechanism, one move operation, no special cases — so scheduling
// a saved place and moving a stop between days are literally the same act.
function buildBuckets(stops, tripDays) {
  const buckets = Array.from({ length: tripDays + 1 }, () => []);
  stops.forEach((s) => {
    const idx = s.day == null ? 0 : Math.min(tripDays, Math.max(1, s.day));
    buckets[idx].push(s);
  });
  buckets.forEach((list) => list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  return buckets;
}

function TravelLeg({ travel }) {
  if (!travel) return null;
  const Icon = travel.mode === 'walk' ? WalkIcon : CarIcon;
  return (
    <div className="plan-leg" aria-label={`${travel.min} minute ${travel.mode}`}>
      <span className="plan-leg-line" aria-hidden="true" />
      <span className="plan-leg-chip">
        <Icon size={12} /> {travel.min} min {travel.mode}
        {travel.miles != null && <span className="plan-leg-miles"> · {travel.miles.toFixed(1)} mi</span>}
      </span>
    </div>
  );
}

export default function PlanSheet({
  stops,
  trip,
  origin,
  onOpenPlace,
  onToggleVisited,
  onRemove,
  onClear,
  onShare,
  onReorder,
  onAutoArrange,
  onEditTrip,
  onUpdateStop,
  onOptimizeDay,
  onClearDay,
  onSwapDays,
  onSetDayNote,
  onExportIcs,
  onUndo,
  undoLabel,
}) {
  const visitedCount = stops.filter((s) => s.visited).length;
  const scheduled = stops.filter((s) => s.day != null);
  const [shareState, setShareState] = useState('idle');
  const [exportState, setExportState] = useState('idle');
  const [editingKey, setEditingKey] = useState(null);
  const [openDayMenu, setOpenDayMenu] = useState(null);
  const [noteDayOpen, setNoteDayOpen] = useState(null);

  const tripDays = Math.max(1, trip?.days || 1);
  const baseBuckets = useMemo(() => buildBuckets(stops, tripDays), [stops, tripDays]);

  // Only set while a drag is in progress — a local, mutable copy so the
  // list can reflow live without waiting on a round-trip through the
  // parent. Cleared on pointerup once the change has been committed.
  const [dragBuckets, setDragBuckets] = useState(null);
  const dragRef = useRef(null);
  const bucketRefs = useRef([]);

  const buckets = dragBuckets || baseBuckets;
  const editingStop = editingKey ? stops.find((s) => keyOf(s) === editingKey) : null;

  async function handleShare() {
    const result = await onShare();
    if (result === 'copied') {
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 2000);
    }
  }

  function handleExport() {
    const ok = onExportIcs();
    setExportState(ok ? 'done' : 'needs-date');
    window.setTimeout(() => setExportState('idle'), 3000);
  }

  function commitDrag(finalBuckets) {
    const flat = [];
    finalBuckets.forEach((list, bucketIdx) => {
      list.forEach((s, order) => {
        flat.push({ guideKey: s.guideKey, name: s.name, day: bucketIdx === 0 ? null : bucketIdx, order });
      });
    });
    onReorder(flat);
  }

  function onHandlePointerDown(e, stop, fromBucketIdx) {
    e.preventDefault();
    dragRef.current = { key: keyOf(stop), fromBucketIdx, pointerId: e.pointerId };
    setDragBuckets(baseBuckets.map((list) => list.slice()));
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // unsupported — drag still works via the move/up listeners below
    }
  }

  function onHandlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const clientY = e.clientY;

    const rects = bucketRefs.current.map((el) => (el ? el.getBoundingClientRect() : null));
    let targetBucket = drag.fromBucketIdx;
    for (let i = 0; i < rects.length; i += 1) {
      if (rects[i] && clientY >= rects[i].top && clientY <= rects[i].bottom) {
        targetBucket = i;
        break;
      }
    }
    const known = rects.filter(Boolean);
    if (known.length) {
      if (clientY < known[0].top) targetBucket = rects.findIndex(Boolean);
      else if (clientY > known[known.length - 1].bottom) targetBucket = rects.length - 1;
    }

    setDragBuckets((prev) => {
      if (!prev) return prev;
      const next = prev.map((list) => list.slice());
      let draggedItem = null;
      for (let i = 0; i < next.length; i += 1) {
        const idx = next[i].findIndex((s) => keyOf(s) === drag.key);
        if (idx !== -1) {
          [draggedItem] = next[i].splice(idx, 1);
          break;
        }
      }
      if (!draggedItem) return prev;

      const targetList = next[targetBucket];
      const container = bucketRefs.current[targetBucket];
      let insertAt = targetList.length;
      if (container) {
        const rows = Array.from(container.querySelectorAll('[data-plan-row]')).filter(
          (row) => row.dataset.key !== drag.key
        );
        const idx = rows.findIndex((row) => {
          const r = row.getBoundingClientRect();
          return clientY < r.top + r.height / 2;
        });
        insertAt = idx === -1 ? targetList.length : idx;
      }
      targetList.splice(insertAt, 0, draggedItem);
      return next;
    });
  }

  function onHandlePointerUp(e) {
    const drag = dragRef.current;
    if (!drag) return;
    try {
      e.currentTarget.releasePointerCapture(drag.pointerId);
    } catch {
      // already released
    }
    dragRef.current = null;
    setDragBuckets((current) => {
      if (current) commitDrag(current);
      return null;
    });
  }

  function renderRow(s, bucketIdx, scheduleRow) {
    const row = scheduleRow || s;
    return (
      <div
        key={keyOf(s)}
        data-plan-row
        data-key={keyOf(s)}
        className={`plan-row${s.visited ? ' plan-row-visited' : ''}${
          row.warnings?.length ? ' plan-row-warned' : ''
        }`}
      >
        <button
          type="button"
          className="plan-row-drag"
          onPointerDown={(e) => onHandlePointerDown(e, s, bucketIdx)}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          aria-label={`Drag ${s.name} to reorder`}
        >
          <GripIcon size={15} />
        </button>

        <span className="plan-row-time">
          {scheduleRow ? (
            <>
              <span className="plan-row-clock">{row.arriveLabel}</span>
              {row.isTimeFixed && (
                <PinIcon
                  size={10}
                  filled
                  className="plan-row-pin"
                  aria-label={row.isEventTime ? 'Published event time' : 'Fixed time'}
                />
              )}
            </>
          ) : (
            <span className="plan-row-clock plan-row-clock-muted">—</span>
          )}
        </span>

        <button
          type="button"
          className="plan-row-check"
          onClick={() => onToggleVisited(s)}
          aria-label={s.visited ? `Mark ${s.name} not visited` : `Mark ${s.name} visited`}
          aria-pressed={s.visited}
        >
          {s.visited ? '✓' : <GuideIcon guideKey={s.guideKey} size={12} />}
        </button>

        <button type="button" className="plan-row-body" onClick={() => onOpenPlace(s)}>
          <span className="plan-row-name">{s.name}</span>
          <span className="plan-row-meta">
            <span className="plan-row-note">{s.note}</span>
            {scheduleRow && (
              <span className={`plan-row-dur${row.isDurationOverridden ? ' plan-row-dur-set' : ''}`}>
                {formatDuration(row.durationMin)}
              </span>
            )}
          </span>
          {s.userNote && <span className="plan-row-usernote">{s.userNote}</span>}
          {row.warnings?.map((w) => (
            <span key={w.kind} className={`plan-row-warning plan-row-warning-${w.kind}`}>
              <AlertIcon size={11} /> {w.text}
            </span>
          ))}
        </button>

        <button
          type="button"
          className="plan-row-edit"
          onClick={() => setEditingKey(keyOf(s))}
          aria-label={`Edit ${s.name}`}
        >
          <PencilIcon size={13} />
        </button>
        <button type="button" className="plan-row-remove" onClick={() => onRemove(s)} aria-label={`Remove ${s.name}`}>
          <XIcon size={14} />
        </button>
      </div>
    );
  }

  if (!stops.length) {
    return (
      <div className="plan-sheet">
        <div className="plan-empty-card">
          <h2 className="plan-sheet-title">Your itinerary is empty</h2>
          <p className="plan-sheet-empty">
            Open any place in <strong>Build</strong> and tap <strong>Add to plan</strong>. Saved places land here
            unscheduled — then <strong>Auto-arrange</strong> spreads them across your days by neighborhood and time of
            day, and you can drag anything anywhere from there.
          </p>
          <button type="button" className="btn btn-ghost plan-toolbar-btn" onClick={onEditTrip}>
            <PencilIcon size={14} /> Set trip length
          </button>
        </div>
      </div>
    );
  }

  const savedStops = buckets[0];

  return (
    <div className="plan-sheet">
      <div className="plan-sheet-header">
        <div>
          <h2 className="plan-sheet-title">My Trip</h2>
          <p className="plan-sheet-count">
            {scheduled.length} scheduled
            {savedStops.length ? ` · ${savedStops.length} saved` : ''} · {visitedCount} visited ·{' '}
            {tripDays === 1 ? '1 day' : `${tripDays} days`}
          </p>
        </div>
        <div className="plan-sheet-header-actions">
          {onShare && (
            <button type="button" className="btn btn-ghost plan-sheet-share" onClick={handleShare}>
              <ShareIcon size={14} /> {shareState === 'copied' ? 'Link copied' : 'Share'}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>

      <div className="plan-sheet-toolbar">
        <button type="button" className="btn btn-ghost plan-toolbar-btn" onClick={onAutoArrange}>
          <WandIcon size={14} /> Auto-arrange
        </button>
        <button type="button" className="btn btn-ghost plan-toolbar-btn" onClick={onEditTrip}>
          <PencilIcon size={14} /> Trip
        </button>
        <button type="button" className="btn btn-ghost plan-toolbar-btn" onClick={() => window.print()}>
          <PrinterIcon size={14} /> Print
        </button>
        <button type="button" className="btn btn-ghost plan-toolbar-btn" onClick={handleExport}>
          <CalendarExportIcon size={14} />{' '}
          {exportState === 'done' ? 'Downloaded' : exportState === 'needs-date' ? 'Add a date first' : 'Calendar'}
        </button>
      </div>

      {undoLabel && (
        <div className="plan-undo-bar" role="status">
          <span>{undoLabel}</span>
          <button type="button" className="btn btn-ghost plan-undo-btn" onClick={onUndo}>
            <UndoIcon size={13} /> Undo
          </button>
        </div>
      )}

      {/* The saved tray. Rendered as bucket 0 so a drag into it unschedules
          a stop with exactly the same gesture that moves one between days. */}
      <div className={`plan-saved${savedStops.length ? '' : ' plan-saved-empty'}`}>
        <div className="plan-day-header">
          <span className="plan-day-title">
            <ClockIcon size={13} /> Saved
          </span>
          <span className="plan-day-count">
            {savedStops.length ? `${savedStops.length} not scheduled yet` : 'everything is scheduled'}
          </span>
        </div>
        <div
          className="plan-day-list"
          ref={(el) => {
            bucketRefs.current[0] = el;
          }}
        >
          {savedStops.map((s) => renderRow(s, 0, null))}
          {!savedStops.length && <p className="plan-day-empty">Drag a stop here to take it off the schedule.</p>}
        </div>
      </div>

      <div className="plan-days">
        {buckets.slice(1).map((dayStops, i) => {
          const dayNumber = i + 1;
          const dateIso = dateForDay(trip, dayNumber);
          const schedule = buildDaySchedule(dayStops, {
            origin,
            dayStartMin: trip?.dayStartMin ?? 9 * 60,
            dayEndMin: trip?.dayEndMin ?? 22 * 60,
            weekdayIndex: weekdayForDay(trip, dayNumber),
          });
          const dateLabel = formatDayDate(dateIso);
          const mapsUrl = googleMapsUrl(dayStops, origin);
          const dayNote = trip?.dayNotes?.[dayNumber] || '';
          return (
            <div className="plan-day" key={dayNumber}>
              <div className="plan-day-header">
                <span className="plan-day-title">Day {dayNumber}</span>
                {dateLabel && <span className="plan-day-date">{dateLabel}</span>}
                <span className="plan-day-count">
                  {dayStops.length
                    ? `${dayStops.length} ${dayStops.length === 1 ? 'stop' : 'stops'}`
                    : 'nothing yet'}
                </span>
                <button
                  type="button"
                  className="plan-day-menu-btn"
                  onClick={() => setOpenDayMenu(openDayMenu === dayNumber ? null : dayNumber)}
                  aria-expanded={openDayMenu === dayNumber}
                  aria-label={`Day ${dayNumber} options`}
                >
                  <PencilIcon size={13} />
                </button>
              </div>

              {schedule.rows.length > 0 && (
                <div className="plan-day-summary">
                  <span className="plan-day-window">
                    {formatMinutes(schedule.rows[0].arriveMin)} – {formatMinutes(schedule.endMin)}
                  </span>
                  <span className="plan-day-split">
                    {formatDuration(schedule.dwellMin)} at stops
                    {schedule.travelMin > 0 && ` · ${formatDuration(schedule.travelMin)} getting around`}
                  </span>
                </div>
              )}

              {schedule.warnings.map((w) => (
                <p key={w.kind} className="plan-day-warning">
                  <AlertIcon size={12} /> {w.text}
                </p>
              ))}

              {openDayMenu === dayNumber && (
                <div className="plan-day-menu">
                  <button
                    type="button"
                    onClick={() => {
                      onOptimizeDay(dayNumber);
                      setOpenDayMenu(null);
                    }}
                    disabled={dayStops.length < 2}
                  >
                    <WandIcon size={13} /> Optimize this day
                  </button>
                  {dayNumber < tripDays && (
                    <button
                      type="button"
                      onClick={() => {
                        onSwapDays(dayNumber, dayNumber + 1);
                        setOpenDayMenu(null);
                      }}
                    >
                      <SwapIcon size={13} /> Swap with Day {dayNumber + 1}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setNoteDayOpen(noteDayOpen === dayNumber ? null : dayNumber);
                      setOpenDayMenu(null);
                    }}
                  >
                    <PencilIcon size={13} /> {dayNote ? 'Edit day note' : 'Add a day note'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClearDay(dayNumber);
                      setOpenDayMenu(null);
                    }}
                    disabled={!dayStops.length}
                  >
                    <XIcon size={13} /> Move this day to Saved
                  </button>
                </div>
              )}

              {(noteDayOpen === dayNumber || dayNote) && (
                <div className="plan-day-note">
                  {noteDayOpen === dayNumber ? (
                    <textarea
                      className="stop-editor-note"
                      rows={2}
                      maxLength={500}
                      autoFocus
                      defaultValue={dayNote}
                      placeholder={`Anything to remember about Day ${dayNumber}…`}
                      onBlur={(e) => {
                        onSetDayNote(dayNumber, e.target.value);
                        setNoteDayOpen(null);
                      }}
                    />
                  ) : (
                    <button type="button" className="plan-day-note-text" onClick={() => setNoteDayOpen(dayNumber)}>
                      {dayNote}
                    </button>
                  )}
                </div>
              )}

              <div
                className="plan-day-list"
                ref={(el) => {
                  bucketRefs.current[dayNumber] = el;
                }}
              >
                {schedule.rows.map((row, idx) => (
                  <React.Fragment key={keyOf(row)}>
                    {idx > 0 && <TravelLeg travel={row.travel} />}
                    {renderRow(dayStops.find((s) => keyOf(s) === keyOf(row)) || row, dayNumber, row)}
                  </React.Fragment>
                ))}
                {!dayStops.length && <p className="plan-day-empty">Drag a stop here, or add more from Build.</p>}
              </div>

              {mapsUrl && (
                <a className="btn btn-ghost btn-block plan-day-cta" href={mapsUrl} target="_blank" rel="noreferrer">
                  <MapPinIcon size={14} /> Open Day {dayNumber} in Google Maps <ArrowRight size={14} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {editingStop && (
        <StopEditor
          stop={editingStop}
          tripDays={tripDays}
          onClose={() => setEditingKey(null)}
          onChange={(patch) => onUpdateStop(editingStop, patch)}
          onRemove={() => {
            onRemove(editingStop);
            setEditingKey(null);
          }}
        />
      )}
    </div>
  );
}
