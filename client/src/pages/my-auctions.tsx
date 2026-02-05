import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AddressSelectionModal } from "@/components/address-selection-modal";
import {
  Gavel,
  Clock,
  Loader2,
  Trophy,
  AlertTriangle,
  ChevronLeft,
  Timer,
  Send,
  Eye,
  Heart,
  RefreshCw,
  Star,
} from "lucide-react";
import { ListSkeleton } from "@/components/optimized-image";
import { EmptyState } from "@/components/empty-state";
import type { Listing } from "@shared/schema";

type SortOption = "ending_soon" | "most_bids" | "price_low" | "price_high";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-IQ').format(amount) + ' د.ع';
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const authToken = localStorage.getItem("authToken");
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

function TimeRemaining({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const end = new Date(endDate);
      const now = new Date();
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("انتهى");
        setIsUrgent(false);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsUrgent(hours < 1);

      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days} يوم`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}س ${minutes}د`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}د ${seconds}ث`);
      } else {
        setTimeLeft(`${seconds}ث`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${isUrgent ? "text-red-600 animate-pulse" : "text-orange-600"}`}>
      <Timer className="h-4 w-4" />
      <span>{timeLeft}</span>
    </div>
  );
}

type AuctionListing = Listing & {
  auctionEndTime?: string;
};

