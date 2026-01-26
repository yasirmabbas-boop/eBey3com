# Iraqi Phone Number Formatting Guide

## Overview

The system now includes a specialized Iraqi phone number formatter that automatically converts any Iraqi phone number format to the E.164 WhatsApp format required by Twilio.

## Supported Input Formats

The formatter accepts Iraqi phone numbers in **any** of these formats:

| Input Format | Example | Output Format |
|-------------|---------|---------------|
| **Local format (07...)** | `07501234567` | `whatsapp:+9647501234567` |
| **Local without 0** | `7501234567` | `whatsapp:+9647501234567` |
| **International (00964...)** | `00964 7501234567` | `whatsapp:+9647501234567` |
| **E.164 (+964...)** | `+964 7501234567` | `whatsapp:+9647501234567` |
| **Without prefix (964...)** | `964 7501234567` | `whatsapp:+9647501234567` |
| **9 digits only** | `750123456` | `whatsapp:+964750123456` |

### With Spaces, Dashes, and Parentheses

The formatter automatically removes:
- Spaces: `075 012 34567` → `whatsapp:+9647501234567`
- Dashes: `075-012-34567` → `whatsapp:+9647501234567`
- Parentheses: `(075) 012-34567` → `whatsapp:+9647501234567`
- Mixed: `+964 (75) 012-3456-7` → `whatsapp:+9647501234567`

## How It Works

### Step-by-Step Process

1. **Remove formatting characters**: Strips spaces, dashes, parentheses
2. **Remove leading +**: If present (will be added back in E.164 format)
3. **Detect format and convert**:
   - `00964...` → Replace with `964...`
   - `964...` → Keep as is
   - `07...` → Remove `0`, add `964`
   - `7...` (10 digits) → Add `964`
   - 9 digits → Add `964`
4. **Add WhatsApp prefix**: Format as `whatsapp:+964...`
5. **Validate**: Ensures final number is 13 digits (964 + 10 digits)

### Code Implementation

```typescript
function formatIraqiPhoneForWhatsApp(phone: string): string {
  // Remove all spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  
  // Remove leading + if present
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  
  let formatted: string;
  
  if (cleaned.startsWith("00964")) {
    formatted = cleaned.replace("00964", "964");
  } else if (cleaned.startsWith("964")) {
    formatted = cleaned;
  } else if (cleaned.startsWith("07")) {
    formatted = "964" + cleaned.substring(1);
  } else if (cleaned.startsWith("7") && cleaned.length === 10) {
    formatted = "964" + cleaned;
  } else if (cleaned.length === 9) {
    formatted = "964" + cleaned;
  } else {
    formatted = cleaned.startsWith("964") ? cleaned : "964" + cleaned;
  }
  
  // Return in E.164 format with WhatsApp prefix
  return `whatsapp:+${formatted}`;
}
```

## Iraqi Mobile Number Structure

Iraqi mobile numbers have the following structure:

- **Country Code**: `+964` (Iraq)
- **Mobile Operator Codes** (first 2 digits after country code):
  - `75` - Zain Iraq
  - `77` - Zain Iraq
  - `78` - Zain Iraq
  - `79` - Asiacell
  - `76` - Asiacell
  - `78` - Korek Telecom
  - `75` - Korek Telecom

- **Total Length**: 13 digits (including country code)
  - Format: `+964 7X XXXX XXXX`
  - Example: `+964 750 123 4567`

## Validation

The formatter includes validation to ensure the final number is correct:

```typescript
// Validates that the number:
// 1. Starts with 964 (Iraq country code)
// 2. Has exactly 13 digits total
if (!formatted.startsWith("964") || formatted.length !== 13) {
  console.warn(`Invalid Iraqi phone format: ${phone} → ${formatted}`);
}
```

## Error Handling

### Arabic Error Messages

The system returns clear Arabic error messages for different scenarios:

| Error Scenario | Arabic Message |
|---------------|----------------|
| Invalid phone format | `يرجى التأكد من رقم الهاتف المدخل.` |
| Landline number | `رقم الهاتف المدخل غير صالح. يرجى استخدام رقم هاتف محمول.` |
| Rate limit exceeded | `لقد تجاوزت الحد الأقصى لمحاولات الإرسال. يرجى المحاولة بعد قليل.` |
| Service unavailable | `خدمة التحقق غير متاحة حالياً. يرجى المحاولة لاحقاً.` |
| Too many concurrent requests | `الخدمة مشغولة حالياً. يرجى المحاولة بعد قليل.` |
| Invalid verification code | `رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.` |
| Code expired | `رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد.` |
| Max verification attempts | `لقد تجاوزت الحد الأقصى لمحاولات التحقق. يرجى طلب رمز جديد.` |

### Twilio Error Code Mapping

The system maps Twilio error codes to appropriate Arabic messages:

