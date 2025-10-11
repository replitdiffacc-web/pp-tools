import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    hmr: {
      clientPort: 443,
    },
    allowedHosts: [
      '61ffc738-a154-4d1a-8bf8-19aba61e7dee-00-1fwsgklc4pgsm.sisko.replit.dev',
      '28d30785-22ca-4e6f-91bc-85aedb7a0e75-00-2tk2ccqc0k8ge.sisko.repl.co',
      '28d30785-22ca-4e6f-91bc-85aedb7a0e75-00-2tk2ccqc0k8ge.sisko.replit.dev',
      '0f3257ed-64c5-4f34-ac8c-fcc8b29e041a-00-omhqoehsygio.pike.replit.dev',
      '0f3257ed-64c5-4f34-ac8c-fcc8b29e041a-00-omhqoehsygio.pike.repl.co',
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
  },
})
