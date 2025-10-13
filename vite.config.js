// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    hmr: { clientPort: 443 },
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://0.0.0.0:8000', changeOrigin: true }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true
  },
})
