/**
 * Firebase Cloud Messaging Integration
 * Handles push notifications for iOS and Android via FCM
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Support two methods:
// 1. FIREBASE_SERVICE_ACCOUNT_BASE64 - Base64 encoded JSON (recommended, avoids newline issues)
// 2. FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY - Separate values (legacy)

let serviceAccount: admin.ServiceAccount | null = null;

// Method 1: Base64 encoded service account JSON (preferred)
console.log('[FCM Init] FIREBASE_SERVICE_ACCOUNT_BASE64 exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
console.log('[FCM Init] FIREBASE_SERVICE_ACCOUNT_BASE64 length:', (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').length);

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  try {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    serviceAccount = {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
    console.log('📦 Firebase credentials loaded from base64 encoded JSON');
    console.log('[FCM Init] Project ID:', parsed.project_id);
    console.log('[FCM Init] Client Email:', parsed.client_email);
    console.log('[FCM Init] Private key length:', (parsed.private_key || '').length);
  } catch (error) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', error);
  }
}

// Method 2: Separate environment variables (fallback)
if (!serviceAccount && process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY) {
  serviceAccount = {
    projectId: process.env.FCM_PROJECT_ID,
    clientEmail: process.env.FCM_CLIENT_EMAIL,
    privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
  console.log('🔑 Firebase credentials loaded from separate env vars');
}

let isInitialized = false;

if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    isInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
  }
} else {
  console.warn('⚠️ FCM credentials not configured - native push notifications will not work');
  console.warn('   Option 1: Set FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 encoded JSON)');
  console.warn('   Option 2: Set FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY');
}

export interface FCMPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, string>;
  badge?: number;
}

/**
 * Send push notification via Firebase Cloud Messaging
 * Works for both iOS and Android
 */
export async function sendFCMNotification(
  token: string,
  payload: FCMPayload
): Promise<void> {
  console.log('[FCM Send] isInitialized:', isInitialized);
  console.log('[FCM Send] serviceAccount exists:', !!serviceAccount);
  if (serviceAccount) {
    console.log('[FCM Send] projectId:', serviceAccount.projectId);
  }
  
  if (!isInitialized) {
    throw new Error('Firebase Admin SDK not initialized - check FCM credentials');
  }

  const message: admin.messaging.Message = {
    token,
    // Include both notification and data for better compatibility
    // notification: shows when app is in background/closed
    // data: ensures app can process when closed
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      notificationId: payload.data?.id || '',
      tag: payload.tag || '',
      ...(payload.data || {}),
    },
    // Android-specific configuration
    android: {
      priority: 'high',
      notification: {
        tag: payload.tag,
        sound: 'default',
        channelId: 'default',
        priority: 'high' as const,
        defaultSound: true,
        defaultVibrateTimings: true,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Ensures notification is clickable
      },
    },
    // iOS-specific configuration (APNS)
    apns: {
      headers: {
        'apns-priority': '10', // High priority
        'apns-push-type': 'alert', // Required for iOS 13+
      },
      payload: {
        aps: {
          alert: {
            title: payload.title,
            body: payload.body,
          },
          sound: 'default',
          badge: payload.badge || 1,
          'thread-id': payload.tag, // Groups notifications by tag
          'content-available': 1, // Wake app in background
        },
        // Custom data - ensure all data is in payload for background handling
        url: payload.url || '/',
        notificationId: payload.data?.id || '',
        tag: payload.tag || '',
        ...(payload.data || {}),
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`[FCM] Notification sent successfully: ${response}`);
  } catch (error: any) {
    console.error(`[FCM] Failed to send notification:`, error);
    
    // Re-throw with error code for caller to handle
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      const err = new Error('Invalid FCM token');
      (err as any).code = error.code;
      throw err;
    }
    
    throw error;
  }
}

/**
 * Send notifications to multiple devices
 */
export async function sendFCMMulticast(
  tokens: string[],
  payload: FCMPayload
): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
  if (!isInitialized) {
    throw new Error('Firebase Admin SDK not initialized');
  }

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, failedTokens: [] };
  }

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      notificationId: payload.data?.id || '',
      tag: payload.tag || '',
      ...(payload.data || {}),
    },
    android: {
      priority: 'high',
      notification: {
        tag: payload.tag,
        sound: 'default',
        channelId: 'default',
        priority: 'high' as const,
        defaultSound: true,
        defaultVibrateTimings: true,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
      },
      payload: {
        aps: {
          alert: {
            title: payload.title,
            body: payload.body,
          },
          sound: 'default',
          badge: payload.badge || 1,
          'thread-id': payload.tag,
          'content-available': 1,
        },
        url: payload.url || '/',
        notificationId: payload.data?.id || '',
        tag: payload.tag || '',
        ...(payload.data || {}),
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    
    const failedTokens: string[] = [];
    response.responses.forEach((resp: any, idx: number) => {
      if (!resp.success) {
        failedTokens.push(tokens[idx]);
      }
    });

    console.log(`[FCM] Multicast sent: ${response.successCount} success, ${response.failureCount} failed`);
    
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error) {
    console.error('[FCM] Multicast send failed:', error);
    throw error;
  }
}

/**
 * Check if Firebase is initialized and ready
 */
export function isFCMReady(): boolean {
  return isInitialized;
}
