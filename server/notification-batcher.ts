/**
 * Notification Batcher
 * Combines multiple similar notifications into one to prevent spam
 */

import { storage } from './storage';
import { sendPushNotification } from './push-notifications';
import { sendToUser } from './websocket';

interface PendingNotification {
  userId: string;
  type: string;
  data: any;
  timestamp: Date;
}

interface BatchConfig {
  windowMs: number;  // How long to wait before sending batch
  maxSize: number;   // Max notifications in a batch
}

// Batching configuration per notification type
const BATCH_CONFIG: Record<string, BatchConfig> = {
  outbid: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxSize: 3,               // Max 3 outbid notifications before sending
  },
  new_message: {
    windowMs: 5 * 60 * 1000,  // 5 minutes
    maxSize: 5,               // Max 5 messages before sending
  },
  auction_ending_soon: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxSize: 10,              // Max 10 auction reminders before sending
  },
};

// Pending batches: key = "userId:type"
const pendingBatches = new Map<string, {
  notifications: PendingNotification[];
  timeoutId: NodeJS.Timeout;
}>();

/**
 * Check if notification type should be batched
 */
export function shouldBatchNotification(type: string): boolean {
  return type in BATCH_CONFIG;
}

/**
 * Add notification to batch or send immediately if batch is full
 */
export async function batchNotification(
  userId: string,
  type: string,
  data: any
): Promise<void> {
  const config = BATCH_CONFIG[type];
  if (!config) {
    console.warn(`[batch] No batch config for type ${type}, sending immediately`);
    return;
  }

  const key = `${userId}:${type}`;
  const notification: PendingNotification = {
    userId,
    type,
    data,
    timestamp: new Date(),
  };

  // Get or create batch
  let batch = pendingBatches.get(key);
  
  if (!batch) {
    // Create new batch with timeout
    const timeoutId = setTimeout(async () => {
      await flushBatch(key);
    }, config.windowMs);

    batch = {
      notifications: [],
      timeoutId,
    };
    pendingBatches.set(key, batch);
    console.log(`[batch] Created new batch for ${key} (window: ${config.windowMs}ms)`);
  }

  // Add notification to batch
  batch.notifications.push(notification);
  console.log(`[batch] Added to batch ${key} (${batch.notifications.length}/${config.maxSize})`);

  // If batch is full, send immediately
  if (batch.notifications.length >= config.maxSize) {
    clearTimeout(batch.timeoutId);
    await flushBatch(key);
  }
}

/**
 * Send batched notifications
 */
async function flushBatch(key: string): Promise<void> {
  const batch = pendingBatches.get(key);
  if (!batch || batch.notifications.length === 0) {
    pendingBatches.delete(key);
    return;
  }

  const [userId, type] = key.split(':');
  const count = batch.notifications.length;
  
  console.log(`[batch] Flushing batch ${key} with ${count} notifications`);

  try {
    // Create batched notification message
    const batchedMessage = createBatchedMessage(type, batch.notifications, count);
    
    // Create notification in database
    const notification = await storage.createNotification({
      userId,
      type: `${type}_batched`,
      title: batchedMessage.title,
      message: batchedMessage.body,
      linkUrl: batchedMessage.linkUrl,
      relatedId: batchedMessage.relatedId,
    });

    // Send via WebSocket (real-time)
    sendToUser(userId, "NOTIFICATION", {
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        linkUrl: notification.linkUrl,
      },
    });

    // Send push notification
    await sendPushNotification(userId, {
      title: batchedMessage.title,
      body: batchedMessage.body,
      url: batchedMessage.linkUrl,
      tag: `batch-${type}`,
      id: notification.id,
    });

    console.log(`[batch] Sent batched notification to user ${userId} (${count} items)`);
  } catch (error) {
    console.error(`[batch] Error flushing batch ${key}:`, error);
  } finally {
    // Remove batch from pending
    pendingBatches.delete(key);
  }
}

/**
 * Create batched notification message based on type and count
 */
function createBatchedMessage(
  type: string,
  notifications: PendingNotification[],
  count: number
): { title: string; body: string; linkUrl: string; relatedId?: string } {
  // For now, use Arabic (will add language support in Phase 2)
  
  if (type === 'outbid') {
    const firstNotif = notifications[0].data;
    return {
      title: `${count} مزايدات جديدة`,
      body: `تمت ${count} مزايدات أعلى منك على منتجاتك`,
      linkUrl: `/my-bids`,
    };
  }
  
  if (type === 'new_message') {
    const senderName = notifications[0].data.senderName;
    const isSameSender = notifications.every(n => n.data.senderName === senderName);
    
    if (isSameSender) {
      return {
        title: `${count} رسائل جديدة`,
        body: `${senderName} أرسل ${count} رسائل جديدة`,
        linkUrl: `/messages/${notifications[0].data.senderId}`,
        relatedId: notifications[0].data.senderId,
      };
    } else {
      return {
        title: `${count} رسائل جديدة`,
        body: `لديك ${count} رسائل جديدة من عدة أشخاص`,
        linkUrl: `/messages`,
      };
    }
  }
  
  if (type === 'auction_ending_soon') {
    return {
      title: `${count} مزادات تنتهي قريباً`,
      body: `لديك ${count} مزادات تنتهي خلال الساعات القادمة`,
      linkUrl: `/my-bids`,
    };
  }
  
  // Default batched message
  return {
    title: `${count} إشعارات جديدة`,
    body: `لديك ${count} إشعارات جديدة`,
    linkUrl: `/notifications`,
  };
}

/**
 * Flush all pending batches (useful for testing or graceful shutdown)
 */
export async function flushAllBatches(): Promise<void> {
  const keys = Array.from(pendingBatches.keys());
  console.log(`[batch] Flushing all ${keys.length} pending batches`);
  
  for (const key of keys) {
    await flushBatch(key);
  }
}

/**
 * Get current batch status (for debugging)
 */
export function getBatchStatus(): Record<string, number> {
  const status: Record<string, number> = {};
  
  for (const [key, batch] of Array.from(pendingBatches.entries())) {
    status[key] = batch.notifications.length;
  }
  
  return status;
}
