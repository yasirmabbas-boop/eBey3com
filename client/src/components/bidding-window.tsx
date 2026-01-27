import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gavel, Plus, Minus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";

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
  onRequirePhoneVerification?: () => void;
  isWinning?: boolean;
  isAuthLoading?: boolean;
  phoneVerified?: boolean;
  allowedBidderType?: string;
}

export function BiddingWindow({
  listingId,
  userId,
  currentBid,
  totalBids,
  minimumBid,
  onBidSuccess,
  onRequireAuth,
  onRequirePhoneVerification,
  isWinning = false,
  isAuthLoading = false,
  phoneVerified = false,
}: BiddingWindowProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const minBidAmount = currentBid + 1000;
  const [bidAmount, setBidAmount] = useState(minBidAmount);

  const incrementOptions = [1000, 5000, 10000, 25000];

  const handleIncrement = (amount: number) => {
    setBidAmount(prev => prev + amount);
  };

  const handleDecrement = (amount: number) => {
    setBidAmount(prev => Math.max(minBidAmount, prev - amount));
  };

  const handlePlaceBid = async () => {
    if (!userId) {
      if (onRequireAuth && !onRequireAuth()) {
        return;
      }
      return;
    }

    if (!phoneVerified) {
      if (onRequirePhoneVerification) {
        onRequirePhoneVerification();
      }
      return;
    }

    if (bidAmount < minBidAmount) {
      toast({
        title: language === "ar" ? "مبلغ غير كافٍ" : "بڕی پارە بەس نییە",
        description: language === "ar" 
          ? `الحد الأدنى للمزايدة هو ${minBidAmount.toLocaleString()} د.ع`
          : `کەمترین مزایدە ${minBidAmount.toLocaleString()} د.ع`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", `/api/listings/${listingId}/bid`, {
        amount: bidAmount,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "فشل في تقديم المزايدة");
      }

      toast({
        title: language === "ar" ? "تم تقديم المزايدة بنجاح! 🎉" : "مزایدە سەرکەوتوو بوو! 🎉",
        description: language === "ar"
          ? `مزايدتك: ${bidAmount.toLocaleString()} د.ع`
          : `مزایدەکەت: ${bidAmount.toLocaleString()} د.ع`,
      });

      if (data.extended) {
        toast({
          title: language === "ar" ? "تم تمديد المزاد! ⏰" : "مزایدە درێژکرایەوە! ⏰",
          description: language === "ar" 
            ? "تم إضافة دقيقتين للمزاد"
            : "٢ خولەک زیادکرا بۆ مزایدە",
        });
      }

      if (onBidSuccess) {
        onBidSuccess(bidAmount);
      }

      setBidAmount(bidAmount + 1000);
    } catch (error: any) {
      toast({
        title: language === "ar" ? "فشل في المزايدة" : "مزایدە سەرکەوتوو نەبوو",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <Card className="p-6">
        <CardContent className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
          <Gavel className="h-5 w-5" />
          <h3 className="font-bold">
            {language === "ar" ? "قدّم مزايدتك" : "مزایدەکەت پێشکەش بکە"}
          </h3>
        </div>

        {isWinning && (
          <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-2 rounded-lg text-sm text-center font-semibold">
            {language === "ar" ? "أنت صاحب أعلى مزايدة حالياً! 🏆" : "تۆ بەرزترین مزایدەکاریت! 🏆"}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {language === "ar" ? "السعر الحالي:" : "نرخی ئێستا:"}
            </span>
            <span className="font-bold text-lg text-purple-700 dark:text-purple-300">
              {currentBid.toLocaleString()} {language === "ar" ? "د.ع" : "د.ع"}
            </span>
          </div>

          <div className="relative">
            <Input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(Math.max(minBidAmount, parseInt(e.target.value) || minBidAmount))}
              className="text-center text-lg font-bold pr-16 pl-16 h-14 border-purple-300 dark:border-purple-700"
              min={minBidAmount}
              step={1000}
              data-testid="input-bid-amount"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
              onClick={() => handleIncrement(1000)}
              data-testid="button-bid-increment"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-10 w-10"
              onClick={() => handleDecrement(1000)}
              disabled={bidAmount <= minBidAmount}
              data-testid="button-bid-decrement"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {incrementOptions.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className="text-xs border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                onClick={() => handleIncrement(amount)}
                data-testid={`button-bid-add-${amount}`}
              >
                +{(amount / 1000)}K
              </Button>
            ))}
          </div>

          <p className="text-xs text-gray-500 text-center">
            {language === "ar" 
              ? `الحد الأدنى: ${minBidAmount.toLocaleString()} د.ع`
              : `کەمترین: ${minBidAmount.toLocaleString()} د.ع`}
          </p>

          <Button
            className="w-full h-12 text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            onClick={handlePlaceBid}
            disabled={isSubmitting || bidAmount < minBidAmount}
            data-testid="button-place-bid"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin ml-2" />
                {language === "ar" ? "جارٍ المزايدة..." : "مزایدەکردن..."}
              </>
            ) : (
              <>
                <Gavel className="h-5 w-5 ml-2" />
                {language === "ar" ? "زايد الآن" : "ئێستا مزایدە بکە"}
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          {totalBids > 0 
            ? (language === "ar" ? `${totalBids} مزايدة حتى الآن` : `${totalBids} مزایدە هەتا ئێستا`)
            : (language === "ar" ? "كن أول المزايدين!" : "یەکەم مزایدەکار بە!")}
        </p>
      </CardContent>
    </Card>
  );
}
