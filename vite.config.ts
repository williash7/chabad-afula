import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'בית חב"ד עפולה',
          short_name: 'חב"ד עפולה',
          description: 'ניהול תורמים ואירועים — בית חב"ד עפולה',
          theme_color: '#C9A84C',
          background_color: '#FAF6EE',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'he',
          dir: 'rtl',
          start_url: '/',
          scope: '/',
          id: 'chabad-afula-pwa',
          icons: [
            {
              src: 'pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Cache all built assets (js, css, html, fonts, images)
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
          // Don't cache the server-side API routes
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            // Google Fonts stylesheet — cache-first, 1 year
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            // Google Fonts files — cache-first, 1 year
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            // API calls — network-first, fall back to cache (24h)
            {
              urlPattern: /\/api\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-responses',
                networkTimeoutSeconds: 10,
                expiration: {maxEntries: 100, maxAgeSeconds: 60 * 60 * 24},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
          ],
        },
        devOptions: {
          // Enable SW in dev mode so you can test offline behaviour
          enabled: true,
          type: 'module',
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.NODE_ENV !== 'production' && process.env.DISABLE_HMR !== 'true',
    },
  };
});
