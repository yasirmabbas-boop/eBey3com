import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated, isAuthenticatedUnified } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {
  // Primary auth endpoint - checks Bearer token first, then session
  app.get("/api/auth/me", async (req: any, res) => {
    try {
      // Check for Bearer token in Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        console.log("[api/auth/me] Checking Bearer token:", token.substring(0, 8) + "...");
        
        // Look up user by authToken in database
        const user = await authStorage.getUserByAuthToken(token);
        if (user) {
          console.log("[api/auth/me] Found user by token:", user.id);
          return res.json(user);
        }
        console.log("[api/auth/me] No user found for token");
      }
      
      // Fall back to session-based auth
      if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        const userId = req.user.claims?.sub || (req.session as any)?.userId;
        if (userId) {
          const user = await authStorage.getUser(userId);
          if (user) {
            console.log("[api/auth/me] Found user by session:", user.id);
            return res.json(user);
          }
        }
      }
      
      // Check session userId directly (set by Facebook auth)
      const sessionUserId = (req.session as any)?.userId;
      if (sessionUserId) {
        const user = await authStorage.getUser(sessionUserId);
        if (user) {
          console.log("[api/auth/me] Found user by session userId:", user.id);
          return res.json(user);
        }
      }
      
      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("[api/auth/me] Error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Legacy endpoint - uses unified auth middleware
  app.get("/api/auth/user", isAuthenticatedUnified, async (req: any, res) => {
    try {
      // req.user is now set by the middleware (either from session or token)
      const user = req.user;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
