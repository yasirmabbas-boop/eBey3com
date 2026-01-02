import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Gavel, TrendingUp, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBidWebSocket } from "@/hooks/use-bid-websocket";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type BidUpdateEvent = {
  currentBid: number;
  totalBids: number;
  bidderName: string;
  bidderId: string;
  auctionEndTime?: string;
};

interface BiddingWindowProps {
  listingId: string;
  userId?: string;
  currentBid: number;
  totalBids: number;
  minimumBid: number;
  timeLeft?: string;
  auctionEndTime?: string | null;
  onBidSuccess?: (bidAmount: number) => void;
  onRequireAuth?: () => boolean;
  isWinning?: boolean;
  isAuthLoading?: boolean;
}

const BID_INCREMENT = 1000;
const MAX_BID_LIMIT = 1000000000;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-IQ').format(amount) + ' د.ع';
}

function sanitizeBidInput(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function parseBidAmount(value: string): number {
  const sanitized = sanitizeBidInput(value);
  const parsed = parseInt(sanitized, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function useBidMutation(
  listingId: string,
  userId: string | undefined,
  onSuccess: (amount: number) => void,
  onError: (error: Error) => void
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (amount: number) => {
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
          userId: userId || "guest",
          amount,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit bid");
      }
      return res.json();
    },
    onSuccess: (_, amount) => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings", listingId] });
      onSuccess(amount);
    },
    onError,
  });
}

