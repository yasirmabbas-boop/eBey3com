import type { Express } from "express";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";
import { validateCsrfToken } from "../middleware/csrf";

export function registerNotificationRoutes(app: Express): void {
  // Apply CSRF validation to all notification routes except GET requests
  app.use("/api/notifications", validateCsrfToken);
  
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const { notifications, total } = await storage.getNotifications(userId, page, limit);
      res.json({ notifications, total, page, limit });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "خطأ في جلب الإشعارات" });
    }
  });

  app.get("/api/notifications/count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ count: 0 });
      }

      const { notifications } = await storage.getNotifications(userId, 1, 1000);
      const unreadCount = notifications.filter(n => !n.isRead).length;
      res.json({ count: unreadCount });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.json({ count: 0 });
    }
  });

  app.post("/api/notifications/:notificationId/read", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { notificationId } = req.params;
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "خطأ في تحديث الإشعار" });
    }
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "خطأ في تحديث الإشعارات" });
    }
  });
}
