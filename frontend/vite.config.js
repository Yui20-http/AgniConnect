import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Vite configuration.
// The dev server runs on port 5173 and proxies /api, /uploads and /socket.io
// to the backend so that API calls, uploaded images and real-time Socket.IO
// connections all work through the same origin during development.
//
// The backend target defaults to http://localhost:5000 but can be overridden
// by setting VITE_API_TARGET in a frontend/.env file (useful when port 5000
// is already taken on your machine).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_TARGET || 'http://localhost:5000';

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
        '/socket.io': { target, changeOrigin: true, ws: true },
      },
    },
  };
});
