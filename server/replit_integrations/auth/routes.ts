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
      
      // Clear pending token and generate auth token with expiration
      pending2FATokens.delete(pendingToken);
      const authToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // 30 days
      await storage.updateUser(user.id, { 
        authToken,
        tokenExpiresAt,
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
        
        // Delete all push subscriptions for this user
        // This ensures notifications don't go to the old account when a new user signs in on the same device
        try {
          const deletedCount = await storage.deletePushSubscriptionsByUserId(userId);
          if (deletedCount > 0) {
            console.log(`[api/auth/logout] Deleted ${deletedCount} push subscription(s) for user ${userId}`);
          }
        } catch (pushError) {
          console.error("[api/auth/logout] Error deleting push subscriptions:", pushError);
          // Continue with logout even if push deletion fails
        }
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
      
      // Create user with phoneVerified set to false
      const user = await storage.createUser({
        phone,
        password: hashedPassword,
        displayName: displayName || `مستخدم ${phone.slice(-4)}`,
        username: `user_${phone.slice(-6)}`,
        email: null,
        role: "buyer",
        phoneVerified: false, // Explicitly set to false
      });
      
      // Send OTP via WhatsApp
      try {
        const { sendOTP } = await import("../../services/otp-service");
        await sendOTP(phone);
      } catch (otpError) {
        console.error("[api/auth/register] Failed to send OTP:", otpError);
        // Continue with registration even if OTP fails - user can verify later
      }
      
      // Generate auth token
      const authToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // 30 days
      await storage.updateUser(user.id, { 
        authToken,
        tokenExpiresAt 
      } as any);
      
      // Set session
      (req.session as any).userId = user.id;
      
      console.log("[api/auth/register] New user created:", user.id);
      
      return res.json({
        id: user.id,
        displayName: user.displayName,
        phone: user.phone,
        authToken,
        requiresPhoneVerification: true, // New flag
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
          // Check token expiration
          if (user.tokenExpiresAt && new Date() > new Date(user.tokenExpiresAt)) {
            console.log("[api/auth/me] Token expired");
            return res.status(401).json({ message: "Token expired" });
          }
          
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

  // Token refresh endpoint
  app.post("/api/auth/refresh-token", async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const oldToken = authHeader.substring(7);
      const user = await authStorage.getUserByAuthToken(oldToken);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid token" });
      }
      
      // Check if token is expired or expiring soon (within 7 days)
      const expiresAt = user.tokenExpiresAt ? new Date(user.tokenExpiresAt) : null;
      const shouldRefresh = !expiresAt || 
        (expiresAt.getTime() - Date.now()) < (7 * 24 * 60 * 60 * 1000);
      
      if (shouldRefresh) {
        const newToken = crypto.randomBytes(32).toString("hex");
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 30);
        
        await storage.updateUser(user.id, { 
          authToken: newToken,
          tokenExpiresAt: newExpiresAt 
        } as any);
        
        return res.json({ authToken: newToken });
      }
      
      // Token still valid, return existing
      return res.json({ authToken: oldToken });
    } catch (error) {
      console.error("[api/auth/refresh-token] Error:", error);
      res.status(500).json({ error: "Failed to refresh token" });
    }
  });

  // Verify registration OTP - requires CSRF protection
  app.post("/api/auth/verify-registration-otp", async (req: any, res) => {
    // CSRF validation for authenticated requests
    const sessionId = (req.session as any)?.id || req.sessionID;
    if (sessionId) {
      const { validateCsrfToken } = await import("../../middleware/csrf");
      return validateCsrfToken(req, res, async () => {
        // Continue with handler logic
        await handleVerifyRegistrationOtp(req, res);
      });
    }
    // No session, proceed without CSRF (new registration)
    await handleVerifyRegistrationOtp(req, res);
  });
  
  async function handleVerifyRegistrationOtp(req: any, res: any) {
    try {
      const { phone, code } = req.body;
      
      if (!phone || !code) {
        return res.status(400).json({ error: "رقم الهاتف ورمز التحقق مطلوبان" });
      }
      
      // Verify OTP
      const { verifyOTP } = await import("../../services/otp-service");
      if (!verifyOTP(phone, code)) {
        return res.status(400).json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" });
      }
      
      // Mark phone as verified
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      
      await storage.markPhoneAsVerified(user.id);
      
      // Generate new token with verified status
      const authToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // 30 days
      await storage.updateUser(user.id, { 
        authToken,
        tokenExpiresAt 
      } as any);
      
      // Update session
      (req.session as any).userId = user.id;
      
      return res.json({ 
        success: true, 
        authToken,
        message: "تم التحقق من رقم الهاتف بنجاح"
      });
    } catch (error) {
      console.error("[api/auth/verify-registration-otp] Error:", error);
      res.status(500).json({ error: "حدث خطأ أثناء التحقق من الرمز" });
    }
  }
}
