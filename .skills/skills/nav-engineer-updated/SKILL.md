---
name: navigation-engineer
description: >
  App and website navigation engineer for auditing and fixing navigation UX issues.
  Use this skill whenever the user reports navigation problems, broken back buttons,
  confusing user flows, gesture navigation bugs, mobile back/forward issues, deep
  linking failures, bottom nav bar problems, or route-related UX complaints. Also
  trigger when the user mentions users getting "stuck" or "lost" in the app, swipe
  navigation not working, scroll position not restoring, or RTL navigation feeling
  wrong. This skill covers both Capacitor/hybrid mobile apps AND React Native apps
  using React Navigation / Expo Router. Even if the user doesn't say "navigation"
  explicitly — if they describe a flow where users can't get back to where they were,
  or a screen transition feels broken — use this skill.
---

# Navigation Engineer

You are a navigation UX engineer. Your job is to audit, diagnose, and fix navigation
issues in web and mobile applications — making sure users can always find their way
around, go back to where they came from, and never feel lost or stuck.

## Why Navigation Matters

Bad navigation is the #1 reason users abandon apps. When someone taps "back" and
nothing happens, or they swipe and end up somewhere unexpected, trust erodes instantly.
Navigation should be invisible — users shouldn't have to think about it. When they do,
something is broken.

## Before You Start

Understand the project's navigation stack by checking these files (adapt paths to the
actual project):

1. **Router config** — find the main route definitions (e.g., App.tsx with Wouter,
   react-router, Next.js pages, Expo Router `app/` directory, etc.)
2. **Navigation components** — bottom nav bars, headers with back buttons, sidebars,
   breadcrumbs
3. **Mobile/native integration** — Capacitor config, React Navigation config, back
   button handlers, deep link handlers, gesture navigation components
4. **Custom navigation hooks** — scroll restoration, tab state persistence, nav
   visibility toggling
5. **Platform detection** — how the app distinguishes web vs. iOS vs. Android behavior

Read the relevant files before proposing any changes. Navigation bugs are often
symptoms of deeper architectural issues, so understanding the full picture prevents
fixes that break other flows.

## Diagnostic Checklist

When investigating a navigation issue, work through this checklist systematically.
Not every item applies to every bug — use judgment about which are relevant.

### Back Navigation
- Does the hardware/gesture back button work on every screen?
- Is there a fallback destination when history is empty (e.g., home page)?
- **Web/Capacitor**: Does `window.history.back()` get called correctly, or does the
  app use `navigate()` (which pushes) instead of going back?
- **React Native**: Is `navigation.goBack()` used correctly? Does the stack have
  enough screens to go back to? Is `navigation.popToTop()` used where appropriate?
- On Capacitor/native: is the `backButton` listener registered? Does it call
  `App.exitApp()` only when appropriate (e.g., on the root screen)?
- **React Native Android**: Is the hardware back button handled via
  `BackHandler.addEventListener` or React Navigation's built-in handling?
- Are there screens that trap the user (no back button visible AND gestures disabled)?

### Swipe/Gesture Navigation
- Is the swipe-to-go-back gesture enabled? What's the touch target area?
- Does vertical scrolling cancel horizontal swipe correctly? (Common bug: diagonal
  swipes trigger both scroll and navigation)
- In RTL mode, are swipe directions reversed? (Left swipe = forward in LTR, but
  backward in RTL)
- **React Native**: Is `gestureEnabled` set correctly per screen? Are there screens
  where `gestureEnabled: false` should be set (e.g., payment flows)?
- Is there haptic feedback on swipe thresholds to help users feel the transition?
- Are there pages where swipe should be disabled (e.g., carousels, image galleries,
  maps)?

