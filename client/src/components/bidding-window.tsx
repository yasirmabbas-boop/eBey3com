import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gavel } from "lucide-react";

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
  timeLeft,
  onBidSuccess,
  isWinning = false,
}: BiddingWindowProps) {
  return (
    <Card className="p-6">
      <CardContent>
        <div className="text-center space-y-4">
          <Gavel className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">نافذة المزاد</h3>
          <p className="text-sm text-muted-foreground">
            السعر الحالي: {currentBid.toLocaleString()} د.ع
          </p>
          <p className="text-sm text-muted-foreground">
            عدد المزايدات: {totalBids}
          </p>
          {timeLeft && (
            <p className="text-sm text-muted-foreground">
              الوقت المتبقي: {timeLeft}
            </p>
          )}
          {isWinning && (
            <p className="text-sm text-green-600 font-semibold">
              أنت صاحب أعلى مزايدة حالياً
            </p>
          )}
          <Button disabled className="w-full">
            المزايدة غير متاحة حالياً
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
