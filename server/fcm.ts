  // server/fcm.ts
  import admin from './firebase'; 

  export function isFCMReady() {
    return true;
  }

  export async function sendFCMNotification(token: string, payload: any) {
    try {
      // Send FCM push notification

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
            icon: 'ic_notification',
            color: '#E85D26',
            channelId: 'ebey3_default',
            tag: `ebey3_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: payload.badge,
              'thread-id': payload.data?.type || 'general',
            },
          },
        },
      });

      // Message sent successfully
      return true;
    } catch (error) {
      console.error('[FCM] Error sending message:', error);
      throw error;
    }
  }