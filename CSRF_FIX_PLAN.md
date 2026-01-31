# CSRF Token Fix - Comprehensive Analysis & Implementation Plan

## Current State Analysis

### ✅ Currently Protected Routes
- `/api/account` - Has CSRF validation middleware
- `/api/transactions` - Has CSRF validation middleware
- `/api/cart` - Has CSRF validation middleware
- `/api/admin` - Has CSRF validation middleware
- `/api/listings` - Has CSRF validation middleware

### ❌ Missing CSRF Protection (Backend)
1. `/api/offers` - POST, PUT endpoints unprotected
2. `/api/messages` - POST endpoint unprotected
3. `/api/reports` - POST endpoint unprotected
4. `/api/watchlist` - POST, DELETE endpoints unprotected
5. `/api/push` - POST endpoints unprotected
6. `/api/uploads` - POST endpoints unprotected
7. `/api/image-search` - POST endpoint unprotected
8. `/api/seller-request` - POST endpoint unprotected
9. `/api/notifications` - POST endpoints unprotected
10. `/api/auth/2fa/*` - POST endpoints unprotected
11. `/api/auth/verify-registration-otp` - POST endpoint unprotected

### ❌ Frontend Issues
1. **`getAuthHeaders()`** - Only uses cached CSRF token, doesn't fetch if missing
2. **Direct `fetch()` calls** - Many components bypass secure request functions
3. **Admin page** - Custom `fetchWithAuth` without CSRF support
4. **Cart hooks** - Use `getAuthHeaders()` which may not have CSRF token
5. **Upload hooks** - Don't include CSRF tokens
6. **Mutation functions** - Many use direct fetch without CSRF

## Root Cause

The main issue is that `getAuthHeaders()` only includes CSRF token if it's already cached:
```typescript
// Current implementation
if (csrfToken) {
  headers["X-CSRF-Token"] = csrfToken;
}
```

This means:
- If token isn't cached yet, requests fail
- Components using `getAuthHeaders()` don't get CSRF tokens for mutations
- Many components bypass secure functions entirely

## Solution Architecture

### Phase 1: Enhance Secure Request Function

Create a unified `secureRequest()` function that:
1. Always fetches CSRF token for non-GET requests
2. Includes auth token automatically
3. Handles errors gracefully
4. Works for both queries and mutations

### Phase 2: Add CSRF Protection to Missing Routes

Add CSRF validation middleware to all mutation endpoints.

### Phase 3: Update All Components

Replace all direct `fetch()` calls with `secureRequest()` or `apiRequest()`.

## Implementation Plan

### Step 1: Enhance `queryClient.ts` with Better CSRF Handling

**File:** `client/src/lib/queryClient.ts`

**Changes:**
1. Make `getAuthHeaders()` async and fetch CSRF token if needed
2. Create `getSecureHeaders()` function for mutations
3. Ensure `apiRequest()` always has CSRF token for mutations
4. Update `authFetch()` to always fetch CSRF for mutations

### Step 2: Add CSRF Protection to Missing Backend Routes

**Files to Update:**
- `server/routes/offers.ts`
- `server/routes/messages.ts`
- `server/routes/reports.ts`
- `server/routes/users.ts` (watchlist)
- `server/routes/push.ts`
- `server/routes/notifications.ts`
- `server/routes/account.ts` (seller-request, 2FA)
- `server/routes/products.ts` (image-search)

### Step 3: Update All Frontend Components

**Components to Update:**
1. Admin page - Replace `fetchWithAuth` with `apiRequest`
2. Cart hooks - Use `apiRequest` for mutations
3. Checkout page - Use `apiRequest` for checkout mutation
4. Product page - Use `apiRequest` for offers, reports
5. Seller dashboard - Use `apiRequest` for all mutations
6. Buyer dashboard - Use `apiRequest` for mutations
7. Purchases page - Use `apiRequest` for mutations
8. Sell page - Use `apiRequest` for listing creation
9. Upload hooks - Include CSRF tokens
10. Phone verification modals - Use `apiRequest`
11. Two-factor settings - Use `apiRequest`
12. Image search modal - Use `apiRequest`
13. Push notification settings - Use `apiRequest`
14. Contact seller - Use `apiRequest`
15. Favorites/watchlist - Use `apiRequest`

## Detailed Implementation

### 1. Enhanced Secure Request Function

