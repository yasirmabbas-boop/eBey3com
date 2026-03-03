# Twilio WhatsApp Verification Setup Guide

## ✅ Migration Complete: Meta → Twilio

The WhatsApp verification system has been migrated from Meta WhatsApp Business API to Twilio Verify service.

### Why Twilio?

✅ **Simpler**: No need to create or manage WhatsApp message templates  
✅ **Automatic OTP**: Twilio generates and manages OTP codes automatically  
✅ **Built-in Expiry**: OTP codes expire automatically (default: 10 minutes)  
✅ **Rate Limiting**: Built-in protection against spam  
✅ **Multi-channel**: Easy to add SMS fallback if needed  
✅ **No Approval Delays**: No waiting for Meta template approval

## Required Environment Variables

Add these **exact** variable names to Replit Secrets:

### 1. TWILIO_ACCOUNT_SID ✅ REQUIRED
- **What**: Your Twilio Account SID
- **Where to find**: Twilio Console → Account Info
- **Example**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Format**: Starts with `AC`

### 2. TWILIO_AUTH_TOKEN ✅ REQUIRED
- **What**: Your Twilio Auth Token
- **Where to find**: Twilio Console → Account Info → Auth Token
- **Example**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Security**: Keep this secret! It's like your password

### 3. TWILIO_VERIFY_SERVICE_SID ✅ REQUIRED
- **What**: Your Twilio Verify Service SID
- **Where to find**: Twilio Console → Verify → Services → [Your Service] → Service SID
- **Example**: `VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Format**: Starts with `VA`

### 4. TWILIO_WHATSAPP_NUMBER (Optional)
- **What**: Your Twilio WhatsApp sender number (only for custom notifications)
- **Default**: Uses Twilio sandbox number if not set
- **Format**: `whatsapp:+14155238886`

## Step-by-Step Setup

### Step 1: Create Twilio Account

1. Go to [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free trial account
3. Verify your email and phone number
4. You'll get **$15 free credit** to start

### Step 2: Get Your Account Credentials

1. Log in to [Twilio Console](https://console.twilio.com)
2. On the dashboard, find **Account Info**:
   - Copy **Account SID** (starts with AC)
   - Click "View" to reveal **Auth Token**, then copy it

### Step 3: Create a Verify Service

1. Go to **Verify** → **Services** in Twilio Console
2. Click **Create new Service**
3. Give it a name (e.g., "Ebey3 Phone Verification")
4. Click **Create**
5. Copy the **Service SID** (starts with VA)

### Step 4: Enable WhatsApp Channel

1. In your Verify Service, go to **Settings**
2. Under **Channels**, enable **WhatsApp**
3. For testing, you can use Twilio's sandbox
4. For production, you'll need to enable a Twilio WhatsApp number

### Step 5: Configure WhatsApp Sandbox (Testing)

1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow the instructions to join the sandbox from your phone
3. Send the join code to the Twilio WhatsApp number
4. Now you can receive test messages!

### Step 6: Add Secrets to Replit

1. In Replit, click the lock icon 🔒 (or Tools → Secrets)
2. Add these secrets:

```
Key: TWILIO_ACCOUNT_SID
Value: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Key: TWILIO_AUTH_TOKEN  
Value: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Key: TWILIO_VERIFY_SERVICE_SID
Value: VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. Click "Add new secret" after each one

### Step 7: Test the Integration

Run the test script:

```bash
tsx server/test-whatsapp.ts 07501234567
```

Replace `07501234567` with your Iraqi phone number that has joined the Twilio sandbox.

## How It Works

### Sending OTP

**Old (Meta):**
```javascript
const code = generateOTPCode(); // Generate manually
await sendWhatsAppOTP(phone, code); // Send with custom template
await storage.createVerificationCode(phone, code); // Store in database
```

**New (Twilio):**
```javascript
await sendWhatsAppOTP(phone); // Twilio generates and sends automatically!
// No manual code generation
// No database storage needed
// Twilio manages everything
```

### Verifying OTP

**Old (Meta):**
```javascript
const stored = await storage.getValidVerificationCode(phone, code);
if (!stored) return false;
await storage.markVerificationCodeUsed(stored.id);
```

**New (Twilio):**
```javascript
const isValid = await verifyWhatsAppOTP(phone, code);
// Twilio checks expiry, usage, and validity automatically
```

