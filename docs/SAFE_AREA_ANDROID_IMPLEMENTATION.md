# Safe Area Android Implementation

## Overview

This document describes the implementation of safe area handling for Android devices to prevent the system navigation bar from covering the app's bottom navigation.

**Date Implemented:** February 2026  
**Approach:** Android Native (styles.xml edge-to-edge opt-out)

---

## Problem Statement

On Android devices with software navigation buttons (gesture nav or 3-button nav), the system navigation bar was covering the app's bottom `MobileNavBar`. 

**Root Cause:** Android 15 (API 35) enforces edge-to-edge display by default for apps targeting SDK 35+. This causes the WebView to render behind the navigation bar without proper inset handling.

---

## Solution

We opted out of Android 15's edge-to-edge enforcement at the native Android level by modifying `styles.xml`. This is the simplest and most reliable approach as it lets the Android system handle the navigation bar boundaries automatically.

---

## Files Changed

### Android Native Files

1. **[android/app/src/main/res/values/styles.xml](../android/app/src/main/res/values/styles.xml)**
   - Added `android:fitsSystemWindows="true"` - tells Android to respect system bar boundaries
   - Added `android:navigationBarColor="@android:color/white"` - sets nav bar background color

2. **[android/app/src/main/res/values-v35/styles.xml](../android/app/src/main/res/values-v35/styles.xml)** (NEW)
   - Android 15-specific override
   - Added `android:windowOptOutEdgeToEdgeEnforcement="true"` - explicitly opts out of edge-to-edge
   - The `values-v35` folder ensures this flag is only used on Android 15+ devices (where it exists)

### React Files (Supporting)

3. **[client/src/hooks/use-safe-area.tsx](../client/src/hooks/use-safe-area.tsx)**
   - Simplified hook that uses CSS `env()` values
   - Works correctly now that Android respects system bar boundaries

4. **[client/src/hooks/use-safe-area-provider.tsx](../client/src/hooks/use-safe-area-provider.tsx)**
   - Provider that updates CSS variables (`--safe-area-top`, `--safe-area-bottom`, etc.)
   - Components use these variables for dynamic padding

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Android System                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  styles.xml                                            │  │
│  │  - fitsSystemWindows: true                             │  │
│  │  - windowOptOutEdgeToEdgeEnforcement: true (API 35+)   │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  WebView Layout                                        │  │
│  │  - Stops at navigation bar edge                        │  │
│  │  - Does NOT extend behind system bars                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  MobileNavBar                                          │  │
│  │  - Visible above system navigation                     │  │
│  │  - No overlap with system buttons                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Previous Attempts (Did Not Work)

1. **JavaScript visualViewport detection** - Couldn't accurately detect nav bar height when WebView extends behind it
2. **capacitor-plugin-safe-area** - Plugin returned values but couldn't fix the native layout issue

The native Android approach works because it fixes the problem at the source - the WebView layout itself.

---

## Rollback Instructions

If this implementation causes issues, follow these steps:

### Step 1: Remove Android 15 Override

Delete the entire folder:
```
android/app/src/main/res/values-v35/
```

### Step 2: Revert styles.xml

Remove the added lines from `android/app/src/main/res/values/styles.xml`:

```xml
<!-- Remove these lines -->
<item name="android:fitsSystemWindows">true</item>
<item name="android:navigationBarColor">@android:color/white</item>
```

### Step 3: Rebuild

```bash
npx cap sync android
```

Then rebuild in Android Studio.

---

## Testing Checklist

- [ ] Test on Android device with **gesture navigation** (swipe nav bar)
- [ ] Test on Android device with **3-button navigation** (back/home/recent)
- [ ] Test on Android device with **2-button navigation** (some Samsung devices)
- [ ] Test **orientation changes** (portrait ↔ landscape)
- [ ] Test on **Android 15+ device** (API 35+)
- [ ] Test on **Android 14 and below** (API 34-)
- [ ] Test on **iOS device** (should work as before)
- [ ] Verify **MobileNavBar** is not covered by system nav
- [ ] Verify **SellerBottomNav** is not covered by system nav

---

## Technical Details

### Why This Works

1. **`android:fitsSystemWindows="true"`**: Tells the Android framework to inset the view's padding to avoid system windows (status bar, navigation bar). The WebView content area is automatically adjusted.

2. **`android:windowOptOutEdgeToEdgeEnforcement="true"`** (API 35+ only): Android 15 introduced mandatory edge-to-edge display. This flag explicitly opts out, restoring the pre-Android-15 behavior where apps don't extend behind system bars by default.

3. **`android:navigationBarColor`**: Sets a solid color for the navigation bar background, ensuring it's not transparent/translucent which could cause visual issues.

### Version-Specific Resources

Android uses resource qualifiers to provide version-specific configurations:

- `values/styles.xml` - Used on all Android versions
- `values-v35/styles.xml` - Used only on Android 15+ (API 35+), overrides the base `values/styles.xml`

This ensures the `windowOptOutEdgeToEdgeEnforcement` attribute (which only exists on API 35+) doesn't cause build errors on older devices.

---

## Related Files

- [capacitor.config.ts](../capacitor.config.ts) - Capacitor configuration (StatusBar settings)
- [client/src/components/mobile-nav-bar.tsx](../client/src/components/mobile-nav-bar.tsx) - Main bottom nav
- [client/src/components/seller/seller-bottom-nav.tsx](../client/src/components/seller/seller-bottom-nav.tsx) - Seller nav
