import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import 'leaflet/dist/leaflet.css';
import './styles/organic.css';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