### Bottom Navigation / Tab Bars
- Do tabs remember their scroll position and sub-route when switching?
- Does tapping the active tab scroll to top (standard mobile pattern)?
- Are badge counts updating in real time?
- On mobile: does the nav bar hide during scroll-down and reappear on scroll-up?
- Are there orphan screens — pages reachable by link but not by any nav element?
- **React Native**: Does each tab have its own navigation stack? Pressing back in a
  tab should go back within that tab, not switch tabs.

### Deep Linking
- Can every important screen be reached via URL?
- Do notification deep links navigate correctly AND highlight the relevant content?
- After following a deep link, does the back button take users somewhere sensible
  (not back to the notification, but to the parent screen)?
- **React Native / Expo Router**: Is the `linking` config correct? Are all routes
  mapped to URL patterns? Does `initialRouteName` ensure there's always a parent
  screen in the stack?
- Are query parameters cleaned up after processing (to prevent re-triggering on
  refresh)?

### Scroll Position
- When navigating back, does the page restore to the previous scroll position?
- Is scroll position saved per-route or globally?
- Does scroll restoration work after the page content has loaded (not before, which
  causes jumps)?
- **React Native**: `FlatList` and `FlashList` don't have browser-style scroll
  restoration. Use `onScroll` to save position and `scrollToOffset` on focus.

### RTL Support
- Are navigation arrows/chevrons mirrored in RTL?
- Does the breadcrumb separator point the right direction?
- Are "next/previous" swipe gestures reversed?
- **Web**: Does the layout `dir` attribute propagate to navigation components?
- **React Native**: Is `I18nManager.forceRTL()` called correctly on startup? Are
  directional icons flipped with `transform: [{ scaleX: -1 }]`?

## Common Fixes — Web / Capacitor

These patterns apply to the existing Capacitor/web navigation stack.

### Fix: Back Button Goes Nowhere

**Symptom:** User taps back and nothing happens, or they loop between two pages.

**Root cause:** Usually `window.history.length` check is wrong, or the app uses
`navigate()` (which pushes) instead of `window.history.back()`.

**Pattern:**
```typescript
const handleBack = () => {
  if (window.history.length > 2) {
    window.history.back();
  } else {
    navigate(fallbackPath); // e.g., "/"
  }
};
```

The threshold of `> 2` (not `> 1`) accounts for the initial page load entry in
some browsers. Test on both Chrome and Safari — they handle history differently.

### Fix: Capacitor Back Button Exits App Unexpectedly

**Symptom:** Android back button closes the app instead of navigating back.

**Pattern:**
```typescript
import { App } from '@capacitor/app';

App.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back();
  } else {
    const rootPaths = ['/', '/home'];
    if (rootPaths.includes(window.location.pathname)) {
      App.exitApp();
    } else {
      window.location.href = '/';
    }
  }
});
```

### Fix: Swipe Back Conflicts with Horizontal Scroll

**Symptom:** Swiping on carousels or image galleries triggers page-back navigation.

**Pattern:** Add a data attribute to containers where swipe-back should be suppressed:
```typescript
const isInsideSwipeableContent = (target: HTMLElement) => {
  return target.closest('[data-swipe-ignore]') !== null;
};

<div data-swipe-ignore>
  <ImageCarousel />
</div>
```

### Fix: Tab State Not Persisting

**Symptom:** Switching tabs loses scroll position and sub-navigation state.

**Pattern:** Use session storage keyed by tab section:
```typescript
const saveTabState = (section: string, path: string, scrollY: number) => {
  sessionStorage.setItem(`nav-${section}`, JSON.stringify({ path, scrollY }));
};

const restoreTabState = (section: string, defaultPath: string) => {
  const saved = sessionStorage.getItem(`nav-${section}`);
  if (saved) {
    const { path, scrollY } = JSON.parse(saved);
    navigate(path);
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  } else {
    navigate(defaultPath);
  }
};
```

### Fix: Deep Link Back Button Goes to Wrong Place

**Symptom:** User opens app from notification deep link, taps back, and lands on a
blank page or the notification center.

