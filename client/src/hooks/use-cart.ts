import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { CartItem, Listing } from "@shared/schema";
import { hapticSuccess } from "@/lib/despia";
import { secureRequest } from "@/lib/queryClient";

export interface CartItemWithListing extends CartItem {
  listing: {
    id: string;
    title: string;
    price: number;
    images: string[];
    saleType: string;
    quantityAvailable: number;
    isActive: boolean;
    sellerId: string | null;
    sellerName: string;
  } | null;
}

export function useCart() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data: cartItems = [], isLoading, error } = useQuery<CartItemWithListing[]>({
    queryKey: ["/api/cart"],
    queryFn: async () => {
      const res = await secureRequest("/api/cart", { method: "GET" });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Failed to fetch cart");
      }
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ listingId, quantity = 1 }: { listingId: string; quantity?: number }) => {
      const res = await secureRequest("/api/cart", {
        method: "POST",
        body: JSON.stringify({ listingId, quantity }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add to cart");
      }
      return res.json();
    },
    onSuccess: () => {
      hapticSuccess();
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const res = await secureRequest(`/api/cart/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update quantity");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await secureRequest(`/api/cart/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to remove from cart");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const res = await secureRequest("/api/cart", {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to clear cart");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });

  const activeItems = cartItems.filter(item => item.listing?.isActive);
  const totalItems = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = activeItems.reduce((sum, item) => sum + (item.priceSnapshot * item.quantity), 0);

  return {
    cartItems,
    activeItems,
    totalItems,
    totalPrice,
    isLoading,
    error,
    addToCart: addToCartMutation.mutateAsync,
    updateQuantity: updateQuantityMutation.mutateAsync,
    removeFromCart: removeFromCartMutation.mutateAsync,
    clearCart: clearCartMutation.mutateAsync,
    isAdding: addToCartMutation.isPending,
    isUpdating: updateQuantityMutation.isPending,
    isRemoving: removeFromCartMutation.isPending,
    isClearing: clearCartMutation.isPending,
  };
}
