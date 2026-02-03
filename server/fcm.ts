  // server/fcm.ts
  import admin from './firebase'; 

  export function isFCMReady() {
    return true;
  }

  export async function sendFCMNotification(token: string, payload: any) {
    try {
      console.log(`[FCM] Sending to token: ${token.substring(0, 10)}...`);

      const response = await admin.messaging().send({
        token: token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: payload.badge,
            },
          },
        },
      });

      console.log('[FCM] Successfully sent message:', response);
      return true;
    } catch (error) {
      console.error('[FCM] Error sending message:', error);
      throw error;
    }
  }