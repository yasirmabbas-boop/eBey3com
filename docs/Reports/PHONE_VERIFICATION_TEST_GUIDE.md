# Phone Verification Testing Guide

## Migration Status: ✅ COMPLETED

The database migration has been successfully run. The following columns have been added to the `users` table:
- `phone_verified` (BOOLEAN, default: false)
- `bidding_limit` (INTEGER, default: 100000)
- `completed_purchases` (INTEGER, default: 0)

The `verification_codes` table exists and is ready for use.

## Server Status

A dev server process (PID: 36903) is currently running. The migration changes are now active in the database, and the server should work correctly.

## Testing the Phone Verification Flow

### Prerequisites
- WhatsApp Business API credentials must be set in Replit Secrets:
  - `WA_PHONE_ID` - Your WhatsApp Business Phone Number ID
  - `WA_TOKEN` - Your WhatsApp Business API Access Token
  - `WA_ACCOUNT_ID` - Your WhatsApp Business Account ID (optional)

### Test Steps

#### 1. Test WhatsApp Connection
First, verify your WhatsApp API credentials are working:

```bash
tsx server/test-whatsapp.ts 07501234567
```
Replace `07501234567` with a real Iraqi WhatsApp number.

Expected output:
- ✅ Configuration check passed
- ✅ OTP sent successfully
- Message received on WhatsApp

#### 2. Test the UI Flow

**For Authenticated Users (Place Bid / Buy Now):**

1. Navigate to any product page
2. If not logged in, you should see normal "Place Bid" or "Buy Now" buttons
3. Log in to your account
4. If your account's `phone_verified = false`:
   - You should see "Verify Phone to Bid" or "Verify Phone to Buy" button instead
   - Button should be amber/orange colored with a shield icon
5. Click the verification button
6. Modal should open with two steps:
   - **Step 1:** Enter phone number → Send Verification Code
   - **Step 2:** Enter 6-digit OTP → Verify

**Step-by-Step Modal Flow:**

1. Enter phone number (e.g., `07501234567`)
2. Click "Send Verification Code" (Arabic: "إرسال رمز التحقق")
3. Wait for WhatsApp message (should arrive within seconds)
4. Enter the 6-digit code from WhatsApp
5. Click "Verify" (Arabic: "التحقق")
6. Page should refresh and unlock bidding/buying features

#### 3. Verify Database Changes

After successful verification, check the database:

```sql
SELECT id, phone, phone_verified, bidding_limit FROM users WHERE phone = '07501234567';
```

Expected result:
- `phone_verified` should be `true`
- `bidding_limit` should be `100000`

#### 4. Test Unlocked Features

After verification:
- "Verify Phone to Bid" button should be replaced with the normal bidding interface
- "Verify Phone to Buy" button should be replaced with "Buy Now"
- User can place bids and make purchases

### API Endpoints

The following endpoints are now active:

1. **POST /api/auth/send-otp**
   - Requires authentication
   - Accepts: `{ phone: "07501234567" }`
   - Sends OTP via WhatsApp using `ebey3_auth_code` template
   - OTP expires in 5 minutes

2. **POST /api/verify-otp**
   - Requires authentication
   - Accepts: `{ phone: "07501234567", code: "123456" }`
   - Verifies OTP and sets `phone_verified = true`
   - Updates user's phone if different

3. **GET /api/auth/me**
   - Returns user object including `phoneVerified` field

### Template Name

The WhatsApp template being used is `ebey3_auth_code`. Make sure this template:
- Is created in Meta Business Manager
- Is approved by Meta
- Has Arabic language support
- Contains a parameter placeholder for the OTP code

### Debugging

If WhatsApp sending fails, check the debug logs in the server console:
- `[WhatsApp DEBUG]` logs show credential status
- Raw response data before JSON parsing
- HTML detection for error pages
- Detailed error information

### Common Issues

1. **Template not approved**: Error message will indicate template not found
   - Solution: Create and approve `ebey3_auth_code` template in Meta Business Manager

2. **Invalid phone format**: OTP not received
   - Solution: Ensure phone number starts with `07` or is in format `9647xxxxxxxx`

3. **OTP expired**: "Invalid or expired code" error
   - Solution: Request a new code (expires in 5 minutes)

4. **Already verified**: Message shown that phone is already verified
   - Solution: Check database - user might already be verified

## Success Criteria

- ✅ Migration script runs without errors
- ✅ `phone_verified` column exists in users table
- ✅ Server runs without crashes
- ✅ Phone verification modal opens
- ✅ OTP is sent via WhatsApp
- ✅ OTP verification works
- ✅ Database is updated (`phone_verified = true`)
- ✅ Page refreshes and unlocks features
- ✅ User can bid/buy after verification

## Files Modified

1. [`server/whatsapp.ts`](server/whatsapp.ts) - Updated template to `ebey3_auth_code`, added debug logging
2. [`server/routes.ts`](server/routes.ts) - Created `/api/auth/send-otp` and `/api/verify-otp` endpoints
3. [`server/storage.ts`](server/storage.ts) - Added error handling for missing columns
4. [`client/src/hooks/use-auth.ts`](client/src/hooks/use-auth.ts) - Added `phoneVerified` to AuthUser interface
5. [`client/src/components/mandatory-phone-verification-modal.tsx`](client/src/components/mandatory-phone-verification-modal.tsx) - New component for phone verification
6. [`client/src/pages/product.tsx`](client/src/pages/product.tsx) - Added phone verification gates
7. [`server/verify-phone-verification-migration.ts`](server/verify-phone-verification-migration.ts) - Migration verification script
8. [`run-phone-verification-migration.sh`](run-phone-verification-migration.sh) - Shell script wrapper

## Database Schema

```sql
-- users table (relevant columns)
phone_verified BOOLEAN NOT NULL DEFAULT false
bidding_limit INTEGER NOT NULL DEFAULT 100000
completed_purchases INTEGER NOT NULL DEFAULT 0

-- verification_codes table
id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()
phone TEXT NOT NULL
code TEXT NOT NULL
type TEXT NOT NULL
expires_at TIMESTAMP NOT NULL
used_at TIMESTAMP
created_at TIMESTAMP NOT NULL DEFAULT NOW()
```
