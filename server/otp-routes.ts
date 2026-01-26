/**
 * Production OTP Routes with Security
 * /api/request-otp and /api/verify-otp
 */

import type { Express } from "express";
import { otpStorage } from "./otp-storage";
import { generateOTPCode, sendWhatsAppOTP, formatIraqiPhoneForWhatsApp } from "./whatsapp";
import { storage } from "./storage";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export function registerOtpRoutes(app: Express) {
  
  // POST /api/request-otp - Request new OTP code
  app.post("/api/request-otp", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }

      // Check rate limit (3 requests per 10 minutes)
      const rateLimitCheck = await otpStorage.checkRateLimit(phoneNumber);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          error: rateLimitCheck.reason,
          retryAfter: rateLimitCheck.retryAfter
        });
      }

      // Update rate limit record
      await otpStorage.updateRateLimit(phoneNumber);

      // Generate cryptographically secure 6-digit code
      const otpCode = generateOTPCode();

      // Set expiry to 5 minutes from now
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Save to database
      await otpStorage.createOTP(phoneNumber, otpCode, expiresAt);

      // Send via WhatsApp
      const result = await sendWhatsAppOTP(phoneNumber, otpCode);

      if (!result.success) {
        return res.status(500).json({
          error: result.errorAr || "فشل في إرسال رمز التحقق",
          details: result.error
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

  // POST /api/verify-otp - Verify OTP code
  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { phoneNumber, code } = req.body;

      if (!phoneNumber || !code) {
        return res.status(400).json({
          error: "رقم الهاتف ورمز التحقق مطلوبان"
        });
      }

      // Verify OTP with brute-force protection
      const verifyResult = await otpStorage.verifyOTP(phoneNumber, code);

      if (!verifyResult.success) {
        return res.status(400).json({
          error: verifyResult.errorAr || verifyResult.error,
          retryAfter: verifyResult.retryAfter
        });
      }

      // OTP verified! Now get or create user
      let user = await storage.getUserByPhone(phoneNumber);

      if (!user) {
        // Create new user if doesn't exist
        user = await storage.createUser({
          displayName: `مستخدم ${phoneNumber.slice(-4)}`,
          username: `user_${phoneNumber.slice(-6)}`,
          email: `${phoneNumber}@temp.ebey3.com`,
          password: Math.random().toString(36),
          phone: phoneNumber,
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
          phone: phoneNumber,
          phoneVerified: true
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      return res.json({
        success: true,
        message: "تم التحقق من رقم الهاتف بنجاح",
        user: {
          id: user.id,
          phone: user.phone,
          phoneVerified: true
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
}
