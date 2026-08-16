/*
 * Custom service-worker logic, injected into the Workbox-generated service
 * worker via `workbox.importScripts` in vite.single.config.js.
 *
 * Zwei Aufgaben:
 * 1) Tap auf die Workout-Notification fokussiert/oeffnet die App, ohne die
 *    Notification zu schliessen (sie bleibt fuer die Session auf dem
 *    Sperrbildschirm).
 * 2) Quick-Log-Knopf ("<Name> OK: ..."): schreibt den von der App
 *    vorbereiteten Satz (notification.data.queues) direkt in IndexedDB —
 *    funktioniert auch bei geschlossener App. Die App baut die Daten bei
 *    jedem Notification-Update neu (TrackingView.buildNotificationQuickLog).
 */
/* eslint-disable no-restricted-globals */
/* global self, clients, indexedDB */

const APP_ICON = '/fitness-tracker/single/logo.svg'
const NOTIFICATION_TAG = 'workout-active'

self.addEventListener('notificationclick', (event) => {
  const data = event.notification && event.notification.data
  if (
    event.action &&
    event.action.indexOf('log-') === 0 &&
    data &&
    data.kind === 'workout-quicklog'
  ) {
    // Intentionally do NOT close the notification: handleQuickLog re-shows it
    // (same tag) with the updated queue.
    event.waitUntil(handleQuickLog(event.action.slice(4), data))
    return
  }

  // Default-Tap und "Oeffnen": App fokussieren/oeffnen, Notification bleibt.
  // (Some Android versions may still auto-dismiss on tap — platform limitation.)
  event.waitUntil(focusOrOpenApp())
})

// Match strictly against this SW's scope (https://host/fitness-tracker/single/)
// instead of a hardcoded substring, so only real Single-app windows match.
function isOwnClient(url) {
  return url.startsWith(self.registration.scope)
}

async function focusOrOpenApp() {
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })

  // Prefer focusing an existing app window over opening a duplicate.
  for (const client of windowClients) {
    if (isOwnClient(client.url) && 'focus' in client) {
      return client.focus()
    }
  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(self.registration.scope)
  }
}

// --- Quick-Log: Satz aus der Notification heraus eintragen -----------------

async function handleQuickLog(userId, data) {
  const queue = (data.queues && data.queues[userId]) || []
  const item = queue[0]
  if (item) {
    try {
      await writeSetLog(data.dbName, item.set)
      data.queues[userId] = queue.slice(1)
      delete data.error
    } catch (err) {
      // Nicht still scheitern: Fehler als Zeile in der Notification zeigen
      data.error = 'Eintragen fehlgeschlagen - bitte in der App speichern.'
    }
  }

  // Offene App-Fenster laden die Saetze nach und bauen die volle Notification
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of windows) {
    if (isOwnClient(client.url)) {
      client.postMessage({ type: 'quicklog-saved', userId })
    }
  }

  await showCompactNotification(data)
}

// Kompakte Bestaetigung: die naechste offene Uebung (oder fertig).
// Eine offene App ueberschreibt sie sofort wieder mit der vollen Liste.
async function showCompactNotification(data) {
  const lines = []
  const actions = []
  for (const userId of Object.keys(data.queues || {})) {
    const name = (data.userNames && data.userNames[userId]) || userId
    const q = data.queues[userId]
    if (q.length > 0) {
      lines.push(name + ': als Naechstes ' + q[0].label)
      actions.push({ action: 'log-' + userId, title: name + ' OK: ' + q[0].label })
    } else {
      lines.push(name + ': alles eingetragen')
    }
  }
  if (data.error) lines.unshift(data.error)

  const finalActions = actions.slice(0, 2)
  if (finalActions.length < 2) finalActions.push({ action: 'open', title: 'Oeffnen' })

  await self.registration.showNotification(data.title || 'Workout', {
    body: lines.join('\n'),
    tag: NOTIFICATION_TAG,
    icon: APP_ICON,
    badge: APP_ICON,
    silent: false,
    vibrate: [100],
    requireInteraction: true,
    renotify: true,
    actions: finalActions,
    data
  })
}

// --- IndexedDB direkt (Dexie gibt es im Service Worker nicht) --------------

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

function openDb(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name)
    // Existiert die DB nicht, NICHT anlegen (die App hat dann nie geschrieben):
    // Abbruch im upgrade-Fall laesst den open-Request mit Fehler enden.
    req.onupgradeneeded = () => {
      req.transaction.abort()
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB blockiert'))
  })
}

function reqAsPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('Transaktion abgebrochen'))
  })
}

async function writeSetLog(dbName, set) {
  const conn = await openDb(dbName)
  try {
    // Anders als in der Haupt-App KEIN syncQueue-Eintrag: FitTrack Single hat
    // keinen Cloud-Sync, der Eintrag wuerde fuer immer liegen bleiben.
    const tx = conn.transaction('setLogs', 'readwrite')
    const store = tx.objectStore('setLogs')

    // Duplikat-Schutz: hat die App den Satz inzwischen selbst gespeichert
    // (Notification-Daten veraltet), nichts ueberschreiben.
    const existing = await reqAsPromise(store.index('workoutLogId').getAll(set.workoutLogId))
    const dupe = existing.find(
      (s) => s.exerciseId === set.exerciseId && s.userId === set.userId && s.setNumber === set.setNumber
    )

    if (!dupe) {
      const now = new Date().toISOString()
      const record = Object.assign({}, set, { id: genId(), createdAt: now, updatedAt: now })
      store.put(record)
    }

    await txDone(tx)
  } finally {
    conn.close()
  }
}