```typescript
// client/src/lib/queryClient.ts

/**
 * Get secure headers with auth token and CSRF token
 * For mutations, always fetches fresh CSRF token
 * For queries, uses cached token if available
 */
export async function getSecureHeaders(isMutation: boolean = false): Promise<HeadersInit> {
  const headers: HeadersInit = {};
  
  // Always include auth token if available
  const authToken = localStorage.getItem("authToken");
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  // For mutations, always fetch fresh CSRF token
  if (isMutation) {
    const token = await fetchCsrfToken();
    if (token) {
      headers["X-CSRF-Token"] = token;
    }
  } else {
    // For queries, use cached token if available
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }
  
  return headers;
}

/**
 * Secure request function - drop-in replacement for fetch()
 * Automatically includes auth and CSRF tokens
 */
export async function secureRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method?.toUpperCase() || "GET";
  const isMutation = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  
  const headers = await getSecureHeaders(isMutation);
  
  const mergedHeaders = {
    ...headers,
    ...(options.headers || {}),
  };
  
  // Add Content-Type for mutations with body
  if (isMutation && options.body && !mergedHeaders["Content-Type"]) {
    mergedHeaders["Content-Type"] = "application/json";
  }
  
  return fetch(url, {
    ...options,
    headers: mergedHeaders,
    credentials: "include",
  });
}
```

### 2. Backend CSRF Protection

Add CSRF validation to all mutation routes:

```typescript
// server/routes/offers.ts
import { validateCsrfToken } from "../middleware/csrf";

export function registerOffersRoutes(app: Express): void {
  // Apply CSRF validation to all offer routes except GET requests
  app.use("/api/offers", validateCsrfToken);
  // ... rest of routes
}

// Similar for other routes...
```

### 3. Component Updates

Replace all direct fetch calls:

```typescript
// Before
const res = await fetch("/api/offers", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

// After
const res = await secureRequest("/api/offers", {
  method: "POST",
  body: JSON.stringify(data),
});
```

## Testing Checklist

- [ ] Test all mutation endpoints with CSRF tokens
- [ ] Test CSRF token refresh on 403 errors
- [ ] Test unauthenticated requests (should work without CSRF)
- [ ] Test authenticated GET requests (should work with cached CSRF)
- [ ] Test authenticated mutations (should fetch fresh CSRF)
- [ ] Test multiple rapid mutations (should handle token refresh)
- [ ] Test session expiration (should handle gracefully)
- [ ] Test all pages mentioned in user's list

## Files to Modify

### Backend (Add CSRF Protection)
1. `server/routes/offers.ts`
2. `server/routes/messages.ts`
3. `server/routes/reports.ts`
4. `server/routes/users.ts`
5. `server/routes/push.ts`
6. `server/routes/notifications.ts`
7. `server/routes/account.ts`
8. `server/routes/products.ts`

### Frontend (Use Secure Requests)
1. `client/src/lib/queryClient.ts` - Enhance secure functions
2. `client/src/pages/admin.tsx` - Replace fetchWithAuth
3. `client/src/hooks/use-cart.ts` - Use secureRequest
4. `client/src/pages/checkout.tsx` - Use secureRequest
5. `client/src/pages/product.tsx` - Use secureRequest
6. `client/src/pages/seller-dashboard.tsx` - Use secureRequest
7. `client/src/pages/buyer-dashboard.tsx` - Use secureRequest
8. `client/src/pages/my-purchases.tsx` - Use secureRequest
9. `client/src/pages/sell.tsx` - Use secureRequest
10. `client/src/pages/sell-wizard.tsx` - Use secureRequest
11. `client/src/hooks/use-upload.ts` - Include CSRF
12. `client/src/components/phone-verification-modal.tsx` - Use secureRequest
13. `client/src/components/mandatory-phone-verification-modal.tsx` - Use secureRequest
14. `client/src/components/two-factor-settings.tsx` - Use secureRequest
15. `client/src/components/image-search-modal.tsx` - Use secureRequest
16. `client/src/components/push-notification-prompt.tsx` - Use secureRequest
17. `client/src/components/contact-seller.tsx` - Use secureRequest
18. `client/src/components/favorite-button.tsx` - Use secureRequest
19. `client/src/pages/my-account.tsx` - Use secureRequest (if needed)
20. `client/src/hooks/use-auth.ts` - Use secureRequest for logout

## Priority Order

1. **Critical** - Enhance secure request function
2. **High** - Add CSRF protection to missing backend routes
3. **High** - Update cart, checkout, product pages
4. **Medium** - Update seller/buyer dashboards
5. **Medium** - Update upload hooks
6. **Low** - Update modals and components
