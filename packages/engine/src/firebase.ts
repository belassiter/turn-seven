import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let db: Firestore;
let auth: Auth;
let functions: Functions;

if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  functions = getFunctions(app);
} else {
  // Fallback for environments where client SDK is not needed (e.g. Cloud Functions)
  // or config is missing.
  db = {} as Firestore;
  auth = {} as Auth;
  functions = {} as Functions;
}

export { db, auth, functions };

// Connect to emulators when running locally (serving from localhost or 127.0.0.1)
// This ensures production builds served by the Hosting emulator still connect
// to the local emulators instead of hitting production Cloud Functions.
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

if ((isLocalhost || isDev) && app) {
  try {
    console.log('Connecting to Firebase Emulators (runtime detected).');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (e) {
    // If the emulator SDK functions are not present or fail, don't crash the app.
    // We'll log the error for diagnostics.
    // eslint-disable-next-line no-console
    console.warn('Failed to connect to Firebase emulators:', e);
  }
}
