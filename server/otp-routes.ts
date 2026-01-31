/**
 * Production OTP Routes with Security
 * /api/request-otp and /api/verify-otp
 */

import type { Express } from "express";
import { sendOTP, verifyOTP } from "./services/otp-service";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { isAuthenticatedUnified } from "./replit_integrations/auth";
import { normalizePhone, normalizeOTPCode } from "@shared/digit-normalization";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export function registerOtpRoutes(app: Express) {
  
  // POST /api/request-otp - Request new OTP code
  app.post("/api/request-otp", async (req, res) => {
    try {
      const { phoneNumber, phone } = req.body ?? {};
      const normalizedInput = phoneNumber || phone;
      
      console.log("[OTP] /api/request-otp body:", {
        hasPhoneNumber: !!phoneNumber,
        hasPhone: !!phone,
      });

      if (!normalizedInput) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }

      // Send OTP via in-memory service (handles generation, storage, and sending)
      const success = await sendOTP(normalizedInput);

      if (!success) {
        return res.status(500).json({
          error: "فشل في إرسال رمز التحقق"
        });
      }

      return res.json({
        success: true,
        message: "تم إرسال رمز التحقق إلى واتساب",
        expiresIn: 300 // 5 minutes in seconds
      });

    } catch (error: any) {
      console.error("[OTP Request Error]:", error);
      return res.status(500).json({
        error: "حدث خطأ أثناء إرسال رمز التحقق"
      });
    }
  });

  // Legacy alias used by some frontend components
  app.post("/api/auth/send-otp", async (req, res) => {
    // Same behavior as /api/request-otp, but body is typically { phone }
    try {
      const { phone, phoneNumber } = req.body ?? {};
      const rawInput = phoneNumber || phone;

      console.log("[OTP] /api/auth/send-otp body:", {
        hasPhoneNumber: !!phoneNumber,
        hasPhone: !!phone,
      });

      if (!rawInput) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }

      // Normalize Arabic digits to Western digits
      const normalizedInput = normalizePhone(rawInput);

      const success = await sendOTP(normalizedInput);
      if (!success) {
        return res.status(500).json({ error: "فشل في إرسال رمز التحقق" });
      }

      return res.json({
        success: true,
        message: "تم إرسال رمز التحقق إلى واتساب",
        expiresIn: 300,
      });
    } catch (error: any) {
      console.error("[OTP /api/auth/send-otp Error]:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء إرسال رمز التحقق" });
    }
  });

  // POST /api/verify-otp - Verify OTP code (for login)
  app.post("/api/verify-otp", async (req: any, res) => {
    try {
      const { phoneNumber, phone, code } = req.body ?? {};
      const normalizedInput = phoneNumber || phone;

      console.log("[OTP] /api/verify-otp body:", {
        hasPhoneNumber: !!phoneNumber,
        hasPhone: !!phone,
        hasCode: !!code,
      });

      if (!normalizedInput || !code) {
        return res.status(400).json({
          error: "رقم الهاتف ورمز التحقق مطلوبان"
        });
      }

      // Verify OTP using in-memory service
      const isValid = verifyOTP(normalizedInput, code);

      if (!isValid) {
        return res.status(400).json({
          error: "رمز التحقق غير صحيح أو منتهي الصلاحية"
        });
      }

      // OTP verified! Now get or create user
      let user = await storage.getUserByPhone(normalizedInput);

      if (!user) {
        // Create new user if doesn't exist
        user = await storage.createUser({
          displayName: `مستخدم ${normalizedInput.slice(-4)}`,
          username: `user_${normalizedInput.slice(-6)}`,
          email: `${normalizedInput}@temp.ebey3.com`,
          password: Math.random().toString(36),
          phone: normalizedInput,
          phoneVerified: true,
          role: "buyer"
        });
      } else {
        // Update existing user to verified
        await storage.markPhoneAsVerified(user.id);
        user.phoneVerified = true;
      }

      // Generate JWT token for stateless authentication
      const token = jwt.sign(
        {
          userId: user.id,
          phone: normalizedInput,
          phoneVerified: true
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      // Store the token in the user's authToken field for lookup by /api/auth/me
      await storage.updateUser(user.id, { authToken: token });

      // Create session for session-based authentication (like regular login)
      if (req.session) {
        req.session.userId = user.id;
        req.session.user = {
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          phone: user.phone,
          phoneVerified: true,
          role: user.role
        };
      }

      return res.json({
        success: true,
        message: "تم التحقق من رقم الهاتف بنجاح",
        user: {
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          phone: user.phone,
          phoneVerified: true,
          role: user.role
        },
        token
      });

    } catch (error: any) {
      console.error("[OTP Verify Error]:", error);
      return res.status(500).json({
        error: "حدث خطأ أثناء التحقق من الرمز"
      });
    }
  });

  // Legacy alias used by some frontend components (verify phone for current logged-in user)
  app.post("/api/auth/verify-phone-otp", isAuthenticatedUnified as any, async (req: any, res) => {
    try {
      const { code } = req.body ?? {};
      if (!code) {
        return res.status(400).json({ error: "رمز التحقق مطلوب" });
      }

      const userId = req.user?.id || (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.phone) {
        return res.status(400).json({ error: "رقم الهاتف غير موجود في الحساب" });
      }

      // Check if another account already has this phone verified
      const existingUser = await storage.getUserByPhone(user.phone);
      if (existingUser && existingUser.id !== userId && existingUser.phoneVerified) {
        return res.status(409).json({ 
          error: "هذا الرقم مسجل مسبقاً على حساب آخر. الرجاء استخدام رقم آخر أو تسجيل الدخول بالحساب المرتبط بهذا الرقم" 
        });
      }

      // Normalize OTP code (phone is already normalized in database)
      const normalizedCode = normalizeOTPCode(code);
      const isValid = verifyOTP(user.phone, normalizedCode);
      if (!isValid) {
        return res.status(400).json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" });
      }

      await storage.markPhoneAsVerified(user.id);
      
      // Return updated user data so frontend can update its state
      const updatedUser = await storage.getUser(user.id);
      return res.json({ 
        success: true, 
        message: "تم التحقق من رقم الهاتف بنجاح",
        user: updatedUser ? {
          id: updatedUser.id,
          displayName: updatedUser.displayName,
          username: updatedUser.username,
          phone: updatedUser.phone,
          phoneVerified: true,
          role: updatedUser.role,
          avatar: updatedUser.avatar,
        } : undefined
      });
    } catch (error: any) {
      console.error("[OTP /api/auth/verify-phone-otp Error]:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء التحقق من الرمز" });
    }
  });

  // Legacy alias used by some frontend components (send OTP to current user's phone)
  app.post("/api/auth/send-phone-otp", isAuthenticatedUnified as any, async (req: any, res) => {
    try {
      const userId = req.user?.id || (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user?.phone) {
        return res.status(400).json({ error: "رقم الهاتف غير موجود في الحساب" });
      }

      if (user.phoneVerified) {
        return res.json({
          alreadyVerified: true,
          message: "رقم هاتفك موثق بالفعل",
        });
      }

      const success = await sendOTP(user.phone);
      if (!success) {
        return res.status(500).json({ error: "فشل في إرسال رمز التحقق" });
      }

      return res.json({
        success: true,
        message: "تم إرسال رمز التحقق إلى واتساب",
        expiresIn: 300,
      });
    } catch (error: any) {
      console.error("[OTP /api/auth/send-phone-otp Error]:", error);
      return res.status(500).json({ error: "حدث خطأ أثناء إرسال رمز التحقق" });
    }
  });
}
