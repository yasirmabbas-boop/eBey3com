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
