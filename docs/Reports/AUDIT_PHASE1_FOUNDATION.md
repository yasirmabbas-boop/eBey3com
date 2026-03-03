# Phase 1: Foundation & Core Behavior Audit
## E-بيع Platform - Hostile Mobile App Audit

**Audit Date:** January 31, 2026  
**Auditor Mode:** HOSTILE  
**Phase:** 1 of 3 — Foundation & Core Behavior  
**Status:** In Progress

---

## Executive Summary

This phase audits the foundational mobile behavior of the E-بيع platform, examining:
- Background jobs and automation claims
- Screen inventory and state management
- Gesture behavior and user affordances
- App lifecycle handling
- Background execution implications
- Notification system

**Total Screens Identified:** 35+ pages  
**Total Background Jobs:** 4 cron jobs + 1 interval processor  
**Total Notification Types:** 8+ types identified

---

## 0) NON-NEGOTIABLE MOBILE INVARIANTS

### 0.1 Authority Control

**Status:** ⚠️ PARTIAL COMPLIANCE

**Findings:**

**Finding 0.1.1: Auction Processor Background Execution**
- **Location:** `server/auction-processor.ts:475-492`
- **Behavior:** Runs every 30 seconds automatically, processes ended auctions
- **User Consent:** No explicit opt-in required
- **UI Implication:** Users may not know auctions are automatically processed
- **Severity:** Medium
- **Fix:** Add UI indicator showing "Auctions are automatically processed every 30 seconds" or require user acknowledgment

**Finding 0.1.2: WebSocket "Real-time" Claims**
- **Location:** `client/src/pages/messages.tsx:191`, `client/src/pages/product.tsx:110`
- **Language Found:** "real-time message updates", "Live bidding state"
- **Reality:** WebSocket requires active connection, not truly "real-time" if app is backgrounded
- **Severity:** Medium
- **Fix:** Clarify "Updates when app is open" instead of "real-time"

**Finding 0.1.3: Notification Cron Jobs**
- **Location:** `server/notification-cron.ts:13`, `server/offer-cron.ts:11`, `server/otp-cron.ts:11`
- **Behavior:** Automatic cleanup jobs run without user awareness
- **User Consent:** Not required (system maintenance)
- **UI Implication:** None (background maintenance)
- **Severity:** Low (acceptable for system maintenance)
- **Fix:** None required (system maintenance is acceptable)

### 0.2 Deterministic Visibility

**Status:** ❌ FAIL

**Findings:**

**Finding 0.2.1: Missing Last-Updated Timestamps**
- **Location:** Multiple screens (product pages, order history, seller dashboard)
- **Issue:** No "last updated" timestamps shown on data displays
- **Risk:** Users may see stale data as current
- **Severity:** High
- **Fix:** Add "Last updated: [timestamp]" to all data displays

**Finding 0.2.2: Stale Auction Timer Display**
- **Location:** `client/src/pages/product.tsx:799-803`
- **Issue:** Auction timer may be stale if WebSocket disconnected
- **Risk:** Users may think auction is still active when it ended
- **Severity:** Critical
- **Fix:** Show "Last updated" timestamp, warn if timer may be stale

**Finding 0.2.3: React Query Stale Data**
- **Location:** Multiple components using `useQuery`
- **Issue:** `staleTime` configurations vary, some data may be stale
- **Risk:** Users see outdated information
- **Severity:** Medium
- **Fix:** Standardize staleTime, add visual indicators for stale data

### 0.3 Fail-Closed Mobile States

**Status:** ⚠️ PARTIAL COMPLIANCE

**Findings:**

**Finding 0.3.1: Network Offline Handling**
- **Location:** `@capacitor/network` usage (needs verification)
- **Issue:** Unknown if offline state is clearly indicated
- **Severity:** Unknown (needs testing)
- **Fix:** Ensure offline indicator is visible, block actions when offline

**Finding 0.3.2: Partial Data Display**
- **Location:** Various API responses
- **Issue:** No labeling of partial data
- **Severity:** Medium
- **Fix:** Label partial data as "Partial data - some information may be missing"

### 0.4 Scope Binding

**Status:** ❌ FAIL

**Findings:**

**Finding 0.4.1: Missing Scope Indicators**
- **Location:** All data display screens
- **Issue:** No clear indication of:
  - Which product/order/user is displayed
  - When data was fetched
  - Source of data (cache vs network)
- **Severity:** High
- **Fix:** Add scope indicators (subject, timeframe, source) to all outputs

**Finding 0.4.2: Context Switching**
- **Location:** Product pages, order pages
- **Issue:** Switching between items may show stale data briefly
- **Severity:** Medium
- **Fix:** Clear previous data when switching context, show loading state

### 0.5 Auditability

**Status:** ⚠️ PARTIAL COMPLIANCE

**Findings:**

**Finding 0.5.1: Screenshot Context**
- **Location:** All screens
- **Issue:** Some screens may lack context in screenshots (no timestamps, IDs)
- **Severity:** Medium
- **Fix:** Ensure critical screens show enough context to survive screenshots

**Finding 0.5.2: Traceability**
- **Location:** Order confirmations, financial data
- **Issue:** Some outputs lack transaction IDs or traceability
- **Severity:** Medium
- **Fix:** Add transaction IDs, timestamps to all critical outputs

---

## 1) SYSTEM REALITY VS MOBILE IMPLICATIONS

### 1.1 Ground Truth

**What the system ACTUALLY does:**

