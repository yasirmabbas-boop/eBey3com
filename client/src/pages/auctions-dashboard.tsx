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
  Filter,
  Timer,
  Send,
  TrendingUp,
  Eye,
  Grid,
  LayoutGrid,
  RefreshCw,
} from "lucide-react";
import { ListSkeleton } from "@/components/optimized-image";
import { EmptyState } from "@/components/empty-state";

interface Listing {
  id: string;
  title: string;
  price: number;
  currentBid?: number;
  images?: string[];
  auctionEndDate?: string;
  isActive: boolean;
  highestBidderId?: string;
  saleType: string;
  views?: number;
  bids?: { id: string }[];
}

type SortOption = "ending_soon" | "most_bids" | "price_low" | "price_high";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-IQ').format(amount) + ' د.ع';
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

function AuctionCard({ 
  listing, 
  userId, 
  onQuickBid,
  isSubmitting,
}: { 
  listing: Listing;
  userId?: string;
  onQuickBid: (listingId: string, amount: number) => void;
  isSubmitting: boolean;
}) {
  const [bidAmount, setBidAmount] = useState("");
  const currentBid = listing.currentBid || listing.price;
  const minimumBid = currentBid + 1000;
  const isWinning = listing.highestBidderId === userId;
  const bidCount = listing.bids?.length || 0;

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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`auction-card-${listing.id}`}>
      <Link href={`/product/${listing.id}`}>
        <div className="relative aspect-square">
          <img
            src={listing.images?.[0] || "https://via.placeholder.com/300"}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {isWinning && (
            <Badge className="absolute top-2 right-2 bg-green-500 text-white gap-1">
              <Trophy className="h-3 w-3" />
              أعلى مزايد
            </Badge>
          )}
          {!isWinning && userId && listing.highestBidderId && (
            <Badge className="absolute top-2 right-2 bg-orange-500 text-white gap-1">
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
          {listing.auctionEndDate && (
            <TimeRemaining endDate={listing.auctionEndDate} />
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Gavel className="h-3 w-3" />
            {bidCount} سوم
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {listing.views || 0}
          </span>
        </div>

        <div className="space-y-2 pt-2 border-t">
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

export default function AuctionsDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<SortOption>("ending_soon");
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [pendingBid, setPendingBid] = useState<{ listingId: string; amount: number } | null>(null);
  const [submittingListingId, setSubmittingListingId] = useState<string | null>(null);

  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings", "auctions"],
    queryFn: async () => {
      const res = await fetch("/api/listings?saleType=auction&status=active");
      if (!res.ok) throw new Error("Failed to fetch auctions");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const bidMutation = useMutation({
    mutationFn: async ({ listingId, amount, shippingAddressId }: { listingId: string; amount: number; shippingAddressId: string }) => {
      const authToken = localStorage.getItem("authToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch("/api/bids", {
        method: "POST",
        headers,
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
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
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

  const sortedListings = useMemo(() => {
    if (!listings) return [];

    const now = new Date();
    const activeAuctions = listings.filter(l => {
      if (!l.auctionEndDate) return false;
      return new Date(l.auctionEndDate) > now && l.isActive;
    });

    return [...activeAuctions].sort((a, b) => {
      switch (sortBy) {
        case "ending_soon":
          return new Date(a.auctionEndDate!).getTime() - new Date(b.auctionEndDate!).getTime();
        case "most_bids":
          return (b.bids?.length || 0) - (a.bids?.length || 0);
        case "price_low":
          return (a.currentBid || a.price) - (b.currentBid || b.price);
        case "price_high":
          return (b.currentBid || b.price) - (a.currentBid || a.price);
        default:
          return 0;
      }
    });
  }, [listings, sortBy]);

  const gridClass = useMemo(() => {
    switch (gridCols) {
      case 2: return "grid-cols-1 sm:grid-cols-2";
      case 3: return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      case 4: return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      default: return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    }
  }, [gridCols]);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <Gavel className="h-6 w-6 text-primary" />
                لوحة المزادات
              </h1>
              <p className="text-sm text-gray-500">
                {sortedListings.length} مزاد نشط
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/listings"] })}
            className="gap-1"
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
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

          <div className="flex items-center gap-2 mr-auto">
            <LayoutGrid className="h-4 w-4 text-gray-500" />
            <div className="flex gap-1">
              {[2, 3, 4].map((cols) => (
                <Button
                  key={cols}
                  variant={gridCols === cols ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGridCols(cols as 2 | 3 | 4)}
                  className="w-8 h-8 p-0"
                  data-testid={`grid-${cols}`}
                >
                  {cols}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <ListSkeleton count={6} />
        ) : sortedListings.length === 0 ? (
          <EmptyState
            type="bids"
            title="لا توجد مزادات نشطة"
            description="لا يوجد مزادات حالياً. تحقق لاحقاً!"
          />
        ) : (
          <div className={`grid ${gridClass} gap-4`}>
            {sortedListings.map((listing) => (
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

        {!user && sortedListings.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-blue-800 mb-2">
              سجل دخولك للمزايدة على المنتجات
            </p>
            <Link href="/signin">
              <Button className="gap-2" data-testid="button-signin">
                تسجيل الدخول
              </Button>
            </Link>
          </div>
        )}
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
