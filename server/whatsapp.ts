/**
 * WhatsApp Verification via Twilio Messages API (Sandbox)
 * Uses Twilio Sandbox for WhatsApp messaging
 * OTP codes are generated and managed by our application
 */

import twilio from "twilio";

// Twilio Configuration (from Replit Secrets)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
// Twilio WhatsApp Sandbox number (standard for all accounts)
const TWILIO_WHATSAPP_SANDBOX = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// Initialize Twilio client
let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Iraqi Phone Number Formatter for WhatsApp
 * Converts Iraqi phone numbers to E.164 format with whatsapp: prefix
 * 
 * Supported input formats:
 * - 07501234567 → whatsapp:+9647501234567
 * - 7501234567 (10 digits) → whatsapp:+9647501234567
 * - 00964 7501234567 → whatsapp:+9647501234567
 * - +964 7501234567 → whatsapp:+9647501234567
 * - 964 7501234567 → whatsapp:+9647501234567
 * 
 * Handles spaces, dashes, and parentheses automatically
 */
export function formatIraqiPhoneForWhatsApp(phone: string): string {
  // Step 1: Remove all spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  
  // Step 2: Remove leading + if present (we'll add it back in E.164 format)
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  
  // Step 3: Handle different Iraqi number formats
  let formatted: string;
  
  if (cleaned.startsWith("00964")) {
    // Format: 00964XXXXXXXXX → 964XXXXXXXXX
    formatted = cleaned.substring(2);
  } else if (cleaned.startsWith("964")) {
    // Format: 964XXXXXXXXX → already correct
    formatted = cleaned;
  } else if (cleaned.startsWith("07")) {
    // Format: 07XXXXXXXXX → 9647XXXXXXXXX
    formatted = "964" + cleaned.substring(1);
  } else if (cleaned.startsWith("7") && cleaned.length === 10) {
    // Format: 7XXXXXXXXX (10 digits) → 9647XXXXXXXXX
    formatted = "964" + cleaned;
  } else if (cleaned.length === 9 && /^[0-9]+$/.test(cleaned)) {
    // Format: XXXXXXXXX (9 digits, assuming it's missing the 964 prefix)
    formatted = "964" + cleaned;
  } else {
    // If none of the above, assume it might already have 964 or is in a different format
    formatted = cleaned.startsWith("964") ? cleaned : "964" + cleaned;
  }
  
  // Step 4: Validate the final number (should be 964 + 10 digits = 13 digits total)
  if (!formatted.startsWith("964") || formatted.length !== 13) {
    console.warn(`[WhatsApp] Invalid Iraqi phone format: ${phone} → ${formatted}`);
  }
  
  // Step 5: Return in whatsapp:+[number] E.164 format required by Twilio
  return `whatsapp:+${formatted}`;
}

/**
 * Generate a cryptographically secure random 6-digit OTP code
 * Uses crypto.randomInt for better security than Math.random()
 */