1. **Auction Processing:**
   - Background job runs every 30 seconds (`server/auction-processor.ts:487`)
   - Checks for ended auctions (with 5-second grace period)
   - Automatically determines winners, creates transactions, sends notifications
   - No user action required

2. **WebSocket Real-time Updates:**
   - WebSocket connection established when user is authenticated (`client/src/hooks/use-socket-notifications.tsx:38`)
   - Requires active connection (not background)
   - Reconnects automatically (max 5 attempts)
   - Broadcasts bid updates, auction endings, notifications

3. **Cron Jobs:**
   - OTP cleanup: Runs hourly (`server/otp-cron.ts:11`)
   - Offer expiration: Runs every 5 minutes (`server/offer-cron.ts:11`)
   - Notification cleanup: Runs daily at 3 AM (`server/notification-cron.ts:13`)

4. **Push Notifications:**
   - Sent via Firebase Cloud Messaging (FCM) for mobile
   - Sent via Web Push (VAPID) for web
   - Requires user subscription (opt-in)
   - Sent when events occur (auction ended, new message, etc.)

**What the system DOES NOT do:**

1. **No 24/7 Background Monitoring:**
   - WebSocket requires app to be open
   - No background scanning when app is closed
   - Notifications are event-driven, not continuous monitoring

2. **No Automatic Order Processing:**
   - Orders require seller confirmation
   - Payment is cash-on-delivery (not automatic)
   - No automatic shipping

3. **No Continuous Data Sync:**
   - Data fetched on-demand
   - React Query caches data with configurable staleTime
   - No background sync when app is closed

**Hard constraints:**

1. Auction processor runs every 30 seconds (not configurable by user)
2. WebSocket requires active connection (disconnects when app backgrounded)
3. Push notifications require explicit subscription
4. All background jobs are server-side (not user-controllable)

### 1.2 Mobile-Implied Capabilities

From the mobile app UI, a reasonable user might think:

1. **"Live" bidding means continuous updates even when app is closed**
   - Evidence: `client/src/pages/product.tsx:110` - "Live bidding state"
   - Reality: Requires WebSocket connection (app must be open)
   - Gap: MG-01

2. **"Real-time" messages work in background**
   - Evidence: `client/src/pages/messages.tsx:191` - "real-time message updates"
   - Reality: WebSocket disconnects when app backgrounded
   - Gap: MG-02

3. **Auctions are monitored 24/7**
   - Evidence: Auction processor runs automatically
   - Reality: True (server-side), but user may not understand this
   - Gap: MG-03

4. **Notifications mean continuous monitoring**
   - Evidence: Push notifications sent automatically
   - Reality: Event-driven, not continuous monitoring
   - Gap: MG-04

### 1.3 Claim Gap Analysis

**Gap MG-01: "Live" Bidding Implies Background Updates**
- **UI implies:** "Live bidding state" suggests continuous updates
- **Reality:** WebSocket requires active connection, disconnects when app backgrounded
- **File/Screen:** `client/src/pages/product.tsx:110`, Screen M-S02 (Product Page)
- **Severity:** High
- **Exploitability:** Easy (user expects updates when app is closed)
- **Fix type:** Copy + Visual
- **Fix:** Change "Live bidding" to "Live updates (when app is open)" or "Real-time updates (requires active connection)"
- **Screenshot:** `screenshot-MG01.png` (to be taken)

**Gap MG-02: "Real-time" Messages Implies Background**
- **UI implies:** "real-time message updates" suggests background operation
- **Reality:** WebSocket disconnects when app backgrounded, messages only update when app is open
- **File/Screen:** `client/src/pages/messages.tsx:191`, Screen M-S07 (Messages)
- **Severity:** Medium
- **Exploitability:** Moderate (user may miss messages when app is closed)
- **Fix type:** Copy
- **Fix:** Change to "Instant updates when app is open" or "Real-time (requires active connection)"
- **Screenshot:** `screenshot-MG02.png` (to be taken)

**Gap MG-03: Auction Processing Not Clearly Explained**
- **UI implies:** Auctions end automatically (true) but user may not understand timing
- **Reality:** Processor runs every 30 seconds, 5-second grace period
- **File/Screen:** Auction end notifications, Screen M-S02 (Product Page)
- **Severity:** Low
- **Exploitability:** Hard (system works correctly, just unclear)
- **Fix type:** Copy + Visual
- **Fix:** Add tooltip: "Auctions are processed automatically every 30 seconds"
- **Screenshot:** `screenshot-MG03.png` (to be taken)

**Gap MG-04: Notification System Implies Monitoring**
- **UI implies:** Push notifications suggest continuous monitoring
- **Reality:** Event-driven notifications, not continuous monitoring
- **File/Screen:** Notification settings, push notification content
- **Severity:** Low
- **Exploitability:** Hard (notifications work correctly)
- **Fix type:** Copy
- **Fix:** Clarify "You'll be notified when events occur" vs "We monitor continuously"
- **Screenshot:** `screenshot-MG04.png` (to be taken)

---

## 2) MOBILE SCREEN & STATE INVENTORY

**Total Screens Found:** 35 pages  
**Routing Library:** Wouter  
**Base Path:** `client/src/pages/`

