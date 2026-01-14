import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarRating({ 
  value, 
  onChange, 
  readonly = false, 
  size = "md",
  className 
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const handleClick = (star: number) => {
    if (!readonly && onChange) {
      onChange(star);
    }
  };

  const handleMouseEnter = (star: number) => {
    if (!readonly) {
      setHoverValue(star);
    }
  };

  const handleMouseLeave = () => {
    setHoverValue(0);
  };

  const displayValue = hoverValue || value;

  return (
    <div 
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          disabled={readonly}
          className={cn(
            "transition-colors",
            !readonly && "cursor-pointer hover:scale-110",
            readonly && "cursor-default"
          )}
          data-testid={`star-${star}`}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              star <= displayValue
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

type TierLevel = "standard" | "premium" | "elite";

function getTierLevel(totalTransactions: number, rating: number): TierLevel {
  if (totalTransactions >= 500 && rating >= 4) {
    return "elite";
  }
  if (totalTransactions >= 100) {
    return "premium";
  }
  return "standard";
}

function getTierColors(tier: TierLevel): { filled: string; empty: string } {
  switch (tier) {
    case "elite":
      return { filled: "fill-fuchsia-500 text-fuchsia-500", empty: "fill-fuchsia-200 text-fuchsia-200" };
    case "premium":
      return { filled: "fill-blue-600 text-blue-600", empty: "fill-blue-200 text-blue-200" };
    case "standard":
    default:
      return { filled: "fill-amber-400 text-amber-400", empty: "fill-amber-200 text-amber-200" };
  }
}

interface TieredStarRatingProps {
  rating: number;
  ratingCount?: number;
  totalTransactions?: number;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const tieredSizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function TieredStarRating({
  rating,
  ratingCount = 0,
  totalTransactions = 0,
  showCount = true,
  size = "md",
  className,
}: TieredStarRatingProps) {
  const tier = getTierLevel(totalTransactions, rating);
  const colors = getTierColors(tier);
  const starSize = tieredSizeClasses[size];

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-1", className)} dir="ltr">
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className={cn(starSize, colors.filled)} />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star className={cn(starSize, colors.empty)} />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className={cn(starSize, colors.filled)} />
            </div>
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className={cn(starSize, colors.empty)} />
        ))}
      </div>
      {showCount && ratingCount > 0 && (
        <span className="text-xs text-muted-foreground">({ratingCount})</span>
      )}
    </div>
  );
}

export function SellerTierRating({
  rating,
  ratingCount,
  totalSales,
  showCount = true,
  size = "md",
  className,
}: {
  rating: number;
  ratingCount: number;
  totalSales: number;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <TieredStarRating
      rating={rating}
      ratingCount={ratingCount}
      totalTransactions={totalSales}
      showCount={showCount}
      size={size}
      className={className}
    />
  );
}

export function BuyerTierRating({
  rating,
  ratingCount,
  totalPurchases,
  showCount = true,
  size = "md",
  className,
}: {
  rating: number;
  ratingCount: number;
  totalPurchases: number;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <TieredStarRating
      rating={rating}
      ratingCount={ratingCount}
      totalTransactions={totalPurchases}
      showCount={showCount}
      size={size}
      className={className}
    />
  );
}

export function RatingDisplay({ 
  rating, 
  count,
  size = "sm",
  showCount = true,
  className 
}: { 
  rating: number; 
  count?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}) {
  const percentage = Math.round(rating * 20);
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn(
        "font-bold",
        percentage >= 80 ? "text-green-600" : 
        percentage >= 60 ? "text-yellow-600" : 
        "text-red-600"
      )}>
        {percentage}%
      </span>
      <span className="text-sm text-muted-foreground">تقييم إيجابي</span>
      {showCount && count !== undefined && (
        <span className="text-sm text-muted-foreground">
          ({count} {count === 1 ? "تقييم" : "تقييمات"})
        </span>
      )}
    </div>
  );
}
