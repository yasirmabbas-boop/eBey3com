import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { otpVerifications, otpRateLimits } from "../shared/otp-schema";

export class OtpStorage {
  async checkRateLimit(phoneNumber: string) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const [rateLimit] = await db.select().from(otpRateLimits).where(eq(otpRateLimits.phoneNumber, phoneNumber));
    if (rateLimit?.blockedUntil && new Date(rateLimit.blockedUntil) > new Date()) {
      const retryAfter = Math.ceil((new Date(rateLimit.blockedUntil).getTime() - Date.now()) / 1000);
      return { allowed: false, reason: "لقد طلبت الكثير من الرموز. يرجى الانتظار قليلاً.", retryAfter };
    }
    if (!rateLimit) return { allowed: true };
    const windowStart = new Date(rateLimit.windowStart);
    if (windowStart < tenMinutesAgo) {
      await db.update(otpRateLimits).set({ requestCount: 1, windowStart: new Date(), blockedUntil: null }).where(eq(otpRateLimits.phoneNumber, phoneNumber));
      return { allowed: true };
    }
    if (rateLimit.requestCount >= 3) {
      const blockedUntil = new Date(Date.now() + 10 * 60 * 1000);
      await db.update(otpRateLimits).set({ blockedUntil }).where(eq(otpRateLimits.phoneNumber, phoneNumber));
      return { allowed: false, reason: "لقد طلبت الكثير من الرموز. يرجى الانتظار قليلاً.", retryAfter: 600 };
    }
    await db.update(otpRateLimits).set({ requestCount: rateLimit.requestCount + 1 }).where(eq(otpRateLimits.phoneNumber, phoneNumber));
    return { allowed: true };
  }

  async updateRateLimit(phoneNumber: string) {
    const [existing] = await db.select().from(otpRateLimits).where(eq(otpRateLimits.phoneNumber, phoneNumber));
    if (!existing) {
      await db.insert(otpRateLimits).values({ phoneNumber, requestCount: 1, windowStart: new Date() });
    }
  }

  async createOTP(phoneNumber: string, otpCode: string, expiresAt: Date) {
    await db.delete(otpVerifications).where(eq(otpVerifications.phoneNumber, phoneNumber));
    const [result] = await db.insert(otpVerifications).values({ phoneNumber, otpCode, expiresAt, failedAttempts: 0, blockedUntil: null }).returning();
    return result;
  }

  async verifyOTP(phoneNumber: string, code: string) {
    const [otp] = await db.select().from(otpVerifications).where(eq(otpVerifications.phoneNumber, phoneNumber)).orderBy(sql`${otpVerifications.createdAt} DESC`).limit(1);
    if (!otp) return { success: false, error: "No OTP found", errorAr: "لم يتم العثور على رمز تحقق" };
    if (otp.blockedUntil && new Date(otp.blockedUntil) > new Date()) {
      const retryAfter = Math.ceil((new Date(otp.blockedUntil).getTime() - Date.now()) / 1000);
      return { success: false, error: "Too many failed attempts", errorAr: "محاولات فاشلة كثيرة. يرجى المحاولة لاحقاً.", retryAfter };
    }
    if (new Date(otp.expiresAt) < new Date()) {
      await db.delete(otpVerifications).where(eq(otpVerifications.id, otp.id));
      return { success: false, error: "OTP expired", errorAr: "انتهت صلاحية رمز التحقق" };
    }
    if (otp.otpCode !== code) {
      const failedAttempts = otp.failedAttempts + 1;
      if (failedAttempts >= 5) {
        const blockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await db.update(otpVerifications).set({ failedAttempts, blockedUntil }).where(eq(otpVerifications.id, otp.id));
        return { success: false, error: "Blocked for 30 minutes", errorAr: "محاولات خاطئة كثيرة. تم حظرك لمدة 30 دقيقة.", retryAfter: 1800 };
      }
      await db.update(otpVerifications).set({ failedAttempts }).where(eq(otpVerifications.id, otp.id));
      return { success: false, error: `Incorrect code. ${5 - failedAttempts} attempts remaining`, errorAr: `رمز غير صحيح. ${5 - failedAttempts} محاولات متبقية` };
    }
    await db.delete(otpVerifications).where(eq(otpVerifications.id, otp.id));
    return { success: true };
  }

  async cleanupExpired() {
    const deletedOtps = await db.delete(otpVerifications).where(sql`${otpVerifications.expiresAt} < NOW()`).returning();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const deletedRateLimits = await db.delete(otpRateLimits).where(and(sql`${otpRateLimits.windowStart} < ${oneHourAgo}`, sql`(${otpRateLimits.blockedUntil} IS NULL OR ${otpRateLimits.blockedUntil} < NOW())`)).returning();
    return { otpsDeleted: deletedOtps.length, rateLimitsDeleted: deletedRateLimits.length };
  }
}

export const otpStorage = new OtpStorage();
