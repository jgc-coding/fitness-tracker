import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// Single source of truth for the app version: package.json. Exposed to the app
// as the __APP_VERSION__ compile-time constant (used in SettingsView).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  base: '/fitness-tracker/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
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
        // The standalone "FitTrack Single" variant is served from the
        // /fitness-tracker/single/ subpath. Make sure this app's SPA
        // navigation fallback never hijacks those routes with this app's
        // index.html when both are installed in the same browser.
        navigateFallbackDenylist: [/^\/fitness-tracker\/single\//],
        // Inject our notificationclick handler into the generated SW so tapping
        // the workout notification opens/focuses the app (see public/sw-custom.js).
        importScripts: ['sw-custom.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com/,
            handler: 'NetworkOnly'
          }
        ]
      },
      manifest: {
        id: '/fitness-tracker/',
        name: 'Keto Hybrid Fitness Tracker',
        short_name: 'FitTrack',
        description: 'Kraftsport Tracker fuer zwei',
        theme_color: '#911f2f',
        background_color: '#f3f6f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/fitness-tracker/',
        scope: '/fitness-tracker/',
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
        // Long-Press aufs App-Icon: Schnellzugriffe. Ein "heutiges Workout"
        // gibt es nicht (Trainingstage haengen nicht am Wochentag), darum
        // Individuelles Training + History.
        shortcuts: [
          {
            name: 'Individuelles Training',
            short_name: 'Individuell',
            url: '/fitness-tracker/tracking?start=custom',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'History',
            short_name: 'History',
            url: '/fitness-tracker/history',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          }
        ]
      },
    })
  ]
})
