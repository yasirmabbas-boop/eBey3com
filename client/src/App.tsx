import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ProductPage from "@/pages/product";
import Register from "@/pages/register";
import SignIn from "@/pages/signin";
import SearchPage from "@/pages/search";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import LiveAuction from "@/pages/live-auction";

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
      <Route path="/live-auction" component={LiveAuction} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
