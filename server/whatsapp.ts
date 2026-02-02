/**
 * WhatsApp Verification via VerifyWay API
 * Uses VerifyWay for WhatsApp OTP messaging
 * OTP codes are generated and managed by our application
 */

import axios from "axios";

const VERIFYWAY_TOKEN = process.env.VERIFYWAY_TOKEN;
const VERIFYWAY_API_URL = "https://api.verifyway.com/api/v1/";

/**
 * Normalize Iraqi phone number to international format (without + prefix)
 * 
 * @param phone - Phone number in any format
 * @returns Normalized phone number (e.g., "9647501234567")
 */
export function normalizeIraqiPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  
  if (cleaned.startsWith("07")) {
    cleaned = "964" + cleaned.substring(1);
  } else if (cleaned.startsWith("7") && cleaned.length === 10) {
    cleaned = "964" + cleaned;
  } else if (cleaned.startsWith("00964")) {
    cleaned = cleaned.substring(2);
  }
  
  return cleaned;
}

/**
 * Iraqi Phone Number Formatter for WhatsApp (legacy format with whatsapp: prefix)
 * Kept for backward compatibility with other parts of the codebase
 */
export function formatIraqiPhoneForWhatsApp(phone: string): string {
  const normalized = normalizeIraqiPhone(phone);
  return `whatsapp:+${normalized}`;
}

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send WhatsApp OTP using VerifyWay API
 * 
 * @param phone - Iraqi phone number in any format
 * @param code - 6-digit OTP code to send
 * @returns Object with success status and Arabic error message if failed
 */
export async function sendWhatsAppOTP(phone: string, code: string): Promise<{ success: boolean; error?: string; errorAr?: string }> {
  console.log("[VerifyWay] Sending OTP via WhatsApp...");
  console.log("[VerifyWay DEBUG] Original phone input:", phone);
  console.log("[VerifyWay DEBUG] OTP code:", code);
  console.log("[VerifyWay DEBUG] VERIFYWAY_TOKEN configured:", !!VERIFYWAY_TOKEN);
  
  if (!VERIFYWAY_TOKEN) {
    console.error("[VerifyWay] CRITICAL ERROR - Missing VERIFYWAY_TOKEN");
    return {
      success: false,
      error: "VerifyWay token not configured",
      errorAr: "خدمة التحقق غير متاحة حالياً. يرجى المحاولة لاحقاً."
    };
  }
  
  const formattedPhone = normalizeIraqiPhone(phone);
  console.log(`[VerifyWay DEBUG] Formatted phone: ${formattedPhone}`);
  
  try {
    const response = await axios.post(
      VERIFYWAY_API_URL,
      {
        recipient: formattedPhone,
        type: "otp",
        code: code,
        channel: "whatsapp"
      },
      {
        headers: {
          "Authorization": `Bearer ${VERIFYWAY_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    console.log("[VerifyWay] Response status:", response.status);
    console.log("[VerifyWay] Response data:", JSON.stringify(response.data));
    
    if (response.status === 200 || response.status === 201) {
      console.log("[VerifyWay] OTP sent successfully");
      return { success: true };
    } else {
      console.error("[VerifyWay] Unexpected response status:", response.status);
      return {
        success: false,
        error: "Unexpected response from VerifyWay",
        errorAr: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."
      };
    }
  } catch (error: any) {
    console.error("[VerifyWay] Error sending OTP:");
    console.error("[VerifyWay DEBUG] Error message:", error.message);
    console.error("[VerifyWay DEBUG] Error response data:", error.response?.data);
    console.error("[VerifyWay DEBUG] Error response status:", error.response?.status);
    
    let arabicError = "حدث خطأ في إرسال رمز التحقق. يرجى المحاولة مرة أخرى.";
    
    if (error.response?.status === 401) {
      arabicError = "خدمة التحقق غير متاحة حالياً. يرجى المحاولة لاحقاً.";
    } else if (error.response?.status === 400) {
      arabicError = "يرجى التأكد من رقم الهاتف المدخل.";
    } else if (error.response?.status === 429) {
      arabicError = "لقد طلبت الكثير من الرموز. يرجى الانتظار قليلاً.";
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.message || "Failed to send OTP",
      errorAr: arabicError
    };
  }
}

/**
 * Send WhatsApp text message using VerifyWay API (for notifications)
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  if (!VERIFYWAY_TOKEN) {
    console.error("[VerifyWay] Token not configured");
    return false;
  }
  
  const formattedPhone = normalizeIraqiPhone(phone);
  
  try {
    const response = await axios.post(
      VERIFYWAY_API_URL,
      {
        recipient: formattedPhone,
        type: "text",
        message: message,
        channel: "whatsapp"
      },
      {
        headers: {
          "Authorization": `Bearer ${VERIFYWAY_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    console.log("[VerifyWay] Message sent successfully");
    console.log("[VerifyWay DEBUG] Response:", response.data);
    
    return response.status === 200 || response.status === 201;
  } catch (error: any) {
    console.error("[VerifyWay] Failed to send message:", error.message);
    console.error("[VerifyWay DEBUG] Error response:", error.response?.data);
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
 * Check if VerifyWay is properly configured
 */
export function isWhatsAppConfigured(): boolean {
  const isConfigured = !!VERIFYWAY_TOKEN;
  
  if (!isConfigured) {
    console.error("[VerifyWay] VERIFYWAY_TOKEN not configured");
  }
  
  return isConfigured;
}

/**
 * Placeholder to satisfy the build
 * TODO: Implement real OTP verification logic
 */
export async function verifyWhatsAppOTP(phone: string, code: string): Promise<boolean> {
  console.log(`[MOCK] Verifying OTP for ${phone}: ${code}`);
  return true; // Return true to allow testing, or implement real logic later
}
