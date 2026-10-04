import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Base para GitHub Pages del repo borras-ws:
  // https://borras-elchinillo-dev.github.io/borras-ws/
  base: '/borras-ws/',
  plugins: [react()],
  server: { port: 5173 }
})
