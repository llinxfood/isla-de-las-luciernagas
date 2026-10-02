import publicConfig from './config.json';

// Lightweight module: importing it must not load the Firebase SDK.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || publicConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || publicConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || publicConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || publicConfig.appId,
};
export const firebaseConfigured =
  import.meta.env.VITE_FIREBASE_ENABLED !== 'false' && Object.values(firebaseConfig).every(Boolean);

/** Remembers that this device signed in, so Firebase loads at startup only when needed. */
const SESSION_KEY = 'luciernagas.cloud.session';
export function hadCloudSession() {
  try {
    return window.localStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}
export function rememberCloudSession(signedIn: boolean) {
  try {
    if (signedIn) window.localStorage.setItem(SESSION_KEY, '1');
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* Storage may be disabled; Firebase will simply load on demand. */
  }
}
