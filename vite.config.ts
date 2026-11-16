import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Where `/api` is proxied in dev; override if the backend runs on another port.
const API_TARGET = process.env.API_TARGET ?? 'http://localhost:5000';
// Dev port: 5173 unless PORT is set (e.g. when another project already holds 5173).
const DEV_PORT = Number(process.env.PORT) || 5173;

// `vite --mode https` serves over self-signed HTTPS so phones on the LAN get a
// secure context (needed for live camera APIs and clipboard).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: {
    host: true, // listen on the LAN so phones can open the QR link
    port: DEV_PORT,
    strictPort: true, // fail loudly instead of drifting to a port nothing expects
    proxy: { '/api': { target: API_TARGET, changeOrigin: true, xfwd: true } },
  },
  preview: {
    host: true,
    port: 4173,
    proxy: { '/api': { target: API_TARGET, changeOrigin: true, xfwd: true } },
  },
}));
