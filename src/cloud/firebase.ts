import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { firebaseConfig, firebaseConfigured } from './config';
import { ConflictError, decodeCloudSave, type CloudPort } from './sync';

let services: ReturnType<typeof initialize> | undefined;
function initialize() {
  const app = initializeApp(firebaseConfig);
  // Email/password only: skipping the popup resolver avoids loading Google's auth iframe.
  const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
  auth.languageCode = 'es';
  const db = getFirestore(app);
  if (
    import.meta.env.VITE_FIREBASE_EMULATORS === 'true' &&
    ['localhost', '127.0.0.1'].includes(location.hostname)
  ) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  return { auth, db };
}
export function firebaseServices() {
  if (!firebaseConfigured) throw new Error('La sincronización todavía no está configurada.');
  return (services ??= initialize());
}
export function cloudFor(uid: string): CloudPort {
  const { db } = firebaseServices();
  const reference = doc(db, 'players', uid);
  return {
    async read() {
      const snapshot = await getDocFromServer(reference);
      return snapshot.exists() ? decodeCloudSave(snapshot.data()) : null;
    },
    write(expectedRevision, payload) {
      return runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(reference);
        const current = snapshot.exists() ? decodeCloudSave(snapshot.data()) : null;
        if (current?.payload === payload) return current;
        if ((current?.revision ?? 0) !== expectedRevision) throw new ConflictError();
        const next = { revision: expectedRevision + 1, payload };
        transaction.set(reference, { ...next, updatedAt: serverTimestamp() });
        return next;
      });
    },
  };
}
