# E-بيع Platform - Comprehensive Audit & Action Plan

**Date:** January 31, 2026  
**Status:** Draft for Review  
**Based on:** SITE_STRUCTURE_REPORT.md + Production Issues

---

## Executive Summary

This document outlines a comprehensive audit plan addressing critical production issues, system improvements, and feature enhancements for the E-بيع platform. The audit covers:

1. **Auction Extension Logic** - Verification and correction of extension timing
2. **Commission Structure** - Reduction from 8% to 5% with competitive analysis
3. **Returns System** - Gap analysis and improvements
4. **Order Placement Issues** - Production bugs preventing order completion
5. **Seller Name Display** - "Unknown Seller" bug fix
6. **Authentication Issues** - Token expiration and 401 errors

---

## 1. Test Plan & Issues Identified

### 1.1 Auction Extension Verification

**Current Implementation Analysis:**
- **Location:** `server/routes/products.ts` (lines 900-916)
- **Current Logic:** Extends auction by **2 minutes** if bid placed when less than **2 minutes** remain
- **Issue:** User reports checking if extension is 2 or 5 minutes during last 5 minutes
- **Requirement:** Should be 2 minutes extension, verify it's not 5 minutes

**Test Cases:**
1. ✅ Place bid when 4 minutes remain → Should NOT extend
2. ✅ Place bid when 1 minute remains → Should extend by 2 minutes (new end time = now + 2 min)
3. ✅ Place bid when 1.5 minutes remain → Should extend by 2 minutes
4. ✅ Place multiple bids in last 2 minutes → Each should extend by 2 minutes from current time
5. ✅ Verify extension message shows "تم إضافة دقيقتين" (2 minutes added)

**Code Review Findings:**
```typescript
// Current code (server/routes/products.ts:906-916)
const timeRemaining = endTime.getTime() - now.getTime();
const twoMinutes = 2 * 60 * 1000;

if (timeRemaining < twoMinutes && timeRemaining > 0) {
  // Extend by 2 minutes from now
  newEndTime = new Date(now.getTime() + twoMinutes);
}
```

**Status:** ✅ Code is correct (2 minutes), but needs verification in production

**Action Required:**
- [ ] Add logging to track extension events
- [ ] Verify production behavior matches code
- [ ] If production shows 5 minutes, investigate caching/timing issues
- [ ] Add unit tests for extension logic

---

### 1.2 Commission Structure Reduction (8% → 5%)

**Current Implementation:**
- **Location:** `server/services/financial-service.ts` (line 10)
- **Current Rate:** `COMMISSION_RATE = 0.08` (8%)
- **Free Sales:** 15 per month
- **Target Rate:** 5% (0.05)

**Competitive Analysis (eBay Model):**

| Platform | Final Value Fee | Per-Order Fee | Free Listings | Notes |
|----------|----------------|---------------|---------------|-------|
| **eBay** | 2.5% - 15.3% (varies by category) | $0.30-$0.40 | 250/month | Most categories ~10-12% |
| **E-بيع (Current)** | 8% | None | 15/month | After free limit |
| **E-بيع (Proposed)** | 5% | None | 15/month | After free limit |

**Structured Commission Model Proposal:**

```
Tier 1: Free Sales (0% commission)
├─ First 15 sales per calendar month
└─ Resets on 1st of each month

Tier 2: Standard Commission (5% commission)
├─ Sales 16+ in same calendar month
├─ Applied to: Sale amount (excluding shipping)
└─ Calculation: floor(saleAmount * 0.05)

Tier 3: Shipping Costs
├─ Deducted from seller payout if seller pays shipping
└─ Not included in commission calculation
```

**Financial Impact Analysis:**

**Example Scenarios:**

| Monthly Sales | Current (8%) | Proposed (5%) | Difference | Impact |
|---------------|--------------|--------------|------------|--------|
| 20 sales @ 100,000 IQD | 40,000 IQD | 25,000 IQD | -15,000 IQD | 37.5% reduction |
| 30 sales @ 100,000 IQD | 120,000 IQD | 75,000 IQD | -45,000 IQD | 37.5% reduction |
| 50 sales @ 100,000 IQD | 280,000 IQD | 175,000 IQD | -105,000 IQD | 37.5% reduction |

