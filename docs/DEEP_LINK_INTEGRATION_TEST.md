# Deep Link Integration Test - Manual Walkthrough

**Test ID:** DL-INT-001  
**Date:** 2026-02-03  
**Tester:** _____________  
**Environment:** □ Staging □ Production □ Local Development

---

## Test Objective

Verify that deep links from notifications correctly navigate users to the seller dashboard and:
1. Switch to the correct tab
2. Auto-scroll to the specific item
3. Highlight the target item
4. Maintain RTL text orientation without flickering

---

## Prerequisites

### Test Data Setup

Before testing, ensure you have:
- [ ] At least 3 pending orders with different statuses
- [ ] At least 2 pending offers
- [ ] At least 1 return request
- [ ] At least 5 active listings
- [ ] Seller dashboard accessible at `/seller-dashboard`

### Browser Setup

- [ ] Clear browser cache
- [ ] Open Developer Console (F12)
- [ ] Set viewport to mobile (375x667) for mobile tests
- [ ] Set language to Arabic (العربية) for RTL tests

---

## Test Suite 1: Order Deep Link

### Test 1.1: Legacy URL Format (Backward Compatibility)

**URL Pattern:** `/seller-dashboard?tab=sales&orderId=[ORDER_ID]`

**Steps:**
1. Get an order ID from your test data
2. Navigate to: `/seller-dashboard?tab=sales&orderId=f8b2a4c6-1234-5678-9abc-def012345678`
3. Wait for page load (< 3 seconds)

**Expected Results:**
- [ ] Dashboard loads without errors
- [ ] "Sales/Orders" tab is active (highlighted)
- [ ] Order detail dialog opens automatically
- [ ] Correct order is displayed in the dialog
- [ ] URL is cleaned (becomes `/seller-dashboard`)
- [ ] Console shows deprecation warning: `[Deprecation] Tab name "sales" is deprecated`

**Actual Results:**
```
Tab Active: _________
Dialog Opened: □ Yes □ No
Correct Order: □ Yes □ No
URL Cleaned: □ Yes □ No
Console Warning: □ Yes □ No
```

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

### Test 1.2: New URL Format

**URL Pattern:** `/seller-dashboard?tab=orders&orderId=[ORDER_ID]`

**Steps:**
1. Navigate to: `/seller-dashboard?tab=orders&orderId=f8b2a4c6-1234-5678-9abc-def012345678`
2. Wait for page load

**Expected Results:**
- [ ] Orders tab is active
- [ ] Order detail dialog opens
- [ ] No deprecation warning in console
- [ ] URL is cleaned

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

### Test 1.3: Auto-Scroll and Highlight

**URL Pattern:** `/seller-dashboard?tab=orders&orderId=[ORDER_ID]`

**Prerequisite:** Have more than 10 orders so scrolling is necessary

**Steps:**
1. Navigate to URL with an order ID in the middle/bottom of the list
2. Close the dialog if it opens
3. Observe the order list

**Expected Results:**
- [ ] Page auto-scrolls to bring the order into viewport
- [ ] Target order card has a distinct highlight/border (e.g., blue glow)
- [ ] Highlight fades after 3 seconds
- [ ] Scroll animation is smooth (not instant)
- [ ] Order card has `data-testid="order-card-[ORDER_ID]"`

**Actual Results:**
```
Auto-scroll: □ Yes □ No
Highlight visible: □ Yes □ No
Fade-out animation: □ Yes □ No
Smooth scroll: □ Yes □ No
```

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 2: Offer Deep Link

### Test 2.1: Legacy URL Format

**URL Pattern:** `/seller-dashboard?tab=offers&offerId=[OFFER_ID]`

**Steps:**
1. Get an offer ID from pending offers
2. Navigate to: `/seller-dashboard?tab=offers&offerId=abc123-offer-uuid`
3. Wait for page load

**Expected Results:**
- [ ] "Activity" tab is active (or "Offers" tab in legacy 6-tab layout)
- [ ] "Offers" sub-tab is active within Activity section
- [ ] Offer counter dialog opens automatically
- [ ] Correct offer is displayed
- [ ] Console shows: `[Deprecation] Tab name "offers" is deprecated`

**Actual Results:**
```
Tab: _________
Sub-tab: _________
Dialog: □ Yes □ No
Deprecation warning: □ Yes □ No
```

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

### Test 2.2: New URL Format with Section

**URL Pattern:** `/seller-dashboard?tab=activity&section=offers&offerId=[OFFER_ID]`

