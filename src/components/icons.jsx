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
