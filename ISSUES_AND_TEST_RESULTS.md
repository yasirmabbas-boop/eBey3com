# E-بيع Platform - Issues Identified & Test Results

**Date:** January 31, 2026  
**Status:** Issues Documented - Ready for Fix

---

## Quick Summary

| Issue | Severity | Status | Location |
|-------|----------|--------|----------|
| Order Placement Failure | 🔴 Critical | Identified | `server/routes/cart.ts` |
| Seller Name "Unknown" | 🔴 Critical | Identified | `server/routes/cart.ts:59` |
| Auth Token Expiration | 🔴 Critical | Identified | `server/replit_integrations/auth/routes.ts:231` |
| Auction Extension (2 vs 5 min) | 🟡 Medium | Verified Correct | `server/routes/products.ts:909` |
| Commission Rate (8% → 5%) | 🟡 Medium | Ready to Change | `server/services/financial-service.ts:10` |
| Returns System Gaps | 🟡 Medium | Documented | `server/routes/transactions.ts:577+` |

---

## 1. Auction Extension Verification ✅

### Current Implementation
**File:** `server/routes/products.ts` (lines 905-916)

```typescript
const timeRemaining = endTime.getTime() - now.getTime();
const twoMinutes = 2 * 60 * 1000;

if (timeRemaining < twoMinutes && timeRemaining > 0) {
  // Extend by 2 minutes from now
  newEndTime = new Date(now.getTime() + twoMinutes);
  await storage.updateListing(listingId, { 
    auctionEndTime: newEndTime 
  });
}
```

### Test Results
✅ **Code is CORRECT** - Extends by 2 minutes when bid placed in last 2 minutes

### Verification Needed
- [ ] Test in production to ensure behavior matches code
- [ ] Check for caching issues that might show old extension times
- [ ] Verify WebSocket messages show correct extension time

### Action Required
- Add logging to track extension events:
```typescript
if (timeRemaining < twoMinutes && timeRemaining > 0) {
  newEndTime = new Date(now.getTime() + twoMinutes);
  console.log(`[Auction Extension] Listing ${listingId}: Extended by 2 minutes. Old: ${endTime.toISOString()}, New: ${newEndTime.toISOString()}`);
  await storage.updateListing(listingId, { 
    auctionEndTime: newEndTime 
  });
}
```

---

## 2. Commission Reduction (8% → 5%) ✅

### Current Implementation
**File:** `server/services/financial-service.ts`

```typescript
const COMMISSION_RATE = 0.08; // 8% commission after free sales
const FREE_SALES_PER_MONTH = 15;
```

### Required Changes

#### Change 1: Update Commission Rate
**File:** `server/services/financial-service.ts:10`
```typescript
// OLD:
const COMMISSION_RATE = 0.08; // 8% commission after free sales

// NEW:
const COMMISSION_RATE = 0.05; // 5% commission after free sales
```

#### Change 2: Update Commission Description
**File:** `server/services/financial-service.ts:133`
```typescript
// OLD:
description: `عمولة 8% - طلب #${transactionId.slice(0, 8)}`,

// NEW:
description: `عمولة 5% - طلب #${transactionId.slice(0, 8)}`,
```

#### Change 3: Update Terms Page
**File:** `client/src/pages/terms.tsx`
- Update commission text from "8%" to "5%"

#### Change 4: Update Comments
**File:** `server/routes/transactions.ts:245`
```typescript
// OLD:
// Create wallet settlement for the seller (free 15 sales or 8% commission)

