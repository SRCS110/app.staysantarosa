import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Compass } from './icons.jsx';
import { RING_MINUTES, ringRadiusMeters } from '../lib/geo.js';

// Kept in sync by hand with the Organic tokens (organic.css) — Leaflet's
// path/marker styling takes real color values, not var(--*) lookups.
const COLORS = {
  accent: '#c67139',
  accent700: '#8c491a',
  accent900: '#402310',
  sage: '#7a8a5e',
  sage200: '#e1eecc',
  sage800: '#3d472b',
  sage900: '#272e1b',
  cream: '#fdfcfa',
};

function hotelIcon(label) {
  return L.divIcon({
    html: `<div class="map-hotel-marker">${label}</div>`,
    className: 'map-marker-wrap',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Category glyphs for browse-mode pins — fork & knife (Dining), wine
// glass (Wine & Beer), a simple mask (Attractions), calendar (Events) —
// in place of the old per-place letter badges. Raw SVG strings because
// Leaflet divIcon markup is plain HTML, not JSX; kept in sync by hand
// with the React versions in components/icons.jsx.
const CATEGORY_ICON_PATHS = {
  dining:
    '<path d="M7 2v7a2 2 0 0 0 4 0V2"/><path d="M9 2v20"/><path d="M18 2a4 4 0 0 0-4 4v5c0 1.1.9 2 2 2h2"/><path d="M18 2v20"/>',
  wine: '<path d="M8 22h8"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5z"/>',
  attractions:
    '<path d="M12 2c-3 0-5 2-5 5v3c0 3 2 6 5 8 3-2 5-5 5-8V7c0-3-2-5-5-5z"/><circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="10" r="1" fill="currentColor" stroke="none"/><path d="M9 14.5c.8.8 1.9 1.2 3 1.2s2.2-.4 3-1.2"/>',
  events:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/>',
};

function categoryGlyph(guideKey, size = 14) {
  const inner = CATEGORY_ICON_PATHS[guideKey] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

function userIcon() {
  return L.divIcon({
    html: '<div class="map-user-dot"><span class="map-user-pulse"></span></div>',
    className: 'map-marker-wrap',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function pinIcon(glyph, { planNumber } = {}) {
  const content = planNumber != null ? planNumber : glyph;
  const cls = planNumber != null ? 'map-pin map-pin-plan' : 'map-pin';
  return L.divIcon({
    html: `<div class="${cls}">${content}</div>`,
    className: 'map-marker-wrap',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function ringLabelIcon(glyph, name) {
  return L.divIcon({
    html: `<div class="map-ring-pill"><span class="map-ring-pill-letter">${glyph}</span>${name}</div>`,
    className: 'map-marker-wrap',
    iconAnchor: [-6, 12],
  });
}

export default function MapView({
  places = [],
  guideKey,
  planPlaces = [],
  hotels,
  userLocation,
  mode = 'pins',
  ringOrigin,
  emphasizedName,
  onPinTap,
  fullscreen = false,
  fitKey,
  locating,
  onLocateToggle,
  locateError,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const hasCenteredOnUser = useRef(false);
  const lastFitKey = useRef(null);
  const [gestureHint, setGestureHint] = useState(null); // 'touch' | 'wheel' | null
  const hintTimerRef = useRef(null);

  // Init the map once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      tap: true,
    }).setView([38.4409, -122.7161], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cooperative gesture handling — the map now sits inline in a page that
  // scrolls, so it can't grab every touch/wheel gesture the way a true
  // fullscreen map could. Touch: a single finger passes through untouched
  // (native page scroll), two fingers pan/pinch-zoom as normal — Leaflet's
  // own drag/zoom handlers stay enabled throughout; we only stop a
  // single-finger touchmove from ever reaching them, intercepted on the
  // document in the capture phase so it beats Leaflet's own listeners
  // regardless of attachment order. Wheel: plain scroll passes through to
  // the page; Ctrl/Cmd+scroll zooms the map, the same convention embedded
  // Google Maps uses.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const container = map.getContainer();
    map.scrollWheelZoom.disable();

    function flashHint(kind) {
      setGestureHint(kind);
      if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
      hintTimerRef.current = window.setTimeout(() => setGestureHint(null), 1100);
    }

    function onTouchMoveCapture(e) {
      if (!container.contains(e.target)) return;
      if (e.touches && e.touches.length === 1) {
        e.stopPropagation();
        flashHint('touch');
      }
    }

    function onWheel(e) {
      if (!container.contains(e.target)) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        map.setZoom(map.getZoom() + delta, { animate: true });
      } else {
        flashHint('wheel');
      }
    }

    document.addEventListener('touchmove', onTouchMoveCapture, { capture: true, passive: true });
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      document.removeEventListener('touchmove', onTouchMoveCapture, { capture: true });
      container.removeEventListener('wheel', onWheel);
      if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    };
  }, []);

  // A Leaflet map born inside a flex/animated layout often measures itself
  // at 0×0 before layout settles — nudge it once the container has size.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(id);
  }, [fullscreen]);

  // Redraw markers / rings whenever the visible content changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const bounds = [];
    const planIds = new Set(planPlaces.map((p) => `${p.guideKey}:${p.name}`));

    Object.values(hotels).forEach((h) => {
      const m = L.marker([h.lat, h.lng], { icon: hotelIcon(h.key === 'artHouse' ? 'AH' : 'CS'), keyboard: false });
      m.bindTooltip(h.fullName, { direction: 'top', offset: [0, -16] });
      layer.addLayer(m);
      bounds.push([h.lat, h.lng]);
    });

    if (mode === 'rings' && ringOrigin) {
      RING_MINUTES.forEach((min, i) => {
        const radius = ringRadiusMeters(min);
        const circle = L.circle([ringOrigin.lat, ringOrigin.lng], {
          radius,
          color: COLORS.sage,
          weight: 1.5,
          opacity: 0.55,
          fill: false,
          dashArray: '2 7',
        });
        layer.addLayer(circle);
        const b = circle.getBounds();
        bounds.push([b.getNorth(), b.getEast()], [b.getSouth(), b.getWest()]);

        const labelPoint = L.latLng(ringOrigin.lat + radius / 111320, ringOrigin.lng);
        const label = L.marker(labelPoint, {
          icon: L.divIcon({
            html: `<div class="map-ring-time">${min} min</div>`,
            className: 'map-marker-wrap',
            iconAnchor: [-8, 8],
          }),
          keyboard: false,
          interactive: false,
        });
        layer.addLayer(label);
      });

      const originMarker = L.marker([ringOrigin.lat, ringOrigin.lng], {
        icon: L.divIcon({
          html: '<div class="map-ring-origin"></div>',
          className: 'map-marker-wrap',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
        keyboard: false,
      });
      layer.addLayer(originMarker);

      const ringGlyph = categoryGlyph(guideKey, 10);
      places.forEach((p) => {
        const marker = L.marker([p.lat, p.lng], { icon: ringLabelIcon(ringGlyph, p.name) });
        marker.on('click', () => onPinTap && onPinTap(p, guideKey));
        layer.addLayer(marker);
        bounds.push([p.lat, p.lng]);
      });
    } else {
      const pinGlyph = categoryGlyph(guideKey, 13);
      places
        .filter((p) => !planIds.has(`${guideKey}:${p.name}`))
        .forEach((p) => {
          const marker = L.marker([p.lat, p.lng], { icon: pinIcon(pinGlyph) });
          marker.on('click', () => onPinTap && onPinTap(p, guideKey));
          if (p.name === emphasizedName) marker.bindTooltip(p.name, { permanent: true, direction: 'top', offset: [0, -14] }).openTooltip();
          layer.addLayer(marker);
          bounds.push([p.lat, p.lng]);
        });
    }

    // Plan stops always render on top, numbered in order, with a route line.
    if (planPlaces.length) {
      const line = [];
      planPlaces.forEach((p, i) => {
        const marker = L.marker([p.lat, p.lng], { icon: pinIcon(null, { planNumber: i + 1 }) });
        marker.on('click', () => onPinTap && onPinTap(p, p.guideKey));
        layer.addLayer(marker);
        bounds.push([p.lat, p.lng]);
        line.push([p.lat, p.lng]);
      });
      if (line.length > 1) {
        layer.addLayer(
          L.polyline(line, { color: COLORS.accent, weight: 3, opacity: 0.8, dashArray: '1 9', lineCap: 'round' })
        );
      }
    }

    if (bounds.length && fitKey !== lastFitKey.current) {
      lastFitKey.current = fitKey;
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
    }
  }, [places, guideKey, planPlaces, hotels, mode, ringOrigin, emphasizedName, onPinTap, fitKey]);

  // User location marker — kept outside the redraw layer so it doesn't
  // flicker or force a re-fit every time a GPS fix comes in.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      hasCenteredOnUser.current = false;
      return;
    }
    const latlng = [userLocation.lat, userLocation.lng];
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(latlng, { icon: userIcon(), zIndexOffset: 1000, keyboard: false }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(latlng);
    }
    if (!hasCenteredOnUser.current) {
      hasCenteredOnUser.current = true;
      map.panTo(latlng, { animate: true });
    }
  }, [userLocation]);

  return (
    <div className={`map-view${fullscreen ? ' map-view-fullscreen' : ''}`}>
      <div ref={containerRef} className="map-canvas" />
      <button
        type="button"
        className={`map-locate-btn${locating ? ' map-locate-btn-active' : ''}`}
        onClick={onLocateToggle}
        aria-pressed={locating}
        aria-label={locating ? 'Stop tracking my location' : 'Show my location'}
        title={locating ? 'Stop tracking my location' : 'Show my location'}
      >
        <Compass size={18} />
      </button>
      {locateError && (
        <div className="map-locate-error">
          <span>{locateError}</span>
        </div>
      )}
      <div className={`map-gesture-hint${gestureHint ? ' map-gesture-hint-visible' : ''}`} aria-hidden="true">
        {gestureHint === 'wheel' ? 'Use ⌘/Ctrl + scroll to zoom the map' : 'Use two fingers to move the map'}
      </div>
    </div>
  );
}
