# Phase 1 Testing Checklist

## Sprint 1.1: Language & Compliance Fixes

### FIX-CRIT-06: Remove Authenticity Guarantee Language
- [ ] **Test AuthenticityBadge Component**
  - Navigate to a product page with authenticity badge
  - Hover over the badge - verify tooltip shows "البائع أكد الأصالة. المنصة لا تضمن صحة المنتج. راجع المنتج قبل الشراء."
  - Verify badge label shows "مصادق عليه" not "أصالة مضمونة"

- [ ] **Test Sell Page Serial Number Text**
  - Go to `/sell` page
  - Select category "ساعات" or enter price > 1,000,000 IQD
  - Verify text shows: "مطلوب للساعات والمنتجات التي تزيد قيمتها عن 1,000,000 دينار. البائع مسؤول عن التأكد من الأصالة."
  - Verify NO mention of "ضمان الأصالة"

- [ ] **Test Admin Panel**
  - Log in as admin
  - Go to `/admin` → Users tab
  - Verify disclaimer appears: "التحقق من الأصالة هو مسؤولية البائع والمشتري. المنصة لا تضمن صحة المنتجات."
  - Verify badge shows "مصادق عليه" not "ضمان الأصالة"
  - Verify buttons say "منح شارة الأصالة" / "إزالة شارة الأصالة" (not "ضمان")

### FIX-MED-07: 30-Day Deletion Guarantee
- [ ] **Test Privacy Policy Page**
  - Navigate to `/privacy`
  - Switch to English version
  - Verify heading shows "30-Day Deletion Policy" (not "Guarantee")
  - Switch to Arabic version
  - Verify heading shows "سياسة الحذف خلال 30 يومًا" (not "ضمان")

---

## Sprint 1.2: Auction Timer Fix

### FIX-CRIT-01: Stale Auction Timer Display
- [ ] **Test WebSocket Connection Status**
  - Navigate to an active auction product page
  - Verify "Last updated" timestamp appears below the countdown timer
  - Disconnect internet/WiFi
  - Verify warning appears: "⚠️ قد يكون المؤقت قديماً. حدّث الصفحة."
  - Reconnect internet
  - Verify warning disappears and timestamp updates

- [ ] **Test Auction End Time Validation**
  - Navigate to an auction that has ended
  - Try to place a bid
  - Verify error message: "انتهى المزاد ولا يمكن تقديم مزايدات جديدة"
  - Verify bid is NOT submitted

- [ ] **Test Timer Updates**
  - Open auction product page
  - Verify timer updates every second
  - Verify "Last updated" timestamp shows current time
  - Place a bid (if possible)
  - Verify timer updates immediately after bid

---

## Sprint 1.3: Buy Now Button Clarity

### FIX-CRIT-03: Buy Now Button Misleading
- [ ] **Test Buy Now Confirmation Dialog**
  - Navigate to a fixed-price product
  - Click "إتمام الطلب" button
  - Verify confirmation dialog appears with:
    - Title: "تأكيد الطلب"
    - Description explaining order creation process
    - Payment method clearly shown: "الدفع: نقداً عند الاستلام"
    - Review/shipping timeline: "المراجعة: 1-2 يوم | الشحن: 3-5 أيام"
  - Click "إلغاء" - verify dialog closes, no order created
  - Click "تأكيد الطلب" - verify order is created and redirected to checkout

- [ ] **Test Buy Now for Auction Items**
  - Navigate to an auction with buyNowPrice
  - Click "إتمام الطلب" button
  - Verify same confirmation dialog appears
  - Verify button text shows "إتمام الطلب" not "اشتر الآن"

- [ ] **Test Loading State**
  - Click Buy Now button
  - Click Confirm in dialog
  - Verify button shows loading spinner: "جاري المعالجة..."
  - Verify button is disabled during submission

- [ ] **Test Error Handling**
  - Trigger a buy now error (e.g., item sold out, network error)
  - Verify clear error message appears
  - Verify user can retry

---

## Sprint 1.4: CSRF Protection

### FIX-CRIT-04: CSRF Protection Missing
- [ ] **Test CSRF Token Endpoint**
  - Open browser console
  - Run: `fetch('/api/csrf-token', { credentials: 'include' }).then(r => r.json())`
  - Verify token is returned

- [ ] **Test POST Request Without Token**
  - Open browser console
  - Run: `fetch('/api/account/profile', { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({displayName: 'Test'}), credentials: 'include' })`
  - Verify 403 error: "Invalid CSRF token"

- [ ] **Test POST Request With Valid Token**
  - Get CSRF token from `/api/csrf-token`
  - Run POST/PATCH request with `X-CSRF-Token` header
  - Verify request succeeds

- [ ] **Test Normal App Functionality**
  - Create a listing (should work - CSRF token auto-fetched)
  - Update profile (should work)
  - Add to cart (should work)
  - Place order (should work)
  - All mutations should work normally

