import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SurveyManager } from "@/components/survey-manager";
import { SwipeBackNavigation } from "@/components/swipe-back-navigation";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ProductPage from "@/pages/product";
import Register from "@/pages/register";
import SignIn from "@/pages/signin";
import SearchPage from "@/pages/search";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import ContactUs from "@/pages/contact";
import SecurityGuide from "@/pages/security-guide";
import Security from "@/pages/security";
import Settings from "@/pages/settings";
import MyPurchases from "@/pages/my-purchases";
import MySales from "@/pages/my-sales";
import SellerDashboard from "@/pages/seller-dashboard";
import BuyerDashboard from "@/pages/buyer-dashboard";
import SellPage from "@/pages/sell";
import DealsGuide from "@/pages/deals-guide";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import MessagesPage from "@/pages/messages";
import MyAccount from "@/pages/my-account";
import MyBids from "@/pages/my-bids";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}


function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:id" component={ProductPage} />
      <Route path="/register" component={Register} />
      <Route path="/signin" component={SignIn} />
      <Route path="/search" component={SearchPage} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/my-purchases" component={MyPurchases} />
      <Route path="/my-sales" component={MySales} />
      <Route path="/seller-dashboard" component={SellerDashboard} />
      <Route path="/buyer-dashboard" component={BuyerDashboard} />
      <Route path="/contact" component={ContactUs} />
      <Route path="/security-guide" component={SecurityGuide} />
      <Route path="/security" component={Security} />
      <Route path="/settings" component={Settings} />
      <Route path="/sell" component={SellPage} />
      <Route path="/deals-guide" component={DealsGuide} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/messages/:partnerId" component={MessagesPage} />
      <Route path="/my-account" component={MyAccount} />
      <Route path="/my-bids" component={MyBids} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScrollToTop />
        <Toaster />
        <SurveyManager />
        <SwipeBackNavigation>
          <Router />
        </SwipeBackNavigation>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
