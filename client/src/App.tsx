import { Switch, Route } from "wouter";
import { useEffect, Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SurveyManager } from "@/components/survey-manager";
import { SwipeBackNavigation } from "@/components/swipe-back-navigation";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { MobileNavBar } from "@/components/mobile-nav-bar";
import { InstallPWAPrompt } from "@/components/install-pwa-prompt";
import { PushNotificationPrompt } from "@/components/push-notification-prompt";
import { PWAUpdateBanner } from "@/components/pwa-update-banner";
import { NavVisibilityProvider } from "@/hooks/use-nav-visibility";
import { SafeAreaProvider } from "@/hooks/use-safe-area-provider";
import { LanguageProvider } from "@/lib/i18n";
import { BanBanner } from "@/components/ban-banner";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoadingSpinner } from "@/components/loading-spinner";
import { isIOS, isNative } from "@/lib/capacitor";
import { initAppLifecycle } from "@/lib/appLifecycle";
import { saveScrollY, getScrollY } from "@/lib/scroll-storage";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { useSocketNotifications } from "@/hooks/use-socket-notifications";
import { useNotificationDeeplink } from "@/hooks/use-notification-deeplink";
import HomePage from "@/pages/home";
import AuthPage from "@/pages/signin";
import NotFound from "@/pages/not-found";

// Auto-reload on stale chunk errors after deployment
// Wraps lazy() to catch "Failed to fetch dynamically imported module" and reload once
function lazyWithReload(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().catch((error) => {
      const reloadedKey = 'chunk-reload-' + window.location.pathname;
      if (!sessionStorage.getItem(reloadedKey)) {
        sessionStorage.setItem(reloadedKey, '1');
        window.location.reload();
        return new Promise(() => {}); // never resolves — page is reloading
      }
      // Already reloaded once, throw the original error
      sessionStorage.removeItem(reloadedKey);
      throw error;
    })
  );
}

// Lazy load pages for better performance
const ProductPage = lazyWithReload(() => import("@/pages/product"));
const Register = lazyWithReload(() => import("@/pages/register"));
const SearchPage = lazyWithReload(() => import("@/pages/search"));
const Privacy = lazyWithReload(() => import("@/pages/privacy"));
const DataDeletion = lazyWithReload(() => import("@/pages/data-deletion"));
const Terms = lazyWithReload(() => import("@/pages/terms"));
const ContactUs = lazyWithReload(() => import("@/pages/contact"));
const SecurityGuide = lazyWithReload(() => import("@/pages/security-guide"));
const Security = lazyWithReload(() => import("@/pages/security"));
const Settings = lazyWithReload(() => import("@/pages/settings"));
const About = lazyWithReload(() => import("@/pages/about"));
const MyPurchases = lazyWithReload(() => import("@/pages/my-purchases"));
const MySales = lazyWithReload(() => import("@/pages/my-sales"));
const SellerDashboard = lazyWithReload(() => import("@/pages/seller-dashboard"));
const BuyerDashboard = lazyWithReload(() => import("@/pages/buyer-dashboard"));
const SellWizardPage = lazyWithReload(() => import("@/pages/sell-wizard"));
const DealsGuide = lazyWithReload(() => import("@/pages/deals-guide"));
const CartPage = lazyWithReload(() => import("@/pages/cart"));
const CheckoutPage = lazyWithReload(() => import("@/pages/checkout"));
const MessagesPage = lazyWithReload(() => import("@/pages/messages"));
const MyAccount = lazyWithReload(() => import("@/pages/my-account"));
const MyBids = lazyWithReload(() => import("@/pages/my-bids"));
const AdminPage = lazyWithReload(() => import("@/pages/admin"));
const ForgotPassword = lazyWithReload(() => import("@/pages/forgot-password"));
const SecuritySettings = lazyWithReload(() => import("@/pages/security-settings"));
const FavoritesPage = lazyWithReload(() => import("@/pages/favorites"));
const SwipePage = lazyWithReload(() => import("@/pages/swipe"));
const AuctionsDashboard = lazyWithReload(() => import("@/pages/auctions-dashboard"));
const MyAuctions = lazyWithReload(() => import("@/pages/my-auctions"));
const SellerProfile = lazyWithReload(() => import("@/pages/seller-profile"));
const NotificationsPage = lazyWithReload(() => import("@/pages/notifications"));
const Onboarding = lazyWithReload(() => import("@/pages/onboarding"));
const BrowseRecentlyViewed = lazyWithReload(() => import("@/pages/browse-recently-viewed"));

// Define SocketNotificationsWrapper BEFORE Router - must be inside QueryClientProvider and Switch
function SocketNotificationsWrapper() {
  useSocketNotifications();
  return null;
}

// Handles notification tap → deep link navigation (must be mounted early)
function NotificationDeeplinkHandler() {
  useNotificationDeeplink();
  return null;
}

// Current history entry key — persists across route changes within a session
let currentHistoryKey = Math.random().toString(36).slice(2, 8);

