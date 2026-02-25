import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { isNative } from './capacitor';

/**
 * Initialize native push notifications (iOS/Android)
 */
export const initNativePushNotifications = async (
  onToken: (token: string) => void | Promise<void>,
  onNotificationReceived?: (notification: PushNotificationSchema) => void,
  onNotificationTapped?: (notification: ActionPerformed) => void
): Promise<boolean> => {
  console.log('[Push] initNativePushNotifications called, isNative:', isNative);
  if (!isNative) {
    console.log('[Push] Not a native platform, skipping native push setup');
    return false;
  }

  try {
    // Check current permission status
    console.log('[Push] Checking permissions...');
    let permStatus = await PushNotifications.checkPermissions();
    console.log('[Push] Current permission status:', permStatus);

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      // Request permissions
      console.log('[Push] Requesting permissions...');
      permStatus = await PushNotifications.requestPermissions();
      console.log('[Push] Permission request result:', permStatus);
    }

    if (permStatus.receive !== 'granted') {
      console.log('[Push] Push notification permission not granted:', permStatus.receive);
      return false;
    }

    // Remove any existing listeners to prevent duplicates on re-registration
    await PushNotifications.removeAllListeners();
    console.log('[Push] Cleared existing listeners');

    // Use a promise to wait for the token instead of fire-and-forget callback
    const tokenPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('FCM token registration timed out after 15 seconds'));
      }, 15000);

      PushNotifications.addListener('registration', (token: Token) => {
        clearTimeout(timeout);
        console.log('[Push] Registration listener fired! Token received:', token.value);
        console.log('[Push] Token length:', token.value?.length || 0);
        resolve(token.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        clearTimeout(timeout);
        console.error('[Push] Registration error listener fired! Error:', error);
        reject(new Error(`FCM registration failed: ${JSON.stringify(error)}`));
      });
    });

    // Listen for push notifications received while app is in foreground
    if (onNotificationReceived) {
      console.log('[Push] Setting up pushNotificationReceived listener');
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('[Push] Push notification received:', notification);
          onNotificationReceived(notification);
        }
      );
    }

    // Listen for push notifications tapped
    if (onNotificationTapped) {
      console.log('[Push] Setting up pushNotificationActionPerformed listener');
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: ActionPerformed) => {
          console.log('[Push] Push notification action performed:', notification);
          onNotificationTapped(notification);
        }
      );
    }

    console.log('[Push] All listeners set up, now calling register()...');

    // Register with Apple / Google to receive push via APNS/FCM
    await PushNotifications.register();
    console.log('[Push] PushNotifications.register() called, waiting for token...');

    // Wait for the token to actually arrive before returning
    const token = await tokenPromise;
    console.log('[Push] Token obtained, calling onToken callback...');

    // Call onToken and wait for it (it sends the token to the backend)
    await onToken(token);
    console.log('[Push] onToken callback completed successfully');

    return true;
  } catch (error) {
    console.error('[Push] Error initializing native push notifications:', error);
    console.error('[Push] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
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
