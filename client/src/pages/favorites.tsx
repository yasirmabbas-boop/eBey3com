import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, ShoppingBag, Trash2, Eye, Star, Gavel } from "lucide-react";
import { ProductGridSkeleton } from "@/components/optimized-image";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AuctionCountdown } from "@/components/auction-countdown";
import { useLanguage } from "@/lib/i18n";
import { CONDITION_LABELS } from "@/lib/search-data";
import type { Listing } from "@shared/schema";

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const authToken = localStorage.getItem("authToken");
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

export default function FavoritesPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: favoriteListings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/watchlist/listings"],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch("/api/watchlist/listings", {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  const removeMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const res = await fetch(`/api/watchlist/${user?.id}/${listingId}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to remove");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist/listings"] });
      toast({ title: "تمت إزالة المنتج من المفضلة" });
    },
  });

  const formatPrice = (price: number) => {
    return price.toLocaleString("ar-IQ") + " د.ع";
  };

  if (isAuthLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
          </div>
          <ProductGridSkeleton count={6} />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold mb-2">المفضلة</h1>
          <p className="text-gray-500 mb-6">يجب تسجيل الدخول لعرض قائمة المفضلة</p>
          <Link href="/signin">
            <Button>تسجيل الدخول</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="h-8 w-8 text-red-500 fill-red-500" />
          <h1 className="text-2xl font-bold">المفضلة</h1>
          <Badge variant="secondary" className="text-sm">
            {favoriteListings.length} منتج
          </Badge>
        </div>

        <Link href="/my-auctions">
          <div className="mb-6 p-4 bg-gradient-to-l from-amber-50 to-amber-100 rounded-lg soft-border hover-elevate flex items-center justify-between cursor-pointer" data-testid="link-my-auctions">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-400 rounded-lg">
                <Star className="h-5 w-5 text-white fill-white" />
              </div>
              <div>
                <h3 className="font-bold text-amber-800">مزاداتي المراقبة</h3>
                <p className="text-sm text-amber-600">تابع المزادات التي أضفتها للمفضلة وشارك فيها بسرعة</p>
              </div>
            </div>
            <Gavel className="h-6 w-6 text-amber-500" />
          </div>
        </Link>

        {isLoading ? (
          <ProductGridSkeleton count={6} />
        ) : favoriteListings.length === 0 ? (
          <EmptyState
            type="favorites"
            title="لا توجد منتجات في المفضلة"
            description="أضف منتجات إلى قائمة المفضلة بالنقر على أيقونة القلب لتتمكن من العودة إليها لاحقاً"
            actionLabel="تصفح المنتجات"
            actionHref="/search"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {favoriteListings.map((listing) => (
              <Card 
                key={listing.id} 
                className="overflow-hidden soft-border hover-elevate transition-shadow group"
                data-testid={`favorite-item-${listing.id}`}
              >
                <Link href={`/product/${listing.id}`}>
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted/40">
                    <img
                      src={listing.images?.[0] || "https://via.placeholder.com/300"}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {listing.saleType === "auction" && (
                      <Badge className="absolute top-2 right-2 bg-primary text-white text-xs">
                        مزاد
                      </Badge>
                    )}
                  </div>
                </Link>
                <CardContent className="p-3">
                  <Link href={`/product/${listing.id}`}>
                    <h3 className="font-bold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {listing.title}
                    </h3>
                  </Link>
                  {(() => {
                    const specs = (listing as any).specifications || {};
                    const aspects = [
                      listing.condition && (CONDITION_LABELS[listing.condition] ? (language === "ar" ? CONDITION_LABELS[listing.condition].ar : CONDITION_LABELS[listing.condition].ku) : listing.condition),
                      specs.size || specs.shoeSize,
                      specs.color,
                    ].filter(Boolean);
                    return aspects.length > 0 ? (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{aspects.join(" • ")}</p>
                    ) : null;
                  })()}
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-primary text-sm">
                      {formatPrice(listing.currentBid || listing.price)}
                    </p>
                    {/* Views - Hidden */}
                    {/* <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {(listing as any).views || 0}
                    </span> */}
                  </div>
                  {listing.saleType === "auction" && listing.auctionEndTime && (
                    <div className="mb-2">
                      <AuctionCountdown endTime={listing.auctionEndTime} />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={(e) => {
                      e.preventDefault();
                      removeMutation.mutate(listing.id);
                    }}
                    disabled={removeMutation.isPending}
                    data-testid={`remove-favorite-${listing.id}`}
                  >
                    {removeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 ml-1" />
                        إزالة
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
