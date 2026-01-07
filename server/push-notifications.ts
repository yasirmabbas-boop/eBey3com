import webpush from 'web-push';
import { storage } from './storage';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@ebay-iraq.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  id?: string;
}

export async function sendPushNotification(userId: string, payload: PushPayload): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log('[push] VAPID keys not configured, skipping push notification');
    return false;
  }

  try {
    const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[push] No push subscriptions found for user ${userId}`);
      return false;
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify(payload)
          );
          return true;
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await storage.deletePushSubscription(sub.endpoint);
            console.log(`[push] Removed expired subscription for user ${userId}`);
          }
          throw error;
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[push] Sent ${successCount}/${subscriptions.length} notifications to user ${userId}`);
    return successCount > 0;
  } catch (error) {
    console.error('[push] Error sending push notification:', error);
    return false;
  }
}

export async function sendPushToMultipleUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.allSettled(
    userIds.map(userId => sendPushNotification(userId, payload))
  );
}