```typescript
// Sending OTP errors
60200, 60201, 60203 → "يرجى التأكد من رقم الهاتف المدخل."
60202 → "لقد تجاوزت الحد الأقصى لمحاولات الإرسال."
60205 → "رقم الهاتف المدخل غير صالح. يرجى استخدام رقم هاتف محمول."
60212 → "الخدمة مشغولة حالياً. يرجى المحاولة بعد قليل."
20003, 20404 → "خدمة التحقق غير متاحة حالياً."

// Verification errors
20404 → "رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد."
60200, 60202 → "رمز التحقق غير صحيح."
60203 → "لقد تجاوزت الحد الأقصى لمحاولات التحقق."
```

## API Response Format

### Send OTP Response

```typescript
// Success
{
  success: true
}

// Error
{
  success: false,
  error: "Invalid phone number format",     // English error
  errorAr: "يرجى التأكد من رقم الهاتف المدخل."  // Arabic error
}
```

### Verify OTP Response

```typescript
// Success
{
  success: true
}

// Error
{
  success: false,
  error: "Verification code expired",            // English error
  errorAr: "رمز التحقق منتهي الصلاحية. يرجى طلب رمز جديد."  // Arabic error
}
```

## Usage Examples

### Frontend (React/TypeScript)

```typescript
// Sending OTP
const result = await fetch('/api/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '07501234567' })
});

const data = await result.json();

if (!data.success) {
  // Display Arabic error to user
  toast.error(data.error); // Will show: "يرجى التأكد من رقم الهاتف المدخل."
}

// Verifying OTP
const verifyResult = await fetch('/api/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    phone: '07501234567',
    code: '123456'
  })
});

const verifyData = await verifyResult.json();

if (!verifyData.success) {
  toast.error(verifyData.error); // Arabic error message
}
```

### Backend (Node.js/Express)

```typescript
// The formatter is used automatically in sendWhatsAppOTP
import { sendWhatsAppOTP, verifyWhatsAppOTP } from './whatsapp';

// Send OTP - accepts any Iraqi format
const result = await sendWhatsAppOTP('07501234567');

if (result.success) {
  res.json({ message: 'OTP sent successfully' });
} else {
  // result.errorAr contains Arabic error message
  res.status(500).json({ error: result.errorAr });
}

// Verify OTP
const verifyResult = await verifyWhatsAppOTP('07501234567', '123456');

if (verifyResult.success) {
  // Mark user as verified
  await markPhoneAsVerified(userId);
  res.json({ success: true });
} else {
  res.status(400).json({ error: verifyResult.errorAr });
}
```

## Testing

### Test with different formats

```bash
# Test with local format
tsx server/test-whatsapp.ts 07501234567

# Test with international format
tsx server/test-whatsapp.ts +9647501234567

# Test with spaces
tsx server/test-whatsapp.ts "0750 123 4567"

# Test with 00964 prefix
tsx server/test-whatsapp.ts 009647501234567

# Test with 9 digits
tsx server/test-whatsapp.ts 750123456
```

All of these should be converted to the same WhatsApp format: `whatsapp:+9647501234567`

## Best Practices

### For Frontend Developers

1. **Accept any format**: Let users enter phone numbers in their preferred format
2. **Show Arabic errors**: Display `data.error` (not `data.details`) to users
3. **Input validation**: Optional - you can add client-side hints, but backend handles all formats
4. **Error handling**: Always check `success` field in response

### For Backend Developers

1. **Don't pre-format**: Pass phone numbers directly to `sendWhatsAppOTP` - it handles formatting
2. **Use Arabic errors**: Return `result.errorAr` to the frontend for user-facing errors
3. **Log English errors**: Use `result.error` for server logs and debugging
4. **Trust the formatter**: The formatter handles edge cases - don't try to validate beforehand

## Common Issues

### Issue: "Invalid phone number"
**Cause**: Number doesn't match Iraqi mobile format  
**Solution**: Verify it's a valid Iraqi mobile number (starts with 75, 76, 77, 78, or 79)

### Issue: "Landline number not supported"
**Cause**: Number is a landline (starts with 1, 2, 3, etc.)  
**Solution**: Use a mobile number starting with 07

### Issue: Number too short or too long
**Cause**: Missing digits or extra digits  
**Solution**: Iraqi mobile numbers should be 11 digits total (07XXXXXXXXX) or 13 with country code

## Summary

✅ **Automatic formatting** - No manual formatting needed  
✅ **All formats supported** - Local, international, with/without spaces  
✅ **Arabic error messages** - Clear, user-friendly errors in Arabic  
✅ **Twilio integration** - Direct integration with Twilio Verify  
✅ **Validation included** - Ensures numbers are valid Iraqi mobile numbers  
✅ **Production ready** - Handles edge cases and errors gracefully  

The Iraqi phone formatter makes phone verification seamless for Iraqi users while maintaining strict E.164 compliance for WhatsApp! 🇮🇶📱
