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

export function PhoneIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M4.5 4h4l2 5-2.5 1.5a11 11 0 0 0 5.5 5.5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2.5 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function StarIcon({ size = 14, filled = true, ...rest }) {
  return (
    <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} {...rest}>
      <path d="M12 3l2.6 5.6 6 .7-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.3l6-.7z" />
    </svg>
  );
}

export function PawIcon({ size = 14, ...rest }) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none" {...rest}>
      <circle cx="6.5" cy="9" r="1.7" />
      <circle cx="11.2" cy="6" r="1.7" />
      <circle cx="16.8" cy="6" r="1.7" />
      <circle cx="21.5" cy="9" r="1.7" />
      <path d="M14 11.2c3.6 0 6.5 2.6 6.5 5.8 0 2-1.6 3.6-3.6 3.6-1.2 0-1.9-.5-2.9-.5s-1.7.5-2.9.5c-2 0-3.6-1.6-3.6-3.6 0-3.2 2.9-5.8 6.5-5.8z" />
    </svg>
  );
}

export function BellIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" />
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

export function BellOffIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M6 9a6 6 0 0 1 10.4-4.1M18 12.8V9a6 6 0 0 0-.4-2.1M6 9c0 4-1.5 5.5-2 6.5h13" />
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function DownloadIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

export function ShareIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="M8.3 10.7l7.4-4.4M8.3 13.3l7.4 4.4" />
    </svg>
  );
}

export function CloudRainIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M7 16a4.5 4.5 0 0 1 .5-9 6 6 0 0 1 11.4 2A4 4 0 0 1 18 16H7z" />
      <path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" />
    </svg>
  );
}

export function WifiOffIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M2 8.5a16 16 0 0 1 5-3.2M22 8.5a16 16 0 0 0-8.4-4.4M6.5 12.5a9.6 9.6 0 0 1 4-2.1M17.5 12.5a9.6 9.6 0 0 0-2.6-1.7" />
      <path d="M9.5 16a5 5 0 0 1 5 0" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
      <path d="M3 3l18 18" />
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

export function GripIcon({ size = 16, ...rest }) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none" {...rest}>
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

export function GearIcon({ size = 16, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
    </svg>
  );
}

export function BedIcon({ size = 16, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M3 7v11M3 12h18v6M21 18v-3a3 3 0 0 0-3-3H8V8a1 1 0 0 1 1-1h9" />
      <circle cx="6.5" cy="9.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WandIcon({ size = 16, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M4 20L18 6" />
      <path d="M15 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
      <path d="M5 13l.7 1.3L7 15l-1.3.7L5 17l-.7-1.3L3 15l1.3-.7z" />
    </svg>
  );
}

export function PencilIcon({ size = 16, ...rest }) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M4 20l.9-4L16.5 4.4a1.8 1.8 0 0 1 2.6 0l.5.5a1.8 1.8 0 0 1 0 2.6L8 19l-4 1z" />
      <path d="M14.5 6.5l3 3" />
    </svg>
  );
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
