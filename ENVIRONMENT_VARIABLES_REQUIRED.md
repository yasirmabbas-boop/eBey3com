# Required Environment Variables for Ebey3.com

## Critical: WhatsApp Business API Configuration

### Required in Replit Secrets:

1. **`WA_PHONE_ID`** (REQUIRED for phone verification)
   - WhatsApp Business Phone Number ID from Meta Business Manager
   - Example: `123456789012345`
   - How to get: Meta Business Manager → WhatsApp → Phone Numbers → Copy Phone Number ID
   - **Status**: ⚠️ MUST BE SET - System will throw error if missing

2. **`WA_TOKEN`** (REQUIRED for phone verification)
   - WhatsApp Business API Access Token from Meta Business Manager
   - Example: `EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (long string starting with EAA)
   - How to get: Meta Business Manager → System Users → Generate Token
   - **Status**: ⚠️ MUST BE SET - System will throw error if missing

3. **`WA_ACCOUNT_ID`** (OPTIONAL)
   - WhatsApp Business Account ID
   - Used for analytics and reporting
   - Not required for sending messages

### Template Required:

- **Template Name**: `ebey3_auth_code`
- **Language**: Arabic (ar)
- **Status**: Must be APPROVED by Meta
- **Content**: Should have 1 parameter placeholder for the OTP code

## Current Configuration in Code

The system looks for these exact environment variable names:

```typescript
// From server/whatsapp.ts
const WHATSAPP_PHONE_NUMBER_ID = process.env.WA_PHONE_ID;
const WHATSAPP_ACCOUNT_ID = process.env.WA_ACCOUNT_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WA_TOKEN;
```

## Delivery API Configuration (Separate System)

### Required in Replit Secrets:

1. **`DELIVERY_API_URL`** (OPTIONAL - has default)
   - URL for delivery partner API
   - Default: `https://api.delivery-partner.example.com`
   - **Status**: Currently in mock mode (not critical for phone verification)

2. **`DELIVERY_API_KEY`** (OPTIONAL)
   - API key for delivery partner
   - **Status**: If not set, delivery system runs in mock mode (not critical for phone verification)

## Database Configuration

**`DATABASE_URL`** (REQUIRED)
- PostgreSQL connection string
- Automatically provided by Replit
- Example: `postgresql://user:password@host:5432/database`

## Session Configuration

**`SESSION_SECRET`** (REQUIRED for authentication)
- Secret key for session encryption
- Should be a long random string
- Automatically generated or set by developer

## Facebook OAuth Configuration

**`FACEBOOK_APP_ID`** and **`FACEBOOK_APP_SECRET`** (OPTIONAL)
- For Facebook login integration
- Not required if not using Facebook login

## Status Summary

### ✅ Working (Confirmed)
- Database migrations (phone_verified column added)
- Schema definitions (phoneVerified field)
- API endpoints (/api/auth/send-otp, /api/verify-otp)
- Frontend components (MandatoryPhoneVerificationModal)
- Debug logging (RAW META RESPONSE)

### ⚠️ Needs Configuration
- `WA_PHONE_ID` - MUST be set in Replit Secrets
- `WA_TOKEN` - MUST be set in Replit Secrets
- `ebey3_auth_code` template - MUST be created and approved in Meta Business Manager

### 🔍 To Verify
1. Check Replit Secrets has `WA_PHONE_ID` and `WA_TOKEN`
2. Values should match your Meta Business Manager credentials
3. Template `ebey3_auth_code` must be approved (not pending)

## How to Update Secrets in Replit

1. Click the lock icon (🔒) in the left sidebar (or Tools → Secrets)
2. Add or update these keys:
   - Key: `WA_PHONE_ID` → Value: `[your phone number ID]`
   - Key: `WA_TOKEN` → Value: `[your access token]`
3. Click "Add new secret" to save
4. Restart your server for changes to take effect

## Testing After Configuration

Run this command to test WhatsApp connection:
```bash
tsx server/test-whatsapp.ts 07501234567
```

Replace `07501234567` with a real Iraqi WhatsApp number. You should receive an OTP message.

## Error Messages to Watch For

### "API credentials not configured"
**Cause**: `WA_PHONE_ID` or `WA_TOKEN` not set in Replit Secrets
**Fix**: Add both secrets and restart server

### "Template not found" or "Invalid template"
**Cause**: `ebey3_auth_code` template doesn't exist or isn't approved
**Fix**: Create and get approval for template in Meta Business Manager

### "Invalid phone number ID" or "WABA ID Mismatch"
**Cause**: `WA_PHONE_ID` doesn't match your WhatsApp Business Account
**Fix**: Copy the correct Phone Number ID from Meta Business Manager

### JSON Parsing error / HTML response
**Cause**: Meta API returning error page instead of JSON
**Fix**: Check the `RAW META RESPONSE` log for the specific error message
