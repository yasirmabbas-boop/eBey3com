/**
 * Production OTP Routes with Security
 * /api/request-otp and /api/verify-otp
 */

import type { Express } from "express";
import { sendOTP, verifyOTP } from "./services/otp-service";
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

      // Send OTP via in-memory service (handles generation, storage, and sending)
      const success = await sendOTP(phoneNumber);

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

  // POST /api/verify-otp - Verify OTP code
  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { phoneNumber, code } = req.body;

      if (!phoneNumber || !code) {
        return res.status(400).json({
          error: "رقم الهاتف ورمز التحقق مطلوبان"
        });
      }

      // Verify OTP using in-memory service
      const isValid = verifyOTP(phoneNumber, code);

      if (!isValid) {
        return res.status(400).json({
          error: "رمز التحقق غير صحيح أو منتهي الصلاحية"
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
