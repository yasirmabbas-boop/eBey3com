import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Gavel, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BiddingWindowProps {
  currentBid: number;
  totalBids: number;
  minimumBid: number;
  timeLeft?: string;
  onBidSubmit?: (bidAmount: number) => void;
}

export function BiddingWindow({
  currentBid,
  totalBids,
  minimumBid,
  timeLeft,
  onBidSubmit,
}: BiddingWindowProps) {
  const [bidAmount, setBidAmount] = useState(minimumBid.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const suggestedBid = currentBid + 5000;

  const handleSubmitBid = () => {
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
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Gavel className="h-6 w-6 text-primary" />
        نافذة المزاد
      </h3>

      {/* Current Bid Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-blue-100">
          <p className="text-sm text-muted-foreground mb-1">السعر الحالي</p>
          <p className="text-2xl font-bold text-primary">
            {currentBid.toLocaleString()}
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
      >
        {isSubmitting ? "جاري المعالجة..." : "خلي سومتك"}
      </Button>

      <p className="text-center text-xs text-muted-foreground mt-4">
        بوضع مزايدة، فإنك توافق على شراء المنتج إذا فزت بالمزاد.
      </p>
    </Card>
  );
}
