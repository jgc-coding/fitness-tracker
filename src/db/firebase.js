import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyC1wBKW1qhGGVWzfnjc5NT3uaBcW9kbKFQ',
  authDomain: 'gymtracker-ketohybrid.firebaseapp.com',
  projectId: 'gymtracker-ketohybrid',
  storageBucket: 'gymtracker-ketohybrid.firebasestorage.app',
  messagingSenderId: '82923845227',
  appId: '1:82923845227:web:3550eb92af26e7064aa32e'
}

export const firebaseApp = initializeApp(firebaseConfig)

// Firestore with offline persistence so writes work when no network
export const firestore = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
})

export const auth = getAuth(firebaseApp)