## API Changes

### Function Signatures

#### sendWhatsAppOTP()
```typescript
// OLD (Meta)
sendWhatsAppOTP(phone: string, code: string): Promise<boolean>

// NEW (Twilio)  
sendWhatsAppOTP(phone: string): Promise<boolean>
// Code parameter removed - Twilio generates it
```

#### New Function: verifyWhatsAppOTP()
```typescript
verifyWhatsAppOTP(phone: string, code: string): Promise<boolean>
// Returns true if code is valid, false otherwise
```

#### isWhatsAppConfigured()
```typescript
isWhatsAppConfigured(): boolean
// Now checks for Twilio credentials instead of Meta
// Throws error if credentials are missing
```

## Phone Number Format

Twilio requires E.164 format with `whatsapp:` prefix:

- Input: `07501234567` → Twilio format: `whatsapp:+9647501234567`
- Input: `+9647501234567` → Twilio format: `whatsapp:+9647501234567`
- Input: `9647501234567` → Twilio format: `whatsapp:+9647501234567`

The code handles this conversion automatically.

## Testing

### Test Command
```bash
tsx server/test-whatsapp.ts 07501234567
```

### Expected Output (Success)
```
✅ Configuration check passed!
📤 Sending OTP...
✅ SUCCESS! OTP sent successfully in 1234ms
📲 Check your WhatsApp for the verification code from Twilio
🔑 Enter the verification code you received: 123456
✅ VERIFICATION SUCCESS! Code verified in 567ms
🎉 Your Twilio WhatsApp Verify integration is working perfectly!
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing: TWILIO_ACCOUNT_SID` | Secret not set | Add to Replit Secrets |
| `Missing: TWILIO_AUTH_TOKEN` | Secret not set | Add to Replit Secrets |
| `Missing: TWILIO_VERIFY_SERVICE_SID` | Verify service not created | Create service in Twilio Console |
| `Invalid phone number` | Wrong format | Use format: 07501234567 or +9647501234567 |
| `To number is not a valid mobile number` | Phone not in sandbox | Join Twilio sandbox first for testing |
| `Authentication failed` | Wrong credentials | Double-check Account SID and Auth Token |
| `Service not found` | Wrong Verify SID | Copy correct Service SID from Verify service |

## Production Deployment

### For Production Use:

1. **Upgrade Twilio Account**: Remove trial restrictions
2. **Get WhatsApp Number**: Apply for a Twilio WhatsApp Business number
3. **Remove Sandbox**: Users won't need to join sandbox
4. **Set Budget Alerts**: Configure spending limits in Twilio Console

### Costs (as of 2024):

- **WhatsApp Verification**: ~$0.005 per verification
- **SMS Fallback** (optional): ~$0.0075 per SMS
- Very affordable for most use cases

## Removed Components

The following Meta WhatsApp components have been removed:

❌ `WA_PHONE_ID` environment variable  
❌ `WA_TOKEN` environment variable  
❌ `WA_ACCOUNT_ID` environment variable  
❌ `ebey3_auth_code` template  
❌ Manual OTP generation (`generateOTPCode`)  
❌ OTP database storage  
❌ Meta Graph API calls  
❌ Template approval process  

## Migration Checklist

- [x] Install Twilio SDK (already in package.json)
- [x] Rewrite `server/whatsapp.ts` to use Twilio
- [x] Update all routes to use new Twilio functions
- [x] Remove manual OTP generation
- [x] Remove OTP database storage logic
- [x] Update test script
- [x] Create documentation
- [ ] Set Twilio credentials in Replit Secrets
- [ ] Create Twilio Verify Service
- [ ] Test with real phone number
- [ ] Deploy to production

## Support

- **Twilio Docs**: https://www.twilio.com/docs/verify/api
- **Twilio Support**: https://support.twilio.com
- **WhatsApp Sandbox**: https://www.twilio.com/docs/whatsapp/sandbox

## Next Steps

1. **Add secrets** to Replit (see Step 6 above)
2. **Create Verify Service** in Twilio Console
3. **Join WhatsApp sandbox** for testing
4. **Run test script** to verify setup
5. **Test phone verification** in your app

Your phone verification system is now simpler, faster, and more reliable! 🎉
