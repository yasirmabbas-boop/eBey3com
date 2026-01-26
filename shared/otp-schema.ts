/**
 * OTP Verifications Schema
 * Separate from main schema for production WhatsApp OTP flow
 */

import { pgTable, serial, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// OTP Verifications Table
export const otpVerifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  otpCode: varchar("otp_code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  blockedUntil: timestamp("blocked_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rate Limiting Table
export const otpRateLimits = pgTable("otp_rate_limits", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  requestCount: integer("request_count").notNull().default(1),
  windowStart: timestamp("window_start").notNull().defaultNow(),
  blockedUntil: timestamp("blocked_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertOtpVerificationSchema = createInsertSchema(otpVerifications).omit({
  id: true,
  createdAt: true,
});

export const selectOtpVerificationSchema = createSelectSchema(otpVerifications);

export const insertOtpRateLimitSchema = createInsertSchema(otpRateLimits).omit({
  id: true,
  createdAt: true,
});

export const selectOtpRateLimitSchema = createSelectSchema(otpRateLimits);

// TypeScript types
export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtpVerification = typeof otpVerifications.$inferInsert;
export type OtpRateLimit = typeof otpRateLimits.$inferSelect;
export type InsertOtpRateLimit = typeof otpRateLimits.$inferInsert;
