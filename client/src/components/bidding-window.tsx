import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Gavel, TrendingUp, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBidWebSocket } from "@/hooks/use-bid-websocket";

interface BiddingWindowProps {
  listingId: string;
  currentBid: number;
  totalBids: number;
  minimumBid: number;
  timeLeft?: string;
  onBidSubmit?: (bidAmount: number) => void;
  onRequireAuth?: () => boolean;
}

export function BiddingWindow({
  listingId,
  currentBid: initialCurrentBid,
  totalBids: initialTotalBids,
  minimumBid: initialMinimumBid,
  timeLeft,
  onBidSubmit,
  onRequireAuth,
}: BiddingWindowProps) {
  const [currentBid, setCurrentBid] = useState(initialCurrentBid);
  const [totalBids, setTotalBids] = useState(initialTotalBids);
  const [minimumBid, setMinimumBid] = useState(initialMinimumBid);
  const [bidAmount, setBidAmount] = useState(initialMinimumBid.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastBidder, setLastBidder] = useState<string | null>(null);
  const { toast } = useToast();

  const { isConnected } = useBidWebSocket({
    listingId,
    onBidUpdate: (update) => {
      setCurrentBid(update.currentBid);
      setTotalBids(update.totalBids);
      setMinimumBid(update.currentBid + 1000);
      setLastBidder(update.bidderName);
      setBidAmount((update.currentBid + 5000).toString());
      
      toast({
        title: "مزايدة جديدة! 🔔",
        description: `${update.bidderName} زاد السعر إلى ${update.currentBid.toLocaleString()} د.ع`,
      });
    },
  });

  useEffect(() => {
    setCurrentBid(initialCurrentBid);
    setTotalBids(initialTotalBids);
    setMinimumBid(initialMinimumBid);
  }, [initialCurrentBid, initialTotalBids, initialMinimumBid]);

  const suggestedBid = currentBid + 5000;

  const handleSubmitBid = () => {
    if (onRequireAuth && !onRequireAuth()) {
      return;
    }

    const bid = parseInt(bidAmount);

    if (isNaN(bid) || bid < minimumBid) {
      toast({
        title: "مزايدة غير صحيحة",
        description: `يجب أن تكون المزايدة على الأقل ${minimumBid.toLocaleString()} د.ع`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "تم تقديم سومتك بنجاح! ✅",
        description: `سومتك: ${bid.toLocaleString()} د.ع`,
      });
      onBidSubmit?.(bid);
    }, 500);
  };

  const handleQuickBid = (amount: number) => {
    setBidAmount(amount.toString());
  };

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

      {/* Current Bid Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-blue-100 relative overflow-hidden">
          <p className="text-sm text-muted-foreground mb-1">السعر الحالي</p>
          <p className="text-2xl font-bold text-primary animate-pulse">
            {currentBid.toLocaleString()}
            <span className="text-xs ml-1">د.ع</span>
          </p>
          {lastBidder && (
            <p className="text-xs text-muted-foreground mt-1">
              آخر مزايد: {lastBidder}
            </p>
          )}
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

      {/* Bid Input */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            أدخل سومتك:
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="0"
              className="text-lg font-bold"
              dir="ltr"
              data-testid="input-bid-amount"
            />
            <span className="flex items-center text-muted-foreground font-semibold">د.ع</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            الحد الأدنى للمزايدة: {minimumBid.toLocaleString()} د.ع
          </p>
        </div>

        {/* Quick Bid Suggestions */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">مزايدات مقترحة:</p>
          <div className="flex gap-2 flex-wrap">
            {[suggestedBid, suggestedBid + 5000, suggestedBid + 10000].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => handleQuickBid(amount)}
                className="text-xs border-blue-200 hover:bg-blue-50"
                data-testid={`button-quick-bid-${amount}`}
              >
                {amount.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmitBid}
        disabled={isSubmitting}
        className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-3 text-lg"
        data-testid="button-submit-bid"
      >
        {isSubmitting ? "جاري المعالجة..." : "خلي سومتك"}
      </Button>

      <p className="text-center text-xs text-muted-foreground mt-4">
        بوضع مزايدة، فإنك توافق على شراء المنتج إذا فزت بالمزاد.
      </p>
    </Card>
  );
}
