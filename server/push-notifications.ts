import webpush from 'web-push';
import { storage } from './storage';
import { sendFCMNotification, isFCMReady } from './fcm';

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
  badge?: number;
}

export async function sendPushNotification(userId: string, payload: PushPayload): Promise<boolean> {
  try {
    const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[push] No push subscriptions found for user ${userId}`);
      return false;
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          if (sub.platform === 'web') {
            // Web push using VAPID
            if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
              console.log('[push] VAPID keys not configured, skipping web push');
              return false;
            }

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
            console.log(`[push] Web push sent to user ${userId}`);
          } else {
            // Native push (iOS/Android) using FCM
            await sendFCMNotification(sub.fcmToken, {
              title: payload.title,
              body: payload.body,
              url: payload.url,
              tag: payload.tag,
              data: payload.id ? { id: payload.id } : undefined,
              badge: payload.badge,
            });
            console.log(`[push] FCM push sent to user ${userId} (${sub.platform})`);
          }
          
          // Update last used timestamp
          await storage.updatePushSubscription(sub.id, { lastUsed: new Date() });
          return true;
        } catch (error: any) {
          // Handle token cleanup for invalid/expired tokens
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Web push subscription expired
            await storage.deletePushSubscription(sub.endpoint);
            console.log(`[push] Removed expired web push subscription for user ${userId}`);
          } else if (error.code === 'messaging/invalid-registration-token' ||
                     error.code === 'messaging/registration-token-not-registered') {
            // FCM token invalid
            await storage.deletePushSubscriptionByToken(sub.fcmToken);
            console.log(`[push] Removed invalid FCM token for user ${userId}`);
          } else if (error.code === 'messaging/message-rate-exceeded') {
            // Rate limited by FCM - log but don't delete token
            console.warn(`[push] FCM rate limit exceeded for user ${userId}`);
          } else {
            // Unknown error - log but keep token (might be temporary)
            console.error(`[push] Error sending to user ${userId}:`, error.message || error);
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
