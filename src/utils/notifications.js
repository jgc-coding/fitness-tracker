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

export function showWorkoutNotification(dayTitle, exerciseLines) {
  if (!isNotificationPermitted()) return

  const body = exerciseLines.join('\n')

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
          actions: [
            { action: 'open', title: 'Oeffnen' }
          ]
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

export function buildExerciseLines(workoutExercises, getExerciseName, users, recommendations, getSavedValue) {
  const lines = []

  for (const ex of workoutExercises) {
    const name = getExerciseName(ex.exerciseId)
    const userParts = []

    for (const user of users) {
      const savedWeight = getSavedValue(ex.exerciseId, user.id, 'weight')
      const savedReps = getSavedValue(ex.exerciseId, user.id, 'reps')

      if (savedWeight) {
        userParts.push(`${user.name}: ${savedWeight}kg x${savedReps}`)
      } else {
        const rec = recommendations[ex.exerciseId]?.[user.id]
        if (rec) {
          userParts.push(`${user.name}: ~${rec.weight}kg`)
        } else {
          userParts.push(`${user.name}: --`)
        }
      }
    }

    lines.push(`${name}`)
    lines.push(`  ${userParts.join(' | ')}`)
  }

  return lines
}
