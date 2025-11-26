import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

// [PERF] Import visualizer for bundle analysis
import { visualizer } from 'rollup-plugin-visualizer'

// Ensure plugin types are correctly resolved
import type { PluginOption } from 'vite'

// Get the directory name for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // loads .env*, no prefix filter

  // Only expose VITE_* to client (Vite handles this automatically in code),
  // but we can also use env here to configure dev server safely.
  // Prefer the framework-agnostic PORT env var (used by Vercel `vercel dev`),
  // then fall back to VITE_PORT, then a sensible default.
  const resolvedPort = Number(env.PORT || env.VITE_PORT || 5174);

  // [PERF] Check if we should strip logs in production
  const stripLogs = env.VITE_STRIP_LOGS === '1' && mode === 'production';
  
  // [PERF] Check if SW should be enabled (default off in dev)
  const enableSW = env.VITE_ENABLE_SW === '1' || mode === 'production';

  // [PERF] Build plugins array conditionally
  const plugins: PluginOption[] = [
    react() as PluginOption,
  ];

  // [PERF] Only add PWA plugin when SW is enabled
  if (enableSW) {
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        // [PERF] Disable in dev to avoid SW caching issues
        devOptions: {
          enabled: false,
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // [PERF] Runtime caching strategies
          runtimeCaching: [
            {
              // [PERF] CacheFirst for static assets (immutable)
              urlPattern: /^https:\/\/.*\.(js|css|woff|woff2|png|jpg|jpeg|svg|gif|ico)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-assets',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                },
              },
            },
            {
              // [PERF] StaleWhileRevalidate for HTML
              urlPattern: /^https:\/\/.*\.html$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'html-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 24 * 60 * 60, // 1 day
                },
              },
            },
            {
              // [PERF] NetworkFirst for API GETs with timeout fallback
              urlPattern: /^https:\/\/.*\/api\/.*$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60, // 5 minutes
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
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
    );
  }

  // [PERF] Add visualizer in production builds for bundle analysis
  if (mode === 'production') {
    plugins.push(
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // or 'sunburst', 'network'
      }) as PluginOption
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '~shared': path.resolve(__dirname, '../shared'),
        '@fanclubz/shared': path.resolve(__dirname, '../shared/src'),
      },
    },
    server: {
      port: resolvedPort,
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
      // [PERF] Hidden sourcemaps - available for debugging but not exposed to users
      sourcemap: mode === 'production' ? 'hidden' : true,
      // [PERF] Modern output target - smaller polyfills
      target: 'es2020',
      // [PERF] Enable CSS code splitting for parallel loading
      cssCodeSplit: true,
      // [PERF] Disable module preload polyfill (modern browsers don't need it)
      modulePreload: { polyfill: false },
      // [PERF] Use esbuild for faster minification
      minify: 'esbuild',
      rollupOptions: {
        output: {
          // [PERF] Manual chunk splitting for better caching
          manualChunks: {
            // [PERF] Core React - changes rarely
            vendor: ['react', 'react-dom'],
            // [PERF] Web3 stack - large, defer loading
            wagmi: ['wagmi', 'viem', '@wagmi/core', '@wagmi/connectors'],
            // [PERF] UI components - moderate size
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'framer-motion'],
            // [PERF] Utilities - shared across app
            utils: ['zustand', '@tanstack/react-query', 'date-fns', 'clsx', 'tailwind-merge'],
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
      entries: ['src/main.tsx'],
      include: ['react', 'react-dom', 'zustand', '@tanstack/react-query'],
      exclude: ['@base-org/account'],
      esbuildOptions: {
        loader: {
          '.ts': 'ts',
          '.tsx': 'tsx',
        },
      },
    },
    esbuild: {
      target: 'esnext',
      // [PERF] Strip console.* in production when flag is set
      drop: stripLogs ? ['console', 'debugger'] : [],
    },
  };
});