### Screen M-S01: Home Page
- **Name:** Home / Browse
- **File Path:** `client/src/pages/home.tsx`
- **Route:** `/`
- **Entry points:** Direct URL, App launch, Nav menu "Home"
- **App state required:** Cold start OK
- **Primary purpose:** Product discovery, category browsing, featured items
- **Critical outputs displayed:** Product listings, featured items, categories, search bar
- **Editable inputs:** Search bar, category filters
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** Low (public data)
- **Misinterpretation risk:** "Live" product updates, featured items rotation may imply automatic updates
- **Screenshot reference:** `screenshot-S01-home.png` (to be taken)

### Screen M-S02: Product Page
- **Name:** Product Details / Auction View
- **File Path:** `client/src/pages/product.tsx`
- **Route:** `/product/:id`
- **Entry points:** Product card click, direct URL, notification link
- **App state required:** Warm (may need auth for bidding)
- **Primary purpose:** Product details, bidding, purchase, offers
- **Critical outputs displayed:** Price, auction timer, bid history, seller info, "Live bidding state"
- **Editable inputs:** Bid amount, offer amount, quantity, message to seller
- **OS chrome visible:** Status bar, nav bar, back button
- **Screenshot risk:** Medium (price, seller info)
- **Misinterpretation risk:** 
  - "Live bidding" implies continuous updates (Gap MG-01)
  - Auction timer may be stale (Finding 0.2.2)
  - "Buy Now" implies instant success (see Gesture Audit)
- **Screenshot reference:** `screenshot-S02-product.png` (to be taken)

### Screen M-S03: Checkout
- **Name:** Checkout / Order Placement
- **File Path:** `client/src/pages/checkout.tsx`
- **Route:** `/checkout`
- **Entry points:** Cart page "Checkout" button, "Buy Now" button
- **App state required:** Auth required, cart items or product selected
- **Primary purpose:** Order placement, payment method selection, address entry
- **Critical outputs displayed:** Order total, shipping cost, delivery address, items summary
- **Editable inputs:** Full name, phone, city, address lines, save address checkbox
- **OS chrome visible:** Status bar, nav bar, back button
- **Screenshot risk:** HIGH (PII: name, phone, address)
- **Misinterpretation risk:**
  - "Place Order" implies success (see Gesture Audit)
  - Generic error messages (Finding from Phase 2)
  - No clear indication of cash-on-delivery requirement
- **Screenshot reference:** `screenshot-S03-checkout.png` (to be taken, blur PII)

### Screen M-S04: Search Results
- **Name:** Search / Browse Results
- **File Path:** `client/src/pages/search.tsx`
- **Route:** `/search`
- **Entry points:** Search bar, direct URL with query params
- **App state required:** Cold start OK
- **Primary purpose:** Search results display, filtering
- **Critical outputs displayed:** Search results, filters applied, result count
- **Editable inputs:** Search query, category filter, price range, sale type
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** Low (public data)
- **Misinterpretation risk:**
  - Client-side filtering implies incomplete results (KNOWN ISSUE)
  - No timestamp showing when search was performed
- **Screenshot reference:** `screenshot-S04-search.png` (to be taken)

### Screen M-S05: Sell Page
- **Name:** Create Listing / Sell Item
- **File Path:** `client/src/pages/sell.tsx`
- **Route:** `/sell`
- **Entry points:** Nav menu "Sell", seller dashboard "New Listing"
- **App state required:** Auth required, seller approval required
- **Primary purpose:** Create new product listing
- **Critical outputs displayed:** Form fields, image previews, pricing options
- **Editable inputs:** Title, description, price, images, shipping, delivery window, return policy
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** Medium (seller info, product details)
- **Misinterpretation risk:**
  - Camera upload may fail silently (see Gesture Audit)
  - Form validation errors may be unclear
- **Screenshot reference:** `screenshot-S05-sell.png` (to be taken)

### Screen M-S06: My Account
- **Name:** User Profile / Account Settings
- **File Path:** `client/src/pages/my-account.tsx`
- **Route:** `/my-account`
- **Entry points:** Account dropdown, nav menu
- **App state required:** Auth required
- **Primary purpose:** View/edit profile, account settings, verification status
- **Critical outputs displayed:** Profile info, avatar, verification status, stats
- **Editable inputs:** Display name, avatar, phone verification
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** Medium (PII: name, phone, avatar)
- **Misinterpretation risk:** None significant
- **Screenshot reference:** `screenshot-S06-account.png` (to be taken)

### Screen M-S07: Messages
- **Name:** Messages / Conversations
- **File Path:** `client/src/pages/messages.tsx`
- **Route:** `/messages` or `/messages/:partnerId`
- **Entry points:** Nav menu, notification link, product page "Message Seller"
- **App state required:** Auth required
- **Primary purpose:** User-to-user messaging
- **Critical outputs displayed:** Conversation list, messages, read/unread status
- **Editable inputs:** Message text input
- **OS chrome visible:** Status bar, nav bar, back button
- **Screenshot risk:** Medium (message content, user names)
- **Misinterpretation risk:**
  - "Real-time message updates" implies background operation (Gap MG-02)
  - Messages may not update when app is backgrounded
- **Screenshot reference:** `screenshot-S07-messages.png` (to be taken)

### Screen M-S08: My Purchases
- **Name:** Order History / Purchase History
- **File Path:** `client/src/pages/my-purchases.tsx`
- **Route:** `/my-purchases`
- **Entry points:** Nav menu, buyer dashboard, notification link
- **App state required:** Auth required
- **Primary purpose:** View purchase history, track orders, rate sellers
- **Critical outputs displayed:** Order list, status, dates, delivery tracking
- **Editable inputs:** None (view-only)
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** Medium (order details, addresses)
- **Misinterpretation risk:**
  - No "last updated" timestamp (Finding 0.2.1)
  - Order status may be stale
