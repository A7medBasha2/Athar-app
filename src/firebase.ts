import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import configJson from '../firebase-applet-config.json';

// Firebase configuration for Athar Project
export const firebaseConfig = {
  projectId: configJson.projectId,
  appId: configJson.appId,
  apiKey: configJson.apiKey,
  authDomain: configJson.authDomain,
  firestoreDatabaseId: configJson.firestoreDatabaseId,
  storageBucket: configJson.storageBucket,
  messagingSenderId: configJson.messagingSenderId,
};

export const oAuthClientId = configJson.oAuthClientId;

// Initialize Firebase App (singleton pattern)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore with the designated database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test connection on boot to catch offline or configuration anomalies
if (typeof window !== 'undefined') {
  import('firebase/firestore').then(({ doc, getDocFromServer }) => {
    getDocFromServer(doc(db, 'test', 'connection')).catch((error: unknown) => {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('Firebase configuration notice: the client appears offline.');
      }
    });
  }).catch(() => {});
}

export default app;
