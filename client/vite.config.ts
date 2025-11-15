import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

// Ensure plugin types are correctly resolved
import type { PluginOption } from 'vite'

// Get the directory name for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // loads .env*, no prefix filter

  // Only expose VITE_* to client (Vite handles this automatically in code),
  // but we can also use env here to configure dev server safely.
  return {
  plugins: [
    react() as PluginOption,
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Fan Club Z',
        short_name: 'FanClubZ',
        description: 'Social prediction platform for sports, entertainment, and more',
        theme_color: '#00D084',
        background_color: '#FAFBFC',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }) as PluginOption
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '~shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: Number(env.VITE_PORT ?? 5174),
    host: true,
    strictPort: false,
    hmr: env.VITE_HMR_CLIENT_PORT
      ? { clientPort: Number(env.VITE_HMR_CLIENT_PORT) }
      : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'framer-motion'],
          utils: ['zustand', '@tanstack/react-query', 'date-fns'],
        },
      },
    },
  },
  envPrefix: ['VITE_'],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __CACHE_BUST__: JSON.stringify(Date.now()),
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', '@tanstack/react-query'],
    exclude: ['@base-org/account'],
  },
  esbuild: {
    target: 'esnext',
  }
  };
});
