# 🎨 SWIPE REEL BUTTON LAYOUT

## Visual Reference for Instagram-Style Button Positioning

```
┌─────────────────────────────────────────┐
│  [Filter Badge]          [1/50]         │ ← Top overlay
│                                         │
│                                         │
│                                    ┌────┤
│         PRODUCT IMAGE              │ ♡  │ ← Favorite (12x12)
│      (object-contain on            │    │
│       bg-zinc-950)                 ├────┤
│                                    │ 💬 │ ← Details (12x12)
│                                    │    │
│                                    ├────┤
│                                    │ ⤴  │ ← Share (12x12)
│                                    │    │
│                                    ├────┤
│                                    │    │
│                                    │ 🔨 │ ← BID/BUY (14x14)
│                                    │    │   Primary action
│                                    └────┘
│  ┌─────────────────────────────┐        │
│  │ Black gradient overlay ↑    │        │
│  │ Product Title              │        │
│  │ 50,000 د.ع                 │        │
│  │ [Seller] ⭐ 4.8  👁 234    │        │
│  └─────────────────────────────┘        │
└─────────────────────────────────────────┘
```

---

## Button Specifications

### Primary Action Button (Bid/Buy)
```css
Size: 14 x 14 (h-14 w-14)
Position: Fixed, right-4, top-1/2 -translate-y-1/2
Z-Index: 9999
Background: 
  - Auction: bg-primary/90 (orange)
  - Fixed-price: bg-green-500/90 (green)
Border: border-2 border-white/20
Effect: backdrop-blur-md, shadow-lg
Icon: 7x7 (h-7 w-7)
Hover: scale-110
Active: scale-95
```

### Secondary Buttons (Favorite, Details, Share)
```css
Size: 12 x 12 (h-12 w-12)
Position: Same column, 4px gap (gap-4)
Z-Index: 9999
Background: bg-black/30
Effect: backdrop-blur-md
Icon: 6x6 (h-6 w-6) white
Hover: scale-110
Active: scale-95
```

---

## Button Stack Order (Top to Bottom)

1. **Favorite** - Heart icon, fills red when active
2. **Details** - Message bubble, opens product sheet
3. **Share** - Share arrow, native share or copy link
4. **Bid/Buy** - Gavel (auction) or $ (fixed), main CTA

---

## Conditional Rendering Logic

### All Buttons Show When:
```tsx
// Button appears if:
!isSoldOut && listing.isActive
```

### Button Type Logic:
```tsx
if (isAuction) {
  // Show Bid button (gavel icon, primary color)
} else {
  // Show Buy button ($ symbol, green color)
}
```

### Case-Insensitive Check:
```tsx
const isAuction = listing.saleType?.toLowerCase() === "auction";
```

---

## Stacking Context Solution

### Problem:
Motion.div creates isolated stacking context with z-index: 10

### Solution:
```tsx
<div style={{ 
  position: 'fixed',      // Break out of motion.div context
  zIndex: 9999,           // Top of everything
  pointerEvents: 'auto',  // Clickable
  isolation: 'isolate'    // Create new context
}}>
```

---

## Color System

### Primary Action Colors
- **Auction Bid:** `hsl(var(--primary))` at 90% opacity
- **Fixed Buy:** `rgb(34 197 94)` (green-500) at 90% opacity

### Secondary Action Colors
- **Background:** `rgba(0,0,0,0.3)` (black at 30%)
- **Icons:** White (`text-white`)
- **Border:** `rgba(255,255,255,0.2)` (white at 20%)

### Container Colors
- **Main BG:** `bg-zinc-950` (#09090b) - subtle depth
- **Gradient:** `rgba(0,0,0,0.9)` to transparent

---

## Animation Timings

### Button Interactions
```
Hover: 110% scale (grow)
Active: 95% scale (shrink)
Transition: transition-all (smooth all properties)
```

### Page Transitions
```
Duration: 350ms (0.35s)
Easing: cubic-bezier(0.25, 0.1, 0.25, 1)
Properties: y, opacity, scale
```

### Wheel Scroll Cooldown
```
Cooldown: 800ms
Prevents: Rapid-fire scrolling
Effect: Smooth, intentional navigation
```

---

## Responsive Breakpoints

### Mobile (< 768px)
- Touch swipe: Vertical = navigate, Horizontal = image carousel
- Button size: 12x12 secondary, 14x14 primary (comfortable tap)
- Fixed positioning works perfectly

### Desktop (≥ 768px)
- Wheel scroll: 800ms cooldown navigation
- Arrow keys: Instant response (ArrowUp/Down)
- Hover effects: scale-110 on buttons
- Fixed positioning: Right side, centered vertically

---

## Accessibility

### ARIA Labels
```tsx
aria-label={language === "ar" ? "مزايدة" : "مزایدە"}  // Bid
aria-label={language === "ar" ? "اشتري الآن" : "ئێستا بکڕە"}  // Buy
```

### Click Handlers
```tsx
onClick={(e) => {
  e.stopPropagation();  // Prevent card navigation
  onBidOpen();          // Open bid sheet
}}
```

### Visual Feedback
- Hover: 10% scale increase
- Active: 5% scale decrease
- Haptic: Light feedback on navigation

---

## Production Checklist

Before deploying:

- [ ] Re-enable `isOwnProduct` check if needed:
  ```tsx
  {!isOwnProduct && !isSoldOut && listing.isActive && (
  ```

- [ ] Verify button visibility on:
  - [ ] Auction items
  - [ ] Fixed-price items
  - [ ] Your own listings (should/shouldn't show)
  - [ ] Sold out items (shouldn't show)

- [ ] Test interactions:
  - [ ] Bid button opens BiddingWindow
  - [ ] Buy button adds to cart
  - [ ] Share copies link
  - [ ] Favorite toggles state

- [ ] Verify styling:
  - [ ] Buttons visible above image
  - [ ] Backdrop blur working
  - [ ] Colors correct (orange bid, green buy)
  - [ ] Animations smooth

---

## Debug Tips

If buttons still invisible:

1. **Check console for listing data:**
   ```js
   console.log({
     saleType: listing.saleType,
     isActive: listing.isActive,
     isSoldOut,
     shouldShow: !isSoldOut && listing.isActive
   });
   ```

2. **Force visibility temporarily:**
   ```tsx
   <div style={{ 
     background: 'red',  // Make it obvious
     zIndex: 99999 
   }}>
   ```

3. **Check browser DevTools:**
   - Elements tab: Verify buttons exist in DOM
   - Computed styles: Check z-index, position, display
   - Console: Look for React errors

---

**Layout Complete! All buttons properly positioned and styled.** 🎨
