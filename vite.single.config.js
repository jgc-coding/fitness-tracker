import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// Build config for "FitTrack Single" — the standalone, single-user, local-only
// variant. It lives in ./single, reuses the root node_modules, and builds into
// dist/single so it can be served from GitHub Pages at /fitness-tracker/single/
// alongside (but fully independent of) the original two-user app.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  root: 'single',
  base: '/fitness-tracker/single/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    // Relative to `root` (single/) -> repo-root/dist/single
    outDir: '../dist/single',
    emptyOutDir: true
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Inject the notificationclick handler (see single/public/sw-custom.js).
        importScripts: ['sw-custom.js']
        // No Firebase here — FitTrack Single is local-only.
      },
      manifest: {
        id: '/fitness-tracker/single/',
        name: 'FitTrack Single',
        short_name: 'FitTrack Single',
        description: 'Kraftsport Tracker — lokal, fuer eine Person',
        theme_color: '#911f2f',
        background_color: '#f3f6f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/fitness-tracker/single/',
        scope: '/fitness-tracker/single/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        // Long-Press aufs App-Icon: Schnellzugriffe (analog zur Haupt-App)
        shortcuts: [
          {
            name: 'Individuelles Training',
            short_name: 'Individuell',
            url: '/fitness-tracker/single/tracking?start=custom',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'History',
            short_name: 'History',
            url: '/fitness-tracker/single/history',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          }
        ]
      }
    })
  ]
})
