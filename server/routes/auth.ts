import type { Express } from "express";
import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";

export function registerAuthRoutes(app: Express): void {
  // Send verification code (WhatsApp OTP)
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { phone, type = "registration" } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }
      
      // Check if Twilio WhatsApp is configured
      const { isWhatsAppConfigured, sendWhatsAppOTP, generateOTPCode } = await import("../whatsapp");
      try {
        isWhatsAppConfigured(); // Will throw if not configured
      } catch (configError: any) {
        console.error("[Route] Twilio WhatsApp not configured:", configError.message);
        return res.status(503).json({ error: "خدمة واتساب غير متاحة حالياً - الرجاء التواصل مع الدعم الفني" });
      }
      
      // For registration, check if phone is already registered
      if (type === "registration") {
        const existingUser = await storage.getUserByPhone(phone);
        if (existingUser) {
          return res.status(400).json({ error: "رقم الهاتف مستخدم بالفعل" });
        }
      }
      
      // For password reset, verify user exists
      if (type === "password_reset") {
        const existingUser = await storage.getUserByPhone(phone);
        if (!existingUser) {
          return res.status(404).json({ error: "لا يوجد حساب بهذا الرقم" });
        }
      }
      
      // Generate secure OTP code
      const code = generateOTPCode();
      
      // Store OTP in database with 5-minute expiry
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await storage.createVerificationCode(phone, code, type, expiresAt);
      
      // Send OTP via WhatsApp using Twilio Messages API (Sandbox)
      const result = await sendWhatsAppOTP(phone, code);
      if (!result.success) {
        return res.status(500).json({ 
          error: result.errorAr || "فشل في إرسال رمز التحقق عبر واتساب",
          details: result.error
        });
      }
      
      res.json({ success: true, message: "تم إرسال رمز التحقق عبر واتساب" });
    } catch (error) {
      console.error("Error sending verification:", error);
      res.status(500).json({ error: "فشل في إرسال رمز التحقق" });
    }
  });

  // Verify code
  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { phone, code, type = "registration" } = req.body;
      
      if (!phone || !code) {
        return res.status(400).json({ error: "رقم الهاتف ورمز التحقق مطلوبان" });
      }
      
      // Verify OTP by checking database
      const validCode = await storage.getValidVerificationCode(phone, code, type);
      
      if (!validCode) {
        return res.status(400).json({ 
          error: "رمز التحقق غير صحيح أو منتهي الصلاحية"
        });
      }
      
      // Mark code as used to prevent reuse
      await storage.markVerificationCodeUsed(validCode.id);
      
      // If it's for password reset, return a one-time reset token
      if (type === "password_reset") {
        const crypto = await import("crypto");
        const resetToken = crypto.randomBytes(32).toString("hex");
        
        // Store reset token in user record temporarily
        const user = await storage.getUserByPhone(phone);
        if (user) {
          await storage.updateUser(user.id, { authToken: resetToken } as any);
        }
        
        return res.json({ success: true, verified: true, resetToken });
      }
      
      res.json({ success: true, verified: true });
    } catch (error) {
      console.error("Error verifying code:", error);
      res.status(500).json({ error: "فشل في التحقق من الرمز" });
    }
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { phone, resetToken, newPassword } = req.body;
      
      if (!phone || !resetToken || !newPassword) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      
      // Find user and verify reset token
      const user = await storage.getUserByPhone(phone);
      if (!user || user.authToken !== resetToken) {
        return res.status(400).json({ error: "رابط إعادة التعيين غير صالح" });
      }
      
      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { 
        password: hashedPassword,
        authToken: null 
      } as any);
      
      res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "فشل في إعادة تعيين كلمة المرور" });
    }
  });

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { phone, password, displayName, ageBracket, interests, city, email } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });
      }

      // Check if phone already exists
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({ error: "رقم الهاتف مستخدم بالفعل" });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        phone,
        password: hashedPassword,
        displayName: displayName || phone,
        email: email || null,
        authProvider: "phone",
        ageBracket: ageBracket || null,
        interests: interests || [],
        city: city || null,
      });

      // Set session
      (req.session as any).userId = user.id;

      res.status(201).json({ 
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        sellerApproved: user.sellerApproved,
        accountCode: user.accountCode,
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "فشل في إنشاء الحساب" });
    }
  });

  // Send phone OTP (WhatsApp)
  app.post("/api/auth/send-phone-otp", async (req, res) => {
    try {
      // User must be logged in
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.phone) {
        return res.status(404).json({ error: "المستخدم غير موجود أو لا يملك رقم هاتف" });
      }

      // Check if already verified
      if (user.phoneVerified) {
        return res.json({
          success: true,
          alreadyVerified: true,
          message: "رقم هاتفك موثق بالفعل",
        });
      }

      // Check if Twilio WhatsApp is configured and generate OTP
      const { generateOTPCode, sendWhatsAppOTP, isWhatsAppConfigured } = await import("../whatsapp");
      
      try {
        isWhatsAppConfigured(); // Will throw if not configured
      } catch (configError: any) {
        console.error("[Route] Twilio WhatsApp not configured:", configError.message);
        return res.status(500).json({ error: "خدمة التحقق غير متاحة حالياً - الرجاء التواصل مع الدعم الفني" });
      }
      
      // Generate secure OTP code
      const otpCode = generateOTPCode();
      
      // Store OTP in database with 5-minute expiry
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await storage.createVerificationCode(user.phone, otpCode, "phone_verification", expiresAt);
      
      // Send via Twilio WhatsApp Messages API (Sandbox)
      const result = await sendWhatsAppOTP(user.phone, otpCode);
      
      if (!result.success) {
        return res.status(500).json({ 
          error: result.errorAr || "فشل في إرسال رمز التحقق",
          details: result.error
        });
      }

      return res.json({
        success: true,
        message: "تم إرسال رمز التحقق إلى واتساب",
        phone: user.phone,
      });
    } catch (error) {
      console.error("Error sending WhatsApp OTP:", error);
      res.status(500).json({ error: "فشل في إرسال رمز التحقق" });
    }
  });

  // Verify phone OTP
  app.post("/api/auth/verify-phone-otp", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "رمز التحقق مطلوب" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.phone) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // Verify OTP by checking database
      const validCode = await storage.getValidVerificationCode(
        user.phone,
        code,
        "phone_verification"
      );

      if (!validCode) {
        return res.status(400).json({ 
          error: "رمز التحقق غير صحيح أو منتهي الصلاحية"
        });
      }

      // Mark code as used to prevent reuse
      await storage.markVerificationCodeUsed(validCode.id);
      
      // Mark phone as verified
      await storage.markPhoneAsVerified(userId);

      return res.json({
        success: true,
        message: "تم التحقق من رقم الهاتف بنجاح",
        phoneVerified: true,
      });
    } catch (error) {
      console.error("Error verifying phone OTP:", error);
      res.status(500).json({ error: "فشل في التحقق من رقم الهاتف" });
    }
  });

  // Send OTP (VerifyWay API)
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      
      // Try to get phone from body, fallback to logged-in user's phone
      let phoneNumber = phone;
      if (!phoneNumber) {
        const userId = await getUserIdFromRequest(req);
        if (userId) {
          const user = await storage.getUser(userId);
          phoneNumber = user?.phone;
        }
      }
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }

      // Check if user is logged in and already verified
      const userId = await getUserIdFromRequest(req);
      if (userId) {
        const user = await storage.getUser(userId);
        if (user?.phoneVerified && user?.phone === phoneNumber) {
          return res.json({
            success: true,
            alreadyVerified: true,
            message: "رقم هاتفك موثق بالفعل",
          });
        }
      }

      // Use in-memory OTP service with VerifyWay
      const { sendOTP } = await import("../services/otp-service");
      const success = await sendOTP(phoneNumber);
      
      if (!success) {
        return res.status(500).json({ 
          error: "فشل في إرسال رمز التحقق"
        });
      }

      return res.json({
        success: true,
        message: "تم إرسال رمز التحقق إلى واتساب",
        phone: phoneNumber,
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "فشل في إرسال رمز التحقق" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });
      }

      // Find user by phone
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }

      // Check password
      if (!user.password) {
        return res.status(401).json({ error: "هذا الحساب يستخدم طريقة تسجيل دخول مختلفة" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }

      // Check if user is banned - block login completely
      if (user.isBanned) {
        return res.status(403).json({ 
          error: "تم حظر حسابك من المنصة. لا يمكنك تسجيل الدخول.",
          isBanned: true
        });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        // Generate a pending token for 2FA verification
        const crypto = await import("crypto");
        const pendingToken = crypto.randomBytes(32).toString("hex");
        
        // Store pending token temporarily
        await storage.updateUser(user.id, { authToken: pendingToken } as any);
        
        return res.json({ 
          requires2FA: true,
          phone: user.phone,
          pendingToken,
          message: "يرجى إدخال رمز المصادقة الثنائية"
        });
      }

      // Generate auth token for Safari/ITP compatibility
      const crypto = await import("crypto");
      const authToken = crypto.randomBytes(32).toString("hex");

      // Update last login and store auth token
      await storage.updateUser(user.id, { 
        lastLoginAt: new Date(),
        authToken: authToken,
      } as any);

      // Set session (for browsers that support cookies)
      (req.session as any).userId = user.id;

      res.json({ 
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        sellerApproved: user.sellerApproved,
        isAdmin: user.isAdmin,
        accountCode: user.accountCode,
        avatar: user.avatar,
        authToken: authToken,
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "فشل في تسجيل الدخول" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "فشل في تسجيل الخروج" });
      }
      res.json({ success: true });
    });
  });

  // 2FA Setup
  app.post("/api/auth/2fa/setup", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);
          const user = await storage.getUserByAuthToken(token);
          if (!user) {
            return res.status(401).json({ error: "غير مسجل الدخول" });
          }
          (req as any).userId = user.id;
        } else {
          return res.status(401).json({ error: "غير مسجل الدخول" });
        }
      }
      
      const activeUserId = userId || (req as any).userId;
      const user = await storage.getUser(activeUserId);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      const { authenticator } = await import("otplib");
      const qrcode = await import("qrcode");
      
      const secret = authenticator.generateSecret();
      const appName = "E-بيع";
      const otpauth = authenticator.keyuri(user.phone || user.email || user.id, appName, secret);
      
      const qrCodeDataUrl = await qrcode.toDataURL(otpauth);
      
      // Store secret temporarily (not enabled yet)
      await storage.updateUser(activeUserId, { twoFactorSecret: secret } as any);
      
      res.json({ 
        secret,
        qrCode: qrCodeDataUrl,
        message: "امسح رمز QR باستخدام تطبيق المصادقة"
      });
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      res.status(500).json({ error: "فشل في إعداد المصادقة الثنائية" });
    }
  });

  // Verify 2FA Setup
  app.post("/api/auth/2fa/verify-setup", async (req, res) => {
    try {
      let userId = (req.session as any)?.userId;
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);
          const user = await storage.getUserByAuthToken(token);
          if (user) userId = user.id;
        }
      }
      
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "رمز التحقق مطلوب" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ error: "يرجى إعداد المصادقة الثنائية أولاً" });
      }

      const { authenticator } = await import("otplib");
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
      
      if (!isValid) {
        return res.status(400).json({ error: "رمز التحقق غير صحيح" });
      }

      // Enable 2FA
      await storage.updateUser(userId, { twoFactorEnabled: true } as any);
      
      res.json({ success: true, message: "تم تفعيل المصادقة الثنائية بنجاح" });
    } catch (error) {
      console.error("Error verifying 2FA setup:", error);
      res.status(500).json({ error: "فشل في التحقق من رمز المصادقة" });
    }
  });

  // Disable 2FA
  app.post("/api/auth/2fa/disable", async (req, res) => {
    try {
      let userId = (req.session as any)?.userId;
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);
          const user = await storage.getUserByAuthToken(token);
          if (user) userId = user.id;
        }
      }
      
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { code, password } = req.body;
      if (!code || !password) {
        return res.status(400).json({ error: "رمز التحقق وكلمة المرور مطلوبان" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // Verify password
      if (!user.password) {
        return res.status(400).json({ error: "لا يمكن إيقاف المصادقة الثنائية لهذا الحساب" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "كلمة المرور غير صحيحة" });
      }

      // Verify 2FA code
      if (user.twoFactorSecret) {
        const { authenticator } = await import("otplib");
        const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
        if (!isValid) {
          return res.status(400).json({ error: "رمز التحقق غير صحيح" });
        }
      }

      // Disable 2FA
      await storage.updateUser(userId, { 
        twoFactorEnabled: false,
        twoFactorSecret: null 
      } as any);
      
      res.json({ success: true, message: "تم إيقاف المصادقة الثنائية" });
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      res.status(500).json({ error: "فشل في إيقاف المصادقة الثنائية" });
    }
  });

  // Verify 2FA (for login)
  app.post("/api/auth/2fa/verify", async (req, res) => {
    try {
      const { phone, code, pendingToken } = req.body;
      
      if (!phone || !code || !pendingToken) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      const user = await storage.getUserByPhone(phone);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ error: "المستخدم غير موجود" });
      }

      // Verify the pending token matches
      if (user.authToken !== pendingToken) {
        return res.status(400).json({ error: "جلسة تسجيل الدخول غير صالحة" });
      }

      const { authenticator } = await import("otplib");
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
      
      if (!isValid) {
        return res.status(400).json({ error: "رمز التحقق غير صحيح" });
      }

      // Generate a new auth token
      const crypto = await import("crypto");
      const authToken = crypto.randomBytes(32).toString("hex");
      await storage.updateUser(user.id, { 
        authToken,
        lastLoginAt: new Date()
      } as any);

      // Set session
      (req.session as any).userId = user.id;

      res.json({ 
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        sellerApproved: user.sellerApproved,
        isAdmin: user.isAdmin,
        accountCode: user.accountCode,
        avatar: user.avatar,
        authToken,
      });
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      res.status(500).json({ error: "فشل في التحقق من رمز المصادقة" });
    }
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    let userId = (req.session as any)?.userId;
    
    // Safari/ITP fallback: check Authorization header for token
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const user = await storage.getUserByAuthToken(token);
        if (user) {
          userId = user.id;
        }
      }
    }
    
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "المستخدم غير موجود" });
    }

    // Temporary Cleanup: If phone number matches facebookId, hide it
    // This ensures users with legacy data see an empty phone field
    let cleanPhone = user.phone;
    if (cleanPhone && user.facebookId && cleanPhone === user.facebookId) {
      cleanPhone = null;
    }
    // Also check for "fb_" prefix pattern (another legacy format)
    if (cleanPhone && cleanPhone.startsWith("fb_")) {
      cleanPhone = null;
    }

    res.json({
      id: user.id,
      phone: cleanPhone,
      displayName: user.displayName,
      sellerApproved: user.sellerApproved,
      sellerRequestStatus: user.sellerRequestStatus,
      isAdmin: user.isAdmin,
      accountCode: user.accountCode,
      avatar: user.avatar,
      isVerified: user.isVerified,
      isBanned: user.isBanned,
      phoneVerified: user.phoneVerified || false,
    });
  });
}
