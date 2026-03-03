# 🔍 SWIPE FUNCTION AUDIT REPORT

**Date:** 2026-02-05  
**Status:** Critical Issues Identified + Debug Mode Activated

---

## 📋 EXECUTIVE SUMMARY

The swipe function has **3 critical architectural issues** that cause invisible buttons and obscured images. This audit identified root causes and implemented force-visible proof-of-concept debugging.

---

## 🔴 CRITICAL FINDINGS

### **Issue #1: OptimizedImage Component Override**

**Severity:** CRITICAL  
**Location:** `client/src/components/optimized-image.tsx:77`

**Root Cause:**  
The `OptimizedImage` component hardcodes `object-cover` on the `<img>` tag, completely ignoring any `object-contain` classes passed via props. The className prop only applies to the wrapper div, not the actual image element.

**Impact:**  
- Images are cropped instead of contained
- Black bars appear where image doesn't fill container
- Product images are partially cut off

**Original Code:**
```tsx
<img
  src={src}
  alt={alt}
  className="absolute inset-0 h-full w-full object-cover" // ❌ Hardcoded
/>
```

**Fix Applied:**
- Added `objectFit` prop to OptimizedImage interface
- Made img tag respect the prop with conditional className
- Updated swipe-reel-item to pass `objectFit="contain"`

---

### **Issue #2: Motion.div Stacking Context Trap**

**Severity:** CRITICAL  
**Location:** `client/src/pages/swipe.tsx:378-394`

**Root Cause:**  
The `motion.div` wrapper creates an isolated stacking context with `zIndex: 10` (current item) or `zIndex: 5` (other items). All children of SwipeReelItem are trapped inside this context, meaning:

- Action buttons have `z-index: 30` relative to their parent
- But their parent (motion.div) has `z-index: 10` relative to siblings
- Result: Buttons cannot rise above other motion.div elements

**Impact:**  
- All action buttons are invisible or covered by overlays
- Bid/Buy buttons don't appear even when conditions are met
- Gradient overlay may cover interactive elements

**Temporary Debug Fix:**
Changed buttons to use `position: fixed` with `zIndex: 9999` to break out of stacking context and prove they exist.

**Production Fix Required:**
Either:
1. Remove z-index from motion.div (let natural stacking work)
2. Move action buttons outside motion.div wrapper
3. Use `isolation: isolate` carefully

---

### **Issue #3: Overflow Hidden Clipping**

**Severity:** MEDIUM  
**Location:** `client/src/pages/swipe.tsx:366`

**Root Cause:**  
Parent container has `overflow-hidden` which may clip absolutely positioned elements that extend beyond bounds.

```tsx
<div className="relative h-full w-full overflow-hidden bg-black">
```

**Impact:**  
- Potentially clips buttons or other UI elements
- May affect scroll behavior on desktop

**Status:** Monitoring with debug mode

---

## 🔍 DEBUGGING IMPLEMENTED

### Console Logging Added

**Location:** `swipe-reel-item.tsx`

Logs the following for each active listing:
```js
{
  listingId: number,
  saleType: string,
  saleTypeType: typeof,
  isAuction: boolean,
  isActive: boolean,
  isSoldOut: boolean,
  isOwnProduct: boolean,
  userId: number | undefined,
  sellerId: number,
  shouldShowButton: boolean
}
```

**Purpose:** Verify button conditional logic and data format

### Wheel Event Logging

**Location:** `use-swipe-gesture.ts`

Logs:
- deltaY value
- Cooldown state
- Direction (NEXT/PREV)
- Event handling success/failure

**Purpose:** Diagnose desktop scrolling issues

---

## 🔥 FORCE-VISIBLE PROOF OF CONCEPT

### What Changed

All action buttons now have:
- **Position:** `fixed` (breaks stacking context)
- **Z-Index:** `9999` (forces to top)
- **Background:** Bright yellow (`bg-yellow-400`)
- **Border:** Thick red border (`border-4 border-red-500`)
- **Size:** Enlarged (14-16px)
- **Animation:** Pulse on primary buttons
- **Console logs:** Click detection

### Expected Behavior

If you now see **bright yellow and red buttons** on the right side:
✅ **Buttons exist** - Issue is CSS/stacking
❌ **Still invisible** - Issue is conditional rendering or data

If clicking buttons logs to console:
✅ **Buttons are interactive** - Issue is visibility only
❌ **No logs** - Issue is event handling or DOM structure

---

## 📊 DATA VALIDATION CHECKLIST

Run the app and check console for:

1. **SaleType Format:**
   - [ ] Logs show `saleType: "auction"` (lowercase)
   - [ ] Or `saleType: "Auction"` (capitalized)?
   - [ ] Type is `string` not `undefined`

2. **Active Status:**
   - [ ] `isActive: true` for current listing
   - [ ] Type is `boolean` not `undefined`

3. **User Auth:**
   - [ ] `userId` is a number (not `undefined`)
   - [ ] `isOwnProduct` calculates correctly

4. **Button Condition:**
   - [ ] `shouldShowButton: true` when expected
   - [ ] All conditions met for visibility

---

## 🚀 NEXT STEPS

### Immediate Actions

1. **Run the app** and observe:
   - Are bright yellow/red buttons visible?
   - Do console logs appear for active listing?
   - Do wheel events log on desktop scroll?

2. **Check console output** for:
   - Button visibility conditions
   - Data format mismatches
   - Wheel event handling

3. **Report findings:**
   - Screenshot of buttons (visible or not)
   - Console log output
   - Any error messages

### Production Fix Plan

Once debugging confirms root cause:

1. **Fix OptimizedImage** ✅ (Already done)
2. **Fix stacking context** (Based on debug results)
3. **Remove debug styling** (Restore production appearance)
4. **Verify wheel events** (Adjust handler if needed)
5. **Test on all devices** (Mobile, tablet, desktop)

---

## 📝 FILES MODIFIED

### Debug Version (Current)
- ✅ `client/src/components/swipe-reel-item.tsx` - Force-visible buttons + logging
- ✅ `client/src/components/optimized-image.tsx` - objectFit prop support
- ✅ `client/src/hooks/use-swipe-gesture.ts` - Wheel event logging

### Pending Production Fixes
- ⏳ `client/src/pages/swipe.tsx` - Stacking context resolution
- ⏳ Remove all console.log statements
- ⏳ Restore production button styling

---

## 🎯 SUCCESS CRITERIA

The fix is complete when:
- [ ] All buttons visible without force-visible styling
- [ ] Images display correctly without black obscuration
- [ ] Desktop wheel scroll works smoothly
- [ ] Mobile touch swipe still works
- [ ] No console errors or warnings
- [ ] Button clicks trigger correct actions (bid/buy)

---

**Audit Completed By:** AI Assistant  
**Next Review:** After initial debug testing