function AuctionCard({ 
  listing, 
  userId, 
  onQuickBid,
  isSubmitting,
}: { 
  listing: AuctionListing;
  userId?: string;
  onQuickBid: (listingId: string, amount: number) => void;
  isSubmitting: boolean;
}) {
  const [bidAmount, setBidAmount] = useState("");
  const currentBid = listing.currentBid || listing.price;
  const minimumBid = currentBid + 1000;
  const isWinning = listing.highestBidderId === userId;
  const bidCount = listing.totalBids || 0;
  const auctionEnd = listing.auctionEndTime || (listing as any).auctionEndDate;

  useEffect(() => {
    setBidAmount((currentBid + 5000).toString());
  }, [currentBid]);

  const handleSubmit = () => {
    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount) || amount < minimumBid) {
      return;
    }
    onQuickBid(listing.id, amount);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <Card className="overflow-hidden soft-border hover-elevate transition-shadow" data-testid={`watched-auction-card-${listing.id}`}>
      <Link href={`/product/${listing.id}`}>
        <div className="relative aspect-square">
          <img
            src={listing.images?.[0] || "https://via.placeholder.com/300"}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <Badge className="absolute top-2 left-2 bg-pink-500 text-white gap-1">
            <Heart className="h-3 w-3 fill-white" />
            مراقب
          </Badge>
          {isWinning && (
            <Badge className="absolute top-2 right-2 bg-emerald-500 text-white gap-1">
              <Trophy className="h-3 w-3" />
              أعلى مزايد
            </Badge>
          )}
          {!isWinning && userId && listing.highestBidderId && (
            <Badge className="absolute top-2 right-2 bg-amber-500 text-white gap-1">
              <AlertTriangle className="h-3 w-3" />
              تم تجاوزك
            </Badge>
          )}
        </div>
      </Link>

      <div className="p-3 space-y-3">
        <Link href={`/product/${listing.id}`}>
          <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors">
            {listing.title}
          </h3>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">السوم الحالي</p>
            <p className="font-bold text-lg text-green-600">
              {formatCurrency(currentBid)}
            </p>
          </div>
          {auctionEnd && (
            <TimeRemaining endDate={auctionEnd} />
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Gavel className="h-3 w-3" />
            {bidCount} سوم
          </span>
          {/* Views - Hidden */}
          {/* <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {listing.views || 0}
          </span> */}
        </div>

        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={handleKeyDown}
              placeholder={`الحد الأدنى ${formatCurrency(minimumBid)}`}
              className="flex-1 text-sm"
              data-testid={`bid-input-${listing.id}`}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || parseInt(bidAmount, 10) < minimumBid}
              className="bg-primary hover:bg-primary/90 gap-1"
              data-testid={`bid-submit-${listing.id}`}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  سوم
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            الحد الأدنى: {formatCurrency(minimumBid)}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function MyAuctions() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<SortOption>("ending_soon");
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [pendingBid, setPendingBid] = useState<{ listingId: string; amount: number } | null>(null);
  const [submittingListingId, setSubmittingListingId] = useState<string | null>(null);

  const { data: watchlistListings = [], isLoading: watchlistLoading } = useQuery<AuctionListing[]>({
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
    refetchInterval: 30000,
  });

  const watchedAuctions = useMemo(() => {
    if (!watchlistListings.length) return [];

    const now = new Date();
    return watchlistListings.filter(listing => {
      if (listing.saleType !== "auction") return false;

      const endTime = listing.auctionEndTime || (listing as any).auctionEndDate;
      if (!endTime) return false;
      if (new Date(endTime) <= now) return false;
      if (!listing.isActive) return false;

      return true;
    });
  }, [watchlistListings]);

  const sortedAuctions = useMemo(() => {
    return [...watchedAuctions].sort((a, b) => {
      const aEnd = a.auctionEndTime || (a as any).auctionEndDate;
      const bEnd = b.auctionEndTime || (b as any).auctionEndDate;
      switch (sortBy) {
        case "ending_soon":
          return new Date(aEnd!).getTime() - new Date(bEnd!).getTime();
        case "most_bids":
          return (b.totalBids || 0) - (a.totalBids || 0);
        case "price_low":
          return (a.currentBid || a.price) - (b.currentBid || b.price);
        case "price_high":
          return (b.currentBid || b.price) - (a.currentBid || a.price);
        default:
          return 0;
      }
    });
  }, [watchedAuctions, sortBy]);

  const bidMutation = useMutation({
    mutationFn: async ({ listingId, amount, shippingAddressId }: { listingId: string; amount: number; shippingAddressId: string }) => {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          listingId,
          userId: user?.id || "guest",
          amount,
          shippingAddressId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit bid");
      }
      return res.json();
    },
    onSuccess: (_, { amount }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist/listings"] });
      toast({
        title: "تم تقديم سومتك بنجاح! ✅",
        description: `سومتك: ${formatCurrency(amount)}`,
      });
      setPendingBid(null);
      setSubmittingListingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "فشل في تقديم السوم",
        description: error.message,
        variant: "destructive",
      });
      setSubmittingListingId(null);
    },
  });

  const handleQuickBid = useCallback((listingId: string, amount: number) => {
    if (!user) {
      toast({
        title: "يرجى تسجيل الدخول",
        description: "يجب تسجيل الدخول للمزايدة",
        variant: "destructive",
      });
      return;
    }

    setPendingBid({ listingId, amount });
    setSubmittingListingId(listingId);
    setShowAddressModal(true);
  }, [user, toast]);

  const handleAddressSelected = useCallback((addressId: string) => {
    if (pendingBid) {
      bidMutation.mutate({
        listingId: pendingBid.listingId,
        amount: pendingBid.amount,
        shippingAddressId: addressId,
      });
    }
    setShowAddressModal(false);
  }, [pendingBid, bidMutation]);

  const handleAddressModalClose = useCallback(() => {
    setShowAddressModal(false);
    setPendingBid(null);
    setSubmittingListingId(null);
  }, []);

  const isLoading = authLoading || watchlistLoading;

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <Star className="h-16 w-16 mx-auto text-amber-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2">مزاداتي المراقبة</h1>
          <p className="text-gray-500 mb-6">يجب تسجيل الدخول لعرض المزادات التي تراقبها</p>
          <Link href="/signin">
            <Button data-testid="button-signin">تسجيل الدخول</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-400" />
                مزاداتي المراقبة
              </h1>
              <p className="text-sm text-gray-500">
                {sortedAuctions.length} مزاد نشط من المفضلة
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/watchlist/listings"] })}
            className="gap-1"
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        </div>

        {sortedAuctions.length > 0 && (
          <div className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg soft-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-40" data-testid="select-sort">
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ending_soon">ينتهي قريباً</SelectItem>
                  <SelectItem value="most_bids">الأكثر مزايدة</SelectItem>
                  <SelectItem value="price_low">السعر: الأقل</SelectItem>
                  <SelectItem value="price_high">السعر: الأعلى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isLoading ? (
          <ListSkeleton count={6} />
        ) : sortedAuctions.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold mb-2">لا توجد مزادات مراقبة</h2>
            <p className="text-gray-500 mb-6">
              أضف مزادات إلى المفضلة لمراقبتها والمزايدة عليها بسهولة
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/auctions">
                <Button variant="outline" className="gap-2" data-testid="button-browse-auctions">
                  <Gavel className="h-4 w-4" />
                  تصفح المزادات
                </Button>
              </Link>
              <Link href="/">
                <Button className="gap-2" data-testid="button-home">
                  تصفح المنتجات
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedAuctions.map((listing) => (
              <AuctionCard
                key={listing.id}
                listing={listing}
                userId={user?.id}
                onQuickBid={handleQuickBid}
                isSubmitting={submittingListingId === listing.id}
              />
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-amber-50/70 rounded-lg soft-border">
          <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <Star className="h-5 w-5" />
            كيف تضيف مزادات للمراقبة؟
          </h3>
          <p className="text-sm text-amber-700">
            اضغط على أيقونة القلب ❤️ في أي منتج لإضافته إلى قائمة المفضلة. 
            ستظهر المزادات النشطة هنا تلقائياً.
          </p>
        </div>
      </div>

      <AddressSelectionModal
        open={showAddressModal}
        onOpenChange={(open) => {
          if (!open) handleAddressModalClose();
        }}
        onSelect={handleAddressSelected}
      />
    </Layout>
  );
}
