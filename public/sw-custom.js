/*
 * Custom service-worker logic, injected into the Workbox-generated service
 * worker via `workbox.importScripts` in vite.config.js.
 *
 * Purpose: when the user taps the persistent "workout active" notification,
 * focus an already-open app window (or open a new one) WITHOUT closing the
 * notification, so it stays on the lock screen for the rest of the session.
 */
/* eslint-disable no-restricted-globals */
/* global self, clients */

self.addEventListener('notificationclick', (event) => {
  // Intentionally do NOT call event.notification.close(): the workout
  // notification should persist until the workout is finished. The app clears
  // it explicitly via dismissWorkoutNotification(). (Some Android versions may
  // still auto-dismiss on tap — that's a platform limitation we can't override.)
  const APP_URL = '/fitness-tracker/'

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      })

      // Prefer focusing an existing app window over opening a duplicate.
      for (const client of windowClients) {
        if (client.url.includes('/fitness-tracker') && 'focus' in client) {
          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(APP_URL)
      }
    })()
  )
})