**Steps:**
1. Navigate to URL with explicit section parameter
2. Wait for page load

**Expected Results:**
- [ ] Activity tab is active
- [ ] Offers sub-tab is active
- [ ] Offer dialog opens
- [ ] No deprecation warning

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

### Test 2.3: Auto-Scroll to Offer

**Steps:**
1. Navigate to offer deep link
2. Close the dialog
3. Observe offer list

**Expected Results:**
- [ ] Page scrolls to the specific offer in the list
- [ ] Offer card is highlighted
- [ ] Highlight includes the countdown timer if offer is time-sensitive
- [ ] Offer card has visual indicator (e.g., animated border)

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 3: Return Request Deep Link

### Test 3.1: Return Deep Link

**URL Pattern:** `/seller-dashboard?tab=returns&returnId=[RETURN_ID]`

**Steps:**
1. Navigate to return request deep link
2. Wait for page load

**Expected Results:**
- [ ] Activity tab is active (or Returns tab in legacy layout)
- [ ] Returns sub-tab is active
- [ ] Return response dialog opens
- [ ] Correct return request is displayed with buyer info
- [ ] Return reason and photos (if any) are visible

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 4: Listing Deep Link

### Test 4.1: Product Deep Link

**URL Pattern:** `/seller-dashboard?tab=products&listingId=[LISTING_ID]`

**Steps:**
1. Navigate to listing deep link
2. Wait for page load

**Expected Results:**
- [ ] Inventory tab is active (or Products in legacy)
- [ ] Page scrolls to the listing
- [ ] Listing card is highlighted
- [ ] If listing is an auction, countdown timer is visible and updating

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 5: RTL Transition Consistency

**Critical for Arabic UI**

### Test 5.1: RTL Flicker Detection (Arabic)

**Language:** Arabic (العربية)

**Steps:**
1. Set dashboard language to Arabic
2. Start on "Products" tab manually
3. Navigate to: `/seller-dashboard?tab=sales&orderId=[ID]`
4. **Watch closely** during tab transition
5. Record a video if possible (use F12 > Performance > Record)

**Expected Results:**
- [ ] Arabic text remains right-aligned during entire transition
- [ ] No visible "flash" where text appears left-aligned
- [ ] Tab labels don't jump/shift horizontally
- [ ] Order details in dialog are right-aligned
- [ ] Timestamps maintain RTL format
- [ ] Transition duration: < 300ms

**Actual Results:**
```
RTL maintained: □ Yes □ No
Flicker observed: □ Yes □ No
Text alignment: □ Consistent □ Inconsistent
Transition duration: _______ ms
```

**Screenshot Evidence:**  
□ Before transition  
□ During transition  
□ After transition

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

### Test 5.2: RTL Consistency Across Tabs

**Steps:**
1. In Arabic mode, test deep links to each tab type:
   - `/seller-dashboard?tab=products`
   - `/seller-dashboard?tab=messages`
   - `/seller-dashboard?tab=offers`
   - `/seller-dashboard?tab=returns`
   - `/seller-dashboard?tab=sales`
   - `/seller-dashboard?tab=wallet`

**For Each Tab:**
- [ ] Text is right-aligned
- [ ] Icons are on the correct side (right for Arabic)
- [ ] Badges (counts) are positioned correctly
- [ ] Numbers use Arabic numerals (٠١٢٣) or Western (0123) consistently
- [ ] Currency symbols (IQD/د.ع) appear on correct side

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 6: Mobile Deep Links

**Viewport:** 375x667 (iPhone SE)

### Test 6.1: Mobile Order Deep Link

**Steps:**
1. Set mobile viewport
2. Navigate to: `/seller-dashboard?tab=sales&orderId=[ID]`
3. Test on actual device if possible

**Expected Results:**
- [ ] Bottom navigation bar is visible
- [ ] Correct tab is active in bottom nav
- [ ] Order dialog is full-screen on mobile
- [ ] Dialog can be swiped down to close
- [ ] After closing dialog, order is visible and highlighted
- [ ] No horizontal scrollbars
- [ ] Touch targets are at least 44x44px

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

### Test 6.2: Mobile Offer Deep Link

**Steps:**
1. Navigate to: `/seller-dashboard?tab=offers&offerId=[ID]`
2. Test counter-offer interaction

**Expected Results:**
- [ ] Offer dialog fits mobile screen
- [ ] Keyboard doesn't break layout when entering counter-offer
- [ ] Accept/Reject buttons are easily tappable
- [ ] Timer countdown is visible and updating

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 7: Error Handling