- **Screenshot reference:** `screenshot-S08-purchases.png` (to be taken)

### Screen M-S09: My Sales
- **Name:** Seller Sales / Transaction History
- **File Path:** `client/src/pages/my-sales.tsx`
- **Route:** `/my-sales`
- **Entry points:** Nav menu, seller dashboard
- **App state required:** Auth required, seller approval required
- **Primary purpose:** View sales history, manage orders, mark as delivered
- **Critical outputs displayed:** Sales list, order status, buyer info, delivery addresses
- **Editable inputs:** Mark as delivered button, status filters
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** Medium (buyer info, addresses)
- **Misinterpretation risk:** None significant
- **Screenshot reference:** `screenshot-S09-sales.png` (to be taken)

### Screen M-S10: Seller Dashboard
- **Name:** Seller Dashboard / Analytics
- **File Path:** `client/src/pages/seller-dashboard.tsx`
- **Route:** `/seller-dashboard`
- **Entry points:** Nav menu, seller profile
- **App state required:** Auth required, seller approval required
- **Primary purpose:** Manage listings, view offers, messages, sales stats
- **Critical outputs displayed:** Listings, offers, messages, earnings, statistics
- **Editable inputs:** Listing management, offer responses, stock updates
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** Medium (financial data, seller info)
- **Misinterpretation risk:**
  - Financial data may be stale (no timestamp)
  - Statistics may not update in real-time
- **Screenshot reference:** `screenshot-S10-seller-dashboard.png` (to be taken)

### Screen M-S11: Notifications
- **Name:** Notifications List
- **File Path:** `client/src/pages/notifications.tsx`
- **Route:** `/notifications`
- **Entry points:** Notification bell icon, nav menu
- **App state required:** Auth required
- **Primary purpose:** View all notifications, mark as read
- **Critical outputs displayed:** Notification list, types, timestamps, read/unread status
- **Editable inputs:** Mark as read, delete
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** Low-Medium (notification content may contain PII)
- **Misinterpretation risk:** None significant
- **Screenshot reference:** `screenshot-S11-notifications.png` (to be taken)

### Screen M-S12: Cart
- **Name:** Shopping Cart
- **File Path:** `client/src/pages/cart.tsx`
- **Route:** `/cart`
- **Entry points:** Cart icon, "Add to Cart" button
- **App state required:** Auth required (for persistent cart)
- **Primary purpose:** View cart items, proceed to checkout
- **Critical outputs displayed:** Cart items, quantities, prices, total
- **Editable inputs:** Quantity, remove items
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** Low (public product data)
- **Misinterpretation risk:** Prices may be stale (snapshot at add-to-cart time)
- **Screenshot reference:** `screenshot-S12-cart.png` (to be taken)

### Screen M-S13: Buyer Dashboard
- **Name:** Buyer Dashboard
- **File Path:** `client/src/pages/buyer-dashboard.tsx`
- **Route:** `/buyer-dashboard`
- **Entry points:** Nav menu, account dropdown
- **App state required:** Auth required
- **Primary purpose:** View purchases, offers, bids, favorites
- **Critical outputs displayed:** Purchases, offers, bids, watchlist
- **Editable inputs:** None (view-only)
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** Low-Medium (order data)
- **Misinterpretation risk:** None significant
- **Screenshot reference:** `screenshot-S13-buyer-dashboard.png` (to be taken)

### Screen M-S14: My Bids
- **Name:** Bidding History
- **File Path:** `client/src/pages/my-bids.tsx`
- **Route:** `/my-bids`
- **Entry points:** Nav menu, buyer dashboard
- **App state required:** Auth required
- **Primary purpose:** View bidding history, active bids, won auctions
- **Critical outputs displayed:** Bid list, auction status, winning status
- **Editable inputs:** None (view-only)
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** Low (public auction data)
- **Misinterpretation risk:** Bid status may be stale
- **Screenshot reference:** `screenshot-S14-bids.png` (to be taken)

### Screen M-S15: Admin Dashboard
- **Name:** Admin Panel
- **File Path:** `client/src/pages/admin.tsx`
- **Route:** `/admin`
- **Entry points:** Direct URL (admin only)
- **App state required:** Auth required, admin role required
- **Primary purpose:** Site management, user moderation, reports
- **Critical outputs displayed:** Statistics, reports, users, listings
- **Editable inputs:** Ban users, remove listings, resolve reports
- **OS chrome visible:** Status bar, nav bar
- **Screenshot risk:** High (sensitive admin data, user PII)
- **Misinterpretation risk:** None significant (admin-only)
- **Screenshot reference:** `screenshot-S15-admin.png` (to be taken, blur sensitive data)

