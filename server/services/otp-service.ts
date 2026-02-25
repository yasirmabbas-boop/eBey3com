/**
 * Database-backed OTP Service
 * Stores OTP codes in verification_codes table for persistence across Cloud Run instances
 */

import { normalizeIraqiPhone, generateOTPCode, sendWhatsAppOTP } from "../whatsapp";
import { storage } from "../storage";

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const OTP_TYPE = "otp_login";

/**
 * Normalize phone number to ensure consistent database keys
 */
function normalizePhone(phone: string): string {
  return normalizeIraqiPhone(phone);
}

/**
 * Send OTP to a phone number via WhatsApp
 * Generates code, stores it in DB, and sends via VerifyWay
 */
export async function sendOTP(phone: string): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);
  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  console.log(`[OTP Service] Generating OTP for ${normalizedPhone}`);

  // Store in database (persistent across Cloud Run instances)
  try {
    await storage.createVerificationCode(normalizedPhone, code, OTP_TYPE, expiresAt);
  } catch (dbError) {
    console.error(`[OTP Service] Failed to store OTP in database:`, dbError);
    return false;
  }

  const result = await sendWhatsAppOTP(phone, code);

  if (!result.success) {
    console.error(`[OTP Service] Failed to send OTP: ${result.error}`);
    return false;
  }

  console.log(`[OTP Service] OTP sent successfully to ${normalizedPhone}`);
  return true;
}

/**
 * Verify an OTP code for a phone number
 * Returns true if valid, false otherwise
 * Marks the code as used on successful verification
 */
export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);

  console.log(`[OTP Service] Verifying OTP for ${normalizedPhone}`);

  try {
    const entry = await storage.getValidVerificationCode(normalizedPhone, code, OTP_TYPE);

    if (!entry) {
      console.log(`[OTP Service] No valid OTP found for ${normalizedPhone}`);
      return false;
    }

    // Mark as used so it can't be reused
    await storage.markVerificationCodeUsed(entry.id);
    console.log(`[OTP Service] OTP verified successfully for ${normalizedPhone}`);
    return true;
  } catch (dbError) {
    console.error(`[OTP Service] Database error during verification:`, dbError);
    return false;
  }
}

/**
 * Clear expired OTPs from database
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  try {
    return await storage.deleteExpiredVerificationCodes();
  } catch (error) {
    console.error(`[OTP Service] Failed to cleanup expired OTPs:`, error);
    return 0;
  }
}

/**
 * Get the number of active OTPs (for debugging)
 */
export function getActiveOTPCount(): number {
  return 0; // No longer tracked in memory
}
