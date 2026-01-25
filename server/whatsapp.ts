/**
 * WhatsApp Business Cloud API Integration
 * Used for phone verification and notifications via Meta Cloud API
 */

import axios from "axios";

// Meta Cloud API Configuration (from Replit Secrets)
const WHATSAPP_API_VERSION = "v21.0";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WA_PHONE_ID; // WhatsApp Business Phone Number ID from Replit Secrets
const WHATSAPP_ACCOUNT_ID = process.env.WA_ACCOUNT_ID; // WhatsApp Business Account ID from Replit Secrets
const WHATSAPP_ACCESS_TOKEN = process.env.WA_TOKEN; // WhatsApp Access Token from Replit Secrets
const WHATSAPP_BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

/**
 * Format phone number for WhatsApp (must be in international format without +)
 * Example: 07501234567 -> 9647501234567
 */
function formatPhoneForWhatsApp(phone: string): string {
  let formatted = phone.replace(/\D/g, ""); // Remove all non-digits
  
  // If starts with 0, assume Iraq number and add country code
  if (formatted.startsWith("0")) {
    formatted = "964" + formatted.substring(1);
  }
  // If starts with +, remove it
  else if (formatted.startsWith("+")) {
    formatted = formatted.substring(1);
  }
  // If already has 964 prefix, keep as is
  
  return formatted;
}

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send WhatsApp OTP message for phone verification
 */
export async function sendWhatsAppOTP(phone: string, code: string): Promise<boolean> {
  // DEBUG: Verify credentials are being read
  console.log("[WhatsApp DEBUG] WA_PHONE_ID from process.env:", process.env.WA_PHONE_ID ? `${process.env.WA_PHONE_ID.substring(0, 8)}...` : "NOT SET");
  console.log("[WhatsApp DEBUG] WA_TOKEN configured:", !!process.env.WA_TOKEN);
  console.log("[WhatsApp DEBUG] WA_PHONE_NUMBER_ID constant:", WHATSAPP_PHONE_NUMBER_ID ? `${WHATSAPP_PHONE_NUMBER_ID.substring(0, 8)}...` : "NOT SET");
  
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.error("[WhatsApp] API credentials not configured. Please set WA_PHONE_ID and WA_TOKEN in Replit Secrets");
    return false;
  }
  
  console.log(`[WhatsApp] Using Phone ID: ${WHATSAPP_PHONE_NUMBER_ID?.substring(0, 8)}...`);
  console.log(`[WhatsApp] Token configured: ${!!WHATSAPP_ACCESS_TOKEN}`);

  const formattedPhone = formatPhoneForWhatsApp(phone);
  console.log(`[WhatsApp DEBUG] Formatted phone: ${formattedPhone}`);
  console.log(`[WhatsApp DEBUG] Request URL: ${WHATSAPP_BASE_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`);
  
  try {
    const response = await fetch(
      `${WHATSAPP_BASE_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "template",
          template: {
            name: "ebey3_auth_code", // Template must be pre-approved in Meta Business Manager
            language: {
              code: "ar", // Arabic
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: code,
                  },
                ],
              },
            ],
          },
        }),
      }
    );

    // FAIL-SAFE: Read as text first to avoid crash
    const rawText = await response.text();
    console.log("RAW META RESPONSE:", rawText);
    
    // Try to parse the JSON response
    let data;
    try {
      data = JSON.parse(rawText);
      console.log("[WhatsApp DEBUG] Successfully parsed JSON:", data);
    } catch (e) {
      console.error("JSON Parsing failed. The server sent back HTML instead of JSON.");
      console.error("[WhatsApp DEBUG] Parse error:", e);
      console.error("[WhatsApp DEBUG] This means Meta's API returned an error page, not JSON data.");
      return false;
    }

    // DEBUG: Log response details
    console.log("[WhatsApp DEBUG] Response status:", response.status);
    console.log("[WhatsApp DEBUG] Response OK:", response.ok);
    console.log("[WhatsApp DEBUG] Response Data:", data);
    
    // Success case
    if (response.ok && response.status >= 200 && response.status < 300) {
      console.log("[WhatsApp] OTP sent successfully");
      return true;
    }
    
    console.error("[WhatsApp] API returned non-success status:", response.status);
    return false;
  } catch (error: any) {
    console.error("[WhatsApp DEBUG] Error caught in catch block");
    console.error("[WhatsApp DEBUG] Error type:", error.constructor.name);
    console.error("[WhatsApp DEBUG] Error message:", error.message);
    console.error("[WhatsApp DEBUG] Full error:", error);
    
    console.error("[WhatsApp] Failed to send OTP:", error.message);
    return false;
  }
}

/**
 * Send WhatsApp text message (for notifications)
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  // FORCE PRODUCTION MODE - Throw error instead of silent failure
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    const missingVars: string[] = [];
    if (!WHATSAPP_PHONE_NUMBER_ID) missingVars.push("WA_PHONE_ID");
    if (!WHATSAPP_ACCESS_TOKEN) missingVars.push("WA_TOKEN");
    
    throw new Error(`WhatsApp API credentials not configured. Missing: ${missingVars.join(", ")}`);
  }

  const formattedPhone = formatPhoneForWhatsApp(phone);
  
  try {
    const response = await axios.post<WhatsAppMessageResponse>(
      `${WHATSAPP_BASE_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      },
      {
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("[WhatsApp] Message sent successfully:", response.data);
    return true;
  } catch (error: any) {
    console.error("[WhatsApp] Failed to send message:", error.response?.data || error.message);
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
 * Check if WhatsApp API is properly configured
 * FORCE PRODUCTION MODE - Throws error if credentials are missing
 */
export function isWhatsAppConfigured(): boolean {
  const isConfigured = !!(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN);
  
  if (!isConfigured) {
    const missingVars: string[] = [];
    if (!WHATSAPP_PHONE_NUMBER_ID) missingVars.push("WA_PHONE_ID");
    if (!WHATSAPP_ACCESS_TOKEN) missingVars.push("WA_TOKEN");
    
    const errorMsg = `[WhatsApp] PRODUCTION MODE REQUIRED: Missing environment variables: ${missingVars.join(", ")}. ` +
                     `Please set these in Replit Secrets. See ENVIRONMENT_VARIABLES_REQUIRED.md for details.`;
    
    console.error(errorMsg);
    throw new Error(`WhatsApp API not configured. Missing: ${missingVars.join(", ")}`);
  }
  
  return isConfigured;
}