### Additional Screens (M-S16 to M-S35):
- M-S16: Register (`register.tsx`) - User registration
- M-S17: Sign In (`signin.tsx`) - Authentication
- M-S18: Forgot Password (`forgot-password.tsx`) - Password reset
- M-S19: Settings (`settings.tsx`) - App settings
- M-S20: Security Settings (`security-settings.tsx`) - Security preferences
- M-S21: Favorites (`favorites.tsx`) - Saved items
- M-S22: Seller Profile (`seller-profile.tsx`) - Public seller page
- M-S23: My Auctions (`my-auctions.tsx`) - Seller's auctions
- M-S24: Auctions Dashboard (`auctions-dashboard.tsx`) - All auctions
- M-S25: Swipe (`swipe.tsx`) - Tinder-style discovery
- M-S26: Browse Recently Viewed (`browse-recently-viewed.tsx`) - History
- M-S27: About (`about.tsx`) - About page
- M-S28: Contact (`contact.tsx`) - Contact form
- M-S29: Privacy (`privacy.tsx`) - Privacy policy
- M-S30: Terms (`terms.tsx`) - Terms of service
- M-S31: Security Guide (`security-guide.tsx`) - Security information
- M-S32: Deals Guide (`deals-guide.tsx`) - Shopping guide
- M-S33: Onboarding (`onboarding.tsx`) - First-time user tutorial
- M-S34: Data Deletion (`data-deletion.tsx`) - GDPR request
- M-S35: Not Found (`not-found.tsx`) - 404 page

*[Detailed audit of additional screens to be completed in full audit]*

---

## 3) HOSTILE GESTURE & AFFORDANCE AUDIT

**Total Interactive Elements Audited:** 50+ (focusing on critical flows)

### Element M-A01: "Buy Now" Button
- **Screen:** M-S02 (Product Page)
- **Gesture:** Tap
- **Label:** "شراء الآن" (Buy Now) or "أضف للسلة" (Add to Cart)
- **File/Component:** `client/src/pages/product.tsx` (exact line to be identified)
- **Actual behavior:** 
  - If fixed-price: Adds to cart or redirects to checkout
  - If auction: May show "Buy Now" option if `buyNowPrice` is set
- **Likely user interpretation:** "I will own this item now" or "Order will be placed immediately"
- **Risk level:** Critical
- **Risk reason:** 
  - Implies instant success, but payment is cash-on-delivery
  - Order may fail (validation, stock, seller cancellation)
  - No clear indication of payment method
- **Required fix:**
  - Add confirmation dialog: "سيتم إنشاء الطلب. الدفع عند الاستلام" (Order will be created. Payment on delivery)
  - Show loading state during submission
  - Clear error message if order fails
  - Indicate payment method (cash-on-delivery)
- **Screenshot:** `screenshot-A01-buynow.png` (to be taken)

### Element M-A02: "Place Bid" Button
- **Screen:** M-S02 (Product Page)
- **Gesture:** Tap
- **Label:** "ضع مزايدة" (Place Bid)
- **File/Component:** `client/src/pages/product.tsx` (exact line to be identified)
- **Actual behavior:** Submits bid via API, updates UI via WebSocket
- **Likely user interpretation:** "My bid is now active and highest"
- **Risk level:** High
- **Risk reason:**
  - No confirmation dialog
  - No clear feedback if bid fails (too low, auction ended, network error)
  - Timer may be stale, user may bid on ended auction
  - No indication of minimum bid increment
- **Required fix:**
  - Show bid confirmation with amount: "تأكيد المزايدة: [amount] د.ع"
  - Clear error messages: "المزاد انتهى" (Auction ended), "المزايدة منخفضة جداً" (Bid too low)
  - Show "Last updated" timestamp for auction timer
  - Validate bid amount before submission
- **Screenshot:** `screenshot-A02-bid.png` (to be taken)

### Element M-A03: "Upload Photo" / Camera Trigger
- **Screen:** M-S05 (Sell Page), M-S06 (My Account)
- **Gesture:** Tap
- **Label:** Camera icon / "رفع صورة" (Upload Photo)
- **File/Component:** `client/src/pages/sell.tsx`, `client/src/pages/my-account.tsx`
- **Actual behavior:** Opens camera/photo picker, uploads to server
- **Likely user interpretation:** "Photo will be uploaded and saved"
- **Risk level:** High
- **Risk reason:**
  - Permission denied handling unclear
  - Upload may fail silently
  - No progress indicator
  - User may not know photo is being processed/compressed
- **Required fix:**
  - Clear permission prompt: "نحتاج إلى الوصول إلى الكاميرا لالتقاط صورة المنتج" (We need camera access to take product photo)
  - Show upload progress: "جاري رفع الصورة..." (Uploading photo...)
  - Clear error if upload fails: "فشل رفع الصورة. حاول مرة أخرى" (Upload failed. Try again)
  - Allow app use without camera (optional feature)
- **Screenshot:** `screenshot-A03-camera.png` (to be taken)

### Element M-A04: "Share" Button
- **Screen:** Multiple (Product, Seller Profile, etc.)
- **Gesture:** Tap
- **Label:** Share icon
- **File/Component:** `client/src/lib/share-utils.ts`
- **Actual behavior:** Opens native share sheet, shares URL
- **Likely user interpretation:** "I'm sharing this product/seller"
- **Risk level:** Medium
- **Risk reason:**
  - May leak auth tokens in URL (needs verification)
  - No control over what's shared
  - Clipboard behavior unclear
- **Required fix:**
  - Ensure URLs don't contain tokens (verify share URLs)
  - Test clipboard behavior (copy link)
  - Verify share content is appropriate (no PII)
- **Screenshot:** `screenshot-A04-share.png` (to be taken)

### Element M-A05: "Place Order" Button
- **Screen:** M-S03 (Checkout)
- **Gesture:** Tap
- **Label:** "إتمام الطلب" (Complete Order) or "تأكيد الطلب" (Confirm Order)
- **File/Component:** `client/src/pages/checkout.tsx` (exact line to be identified)
- **Actual behavior:** Submits order, creates transactions, shows success
- **Likely user interpretation:** "Order is confirmed and will be delivered"
- **Risk level:** Critical
- **Risk reason:**
  - Implies success, but order may fail (validation, stock, payment)
  - Generic error messages (KNOWN ISSUE)
  - No clear indication of next steps