function ScrollToTop() {
  useEffect(() => {
    // Use manual scroll restoration so we control it
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // Assign a key to the initial history entry if it doesn't have one
    if (!history.state?._scrollKey) {
      history.replaceState({ ...history.state, _scrollKey: currentHistoryKey }, "");
    } else {
      currentHistoryKey = history.state._scrollKey;
    }

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // On forward navigation (pushState): save current scroll, scroll new page to top
    history.pushState = function(...args) {
      // Save scroll position for the page we're leaving
      saveScrollY(currentHistoryKey, window.scrollY);

      // Generate a new key for the destination page
      const newKey = Math.random().toString(36).slice(2, 8);
      const stateObj = (args[0] && typeof args[0] === 'object') ? args[0] : {};
      args[0] = { ...stateObj, _scrollKey: newKey };
      currentHistoryKey = newKey;

      originalPushState.apply(history, args);
      setTimeout(() => window.scrollTo(0, 0), 0);
    };

    // replaceState: keep current key, don't scroll
    history.replaceState = function(...args) {
      const stateObj = (args[0] && typeof args[0] === 'object') ? args[0] : {};
      args[0] = { ...stateObj, _scrollKey: currentHistoryKey };
      originalReplaceState.apply(history, args);
    };

    // On back/forward (popstate): restore saved scroll position
    const handlePopState = (e: PopStateEvent) => {
      // Save scroll position for the page we're leaving
      saveScrollY(currentHistoryKey, window.scrollY);

      // Get the key for the page we're going to
      const targetKey = e.state?._scrollKey;
      if (targetKey) {
        currentHistoryKey = targetKey;
        const savedY = getScrollY(targetKey);
        if (savedY != null && savedY > 0) {
          // Delay to allow lazy-loaded page content to render before restoring scroll.
          // Page-level useLayoutEffect (e.g., search.tsx) may handle restore first;
          // __scrollRestoreHandled flag prevents these timeouts from interfering.
          const restore = () => {
            if ((window as any).__scrollRestoreHandled) return;
            window.scrollTo(0, savedY);
          };
          setTimeout(restore, 50);
          setTimeout(restore, 150);
          setTimeout(restore, 400);
        }
        // If no saved position, don't scroll — page will be at wherever it was
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Scroll to top on initial load
    window.scrollTo(0, 0);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  return null;
}

// Main Router component - all routes inside Switch
function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/product/:id" component={ProductPage} />
      <Route path="/register" component={Register} />
      <Route path="/signin" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/search" component={SearchPage} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/data-deletion" component={DataDeletion} />
      <Route path="/terms" component={Terms} />
      <Route path="/my-purchases" component={MyPurchases} />
      <Route path="/my-sales" component={MySales} />
      <Route path="/seller-dashboard" component={SellerDashboard} />
      <Route path="/buyer-dashboard" component={BuyerDashboard} />
      <Route path="/contact" component={ContactUs} />
      <Route path="/security-guide" component={SecurityGuide} />
      <Route path="/security" component={Security} />
      <Route path="/security-settings" component={SecuritySettings} />
      <Route path="/settings" component={Settings} />
      <Route path="/about" component={About} />
      <Route path="/sell" component={SellWizardPage} />
      <Route path="/deals-guide" component={DealsGuide} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/messages/:partnerId" component={MessagesPage} />
      <Route path="/my-account" component={MyAccount} />
      <Route path="/my-bids" component={MyBids} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/browse/recently-viewed" component={BrowseRecentlyViewed} />
      <Route path="/swipe" component={SwipePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/auctions" component={AuctionsDashboard} />
      <Route path="/my-auctions" component={MyAuctions} />
      <Route path="/seller/:id" component={SellerProfile} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/onboarding" component={Onboarding} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Main App component with proper provider nesting
function App() {
  useEffect(() => {
    // Initialize native app features
    if (isNative) {
      document.body.classList.add("capacitor-native");

      // Configure status bar
      // Prevent WebView from rendering under status bar on both iOS and Android
      StatusBar.setOverlaysWebView({ overlay: false }).catch(console.error);
      StatusBar.setStyle({ style: Style.Light }).catch(console.error);
      // Platform-specific status bar colors: iOS transparent, Android black for separation
      StatusBar.setBackgroundColor({ color: isIOS ? '#2563eb' : '#000000' }).catch(console.error);
      
      // Hide splash screen after app loads
      setTimeout(() => {
        SplashScreen.hide().catch(console.error);
      }, 1000);
      
      // Initialize app lifecycle (deep links, back button, etc.)
      initAppLifecycle({
        onDeepLink: (path) => {
          console.log('Deep link:', path);
          window.location.href = path;
        },
        onAppStateChange: (isActive) => {
          console.log('App state changed:', isActive ? 'active' : 'background');
        }
      });
    }

    return () => {
      document.body.classList.remove("capacitor-native");
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <SafeAreaProvider>
              <NavVisibilityProvider>
              <ScrollToTop />
              <NotificationDeeplinkHandler />
              <SocketNotificationsWrapper />
              <Toaster />
              <BanBanner />
              <SurveyManager />
              <OnboardingTutorial />
              <SwipeBackNavigation>
                <Suspense fallback={<LoadingSpinner />}>
                  <Router />
                </Suspense>
              </SwipeBackNavigation>
              <MobileNavBar />
              {!isNative && <InstallPWAPrompt />}
              {!isNative && <PWAUpdateBanner />}
              <PushNotificationPrompt />
            </NavVisibilityProvider>
            </SafeAreaProvider>
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
