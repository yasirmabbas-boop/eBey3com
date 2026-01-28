import type { Express } from "express";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";
import { sendToUser } from "../websocket";

export function registerMessageRoutes(app: Express): void {
  // Get all messages for the authenticated user
  app.get("/api/messages", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const messages = await storage.getMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "خطأ في جلب الرسائل" });
    }
  });

  // Get all messages for a specific user (legacy route for compatibility)
  app.get("/api/messages/:userId", async (req, res) => {
    try {
      const authUserId = await getUserIdFromRequest(req);
      if (!authUserId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      // Only allow fetching own messages
      if (authUserId !== req.params.userId) {
        return res.status(403).json({ error: "غير مصرح لك بالوصول لهذه الرسائل" });
      }

      const messages = await storage.getMessages(req.params.userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "خطأ في جلب الرسائل" });
    }
  });

  // Get conversation between two users
  app.get("/api/messages/:userId/:partnerId", async (req, res) => {
    try {
      const authUserId = await getUserIdFromRequest(req);
      if (!authUserId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { userId, partnerId } = req.params;

      // Only allow fetching own conversations
      if (authUserId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بالوصول لهذه المحادثة" });
      }

      const messages = await storage.getConversation(userId, partnerId);
      
      // Mark messages from partner as read
      for (const msg of messages) {
        if (msg.receiverId === authUserId && !msg.isRead) {
          await storage.markMessageAsRead(msg.id);
        }
      }

      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "خطأ في جلب المحادثة" });
    }
  });

  // Send a new message
  app.post("/api/messages", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { senderId, receiverId, listingId, content } = req.body;

      // Validate sender is the authenticated user
      if (userId !== senderId) {
        return res.status(403).json({ error: "غير مصرح لك بإرسال رسائل نيابة عن شخص آخر" });
      }

      if (!receiverId || !content) {
        return res.status(400).json({ error: "بيانات الرسالة غير مكتملة" });
      }

      // Create the message
      const message = await storage.sendMessage({
        senderId,
        receiverId,
        listingId: listingId || null,
        content,
      });

      // Get sender info for notification
      const sender = await storage.getUser(senderId);
      const senderName = sender?.displayName || sender?.username || "مستخدم";

      // Create notification for receiver
      const notification = await storage.createNotification({
        userId: receiverId,
        type: "new_message",
        title: "رسالة جديدة 💬",
        message: `${senderName}: ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`,
        relatedId: message.id,
        linkUrl: `/messages/${senderId}`,
      });

      // Send real-time notification to receiver
      sendToUser(receiverId, "NOTIFICATION", {
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          linkUrl: notification.linkUrl,
        },
      });

      // Also send the new message in real-time
      sendToUser(receiverId, "NEW_MESSAGE", {
        message: {
          ...message,
          senderName,
        },
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "خطأ في إرسال الرسالة" });
    }
  });
}
