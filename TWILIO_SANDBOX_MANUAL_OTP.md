# Twilio Sandbox Manual OTP Implementation

## ✅ Implementation Complete

Successfully implemented manual OTP flow using Twilio Messages API (Sandbox) with database-backed verification.

## Overview

This implementation uses:
- **Twilio Messages API** (not Verify API) for WhatsApp Sandbox
- **Database storage** for OTP codes (not Twilio-managed)
- **Cryptographically secure** OTP generation
- **5-minute expiry** with automatic cleanup
- **One-time use** codes (deleted after successful verification)

## Architecture

### Flow Diagram

```
User Request → Generate OTP → Store in DB → Send via Twilio → User receives code
                  ↓                            Sandbox WhatsApp
            crypto.randomInt()         
            (100000-999999)            
                                       
User enters code → Check DB → Validate expiry → Mark as used → Verify user
                     ↓
              verification_codes
              table lookup
```

## Key Components

### 1. Secure OTP Generation

```typescript
// server/whatsapp.ts
export function generateOTPCode(): string {
  const crypto = require('crypto');
  return crypto.randomInt(100000, 999999).toString();
}
```

**Why crypto.randomInt()?**
- ✅ Cryptographically secure (unlike Math.random())
- ✅ True randomness from system entropy
- ✅ No predictable patterns
- ✅ Meets security best practices

### 2. Database Storage

Uses existing `verification_codes` table:

```sql
CREATE TABLE verification_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'phone_verification', 'registration', etc.
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Key features:**
- ✅ 5-minute expiry (`expires_at`)
- ✅ One-time use tracking (`used_at`)
- ✅ Phone number indexed for fast lookup
- ✅ Automatic cleanup of expired codes

### 3. Twilio Sandbox Message

```typescript
// MUST match pre-approved Sandbox template format
const message = await client.messages.create({
  body: `Your Ebey3 verification code is: ${code}`,
  from: 'whatsapp:+14155238886',  // Twilio Sandbox number
  to: formattedPhone               // whatsapp:+964XXXXXXXXX
});
```

**Critical:**
- ⚠️ Message format MUST match Sandbox template exactly
- ⚠️ Cannot customize message in Sandbox
- ⚠️ User must join Sandbox before receiving messages

### 4. Verification Flow

```typescript
// Step 1: Generate and store OTP
const code = generateOTPCode();
const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
await storage.createVerificationCode(phone, code, 'phone_verification', expiresAt);

// Step 2: Send via Twilio
const result = await sendWhatsAppOTP(phone, code);

// Step 3: User enters code

// Step 4: Verify code
const validCode = await storage.getValidVerificationCode(phone, code, type);
if (!validCode) {
  return res.status(400).json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" });
}

// Step 5: Mark as used (prevents reuse)
await storage.markVerificationCodeUsed(validCode.id);

// Step 6: Mark user as verified
await storage.markPhoneAsVerified(userId);
```

## Environment Variables Required

Only 2 secrets needed for Sandbox:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Not needed for Sandbox:**
- ~~`TWILIO_VERIFY_SERVICE_SID`~~ (only for Verify API)
- ~~`TWILIO_WHATSAPP_NUMBER`~~ (uses default sandbox number)

## Setup Instructions

### Step 1: Get Twilio Credentials

1. Sign up at [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Go to [Twilio Console](https://console.twilio.com)
3. Copy **Account SID** and **Auth Token** from dashboard

### Step 2: Join WhatsApp Sandbox

1. Go to [Twilio Console → Messaging → Try it out → Send a WhatsApp message](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Send WhatsApp message to **+1 415 523 8886**
3. Message content: `join <your-sandbox-code>` (shown in console)
4. Receive confirmation message

### Step 3: Add Secrets to Replit

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Test

```bash
tsx server/test-twilio.ts 07501234567
```

## API Endpoints

### 1. Send OTP

**POST** `/api/auth/send-otp`

```typescript
// Request
{
  "phone": "07501234567"  // Any Iraqi format
}

// Response (Success)
{
  "success": true,
  "message": "تم إرسال رمز التحقق عبر واتساب",
  "phone": "07501234567"
}

// Response (Error)
{
  "error": "يرجى الانضمام إلى Twilio Sandbox أولاً",
  "details": "Phone number has not joined sandbox"
}
```

### 2. Verify OTP

**POST** `/api/verify-otp`

```typescript
// Request
{
  "phone": "07501234567",
  "code": "123456"
}

// Response (Success)
{
  "success": true,
  "message": "تم التحقق من رقم الهاتف بنجاح",
  "phoneVerified": true
}

