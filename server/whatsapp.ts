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
    const response = await axios.post(
      `${WHATSAPP_BASE_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
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
      },
      {
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        // DEBUG: Capture raw response before JSON parsing
        transformResponse: [(data) => {
          console.log("[WhatsApp DEBUG] Raw Response String (before parsing):", data);
          console.log("[WhatsApp DEBUG] Response String Length:", data?.length);
          console.log("[WhatsApp DEBUG] Response Starts With:", data?.substring(0, 100));
          
          // Check if response is HTML (error page)
          if (typeof data === 'string' && (data.trim().startsWith('<!DOCTYPE') || data.trim().startsWith('<html'))) {
            console.error("[WhatsApp DEBUG] ⚠️ RESPONSE IS HTML (not JSON)! This usually means an error page from Meta.");
            console.error("[WhatsApp DEBUG] Full HTML Response:", data);
            // Don't parse, return as string so we can see it
            return data;
          }
          
          // Try to parse JSON manually
          try {
            const parsed = JSON.parse(data);
            console.log("[WhatsApp DEBUG] Successfully parsed JSON:", parsed);
            return parsed;
          } catch (parseError) {
            console.error("[WhatsApp DEBUG] Failed to parse JSON:", parseError);
            console.error("[WhatsApp DEBUG] Raw data that failed to parse:", data);
            return data; // Return raw data
          }
        }],
      }
    );

    // DEBUG: Log response details
    console.log("[WhatsApp DEBUG] Response status:", response.status);
    console.log("[WhatsApp DEBUG] Response headers:", JSON.stringify(response.headers, null, 2));
    console.log("[WhatsApp DEBUG] Response Data:", response.data);
    console.log("[WhatsApp DEBUG] Response Data Type:", typeof response.data);
    
    // Check if response is HTML (shouldn't happen if transformResponse worked)
    if (typeof response.data === 'string' && (response.data.trim().startsWith('<!DOCTYPE') || response.data.trim().startsWith('<html'))) {
      console.error("[WhatsApp DEBUG] ⚠️ Response data is HTML! Full HTML:", response.data);
      return false;
    }
    
    // Success case
    if (response.status >= 200 && response.status < 300) {
      console.log("[WhatsApp] OTP sent successfully");
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error("[WhatsApp DEBUG] Error caught in catch block");
    console.error("[WhatsApp DEBUG] Error type:", error.constructor.name);
    console.error("[WhatsApp DEBUG] Error message:", error.message);
    
    // Log raw error response if available
    if (error.response) {
      console.error("[WhatsApp DEBUG] Error response status:", error.response.status);
      console.error("[WhatsApp DEBUG] Error response headers:", JSON.stringify(error.response.headers, null, 2));
      console.error("[WhatsApp DEBUG] Error response data (raw):", error.response.data);
      console.error("[WhatsApp DEBUG] Error response data type:", typeof error.response.data);
      
      // Check if error response is HTML
      const errorData = error.response.data;
      if (typeof errorData === 'string' && (errorData.trim().startsWith('<!DOCTYPE') || errorData.trim().startsWith('<html'))) {
        console.error("[WhatsApp DEBUG] Error response is HTML! Full HTML:", errorData);
      }
    }
    
    console.error("[WhatsApp] Failed to send OTP:", error.response?.data || error.message);
    return false;
  }
}

/**
 * Send WhatsApp text message (for notifications)
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.error("[WhatsApp] API credentials not configured. Please set WA_PHONE_ID and WA_TOKEN in Replit Secrets");
    return false;
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
 */
export function isWhatsAppConfigured(): boolean {
  return !!(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN);
}
