import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { hapticLight, hapticSuccess } from "@/lib/despia";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  ChevronUp, 
  ChevronDown,
  Loader2,
  MapPin,
  Clock,
  Gavel,
  ShoppingBag,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Listing {
  id: string;
  title: string;
  price: number;
  currentBid: number | null;
  images: string[];
  category: string;
  saleType: "fixed" | "auction";
  auctionEndTime: string | null;
  city: string;
  condition: string;
  totalBids: number;
  sellerId: string;
  sellerName: string;
  description: string;
  views: number;
  favoritesCount: number;
}

interface ListingsResponse {
  listings: Listing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("ar-IQ").format(price) + " د.ع";
};

const formatTimeRemaining = (endTime: string, language: string) => {
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) {
    return language === "ar" ? "انتهى" : "تەواو بوو";
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return language === "ar" 
      ? `${days} يوم ${hours} ساعة`
      : `${days} ڕۆژ ${hours} کاتژمێر`;
  }
  if (hours > 0) {
    return language === "ar"
      ? `${hours} ساعة ${minutes} دقيقة`
      : `${hours} کاتژمێر ${minutes} خولەک`;
  }
  return language === "ar"
    ? `${minutes} دقيقة`
    : `${minutes} خولەک`;
};

function SwipeCard({ 
  listing, 
  isActive,
  onFavorite,
  isFavorited,
  language 
}: { 
  listing: Listing; 
  isActive: boolean;
  onFavorite: () => void;
  isFavorited: boolean;
  language: string;
}) {
  const [, navigate] = useLocation();
  const [imageIndex, setImageIndex] = useState(0);

  const handleImageTap = (e: React.MouseEvent) => {
    if (listing.images.length <= 1) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (x < width / 3) {
      setImageIndex(prev => (prev > 0 ? prev - 1 : listing.images.length - 1));
    } else if (x > (width * 2) / 3) {
      setImageIndex(prev => (prev < listing.images.length - 1 ? prev + 1 : 0));
    } else {
      navigate(`/product/${listing.id}`);
    }
    hapticLight();
  };

  return (
    <div className="relative h-full w-full bg-black">
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={handleImageTap}
      >
        {listing.images.length > 0 ? (
          <img 
            src={listing.images[imageIndex]} 
            alt={listing.title}
            className="h-full w-full object-contain bg-black"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <ShoppingBag className="h-20 w-20 text-muted-foreground" />
          </div>
        )}
        
        {listing.images.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
            {listing.images.map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "h-1 rounded-full transition-all",
                  idx === imageIndex 
                    ? "w-6 bg-white" 
                    : "w-1 bg-white/50"
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-40 safe-area-bottom">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link href={`/product/${listing.id}`}>
              <h2 className="text-white text-lg font-bold line-clamp-2 mb-2">
                {listing.title}
              </h2>
            </Link>
            
            <div className="flex items-center gap-2 mb-2">
              {listing.saleType === "auction" ? (
                <>
                  <Badge variant="secondary" className="bg-amber-500/80 text-white border-0">
                    <Gavel className="h-3 w-3 ml-1" />
                    {language === "ar" ? "مزاد" : "مزایەدە"}
                  </Badge>
                  <span className="text-white font-bold text-xl">
                    {formatPrice(listing.currentBid || listing.price)}
                  </span>
                </>
              ) : (
                <span className="text-white font-bold text-xl">
                  {formatPrice(listing.price)}
                </span>
              )}
            </div>

            {listing.saleType === "auction" && listing.auctionEndTime && (
              <div className="flex items-center gap-1 text-amber-400 text-sm mb-2">
                <Clock className="h-4 w-4" />
                <span>{formatTimeRemaining(listing.auctionEndTime, language)}</span>
                {listing.totalBids > 0 && (
                  <span className="text-white/70 mr-2">
                    ({listing.totalBids} {language === "ar" ? "مزايدة" : "مزایەدە"})
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 text-white/70 text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{listing.city}</span>
              </div>
              <Badge variant="outline" className="text-white/70 border-white/30 text-xs">
                {listing.condition === "New" 
                  ? (language === "ar" ? "جديد" : "نوێ")
                  : listing.condition === "Used - Like New"
                  ? (language === "ar" ? "مستعمل - كالجديد" : "بەکارهێنراو - وەک نوێ")
                  : listing.condition === "Used - Good"
                  ? (language === "ar" ? "مستعمل - جيد" : "بەکارهێنراو - باش")
                  : listing.condition === "Vintage"
                  ? (language === "ar" ? "قديم/عتيق" : "کۆن")
                  : listing.condition}
              </Badge>
            </div>

            <Link href={`/seller/${listing.sellerId}`}>
              <div className="flex items-center gap-2 mt-3 text-white/80 text-sm">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span>{listing.sellerName}</span>
              </div>
            </Link>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFavorite();
                hapticSuccess();
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center transition-colors",
                isFavorited ? "bg-red-500" : "bg-white/20"
              )}>
                <Heart className={cn(
                  "h-6 w-6 transition-colors",
                  isFavorited ? "text-white fill-white" : "text-white"
                )} />
              </div>
              <span className="text-white text-xs">
                {listing.favoritesCount}
              </span>
            </button>

            <Link href={`/messages/${listing.sellerId}`}>
              <button className="flex flex-col items-center gap-1">
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <span className="text-white text-xs">
                  {language === "ar" ? "رسالة" : "پەیام"}
                </span>
              </button>
            </Link>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (navigator.share) {
                  navigator.share({
                    title: listing.title,
                    url: `${window.location.origin}/product/${listing.id}`
                  });
                }
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Share2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-white text-xs">
                {language === "ar" ? "مشاركة" : "هاوبەشی"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <Link href={`/product/${listing.id}`}>
        <Button 
          className="absolute left-4 right-20 bg-primary hover:bg-primary/90"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
          size="lg"
        >
          {listing.saleType === "auction" 
            ? (language === "ar" ? "مزايدة الآن" : "ئێستا مزایەدە بکە")
            : (language === "ar" ? "شراء الآن" : "ئێستا بکڕە")
          }
        </Button>
      </Link>
    </div>
  );
}

export default function SwipePage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [allListings, setAllListings] = useState<Listing[]>([]);

  const { data, isLoading, isFetching } = useQuery<ListingsResponse>({
    queryKey: ["/api/listings", { page, limit: 10 }],
    queryFn: async () => {
      const res = await fetch(`/api/listings?page=${page}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
  });

  const { data: favorites = [] } = useQuery<string[]>({
    queryKey: ["/api/account/favorites"],
    queryFn: async () => {
      const res = await fetch("/api/account/favorites", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((f: { listingId: string }) => f.listingId);
    },
    enabled: !!user,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ listingId, isFavorited }: { listingId: string; isFavorited: boolean }) => {
      const res = await fetch(`/api/listings/${listingId}/favorite`, {
        method: isFavorited ? "DELETE" : "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/favorites"] });
    },
  });

  useEffect(() => {
    if (data?.listings) {
      setAllListings(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const newListings = data.listings.filter(l => !existingIds.has(l.id));
        return [...prev, ...newListings];
      });
    }
  }, [data]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      hapticLight();
    }

    if (newIndex >= allListings.length - 3 && data?.pagination.hasMore && !isFetching) {
      setPage(prev => prev + 1);
    }
  }, [currentIndex, allListings.length, data?.pagination.hasMore, isFetching]);

  const scrollToIndex = (index: number) => {
    const container = containerRef.current;
    if (!container || index < 0 || index >= allListings.length) return;
    
    container.scrollTo({
      top: index * container.clientHeight,
      behavior: "smooth"
    });
  };

  if (isLoading && allListings.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-60px)] bg-black">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </Layout>
    );
  }

  if (allListings.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center" dir="rtl">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">
            {language === "ar" ? "لا توجد منتجات" : "هیچ بەرهەمێک نییە"}
          </h1>
          <p className="text-muted-foreground mb-4">
            {language === "ar" 
              ? "لم يتم العثور على منتجات للعرض"
              : "هیچ بەرهەمێک نەدۆزرایەوە بۆ پیشاندان"
            }
          </p>
          <Link href="/search">
            <Button>
              {language === "ar" ? "البحث عن منتجات" : "گەڕان بۆ بەرهەم"}
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div 
        ref={containerRef}
        className="h-[calc(100vh-60px)] overflow-y-scroll snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{ scrollSnapType: "y mandatory" }}
      >
        {allListings.map((listing, index) => (
          <div 
            key={listing.id}
            className="h-[calc(100vh-60px)] snap-start snap-always"
            style={{ scrollSnapAlign: "start" }}
          >
            <SwipeCard 
              listing={listing}
              isActive={index === currentIndex}
              onFavorite={() => {
                if (!user) return;
                toggleFavoriteMutation.mutate({
                  listingId: listing.id,
                  isFavorited: favorites.includes(listing.id)
                });
              }}
              isFavorited={favorites.includes(listing.id)}
              language={language}
            />
          </div>
        ))}

        {isFetching && (
          <div className="h-[calc(100vh-60px)] flex items-center justify-center bg-black snap-start">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
        <button 
          onClick={() => scrollToIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center disabled:opacity-30"
        >
          <ChevronUp className="h-6 w-6 text-white" />
        </button>
        <button 
          onClick={() => scrollToIndex(currentIndex + 1)}
          disabled={currentIndex >= allListings.length - 1}
          className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center disabled:opacity-30"
        >
          <ChevronDown className="h-6 w-6 text-white" />
        </button>
      </div>

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 rounded-full text-white text-sm z-10">
        {currentIndex + 1} / {allListings.length}
      </div>
    </Layout>
  );
}
