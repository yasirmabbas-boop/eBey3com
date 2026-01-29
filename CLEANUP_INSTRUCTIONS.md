# Database Cleanup Instructions

## Summary of Changes Made

### 1. ✅ Phone Uniqueness Enforcement (COMPLETED)
**File:** `server/otp-routes.ts`

- Added check in `/api/auth/verify-phone-otp` to prevent verifying a phone that's already registered to another account
- Returns 409 error with Arabic message: "هذا الرقم مسجل مسبقاً على حساب آخر"
- **Location:** Lines 199-204

### 2. ✅ Guest Checkout Disabled (COMPLETED)
**File:** `server/routes/transactions.ts`

- Disabled `/api/transactions/guest` endpoint
- Returns 410 error requiring authentication
- Legacy code commented out for reference
- **Location:** Lines 51-151

### 3. ✅ Database Cleanup Script Created (COMPLETED)
**File:** `server/scripts/cleanup-duplicate-phones.ts`

A comprehensive script that:
- **Analyzes** database for duplicate phone numbers
- **Identifies** which account to keep based on priority:
  1. Facebook-linked accounts (highest priority)
  2. Accounts with most activity (transactions, listings, bids)
  3. Most recently active accounts
- **Merges** duplicate accounts by transferring:
  - Transactions (as buyer)
  - Listings (as seller)
  - Bids
  - Watchlist items
- **Safely marks** old accounts as merged

## How to Run Database Cleanup

### Step 1: Analyze Only (Safe - No Changes)
```bash
npx tsx server/scripts/cleanup-duplicate-phones.ts --analyze
```

This will:
- Show all phone numbers with multiple accounts
- Display account details and activity counts
- Indicate which account will be kept (✓ KEEP) and which will merge (→ merge)
- **Makes NO changes to database**

### Step 2: Dry Run (Safe - Shows What Would Happen)
```bash
npx tsx server/scripts/cleanup-duplicate-phones.ts
```

This will:
- Perform analysis
- Show what merges would happen
- **Makes NO changes to database**

### Step 3: Live Run (⚠️ MAKES ACTUAL CHANGES)
```bash
npx tsx server/scripts/cleanup-duplicate-phones.ts --live
```

This will:
- Wait 5 seconds for confirmation (Ctrl+C to cancel)
- Actually merge duplicate accounts
- Transfer all data to primary accounts
- Mark old accounts as merged

**⚠️ IMPORTANT:** Make a database backup before running with `--live` flag!

## Verification Checklist

### ✅ All Purchase Paths Require Phone Verification:

1. **Cart Checkout** (`/api/checkout`)
   - ✅ Requires authentication
   - ✅ Requires `phoneVerified: true`
   - **File:** `server/routes/cart.ts:231-238`

2. **Buy Now** (Direct Purchase - Frontend)
   - ✅ Requires authentication via `requireAuth("buy")`
   - ✅ Guest checkout dialog removed
   - **File:** `client/src/pages/product.tsx:595-621`

3. **Guest Checkout** (`/api/transactions/guest`)
   - ✅ DISABLED - Returns 410 error
   - **File:** `server/routes/transactions.ts:51-56`

### ✅ All Bidding Paths Require Phone Verification:

1. **Place Bid** (`/api/listings/:id/bid`)
   - ✅ Requires authentication
   - ✅ Requires `phoneVerified: true`
   - **File:** `server/routes/products.ts:785-787`

## System Architecture

### Simple, Clear Rules:
1. **One Phone Number = One Account**
2. **No Guest Checkout** - All users must sign up
3. **Phone Verification Required** - For all purchases and bids
4. **Facebook Users** - Must verify phone before first purchase
5. **Phone Changes** - Blocked if another account has that phone

### Authentication Flow:
```
New User:
Sign Up → Verify Phone → Can Purchase/Bid

Facebook User:
Login with Facebook → Add Phone → Verify Phone → Can Purchase/Bid

Existing Phone User:
Login → Already Verified → Can Purchase/Bid
```

## Expected Results After Cleanup

After running the cleanup script with `--live`:

1. **Single Account Per Phone:** Each phone number will belong to only one active account
2. **Consolidated History:** All orders, listings, and bids will be under the primary account
3. **No Data Loss:** All transaction history preserved
4. **Clean Orders Display:** Users will see their complete purchase history
5. **Sellers Unaffected:** Seller view of orders remains unchanged

## Monitoring

After cleanup, verify:
- [ ] Users can see their order history
- [ ] No duplicate phone number errors when signing up
- [ ] Facebook users can verify their phone successfully
- [ ] All purchases require phone verification
- [ ] No guest checkouts are possible

## Rollback Plan

If issues occur:
1. Old accounts are marked as `[MERGED] displayName` but not deleted
2. Phone is set to `null` on merged accounts
3. To rollback: Manually restore phone numbers to original accounts
4. All transferred data (transactions, listings) can be re-assigned by `buyerId`/`sellerId` fields

## Notes

- The script prioritizes **Facebook-linked accounts** when choosing which account to keep
- Accounts with **no activity** are merged into accounts with activity
- **Most recent activity** is used as tiebreaker
- Guest checkout accounts created before this change will be merged into proper accounts with same phone
