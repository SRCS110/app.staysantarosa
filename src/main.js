import { html, render } from './preact.js';
import App from './App.js';

render(html`<${App} />`, document.getElementById('root'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
