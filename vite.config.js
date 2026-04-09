import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/fitness-tracker/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.svg'],
      manifest: {
        name: 'Keto Hybrid Fitness Tracker',
        short_name: 'FitTrack',
        description: 'Kraftsport Tracker fuer zwei',
        theme_color: '#911f2f',
        background_color: '#f3f6f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/fitness-tracker/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com/,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ]
})
