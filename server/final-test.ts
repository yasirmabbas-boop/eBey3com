import twilio from 'twilio';

// Use your Main Account SID (AC...) and Auth Token
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// The shared Sandbox number
const fromWhatsApp = 'whatsapp:+14155238886'; 

async function sendIraqiOTP(rawNumber: string) {
    // 1. Iraqi Formatter (075... -> +96475...)
    let clean = rawNumber.replace(/\D/g, '');
    if (clean.startsWith('00964')) clean = clean.substring(2);
    if (clean.startsWith('07')) clean = '964' + clean.substring(1);
    if (!clean.startsWith('964')) clean = '964' + clean;
    
    const toWhatsApp = `whatsapp:+${clean}`;
    const mockOTP = Math.floor(100000 + Math.random() * 900000);

    console.log(`🚀 Sending to: ${toWhatsApp}`);
    console.log(`🔑 Generated OTP: ${mockOTP}`);

    try {
        const message = await client.messages.create({
            // IMPORTANT: This exact phrase is pre-approved for Sandbox
            body: `Your Ebey3 code is ${mockOTP}`, 
            from: fromWhatsApp,
            to: toWhatsApp
        });

        console.log(`✅ SUCCESS! Message SID: ${message.sid}`);
        console.log(`📱 Check your WhatsApp now.`);
    } catch (error: any) {
        console.error(`❌ FAILED: ${error.message}`);
        if (error.code === 63015) {
            console.log("⚠️ ERROR: You haven't joined the sandbox yet!");
            console.log("👉 Send 'join <your-keyword>' to +1 415 523 8886 on WhatsApp first.");
        }
    }
}

const userPhone = process.argv[2] || "07510325610";
sendIraqiOTP(userPhone);
