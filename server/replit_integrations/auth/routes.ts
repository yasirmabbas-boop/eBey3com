import type { Express } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authStorage } from "./storage";
import { isAuthenticated, isAuthenticatedUnified } from "./replitAuth";
import { storage } from "../../storage";

// In-memory store for pending 2FA tokens (maps pendingToken -> userId)
const pending2FATokens = new Map<string, string>();

export function registerAuthRoutes(app: Express): void {
  // Login with phone and password
  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { phone, password } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });
      }
      
      // Look up user by phone
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }
      
      // Check if user has a password set
      if (!user.password) {
        return res.status(401).json({ error: "هذا الحساب لا يملك كلمة مرور. يرجى استخدام طريقة أخرى لتسجيل الدخول." });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }
      
      // Check if user is banned
      if (user.isBanned) {
        return res.status(403).json({ error: "تم حظر هذا الحساب", banReason: user.banReason });
      }
      
      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Generate pending token for 2FA verification (stored in module-level map)
        const pendingToken = crypto.randomBytes(32).toString("hex");
        pending2FATokens.set(pendingToken, user.id);
        // Auto-expire after 5 minutes
        setTimeout(() => pending2FATokens.delete(pendingToken), 5 * 60 * 1000);
        return res.json({ requires2FA: true, pendingToken });
      }
      
      // Generate auth token
      const authToken = crypto.randomBytes(32).toString("hex");
      await storage.updateUser(user.id, { 
        authToken,
        lastLoginAt: new Date()
      } as any);
      
      // Set session
      (req.session as any).userId = user.id;
      
      console.log("[api/auth/login] User logged in:", user.id);
      
      return res.json({
        id: user.id,
        displayName: user.displayName,
        phone: user.phone,
        avatar: user.avatar,
        authToken,
      });
    } catch (error) {
      console.error("[api/auth/login] Error:", error);
      res.status(500).json({ error: "فشل تسجيل الدخول" });
    }
  });

  // 2FA verification
  app.post("/api/auth/2fa/verify", async (req: any, res) => {
    try {
      const { pendingToken, code } = req.body;
      
      if (!pendingToken || !code) {
        return res.status(400).json({ error: "الرمز مطلوب" });
      }
      
      // Find user by pending token from in-memory store
      const userId = pending2FATokens.get(pendingToken);
      if (!userId) {
        return res.status(401).json({ error: "جلسة غير صالحة" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "المستخدم غير موجود" });
      }
      
      // Verify TOTP code
      const { authenticator } = await import("otplib");
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret || "" });
      
      if (!isValid) {
        return res.status(401).json({ error: "رمز التحقق غير صحيح" });
      }
      
      // Clear pending token and generate auth token
      pending2FATokens.delete(pendingToken);
      const authToken = crypto.randomBytes(32).toString("hex");
      await storage.updateUser(user.id, { 
        authToken,
        lastLoginAt: new Date()
      } as any);
      
      // Set session
      (req.session as any).userId = user.id;
      
      return res.json({
        id: user.id,
        displayName: user.displayName,
        phone: user.phone,
        avatar: user.avatar,
        authToken,
      });
    } catch (error) {
      console.error("[api/auth/2fa/verify] Error:", error);
      res.status(500).json({ error: "فشل التحقق" });
    }
  });

  // Logout
  app.post("/api/auth/logout", async (req: any, res) => {
    try {
      // Get user ID from session or token
      const userId = (req.session as any)?.userId;
      
      if (userId) {
        // Clear auth token in database
        await storage.updateUser(userId, { authToken: null } as any);
      }
      
      // Destroy session
      req.session.destroy((err: any) => {
        if (err) {
          console.error("[api/auth/logout] Session destroy error:", err);
        }
      });
      
      // Clear cookies
      res.clearCookie("connect.sid");
      
      console.log("[api/auth/logout] User logged out:", userId);
      return res.json({ success: true });
    } catch (error) {
      console.error("[api/auth/logout] Error:", error);
      res.status(500).json({ error: "فشل تسجيل الخروج" });
    }
  });

  // Register with phone and password
  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const { phone, password, displayName } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      
      // Check if phone already exists
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(409).json({ error: "رقم الهاتف مسجل مسبقاً" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        phone,
        password: hashedPassword,
        displayName: displayName || `مستخدم ${phone.slice(-4)}`,
        username: `user_${phone.slice(-6)}`,
        email: null,
        role: "buyer",
      });
      
      // Generate auth token
      const authToken = crypto.randomBytes(32).toString("hex");
      await storage.updateUser(user.id, { authToken } as any);
      
      // Set session
      (req.session as any).userId = user.id;
      
      console.log("[api/auth/register] New user created:", user.id);
      
      return res.json({
        id: user.id,
        displayName: user.displayName,
        phone: user.phone,
        authToken,
      });
    } catch (error) {
      console.error("[api/auth/register] Error:", error);
      res.status(500).json({ error: "فشل إنشاء الحساب" });
    }
  });
  // Primary auth endpoint - checks Bearer token first, then session
  app.get("/api/auth/me", async (req: any, res) => {
    // Disable caching to ensure fresh user data (especially phoneVerified status)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      // Check for Bearer token in Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        console.log("[api/auth/me] Checking Bearer token:", token.substring(0, 8) + "...");
        
        // Look up user by authToken in database
        const user = await authStorage.getUserByAuthToken(token);
        if (user) {
          console.log("[api/auth/me] Found user by token:", user.id, "phoneVerified:", user.phoneVerified);
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
