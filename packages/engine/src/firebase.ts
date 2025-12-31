import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyAV2WcIZI9GjOav84lU9I_cC55ezOPh9Mw',
  authDomain: 'turn-seven.firebaseapp.com',
  projectId: 'turn-seven',
  storageBucket: 'turn-seven.firebasestorage.app',
  messagingSenderId: '1064842151762',
  appId: '1:1064842151762:web:7ac732c7d5aad1d229dc8b',
  measurementId: 'G-PR15Y134LF',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Connect to emulators when running locally (serving from localhost or 127.0.0.1)
// This ensures production builds served by the Hosting emulator still connect
// to the local emulators instead of hitting production Cloud Functions.
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
// @ts-expect-error - import.meta may not be typed in all environments
const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

if (isLocalhost || isDev) {
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
