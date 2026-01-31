import type { Express } from "express";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";
import { validateCsrfToken } from "../middleware/csrf";

/**
 * Push Notification Registration Routes
 * Handles web push subscriptions and native device token registration
 */
export function registerPushRoutes(app: Express): void {
  // Apply CSRF validation to all push routes except GET requests
  app.use("/api/push", validateCsrfToken);
  
  /**
   * GET /api/push/vapid-public-key
   * Returns VAPID public key for web push subscription
   */
  app.get("/api/push/vapid-public-key", async (req, res) => {
    try {
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      
      if (!publicKey) {
        console.error("[push] VAPID_PUBLIC_KEY not configured");
        return res.status(500).json({ error: "VAPID not configured" });
      }

      res.json({ publicKey });
    } catch (error) {
      console.error("[push] Error getting VAPID key:", error);
      res.status(500).json({ error: "خطأ في الحصول على مفتاح VAPID" });
    }
  });

  /**
   * POST /api/push/subscribe
   * Register web push subscription (for PWA/web browsers)
   */
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { endpoint, keys } = req.body;
      
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Missing subscription data" });
      }

      await storage.createPushSubscription(
        userId,
        endpoint,
        keys.p256dh,
        keys.auth,
        'web',
        null, // no FCM token for web
        null, // no deviceId for web
        null  // no deviceName for web
      );

      console.log(`[push] Web push subscription registered for user ${userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("[push] Subscribe error:", error);
      res.status(500).json({ error: "فشل في تسجيل الاشتراك" });
    }
  });

  /**
   * POST /api/push/register-native
   * Register native device token (iOS/Android via FCM)
   */
  app.post("/api/push/register-native", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { token, platform, deviceId, deviceName } = req.body;
      
      if (!token || !platform) {
        return res.status(400).json({ error: "Missing token or platform" });
      }

      if (platform !== 'ios' && platform !== 'android') {
        return res.status(400).json({ error: "Invalid platform. Must be 'ios' or 'android'" });
      }

      await storage.createPushSubscription(
        userId,
        null, // no endpoint for native
        null, // no p256dh for native
        null, // no auth for native
        platform,
        token, // FCM token
        deviceId || null,
        deviceName || null
      );

      console.log(`[push] Native ${platform} token registered for user ${userId} (device: ${deviceName || 'unknown'})`);
      res.json({ success: true });
    } catch (error) {
      console.error("[push] Register native error:", error);
      res.status(500).json({ error: "فشل في تسجيل الجهاز" });
    }
  });

  /**
   * POST /api/push/unregister
   * Remove push subscription or device token
   */
  app.post("/api/push/unregister", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { token, endpoint } = req.body;
      
      if (!token && !endpoint) {
        return res.status(400).json({ error: "Missing token or endpoint" });
      }

      let deleted = false;
      
      if (token) {
        deleted = await storage.deletePushSubscriptionByToken(token);
        console.log(`[push] Deleted subscription by token for user ${userId}`);
      } else if (endpoint) {
        deleted = await storage.deletePushSubscription(endpoint);
        console.log(`[push] Deleted subscription by endpoint for user ${userId}`);
      }

      res.json({ success: deleted });
    } catch (error) {
      console.error("[push] Unregister error:", error);
      res.status(500).json({ error: "فشل في إلغاء التسجيل" });
    }
  });

  /**
   * GET /api/push/subscriptions (for debugging/admin)
   * Get all push subscriptions for current user
   */
  app.get("/api/push/subscriptions", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
      
      // Return sanitized data (hide sensitive keys)
      const sanitized = subscriptions.map(sub => ({
        id: sub.id,
        platform: sub.platform,
        deviceName: sub.deviceName,
        createdAt: sub.createdAt,
        lastUsed: sub.lastUsed,
      }));

      res.json(sanitized);
    } catch (error) {
      console.error("[push] Get subscriptions error:", error);
      res.status(500).json({ error: "خطأ في جلب الاشتراكات" });
    }
  });
}