**Benefits:**
- More competitive vs. eBay (5% vs 10-12%)
- Attracts more sellers
- Still profitable (5% on volume)
- Maintains free tier incentive

**Action Required:**
- [ ] Update `COMMISSION_RATE` constant to `0.05`
- [ ] Update terms & conditions page
- [ ] Update seller dashboard commission display
- [ ] Add migration script to recalculate pending commissions (if needed)
- [ ] Update documentation and help text
- [ ] Notify existing sellers of change

**Files to Modify:**
1. `server/services/financial-service.ts` - Line 10
2. `client/src/pages/terms.tsx` - Commission section
3. `client/src/pages/seller-dashboard.tsx` - Commission display
4. `shared/schema.ts` - Update comments if needed

---

### 1.3 Returns System Gap Analysis

**Current Implementation Review:**

**Strengths:**
- ✅ Return request creation (`/api/return-requests`)
- ✅ Seller response mechanism (`/api/return-requests/:id/respond`)
- ✅ Return policy enforcement (time limits)
- ✅ Quality issue exceptions (damaged, wrong item)
- ✅ Notification system for sellers

**Identified Gaps:**

#### Gap 1: Missing Return Status Tracking
- **Issue:** No clear status workflow (pending → approved/rejected → processing → completed)
- **Impact:** Sellers/buyers can't track return progress
- **Recommendation:** Add status field transitions:
  ```
  pending → seller_approved → return_shipped → return_received → refunded
  pending → seller_rejected → (buyer can appeal)
  ```

#### Gap 2: No Return Shipping Integration
- **Issue:** Returns handled manually, no delivery service integration
- **Impact:** No tracking, no automated status updates
- **Recommendation:** Integrate with delivery service for return shipments

#### Gap 3: Missing Refund Automation
- **Issue:** Refunds require manual processing
- **Impact:** Delayed refunds, manual errors
- **Recommendation:** Auto-refund after return received + verification period (2-3 days)

#### Gap 4: No Return Reason Analytics
- **Issue:** No tracking of common return reasons
- **Impact:** Can't identify problematic sellers/products
- **Recommendation:** Add analytics dashboard for return reasons

#### Gap 5: Missing Return Window Display
- **Issue:** Buyers don't see remaining return window clearly
- **Impact:** Confusion about eligibility
- **Recommendation:** Show "X days remaining" on purchase page

#### Gap 6: No Partial Refund Support
- **Issue:** Only full refunds supported
- **Impact:** Can't handle partial returns (multi-item orders)
- **Recommendation:** Add partial refund capability

**Action Required:**
- [ ] Add return status workflow states
- [ ] Create return shipping integration endpoint
- [ ] Implement auto-refund after return verification
- [ ] Add return analytics tracking
- [ ] Display return window on purchase pages
- [ ] Add partial refund support
- [ ] Create return request UI improvements

**Files to Review/Modify:**
1. `server/routes/transactions.ts` - Return request endpoints
2. `shared/schema.ts` - Return request schema
3. `client/src/pages/my-purchases.tsx` - Return request UI
4. `client/src/pages/seller-dashboard.tsx` - Return management UI
5. `server/services/delivery-service.ts` - Return shipping integration

---

### 1.4 Order Placement Issues

**Reported Issues:**
1. Users cannot place orders in production
2. Generic error messages ("بيانات غير صالحة")
3. 401 Unauthorized errors during checkout

**Root Cause Analysis:**

#### Issue 1: Authentication Token Expiration
- **Location:** `server/integrations/auth/routes.ts` (line 231)
- **Symptom:** `[api/auth/me] No user found for token`
- **Cause:** Old tokens from before redeployment not recognized
- **Impact:** Users logged out, can't complete checkout

