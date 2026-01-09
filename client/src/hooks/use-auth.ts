import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

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
  isVerified?: boolean;
  isBanned?: boolean;
  banReason?: string | null;
  rating?: number | null;
  ratingCount?: number;
  buyerRating?: number | null;
  buyerRatingCount?: number;
  totalSales?: number;
  city?: string | null;
  createdAt?: string | Date;
  twoFactorEnabled?: boolean;
}

function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

async function fetchUser(): Promise<AuthUser | null> {
  // Try custom auth first with token fallback for Safari
  const authToken = getAuthToken();
  console.log("[DEBUG useAuth] authToken from localStorage:", authToken ? `${authToken.substring(0, 8)}...` : "NULL");
  
  const headers: HeadersInit = {};
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  const meResponse = await fetch("/api/auth/me", {
    credentials: "include",
    headers,
  });

  console.log("[DEBUG useAuth] /api/auth/me response status:", meResponse.status);

  if (meResponse.ok) {
    const userData = await meResponse.json();
    console.log("[DEBUG useAuth] User data from /api/auth/me:", JSON.stringify(userData, null, 2));
    return userData;
  }

  // Fall back to Replit auth
  console.log("[DEBUG useAuth] Falling back to /api/auth/user");
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  console.log("[DEBUG useAuth] /api/auth/user response status:", response.status);

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const userData = await response.json();
  console.log("[DEBUG useAuth] User data from /api/auth/user:", JSON.stringify(userData, null, 2));
  return userData;
}

async function logout(): Promise<void> {
  // Clear auth token from localStorage
  localStorage.removeItem("authToken");
  
  // Try custom logout first
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    if (response.ok) {
      // Custom auth logout successful, just reload
      window.location.href = "/";
      return;
    }
  } catch (e) {
    // Ignore errors, try Replit logout
  }
  // Fall back to Replit logout only if custom logout didn't work
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
