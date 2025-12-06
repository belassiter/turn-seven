// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
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
