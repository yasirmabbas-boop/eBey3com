import { QueryClient, QueryFunction } from "@tanstack/react-query";

// CSRF token cache
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

/**
 * Fetch CSRF token from server (async, caches result)
 * Returns null if session doesn't exist or fetch fails
 */
async function fetchCsrfToken(): Promise<string | null> {
  // Always fetch a fresh token for mutations to avoid stale token issues
  // The cached token may be from a previous session
  
  // If a fetch is already in progress, wait for it
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Start new fetch (always fetch fresh, don't use cached)
  csrfTokenPromise = fetch("/api/csrf-token", {
    credentials: "include",
  })
    .then(async (res) => {
      if (!res.ok) {
        // Session might not exist - this is OK for unauthenticated requests
        csrfTokenPromise = null;
        return null;
      }
      const data = await res.json();
      csrfToken = data.token;
      csrfTokenPromise = null;
      return csrfToken;
    })
    .catch((error) => {
      // Silently fail - CSRF might not be needed if session doesn't exist
      console.log("[CSRF] Token fetch failed (this is OK if not logged in):", error);
      csrfTokenPromise = null;
      return null;
    });

  return csrfTokenPromise;
}

/**
 * Get authentication headers from localStorage
 * @returns HeadersInit with Authorization Bearer token if available
 * NOTE: This is synchronous and only uses cached CSRF token.
 * For mutations, use getSecureHeaders() instead.
 */
export function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  const authToken = localStorage.getItem("authToken");
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  // Include CSRF token if available (cached)
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }
  
  return headers;
}

/**
 * Get secure headers with auth token and CSRF token
 * For mutations, always fetches fresh CSRF token
 * For queries, uses cached token if available
 * @param isMutation - Whether this is a mutation request (POST/PUT/PATCH/DELETE)
 * @returns Promise<HeadersInit> with auth and CSRF tokens
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
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @returns Promise<Response>
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
  
  // Add Content-Type for mutations with body (if not already set and not FormData)
  if (isMutation && options.body && !mergedHeaders["Content-Type"] && !(options.body instanceof FormData)) {
    mergedHeaders["Content-Type"] = "application/json";
  }
  
  return fetch(url, {
    ...options,
    headers: mergedHeaders,
    credentials: "include",
  });
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Authenticated fetch - drop-in replacement for fetch() that includes auth headers
 * @param url - The URL to fetch
 * @param options - Standard fetch options (headers will be merged with auth headers)
 * @returns Response object
 */
export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const method = options?.method?.toUpperCase() || "GET";
  const isMutation = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  
  const headers = await getSecureHeaders(isMutation);
  
  const mergedHeaders = {
    ...headers,
    ...(options?.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers: mergedHeaders,
    credentials: "include",
  });

  return res;
}

/**
 * Convenience function for JSON API requests with automatic auth and error handling
 * @param method - HTTP method
 * @param url - The URL to fetch
 * @param data - Optional data to send as JSON body
 * @returns Response object
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isMutation = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const headers = await getSecureHeaders(isMutation);
  
  // Add Content-Type if we have data
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle 401 for mutations - try refresh first
  if (res.status === 401) {
    try {
      // Attempt token refresh
      await fetchCsrfToken();
      const refreshHeaders = getAuthHeaders();
      const refreshRes = await fetch("/api/auth/refresh-token", {
        method: "POST",
        headers: refreshHeaders,
        credentials: "include",
      });
      
      if (refreshRes.ok) {
        const { authToken } = await refreshRes.json();
        localStorage.setItem("authToken", authToken);
        
        // Retry original request with new token
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${authToken}`,
        };
        
        const retryRes = await fetch(url, {
          method,
          headers: retryHeaders,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
        
        if (retryRes.ok) {
          await throwIfResNotOk(retryRes);
          return retryRes;
        }
      }
    } catch (refreshError) {
      console.log("[apiRequest] Token refresh failed, redirecting to signin");
    }
    
    // Refresh failed or not possible - redirect to signin
    localStorage.removeItem("authToken");
    const currentPath = window.location.pathname;
    if (currentPath !== '/' && currentPath !== '/signin') {
      window.location.href = `/signin?redirect=${encodeURIComponent(currentPath)}`;
    }
    throw new Error("Session expired");
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
  // For queries, use cached CSRF token (synchronous)
  const queryHeaders = getAuthHeaders();
  const res = await fetch(queryKey.join("/") as string, {
    credentials: "include",
    headers: queryHeaders,
  });

    // Global 401 handler - don't redirect, just clear auth and return null
    // Let individual pages handle their own auth redirect logic
    if (res.status === 401) {
      console.log("[queryClient] Received 401, clearing auth token");
      localStorage.removeItem("authToken");
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
