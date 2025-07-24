import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// FORCE NEW CONFIG - Target port 5001 for backend
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',  // BACKEND IS ON PORT 5001
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:5001',   // BACKEND IS ON PORT 5001
        changeOrigin: true,
        ws: true,
      }
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
