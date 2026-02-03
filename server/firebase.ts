import admin from 'firebase-admin';
import { serviceAccount } from './firebase-creds'; 

if (!admin.apps.length) {
  console.log("✅ [FIREBASE] Initializing...");

  // 1. FIX THE PRIVATE KEY (The most common cause of failure)
  // We replace literal "\n" characters with actual newlines
  const rawKey = serviceAccount.private_key || "";
  const cleanKey = rawKey.replace(/\\n/g, '\n');

  // 2. DEBUG LOG (Safe - doesn't show the secret)
  console.log(`🔑 [FIREBASE] Project ID: ${serviceAccount.project_id}`);
  console.log(`🔑 [FIREBASE] Client Email: ${serviceAccount.client_email}`);
  console.log(`🔑 [FIREBASE] Key Length: ${cleanKey.length} characters`);

  // 3. INITIALIZE WITH EXPLICIT MAPPING
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: cleanKey, 
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