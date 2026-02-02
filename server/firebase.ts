// server/firebase.ts
import admin from 'firebase-admin';
import { serviceAccount } from './firebase-creds'; // No .js needed

if (!admin.apps.length) {
  console.log("✅ [FIREBASE] Loading credentials from server/firebase-creds.ts...");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("🚀 [FIREBASE] Initialized successfully.");
}

export const db = admin.firestore();
export const messaging = admin.messaging();
export default admin;
