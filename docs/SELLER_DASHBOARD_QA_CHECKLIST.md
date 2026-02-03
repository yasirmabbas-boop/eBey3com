# Seller Dashboard QA Checklist

This checklist covers testing scenarios for the seller dashboard redesign, with focus on backward compatibility and deep link functionality.

## Pre-Testing Setup

- [ ] Clear localStorage to reset feature flags: `localStorage.removeItem('feature_flags')`
- [ ] Have a seller account with:
  - [ ] At least one active listing
  - [ ] At least one pending order
  - [ ] At least one pending offer
  - [ ] At least one unread message
  - [ ] At least one return request (if possible)

---

## Deep Link Testing (Legacy URLs)

These URLs use legacy tab names and MUST continue to work.

### Products/Inventory
- [ ] `/seller-dashboard?tab=products` → Opens Products tab (future: Inventory)
- [ ] `/seller-dashboard?tab=products&listingId=xxx` → Opens Products tab, scrolls to/highlights specific listing

### Offers
- [ ] `/seller-dashboard?tab=offers` → Opens Offers tab (future: Activity > Offers)
- [ ] `/seller-dashboard?tab=offers&offerId=xxx` → Opens Offers tab, highlights specific offer
- [ ] Verify offer countdown timer displays correctly for highlighted offer

### Sales/Orders
- [ ] `/seller-dashboard?tab=sales` → Opens Sales tab (future: Orders)
- [ ] `/seller-dashboard?tab=sales&orderId=xxx` → Opens Sales tab, highlights specific order
- [ ] Verify buyer information displays correctly for highlighted order

### Returns
- [ ] `/seller-dashboard?tab=returns` → Opens Returns tab (future: Activity > Returns)
- [ ] `/seller-dashboard?tab=returns&returnId=xxx` → Opens Returns tab, highlights specific return request

### Wallet/Earnings
- [ ] `/seller-dashboard?tab=wallet` → Opens Wallet tab (future: Earnings)
- [ ] Verify wallet balance displays correctly

### Messages
- [ ] `/seller-dashboard?tab=messages` → Opens Messages tab (future: Activity > Messages)
- [ ] Verify unread message count displays correctly

---

## Deep Link Testing (New URLs)

These URLs use the new tab structure (for Phase 2+).

### Inventory Tab
- [ ] `/seller-dashboard?tab=inventory` → Opens Products tab

### Activity Tab (with sections)
- [ ] `/seller-dashboard?tab=activity` → Opens Messages tab (default section)
- [ ] `/seller-dashboard?tab=activity&section=messages` → Opens Messages tab
- [ ] `/seller-dashboard?tab=activity&section=offers` → Opens Offers tab
- [ ] `/seller-dashboard?tab=activity&section=returns` → Opens Returns tab

### Orders Tab
- [ ] `/seller-dashboard?tab=orders` → Opens Sales tab

### Earnings Tab
- [ ] `/seller-dashboard?tab=earnings` → Opens Wallet tab

---

## Notification Deep Link Testing

Test clicking notifications that contain deep links.

### Offer Notifications
- [ ] Receive new offer notification → Click → Opens Offers tab with correct offer highlighted
- [ ] Receive counter-offer response → Click → Opens Offers tab with correct offer highlighted
- [ ] Receive offer accepted notification → Click → Opens correct tab

### Order Notifications
- [ ] Receive new order notification → Click → Opens Sales tab with correct order highlighted
- [ ] Receive delivery confirmation → Click → Opens Sales tab with correct order highlighted
- [ ] Receive buyer rating → Click → Opens Sales tab with correct order highlighted

### Return Notifications
- [ ] Receive return request → Click → Opens Returns tab with correct return highlighted

### Auction Notifications
- [ ] Auction ending soon → Click → Opens Products tab with correct listing highlighted
- [ ] Auction ended (won) → Click → Opens Sales tab with new order highlighted
- [ ] Auction ended (no bids) → Click → Opens Products tab with listing highlighted

---

## Mobile Testing

### General Mobile UX
- [ ] Dashboard loads correctly on mobile viewport (< 768px)
- [ ] All tabs are accessible (scrollable if needed)
- [ ] Touch targets are at least 44px
- [ ] RTL layout works correctly (Arabic/Kurdish)

### Mobile Navigation (Phase 2+)
- [ ] Bottom nav visible on mobile only
- [ ] Tab switching works via bottom nav
- [ ] Badge counts update correctly on bottom nav
- [ ] Active tab indicator shows correctly

### Mobile Deep Links
- [ ] All deep link tests above pass on mobile
- [ ] URL bar updates correctly after deep link navigation

---

## Feature Flag Testing

### Enable/Disable Flags via Console

```javascript
// Enable Phase 1 features
localStorage.setItem('feature_flags', JSON.stringify({
  seller_dashboard_v2: true,
  seller_consolidated_tabs: false,
  seller_mobile_nav: false,
  seller_analytics: false
}));
location.reload();

// Enable Phase 2 features
localStorage.setItem('feature_flags', JSON.stringify({
  seller_dashboard_v2: true,
  seller_consolidated_tabs: true,
  seller_mobile_nav: true,
  seller_analytics: false
}));
location.reload();

// Enable all features
localStorage.setItem('feature_flags', JSON.stringify({
  seller_dashboard_v2: true,
  seller_consolidated_tabs: true,
  seller_mobile_nav: true,
  seller_analytics: true
}));
location.reload();

// Reset to defaults
localStorage.removeItem('feature_flags');
location.reload();
```

### Flag Behavior Verification
- [ ] With `seller_dashboard_v2: false` → Old yellow alert card shows for pending orders
- [ ] With `seller_dashboard_v2: true` → New NeedsAttention cards show
- [ ] With `seller_consolidated_tabs: false` → 6-tab layout shows
- [ ] With `seller_consolidated_tabs: true` → 4-tab layout shows
- [ ] With `seller_mobile_nav: true` → Bottom nav shows on mobile
- [ ] With `seller_analytics: true` → Performance card shows

---

## Error Handling

- [ ] Invalid tab name defaults to Products: `/seller-dashboard?tab=invalid`
- [ ] Invalid orderId doesn't crash: `/seller-dashboard?tab=sales&orderId=invalid-uuid`
- [ ] Invalid offerId doesn't crash: `/seller-dashboard?tab=offers&offerId=invalid-uuid`
- [ ] Empty tab param works: `/seller-dashboard?tab=`
- [ ] No params loads default view: `/seller-dashboard`

---

## Performance

- [ ] Page loads within 2.5 seconds (P95)
- [ ] Tab switching is instant (< 100ms)
- [ ] Deep link resolution doesn't cause visible flicker
- [ ] No console errors during normal operation

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Safari iOS
- [ ] Chrome Android

---

## Regression Checklist

Ensure these existing features still work:

- [ ] Add new product button works
- [ ] Edit product works
- [ ] Delete product works
- [ ] Print shipping label works
- [ ] Accept/reject/counter offer works
- [ ] Mark order as shipped works
- [ ] Mark order as delivered works
- [ ] Rate buyer works
- [ ] Respond to return request works
- [ ] View wallet balance works
- [ ] Share shop link works
- [ ] Search products works
- [ ] Filter products by status works
- [ ] Time period filter works (7d/30d/all)

---

## Sign-off

| Tester | Date | Environment | Pass/Fail | Notes |
|--------|------|-------------|-----------|-------|
|        |      |             |           |       |
|        |      |             |           |       |
