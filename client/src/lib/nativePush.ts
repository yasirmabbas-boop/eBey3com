import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { isNative } from './capacitor';

/**
 * Initialize native push notifications (iOS/Android)
 */
export const initNativePushNotifications = async (
  onToken: (token: string) => void,
  onNotificationReceived?: (notification: PushNotificationSchema) => void,
  onNotificationTapped?: (notification: ActionPerformed) => void
): Promise<boolean> => {
  if (!isNative) {
    console.log('Not a native platform, skipping native push setup');
    return false;
  }

  try {
    // Check current permission status
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      // Request permissions
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('Push notification permission not granted');
      return false;
    }

    // Register with Apple / Google to receive push via APNS/FCM
    await PushNotifications.register();

    // Listen for registration token
    await PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      onToken(token.value);
    });

    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
    });

    // Listen for push notifications received while app is in foreground
    if (onNotificationReceived) {
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('Push notification received:', notification);
          onNotificationReceived(notification);
        }
      );
    }

    // Listen for push notifications tapped
    if (onNotificationTapped) {
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: ActionPerformed) => {
          console.log('Push notification action performed:', notification);
          onNotificationTapped(notification);
        }
      );
    }

    return true;
  } catch (error) {
    console.error('Error initializing native push notifications:', error);
    return false;
  }
};

/**
 * Check if push notifications are supported and enabled
 */
export const checkNativePushPermission = async (): Promise<'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'> => {
  if (!isNative) return 'denied';

  try {
    const permStatus = await PushNotifications.checkPermissions();
    return permStatus.receive;
  } catch {
    return 'denied';
  }
};

/**
 * Request push notification permissions
 */
export const requestNativePushPermission = async (): Promise<boolean> => {
  if (!isNative) return false;

  try {
    const permStatus = await PushNotifications.requestPermissions();
    return permStatus.receive === 'granted';
  } catch {
    return false;
  }
};

/**
 * Get delivery status of notifications
 */
export const getDeliveredNotifications = async () => {
  if (!isNative) return [];

  try {
    const notificationList = await PushNotifications.getDeliveredNotifications();
    return notificationList.notifications;
  } catch {
    return [];
  }
};

/**
 * Remove delivered notifications
 */
export const removeDeliveredNotifications = async (notificationIds: string[]) => {
  if (!isNative) return;

  try {
    const notifications = notificationIds.map(id => ({ id, tag: '', title: '', body: '', data: {} }));
    await PushNotifications.removeDeliveredNotifications({ notifications });
  } catch (error) {
    console.error('Error removing notifications:', error);
  }
};

/**
 * Remove all delivered notifications
 */
export const removeAllDeliveredNotifications = async () => {
  if (!isNative) return;

  try {
    await PushNotifications.removeAllDeliveredNotifications();
  } catch (error) {
    console.error('Error removing all notifications:', error);
  }
};
