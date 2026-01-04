import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const authToken = localStorage.getItem("authToken");
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

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

  const isFavorite = isOptimistic !== null ? isOptimistic : watchlist.some(w => w.listingId === listingId);

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const method = isFavorite ? "DELETE" : "POST";
      const url = isFavorite 
        ? `/api/watchlist/${user?.id}/${listingId}`
        : `/api/watchlist`;
      
      const body = isFavorite ? undefined : JSON.stringify({ userId: user?.id, listingId });
      
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: getAuthHeaders(),
        body,
      });
      
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onMutate: () => {
      setIsOptimistic(!isFavorite);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: isFavorite ? "تمت الإزالة من المفضلة" : "تمت الإضافة للمفضلة",
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
    
    toggleMutation.mutate();
  };

  return (
    <button
      onClick={handleClick}
      disabled={toggleMutation.isPending}
      className={cn(
        buttonSize,
        "rounded-full flex items-center justify-center transition-all",
        "bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md",
        "hover:scale-110 active:scale-95",
        isFavorite && "bg-red-50",
        className
      )}
      data-testid={`favorite-button-${listingId}`}
      aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
    >
      {toggleMutation.isPending ? (
        <Loader2 className={cn(iconSize, "animate-spin text-gray-400")} />
      ) : (
        <Heart
          className={cn(
            iconSize,
            "transition-colors",
            isFavorite ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400"
          )}
        />
      )}
    </button>
  );
}
