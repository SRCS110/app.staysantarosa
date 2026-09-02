// Small hand-drawn Lucide-equivalents, stroke-width 2.75 per the design
// tokens, so the app doesn't need the lucide-react package. Each accepts
// a `size` and passes through any other prop (className, style, etc).
import React from 'react';

const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export function ChevronLeft({ size = 20, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ArrowRight({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ExternalLink({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
    </svg>
  );
}

export function Compass({ size = 20, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2l-2 5.6-5.6 2 2-5.6z" />
    </svg>
  );
}

export function MapPinIcon({ size = 20, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

export function XIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// ── Guide category glyphs — fork & knife (Dining), wine glass (Wine &
// Beer), a simple mask (Attractions), calendar (Events). Kept in sync by
// hand with the raw-SVG versions in components/MapView.jsx, which builds
// Leaflet divIcon markup as plain HTML strings rather than JSX.

export function UtensilsIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M7 2v7a2 2 0 0 0 4 0V2" />
      <path d="M9 2v20" />
      <path d="M18 2a4 4 0 0 0-4 4v5c0 1.1.9 2 2 2h2" />
      <path d="M18 2v20" />
    </svg>
  );
}

export function WineGlassIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M8 22h8" />
      <path d="M12 15v7" />
      <path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5z" />
    </svg>
  );
}

export function MaskIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 2c-3 0-5 2-5 5v3c0 3 2 6 5 8 3-2 5-5 5-8V7c0-3-2-5-5-5z" />
      <circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M9 14.5c.8.8 1.9 1.2 3 1.2s2.2-.4 3-1.2" />
    </svg>
  );
}

export function CalendarIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
      <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const GUIDE_ICONS = {
  dining: UtensilsIcon,
  wine: WineGlassIcon,
  attractions: MaskIcon,
  events: CalendarIcon,
};

export function GuideIcon({ guideKey, size = 18, ...rest }) {
  const Icon = GUIDE_ICONS[guideKey];
  return Icon ? <Icon size={size} {...rest} /> : null;
}

// ── Bottom nav glyphs — Build (browse/discover), Plan (the itinerary),
// Map (everything relative to you).

export function GridIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </svg>
  );
}

export function ChecklistIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M9.5 6H21M9.5 12H21M9.5 18H21" />
      <path d="M3.5 6.3l1.4 1.4L7.5 5" />
      <path d="M3.5 12.3l1.4 1.4L7.5 11" />
      <path d="M3.5 18.3l1.4 1.4L7.5 17" />
    </svg>
  );
}

export function MapFoldIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M9 4L3 6.2v13.8l6-2.2 6 2.2 6-2.2V3.8l-6 2.2-6-2.2z" />
      <path d="M9 4v13.8M15 6.2V20" />
    </svg>
  );
}
