// Tiny view layer for the no-build setup: Preact + hooks + an `html`
// tagged-template (htm) that stands in for JSX. Everything imports its
// hooks and `html` from here. Resolved by the import map in index.html
// ("preact", "preact/hooks", "htm" → files in /vendor).
import { h } from 'preact';
import htm from 'htm';

export * from 'preact';
export * from 'preact/hooks';

export const html = htm.bind(h);
