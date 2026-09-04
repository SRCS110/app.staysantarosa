import { html, useMemo, useRef, useState } from '../preact.js';
import { XIcon, ArrowRight, MapPinIcon, ShareIcon, GripIcon, WandIcon, PencilIcon, GuideIcon } from './icons.js';
import { suggestTimesForDay } from '../lib/itineraryPlanner.js';
import { formatMinutes } from '../lib/hours.js';
import { formatDayDate, dateForDay } from '../lib/tripStorage.js';

// 30-minute clock options for the per-stop time picker, 6:00 AM – 11:30 PM.
const TIME_OPTIONS = [];
for (let m = 6 * 60; m <= 23 * 60 + 30; m += 30) {
  TIME_OPTIONS.push({ value: m, label: formatMinutes(m) });
}

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

function buildDayBuckets(stops, tripDays) {
  const buckets = Array.from({ length: tripDays }, () => []);
  stops.forEach((s) => {
    const idx = Math.min(tripDays, Math.max(1, s.day || 1)) - 1;
    buckets[idx].push(s);
  });
  buckets.forEach((list) => list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  return buckets;
}

// The Plan tab's itinerary — day-by-day columns, each stop draggable
// (via its grip handle) within or across days. Dragging updates a local
// working copy live for instant feedback; releasing commits the new
// day/order back up through onReorder. Suggested times are recomputed on
// every render straight from whatever order is current — see
// lib/itineraryPlanner.js — with a per-stop hand-set `time` winning.
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
  onSetTime,
  onEditTrip,
  onBrowse,
}) {
  const visitedCount = stops.filter((s) => s.visited).length;
  const [shareState, setShareState] = useState('idle');
  const [editingTimeKey, setEditingTimeKey] = useState(null);

  const tripDays = Math.max(1, trip?.days || 1);
  const baseBuckets = useMemo(() => buildDayBuckets(stops, tripDays), [stops, tripDays]);

  const [dragBuckets, setDragBuckets] = useState(null);
  const dragRef = useRef(null);
  const dayRefs = useRef([]);

  const buckets = dragBuckets || baseBuckets;

  async function handleShare() {
    const result = await onShare();
    if (result === 'copied') {
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 2000);
    }
  }

  function commitDrag(finalBuckets) {
    const flat = [];
    finalBuckets.forEach((list, dayIdx) => {
      list.forEach((s, order) => {
        flat.push({ guideKey: s.guideKey, name: s.name, day: dayIdx + 1, order });
      });
    });
    onReorder(flat);
  }

  function onHandlePointerDown(e, stop, fromDayIdx) {
    e.preventDefault();
    dragRef.current = { key: keyOf(stop), fromDayIdx, pointerId: e.pointerId };
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

    const rects = dayRefs.current.map((el) => (el ? el.getBoundingClientRect() : null));
    let targetDay = drag.fromDayIdx;
    for (let i = 0; i < rects.length; i += 1) {
      if (rects[i] && clientY >= rects[i].top && clientY <= rects[i].bottom) {
        targetDay = i;
        break;
      }
    }
    const known = rects.filter(Boolean);
    if (known.length) {
      if (clientY < known[0].top) targetDay = 0;
      else if (clientY > known[known.length - 1].bottom) targetDay = rects.length - 1;
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

      const targetList = next[targetDay];
      const container = dayRefs.current[targetDay];
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

  if (!stops.length) {
    return html`
      <div className="plan-sheet">
        <div className="plan-sheet-header">
          <div>
            <h2 className="plan-sheet-title">My Trip</h2>
            <p className="plan-sheet-count">
              ${tripDays === 1 ? '1 day' : `${tripDays} days`} · nothing added yet
            </p>
          </div>
        </div>

        <p className="plan-sheet-empty">
          This is where your itinerary builds. Add places from Browse or Events and they'll drop
          into these day columns with suggested times you can drag around.
        </p>

        <div className="plan-days">
          ${Array.from({ length: tripDays }, (_, dayIdx) => {
            const dateLabel = formatDayDate(dateForDay(trip, dayIdx + 1));
            return html`
              <div className="plan-day plan-day-skeleton" key=${dayIdx}>
                <div className="plan-day-header">
                  <span className="plan-day-title">Day ${dayIdx + 1}</span>
                  ${dateLabel && html`<span className="plan-day-date">${dateLabel}</span>`}
                  <span className="plan-day-count">nothing yet</span>
                </div>
                <div className="plan-day-list">
                  ${Array.from(
                    { length: dayIdx === 0 ? 3 : 2 },
                    (_, i) => html`
                      <div className="plan-row-ghost" key=${i} aria-hidden="true">
                        <span className="plan-row-ghost-time"></span>
                        <span className="plan-row-ghost-dot"></span>
                        <span className="plan-row-ghost-lines">
                          <span className="plan-row-ghost-line"></span>
                          <span className="plan-row-ghost-line plan-row-ghost-line-short"></span>
                        </span>
                      </div>
                    `
                  )}
                </div>
              </div>
            `;
          })}
        </div>

        <div className="plan-empty-cta">
          ${onBrowse &&
          html`
            <button type="button" className="btn btn-primary btn-block" onClick=${onBrowse}>
              Browse places to add
            </button>
          `}
          ${onEditTrip &&
          html`
            <button type="button" className="btn btn-ghost btn-block" onClick=${onEditTrip}>
              <${PencilIcon} size=${14} /> Edit trip details
            </button>
          `}
        </div>
      </div>
    `;
  }

  return html`
    <div className="plan-sheet">
      <div className="plan-sheet-header">
        <div>
          <h2 className="plan-sheet-title">My Trip</h2>
          <p className="plan-sheet-count">
            ${`${visitedCount} of ${stops.length} visited · ${
              tripDays === 1 ? '1 day' : `${tripDays} days`
            }`}
          </p>
        </div>
        <div className="plan-sheet-header-actions">
          ${onShare &&
          html`
            <button
              type="button"
              className="btn btn-ghost plan-sheet-share"
              onClick=${handleShare}
            >
              <${ShareIcon} size=${14} /> ${shareState === 'copied' ? 'Link copied' : 'Share'}
            </button>
          `}
          <button type="button" className="btn btn-ghost" onClick=${onClear}>Clear</button>
        </div>
      </div>

      <div className="plan-sheet-toolbar">
        <button type="button" className="btn btn-ghost plan-toolbar-btn" onClick=${onAutoArrange}>
          <${WandIcon} size=${14} /> Auto-arrange
        </button>
        <button type="button" className="btn btn-ghost plan-toolbar-btn" onClick=${onEditTrip}>
          <${PencilIcon} size=${14} /> Trip details
        </button>
      </div>

      <div className="plan-days">
        ${buckets.map((dayStops, dayIdx) => {
          const timed = suggestTimesForDay(dayStops, origin);
          const dateLabel = formatDayDate(dateForDay(trip, dayIdx + 1));
          const mapsUrl = googleMapsUrl(dayStops, origin);
          return html`
            <div className="plan-day" key=${dayIdx}>
              <div className="plan-day-header">
                <span className="plan-day-title">Day ${dayIdx + 1}</span>
                ${dateLabel && html`<span className="plan-day-date">${dateLabel}</span>`}
                <span className="plan-day-count">
                  ${dayStops.length
                    ? `${dayStops.length} ${dayStops.length === 1 ? 'stop' : 'stops'}`
                    : 'nothing yet'}
                </span>
              </div>

              <div
                className="plan-day-list"
                ref=${(el) => {
                  dayRefs.current[dayIdx] = el;
                }}
              >
                ${timed.map(
                  (s) => html`
                    <div
                      key=${keyOf(s)}
                      data-plan-row="true"
                      data-key=${keyOf(s)}
                      className=${`plan-row${s.visited ? ' plan-row-visited' : ''}`}
                    >
                      <button
                        type="button"
                        className="plan-row-drag"
                        onPointerDown=${(e) => onHandlePointerDown(e, s, dayIdx)}
                        onPointerMove=${onHandlePointerMove}
                        onPointerUp=${onHandlePointerUp}
                        onPointerCancel=${onHandlePointerUp}
                        aria-label=${`Drag ${s.name} to reorder`}
                      >
                        <${GripIcon} size=${15} />
                      </button>
                      ${editingTimeKey === keyOf(s)
                        ? html`
                            <select
                              className="plan-row-time-select"
                              ref=${(el) => el && el.focus()}
                              value=${Number.isFinite(s.time) ? String(s.time) : ''}
                              onChange=${(e) => {
                                const v = e.target.value;
                                onSetTime(s, v === '' ? null : Number(v));
                                setEditingTimeKey(null);
                              }}
                              onBlur=${() => setEditingTimeKey(null)}
                              aria-label=${`Set a time for ${s.name}`}
                            >
                              <option value="">Auto</option>
                              ${TIME_OPTIONS.map(
                                (o) => html`<option key=${o.value} value=${String(o.value)}>${o.label}</option>`
                              )}
                            </select>
                          `
                        : html`
                            <button
                              type="button"
                              className=${`plan-row-time${s.timeEdited ? ' plan-row-time-edited' : ''}`}
                              onClick=${() => onSetTime && setEditingTimeKey(keyOf(s))}
                              aria-label=${`Change time for ${s.name}, currently ${s.suggestedTime}`}
                              title="Change time"
                            >
                              ${s.suggestedTime}
                            </button>
                          `}
                      <button
                        type="button"
                        className="plan-row-check"
                        onClick=${() => onToggleVisited(s)}
                        aria-label=${s.visited
                          ? `Mark ${s.name} not visited`
                          : `Mark ${s.name} visited`}
                        aria-pressed=${s.visited}
                      >
                        ${s.visited ? '✓' : html`<${GuideIcon} guideKey=${s.guideKey} size=${12} />`}
                      </button>
                      <button
                        type="button"
                        className="plan-row-body"
                        onClick=${() => onOpenPlace(s)}
                      >
                        <span className="plan-row-name">${s.name}</span>
                        <span className="plan-row-note">${s.note}</span>
                      </button>
                      <button
                        type="button"
                        className="plan-row-remove"
                        onClick=${() => onRemove(s)}
                        aria-label=${`Remove ${s.name}`}
                      >
                        <${XIcon} size=${14} />
                      </button>
                    </div>
                  `
                )}
                ${!dayStops.length &&
                html`<p className="plan-day-empty">Drag a stop here, or add more from Build.</p>`}
              </div>

              ${mapsUrl &&
              html`
                <a
                  className="btn btn-ghost btn-block plan-day-cta"
                  href=${mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <${MapPinIcon} size=${14} /> Open Day ${dayIdx + 1} in Google Maps
                  <${ArrowRight} size=${14} />
                </a>
              `}
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
