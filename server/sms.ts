import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!client) {
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured");
    }
    client = twilio(accountSid, authToken);
  }
  return client;
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationSMS(
  phone: string,
  code: string,
  type: "registration" | "password_reset" | "login_2fa"
): Promise<boolean> {
  if (!twilioPhone) {
    console.error("TWILIO_PHONE_NUMBER not configured");
    return false;
  }

  // Format phone number for Iraq if needed
  let formattedPhone = phone;
  if (phone.startsWith("07")) {
    formattedPhone = "+964" + phone.substring(1);
  } else if (!phone.startsWith("+")) {
    formattedPhone = "+" + phone;
  }

  const messages: Record<string, string> = {
    registration: `رمز التحقق الخاص بك في E-بيع هو: ${code}\nصالح لمدة 10 دقائق.`,
    password_reset: `رمز إعادة تعيين كلمة المرور الخاص بك في E-بيع هو: ${code}\nصالح لمدة 10 دقائق.`,
    login_2fa: `رمز تسجيل الدخول الخاص بك في E-بيع هو: ${code}\nصالح لمدة 5 دقائق.`,
  };

  try {
    const twilioClient = getClient();
    await twilioClient.messages.create({
      body: messages[type],
      from: twilioPhone,
      to: formattedPhone,
    });
    console.log(`[SMS] Sent ${type} code to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
    return false;
  }
}

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && twilioPhone);
}