export function generateOTPCode(): string {
  const crypto = require('crypto');
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send WhatsApp OTP using Twilio Messages API (Sandbox)
 * 
 * @param phone - Iraqi phone number in any format
 * @param code - 6-digit OTP code to send
 * @returns Object with success status and Arabic error message if failed
 */
export async function sendWhatsAppOTP(phone: string, code: string): Promise<{ success: boolean; error?: string; errorAr?: string }> {
  console.log("[Twilio WhatsApp] Sending OTP via Messages API (Sandbox)...");
  console.log("[Twilio DEBUG] Original phone input:", phone);
  console.log("[Twilio DEBUG] OTP code:", code);
  console.log("[Twilio DEBUG] TWILIO_ACCOUNT_SID configured:", !!TWILIO_ACCOUNT_SID);
  console.log("[Twilio DEBUG] TWILIO_AUTH_TOKEN configured:", !!TWILIO_AUTH_TOKEN);
  console.log("[Twilio DEBUG] Sandbox number:", TWILIO_WHATSAPP_SANDBOX);
  
  // FORCE PRODUCTION MODE - Throw error if credentials missing
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    const missingVars: string[] = [];
    if (!TWILIO_ACCOUNT_SID) missingVars.push("TWILIO_ACCOUNT_SID");
    if (!TWILIO_AUTH_TOKEN) missingVars.push("TWILIO_AUTH_TOKEN");
    
    const errorMsg = `[Twilio WhatsApp] CRITICAL ERROR - Cannot send OTP: Missing environment variables: ${missingVars.join(", ")}. ` +
                     `Add these to Replit Secrets immediately.`;
    
    console.error(errorMsg);
    throw new Error(`Twilio credentials not configured. Missing: ${missingVars.join(", ")}`);
  }
  
  // Format Iraqi phone number to E.164 WhatsApp format
  const formattedPhone = formatIraqiPhoneForWhatsApp(phone);
  console.log(`[Twilio DEBUG] Formatted phone: ${formattedPhone}`);
  
  try {
    const client = getTwilioClient();
    if (!client) {
      throw new Error("Failed to initialize Twilio client");
    }
    
    // Send OTP via WhatsApp using Twilio Messages API
    // IMPORTANT: Must match Sandbox pre-approved template format exactly
    const message = await client.messages.create({
      body: `Your Ebey3 code is ${code}`,
      from: TWILIO_WHATSAPP_SANDBOX,
      to: formattedPhone
    });
    
    console.log("[Twilio WhatsApp] Message sent successfully");
    console.log("[Twilio DEBUG] Message SID:", message.sid);
    console.log("[Twilio DEBUG] Status:", message.status);
    console.log("[Twilio DEBUG] To:", message.to);
    
    if (message.sid) {
      return { success: true };
    } else {
      console.error("[Twilio WhatsApp] Unexpected response - no SID returned");
      return {
        success: false,
        error: "No message SID returned",
        errorAr: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."
      };
    }
  } catch (error: any) {
    console.error("[Twilio WhatsApp] Error sending OTP:");
    console.error("[Twilio DEBUG] Error code:", error.code);
    console.error("[Twilio DEBUG] Error message:", error.message);
    console.error("[Twilio DEBUG] Error status:", error.status);
    console.error("[Twilio DEBUG] More info:", error.moreInfo);
    
    // Map Twilio error codes to Arabic error messages
    let arabicError = "حدث خطأ في إرسال رمز التحقق. يرجى المحاولة مرة أخرى.";
    
    if (error.code === 63016 || error.message?.includes("not joined")) {
      // Phone number hasn't joined the sandbox
      arabicError = "يرجى الانضمام إلى Twilio Sandbox أولاً. أرسل رسالة WhatsApp إلى +1 415 523 8886 مع الرمز المطلوب.";
      console.error("[Twilio DEBUG] Phone number has not joined Twilio Sandbox");
    } else if (error.code === 21211 || error.message?.includes("Invalid 'To' Phone Number")) {
      // Invalid phone number format
      arabicError = "يرجى التأكد من رقم الهاتف المدخل.";
      console.error("[Twilio DEBUG] Invalid phone number format");
    } else if (error.code === 21608) {
      // The number is not currently reachable via WhatsApp
      arabicError = "رقم الهاتف غير متاح على واتساب. يرجى التحقق من الرقم.";
      console.error("[Twilio DEBUG] Phone number not reachable on WhatsApp");
    } else if (error.code === 20003 || error.code === 20404) {
      // Authentication error
      arabicError = "خدمة التحقق غير متاحة حالياً. يرجى المحاولة لاحقاً.";
      console.error("[Twilio DEBUG] Authentication error");
    } else if (error.code === 30007 || error.code === 30008) {
      // Message delivery failed
      arabicError = "فشل في تسليم الرسالة. يرجى التحقق من رقم الهاتف.";
      console.error("[Twilio DEBUG] Message delivery failed");
    } else if (error.message && error.message.includes("not a valid")) {
      // Generic invalid number message
      arabicError = "يرجى التأكد من رقم الهاتف المدخل.";
      console.error("[Twilio DEBUG] Invalid number format");
    }
    
    return {
      success: false,
      error: error.message || "Failed to send OTP",
      errorAr: arabicError
    };
  }
}

/**
 * Send WhatsApp text message using Twilio Messages API (for notifications)
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured");
  }
  
  const formattedPhone = formatIraqiPhoneForWhatsApp(phone);
  
  try {
    const client = getTwilioClient();
    if (!client) {
      throw new Error("Failed to initialize Twilio client");
    }
    
    const messageResponse = await client.messages.create({
      body: message,
      from: TWILIO_WHATSAPP_SANDBOX,
      to: formattedPhone
    });
    
    console.log("[Twilio WhatsApp] Message sent successfully");
    console.log("[Twilio DEBUG] Message SID:", messageResponse.sid);
    console.log("[Twilio DEBUG] Status:", messageResponse.status);
    
    return true;
  } catch (error: any) {
    console.error("[Twilio WhatsApp] Failed to send message:", error.message);
    console.error("[Twilio DEBUG] Error code:", error.code);
    return false;
  }
}

/**
 * Send congratulations message when bidding limit is increased
 */
export async function sendBiddingLimitIncreaseNotification(phone: string, newLimit: number): Promise<boolean> {
  const formattedLimit = new Intl.NumberFormat("ar-IQ").format(newLimit);
  const message = `🎉 تهانينا!\n\nلقد ارتفع حد الثقة الخاص بك إلى ${formattedLimit} د.ع بعد إكمال 10 عمليات شراء ناجحة.\n\nيمكنك الآن المزايدة على منتجات بقيمة أعلى!\n\nشكراً لثقتك في منصة eBey3 🛍️`;
  
  return await sendWhatsAppMessage(phone, message);
}

/**
 * Check if Twilio WhatsApp is properly configured
 * FORCE PRODUCTION MODE - Throws error if credentials are missing
 */
export function isWhatsAppConfigured(): boolean {
  const isConfigured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);
  
  if (!isConfigured) {
    const missingVars: string[] = [];
    if (!TWILIO_ACCOUNT_SID) missingVars.push("TWILIO_ACCOUNT_SID");
    if (!TWILIO_AUTH_TOKEN) missingVars.push("TWILIO_AUTH_TOKEN");
    
    const errorMsg = `[Twilio WhatsApp] PRODUCTION MODE REQUIRED: Missing environment variables: ${missingVars.join(", ")}. ` +
                     `Please set these in Replit Secrets.`;
    
    console.error(errorMsg);
    throw new Error(`Twilio not configured. Missing: ${missingVars.join(", ")}`);
  }
  
  return isConfigured;
}
