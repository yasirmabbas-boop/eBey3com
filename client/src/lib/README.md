# Authentication Patterns

This document describes the centralized authentication patterns used in this application.

## Overview

All API requests that require authentication should use the centralized utilities in `queryClient.ts`. These utilities automatically include the Bearer token from localStorage, ensuring consistent authentication across the application.

## Available Utilities

### `authFetch(url, options?)`

A drop-in replacement for the native `fetch()` function that automatically includes authentication headers.

**When to use:** For direct fetch calls where you need fine-grained control over the request/response.

```typescript
import { authFetch } from "@/lib/queryClient";

// Simple GET request
const response = await authFetch("/api/user/profile");
const data = await response.json();

// POST request with custom options
const response = await authFetch("/api/listings", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "New Listing" })
});
```

### `apiRequest(method, url, data?)`

A convenience function for JSON API requests that includes automatic error handling.

**When to use:** For simple JSON API calls (POST/PUT/DELETE) where you want automatic error handling.

```typescript
import { apiRequest } from "@/lib/queryClient";

// POST request
const response = await apiRequest("POST", "/api/listings", {
  title: "New Listing",
  price: 100
});
const data = await response.json();

// PUT request
await apiRequest("PUT", "/api/account/profile", {
  displayName: "John Doe"
});

// DELETE request
await apiRequest("DELETE", `/api/listings/${id}`);
```

### `getAuthHeaders()`

Returns headers object with Authorization Bearer token.

**When to use:** Only for special cases where you need to manually construct headers.

```typescript
import { getAuthHeaders } from "@/lib/queryClient";

const headers = {
  ...getAuthHeaders(),
  "Custom-Header": "value"
};
```

## Usage with React Query

### Queries (GET requests)

Queries automatically use the default `queryFn` which includes authentication headers. No additional configuration needed.

```typescript
import { useQuery } from "@tanstack/react-query";

// ✅ Automatically authenticated
const { data } = useQuery({
  queryKey: ["/api/user/profile"]
});
```

### Mutations (POST/PUT/DELETE)

For mutations, use `authFetch` or `apiRequest` in your `mutationFn`:

```typescript
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// ✅ Using apiRequest (recommended for JSON APIs)
const updateProfile = useMutation({
  mutationFn: (data) => apiRequest("PUT", "/api/account/profile", data)
});

// ✅ Using authFetch (for more control)
const uploadImage = useMutation({
  mutationFn: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await authFetch("/api/upload", {
      method: "POST",
      body: formData
    });
    return response.json();
  }
});
```

## Migration Guide

### Before (Old Pattern)

```typescript
// ❌ Manual token retrieval and header construction
const authToken = localStorage.getItem("authToken");
const headers: HeadersInit = { "Content-Type": "application/json" };
if (authToken) {
  headers["Authorization"] = `Bearer ${authToken}`;
}

const response = await fetch("/api/endpoint", {
  method: "POST",
  headers,
  credentials: "include",
  body: JSON.stringify(data)
});
```

### After (New Pattern)

```typescript
// ✅ Automatic authentication with apiRequest
const response = await apiRequest("POST", "/api/endpoint", data);
```

## Common Patterns

### Fetching User Data

```typescript
useEffect(() => {
  const fetchData = async () => {
    const response = await authFetch("/api/onboarding");
    if (response.ok) {
      const data = await response.json();
      setUserData(data);
    }
  };
  fetchData();
}, []);
```

### Submitting Forms

```typescript
const handleSubmit = async (formData) => {
  try {
    await apiRequest("POST", "/api/form", formData);
    toast({ title: "Success" });
  } catch (error) {
    toast({ title: "Error", description: error.message });
  }
};
```

### With React Query Mutations

```typescript
const mutation = useMutation({
  mutationFn: (data) => apiRequest("PUT", "/api/settings", data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  }
});
```

## Important Notes

1. **Credentials**: Both `authFetch` and `apiRequest` automatically include `credentials: "include"` for session cookies.

2. **Error Handling**: `apiRequest` throws an error for non-OK responses. Use try-catch to handle errors.

3. **Headers Merging**: `authFetch` merges your custom headers with auth headers. Your headers take precedence.

4. **Token Source**: The Bearer token is read from `localStorage.getItem("authToken")`.

5. **No Token Needed**: If there's no token in localStorage, the request proceeds without the Authorization header (useful for public endpoints).

## Troubleshooting

### 401 Unauthorized Errors

If you're getting 401 errors:
1. Check if you're using `authFetch` or `apiRequest` (not plain `fetch`)
2. Verify the token exists in localStorage: `localStorage.getItem("authToken")`
3. Check if the user is authenticated: use the `useAuth()` hook

### Migration Checklist

When updating a component:
- [ ] Import `authFetch` or `apiRequest` from `@/lib/queryClient`
- [ ] Remove manual `localStorage.getItem("authToken")` calls
- [ ] Remove manual header construction
- [ ] Replace `fetch()` with `authFetch()` or `apiRequest()`
- [ ] Test the component thoroughly

## Examples in Codebase

Reference implementations:
- `client/src/pages/onboarding.tsx` - Uses both `authFetch` and `apiRequest`
- `client/src/components/post-registration-survey.tsx` - Uses `apiRequest` with React Query
- `client/src/pages/my-purchases.tsx` - Uses `authFetch` for custom queries
