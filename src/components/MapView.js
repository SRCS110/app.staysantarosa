import { html, useEffect, useRef, useState } from '../preact.js';
import { Compass } from './icons.js';
import { fetchWalkingRoute } from '../lib/routing.js';

// Leaflet is loaded as a plain <script> in index.html (keyless, no build),
// so it lives on window.L. Every use below is inside an effect that runs
// after mount; the init effect still waits on window.__leafletReady as a
// belt-and-braces guard in case the deferred script hasn't run yet.
let L = null;

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

// Category glyphs for browse-mode pins — raw SVG strings because Leaflet
// divIcon markup is plain HTML; kept in sync by hand with components/icons.js.
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

function pinIcon(glyph) {
  return L.divIcon({
    html: `<div class="map-pin">${glyph}</div>`,
    className: 'map-marker-wrap',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Rotates through a small set of day colors so a multi-day itinerary reads
// at a glance which stops belong to which day.
const DAY_PALETTE = ['#c67139', '#4f7a9c', '#8a6fa8', '#93832f', '#3f8f74', '#b2567a'];
export function dayColor(day) {
  if (!day) return COLORS.accent;
  return DAY_PALETTE[(day - 1) % DAY_PALETTE.length];
}

// A plan stop's marker: a small labeled card (number + category glyph +
// the place's own name). The left edge picks up that stop's day color.
function planCardIcon(glyph, name, number, emphasized, color) {
  return L.divIcon({
    html: `<div class="map-plan-card${emphasized ? ' map-plan-card-emphasized' : ''}"><span class="map-plan-card-badge" style="background:${color}">${number}</span><span class="map-plan-card-glyph">${glyph}</span><span class="map-plan-card-name">${escapeHtml(name)}</span></div>`,
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
  const routeLayerRef = useRef(null);
  const routeSigRef = useRef(null);
  const userMarkerRef = useRef(null);
  const hasCenteredOnUser = useRef(false);
  const lastFitKey = useRef(null);
  // Bumped once the map is live so the marker/route effects re-run.
  const [ready, setReady] = useState(0);

  // Init the map once (after Leaflet's <script> has loaded).
  useEffect(() => {
    let cancelled = false;

    function init() {
      if (cancelled || mapRef.current || !containerRef.current) return;
      L = window.L;
      if (!L) {
        (window.__leafletReady || Promise.resolve()).then(init);
        return;
      }

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        tap: true,
      }).setView([38.43979, -122.71455], 15);

      // Esri "Light Gray Canvas" — muted, label-light, keyless. Two layers:
      // the grey base, then a sparse street-name reference on top.
      const esriAttr =
        'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: esriAttr }
      ).addTo(map);
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, pane: 'overlayPane', opacity: 0.9 }
      ).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady((n) => n + 1);
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
      layerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  // A Leaflet map born inside a flex/animated layout often measures itself
  // at 0×0 before layout settles — nudge it once the container has size.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(id);
  }, [fullscreen, ready]);

  // Redraw markers / route whenever the visible content changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const bounds = [];
    const planIds = new Set(planPlaces.map((p) => `${p.guideKey}:${p.name}`));

    Object.values(hotels).forEach((h) => {
      const m = L.marker([h.lat, h.lng], {
        icon: hotelIcon(h.key === 'artHouse' ? 'AH' : 'CS'),
        keyboard: false,
      });
      m.bindTooltip(h.fullName, { direction: 'top', offset: [0, -16] });
      layer.addLayer(m);
      bounds.push([h.lat, h.lng]);
    });

    if (places.length) {
      const pinGlyph = categoryGlyph(guideKey, 13);
      places
        .filter((p) => !planIds.has(`${guideKey}:${p.name}`))
        .forEach((p) => {
          const marker = L.marker([p.lat, p.lng], { icon: pinIcon(pinGlyph) });
          marker.on('click', () => onPinTap && onPinTap(p, guideKey));
          if (p.name === emphasizedName)
            marker
              .bindTooltip(p.name, { permanent: true, direction: 'top', offset: [0, -14] })
              .openTooltip();
          layer.addLayer(marker);
          bounds.push([p.lat, p.lng]);
        });
    }

    if (planPlaces.length) {
      planPlaces.forEach((p, i) => {
        const glyph = categoryGlyph(p.guideKey, 12);
        const color = dayColor(p.day);
        const marker = L.marker([p.lat, p.lng], {
          icon: planCardIcon(glyph, p.name, i + 1, p.name === emphasizedName, color),
        });
        marker.on('click', () => onPinTap && onPinTap(p, p.guideKey));
        layer.addLayer(marker);
        bounds.push([p.lat, p.lng]);
      });
    }

    // Route line, per day, following real walking paths. Straight dashed
    // line shows immediately; the keyless OSRM geometry (lib/routing.js)
    // swaps in when it resolves.
    const routeLayer = routeLayerRef.current;
    if (routeLayer) routeLayer.clearLayers();
    if (routeLayer && planPlaces.length > 1) {
      const byDay = new Map();
      planPlaces.forEach((p) => {
        const d = p.day || 1;
        if (!byDay.has(d)) byDay.set(d, []);
        byDay.get(d).push(p);
      });

      const sig = JSON.stringify(
        [...byDay.entries()].map(([d, ps]) => [d, ps.map((p) => [p.lat, p.lng])])
      );
      routeSigRef.current = sig;

      byDay.forEach((ps, d) => {
        if (ps.length < 2) return;
        routeLayer.addLayer(
          L.polyline(
            ps.map((p) => [p.lat, p.lng]),
            { color: dayColor(d), weight: 3, opacity: 0.45, dashArray: '1 9', lineCap: 'round' }
          )
        );
      });

      Promise.all(
        [...byDay.entries()].map(async ([d, ps]) => ({
          d,
          geom: ps.length >= 2 ? await fetchWalkingRoute(ps) : null,
        }))
      ).then((results) => {
        if (routeSigRef.current !== sig || !routeLayerRef.current) return;
        const rl = routeLayerRef.current;
        rl.clearLayers();
        results.forEach(({ d, geom }) => {
          const ps = byDay.get(d);
          if (!ps || ps.length < 2) return;
          const routed = Array.isArray(geom) && geom.length > 1;
          rl.addLayer(
            L.polyline(routed ? geom : ps.map((p) => [p.lat, p.lng]), {
              color: dayColor(d),
              weight: routed ? 4 : 3,
              opacity: routed ? 0.85 : 0.45,
              dashArray: routed ? null : '1 9',
              lineCap: 'round',
              lineJoin: 'round',
            })
          );
        });
      });
    } else {
      routeSigRef.current = null;
    }

    if (bounds.length && fitKey !== lastFitKey.current) {
      lastFitKey.current = fitKey;
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
    }
  }, [places, guideKey, planPlaces, hotels, emphasizedName, onPinTap, fitKey, ready]);

  // User location marker — kept outside the redraw layer.
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
      userMarkerRef.current = L.marker(latlng, {
        icon: userIcon(),
        zIndexOffset: 1000,
        keyboard: false,
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(latlng);
    }
    if (!hasCenteredOnUser.current) {
      hasCenteredOnUser.current = true;
      map.panTo(latlng, { animate: true });
    }
  }, [userLocation, ready]);

  return html`
    <div className=${`map-view${fullscreen ? ' map-view-fullscreen' : ''}`}>
      <div ref=${containerRef} className="map-canvas"></div>
      <button
        type="button"
        className=${`map-locate-btn${locating ? ' map-locate-btn-active' : ''}`}
        onClick=${onLocateToggle}
        aria-pressed=${locating}
        aria-label=${locating ? 'Stop tracking my location' : 'Show my location'}
        title=${locating ? 'Stop tracking my location' : 'Show my location'}
      >
        <${Compass} size=${18} />
      </button>
      ${locateError && html`<div className="map-locate-error"><span>${locateError}</span></div>`}
    </div>
  `;
}