export function BiddingWindow({
  listingId,
  userId,
  currentBid: initialCurrentBid,
  totalBids: initialTotalBids,
  minimumBid: initialMinimumBid,
  timeLeft,
  onBidSuccess,
  onRequireAuth,
  isWinning = false,
  isAuthLoading = false,
}: BiddingWindowProps) {
  const [currentBid, setCurrentBid] = useState(initialCurrentBid);
  const [totalBids, setTotalBids] = useState(initialTotalBids);
  const [bidAmount, setBidAmount] = useState("");
  const [lastBidder, setLastBidder] = useState<string | null>(null);
  const [priceHighlight, setPriceHighlight] = useState(false);
  const isTypingRef = useRef(false);
  const { toast } = useToast();

  const minimumBid = useMemo(() => {
    return Math.max(initialMinimumBid, currentBid + BID_INCREMENT);
  }, [initialMinimumBid, currentBid]);

  const suggestedBid = useMemo(() => currentBid + 5000, [currentBid]);

  useEffect(() => {
    if (!isTypingRef.current) {
      setCurrentBid(initialCurrentBid);
      setTotalBids(initialTotalBids);
    }
  }, [initialCurrentBid, initialTotalBids]);

  useEffect(() => {
    if (!isTypingRef.current && !bidAmount) {
      setBidAmount(suggestedBid.toString());
    }
  }, [suggestedBid, bidAmount]);

  const handleBidSuccess = useCallback((amount: number) => {
    toast({
      title: "تم تقديم سومتك بنجاح! ✅",
      description: `سومتك: ${formatCurrency(amount)}`,
    });
    onBidSuccess?.(amount);
    setBidAmount("");
    isTypingRef.current = false;
  }, [toast, onBidSuccess]);

  const handleBidError = useCallback((error: Error) => {
    toast({
      title: "فشل في تقديم المزايدة",
      description: error.message,
      variant: "destructive",
    });
  }, [toast]);

  const bidMutation = useBidMutation(listingId, userId, handleBidSuccess, handleBidError);

  const handleBidUpdate = useCallback((update: BidUpdateEvent) => {
    setCurrentBid(update.currentBid);
    setTotalBids(update.totalBids);
    setLastBidder(update.bidderName);
    
    setPriceHighlight(true);
    setTimeout(() => setPriceHighlight(false), 1500);
    
    if (!isTypingRef.current) {
      setBidAmount((update.currentBid + 5000).toString());
    }
    
    toast({
      title: "مزايدة جديدة! 🔔",
      description: `تم رفع السعر إلى ${formatCurrency(update.currentBid)}`,
    });
  }, [toast]);

  const { isConnected } = useBidWebSocket({
    listingId,
    onBidUpdate: handleBidUpdate,
  });

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true;
    const sanitized = sanitizeBidInput(e.target.value);
    setBidAmount(sanitized);
  }, []);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      isTypingRef.current = false;
    }, 500);
  }, []);

  const validateBid = useCallback((amount: number): { valid: boolean; error?: string } => {
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, error: "يرجى إدخال مبلغ صحيح" };
    }
    if (amount < minimumBid) {
      return { valid: false, error: `يجب أن تكون المزايدة على الأقل ${formatCurrency(minimumBid)}` };
    }
    if (amount > MAX_BID_LIMIT) {
      return { valid: false, error: `المبلغ المدخل كبير جداً. الحد الأقصى هو ${formatCurrency(MAX_BID_LIMIT)}` };
    }
    return { valid: true };
  }, [minimumBid]);

  const handleSubmitBid = useCallback(() => {
    if (bidMutation.isPending) return;
    
    if (onRequireAuth && !onRequireAuth()) {
      return;
    }

    const bid = parseBidAmount(bidAmount);
    const validation = validateBid(bid);

    if (!validation.valid) {
      toast({
        title: "مزايدة غير صحيحة",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    bidMutation.mutate(bid);
  }, [bidAmount, bidMutation, onRequireAuth, toast, validateBid]);

  const handleQuickBid = useCallback((amount: number) => {
    isTypingRef.current = false;
    setBidAmount(amount.toString());
  }, []);

  const isSubmitDisabled = bidMutation.isPending || isWinning || isAuthLoading;
  const currentBidValue = parseBidAmount(bidAmount);
  const isValidBid = currentBidValue >= minimumBid && currentBidValue <= MAX_BID_LIMIT;

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gavel className="h-6 w-6 text-primary" />
          نافذة المزاد
        </h3>
        <div className="flex items-center gap-1 text-xs">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-green-600">مباشر</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400">غير متصل</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div 
          className={`bg-white p-4 rounded-lg border transition-all duration-300 ${
            priceHighlight 
              ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300' 
              : 'border-blue-100'
          }`}
        >
          <p className="text-sm text-muted-foreground mb-1">السعر الحالي</p>
          <p className={`text-2xl font-bold text-primary transition-all duration-300 ${
            priceHighlight ? 'scale-105' : ''
          }`}>
            {formatCurrency(currentBid).replace(' د.ع', '')}
            <span className="text-xs ml-1">د.ع</span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-blue-100">
          <p className="text-sm text-muted-foreground mb-1">عدد المزايدات</p>
          <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
            <TrendingUp className="h-5 w-5" />
            {totalBids}
          </p>
        </div>
      </div>

      {timeLeft && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-6 text-sm text-red-700 font-medium">
          ⏰ ينتهي المزاد خلال: <strong>{timeLeft}</strong>
        </div>
      )}

      {isWinning && (
        <div className="bg-green-50 border border-green-300 p-3 rounded-lg mb-6 text-sm text-green-700 font-medium text-center">
          ✅ أنت صاحب أعلى مزايدة حالياً - لا يمكنك المزايدة على نفسك
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            أدخل سومتك:
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              value={bidAmount}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder="0"
              className={`text-lg font-bold ${
                bidAmount && !isValidBid ? 'border-red-300 focus:ring-red-300' : ''
              }`}
              dir="ltr"
              disabled={isSubmitDisabled}
              data-testid="input-bid-amount"
            />
            <span className="flex items-center text-muted-foreground font-semibold">د.ع</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            الحد الأدنى للمزايدة: {formatCurrency(minimumBid)}
          </p>
          {bidAmount && currentBidValue > 0 && currentBidValue < minimumBid && (
            <p className="text-xs text-red-500 mt-1">
              المبلغ أقل من الحد الأدنى المطلوب
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">مزايدات مقترحة:</p>
          <div className="flex gap-2 flex-wrap">
            {[suggestedBid, suggestedBid + 5000, suggestedBid + 10000].map((amount) => {
              const isSelected = bidAmount === amount.toString();
              return (
                <Button
                  key={amount}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickBid(amount)}
                  disabled={isSubmitDisabled}
                  className={`text-xs ${isSelected ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" : "border-blue-200 hover:bg-blue-50"}`}
                  data-testid={`button-quick-bid-${amount}`}
                >
                  {formatCurrency(amount).replace(' د.ع', '')}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <Button
        onClick={handleSubmitBid}
        disabled={isSubmitDisabled || !isValidBid}
        className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-3 text-lg disabled:opacity-50"
        data-testid="button-submit-bid"
      >
        {isAuthLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin ml-2" />
            جاري التحميل...
          </>
        ) : bidMutation.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin ml-2" />
            جاري المعالجة...
          </>
        ) : (
          "خلي سومتك"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground mt-4">
        بوضع مزايدة، فإنك توافق على شراء المنتج إذا فزت بالمزاد.
      </p>
    </Card>
  );
}
