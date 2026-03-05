# ebey3 — React Native Migration Plan

## Current State Assessment

The ebey3 app currently runs as a **React 18 + Vite web app** wrapped in **Capacitor 8** for Android and iOS. Here's the footprint:

- **37 pages** (~23,400 lines of TSX)
- **55+ components** (~10,000 lines of TSX)
- **18 custom hooks** (auth, websockets, cart, navigation, gestures, etc.)
- **940-line Drizzle schema** (users, listings, bids, orders, messages, wallets, etc.)
- **21 API route files** (accounts, products, auctions, cart, messages, wallet, admin, etc.)
- **3-language i18n** (Arabic, Kurdish, English) with RTL support
- **Meilisearch** integration for search
- **Capacitor plugins**: Camera, Push Notifications, Share, Haptics, Facebook Login, Keyboard, Splash Screen, Status Bar

The Capacitor wrapper currently points to `https://ebey3.com` — meaning the mobile app is essentially a **remote WebView**, not a bundled native app.

---

## Why React Native?

| Factor | Capacitor (Current) | React Native |
|--------|---------------------|--------------|
| Performance | Web rendering in WebView | Native UI components |
| UX feel | Web-like, gesture quirks | Platform-native gestures |
| Offline support | Limited (service workers) | Full SQLite/native caching |
| App Store compliance | Risky (WebView wrapping) | Fully compliant |
| Native features | Via plugins (hit-or-miss) | Direct native module access |
| Animation | CSS/Framer Motion | Reanimated (60fps native) |
| RTL support | CSS `dir` attribute | Built-in `I18nManager` |

---

## What Can Be Reused

### Fully reusable (no changes needed)
- `shared/schema.ts` — Drizzle schemas + Zod validators
- `shared/models/` — shared types
- `client/src/lib/i18n.tsx` — translation dictionary (the key/value pairs)
- `client/src/lib/api.ts` — `authFetch` pattern (minor adaptation)
- `client/src/lib/form-validation.ts` — Zod-based validation
- All **business logic in hooks** (auth flow, bid logic, cart logic) — needs thin UI adaptation

### Partially reusable (logic yes, UI no)
- All 18 hooks — the data-fetching and state logic ports directly; the DOM-specific parts don't
- `@tanstack/react-query` — works identically in React Native
- WebSocket logic (`use-bid-websocket.ts`, `use-socket-notifications.tsx`)

### Must be rebuilt from scratch
- All JSX/TSX UI (Radix UI, Tailwind, HTML elements → React Native components)
- Navigation (Wouter → React Navigation)
- Image handling (HTML `<img>` → `react-native-fast-image`)
- Maps (Leaflet → `react-native-maps`)
- Capacitor plugins → React Native equivalents

---

## Work Breakdown

### Phase 1: Foundation (Weeks 1–3)

**1.1 Project Scaffolding**
- Init React Native project with Expo (recommended) or bare CLI
- Configure TypeScript, ESLint, Prettier
- Set up monorepo structure (Turborepo or Nx) to share `shared/` with the backend
- Configure `react-native-reanimated`, `react-native-gesture-handler`

**1.2 Navigation Architecture**
- Install and configure React Navigation v7
- Map all 37 pages to screens/stacks
- Set up bottom tab navigator (Home, Search, Sell, Cart, Account)
- Implement deep linking scheme (`ebey3://product/:id`, etc.)
- RTL navigation support via `I18nManager`

**1.3 Design System / Component Library**
- Choose a UI kit: NativeWind (Tailwind for RN) or Tamagui
- Rebuild core `ui/` primitives: Button, Input, Card, Dialog, Toast, Select, Tabs
- Typography system with Arabic/Kurdish font support (e.g., Noto Sans Arabic)
- RTL-aware layout components

**1.4 i18n & RTL**
- Port translation dictionary to `react-i18next` or `expo-localization`
- Configure `I18nManager.forceRTL()` for Arabic
- Test all 3 languages with proper font rendering

### Phase 2: Core Features (Weeks 4–8)

**2.1 Authentication**
- Port auth flow: phone OTP, Facebook Login, email/password
- Use `react-native-async-storage` for token persistence (replaces `localStorage`)
- Implement biometric auth (Face ID / fingerprint) as upgrade
- Facebook SDK integration via `react-native-fbsdk-next`

