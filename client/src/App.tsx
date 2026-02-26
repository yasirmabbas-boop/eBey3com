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
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { useSocketNotifications } from "@/hooks/use-socket-notifications";
import HomePage from "@/pages/home";
import AuthPage from "@/pages/signin";
import NotFound from "@/pages/not-found";

// Lazy load pages for better performance
const ProductPage = lazy(() => import("@/pages/product"));
const Register = lazy(() => import("@/pages/register"));
const SearchPage = lazy(() => import("@/pages/search"));
const Privacy = lazy(() => import("@/pages/privacy"));
const DataDeletion = lazy(() => import("@/pages/data-deletion"));
const Terms = lazy(() => import("@/pages/terms"));
const ContactUs = lazy(() => import("@/pages/contact"));
const SecurityGuide = lazy(() => import("@/pages/security-guide"));
const Security = lazy(() => import("@/pages/security"));
const Settings = lazy(() => import("@/pages/settings"));
const About = lazy(() => import("@/pages/about"));
const MyPurchases = lazy(() => import("@/pages/my-purchases"));
const MySales = lazy(() => import("@/pages/my-sales"));
const SellerDashboard = lazy(() => import("@/pages/seller-dashboard"));
const BuyerDashboard = lazy(() => import("@/pages/buyer-dashboard"));
const SellWizardPage = lazy(() => import("@/pages/sell-wizard"));
const DealsGuide = lazy(() => import("@/pages/deals-guide"));
const CartPage = lazy(() => import("@/pages/cart"));
const CheckoutPage = lazy(() => import("@/pages/checkout"));
const MessagesPage = lazy(() => import("@/pages/messages"));
const MyAccount = lazy(() => import("@/pages/my-account"));
const MyBids = lazy(() => import("@/pages/my-bids"));
const AdminPage = lazy(() => import("@/pages/admin"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const SecuritySettings = lazy(() => import("@/pages/security-settings"));
const FavoritesPage = lazy(() => import("@/pages/favorites"));
const SwipePage = lazy(() => import("@/pages/swipe"));
const AuctionsDashboard = lazy(() => import("@/pages/auctions-dashboard"));
const MyAuctions = lazy(() => import("@/pages/my-auctions"));
const SellerProfile = lazy(() => import("@/pages/seller-profile"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const BrowseRecentlyViewed = lazy(() => import("@/pages/browse-recently-viewed"));

// Define SocketNotificationsWrapper BEFORE Router - must be inside QueryClientProvider and Switch
function SocketNotificationsWrapper() {
  useSocketNotifications();
  return null;
}

// Scroll position map: stores scrollY keyed by a unique history entry key
// Limited to 50 entries to prevent unbounded memory growth
const scrollPositions = new Map<string, number>();
const MAX_SCROLL_ENTRIES = 50;
let currentHistoryKey = Math.random().toString(36).slice(2, 8);

function saveScrollPosition(key: string, y: number) {
  scrollPositions.set(key, y);
  // Evict oldest entries if over limit
  if (scrollPositions.size > MAX_SCROLL_ENTRIES) {
    const firstKey = scrollPositions.keys().next().value;
    if (firstKey) scrollPositions.delete(firstKey);
  }
}

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
      saveScrollPosition(currentHistoryKey, window.scrollY);

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
      saveScrollPosition(currentHistoryKey, window.scrollY);

      // Get the key for the page we're going to
      const targetKey = e.state?._scrollKey;
      if (targetKey) {
        currentHistoryKey = targetKey;
        const savedY = scrollPositions.get(targetKey);
        if (savedY != null && savedY > 0) {
          // Delay to allow lazy-loaded page content to render before restoring scroll
          // Use multiple attempts since Suspense/lazy pages may take time to mount
          const restore = () => window.scrollTo(0, savedY);
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
