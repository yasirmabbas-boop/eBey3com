# Component Porting Guide — Web to React Native

## Porting Complexity Ratings

Each screen/component is rated by porting complexity:

- **Low**: Mostly data display, simple forms. Port in 1-2 hours.
- **Medium**: Interactive elements, real-time data, image handling. Port in 3-6 hours.
- **High**: Complex gestures, multi-step flows, heavy native integration. Port in 1-2 days.

## Pages (by Priority)

### Priority 1 — Core User Flows

| Page | File | Complexity | Key Challenges |
|------|------|-----------|----------------|
| Home | `home.tsx` | Medium | Hero banner carousel, category scroll, featured listings grid |
| Product | `product.tsx` | High | Image gallery with pinch-zoom, auction countdown, bid WebSocket, comments |
| Search | `search.tsx` | Medium | Meilisearch integration, filter UI, infinite scroll |
| Sign In | `signin.tsx` | Medium | OTP flow, Facebook SDK, form validation |
| Register | `register.tsx` | Medium | Multi-step form, phone verification |

### Priority 2 — Commerce

| Page | File | Complexity | Key Challenges |
|------|------|-----------|----------------|
| Cart | `cart.tsx` | Low | List + quantity controls + total |
| Checkout | `checkout.tsx` | High | Address picker with map, payment flow, order creation |
| Sell Wizard | `sell-wizard.tsx` | High | Multi-step form, camera/gallery image upload, category picker |
| Favorites | `favorites.tsx` | Low | Grid list with favorite toggle |

### Priority 3 — Dashboards

| Page | File | Complexity | Key Challenges |
|------|------|-----------|----------------|
| Buyer Dashboard | `buyer-dashboard.tsx` | Medium | Tab sections, order status cards |
| Seller Dashboard | `seller-dashboard.tsx` | High | Nested tab nav, analytics charts, order management |
| My Purchases | `my-purchases.tsx` | Low | List with status badges |
| My Sales | `my-sales.tsx` | Low | List with status badges |
| My Bids | `my-bids.tsx` | Low | List with auction status |
| My Auctions | `my-auctions.tsx` | Medium | Timer display, bid counts, management actions |

### Priority 4 — Social & Communication

| Page | File | Complexity | Key Challenges |
|------|------|-----------|----------------|
| Messages | `messages.tsx` | High | Real-time WebSocket chat, message list, typing indicators |
| Notifications | `notifications.tsx` | Medium | Grouped notifications, deep link handling |
| Seller Profile | `seller-profile.tsx` | Low | Data display + rating + listings grid |
| Swipe Feed | `swipe.tsx` | High | Tinder-style card swiping, gesture handler, animation |

### Priority 5 — Settings & Legal

| Page | File | Complexity | Key Challenges |
|------|------|-----------|----------------|
| Settings | `settings.tsx` | Low | Form fields, language picker |
| Security Settings | `security-settings.tsx` | Medium | 2FA setup, password change |
| About/Privacy/Terms | `about.tsx` etc. | Low | Static content |

## Key Components

### High-Complexity Components (build these first as shared primitives)

| Component | Web File | RN Replacement | Notes |
|-----------|----------|---------------|-------|
| Image Gallery | `fullscreen-image-viewer.tsx` | `react-native-image-zoom-viewer` | Pinch zoom, swipe between images |
| Auction Countdown | `auction-countdown.tsx` | Custom with `useEffect` timer | Same logic, just RN `<Text>` |
| Bidding Window | `bidding-window.tsx` | Bottom sheet + WebSocket | Port bid logic, use `@gorhom/bottom-sheet` |
| Map Picker | `leaflet-map-picker.tsx` | `react-native-maps` | Completely different API |
| Swipe Reel | `swipe-reel-item.tsx` | `react-native-gesture-handler` + `reanimated` | Full rebuild |
| Smart Search | `smart-search.tsx` | Custom with Meilisearch | Same API, new autocomplete UI |
| Image Upload | `ObjectUploader.tsx` | `expo-image-picker` + `expo-image-manipulator` | Different capture/compress flow |

### Medium-Complexity Components

| Component | Web File | RN Replacement | Notes |
|-----------|----------|---------------|-------|
| Category Carousel | `category-carousel.tsx` | `FlatList` horizontal | Simple port |
| Product Comments | `product-comments.tsx` | `FlatList` + `TextInput` | Same API calls |
| Contact Seller | `contact-seller.tsx` | Bottom sheet with contact options | WhatsApp deep link |
| Make Offer | `make-offer-dialog.tsx` | Bottom sheet + form | Same API |
| Share Menu | `share-menu-dialog.tsx` | Native share sheet (`expo-sharing`) | Simpler in RN |
| Star Rating | `star-rating.tsx` | Pressable stars | Simple port |
| Favorite Button | `favorite-button.tsx` | Animated heart (reanimated) | Add spring animation |

### Low-Complexity Components (direct ports)

| Component | Web File | Notes |
|-----------|----------|-------|
| Empty State | `empty-state.tsx` | View + Text + Image |
| Loading Spinner | `loading-spinner.tsx` | ActivityIndicator |
| Verified Badge | `verified-badge.tsx` | View + Icon |
| Seller Trust Badge | `seller-trust-badge.tsx` | View + Icons |
| Ban Banner | `ban-banner.tsx` | View + Text |
| Logo | `logo.tsx` | Image component |

## Hooks Porting Guide

| Hook | File | Portability | Changes Needed |
|------|------|------------|----------------|
| useAuth | `use-auth.ts` | High | Replace localStorage → AsyncStorage |
| useBidWebsocket | `use-bid-websocket.ts` | High | Add AppState reconnection |
| useCart | `use-cart.ts` | High | Minimal changes |
| useListings | `use-listings.ts` | Direct | No changes if using authFetch |
| useUpload | `use-upload.ts` | Medium | Replace Uppy with expo-image-picker |
| useMobile | `use-mobile.tsx` | Remove | Not needed — everything is mobile |
| usePlatform | `use-platform.ts` | Rewrite | Use `Platform.OS` from react-native |
| useToast | `use-toast.ts` | Replace | Use react-native-toast-message |
| useSwipeGesture | `use-swipe-gesture.ts` | Rewrite | Use react-native-gesture-handler |
| useNavState | `use-nav-state.ts` | Remove | React Navigation handles this |
| useNavVisibility | `use-nav-visibility.tsx` | Remove | Tab navigator handles this |
| useSafeArea | `use-safe-area.tsx` | Replace | Use react-native-safe-area-context |
| useSocketNotifications | `use-socket-notifications.tsx` | High | Add AppState handling |
| useDeepLinkScroll | `use-deep-link-scroll.ts` | Rewrite | Use expo-router params |

## Libraries to Install

```bash
# Core
npx expo install expo-router react-native-screens react-native-safe-area-context

# UI
npx expo install nativewind tailwindcss react-native-reanimated react-native-gesture-handler

# Data
npm install @tanstack/react-query zustand @react-native-async-storage/async-storage

# Images
npx expo install expo-image expo-image-picker expo-image-manipulator

# Maps
npx expo install react-native-maps

# Notifications
npx expo install expo-notifications

# i18n
npm install react-i18next i18next

# Lists
npm install @shopify/flash-list

# Icons
npm install lucide-react-native react-native-svg

# Bottom sheets
npm install @gorhom/bottom-sheet

# Fonts
npx expo install expo-font
```