**Pattern:** After processing a deep link, replace the history entry:
```typescript
window.history.replaceState({ from: 'deeplink' }, '', targetPath);
if (window.history.length <= 2) {
  window.history.pushState({}, '', parentPath);
  window.history.pushState({}, '', targetPath);
}
```

### Fix: RTL Swipe Direction Wrong

**Symptom:** In Arabic/Kurdish mode, swiping right goes forward instead of backward.

**Pattern:**
```typescript
const effectiveDirection = isRTL
  ? (rawDirection === 'left' ? 'forward' : 'backward')
  : (rawDirection === 'left' ? 'backward' : 'forward');
```

## Common Fixes — React Native / Expo Router

These patterns apply to the React Native navigation stack.

### Fix: Android Back Button Doesn't Work as Expected

**Symptom:** Hardware back on Android does nothing, or exits from a non-root screen.

React Navigation handles the Android back button automatically for stack navigators.
If it's not working, the issue is usually a custom `BackHandler` that overrides the
default behavior:

```tsx
// DON'T: Override globally
BackHandler.addEventListener('hardwareBackPress', () => {
  // This prevents React Navigation from handling back
  return true;
});

// DO: Use React Navigation's hook for per-screen overrides
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    const onBackPress = () => {
      if (hasUnsavedChanges) {
        showConfirmDialog();
        return true; // Prevent default back
      }
      return false; // Let React Navigation handle it
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [hasUnsavedChanges])
);
```

### Fix: Tab Navigator Loses Stack on Tab Switch

**Symptom:** User drills into a product from the Home tab, switches to Favorites,
switches back to Home — and the product screen is gone.

This is default React Navigation behavior (stacks reset on tab switch). To preserve:

```tsx
// In your tab navigator config
<Tab.Navigator
  screenOptions={{
    // This keeps screens mounted when switching tabs
    lazy: true,
    // Don't unmount inactive tabs
    freezeOnBlur: true,
  }}
>
```

Or if using Expo Router, set `unmountOnBlur: false` in tab options.

### Fix: Deep Link Opens on Wrong Stack

**Symptom:** A push notification deep link to `/product/123` opens the product screen
but there's no way to go back (no parent in the stack).

**Pattern:** Use `initialRouteName` to ensure the home screen is always in the stack:

```tsx
// Expo Router: in app/(tabs)/_layout.tsx
export const unstable_settings = {
  initialRouteName: 'index',
};

// Or handle programmatically on notification tap:
import { router } from 'expo-router';

Notifications.addNotificationResponseReceivedListener((response) => {
  const deepLink = response.notification.request.content.data?.deepLink;
  // Reset to home first, then push the target
  router.replace('/');
  setTimeout(() => router.push(deepLink), 100);
});
```

### Fix: Gesture Navigation Conflicts with Horizontal Scroll

**Symptom:** Swiping through product images triggers back navigation.

**Pattern:** Disable gestures on specific screens:

```tsx
// Expo Router: in the screen file
export const unstable_settings = {
  gestureEnabled: false,
};

// Or dynamically in a stack navigator:
<Stack.Screen
  name="ProductGallery"
  options={{ gestureEnabled: false }}
/>
```

For partial conflicts (where you want back gesture at the edges but not in a carousel),
wrap the carousel in a `GestureDetector` that consumes horizontal pan:

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const panGesture = Gesture.Pan()
  .activeOffsetX([-10, 10]) // Capture horizontal swipes
  .onStart(() => {}) // Consume — prevents navigation gesture

<GestureDetector gesture={panGesture}>
  <ImageCarousel />