---

## Sprint 1.5: Admin Pagination

### FIX-CRIT-02: Admin Endpoints - No Pagination
- [ ] **Test Users Pagination**
  - Log in as admin
  - Go to `/admin` → Users tab
  - Verify pagination controls appear at bottom if > 50 users
  - Click "Next" - verify next page loads
  - Click "Previous" - verify previous page loads
  - Verify page counter shows: "صفحة X من Y"
  - Verify item count shows: "عرض 1-50 من 100"

- [ ] **Test Listings Pagination**
  - Go to `/admin` → Listings tab
  - Verify pagination controls appear if > 50 listings
  - Test page navigation
  - Verify listings update correctly

- [ ] **Test Reports Pagination**
  - Go to `/admin` → Reports tab
  - Verify pagination controls appear if > 50 reports
  - Test page navigation
  - Verify reports update correctly

- [ ] **Test Performance**
  - With 100+ users/listings/reports
  - Verify page loads quickly (< 2 seconds)
  - Verify only 50 items loaded per page
  - Verify no browser freezing

---

## Sprint 1.6: Quantity Field & Purchased Item Display

### FIX-FEAT-01: Add Quantity Requirement to Listing Form
- [ ] **Test Quantity Validation**
  - Go to `/sell` page
  - Fill out all required fields EXCEPT quantity
  - Try to submit form
  - Verify error: "الكمية مطلوبة (حد أدنى: 1)"
  - Enter quantity = 0
  - Try to submit
  - Verify error appears
  - Enter quantity = 1
  - Verify error disappears
  - Enter quantity > 1
  - Verify form submits successfully

- [ ] **Test Quantity Field Display**
  - Verify quantity field shows "*" indicating required
  - Verify placeholder shows "1"
  - Verify min="1" attribute is set

### FIX-FEAT-02: Show Action Tabs for Purchased Items (Disabled)
- [ ] **Test Purchase Status Endpoint**
  - Purchase an item (complete checkout)
  - Navigate to that item's product page
  - Open browser console
  - Check network tab for `/api/listings/:id/purchase-status`
  - Verify response: `{ hasPurchased: true }`

- [ ] **Test Purchased Item Display**
  - After purchasing an item, navigate to its product page
  - Verify blue banner appears: "لقد قمت بشراء هذا المنتج"
  - Verify message: "لا يمكنك الشراء مرة أخرى"
  - Verify "اشتر الآن" button is visible but DISABLED
  - Verify "قدم عرض" button is visible but DISABLED (if negotiable)
  - Verify buttons cannot be clicked

- [ ] **Test Out of Stock Display**
  - Navigate to a product with quantityAvailable = 0
  - Verify red banner: "نفذت الكمية"
  - Verify message: "تم بيع جميع الكميات"
  - Verify action buttons are NOT shown (different from purchased)

- [ ] **Test Normal Item Display**
  - Navigate to item you haven't purchased
  - Verify action buttons are enabled and functional
  - Verify no "already purchased" message

---

## General Regression Tests

- [ ] **Test User Registration**
  - Register new account
  - Verify all fields work
  - Verify account creation succeeds

- [ ] **Test Product Listing Creation**
  - Create a new listing
  - Verify all fields save correctly
  - Verify quantity is saved

- [ ] **Test Bidding**
  - Place a bid on an auction
  - Verify bid is accepted
  - Verify timer updates

- [ ] **Test Checkout Flow**
  - Add item to cart
  - Complete checkout
  - Verify order is created

- [ ] **Test Admin Functions**
  - Approve/reject seller requests
  - Update user status
  - Update listing status
  - All should work with pagination

---

## Browser Compatibility Tests

- [ ] **Test on Chrome/Edge**
- [ ] **Test on Firefox**
- [ ] **Test on Safari**
- [ ] **Test on Mobile Browser**

---

## Performance Tests

- [ ] **Test Admin Page Load Time**
  - With 1000+ users, verify page loads < 3 seconds
  - Verify only first 50 users loaded initially

- [ ] **Test Product Page Load**
  - Verify purchase status check doesn't slow down page
  - Verify WebSocket connection establishes quickly

---

## Notes for Testing

1. **CSRF Testing**: You may need to clear browser cache/cookies if you encounter CSRF errors during initial testing
2. **Purchase Status**: Make sure you're logged in when testing purchase status
3. **Pagination**: Test with different page sizes (if you modify the limit parameter)
4. **WebSocket**: Test on a real network connection, not just localhost

---

## Critical Issues to Verify Fixed

✅ All guarantee language removed  
✅ Auction timer shows connection status  
✅ Buy Now has confirmation dialog  
✅ CSRF protection active  
✅ Admin pagination working  
✅ Quantity validation working  
✅ Purchased items show disabled buttons  

---

## Ready for Phase 2?

Once all Phase 1 tests pass, proceed to Phase 2 implementation.
