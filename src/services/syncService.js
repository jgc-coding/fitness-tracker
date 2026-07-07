import { ref } from 'vue'
import { db } from '../db/dexie.js'

// Firebase APIs + instances are loaded lazily in initSync() so the Firebase SDK
// is code-split out of the main bundle. Until that runs these stay null and the
// push* helpers below no-op (they guard on `fb`).
let fb = null
let firestore = null
let auth = null

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
// 'auth-required' = no signed-in account; sync is paused until login (Settings).
export const syncStatus = ref('idle') // 'idle' | 'connecting' | 'auth-required' | 'synced' | 'offline' | 'error'
export const lastSyncAt = ref(null)
export const authUserEmail = ref(null)

let initialized = false
let sessionStarted = false
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
  const remoteSnap = await fb.getDocs(fb.collection(firestore, tableName))
  const remoteMap = new Map()
  remoteSnap.forEach((d) => remoteMap.set(d.id, d.data()))

  for (const local of locals) {
    const id = local[keyField]
    if (!id) continue
    const remote = remoteMap.get(id)
    if (!remote) {
      // Not in cloud yet — push it
      await fb.setDoc(fb.doc(firestore, tableName, String(id)), toPlain(local))
    } else {
      // Compare timestamps; push local if strictly newer.
      const lt = local.updatedAt || local.createdAt || null
      const rt = remote.updatedAt || remote.createdAt || null
      if (lt && (!rt || lt > rt)) {
        await fb.setDoc(fb.doc(firestore, tableName, String(id)), toPlain(local))
      }
    }
  }
}

export async function initSync() {
  if (initialized) return
  initialized = true
  syncStatus.value = 'connecting'

  try {
    // Lazily load Firebase (code-split out of the main bundle) plus the APIs we use.
    const [{ initFirebase }, authMod, fsMod] = await Promise.all([
      import('../db/firebase.js'),
      import('firebase/auth'),
      import('firebase/firestore')
    ])
    const instances = await initFirebase()
    firestore = instances.firestore
    auth = instances.auth
    fb = {
      signInWithEmailAndPassword: authMod.signInWithEmailAndPassword,
      onAuthStateChanged: authMod.onAuthStateChanged,
      signOut: authMod.signOut,
      collection: fsMod.collection,
      doc: fsMod.doc,
      setDoc: fsMod.setDoc,
      deleteDoc: fsMod.deleteDoc,
      onSnapshot: fsMod.onSnapshot,
      getDocs: fsMod.getDocs
    }

    // Sync runs only for a signed-in email/password account (the shared
    // fitness account). Anonymous sessions from older app versions are
    // signed out so those devices land on the login form in Settings.
    fb.onAuthStateChanged(auth, (user) => {
      if (user && user.isAnonymous) {
        fb.signOut(auth).catch(() => {})
        return
      }
      if (user) {
        authUserEmail.value = user.email
        startSyncSession()
      } else {
        authUserEmail.value = null
        stopListeners()
        syncStatus.value = 'auth-required'
      }
    })
  } catch (err) {
    console.error('[sync] init failed:', err)
    syncStatus.value = 'error'
  }
}

// Sign in with the shared account. Errors bubble up to the caller (Settings
// UI shows them); onAuthStateChanged then starts the sync session.
export async function signIn(email, password) {
  if (!fb || !auth) throw new Error('Sync ist noch nicht initialisiert')
  await fb.signInWithEmailAndPassword(auth, email, password)
}

export async function signOutSync() {
  if (!fb || !auth) return
  await fb.signOut(auth)
}

// Start listeners + reconcile once a user is signed in. Guarded so a repeated
// auth event (e.g. token refresh) doesn't register duplicate listeners.
function startSyncSession() {
  if (sessionStarted) return
  sessionStarted = true
  syncStatus.value = 'connecting'

  // Set up real-time listeners for each collection.
  // The first firing delivers the current Firestore state.
  for (const { name, keyField } of SYNCED) {
    const unsub = fb.onSnapshot(
      fb.collection(firestore, name),
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
}

function stopListeners() {
  for (const unsub of unsubscribers) unsub()
  unsubscribers.length = 0
  sessionStarted = false
}

// Push a single record (add or update) to Firestore.
// Called by stores after every successful local Dexie write.
export async function pushRecord(collectionName, id, data) {
  if (!fb || !auth?.currentUser || !id) return
  try {
    await fb.setDoc(fb.doc(firestore, collectionName, String(id)), toPlain(data))
    lastSyncAt.value = new Date()
  } catch (err) {
    console.error(`[sync] push failed for ${collectionName}/${id}:`, err)
  }
}

// Delete a single record from Firestore.
export async function pushDelete(collectionName, id) {
  if (!fb || !auth?.currentUser || !id) return
  try {
    await fb.deleteDoc(fb.doc(firestore, collectionName, String(id)))
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
  stopListeners()
  initialized = false
  fb = null
  syncStatus.value = 'idle'
}
