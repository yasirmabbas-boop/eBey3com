// server/firebase.ts
import admin from 'firebase-admin';
import { serviceAccount } from './firebase-creds'; 

// 1. FORCE THE FIX: Convert literal \n to real newlines
const rawKey = serviceAccount.private_key || "";
const cleanKey = rawKey.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  console.log("✅ [FIREBASE] Initializing...");

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: cleanKey, // <--- WE USE THE FIXED KEY HERE
      }),
    });
    console.log("🚀 [FIREBASE] Initialized successfully.");
  } catch (err) {
    console.error("❌ [FIREBASE] Initialization Failed:", err);
  }
}

export const db = admin.firestore();
export const messaging = admin.messaging();
export default admin;