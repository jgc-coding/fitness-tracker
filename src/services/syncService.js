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
  { name: 'runPlans', keyField: 'id' },
  { name: 'runSessions', keyField: 'id' },
  { name: 'meta', keyField: 'key' }
]

// Reactive state for UI
// 'auth-required' = no signed-in account; sync is paused until login (Settings).
export const syncStatus = ref('idle') // 'idle' | 'connecting' | 'auth-required' | 'synced' | 'offline' | 'error'
export const lastSyncAt = ref(null)
export const authUserEmail = ref(null)
// Number of failed pushes waiting in the retry queue (0 = alles in der Cloud)
export const pendingPushCount = ref(0)

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

  // Zombie-Schutz: Wurde der Datensatz hier geloescht (Tombstone) und die
  // Remote-Kopie ist nicht neuer als die Loeschung, ignorieren wir sie und
  // raeumen sie in der Cloud gleich mit weg (self-healing gegen Altbestaende
  // von Geraeten ohne Tombstone-Logik). Ist die Remote-Kopie NEUER, wurde der
  // Datensatz nach der Loeschung bewusst neu angelegt -> Tombstone aufheben.
  const tombstone = await db.deletions.get(`${tableName}:${remoteKey}`)
  if (tombstone) {
    const rt = remoteData.updatedAt || remoteData.createdAt || null
    if (!rt || rt <= tombstone.deletedAt) {
      if (fb && auth?.currentUser) {
        fb.deleteDoc(fb.doc(firestore, tableName, remoteKey)).catch(() => {})
      }
      return
    }
    await db.deletions.delete(tombstone.id)
  }

  // added or modified
  const local = await table.get(remoteKey)
  if (!shouldApplyRemote(local, remoteData)) return

  // Ensure the key field matches the document ID
  const record = { ...remoteData, [keyField]: remoteKey }
  await table.put(record)
}

// Apply a tombstone that arrived from the cloud: delete the local record and
// remember the tombstone so reconcile never re-uploads the record.
async function applyTombstone(t) {
  if (!t?.collection || !t?.recordId) return
  const table = db[t.collection]
  if (table) await table.delete(t.recordId)
  await db.deletions.put({
    id: t.id || `${t.collection}:${t.recordId}`,
    collection: t.collection,
    recordId: t.recordId,
    deletedAt: t.deletedAt || new Date().toISOString()
  })
}

