import admin from 'firebase-admin';
import { serviceAccount } from './firebase-creds'; 

if (!admin.apps.length) {
  console.log("✅ [FIREBASE] Starting initialization sequence...");
  console.log(`🕒 [SYSTEM TIME] ${new Date().toISOString()}`);

  // 1. CLEAN THE KEY
  let rawKey = serviceAccount.private_key || "";
  // Fix escaped newlines
  let cleanKey = rawKey.replace(/\\n/g, '\n');

  // 2. CHECK & FIX HEADERS (Crucial Step)
  if (!cleanKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.log("⚠️ [FIREBASE] Key is missing headers. Adding them now...");
    cleanKey = `-----BEGIN PRIVATE KEY-----\n${cleanKey}\n-----END PRIVATE KEY-----\n`;
  }

  // 3. LOG KEY DIAGNOSTICS (Safe)
  const keyStart = cleanKey.substring(0, 35).replace(/\n/g, ' ');
  const keyEnd = cleanKey.substring(cleanKey.length - 30).replace(/\n/g, ' ');
  console.log(`🔑 [KEY CHECK] Start: "${keyStart}..."`);
  console.log(`🔑 [KEY CHECK] End: "...${keyEnd}"`);

  // 4. INITIALIZE
  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: cleanKey, 
      }),
    });
    console.log("🚀 [FIREBASE] App Initialized. Attempting to generate Access Token...");

    // 5. TEST AUTH IMMEDIATELY (Fail Fast)
    app.options.credential?.getAccessToken()
      .then((token) => {
        if (token) console.log("✅ [FIREBASE AUTH TEST] Success! Access Token generated.");
      })
      .catch((err) => {
        console.error("❌ [FIREBASE AUTH TEST] FAILED. The Private Key is likely invalid.");
        console.error(err);
      });

  } catch (err) {
    console.error("❌ [FIREBASE] Initialization Failed:", err);
  }
}

export const db = admin.firestore();
export const messaging = admin.messaging();
export default admin;