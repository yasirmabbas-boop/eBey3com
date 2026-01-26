import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
// We use the Sandbox number directly, NOT the VA service SID
const sandboxNumber = 'whatsapp:+14155238886'; 

const client = twilio(accountSid, authToken);

async function testIraqiWhatsApp(rawNumber: string) {
    let formatted = rawNumber.replace(/\D/g, '');
    if (formatted.startsWith('00964')) formatted = formatted.substring(2);
    if (formatted.startsWith('07')) formatted = '964' + formatted.substring(1);
    if (!formatted.startsWith('964')) formatted = '964' + formatted;
    
    const finalNumber = `whatsapp:+${formatted}`;
    console.log(`🚀 Sending Sandbox Message to: ${finalNumber}`);

    try {
        const message = await client.messages.create({
            body: "Your Ebey3 code is 123456", // Pre-approved Sandbox template
            from: sandboxNumber,
            to: finalNumber
        });
        
        console.log(`✅ Success! Message SID: ${message.sid}`);
        console.log(`📱 Check your WhatsApp!`);
    } catch (error) {
        console.error(`❌ Twilio Error:`, error);
    }
}

const userNum = process.argv[2];
testIraqiWhatsApp(userNum || '07510325610');