async function handleDeletionsSnapshot(snapshot) {
  const touched = new Set()
  for (const change of snapshot.docChanges()) {
    if (change.type === 'removed') continue
    try {
      const t = change.doc.data()
      await applyTombstone(t)
      if (t?.collection) touched.add(t.collection)
    } catch (err) {
      console.error(`[sync] tombstone apply failed for ${change.doc.id}:`, err)
    }
  }
  for (const collection of touched) {
    window.dispatchEvent(
      new CustomEvent('fitness-sync-changed', { detail: { collection } })
    )
  }
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

// Sync tombstones both ways BEFORE reconciling records: pull remote deletions
// (and apply them locally), push local deletions the cloud doesn't know yet
// (and delete their target docs remotely).
async function reconcileDeletions() {
  const remoteSnap = await fb.getDocs(fb.collection(firestore, 'deletions'))
  const remoteIds = new Set()
  const remoteTombs = []
  remoteSnap.forEach((d) => {
    remoteIds.add(d.id)
    remoteTombs.push(d.data())
  })

  for (const t of remoteTombs) {
    try {
      await applyTombstone(t)
    } catch (err) {
      console.error('[sync] applying remote tombstone failed:', err)
    }
  }

  const locals = await db.deletions.toArray()
  for (const t of locals) {
    if (remoteIds.has(t.id)) continue
    try {
      await fb.setDoc(fb.doc(firestore, 'deletions', t.id), toPlain(t))
      await fb.deleteDoc(fb.doc(firestore, t.collection, t.recordId))
    } catch (err) {
      console.error('[sync] pushing local tombstone failed:', err)
    }
  }
}

// Push all local records of a collection that don't have a remote counterpart,
// or whose updatedAt is newer than the remote copy. Tombstoned records are
// never pushed (that's what caused deleted data to "resurrect").
async function reconcileCollection(tableName, keyField) {
  const table = db[tableName]
  if (!table) return
  const locals = await table.toArray()
  if (locals.length === 0) return

  const tombstoned = new Set(
    (await db.deletions.where('collection').equals(tableName).toArray()).map((t) => t.recordId)
  )

  // Fetch remote once
  const remoteSnap = await fb.getDocs(fb.collection(firestore, tableName))
  const remoteMap = new Map()
  remoteSnap.forEach((d) => remoteMap.set(d.id, d.data()))

  for (const local of locals) {
    const id = local[keyField]
    if (!id) continue
    if (tombstoned.has(String(id))) continue
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

  // Tombstones first: the deletions listener keeps deletes flowing in live.
  const unsubDeletions = fb.onSnapshot(
    fb.collection(firestore, 'deletions'),
    (snap) => handleDeletionsSnapshot(snap),
    (err) => {
      console.error('[sync] listener error for deletions:', err)
      syncStatus.value = 'error'
    }
  )
  unsubscribers.push(unsubDeletions)

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

  // Reconcile in background; don't block status update. Order matters:
  // tombstones first (so reconcileCollection skips deleted records), then
  // records, then retry anything still parked in the queue.
  reconcileDeletions()
    .then(() => Promise.all(SYNCED.map(({ name, keyField }) => reconcileCollection(name, keyField))))
    .then(() => flushQueue())
    .catch((err) => console.error('[sync] reconcile error:', err))

  updatePendingCount()
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
// Failures land in the persistent retry queue (visible in Settings) instead
// of silently disappearing; not-signed-in is covered by reconcile on login.
export async function pushRecord(collectionName, id, data) {
  if (!fb || !auth?.currentUser || !id) return
  try {
    await fb.setDoc(fb.doc(firestore, collectionName, String(id)), toPlain(data))
    lastSyncAt.value = new Date()
    if (pendingPushCount.value > 0) flushQueue()
  } catch (err) {
    console.error(`[sync] push failed for ${collectionName}/${id}:`, err)
    await enqueueRetry(collectionName, String(id), 'set')
  }
}

// Delete a record: write a local tombstone FIRST (works offline), then push
// the tombstone + delete the remote doc. The tombstone prevents other devices
// from re-uploading the record via reconcile ("resurrection").
export async function pushDelete(collectionName, id) {
  if (!id) return
  const tombstone = {
    id: `${collectionName}:${id}`,
    collection: collectionName,
    recordId: String(id),
    deletedAt: new Date().toISOString()
  }
  try {
    await db.deletions.put(tombstone)
  } catch (err) {
    console.error(`[sync] tombstone write failed for ${tombstone.id}:`, err)
  }

  if (!fb || !auth?.currentUser) return // reconcileDeletions pusht nach Login
  try {
    await fb.setDoc(fb.doc(firestore, 'deletions', tombstone.id), toPlain(tombstone))
    await fb.deleteDoc(fb.doc(firestore, collectionName, String(id)))
    lastSyncAt.value = new Date()
  } catch (err) {
    console.error(`[sync] delete failed for ${collectionName}/${id}:`, err)
    await enqueueRetry(collectionName, String(id), 'delete')
  }
}

// Bulk delete helper.
export async function pushBulkDelete(collectionName, ids) {
  for (const id of ids) {
    await pushDelete(collectionName, id)
  }
}

// ---------------------------------------------------------------------------
// Retry queue: failed pushes persist in the (Dexie) syncQueue table and are
// retried on session start, when the browser comes back online, and after the
// next successful push. Settings shows the pending count in red.
// ---------------------------------------------------------------------------

let flushing = false

async function enqueueRetry(collectionName, recordId, op) {
  try {
    await db.syncQueue.add({ collection: collectionName, recordId, op, timestamp: Date.now() })
  } catch (err) {
    console.error('[sync] enqueue failed:', err)
  }
  await updatePendingCount()
}

async function updatePendingCount() {
  try {
    pendingPushCount.value = await db.syncQueue.count()
  } catch {
    /* count is cosmetic */
  }
}

// Work through the retry queue in order. Records are re-read from Dexie at
// flush time so we always push the latest state (no stale snapshots).
export async function flushQueue() {
  if (flushing || !fb || !auth?.currentUser) return
  flushing = true
  try {
    const items = await db.syncQueue.orderBy('id').toArray()
    for (const item of items) {
      try {
        if (item.op === 'delete') {
          const t = await db.deletions.get(`${item.collection}:${item.recordId}`)
          if (t) await fb.setDoc(fb.doc(firestore, 'deletions', t.id), toPlain(t))
          await fb.deleteDoc(fb.doc(firestore, item.collection, item.recordId))
        } else {
          const table = db[item.collection]
          const record = table ? await table.get(item.recordId) : null
          if (record) {
            await fb.setDoc(fb.doc(firestore, item.collection, item.recordId), toPlain(record))
          }
          // Record inzwischen geloescht -> nichts zu pushen, Eintrag verwerfen
        }
        await db.syncQueue.delete(item.id)
        lastSyncAt.value = new Date()
      } catch (err) {
        console.error('[sync] retry failed, keeping queue:', err)
        break // Reihenfolge wahren; naechster Trigger versucht es erneut
      }
    }
  } finally {
    flushing = false
    await updatePendingCount()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flushQueue())
}

// Full re-reconcile on demand, e.g. after a backup import brought in local
// data the cloud doesn't know yet. No-op when not signed in (login triggers
// the same reconcile anyway).
export async function resyncAll() {
  if (!fb || !auth?.currentUser) return
  try {
    await reconcileDeletions()
    await Promise.all(SYNCED.map(({ name, keyField }) => reconcileCollection(name, keyField)))
    await flushQueue()
    lastSyncAt.value = new Date()
  } catch (err) {
    console.error('[sync] resync failed:', err)
  }
}

export function stopSync() {
  stopListeners()
  initialized = false
  fb = null
  syncStatus.value = 'idle'
}
