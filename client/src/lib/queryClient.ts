import { QueryClient, QueryFunction } from "@tanstack/react-query";

// CSRF token cache
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

/**
 * Fetch CSRF token from server (non-blocking, caches result)
 */
function fetchCsrfToken(): void {
  if (csrfToken || csrfTokenPromise) {
    return; // Already have token or fetch in progress
  }

  csrfTokenPromise = fetch("/api/csrf-token", {
    credentials: "include",
  })
    .then(async (res) => {
      if (!res.ok) {
        csrfTokenPromise = null;
        return null;
      }
      const data = await res.json();
      csrfToken = data.token;
      csrfTokenPromise = null;
      return csrfToken;
    })
    .catch(() => {
      csrfTokenPromise = null;
      return null;
    });
}

/**
 * Get authentication headers from localStorage
 * @returns HeadersInit with Authorization Bearer token if available
 */
export function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  const authToken = localStorage.getItem("authToken");
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  // Include CSRF token if available
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }
  
  return headers;
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
  const authHeaders = await getAuthHeaders();
  const mergedHeaders = {
    ...authHeaders,
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
  // Fetch CSRF token for non-GET requests
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    fetchCsrfToken();
    // Wait for token if fetch is in progress
    if (csrfTokenPromise && !csrfToken) {
      await csrfTokenPromise;
    }
  }

  const authHeaders = getAuthHeaders();
  const headers: HeadersInit = {
    ...authHeaders,
    ...(data ? { "Content-Type": "application/json" } : {}),
  };
  
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
      fetchCsrfToken();
      if (csrfTokenPromise && !csrfToken) {
        await csrfTokenPromise;
      }
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
