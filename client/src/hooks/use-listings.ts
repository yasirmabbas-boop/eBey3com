import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import type { Listing } from "@shared/schema";

export interface UseListingsOptions {
  sellerId?: string;
  limit?: number;
}

/**
 * Custom hook to fetch listings with optional filtering
 * @param options - Optional parameters: sellerId and limit
 * @returns React Query result with listings data
 */
export function useListings(options?: UseListingsOptions) {
  const { sellerId, limit } = options || {};

  return useQuery<Listing[]>({
    queryKey: ["/api/listings", sellerId, limit],
    queryFn: async () => {
      // Build URL with query parameters
      const params = new URLSearchParams();
      if (sellerId) {
        params.append("sellerId", sellerId);
      }
      if (limit) {
        params.append("limit", limit.toString());
      }
      
      const url = `/api/listings${params.toString() ? `?${params.toString()}` : ""}`;
      
      // Use authFetch to ensure auth headers are included
      const res = await authFetch(url);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch listings: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Handle both response formats: array or { listings: [...] }
      const listings: Listing[] = Array.isArray(data) 
        ? data 
        : (data?.listings || []);
      
      return listings;
    },
    staleTime: 60 * 1000, // 60 seconds - fresh feed but doesn't spam server
  });
}