**Investigation Steps:**
- [ ] Check token storage mechanism
- [ ] Verify token expiration logic
- [ ] Check if tokens are being invalidated on redeploy
- [ ] Review session management

#### Issue 2: Checkout Validation Errors
- **Location:** `server/routes/cart.ts` (line 432-433)
- **Symptom:** Generic "بيانات غير صالحة" error
- **Cause:** Zod validation errors not detailed
- **Impact:** Users don't know which field is invalid

**Current Code:**
```typescript
if (error instanceof z.ZodError) {
  return res.status(400).json({ error: "بيانات غير صالحة", details: error.errors });
}
```

**Issue:** Frontend may not be displaying `details` field

**Action Required:**
- [ ] Improve error messages in checkout
- [ ] Display field-specific errors in UI
- [ ] Add client-side validation before submission
- [ ] Add logging for failed checkout attempts

#### Issue 3: Phone Verification Requirement
- **Location:** `server/routes/cart.ts` (line 240-246)
- **Symptom:** Users blocked from checkout if phone not verified
- **Impact:** Legitimate users can't complete orders

**Action Required:**
- [ ] Verify phone verification flow works correctly
- [ ] Add clear messaging about verification requirement
- [ ] Ensure verification status syncs correctly

**Test Cases:**
1. ✅ Unauthenticated user → Should redirect to login
2. ✅ Authenticated user with expired token → Should refresh token or re-login
3. ✅ Valid user, invalid form data → Should show specific field errors
4. ✅ Valid user, unverified phone → Should show verification prompt
5. ✅ Complete checkout flow → Should create transaction successfully

**Files to Review/Modify:**
1. `server/routes/cart.ts` - Checkout endpoint
2. `client/src/pages/checkout.tsx` - Checkout UI
3. `server/integrations/auth/routes.ts` - Auth token handling
4. `client/src/hooks/useAuth.ts` - Auth state management

---

### 1.5 Seller Name Display Issue ("Unknown Seller")

**Reported Issue:**
- Seller name shows as "بائع مجهول" (Unknown Seller) or "غير معروف" (Unknown)
- Affects cart page and order displays

**Root Cause Analysis:**

#### Location 1: Cart API (`server/routes/cart.ts`)
```typescript
// Line 59
sellerName: seller?.displayName || "بائع مجهول",
```

#### Location 2: Account API (`server/routes/account.ts`)
```typescript
// Line 607
sellerName: seller?.displayName || seller?.username || "بائع",
```

**Potential Causes:**
1. **Seller has no `displayName`** - User never set display name
2. **Seller lookup failing** - `listing.sellerId` exists but user lookup fails
3. **Database inconsistency** - `sellerId` in listing doesn't match user ID
4. **Production data issue** - Sellers created before displayName was required

**Investigation Steps:**
- [ ] Check database for sellers without displayName
- [ ] Verify seller lookup logic
- [ ] Check if `listing.sellerId` is null/undefined
- [ ] Review seller creation flow

**Action Required:**
- [ ] Add fallback to `username` if `displayName` missing
- [ ] Add fallback to phone number (last 4 digits) if both missing
- [ ] Update seller registration to require displayName
- [ ] Add migration script to set displayName for existing sellers
- [ ] Improve error logging for missing seller data

**Files to Review/Modify:**
1. `server/routes/cart.ts` - Line 46-59
2. `server/routes/account.ts` - Line 607
3. `server/storage.ts` - Seller lookup methods
4. `client/src/pages/checkout.tsx` - Seller name display
5. `client/src/pages/my-purchases.tsx` - Seller name display

---

### 1.6 Authentication Token Issues

**Reported Issues:**
- `[api/auth/me] No user found for token`
- `GET /api/account/profile 401 :: {"error":"غير مسجل الدخول"}`
- Users getting logged out unexpectedly

**Root Cause Analysis:**

#### Token Storage Mechanism
- **Location:** `server/integrations/auth/routes.ts` (line 226)
- **Method:** Token stored in `users.authToken` field
- **Lookup:** `getUserByAuthToken(token)`