- **Required fix:**
  - Show confirmation: "سيتم مراجعة الطلب من قبل البائع" (Order will be reviewed by seller)
  - Clear error messages with field-specific details (fix known issue)
  - Show order ID after success
  - Indicate payment method and delivery timeline
- **Screenshot:** `screenshot-A05-placeorder.png` (to be taken)

### Element M-A06: "Mark as Delivered" Button
- **Screen:** M-S09 (My Sales), M-S10 (Seller Dashboard)
- **Gesture:** Tap
- **Label:** "تم التسليم" (Mark as Delivered)
- **File/Component:** `client/src/pages/my-sales.tsx:289`, `client/src/pages/seller-dashboard.tsx:763`
- **Actual behavior:** Updates transaction status to "delivered"
- **Likely user interpretation:** "Order is delivered and complete"
- **Risk level:** Medium
- **Risk reason:**
  - No confirmation dialog
  - Irreversible action (may need to undo)
  - Buyer may dispute delivery
- **Required fix:**
  - Add confirmation: "هل أنت متأكد من أن الطلب تم تسليمه؟" (Are you sure the order was delivered?)
  - Show warning: "لا يمكن التراجع عن هذا الإجراء" (This action cannot be undone)
  - Allow cancellation within time limit (if needed)
- **Screenshot:** `screenshot-A06-delivered.png` (to be taken)

### Element M-A07: Pull-to-Refresh
- **Screen:** Multiple (Home, Search, Messages, etc.)
- **Gesture:** Swipe down
- **Label:** None (gesture-based)
- **File/Component:** Various pages using React Query refetch
- **Actual behavior:** Refetches data from server
- **Likely user interpretation:** "Data is being updated now"
- **Risk level:** Low
- **Risk reason:**
  - Implies manual refresh (correct)
  - May show stale data before refresh completes
- **Required fix:**
  - Show loading indicator during refresh
  - Show "Last updated" timestamp after refresh
- **Screenshot:** `screenshot-A07-refresh.png` (to be taken)

*[Additional gestures to be audited: swipe-to-delete, long-press actions, form submissions]*

---

## 4) APP LIFECYCLE DECEPTION AUDIT

### Test L-01: Cold Start
- **Scenario:** App opened from scratch (cleared cache/cookies)
- **Expected fail-closed behavior:** Show login/empty state, no stale data
- **Actual behavior:** React Query cache may persist in localStorage, auth state may be restored
- **Stale output shown?** Likely YES (React Query cache persists)
- **User warned if partial?** NO (no warning shown)
- **Severity:** Medium
- **File:** `client/src/App.tsx`, `client/src/main.tsx`, `client/src/lib/queryClient.ts`
- **Fix:** Clear React Query cache on cold start, or show "Data may be outdated" warning

### Test L-02: Background → Foreground
- **Scenario:** App backgrounded 10+ minutes, then resumed
- **Expected fail-closed behavior:** Invalidate stale data, show staleness warning or refresh
- **Actual behavior:** React Query uses `staleTime` configs (varies by query), may show stale data
- **Stale output shown?** Likely YES (depends on staleTime configuration)
- **User warned?** NO (no warning shown)
- **Severity:** High
- **File:** `client/src/hooks/use-auth.ts`, React Query staleTime configs
- **Fix:** 
  - Add `refetchOnWindowFocus: true` to critical queries
  - Show "Data may be outdated" warning if data is stale
  - Add "Last updated" timestamps

### Test L-03: App Kill → Reopen
- **Scenario:** OS kills app (memory pressure), user reopens
- **Expected fail-closed behavior:** Treat as cold start or restore with validation
- **Actual behavior:** React Query cache persists in localStorage, may restore stale data
- **Severity:** Medium
- **Fix:** Clear cache on app kill, or validate data freshness on restore

### Test L-04: Network Drop → Resume
- **Scenario:** Navigate app, go offline, come back online
- **Expected fail-closed behavior:** Show offline indicator, block actions, refresh on return
- **Actual behavior:** 
  - `@capacitor/network` plugin available but usage unclear
  - React Query may show cached data without offline indicator
- **Does app pretend network is available?** Likely YES (shows cached data)
- **Severity:** High
- **File:** `@capacitor/network` usage, React Query error handling
- **Fix:**
  - Use `@capacitor/network` to detect offline state
  - Show offline indicator when network unavailable
  - Block actions when offline
  - Refresh data when network resumes

### Test L-05: Device Lock/Unlock
- **Scenario:** Lock device mid-checkout, unlock
- **Expected fail-closed behavior:** Sensitive screens require re-auth or blur content
- **Actual behavior:** 
  - No re-auth required (session persists)
  - No blur on background (see Privacy Audit)
- **Payment/checkout screens protected?** NO (no protection)
- **Severity:** High
- **Fix:** 
  - Implement blur on background using Capacitor App lifecycle hooks
  - Or require re-auth for sensitive screens (checkout, payment)

### Test L-06: App Switcher Snapshot
- **Scenario:** Switch apps, check app switcher preview
- **Expected fail-closed behavior:** Blur sensitive data in snapshot
- **Actual behavior:** 
  - No blur implemented
  - Sensitive data visible in app switcher (see Privacy Audit)
