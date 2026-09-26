const NOTIFICATION_TAG = 'workout-active'

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function isNotificationSupported() {
  return 'Notification' in window
}

export function isNotificationPermitted() {
  return 'Notification' in window && Notification.permission === 'granted'
}

export function showWorkoutNotification(dayTitle, exerciseLines, extra = {}) {
  if (!isNotificationPermitted()) return

  const body = exerciseLines.join('\n')

  // Quick-Log-Knoepfe (siehe TrackingView.buildNotificationQuickLog) haben
  // Vorrang; Android zeigt meist nur 2 Actions. "Oeffnen" ist verzichtbar,
  // weil ein Tap auf die Notification selbst die App oeffnet.
  const actions = (extra.actions || []).slice(0, 2)
  if (actions.length < 2) actions.push({ action: 'open', title: 'Oeffnen' })

  // Close existing notification first
  dismissWorkoutNotification()

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Use service worker for persistent notification (stays on lock screen)
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(dayTitle, {
          body,
          tag: NOTIFICATION_TAG,
          icon: '/fitness-tracker/logo.svg',
          badge: '/fitness-tracker/logo.svg',
          silent: false,
          vibrate: [100], // Short vibration — needed for Android lock screen visibility
          requireInteraction: true, // Keeps it on screen until dismissed
          renotify: true,
          actions,
          data: extra.data || null
        })
      })
    } else {
      // Fallback: regular notification
      new Notification(dayTitle, {
        body,
        tag: NOTIFICATION_TAG,
        icon: '/fitness-tracker/logo.svg',
        requireInteraction: true
      })
    }
  } catch (e) {
    console.warn('Notification failed:', e)
  }
}

export function dismissWorkoutNotification() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.getNotifications({ tag: NOTIFICATION_TAG }).then(notifications => {
        notifications.forEach(n => n.close())
      })
    }).catch(() => {})
  }
}

// getLastReps kommt aus der TrackingView: dieselbe Quelle wie Karte und Rad,
// damit der Sperrbildschirm dieselben Wdh zeigt. getSatzPunkte (optional)
// liefert fuer Mehrsatz-Nutzer { slots, fertig } — die Zeile zeigt dann den
// Fortschritt, z.B. "(2/3)".
export function buildExerciseLines(workoutExercises, getExerciseName, users, recommendations, getSavedValue, getLastReps, getUserExerciseId, getSatzPunkte) {
  const lines = []
  // Aktive Uebung je Nutzer (Schnellwechsel-Ring); ohne die Funktion gilt
  // fuer alle die Karten-Uebung wie bisher.
  const idFuer = getUserExerciseId || ((ex) => ex.exerciseId)

  for (const ex of workoutExercises) {
    const userParts = []
    const namen = []

    for (const user of users) {
      const exId = idFuer(ex, user.id)
      const name = getExerciseName(exId)
      if (!namen.includes(name)) namen.push(name)
      const savedWeight = getSavedValue(exId, user.id, 'weight')
      const savedReps = getSavedValue(exId, user.id, 'reps')
      const punkte = getSatzPunkte ? getSatzPunkte(exId, user.id) : null
      const fortschritt = punkte ? ` (${punkte.fertig}/${punkte.slots})` : ''

      if (savedWeight) {
        userParts.push(`${user.name}: ${savedWeight}kg x${savedReps}${fortschritt}`)
      } else {
        const rec = recommendations[exId]?.[user.id]
        if (rec) {
          const reps = getLastReps(exId, user.id)
          userParts.push(`${user.name}: ~${rec.weight}kg${reps != null ? ` x${reps}` : ''}${fortschritt}`)
        } else {
          userParts.push(`${user.name}: --${fortschritt}`)
        }
      }
    }

    // Machen Nutzer verschiedene Uebungen an dieser Position, nennt die
    // Kopfzeile alle (z.B. "Latzug / Chin Up")
    lines.push(namen.length ? namen.join(' / ') : getExerciseName(ex.exerciseId))
    lines.push(`  ${userParts.join(' | ')}`)
  }

  return lines
}
