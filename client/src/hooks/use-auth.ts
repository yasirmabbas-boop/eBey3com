import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { User } from "@shared/models/auth";
import { authFetch } from "@/lib/queryClient";

export interface AuthUser {
  id: string;
  phone?: string | null;
  email?: string | null;
  displayName: string;
  avatar?: string | null;
  sellerApproved?: boolean;
  sellerRequestStatus?: string | null;
  isAdmin?: boolean;
  accountCode?: string | null;
  isBanned?: boolean;
  banReason?: string | null;
  rating?: number | null;
  ratingCount?: number;
  buyerRating?: number | null;
  buyerRatingCount?: number;
  totalSales?: number;
  city?: string | null;
  district?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  createdAt?: string | Date;
  twoFactorEnabled?: boolean;
  phoneVerified?: boolean;
  isVerified?: boolean;
  locationLat?: number | null;
  locationLng?: number | null;
  mapUrl?: string | null;
}

function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

// Check for token in URL (from Facebook OAuth redirect) and store it
// Returns true if a token was found and stored
function checkAndStoreUrlToken(): boolean {
  if (typeof window === "undefined") return false;
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  
  if (token) {
    console.log("[DEBUG useAuth] Found token in URL, storing in localStorage");
    localStorage.setItem("authToken", token);
    
    // Remove token from URL for security (prevent sharing URL with token)
    urlParams.delete("token");
    const newUrl = urlParams.toString() 
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
    return true;
  }
  return false;
}

// Also try at module load time
checkAndStoreUrlToken();

async function fetchUser(): Promise<AuthUser | null> {
  // authFetch automatically includes Authorization: Bearer <token> when present
  const authToken = getAuthToken();
  console.log(
    "[DEBUG useAuth] authToken from localStorage:",
    authToken ? `${authToken.substring(0, 8)}...` : "NULL",
  );

  // Use only the WhatsApp OTP-based auth endpoint
  const response = await authFetch("/api/auth/me");

  console.log("[DEBUG useAuth] /api/auth/me response status:", response.status);

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const userData = await response.json();
  console.log("[DEBUG useAuth] User data from /api/auth/me:", JSON.stringify(userData, null, 2));
  return userData;
}

async function logout(): Promise<void> {
  // Clear auth token from localStorage
  localStorage.removeItem("authToken");
  
  // Call logout endpoint to clear session
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (e) {
    // Ignore errors
  }
  
  // Redirect to home
  window.location.href = "/";
}

// Consistent query key for auth - used by all components
export const AUTH_QUERY_KEY = ["/api/auth/me"];

export function useAuth() {
  const queryClient = useQueryClient();
  const hasCheckedToken = useRef(false);
  
  const { data: user, isLoading, refetch } = useQuery<AuthUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchUser,
    retry: false,
    staleTime: 0, // Always fetch fresh data for auth
  });

  // Check for token in URL on every mount (handles SPA navigation after OAuth redirect)
  useEffect(() => {
    if (hasCheckedToken.current) return;
    hasCheckedToken.current = true;
    
    const tokenFound = checkAndStoreUrlToken();
    if (tokenFound) {
      console.log("[DEBUG useAuth] Token found in URL, invalidating auth cache and refetching");
      // Invalidate the cache and refetch with the new token
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    }
  }, [queryClient]);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    refetch,
  };
}