- **Screenshot risk in app switcher:** HIGH (PII visible)
- **Severity:** High
- **Fix:** Implement `useEffect` hook to blur on `appStateChange` to background (same as Privacy fix)

**Hard Rule Compliance:**
- [ ] No output persists across lifecycle changes without validation
- **Status:** ❌ FAIL - Data persists without validation, no warnings shown

---

## 5) BACKGROUND & AUTOMATION INFERENCE AUDIT

### 5.1 Background Semantics Discovery

**Items found that imply background behavior:**

**Item B-01: "Live bidding state"**
- **Location:** Screen M-S02, component `client/src/pages/product.tsx:110`
- **UI element:** Comment/state variable: "Live bidding state"
- **Implied background behavior:** Continuous updates, real-time bidding
- **Reality: Does background work exist?** Yes (WebSocket), but requires active connection
- **If YES, is it user-consented?** Yes (user opens app, WebSocket connects automatically)
- **If NO, user is misled:** Partially (WebSocket disconnects when backgrounded)
- **Severity:** Medium
- **Fix:**
  - Change to "Live updates (when app is open)"
  - Add tooltip: "Updates require active connection"
- **Screenshot:** `screenshot-B01.png` (to be taken)

**Item B-02: "real-time message updates"**
- **Location:** Screen M-S07, component `client/src/pages/messages.tsx:191`
- **UI element:** Comment: "Listen for real-time message updates via WebSocket"
- **Implied background behavior:** Continuous message monitoring
- **Reality: Does background work exist?** Yes (WebSocket), but requires active connection
- **If YES, is it user-consented?** Yes (automatic on app open)
- **If NO, user is misled:** Partially (disconnects when backgrounded)
- **Severity:** Medium
- **Fix:**
  - Change to "Instant updates when app is open"
  - Clarify WebSocket connection status
- **Screenshot:** `screenshot-B02.png` (to be taken)

**Item B-03: Auction Timer Auto-Update**
- **Location:** Screen M-S02, component `client/src/pages/product.tsx:799-803`
- **UI element:** Auction countdown timer
- **Implied background behavior:** Timer updates automatically
- **Reality: Does background work exist?** Yes (WebSocket updates), but may be stale
- **If YES, is it user-consented?** Yes (automatic)
- **If NO, user is misled:** Yes (timer may be stale if WebSocket disconnected)
- **Severity:** High
- **Fix:**
  - Show "Last updated" timestamp
  - Warn if timer may be stale: "Timer may be outdated. Refresh page."
- **Screenshot:** `screenshot-B03.png` (to be taken)

**Item B-04: Auto-Refresh Indicators**
- **Location:** Multiple screens using React Query
- **UI element:** Loading spinners, data refresh
- **Implied background behavior:** Automatic data refresh
- **Reality: Does background work exist?** No (manual refresh or on-focus)
- **If YES, is it user-consented?** N/A
- **If NO, user is misled:** No (spinners indicate loading, not background)
- **Severity:** Low
- **Fix:** None needed (spinners are appropriate)

**Item B-05: Push Notifications**
- **Location:** Notification system
- **UI element:** Push notification setup, notification content
- **Implied background behavior:** Background monitoring, 24/7 alerts
- **Reality: Does background work exist?** Yes (server-side event-driven notifications)
- **If YES, is it user-consented?** Yes (explicit opt-in required)
- **If NO, user is misled:** No (notifications are event-driven, not continuous monitoring)
- **Severity:** Low
- **Fix:** Clarify "You'll be notified when events occur" vs "We monitor continuously"

### 5.2 Explicit Consent Verification

- [ ] Background behavior requires opt-in toggle: **NO** (WebSocket connects automatically)
- [ ] Off switch is visible and functional: **NO** (no WebSocket toggle)
- [ ] Last-run timestamp shown on outputs: **NO** (Finding 0.2.1)
- [ ] No background work occurs without UI confirmation: **PARTIAL** (WebSocket auto-connects, but user opens app)

**Violations found:**
1. WebSocket auto-connects without explicit opt-in (but this is expected behavior)
2. No "last updated" timestamps on data outputs
3. No way to disable WebSocket connection (but this would break functionality)

---

## 6) NOTIFICATION HOSTILITY AUDIT

**CRITICAL:** `@capacitor/push-notifications` is installed and configured.

**Configuration found:**
- File: `capacitor.config.ts:29-31`
- Presentation options: badge, sound, alert
- Permission prompt location: [To be found in code]

### Notification Type N-01: Auction Ending Soon
- **Notification ID:** M-N01
- **Type:** Push notification
- **Trigger condition:** Auction ending soon (if implemented)
- **Code location:** [To be found]
- **User consented explicitly?** [To be verified]
- **Opt-in UI location:** [To be found]
- **Content example:** [To be tested]
- **Implies urgency?** [To be tested]
- **Implies monitoring/background work?** [To be tested]
- **Timestamp shown?** [To be tested]
- **Scope shown (which auction)?** [To be tested]
- **Screenshot-safe (no PII)?** [To be tested]
- **Lock-screen preview safe?** [To be tested]
- **Severity if violated:** [To be determined]
- **Fix:** [If needed]

