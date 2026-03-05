# ebey3 Navigation Map

## Web/Capacitor Routes (from App.tsx)

| Route | Page | Section | Notes |
|-------|------|---------|-------|
| `/` | Home | home | Root screen, exit-app target |
| `/product/:id` | ProductPage | home | Back → home or previous |
| `/search` | SearchPage | search | Has own back button |
| `/cart` | CartPage | account | — |
| `/checkout` | CheckoutPage | account | Protected, auth required |
| `/my-purchases` | MyPurchases | account | — |
| `/my-sales` | MySales | account | — |
| `/seller-dashboard` | SellerDashboard | account | Has seller bottom nav |
| `/buyer-dashboard` | BuyerDashboard | account | Deep link target for notifications |
| `/messages` | Messages | account | — |
| `/notifications` | Notifications | notifications | Root tab |
| `/favorites` | Favorites | favorites | Root tab |
| `/swipe` | SwipeFeed | swipe | Root tab, hides bottom nav |
| `/admin` | Admin | — | Admin panel |
| `/auctions` | Auctions | home | — |
| `/my-auctions` | MyAuctions | account | — |
| `/seller/:id` | SellerProfile | home | — |
| `/signin` | SignIn | account | Redirect target for unauthed |
| `/register` | Register | account | — |
| `/forgot-password` | ForgotPassword | account | — |
| `/security-settings` | SecuritySettings | account | — |
| `/settings` | Settings | account | — |
| `/about` | About | — | — |
| `/privacy` | Privacy | — | — |
| `/terms` | Terms | — | — |
| `/contact` | Contact | — | — |
| `/data-deletion` | DataDeletion | — | — |

## React Native Routes (Expo Router — mobile/app/)

| Expo Router Path | Equivalent Web Route | Navigator Type |
|-----------------|---------------------|----------------|
| `(tabs)/index.tsx` | `/` | Tab (Home) |
| `(tabs)/favorites.tsx` | `/favorites` | Tab (Favorites) |
| `(tabs)/swipe.tsx` | `/swipe` | Tab (Swipe) |
| `(tabs)/notifications.tsx` | `/notifications` | Tab (Notifications) |
| `(tabs)/account.tsx` | `/my-account` | Tab (Account) |
| `product/[id].tsx` | `/product/:id` | Stack |
| `seller/[id].tsx` | `/seller/:id` | Stack |
| `search.tsx` | `/search` | Stack |
| `cart.tsx` | `/cart` | Stack |
| `checkout.tsx` | `/checkout` | Stack |
| `messages.tsx` | `/messages` | Stack |
| `my-purchases.tsx` | `/my-purchases` | Stack |
| `my-sales.tsx` | `/my-sales` | Stack |
| `my-bids.tsx` | `/my-bids` | Stack |
| `my-auctions.tsx` | `/my-auctions` | Stack |
| `seller-dashboard/_layout.tsx` | `/seller-dashboard` | Nested Tab |
| `sell-wizard.tsx` | `/sell-wizard` | Stack (modal) |
| `(auth)/signin.tsx` | `/signin` | Auth group |
| `(auth)/register.tsx` | `/register` | Auth group |
| `(auth)/forgot-password.tsx` | `/forgot-password` | Auth group |
| `settings.tsx` | `/settings` | Stack |
| `about.tsx` | `/about` | Stack |
| `privacy.tsx` | `/privacy` | Stack |
| `terms.tsx` | `/terms` | Stack |

## Navigation Component Files (Web/Capacitor)

| Component | Path | Purpose |
|-----------|------|---------|
| MobileNavBar | `client/src/components/mobile-nav-bar.tsx` | Bottom 5-tab nav |
| SellerBottomNav | `client/src/components/seller/seller-bottom-nav.tsx` | Seller 4-tab nav |
| BackButton | `client/src/components/back-button.tsx` | Smart back with fallback |
| Layout | `client/src/components/layout.tsx` | Header + search + back |
| Breadcrumb | `client/src/components/ui/breadcrumb.tsx` | Radix breadcrumb |
| SwipeBackNavigation | `client/src/components/swipe-back-navigation.tsx` | Edge swipe back |

## Hook Files (Web/Capacitor)

| Hook | Path | Purpose |
|------|------|---------|
| useNavState | `client/src/hooks/use-nav-state.ts` | Tab path + scroll persistence |
| useNavBarSwipe | `client/src/hooks/use-nav-bar-swipe.tsx` | Swipe between tabs |
| useNavVisibility | `client/src/hooks/use-nav-visibility.tsx` | Show/hide bottom nav |
| useNotificationDeeplink | `client/src/hooks/use-notification-deeplink.ts` | Push notification nav |
| useDeepLinkScroll | `client/src/hooks/use-deep-link-scroll.ts` | Scroll to + highlight |

## Platform Files

| File | Path | Purpose |
|------|------|---------|
| appLifecycle | `client/src/lib/appLifecycle.ts` | Back button, deep links, app state |
| capacitor | `client/src/lib/capacitor.ts` | Platform detection |
| capacitor.config | `capacitor.config.ts` | Capacitor plugin config |
| scroll-storage | `client/src/lib/scroll-storage.ts` | Scroll position persistence |
| i18n | `client/src/lib/i18n.tsx` | Language + RTL detection |
