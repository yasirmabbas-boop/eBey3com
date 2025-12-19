import { ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SellerTrustBadgeProps {
  salesCount: number;
  rating: number;
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
  sellerName, 
  showName = true 
}: SellerTrustBadgeProps) {
  const tierInfo = getSellerTier(salesCount);
  const hasGoldenStar = rating >= 95;

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

      {hasGoldenStar && (
        <Badge 
          className="bg-yellow-500 text-white border-0 flex items-center gap-1"
          data-testid="badge-golden-star"
          title="تقييم ممتاز - 95%+"
        >
          <Star className="h-3 w-3 fill-current" />
          تقييم ممتاز
        </Badge>
      )}

      <span className="text-xs text-gray-500" data-testid="seller-sales-count">
        ({salesCount} مبيعة)
      </span>
    </div>
  );
}
