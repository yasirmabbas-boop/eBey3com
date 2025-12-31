import { ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SellerTrustBadgeProps {
  salesCount: number;
  rating: number;
  ratingCount?: number;
  sellerName: string;
  showName?: boolean;
}

export function getSellerTier(salesCount: number): {
  tier: "none" | "orange" | "green" | "blue";
  label: string;
  color: string;
  bgColor: string;
} {
  if (salesCount >= 1000) {
    return {
      tier: "blue",
      label: "بائع موثوق",
      color: "text-white",
      bgColor: "bg-blue-600",
    };
  } else if (salesCount >= 100) {
    return {
      tier: "green",
      label: "بائع خبير",
      color: "text-white",
      bgColor: "bg-green-600",
    };
  } else if (salesCount >= 10) {
    return {
      tier: "orange",
      label: "بائع نشط",
      color: "text-white",
      bgColor: "bg-orange-500",
    };
  }
  return {
    tier: "none",
    label: "بائع جديد",
    color: "text-gray-700",
    bgColor: "bg-gray-200",
  };
}

export function SellerTrustBadge({ 
  salesCount, 
  rating, 
  ratingCount = 0,
  sellerName, 
  showName = true 
}: SellerTrustBadgeProps) {
  const tierInfo = getSellerTier(salesCount);

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="seller-trust-badge">
      {showName && (
        <span className="text-primary font-medium" data-testid="seller-name">
          {sellerName}
        </span>
      )}
      
      <Badge 
        className={`${tierInfo.bgColor} ${tierInfo.color} border-0 flex items-center gap-1`}
        data-testid={`badge-tier-${tierInfo.tier}`}
      >
        <ShieldCheck className="h-3 w-3" />
        {tierInfo.label}
      </Badge>

      <div className="flex items-center gap-1 text-sm" data-testid="seller-rating">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <span className="font-medium">{Math.round(rating * 20)}%</span>
        {ratingCount > 0 && (
          <span className="text-xs text-gray-500">({ratingCount} تقييم)</span>
        )}
      </div>
    </div>
  );
}
