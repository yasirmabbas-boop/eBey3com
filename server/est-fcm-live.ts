// server/test-fcm-live.ts
import { storage } from './storage';
import { sendFCMNotification } from './fcm';

async function runTest() {
  console.log("\n🧪 --- STARTING FCM CONNECTION TEST ---");

  try {
    // 1. Get recent users to find one with a phone
    console.log("🔍 Scanning for users with mobile devices...");
    const users = await storage.getAllUsers();

    let targetFound = false;

    for (const user of users) {
      // Get subscriptions for this user
      const subs = await storage.getPushSubscriptionsByUserId(user.id);

      // Look for a mobile token (iOS or Android)
      const mobileSub = subs.find(s => s.platform === 'ios' || s.platform === 'android');

      if (mobileSub) {
        targetFound = true;
        console.log(`\n🎯 TARGET FOUND: User [${user.displayName || 'Unknown'}]`);
        console.log(`📱 Platform: ${mobileSub.platform}`);
        console.log(`🔑 Token: ${mobileSub.fcmToken.substring(0, 15)}...`);

        console.log("\n🚀 Sending Test Notification...");

        await sendFCMNotification(mobileSub.fcmToken, {
            title: "Replit Test Success! 🚀",
            body: "Your Firebase credentials are fully fixed and working.",
            data: { test: "true" }
        });

        console.log("\n✅✅ SUCCESS: Notification sent without error!");
        console.log("Check your physical device now.");
        break; 
      }
    }

    if (!targetFound) {
      console.log("\n⚠️ RESULT: No users with mobile subscriptions found in DB.");
      console.log("Action: Open your App, log in, and allow notifications to register a token.");
    }

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
  }

  console.log("\n--- END TEST ---\n");
  process.exit(0);
}

runTest();