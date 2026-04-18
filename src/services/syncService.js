import { ref } from 'vue'
import { signInAnonymously } from 'firebase/auth'
import {
  collection as fsCollection,
  doc as fsDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs
} from 'firebase/firestore'
import { firestore, auth } from '../db/firebase.js'
import { db } from '../db/dexie.js'

// Collections we sync. Each entry describes a Dexie table + its primary key field.
// For most tables the key field is `id`, but `meta` uses `key`.
const SYNCED = [
  { name: 'exercises', keyField: 'id' },
  { name: 'plans', keyField: 'id' },
  { name: 'trainingDays', keyField: 'id' },
  { name: 'workoutLogs', keyField: 'id' },
  { name: 'setLogs', keyField: 'id' },
  { name: 'meta', keyField: 'key' }
]

// Reactive state for UI
export const syncStatus = ref('idle') // 'idle' | 'connecting' | 'synced' | 'offline' | 'error'
export const lastSyncAt = ref(null)

let initialized = false
const unsubscribers = []

// Strip Vue reactive proxies + ensure no undefined values (Firestore rejects them)
function toPlain(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// Determine if remote version should overwrite local.
// Returns true if remote should win (apply it), false if local is newer/equal.
// Handles missing timestamps defensively so a ghost remote without updatedAt
// can't overwrite a local record.
function shouldApplyRemote(local, remote) {
  if (!local) return true
  const lt = local.updatedAt || local.createdAt || null
  const rt = remote.updatedAt || remote.createdAt || null
  // If remote has no timestamp, never let it win.
  if (!rt) return false
  // If local has no timestamp, remote wins (fills in missing data).
  if (!lt) return true
  // Otherwise lexicographic ISO-string compare: apply on equal-or-newer.
  return rt >= lt
}

async function applyRemoteChange(tableName, keyField, change) {
  const table = db[tableName]
  if (!table) return
  const remoteData = change.doc.data()
  const remoteKey = change.doc.id

  if (change.type === 'removed') {
    await table.delete(remoteKey)
    return
  }

  // added or modified
  const local = await table.get(remoteKey)
  if (!shouldApplyRemote(local, remoteData)) return

  // Ensure the key field matches the document ID
  const record = { ...remoteData, [keyField]: remoteKey }
  await table.put(record)
}

async function handleSnapshot(tableName, keyField, snapshot) {
  for (const change of snapshot.docChanges()) {
    try {
      await applyRemoteChange(tableName, keyField, change)
    } catch (err) {
      console.error(`[sync] apply failed for ${tableName}/${change.doc.id}:`, err)
    }
  }
  lastSyncAt.value = new Date()
  // Notify stores to reload reactive state from Dexie
  window.dispatchEvent(
    new CustomEvent('fitness-sync-changed', { detail: { collection: tableName } })
  )
}

// Push all local records of a collection that don't have a remote counterpart,
// or whose updatedAt is newer than the remote copy.
async function reconcileCollection(tableName, keyField) {
  const table = db[tableName]
  if (!table) return
  const locals = await table.toArray()
  if (locals.length === 0) return

  // Fetch remote once
  const remoteSnap = await getDocs(fsCollection(firestore, tableName))
  const remoteMap = new Map()
  remoteSnap.forEach((d) => remoteMap.set(d.id, d.data()))

  for (const local of locals) {
    const id = local[keyField]
    if (!id) continue
    const remote = remoteMap.get(id)
    if (!remote) {
      // Not in cloud yet — push it
      await setDoc(fsDoc(firestore, tableName, String(id)), toPlain(local))
    } else {
      // Compare timestamps; push local if strictly newer.
      const lt = local.updatedAt || local.createdAt || null
      const rt = remote.updatedAt || remote.createdAt || null
      if (lt && (!rt || lt > rt)) {
        await setDoc(fsDoc(firestore, tableName, String(id)), toPlain(local))
      }
    }
  }
}

export async function initSync() {
  if (initialized) return
  initialized = true
  syncStatus.value = 'connecting'

  try {
    await signInAnonymously(auth)

    // Set up real-time listeners for each collection.
    // The first firing delivers the current Firestore state.
    for (const { name, keyField } of SYNCED) {
      const unsub = onSnapshot(
        fsCollection(firestore, name),
        (snap) => handleSnapshot(name, keyField, snap),
        (err) => {
          console.error(`[sync] listener error for ${name}:`, err)
          syncStatus.value = 'error'
        }
      )
      unsubscribers.push(unsub)
    }

    // Push any local records that aren't in the cloud yet (first-time sync
    // from devices that had offline data before cloud sync was enabled).
    // Run in background; don't block status update.
    Promise.all(SYNCED.map(({ name, keyField }) => reconcileCollection(name, keyField)))
      .catch((err) => console.error('[sync] reconcile error:', err))

    syncStatus.value = 'synced'
    lastSyncAt.value = new Date()
  } catch (err) {
    console.error('[sync] init failed:', err)
    syncStatus.value = 'error'
  }
}

// Push a single record (add or update) to Firestore.
// Called by stores after every successful local Dexie write.
export async function pushRecord(collectionName, id, data) {
  if (!initialized || !auth.currentUser || !id) return
  try {
    await setDoc(fsDoc(firestore, collectionName, String(id)), toPlain(data))
    lastSyncAt.value = new Date()
  } catch (err) {
    console.error(`[sync] push failed for ${collectionName}/${id}:`, err)
  }
}

// Delete a single record from Firestore.
export async function pushDelete(collectionName, id) {
  if (!initialized || !auth.currentUser || !id) return
  try {
    await deleteDoc(fsDoc(firestore, collectionName, String(id)))
    lastSyncAt.value = new Date()
  } catch (err) {
    console.error(`[sync] delete failed for ${collectionName}/${id}:`, err)
  }
}

// Bulk delete helper.
export async function pushBulkDelete(collectionName, ids) {
  for (const id of ids) {
    await pushDelete(collectionName, id)
  }
}

export function stopSync() {
  for (const unsub of unsubscribers) unsub()
  unsubscribers.length = 0
  initialized = false
  syncStatus.value = 'idle'
}
