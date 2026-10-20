import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration for Athar Project (Direct Production Config)
export const firebaseConfig = {
  projectId: "athar-e45df",
  appId: "1:135467811448:android:9792af3b26409bc1ea238d",
  apiKey: "AIzaSyA9BGXZCeswdArZ35KdSEU6WiGYKUC6g0U",
  authDomain: "athar-e45df.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "athar-e45df.firebasestorage.app",
  messagingSenderId: "135467811448",
};

export const oAuthClientId = "135467811448-2e41ttmuthf5eqf2fedv8paoms2mhj5q.apps.googleusercontent.com";

// Initialize Firebase App (singleton pattern)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore
export const db = getFirestore(app);

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
