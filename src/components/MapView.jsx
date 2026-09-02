import React, { useEffect, useRef } from 'react';
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

function userIcon() {
  return L.divIcon({
    html: '<div class="map-user-dot"><span class="map-user-pulse"></span></div>',
    className: 'map-marker-wrap',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function pinIcon(letter, { planNumber } = {}) {
  const label = planNumber != null ? planNumber : letter;
  const cls = planNumber != null ? 'map-pin map-pin-plan' : 'map-pin';
  return L.divIcon({
    html: `<div class="${cls}">${label}</div>`,
    className: 'map-marker-wrap',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function ringLabelIcon(letter, name) {
  return L.divIcon({
    html: `<div class="map-ring-pill"><span class="map-ring-pill-letter">${letter}</span>${name}</div>`,
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

      places.forEach((p) => {
        const marker = L.marker([p.lat, p.lng], { icon: ringLabelIcon(p.l, p.name) });
        marker.on('click', () => onPinTap && onPinTap(p, guideKey));
        layer.addLayer(marker);
        bounds.push([p.lat, p.lng]);
      });
    } else {
      places
        .filter((p) => !planIds.has(`${guideKey}:${p.name}`))
        .forEach((p) => {
          const marker = L.marker([p.lat, p.lng], { icon: pinIcon(p.l) });
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
        const marker = L.marker([p.lat, p.lng], { icon: pinIcon(p.l, { planNumber: i + 1 }) });
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
    </div>
  );
}