// NEW:
// Create wallet settlement for the seller (free 15 sales or 5% commission)
```

### Impact Analysis
- **Revenue Impact:** 37.5% reduction in commission revenue
- **Competitive Position:** More competitive vs eBay (5% vs 10-12%)
- **Seller Attraction:** Should increase seller adoption

### Testing Required
- [ ] Verify commission calculation with new rate
- [ ] Test free sales counter still works
- [ ] Verify monthly reset logic
- [ ] Check seller dashboard displays correct commission

---

## 3. Returns System Gap Analysis

### Current Implementation Review

**Strengths:**
- ✅ Return request creation works
- ✅ Seller can approve/reject returns
- ✅ Return policy time limits enforced
- ✅ Quality issue exceptions (damaged, wrong item)

**Gaps Identified:**

#### Gap 1: Return Status Workflow Missing
**Current:** Only `status` field (pending, approved, rejected)
**Needed:** Full workflow states
```
pending → seller_approved → return_shipped → return_received → refunded
pending → seller_rejected → (buyer appeal option)
```

**Impact:** Can't track return progress

#### Gap 2: No Return Shipping Integration
**Current:** Manual return shipping
**Needed:** Integration with delivery service API

**Impact:** No tracking, manual status updates

#### Gap 3: No Auto-Refund
**Current:** Manual refund processing
**Needed:** Auto-refund after return received + 2-3 day verification

**Impact:** Delayed refunds, manual errors

#### Gap 4: Missing Return Analytics
**Current:** No tracking of return reasons
**Needed:** Analytics dashboard for return patterns

**Impact:** Can't identify problematic sellers/products

#### Gap 5: Return Window Not Displayed
**Current:** Buyers don't see remaining return window
**Needed:** Show "X days remaining" on purchase page

**Impact:** Confusion about eligibility

#### Gap 6: No Partial Refund Support
**Current:** Only full refunds
**Needed:** Partial refunds for multi-item orders

**Impact:** Can't handle partial returns

### Priority Actions
1. **High Priority:** Add return status workflow
2. **High Priority:** Display return window on purchase page
3. **Medium Priority:** Add return shipping integration
4. **Medium Priority:** Implement auto-refund
5. **Low Priority:** Add return analytics
6. **Low Priority:** Add partial refund support

---

## 4. Order Placement Issues 🔴

### Issue 1: Generic Error Messages

**Location:** `server/routes/cart.ts:432-433`

**Current Code:**
```typescript
if (error instanceof z.ZodError) {
  return res.status(400).json({ error: "بيانات غير صالحة", details: error.errors });
}
```

**Problem:** Frontend may not be displaying `details` field properly

**Fix Required:**
1. Improve error message format
2. Ensure frontend displays field-specific errors
3. Add client-side validation before submission

**Frontend Location:** `client/src/pages/checkout.tsx:213-219`

**Current Frontend Error Handling:**
```typescript
onError: (error: Error) => {
  toast({
    title: "خطأ في إتمام الطلب",
    description: error.message,
    variant: "destructive",
  });
},
```

**Issue:** Only shows `error.message`, not `error.details`

**Fix:**
```typescript
onError: (error: any) => {
  const errorMessage = error.details 
    ? error.details.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
    : error.message;
  toast({
    title: "خطأ في إتمام الطلب",
    description: errorMessage,
    variant: "destructive",
  });
},
```

### Issue 2: Authentication Token Problems

**Location:** `server/replit_integrations/auth/routes.ts:231`

**Error Log:**
```
[api/auth/me] No user found for token
```

**Root Cause:** Tokens from before redeployment not recognized

**Investigation Points:**
1. Token storage: `users.authToken` field
2. Token lookup: `getUserByAuthToken(token)`
3. Token generation: Multiple places generate tokens

**Potential Issues:**
- Tokens not persisted after login
- Tokens cleared on database migration
- Token expiration not handled
- Multiple auth methods causing confusion

**Fix Required:**
1. Add token refresh mechanism
2. Implement token expiration with refresh tokens
3. Add automatic token refresh on 401 errors
4. Improve error handling for expired tokens

**Client-Side Fix:** `client/src/hooks/useAuth.ts`
- Add automatic retry with token refresh
- Handle 401 errors gracefully
- Show login prompt when token invalid

### Issue 3: Phone Verification Blocking Checkout

**Location:** `server/routes/cart.ts:240-246`

**Current Code:**
```typescript
if (!user?.phoneVerified) {
  return res.status(403).json({ 
    error: "يجب التحقق من رقم هاتفك قبل إتمام الطلب",
    requiresPhoneVerification: true
  });
}
```

**Issue:** Users may not realize they need to verify phone

**Fix Required:**
1. Add clear UI indicator for unverified users
2. Add phone verification prompt before checkout
3. Ensure verification status syncs correctly

---

## 5. Seller Name "Unknown Seller" Issue 🔴

### Issue Location 1: Cart API
**File:** `server/routes/cart.ts:46-59`

**Current Code:**
```typescript
const seller = listing.sellerId ? await storage.getUser(listing.sellerId) : null;

return {
  ...item,
  listing: {
    ...
    sellerName: seller?.displayName || "بائع مجهول",
  },
};
```

### Issue Location 2: Frontend Cart Display
**File:** `client/src/pages/cart.tsx:142`

**Current Code:**
```typescript
<p className="text-sm text-gray-500 mt-1">
  البائع: {item.listing?.sellerName || "غير معروف"}
</p>
```

### Root Causes
1. **Seller has no `displayName`** - User never set display name
2. **Seller lookup failing** - `listing.sellerId` exists but user lookup fails
3. **Database inconsistency** - `sellerId` doesn't match user ID
4. **Production data issue** - Sellers created before displayName was required

### Fix Required

#### Fix 1: Improve Fallback Chain
**File:** `server/routes/cart.ts:59`
```typescript
// OLD:
sellerName: seller?.displayName || "بائع مجهول",

