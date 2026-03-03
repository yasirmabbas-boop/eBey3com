# Quick Reference: WhatsApp API Setup

## Exact Environment Variable Names Required

```bash
WA_PHONE_ID     # ✅ REQUIRED - WhatsApp Business Phone Number ID
WA_TOKEN        # ✅ REQUIRED - WhatsApp Access Token
WA_ACCOUNT_ID   # ❌ Optional - WhatsApp Business Account ID
```

## How to Set in Replit

1. Click lock icon 🔒 (Tools → Secrets)
2. Add key: `WA_PHONE_ID` → value: `[your phone ID]`
3. Add key: `WA_TOKEN` → value: `[your token]`
4. Restart server

## How to Get These Values from Meta

### WA_PHONE_ID (Phone Number ID)
1. Go to Meta Business Manager
2. Navigate to WhatsApp → API Setup
3. Look for "Phone Number ID" under your phone number
4. Copy the number (example: `123456789012345`)

### WA_TOKEN (Access Token)
1. Go to Meta Business Manager
2. Navigate to System Users → Create/Select a System User
3. Generate Token with `whatsapp_business_messaging` permission
4. Copy the token (starts with `EAA...`)

## Template Required

- **Name**: `ebey3_auth_code` (must match exactly)
- **Language**: Arabic (ar)
- **Status**: APPROVED by Meta (not pending/rejected)
- **Parameters**: 1 body parameter for OTP code

## Test Commands

```bash
# Test WhatsApp connection
tsx server/test-whatsapp.ts 07501234567

# Check if credentials are loaded
echo "WA_PHONE_ID: $WA_PHONE_ID"
echo "WA_TOKEN: ${WA_TOKEN:0:20}..."
```

## What You'll See

### If credentials are missing:
```
❌ [WhatsApp] CRITICAL ERROR - Cannot send OTP: Missing environment variables: WA_PHONE_ID, WA_TOKEN
⚠️  Error: WhatsApp API credentials not configured. Missing: WA_PHONE_ID, WA_TOKEN
```

### If credentials are set but wrong:
```
RAW META RESPONSE: {"error":{"message":"Invalid OAuth access token","type":"OAuthException","code":190}}
```

### If template not approved:
```
RAW META RESPONSE: {"error":{"message":"Template ebey3_auth_code not found","type":"InvalidParameterException","code":132000}}
```

### If everything works:
```
RAW META RESPONSE: {"messaging_product":"whatsapp","contacts":[{"input":"9647501234567","wa_id":"9647501234567"}],"messages":[{"id":"wamid.xxxxx"}]}
✅ [WhatsApp] OTP sent successfully
```

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing: WA_PHONE_ID` | Secret not set | Add `WA_PHONE_ID` to Replit Secrets |
| `Missing: WA_TOKEN` | Secret not set | Add `WA_TOKEN` to Replit Secrets |
| `Invalid OAuth access token` | Token is wrong/expired | Generate new token in Meta Business Manager |
| `Template not found` | Template doesn't exist or not approved | Create/approve `ebey3_auth_code` template |
| `Invalid phone number` | Phone format wrong | Use format: `07501234567` or `9647501234567` |

## Production Mode Status

✅ **Production mode ENFORCED** - No mock mode available
✅ **Error throwing enabled** - Fails immediately if credentials missing
✅ **Raw response logging** - See exact Meta API response
✅ **Detailed error messages** - Know exactly what's wrong

## Documentation Files

- `ENVIRONMENT_VARIABLES_REQUIRED.md` - Full details on all environment variables
- `WHATSAPP_PRODUCTION_MODE.md` - Production mode implementation details
- `PHONE_VERIFICATION_TEST_GUIDE.md` - Testing instructions
- `server/test-whatsapp.ts` - Test script

## Next Action

Run the test command with your phone number and share the `RAW META RESPONSE` output!
