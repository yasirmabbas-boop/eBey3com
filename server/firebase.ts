import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const keyPath = path.resolve(process.cwd(), 'server/service-account.json');

if (!admin.apps.length) {
  try {
    let serviceAccount: any = null;

    // Priority 1: Environment variable (Cloud Run secret)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.log("🚀 [FIREBASE] Initialized using environment variable.");
    }
    // Priority 2: Local JSON file (development)
    else if (fs.existsSync(keyPath)) {
      const fileContent = fs.readFileSync(keyPath, 'utf8');
      serviceAccount = JSON.parse(fileContent);
      console.log("🚀 [FIREBASE] Initialized using JSON file.");
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp();
      console.log("🚀 [FIREBASE] Initialized using Application Default Credentials.");
    }
  } catch (err) {
    console.error("❌ [FIREBASE] Initialization Failed:", err);
    process.exit(1);
  }
}

export const db = admin.firestore();
export const messaging = admin.messaging();
export default admin;
