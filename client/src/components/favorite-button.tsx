import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";

interface FavoriteButtonProps {
  listingId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FavoriteButton({ listingId, className, size = "md" }: FavoriteButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOptimistic, setIsOptimistic] = useState<boolean | null>(null);

  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const buttonSize = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";

  const { data: watchlist = [] } = useQuery<{ listingId: string }[]>({
    queryKey: ["/api/watchlist", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/users/${user.id}/watchlist`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  const isInWatchlist = watchlist.some(w => w.listingId === listingId);
  const isFavorite = isOptimistic !== null ? isOptimistic : isInWatchlist;

  const toggleMutation = useMutation({
    mutationFn: async (shouldRemove: boolean) => {
      const method = shouldRemove ? "DELETE" : "POST";
      const url = shouldRemove 
        ? `/api/watchlist/${user?.id}/${listingId}`
        : `/api/watchlist`;
      
      const body = shouldRemove ? undefined : { userId: user?.id, listingId };
      
      await apiRequest(method, url, body);
      return { shouldRemove };
    },
    onMutate: (shouldRemove) => {
      setIsOptimistic(!shouldRemove);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: data.shouldRemove ? "تمت الإزالة من المفضلة" : "تمت الإضافة للمفضلة",
      });
    },
    onError: () => {
      setIsOptimistic(null);
      toast({
        title: "حدث خطأ",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsOptimistic(null);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "سجل دخولك لإضافة المنتجات للمفضلة",
      });
      return;
    }
    
    const currentlyFavorite = isOptimistic !== null ? isOptimistic : isInWatchlist;
    toggleMutation.mutate(currentlyFavorite);
  };

  return (
    <button
      onClick={handleClick}
      disabled={toggleMutation.isPending}
      className={cn(
        buttonSize,
        "rounded-full flex items-center justify-center transition-all",
        "hover:scale-110 active:scale-95",
        className
      )}
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
      data-testid={`favorite-button-${listingId}`}
      aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
    >
      {toggleMutation.isPending ? (
        <Loader2 className={cn(iconSize, "animate-spin text-white stroke-2")} style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }} />
      ) : (
        <Heart
          className={cn(
            iconSize,
            "transition-colors stroke-2",
            isFavorite 
              ? "fill-red-500 stroke-red-500 text-red-500" 
              : "stroke-white text-white fill-none hover:stroke-red-400 hover:text-red-400"
          )}
          style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}
        />
      )}
    </button>
  );
}
