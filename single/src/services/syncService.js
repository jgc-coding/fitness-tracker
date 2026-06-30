import { ref } from 'vue'

// FitTrack Single is a purely LOCAL app: there is no cloud sync and no Firebase.
// This module keeps the same export surface as the original app's syncService so
// the stores and views can be reused unchanged, but every operation is a no-op.
// All data lives only in this device's IndexedDB (see db/dexie.js).

// Reactive state kept only so the (reused) Settings view can render a label.
export const syncStatus = ref('local')
export const lastSyncAt = ref(null)

// No-op push/delete helpers — writes already went to IndexedDB at the call site.
export async function pushRecord() {}
export async function pushDelete() {}
export async function pushBulkDelete() {}

// No remote to connect to; kept for API compatibility.
export async function initSync() {}
export function stopSync() {}
