/**
 * Simple In-Memory OTP Service
 * Stores OTP codes in a Map for verification
 */

import { normalizeIraqiPhone, generateOTPCode, sendWhatsAppOTP } from "../whatsapp";

interface OTPEntry {
  code: string;
  expiresAt: Date;
  attempts: number;
}

const otpMap = new Map<string, OTPEntry>();

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

/**
 * Normalize phone number to ensure consistent Map keys
 */
function normalizePhone(phone: string): string {
  return normalizeIraqiPhone(phone);
}

/**
 * Send OTP to a phone number via WhatsApp
 * Generates code, stores it, and sends via VerifyWay
 */
export async function sendOTP(phone: string): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);
  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  
  console.log(`[OTP Service] Generating OTP for ${normalizedPhone}`);
  console.log(`[OTP Service] Code: ${code}, Expires: ${expiresAt.toISOString()}`);
  
  otpMap.set(normalizedPhone, {
    code,
    expiresAt,
    attempts: 0
  });
  
  const result = await sendWhatsAppOTP(phone, code);
  
  if (!result.success) {
    console.error(`[OTP Service] Failed to send OTP: ${result.error}`);
    otpMap.delete(normalizedPhone);
    return false;
  }
  
  console.log(`[OTP Service] OTP sent successfully to ${normalizedPhone}`);
  return true;
}

/**
 * Verify an OTP code for a phone number
 * Returns true if valid, false otherwise
 * Deletes the code on successful verification
 */
export function verifyOTP(phone: string, code: string): boolean {
  const normalizedPhone = normalizePhone(phone);
  const entry = otpMap.get(normalizedPhone);
  
  console.log(`[OTP Service] Verifying OTP for ${normalizedPhone}`);
  
  if (!entry) {
    console.log(`[OTP Service] No OTP found for ${normalizedPhone}`);
    return false;
  }
  
  if (new Date() > entry.expiresAt) {
    console.log(`[OTP Service] OTP expired for ${normalizedPhone}`);
    otpMap.delete(normalizedPhone);
    return false;
  }
  
  if (entry.attempts >= MAX_ATTEMPTS) {
    console.log(`[OTP Service] Max attempts exceeded for ${normalizedPhone}`);
    otpMap.delete(normalizedPhone);
    return false;
  }
  
  if (entry.code !== code) {
    entry.attempts++;
    console.log(`[OTP Service] Invalid code for ${normalizedPhone}. Attempts: ${entry.attempts}/${MAX_ATTEMPTS}`);
    return false;
  }
  
  console.log(`[OTP Service] OTP verified successfully for ${normalizedPhone}`);
  otpMap.delete(normalizedPhone);
  return true;
}

/**
 * Clear expired OTPs from memory
 */
export function cleanupExpiredOTPs(): number {
  const now = new Date();
  let count = 0;
  
  const entries = Array.from(otpMap.entries());
  for (const [phone, entry] of entries) {
    if (now > entry.expiresAt) {
      otpMap.delete(phone);
      count++;
    }
  }
  
  if (count > 0) {
    console.log(`[OTP Service] Cleaned up ${count} expired OTPs`);
  }
  
  return count;
}

/**
 * Get the number of active OTPs (for debugging)
 */
export function getActiveOTPCount(): number {
  return otpMap.size;
}
