import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("[DEBUG] main.tsx is loading...");

// Capture auth token from URL BEFORE React renders (handles OAuth redirects)
(function captureAuthToken() {
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
})();

console.log("[DEBUG] About to render React app to #root...");
const rootEl = document.getElementById("root");
console.log("[DEBUG] Root element found:", rootEl);
createRoot(rootEl!).render(<App />);
console.log("[DEBUG] React app render called");
