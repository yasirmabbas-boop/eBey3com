import { Switch, Route, useLocation } from "wouter";
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
import { LanguageProvider } from "@/lib/i18n";
import { BanBanner } from "@/components/ban-banner";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoadingSpinner } from "@/components/loading-spinner";
import { isNative } from "@/lib/capacitor";
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
const MyPurchases = lazy(() => import("@/pages/my-purchases"));
const MySales = lazy(() => import("@/pages/my-sales"));
const SellerDashboard = lazy(() => import("@/pages/seller-dashboard"));
const BuyerDashboard = lazy(() => import("@/pages/buyer-dashboard"));
const SellPage = lazy(() => import("@/pages/sell"));
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

// 1. Define SocketNotificationsWrapper BEFORE Router to avoid reference errors
// This component must be inside QueryClientProvider and Switch (Router context)
function SocketNotificationsWrapper() {
  useSocketNotifications();
  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

// 2. Define the main Router Logic
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
      <Route path="/sell" component={SellWizardPage} />
      <Route path="/sell-old" component={SellPage} />
      <Route path="/deals-guide" component={DealsGuide} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/messages/:partnerId" component={MessagesPage} />
      <Route path="/my-account" component={MyAccount} />
      <Route path="/my-bids" component={MyBids} />
      <Route path="/favorites" component={FavoritesPage} />
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

// 3. Export the App with ALL Providers in the correct order
function App() {
  useEffect(() => {
    // Initialize native app features
    if (isNative) {
      document.body.classList.add("capacitor-native");

      // Configure status bar
      StatusBar.setStyle({ style: Style.Light }).catch(console.error);
      StatusBar.setBackgroundColor({ color: '#2563eb' }).catch(console.error);
      
      // Hide splash screen after app loads
      setTimeout(() => {
        SplashScreen.hide().catch(console.error);
      }, 1000);
      
      // Initialize app lifecycle (deep links, back button, etc.)
      initAppLifecycle({
        onDeepLink: (path) => {
          console.log('Deep link:', path);
          // Navigate to the path
          window.location.href = path;
        },
        onAppStateChange: (isActive) => {
          console.log('App state changed:', isActive ? 'active' : 'background');
          // Handle app becoming active/inactive
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
            <NavVisibilityProvider>
              {/* Switch provides Router context - ALL components using useLocation MUST be inside Switch */}
              <Switch>
                <Route path="/:rest*">
                  {() => (
                    <>
                      <ScrollToTop />
                      <SocketNotificationsWrapper />
                      <Toaster />
                      <BanBanner />
                      <SurveyManager />
                      <OnboardingTutorial />
                      <SwipeBackNavigation>
                        <Suspense
                          fallback={
                            <LoadingSpinner />
                          }
                        >
                          <Router />
                        </Suspense>
                      </SwipeBackNavigation>
                      <MobileNavBar />
                      {!isNative && <InstallPWAPrompt />}
                      {!isNative && <PWAUpdateBanner />}
                      <PushNotificationPrompt />
                    </>
                  )}
                </Route>
              </Switch>
            </NavVisibilityProvider>
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
