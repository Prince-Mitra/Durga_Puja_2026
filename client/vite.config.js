import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the API/socket/uploads are proxied to Express, so the browser sees ONE origin
// (cookies work with SameSite=Lax and there are no CORS surprises).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true, // reachable from phones on the same wifi: http://<your-ip>:5173
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
        '/socket.io': { target, ws: true, changeOrigin: true },
      },
    },
    build: { sourcemap: false, chunkSizeWarningLimit: 700 },
  };
});