</GestureDetector>
```

### Fix: RTL Layout Partially Broken

**Symptom:** Some screens flip to RTL but navigation icons point the wrong way, or
the tab bar order doesn't reverse.

React Navigation respects `I18nManager.isRTL` automatically for most things, but:

1. **Custom back icons** need manual flipping:
   ```tsx
   import { I18nManager } from 'react-native';
   <ChevronLeft
     style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
   />
   ```

2. **Tab order** flips automatically with `I18nManager.isRTL`. If it doesn't, check
   that `forceRTL` is called before the navigator renders (usually in the root layout).

3. **Swipe direction** — React Navigation automatically reverses swipe-to-go-back
   direction in RTL. If it doesn't flip, there's likely a custom gesture handler
   overriding the default behavior.

### Fix: Scroll Position Lost on Back Navigation

**Symptom:** User scrolls down a long product list, taps a product, goes back —
list is at the top again.

React Navigation doesn't restore scroll position by default. Implement it manually:

```tsx
import { useFocusEffect } from '@react-navigation/native';
import { useRef, useCallback } from 'react';

const scrollRef = useRef(0);
const listRef = useRef<FlashList>(null);

const onScroll = (event) => {
  scrollRef.current = event.nativeEvent.contentOffset.y;
};

useFocusEffect(
  useCallback(() => {
    // Restore scroll when screen focuses
    if (scrollRef.current > 0) {
      listRef.current?.scrollToOffset({
        offset: scrollRef.current,
        animated: false,
      });
    }
  }, [])
);
```

## Making Changes

When you identify an issue and have a fix:

1. **Verify the current behavior** by reading the relevant source files
2. **Check for side effects** — navigation changes often ripple. If you change the
   back button logic, verify it still works on the root screen, after deep links,
   and on all platforms (web, iOS, Android)
3. **Respect existing patterns** — extend existing hooks/components rather than
   creating parallel systems
4. **Test RTL** — make sure your change works in both directions
5. **Consider both stacks** — if ebey3 is running both Capacitor and React Native
   during the migration, make sure the backend handles both correctly

## Project-Specific Context (ebey3)

### Capacitor Stack (Current)

- **Router:** Wouter (`useLocation`, `Switch`, `Route`)
- **Mobile:** Capacitor 8 with Android/iOS. Back button handled in `appLifecycle.ts`
- **Bottom Nav:** `mobile-nav-bar.tsx` (5 tabs: Home, Favorites, Swipe, Notifications, Account)
- **Seller Nav:** `seller-bottom-nav.tsx` (4 tabs: Inventory, Activity, Orders, Earnings)
- **Back Button:** `back-button.tsx` — smart component with history detection
- **Swipe Back:** `swipe-back-navigation.tsx` — iOS-style edge swipe with RTL support
- **Tab State:** `use-nav-state.ts` — section-based path + scroll persistence
- **Nav Visibility:** `use-nav-visibility.tsx` — show/hide bottom nav per page
- **Scroll Restore:** `ScrollToTop` in App.tsx + `scroll-storage.ts`
- **Deep Links:** `use-notification-deeplink.ts` + `appLifecycle.ts` URL handler
- **RTL:** Arabic and Kurdish are RTL. Language from `useLanguage()` in `i18n.tsx`
- **Nav Swipe:** `use-nav-bar-swipe.tsx` — swipe between bottom nav tabs

### React Native Stack (In Development)

- **Router:** Expo Router (file-based, built on React Navigation)
- **Route files:** `mobile/app/` directory with `(tabs)/` group for bottom nav
- **Tab Navigator:** `mobile/app/(tabs)/_layout.tsx` — same 5 tabs as Capacitor
- **Seller Sub-Nav:** `mobile/app/seller-dashboard/_layout.tsx` — nested tab navigator
- **Deep Links:** Automatic via Expo Router, scheme `ebey3://`
- **RTL:** `I18nManager.forceRTL()` on startup, controlled by `react-i18next`
- **Back Navigation:** Automatic via React Navigation stack
- **Gestures:** `react-native-gesture-handler` for custom gestures, React Navigation
  default for screen transitions

Read the reference file at `references/ebey3-nav-map.md` for the complete route
and component map if you need more detail.
