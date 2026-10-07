import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API is proxied, so the browser talks to ONE origin (localhost:5173).
// That keeps the login cookie first-party and removes CORS headaches.
const API = process.env.VITE_DEV_API || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: API, changeOrigin: true }, '/images': { target: API, changeOrigin: true } } },
  build: { sourcemap: false },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js', css: false },
});
