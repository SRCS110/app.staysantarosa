import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static, no-account, no-server-data app — builds to a plain dist/ folder
// that deploys as-is to Vercel (or any static host / GitHub Pages).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