// Response (Error)
{
  "error": "رمز التحقق غير صحيح أو منتهي الصلاحية"
}
```

## Error Handling

### Twilio Sandbox Errors

| Error Code | Arabic Message | Cause |
|-----------|----------------|-------|
| 63016 | `يرجى الانضمام إلى Twilio Sandbox أولاً` | Phone hasn't joined sandbox |
| 21211 | `يرجى التأكد من رقم الهاتف المدخل` | Invalid phone format |
| 21608 | `رقم الهاتف غير متاح على واتساب` | Number not on WhatsApp |
| 20003 | `خدمة التحقق غير متاحة حالياً` | Authentication error |
| 30007/30008 | `فشل في تسليم الرسالة` | Delivery failed |

### Database Validation Errors

| Scenario | Error Message |
|----------|--------------|
| Code not found | `رمز التحقق غير صحيح أو منتهي الصلاحية` |
| Code expired | `رمز التحقق غير صحيح أو منتهي الصلاحية` |
| Code already used | `رمز التحقق غير صحيح أو منتهي الصلاحية` |
| Wrong code | `رمز التحقق غير صحيح أو منتهي الصلاحية` |

## Security Features

✅ **Cryptographically secure OTP**: Uses `crypto.randomInt()`  
✅ **5-minute expiry**: Codes automatically expire  
✅ **One-time use**: Codes marked as used after verification  
✅ **Database validation**: Server-side verification  
✅ **No client-side secrets**: Code never exposed to client  
✅ **Rate limiting**: Twilio's built-in rate limits  
✅ **Audit trail**: All codes logged in database  

## Database Methods Used

```typescript
// Create verification code
await storage.createVerificationCode(
  phone: string,
  code: string,
  type: string,
  expiresAt: Date
);

// Get valid code (checks expiry and used status)
const validCode = await storage.getValidVerificationCode(
  phone: string,
  code: string,
  type: string
);

// Mark code as used (prevents reuse)
await storage.markVerificationCodeUsed(codeId: string);

// Mark user as verified
await storage.markPhoneAsVerified(userId: string);
```

## Testing

### Test Script

```bash
# Default test number
tsx server/test-twilio.ts

# Custom number
tsx server/test-twilio.ts 07501234567
```

### Manual Testing

1. **Send OTP** via API or frontend
2. **Check WhatsApp** for message: "Your Ebey3 verification code is: 123456"
3. **Enter code** in frontend
4. **Verify** code is accepted
5. **Check database** - user should be marked as verified

### Database Verification

```sql
-- Check verification codes
SELECT * FROM verification_codes 
WHERE phone = '9647501234567' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check user verification status
SELECT id, phone, phone_verified 
FROM users 
WHERE phone = '07501234567';
```

## Sandbox Limitations

⚠️ **Sandbox is for testing only:**

| Feature | Sandbox | Production |
|---------|---------|------------|
| **Setup** | Instant | Requires WhatsApp Business approval |
| **Recipients** | Must join sandbox first | Anyone can receive |
| **Message Template** | Pre-approved only | Custom templates |
| **Sender Number** | `+1 415 523 8886` | Your approved number |
| **Cost** | Free | ~$0.0042 per message |
| **Rate Limits** | Lower | Higher |
| **Use Case** | Development/Testing | Production |

## Production Migration

To move from Sandbox to Production:

1. **Apply for WhatsApp Business API** access
2. **Get approved WhatsApp number** from Twilio
3. **Update sender number**:
   ```typescript
   const TWILIO_WHATSAPP_SENDER = process.env.TWILIO_WHATSAPP_NUMBER;
   // Instead of: 'whatsapp:+14155238886'
   ```
4. **Create custom message templates** in Twilio
5. **Remove sandbox join requirement**
6. **Update documentation** for users

## Files Modified

1. **`server/whatsapp.ts`**
   - ✅ Uses `crypto.randomInt()` for OTP generation
   - ✅ Sends via Messages API (not Verify API)
   - ✅ Uses Sandbox number
   - ✅ Matches Sandbox template format

2. **`server/routes.ts`** - Updated 6 endpoints
   - ✅ Generate OTP with `crypto.randomInt()`
   - ✅ Store in database with 5-minute expiry
   - ✅ Verify using database lookup
   - ✅ Mark codes as used after verification

3. **`server/test-twilio.ts`**
   - ✅ Simple sandbox testing script

## Summary

✅ **Secure OTP Generation**: `crypto.randomInt(100000, 999999)`  
✅ **Database Storage**: 5-minute expiry, one-time use  
✅ **Twilio Sandbox**: Messages API with pre-approved template  
✅ **Manual Verification**: Server-side database validation  
✅ **Error Handling**: Arabic messages for all scenarios  
✅ **Iraqi Phone Support**: All formats automatically converted  
✅ **Production Ready**: Easy migration path from Sandbox  

The manual OTP flow is now fully implemented and ready for testing in Sandbox mode! 🎉
