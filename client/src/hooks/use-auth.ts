import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

interface AuthUser {
  id: string;
  username?: string | null;
  email?: string | null;
  displayName: string;
  avatar?: string | null;
  accountType?: string;
  accountCode?: string | null;
  isVerified?: boolean;
}

async function fetchUser(): Promise<AuthUser | null> {
  // Try custom auth first
  const meResponse = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (meResponse.ok) {
    return meResponse.json();
  }

  // Fall back to Replit auth
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function logout(): Promise<void> {
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
