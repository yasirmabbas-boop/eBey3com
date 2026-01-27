import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ErrorBoundary } from "@/components/error-boundary";

// Capture auth token from URL BEFORE React renders (handles OAuth redirects)
(function captureAuthToken() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    
    if (token) {
      console.log("[main.tsx] Found token in URL, storing in localStorage:", token.substring(0, 8) + "...");
      localStorage.setItem("authToken", token);
      
      // Remove token from URL for security
      urlParams.delete("token");
      const newUrl = urlParams.toString() 
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
      console.log("[main.tsx] Token stored, URL cleaned");
    }
  } catch (error) {
    // localStorage might be blocked in iframe (Replit Preview)
    console.warn("[main.tsx] Could not access localStorage:", error);
  }
})();

// Render with ErrorBoundary to catch any initialization errors (e.g., localStorage blocked in iframe)
const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element not found");
}

createRoot(rootEl).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
