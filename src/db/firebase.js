// Firebase is loaded lazily (see initFirebase) so the ~500 KB SDK stays out of
// the main bundle. The app shell renders first; cloud sync spins up afterwards
// when initSync() calls initFirebase().

const firebaseConfig = {
  apiKey: 'AIzaSyC1wBKW1qhGGVWzfnjc5NT3uaBcW9kbKFQ',
  authDomain: 'gymtracker-ketohybrid.firebaseapp.com',
  projectId: 'gymtracker-ketohybrid',
  storageBucket: 'gymtracker-ketohybrid.firebasestorage.app',
  messagingSenderId: '82923845227',
  appId: '1:82923845227:web:3550eb92af26e7064aa32e'
}

let firestore = null
let auth = null

// Initialize Firebase once and return the firestore + auth instances. All
// firebase/* modules are dynamically imported here so Rollup code-splits them
// into their own chunks instead of bloating the entry bundle.
export async function initFirebase() {
  if (firestore && auth) return { firestore, auth }

  const [{ initializeApp }, { getAuth }, fs] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore')
  ])

  const app = initializeApp(firebaseConfig)
  // Firestore with offline persistence so writes work when no network.
  firestore = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() })
  })
  auth = getAuth(app)
  return { firestore, auth }
}
