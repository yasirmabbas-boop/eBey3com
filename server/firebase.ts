import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// 1. READ THE FILE DIRECTLY
// We now know this file exists and works perfectly.
const keyPath = path.resolve(process.cwd(), 'server/service-account.json');

if (!admin.apps.length) {
  try {
    if (fs.existsSync(keyPath)) {
      const fileContent = fs.readFileSync(keyPath, 'utf8');
      const serviceAccount = JSON.parse(fileContent);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("🚀 [FIREBASE] Initialized successfully using JSON file.");
    } else {
      console.error("❌ [FIREBASE] Critical: service-account.json not found.");
    }
  } catch (err) {
    console.error("❌ [FIREBASE] Initialization Failed:", err);
  }
}

export const db = admin.firestore();
export const messaging = admin.messaging();
export default admin;