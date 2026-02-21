# Required Environment Variables for Ebey3.com

## ✅ UPDATED: Now Using Twilio WhatsApp Verify

**Migration Complete**: System has been migrated from Meta WhatsApp Business API to Twilio Verify service.

### Required (env vars / Secret Manager):

1. **`TWILIO_ACCOUNT_SID`** (REQUIRED for phone verification)
   - Your Twilio Account SID
   - Example: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - How to get: Twilio Console → Account Info → Account SID
   - Format: Starts with `AC`
   - **Status**: ⚠️ MUST BE SET - System will throw error if missing

2. **`TWILIO_AUTH_TOKEN`** (REQUIRED for phone verification)
   - Your Twilio Auth Token
   - Example: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (32 characters)
   - How to get: Twilio Console → Account Info → Auth Token (click "View" to reveal)
   - Security: Keep this secret!
   - **Status**: ⚠️ MUST BE SET - System will throw error if missing

3. **`TWILIO_VERIFY_SERVICE_SID`** (REQUIRED for phone verification)
   - Your Twilio Verify Service SID
   - Example: `VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - How to get: Twilio Console → Verify → Services → [Your Service] → Service SID
   - Format: Starts with `VA`
   - **Status**: ⚠️ MUST BE SET - System will throw error if missing

4. **`TWILIO_WHATSAPP_NUMBER`** (OPTIONAL)
   - Your Twilio WhatsApp sender number (for custom notifications)
   - Example: `whatsapp:+14155238886`
   - Default: Uses Twilio sandbox if not set
   - Only needed for sending custom messages

### ❌ OLD (Meta - No Longer Needed):

These environment variables are **no longer used** and can be removed:

- ~~`WA_PHONE_ID`~~ - WhatsApp Business Phone Number ID
- ~~`WA_TOKEN`~~ - WhatsApp Access Token
- ~~`WA_ACCOUNT_ID`~~ - WhatsApp Business Account ID
- ~~`ebey3_auth_code` template~~ - No longer needed (Twilio uses built-in templates)

## Current Configuration in Code

The system now looks for these exact environment variable names:

```typescript
// From server/whatsapp.ts (Updated to Twilio)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;
```

## Delivery API Configuration (Separate System)

### Required (env vars / Secret Manager):

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
- Set per your hosting platform (e.g. Cloud Run Secret Manager)
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
- `WA_PHONE_ID` - MUST be set in env vars
- `WA_TOKEN` - MUST be set in env vars
- `ebey3_auth_code` template - MUST be created and approved in Meta Business Manager

### 🔍 To Verify
1. Check env vars have `WA_PHONE_ID` and `WA_TOKEN`
2. Values should match your Meta Business Manager credentials
3. Template `ebey3_auth_code` must be approved (not pending)

## How to Update Secrets / Environment Variables

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
**Cause**: `WA_PHONE_ID` or `WA_TOKEN` not set in environment
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