// NEW:
sellerName: seller?.displayName || seller?.username || (seller?.phone ? `مستخدم ${seller.phone.slice(-4)}` : "بائع مجهول"),
```

#### Fix 2: Add Logging
```typescript
if (!seller?.displayName && listing.sellerId) {
  console.warn(`[Cart] Seller ${listing.sellerId} has no displayName. Using fallback.`);
}
```

#### Fix 3: Migration Script
Create script to set displayName for existing sellers:
```typescript
// Set displayName to username if missing
UPDATE users 
SET display_name = username 
WHERE display_name IS NULL OR display_name = '' 
AND username IS NOT NULL;
```

#### Fix 4: Update Seller Registration
Ensure displayName is required during seller registration

### Testing Required
- [ ] Test with seller that has displayName
- [ ] Test with seller that has only username
- [ ] Test with seller that has only phone
- [ ] Test with seller that has none (should show "بائع مجهول")
- [ ] Verify logging works correctly

---

## 6. Authentication Token Issues 🔴

### Error Pattern
```
[api/auth/me] No user found for token
GET /api/account/profile 401 :: {"error":"غير مسجل الدخول"}
```

### Token Flow Analysis

#### Token Generation Points
1. **OTP Verification:** `server/otp-routes.ts:149`
2. **Facebook Auth:** `server/auth-facebook.ts:199`
3. **Replit Auth Login:** `server/replit_integrations/auth/routes.ts:54`
4. **Replit Auth OTP:** `server/replit_integrations/auth/routes.ts:108`

#### Token Storage
- **Field:** `users.authToken` (varchar)
- **Lookup:** `getUserByAuthToken(token)` in `server/storage.ts:305`

#### Token Lookup
**File:** `server/replit_integrations/auth/routes.ts:226`
```typescript
const user = await authStorage.getUserByAuthToken(token);
if (user) {
  return res.json(user);
}
console.log("[api/auth/me] No user found for token");
```

### Potential Issues

#### Issue 1: Token Not Persisted
- Token generated but not saved to database
- Check: Verify `updateUser` calls succeed

#### Issue 2: Token Cleared on Redeploy
- Database migration clears tokens
- Check: Review migration scripts

#### Issue 3: Token Expiration Not Handled
- No expiration logic, but tokens become invalid
- Check: Add expiration timestamp

#### Issue 4: Multiple Auth Methods
- Session vs Bearer token confusion
- Check: Ensure consistent auth method

### Fix Required

#### Fix 1: Add Token Expiration
```typescript
// Add tokenExpiresAt field to users table
// Set expiration to 30 days from generation
const tokenExpiresAt = new Date();
tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);
await storage.updateUser(user.id, { 
  authToken: token,
  tokenExpiresAt 
});
```

#### Fix 2: Add Token Refresh
```typescript
// Check token expiration
if (user.tokenExpiresAt && new Date() > new Date(user.tokenExpiresAt)) {
  // Generate new token
  const newToken = crypto.randomBytes(32).toString("hex");
  await storage.updateUser(user.id, { 
    authToken: newToken,
    tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });
  return res.json({ ...user, authToken: newToken });
}
```

#### Fix 3: Client-Side Token Refresh
**File:** `client/src/hooks/useAuth.ts`
```typescript
// On 401 error, attempt token refresh
if (error.status === 401) {
  // Try to refresh token or redirect to login
  await refreshToken();
}
```

#### Fix 4: Better Error Handling
```typescript
if (!user) {
  console.log("[api/auth/me] No user found for token:", token.substring(0, 8) + "...");
  // Check if token format is valid
  if (token.length !== 64) {
    console.error("[api/auth/me] Invalid token format");
  }
  return res.status(401).json({ message: "Unauthorized" });
}
```

### Testing Required
- [ ] Test token generation and storage
- [ ] Test token lookup
- [ ] Test token expiration
- [ ] Test token refresh
- [ ] Test multiple auth methods
- [ ] Test error handling

---

## Implementation Checklist

### Priority 1 (Critical - This Week)
- [ ] Fix seller name display (improve fallback chain)
- [ ] Fix order placement error messages (show field-specific errors)
- [ ] Fix authentication token handling (add expiration + refresh)
- [ ] Add logging for debugging

### Priority 2 (High - Next Week)
- [ ] Verify auction extension in production
- [ ] Implement commission reduction (8% → 5%)
- [ ] Improve checkout error handling
- [ ] Add phone verification UI improvements

### Priority 3 (Medium - Following Weeks)
- [ ] Enhance returns system (status workflow)
- [ ] Add return shipping integration
- [ ] Implement auto-refund system
- [ ] Add return analytics

---

## Testing Commands

### Test Auction Extension
```bash
# Create test auction ending in 1 minute
# Place bid
# Verify extension is exactly 2 minutes
```

### Test Commission Calculation
```bash
# Create test sale (16th sale of month)
# Verify commission is 5% (not 8%)
# Check seller dashboard shows correct commission
```

### Test Seller Name Display
```bash
# Create seller without displayName
# Add product to cart
# Verify seller name shows username or phone fallback
```

### Test Order Placement
```bash
# Test checkout with invalid data
# Verify field-specific error messages
# Test with expired token
# Verify token refresh works
```

---

**Document Status:** Complete  
**Next Steps:** Review with team, prioritize fixes, begin implementation