### Test 7.1: Invalid Order ID

**URL:** `/seller-dashboard?tab=sales&orderId=invalid-id-12345`

**Expected Results:**
- [ ] Orders tab loads normally
- [ ] No dialog opens (invalid ID ignored)
- [ ] No JavaScript errors in console
- [ ] User can interact with dashboard normally
- [ ] No infinite loading state

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

### Test 7.2: Missing ID Parameter

**URL:** `/seller-dashboard?tab=sales&orderId=`

**Expected Results:**
- [ ] Orders tab loads
- [ ] Empty parameter is ignored
- [ ] Dashboard functions normally

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

### Test 7.3: Unknown Tab Name

**URL:** `/seller-dashboard?tab=unknown&orderId=[ID]`

**Expected Results:**
- [ ] Dashboard defaults to "Inventory" tab
- [ ] Console warning: `[Warning] Unknown tab "unknown", defaulting to inventory`
- [ ] No errors thrown
- [ ] Deep link ID parameters are preserved

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 8: Performance

### Test 8.1: Deep Link Load Time

**Tool:** Chrome DevTools > Network > Disable Cache

**Steps:**
1. Clear cache
2. Measure time from URL navigation to "fully interactive"
3. Test with network throttling: Fast 3G

**URL:** `/seller-dashboard?tab=sales&orderId=[ID]`

**Expected Results:**
- [ ] Time to Interactive (TTI): < 3 seconds
- [ ] No layout shift (CLS < 0.1)
- [ ] Dialog opens within 500ms of data load

**Actual Metrics:**
```
TTI: _______ ms
CLS: _______
Dialog open delay: _______ ms
```

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 9: Accessibility

### Test 9.1: Keyboard Navigation

**Steps:**
1. Navigate to deep link
2. Use only keyboard (Tab, Enter, Escape)
3. Verify focus management

**Expected Results:**
- [ ] Dialog receives focus when opened
- [ ] Tab key cycles through interactive elements
- [ ] Escape key closes dialog
- [ ] Focus returns to trigger element after dialog closes
- [ ] Skip link works for screen readers

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

### Test 9.2: Screen Reader Announcement

**Tool:** NVDA (Windows) or VoiceOver (Mac)

**Steps:**
1. Enable screen reader
2. Navigate to deep link
3. Listen to announcements

**Expected Results:**
- [ ] Tab change is announced: "Orders tab selected"
- [ ] Dialog opening is announced: "Dialog: Order details"
- [ ] Order ID is readable
- [ ] Status is announced clearly
- [ ] Action buttons have descriptive labels

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 10: Multiple Deep Links

### Test 10.1: Rapid Navigation

**Steps:**
1. Navigate to: `/seller-dashboard?tab=sales&orderId=order1`
2. Wait 1 second
3. Navigate to: `/seller-dashboard?tab=offers&offerId=offer1`
4. Wait 1 second
5. Navigate to: `/seller-dashboard?tab=returns&returnId=return1`

**Expected Results:**
- [ ] Each navigation completes successfully
- [ ] No race conditions or stuck dialogs
- [ ] State is correctly reset between navigations
- [ ] Memory doesn't leak (check DevTools > Memory)

**Status:** □ PASS □ FAIL  
**Notes:** _______________________________________________

---

## Browser Compatibility Matrix

Test deep links across browsers:

| Browser | Version | Test 1.1 | Test 2.1 | Test 5.1 | Status |
|---------|---------|----------|----------|----------|--------|
| Chrome | Latest | □ | □ | □ | □ PASS □ FAIL |
| Firefox | Latest | □ | □ | □ | □ PASS □ FAIL |
| Safari | Latest | □ | □ | □ | □ PASS □ FAIL |
| Edge | Latest | □ | □ | □ | □ PASS □ FAIL |
| Safari iOS | 15+ | □ | □ | □ | □ PASS □ FAIL |
| Chrome Android | Latest | □ | □ | □ | □ PASS □ FAIL |

---

## Summary Report

**Total Tests:** 34  
**Tests Passed:** _____  
**Tests Failed:** _____  
**Tests Skipped:** _____  

**Pass Rate:** _____%

### Critical Issues Found

1. ____________________________________________
2. ____________________________________________
3. ____________________________________________

### Non-Critical Issues

1. ____________________________________________
2. ____________________________________________

### Recommendations

1. ____________________________________________
2. ____________________________________________

---

**Tester Signature:** _________________  
**Date:** _________________  
**Status:** □ APPROVED □ NEEDS WORK
