import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API requests to the backend during development to avoid CORS and
    // allow using relative `/api/*` paths in the frontend code.
    proxy: {
      '/api': {
        target: 'https://streetpaws-backend-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'https://streetpaws-backend-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
