import { Check, Shield, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/i18n";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const checkSizeClasses = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
};

export function VerifiedBadge({ size = "md", className }: VerifiedBadgeProps) {
  const { language } = useLanguage();
  const label = language === "ar" 
    ? "بائع موثوق" 
    : language === "ku" 
      ? "فرۆشیاری متمانەپێکراو" 
      : "Trusted Seller";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-blue-500 text-white flex-shrink-0",
            sizeClasses[size],
            className
          )}
          data-testid="verified-badge"
        >
          <Check className={checkSizeClasses[size]} strokeWidth={3} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function TrustedBuyerBadge({ size = "md", className }: VerifiedBadgeProps) {
  const { language } = useLanguage();
  const label = language === "ar" ? "مشتري موثوق" : "کڕیاری متمانەپێکراو";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-green-500 text-white flex-shrink-0",
            sizeClasses[size],
            className
          )}
          data-testid="trusted-buyer-badge"
        >
          <Shield className={checkSizeClasses[size]} strokeWidth={2.5} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function AuthenticityBadge({ size = "md", className }: VerifiedBadgeProps) {
  const { language } = useLanguage();
  const label = language === "ar" ? "مصادق عليه" : "پشتڕاستکراوە";
  const tooltip = language === "ar" 
    ? "البائع أكد الأصالة. المنصة لا تضمن صحة المنتج. راجع المنتج قبل الشراء."
    : "فرۆشیار پشتڕاستی کردووە. پلاتفۆرم دڵنیایی نادات. پێش کڕین پشکنین بکە.";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-purple-500 text-white flex-shrink-0",
            sizeClasses[size],
            className
          )}
          data-testid="authenticity-badge"
        >
          <Award className={checkSizeClasses[size]} strokeWidth={2.5} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface UserBadgesProps {
  user: {
    isAuthenticated?: boolean;
    isTrusted?: boolean;
    authenticityGuaranteed?: boolean;
    totalPurchases?: number;
    buyerRating?: number;
  };
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserBadges({ user, size = "sm", className }: UserBadgesProps) {
  const isTrustedBuyer = (user.totalPurchases || 0) >= 50 && (user.buyerRating || 0) >= 4;

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {user.isAuthenticated && <VerifiedBadge size={size} />}
      {user.authenticityGuaranteed && <AuthenticityBadge size={size} />}
      {isTrustedBuyer && <TrustedBuyerBadge size={size} />}
    </div>
  );
}
