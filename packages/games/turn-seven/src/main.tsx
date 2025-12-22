import React from 'react';
import ReactDOM from 'react-dom/client';
import { TurnSevenGame } from './index';
import './styles.css';
import './mobile.css';
import { auth } from '@turn-seven/engine';
import { signInAnonymously } from 'firebase/auth';

signInAnonymously(auth)
  .then((creds) => {
    console.log('Signed in anonymously', creds.user.uid);
  })
  .catch((error) => {
    console.error('Anonymous sign-in failed', error);
  });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TurnSevenGame />
  </React.StrictMode>
);
