import { ref } from 'vue'

// FitTrack Single is a purely LOCAL app: there is no cloud sync and no Firebase.
// This module keeps the same export surface as the original app's syncService so
// the stores and views can be reused unchanged, but every operation is a no-op.
// All data lives only in this device's IndexedDB (see db/dexie.js).

// Reactive state kept only so reused views (TopBar etc.) can render labels.
export const syncStatus = ref('local')
export const lastSyncAt = ref(null)
export const authUserEmail = ref(null)
export const pendingPushCount = ref(0)

// No-op push/delete helpers — writes already went to IndexedDB at the call site.
export async function pushRecord() {}
export async function pushDelete() {}
export async function pushBulkDelete() {}

// No remote to connect to; kept for API compatibility with the main app.
export async function initSync() {}
export async function signIn() {
  throw new Error('FitTrack Single hat keinen Cloud-Sync')
}
export async function signOutSync() {}
export async function resyncAll() {}
export async function flushQueue() {}
export function stopSync() {}
