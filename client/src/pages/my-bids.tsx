import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  Gavel,
  Clock,
  Loader2,
  Trophy,
  AlertTriangle,
  ExternalLink,
  Timer,
  ChevronLeft,
  Filter,
} from "lucide-react";
import { ListSkeleton } from "@/components/optimized-image";
import { EmptyState } from "@/components/empty-state";

type TimePeriod = "week" | "two_weeks" | "three_months" | "all";

const TIME_PERIODS: { value: TimePeriod; label: string; days: number | null }[] = [
  { value: "week", label: "آخر أسبوع", days: 7 },
  { value: "two_weeks", label: "آخر أسبوعين", days: 14 },
  { value: "three_months", label: "آخر 3 أشهر", days: 90 },
  { value: "all", label: "جميع المزايدات", days: null },
];

interface BidWithListing {
  id: string;
  listingId: string;
  amount: number;
  isWinning: boolean;
  createdAt: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    currentBid?: number;
    images?: string[];
    auctionEndDate?: string;
    isActive: boolean;
    highestBidderId?: string;
    saleType: string;
  };
}

function getBidStatus(bid: BidWithListing, userId?: string): { label: string; variant: "winning" | "outbid" | "ended" | "won" | "lost" } {
  const listing = bid.listing;
  if (!listing) return { label: "غير معروف", variant: "ended" };
  
  const now = new Date();
  const endDate = listing.auctionEndDate ? new Date(listing.auctionEndDate) : null;
  const isEnded = endDate && endDate < now;
  const isHighest = listing.highestBidderId === userId;
  
  if (isEnded) {
    if (isHighest) {
      return { label: "فزت!", variant: "won" };
    } else {
      return { label: "انتهى", variant: "lost" };
    }
  } else {
    if (isHighest) {
      return { label: "أعلى مزايد", variant: "winning" };
    } else {
      return { label: "تم تجاوزك", variant: "outbid" };
    }
  }
}

function getStatusBadge(status: { label: string; variant: "winning" | "outbid" | "ended" | "won" | "lost" }) {
  switch (status.variant) {
    case "winning":
      return (
        <Badge className="bg-green-500 text-white border-0 text-sm px-3 py-1 flex items-center gap-1">
          <Trophy className="h-3 w-3" />
          {status.label}
        </Badge>
      );
    case "won":
      return (
        <Badge className="bg-green-600 text-white border-0 text-sm px-3 py-1 flex items-center gap-1">
          <Trophy className="h-3 w-3" />
          {status.label}
        </Badge>
      );
    case "outbid":
      return (
        <Badge className="bg-orange-500 text-white border-0 text-sm px-3 py-1 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {status.label}
        </Badge>
      );
    case "lost":
      return (
        <Badge className="bg-gray-500 text-white border-0 text-sm px-3 py-1">
          {status.label}
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-500 text-white border-0 text-sm px-3 py-1">
          {status.label}
        </Badge>
      );
  }
}

function TimeRemaining({ endDate }: { endDate: string }) {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) {
    return <span className="text-red-500 font-medium">انتهى</span>;
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return <span className="text-blue-500 font-medium">{days} يوم {hours} ساعة</span>;
  } else if (hours > 0) {
    return <span className="text-orange-500 font-medium">{hours} ساعة {minutes} دقيقة</span>;
  } else {
    return <span className="text-red-500 font-medium">{minutes} دقيقة</span>;
  }
}

export default function MyBids() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  
  const { data: bids, isLoading, error } = useQuery<BidWithListing[]>({
    queryKey: ["/api/account/my-bids"],
    enabled: isAuthenticated,
  });

  const filteredBids = useMemo(() => {
    if (!bids) return [];
    
    const period = TIME_PERIODS.find(p => p.value === timePeriod);
    if (!period || period.days === null) return bids;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period.days);
    
    return bids.filter(bid => new Date(bid.createdAt) >= cutoffDate);
  }, [bids, timePeriod]);

  if (isAuthLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
          </div>
          <ListSkeleton count={4} />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">يرجى تسجيل الدخول</h2>
            <p className="text-muted-foreground mb-4">
              يجب عليك تسجيل الدخول لعرض مزايداتك
            </p>
            <Link href="/signin">
              <Button>تسجيل الدخول</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/my-account">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                العودة
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Gavel className="h-6 w-6 text-primary" />
                مزايداتي
              </h1>
              <p className="text-muted-foreground text-sm">
                جميع المزايدات التي قدمتها على المزادات
              </p>
            </div>
          </div>
          
          {bids && bids.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                <SelectTrigger className="w-[160px]" data-testid="select-time-filter">
                  <SelectValue placeholder="فترة زمنية" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PERIODS.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {timePeriod !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {filteredBids.length} من {bids.length}
                </Badge>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <ListSkeleton count={4} />
        ) : error ? (
          <Card className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground">فشل في تحميل المزايدات</p>
          </Card>
        ) : !bids || bids.length === 0 ? (
          <EmptyState
            type="bids"
            title="لا توجد مزايدات"
            description="لم تقم بتقديم أي مزايدات بعد. تصفح المزادات المتاحة وابدأ المزايدة على المنتجات التي تعجبك!"
            actionLabel="تصفح المزادات"
            actionHref="/search?saleType=auction"
          />
        ) : filteredBids.length === 0 ? (
          <EmptyState
            type="bids"
            title="لا توجد مزايدات في هذه الفترة"
            description="لم تقم بتقديم مزايدات خلال الفترة المحددة. جرب اختيار فترة زمنية أطول."
            actionLabel="عرض جميع المزايدات"
            onAction={() => setTimePeriod("all")}
          />
        ) : (
          <div className="space-y-4">
            {filteredBids.map((bid) => {
              const status = getBidStatus(bid, user?.id);
              const listing = bid.listing;
              const image = listing?.images?.[0] || "/placeholder.svg";
              
              return (
                <Card key={bid.id} className="p-4" data-testid={`card-bid-${bid.id}`}>
                  <div className="flex gap-4">
                    <Link href={`/product/${bid.listingId}`}>
                      <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer">
                        <img
                          src={image}
                          alt={listing?.title || "منتج"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Link href={`/product/${bid.listingId}`}>
                          <h3 className="font-bold text-lg hover:text-primary cursor-pointer line-clamp-1">
                            {listing?.title || "منتج غير معروف"}
                          </h3>
                        </Link>
                        {getStatusBadge(status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">مزايدتك:</span>{" "}
                          <span className="font-bold text-primary">
                            {bid.amount.toLocaleString()} د.ع
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">أعلى مزايدة:</span>{" "}
                          <span className="font-bold">
                            {(listing?.currentBid || bid.amount).toLocaleString()} د.ع
                          </span>
                        </div>
                      </div>
                      
                      {listing?.auctionEndDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Timer className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">ينتهي في:</span>
                          <TimeRemaining endDate={listing.auctionEndDate} />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(bid.createdAt).toLocaleDateString("ar-IQ")}
                        </span>
                        
                        <Link href={`/product/${bid.listingId}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <ExternalLink className="h-3 w-3" />
                            عرض المزاد
                          </Button>
                        </Link>
                        
                        {status.variant === "outbid" && (
                          <Link href={`/product/${bid.listingId}`}>
                            <Button size="sm" className="gap-1">
                              <Gavel className="h-3 w-3" />
                              زيادة المزايدة
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
