// server/test-fcm-live.ts
import { storage } from './storage';
import { sendFCMNotification } from './fcm';

async function runTest() {
  console.log("\n🧪 --- STARTING FCM CONNECTION TEST ---");

  try {
    console.log("🔍 Scanning for users with mobile devices...");
    const users = await storage.getAllUsers();

    let targetFound = false;

    for (const user of users) {
      const subs = await storage.getPushSubscriptionsByUserId(user.id);
      const mobileSub = subs.find(s => s.platform === 'ios' || s.platform === 'android');

      if (mobileSub) {
        targetFound = true;
        console.log(`\n🎯 TARGET FOUND: User [${user.displayName || 'Unknown'}]`);
        console.log(`📱 Platform: ${mobileSub.platform}`);

        console.log("\n🚀 Sending Test Notification...");
        await sendFCMNotification(mobileSub.fcmToken, {
            title: "Replit Test Success! 🚀",
            body: "Your Firebase credentials are fully fixed and working.",
            data: { test: "true" }
        });

        console.log("\n✅✅ SUCCESS: Notification sent without error!");
        break; 
      }
    }

    if (!targetFound) {
      console.log("\n⚠️ RESULT: No users with mobile subscriptions found in DB.");
    }

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
  }
  process.exit(0);
}

runTest();