**Potential Issues:**
1. **Token not persisted** - Token generated but not saved to database
2. **Token cleared on redeploy** - Database reset or migration issue
3. **Token expiration** - No expiration logic, but tokens become invalid
4. **Multiple auth methods** - Session vs Bearer token confusion

**Investigation Steps:**
- [ ] Verify token is saved after login/OTP verification
- [ ] Check if tokens survive database migrations
- [ ] Review token generation and storage flow
- [ ] Check for token cleanup scripts

**Action Required:**
- [ ] Add token refresh mechanism
- [ ] Implement token expiration with refresh tokens
- [ ] Add better error handling for expired tokens
- [ ] Add automatic token refresh on 401 errors
- [ ] Improve logging for auth failures
- [ ] Add migration to preserve existing tokens

**Files to Review/Modify:**
1. `server/integrations/auth/routes.ts` - Auth endpoints
2. `server/integrations/auth/storage.ts` - Token storage
3. `server/otp-routes.ts` - OTP token generation
4. `client/src/hooks/useAuth.ts` - Client-side auth handling
5. `client/src/pages/checkout.tsx` - Auth header handling

---

## 2. Implementation Priority

### Priority 1 (Critical - Production Blocking)
1. **Order Placement Issues** - Users can't complete purchases
2. **Seller Name Display** - Affects user trust
3. **Authentication Token Issues** - Users getting logged out

### Priority 2 (High - User Experience)
4. **Auction Extension Verification** - Ensure correct behavior
5. **Checkout Error Messages** - Better user feedback

### Priority 3 (Medium - Business Impact)
6. **Commission Reduction** - Competitive positioning
7. **Returns System Improvements** - Long-term user satisfaction

---

## 3. Testing Strategy

### 3.1 Unit Tests
- [ ] Auction extension logic tests
- [ ] Commission calculation tests
- [ ] Return policy validation tests
- [ ] Checkout validation tests

### 3.2 Integration Tests
- [ ] Complete checkout flow
- [ ] Return request creation and processing
- [ ] Auth token refresh flow
- [ ] Seller name lookup in various contexts

### 3.3 Manual Testing Checklist
- [ ] Test order placement with various scenarios
- [ ] Verify seller names display correctly
- [ ] Test auth token expiration and refresh
- [ ] Verify auction extension timing
- [ ] Test return request workflow
- [ ] Verify commission calculation

---

## 4. Deployment Plan

### Phase 1: Critical Fixes (Week 1)
1. Fix order placement issues
2. Fix seller name display
3. Fix authentication token handling

### Phase 2: Improvements (Week 2)
4. Improve checkout error messages
5. Verify auction extension logic
6. Add logging and monitoring

### Phase 3: Enhancements (Week 3-4)
7. Implement commission reduction
8. Enhance returns system
9. Add analytics and reporting

---

## 5. Monitoring & Validation

### Metrics to Track
- Order completion rate
- Checkout abandonment rate
- Authentication failure rate
- Return request rate
- Seller satisfaction (commission changes)

### Validation Criteria
- [ ] Orders can be placed successfully
- [ ] Seller names display correctly
- [ ] Users stay logged in
- [ ] Auction extensions work correctly
- [ ] Commission calculated at 5%
- [ ] Returns system handles all scenarios

---

## 6. Risk Assessment

### High Risk
- **Commission Reduction:** Financial impact, need careful calculation
- **Auth Token Changes:** Could break existing sessions

### Medium Risk
- **Returns System Changes:** Complex workflow, need thorough testing
- **Checkout Changes:** Core functionality, need backup plan

### Low Risk
- **Auction Extension Verification:** Read-only verification
- **Error Message Improvements:** UI-only changes

---

## 7. Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize** based on business impact
3. **Assign** tasks to development team
4. **Create** detailed tickets for each item
5. **Set up** testing environment
6. **Begin** implementation in priority order

---

**Document Status:** Ready for Review  
**Last Updated:** January 31, 2026  
**Next Review:** After stakeholder feedback
