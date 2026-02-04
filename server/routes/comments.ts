import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { validateCsrfToken } from "../middleware/csrf";
import { getUserIdFromRequest } from "./shared";

const createCommentBodySchema = z.object({
  listingId: z.string().min(1),
  content: z.string().trim().min(1).max(2000),
  parentId: z.string().min(1).optional(),
});

export function registerCommentRoutes(app: Express): void {
  // Apply CSRF validation to all comment routes except GET requests
  app.use("/api/comments", validateCsrfToken);

  // Get comments for a listing (public)
  app.get("/api/comments/:listingId", async (req, res) => {
    try {
      const listingId = String(req.params.listingId || "").trim();
      if (!listingId) {
        return res.status(400).json({ error: "Listing ID is required" });
      }

      const comments = await storage.getCommentsForListing(listingId);
      return res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      return res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Create a comment (authenticated)
  app.post("/api/comments", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parsed = createCommentBodySchema.parse({
        listingId: req.body?.listingId,
        content: req.body?.content,
        parentId: req.body?.parentId,
      });

      const listing = await storage.getListing(parsed.listingId);
      if (!listing || (listing as any).isDeleted) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const created = await storage.createComment({
        listingId: parsed.listingId,
        userId,
        content: parsed.content,
        parentId: parsed.parentId || null,
      });

      return res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid comment", details: error.errors });
      }
      console.error("Error creating comment:", error);
      return res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Delete own comment (authenticated)
  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const id = String(req.params.id || "").trim();
      if (!id) {
        return res.status(400).json({ error: "Comment ID is required" });
      }

      const ok = await storage.deleteComment(id, userId);
      if (!ok) {
        // Either not found, or user doesn't own it. Don't leak which.
        return res.status(404).json({ error: "Comment not found" });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      return res.status(500).json({ error: "Failed to delete comment" });
    }
  });
}