**2.2 Home & Browse**
- Home screen with hero banner, category carousel, featured listings
- Swipe/reel view (`react-native-pager-view` or FlatList)
- Meilisearch integration (same API, new UI)
- Pull-to-refresh, infinite scroll

**2.3 Product Page**
- Image gallery with pinch-zoom (`react-native-image-zoom-viewer`)
- Auction countdown timer
- Bid placement flow with WebSocket real-time updates
- Make Offer dialog
- Share functionality (native share sheet)
- Comments section

**2.4 Seller Flow**
- Sell wizard (multi-step form with image upload)
- Camera integration (`expo-camera` or `react-native-camera`)
- Image compression and upload
- Category/condition selection

### Phase 3: Commerce & Messaging (Weeks 9–12)

**3.1 Cart & Checkout**
- Cart management with React Query state
- Address selection with map picker (`react-native-maps`)
- Order placement flow
- Payment integration (adapt existing backend)

**3.2 Messaging**
- Real-time chat via WebSockets (port existing `ws` logic)
- Push notifications (`@react-native-firebase/messaging`)
- Message list with seller/buyer context

**3.3 Dashboards**
- Buyer dashboard (purchases, bids, favorites)
- Seller dashboard (listings, sales, analytics)
- Auction management

**3.4 Notifications**
- Push notification setup (FCM for Android, APNs for iOS)
- In-app notification center
- Deep link handling from notifications

### Phase 4: Polish & Platform Features (Weeks 13–16)

**4.1 Offline Support**
- SQLite caching for listings, user profile, cart
- Optimistic updates
- Queue for actions taken offline

**4.2 Performance**
- Image caching strategy (`FastImage`)
- List virtualization (FlashList)
- Memory profiling and leak fixes
- Startup time optimization

**4.3 Platform Specifics**
- iOS: Safe area handling, haptics, keyboard avoidance
- Android: Back button behavior, status bar theming
- Both: App icon, splash screen, app store assets

**4.4 Testing & QA**
- Unit tests (Jest + React Native Testing Library)
- E2E tests (Detox or Maestro)
- RTL layout testing across all screens
- Arabic/Kurdish text rendering verification

### Phase 5: Launch (Weeks 17–18)

- App Store / Google Play submission
- Beta testing (TestFlight / internal track)
- Migration plan for existing Capacitor users
- Analytics setup (port existing analytics)
- Crash reporting (Sentry or Crashlytics)

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Foundation | Weeks 1–3 | Nav, design system, i18n, project setup |
| 2. Core Features | Weeks 4–8 | Auth, browse, product, seller flows |
| 3. Commerce & Messaging | Weeks 9–12 | Cart, checkout, chat, notifications |
| 4. Polish & Platform | Weeks 13–16 | Offline, performance, testing |
| 5. Launch | Weeks 17–18 | Store submission, beta, migration |

**Total: ~18 weeks (4.5 months)** with 1 senior React Native developer working full-time. With 2 developers, this could compress to ~10–12 weeks.

---

## Team Recommendations

| Role | Why |
|------|-----|
| 1 Senior RN Developer | Core architecture, navigation, complex features |
| 1 Mid-level RN Developer | Screen implementations, component library |
| You (existing team) | Backend remains unchanged, API guidance, i18n QA |
| Part-time QA | RTL testing, Arabic/Kurdish language QA |

---

## Key Technical Decisions to Make

1. **Expo vs Bare CLI** — Expo is recommended (faster iteration, OTA updates, managed native modules). Only go bare if you need custom native modules Expo doesn't support.

2. **UI Framework** — NativeWind lets you reuse Tailwind knowledge; Tamagui is faster at runtime. Both support RTL.

3. **State Management** — Keep `@tanstack/react-query` (it works identically). Add Zustand for client-side state if needed.

4. **Monorepo** — Use Turborepo to share `shared/` between the Express backend and the React Native app without code duplication.

5. **Parallel or Replace?** — You can run both Capacitor and React Native during transition. The backend API doesn't change at all.

---

## Risk Factors

- **Arabic/Kurdish font rendering** — Must test thoroughly on both platforms; some fonts render differently on Android vs iOS
- **RTL layout bugs** — React Native's RTL support is good but not perfect; budget extra time for layout fixes
- **WebSocket reconnection** — Mobile networks are flaky; need robust reconnection logic
- **Image upload from camera** — HEIC conversion, compression, and upload reliability on slow networks
- **Meilisearch proxy** — Same backend proxy works, but need to handle offline search gracefully
