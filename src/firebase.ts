import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import firebaseAppletConfig from '../firebase-applet-config.json';

// Firebase configuration using provisioned applet configuration
export const firebaseConfig = {
  projectId: firebaseAppletConfig.projectId,
  appId: firebaseAppletConfig.appId,
  apiKey: (typeof process !== 'undefined' && process.env?.FIREBASE_API_KEY) || firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || "(default)",
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
};

export const oAuthClientId = firebaseAppletConfig.oAuthClientId || "702259871855-vb33jlkidsgiqift6uh5na7n24l5u4pg.apps.googleusercontent.com";

// Initialize Firebase App (singleton pattern)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore with the configured database
export const db = firebaseAppletConfig.firestoreDatabaseId && firebaseAppletConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseAppletConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Cloud Storage
export const storage = getStorage(app);

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