### Notification Type N-02: Auction Ended - Winner
- **Notification ID:** M-N02
- **Type:** Push notification
- **Trigger condition:** User won auction
- **Code location:** `server/auction-processor.ts:317-322`
- **User consented explicitly?** [To be verified - requires push subscription]
- **Opt-in UI location:** [To be found]
- **Content example:** [To be tested - uses `getNotificationMessage('auction_won')`]
- **Implies urgency?** Likely Yes (winning notification)
- **Implies monitoring/background work?** Yes (auction was monitored)
- **Timestamp shown?** [To be tested]
- **Scope shown (which auction)?** Likely Yes (includes listing title)
- **Screenshot-safe (no PII)?** [To be tested]
- **Lock-screen preview safe?** [To be tested - may show auction title]
- **Severity if violated:** [To be determined]
- **Fix:** [If needed]

### Notification Type N-03: Auction Ended - Outbid
- **Notification ID:** M-N03
- **Type:** Push notification
- **Trigger condition:** User was outbid
- **Code location:** `server/auction-processor.ts:395-400`
- **User consented explicitly?** [To be verified]
- **Content example:** [To be tested - uses `getNotificationMessage('auction_lost')`]
- **Implies urgency?** Likely Yes
- **Implies monitoring/background work?** Yes
- **Timestamp shown?** [To be tested]
- **Scope shown?** Likely Yes
- **Screenshot-safe?** [To be tested]
- **Lock-screen preview safe?** [To be tested]
- **Severity if violated:** [To be determined]
- **Fix:** [If needed]

### Notification Type N-04: New Message
- **Notification ID:** M-N04
- **Type:** Push notification
- **Trigger condition:** New message received
- **Code location:** `server/routes/messages.ts` (to be verified)
- **User consented explicitly?** [To be verified]
- **Content example:** [To be tested - may contain message preview]
- **Implies urgency?** [To be tested]
- **Implies monitoring/background work?** Yes (message monitoring)
- **Timestamp shown?** [To be tested]
- **Scope shown (sender)?** [To be tested]
- **Screenshot-safe?** [To be tested - message preview may contain PII]
- **Lock-screen preview safe?** [To be tested - CRITICAL: message preview visible]
- **Severity if violated:** [To be determined - HIGH if message preview visible]
- **Fix:** [If needed - may need to hide message preview on lock screen]

### Notification Type N-05: Order Status Update
- **Notification ID:** M-N05
- **Type:** Push notification
- **Trigger condition:** Order status changed
- **Code location:** `server/routes/transactions.ts` (to be verified)
- **User consented explicitly?** [To be verified]
- **Content example:** [To be tested]
- **Implies urgency?** [To be tested]
- **Implies monitoring/background work?** Yes
- **Timestamp shown?** [To be tested]
- **Scope shown (order ID)?** [To be tested]
- **Screenshot-safe?** [To be tested]
- **Lock-screen preview safe?** [To be tested]
- **Severity if violated:** [To be determined]
- **Fix:** [If needed]

### Notification Type N-06: Offer Received
- **Notification ID:** M-N06
- **Type:** Push notification
- **Trigger condition:** Seller receives offer
- **Code location:** `server/routes/offers.ts` (to be verified)
- **User consented explicitly?** [To be verified]
- **Content example:** [To be tested]
- **Implies urgency?** [To be tested]
- **Implies monitoring/background work?** Yes
- **Timestamp shown?** [To be tested]
- **Scope shown?** [To be tested]
- **Screenshot-safe?** [To be tested]
- **Lock-screen preview safe?** [To be tested]
- **Severity if violated:** [To be determined]
- **Fix:** [If needed]

### Notification Type N-07: Offer Expired
- **Notification ID:** M-N07
- **Type:** Push notification (if implemented)
- **Trigger condition:** Offer expired (cron job)
- **Code location:** `server/offer-cron.ts` (to be verified)
- **User consented explicitly?** [To be verified]
- **Content example:** [To be tested]
- **Implies urgency?** [To be tested]
- **Implies monitoring/background work?** Yes (cron job monitoring)
- **Timestamp shown?** [To be tested]
- **Scope shown?** [To be tested]
- **Screenshot-safe?** [To be tested]
- **Lock-screen preview safe?** [To be tested]
- **Severity if violated:** [To be determined]
- **Fix:** [If needed]

### Hard Rules Compliance

- [ ] No notifications sent without explicit opt-in: **TO BE VERIFIED**
- [ ] No background-triggered notifications implying monitoring: **TO BE VERIFIED**
- [ ] No alert notifications without scope + timestamp: **TO BE VERIFIED**
- [ ] Notification content does not imply system authority: **TO BE VERIFIED**
- [ ] Opt-out is as easy as opt-in: **TO BE VERIFIED**

**Violations found:** [To be documented after testing]

---

## PHASE 1 SUMMARY

**Total Findings:** 25+ (in progress)
**Critical:** 3
**High:** 8
**Medium:** 10+
**Low:** 4+

**Top 3 Most Severe Issues:**

1. **Finding 0.2.2: Stale Auction Timer Display** - Users may bid on ended auctions
2. **Gap MG-01: "Live" Bidding Implies Background Updates** - Misleading language
3. **Element M-A01: "Buy Now" Button** - Implies instant success, no payment clarity

**Estimated Fix Effort:**
- Copy changes: 8 findings
- Visual changes: 5 findings
- State/logic changes: 7 findings
- Lifecycle fixes: 5 findings

**Next Phase Preview:**

Phase 2 will audit scope confusion, error states, privacy leaks, and compliance language (Sections 7-13).

---

**END PHASE 1 AUDIT**

*Note: This audit is in progress. Browser testing and screenshot capture will be completed in full execution. All findings marked "[To be tested]" require browser automation testing.*
