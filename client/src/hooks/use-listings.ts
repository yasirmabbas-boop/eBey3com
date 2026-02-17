import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import type { Listing } from "@shared/schema";

export interface UseListingsOptions {
  sellerId?: string;
  limit?: number;
  page?: number;
  category?: string;
  includeSold?: boolean;
  q?: string; // search query
  minPrice?: string | number;
  maxPrice?: string | number;
  condition?: string[];
  saleType?: string[];
  city?: string[];
  specs?: Record<string, string[]>;
}

export interface UseListingsResponse {
  listings: Listing[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Custom hook to fetch listings with optional filtering
 * @param options - Optional parameters for filtering and pagination
 * @returns React Query result with listings data and pagination info
 */
export function useListings(options?: UseListingsOptions) {
  const { 
    sellerId, 
    limit, 
    page,
    category,
    includeSold,
    q,
    minPrice,
    maxPrice,
    condition,
    saleType,
    city,
    specs
  } = options || {};

  return useQuery<UseListingsResponse>({
    queryKey: [
      "/api/listings", 
      sellerId, 
      limit, 
      page,
      category,
      includeSold,
      q,
      minPrice,
      maxPrice,
      condition?.join(','),
      saleType?.join(','),
      city?.join(','),
      JSON.stringify(specs)
    ],
    queryFn: async () => {
      // Build URL with query parameters
      const params = new URLSearchParams();
      if (sellerId) {
        params.append("sellerId", sellerId);
      }
      if (limit) {
        params.append("limit", limit.toString());
      }
      if (page) {
        params.append("page", page.toString());
      }
      if (category) {
        params.append("category", category);
      }
      if (includeSold) {
        params.append("includeSold", "true");
      }
      if (q) {
        params.append("q", q);
      }
      if (minPrice) {
        params.append("minPrice", String(minPrice));
      }
      if (maxPrice) {
        params.append("maxPrice", String(maxPrice));
      }
      if (condition && condition.length > 0) {
        condition.forEach(c => params.append("condition", c));
      }
      if (saleType && saleType.length > 0) {
        saleType.forEach(s => params.append("saleType", s));
      }
      if (city && city.length > 0) {
        city.forEach(c => params.append("city", c));
      }
      if (specs) {
        for (const [key, values] of Object.entries(specs)) {
          values.forEach(v => params.append(`specs[${key}]`, v));
        }
      }
      
      const url = `/api/listings${params.toString() ? `?${params.toString()}` : ""}`;
      
      // Use authFetch to ensure auth headers are included
      const res = await authFetch(url);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch listings: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Handle both response formats: array or { listings: [...], pagination: {...} }
      if (Array.isArray(data)) {
        return {
          listings: data,
          pagination: undefined
        };
      }
      
      return {
        listings: data?.listings || [],
        pagination: data?.pagination
      };
    },
    staleTime: 60 * 1000, // 60 seconds - fresh feed but doesn't spam server
  });
}
