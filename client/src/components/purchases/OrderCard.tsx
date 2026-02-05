import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  RotateCcw,
  MoreVertical,
  MessageCircle,
  Star,
  Eye,
  AlertTriangle,
  MapPin,
} from "lucide-react";

export interface Purchase {
  id: string;
  listingId: string;
  amount: number;
  status: string;
  deliveryStatus?: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryCity?: string;
  paymentMethod?: string;
  trackingNumber?: string;
  shippedAt?: string;
  trackingAvailableAt?: string;
  createdAt: string;
  completedAt?: string;
  hasReview?: boolean;
  listing?: {
    id: string;
    title: string;
    price: number;
    images: string[];
    sellerName: string;
    sellerId: string;
    city: string;
  };
}

interface OrderCardProps {
  purchase: Purchase;
  onViewDetails: (purchase: Purchase) => void;
  onTrackPackage: (purchase: Purchase) => void;
  onMessageSeller: (purchase: Purchase) => void;
  onRateSeller: (purchase: Purchase) => void;
  onRequestReturn: (purchase: Purchase) => void;
  onReportIssue: (purchase: Purchase) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "delivered":
    case "completed":
      return {
        label: "تم التسليم",
        color: "bg-green-100 text-green-700 border-green-200",
        icon: CheckCircle,
      };
    case "shipped":
    case "in_transit":
      return {
        label: "قيد التوصيل",
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: Truck,
      };
    case "processing":
    case "pending":
      return {
        label: "قيد التجهيز",
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: Clock,
      };
    case "returned":
      return {
        label: "مرتجع",
        color: "bg-red-100 text-red-700 border-red-200",
        icon: RotateCcw,
      };
    default:
      return {
        label: status,
        color: "bg-gray-100 text-gray-700 border-gray-200",
        icon: Package,
      };
  }
};

export function OrderCard({
  purchase,
  onViewDetails,
  onTrackPackage,
  onMessageSeller,
  onRateSeller,
  onRequestReturn,
  onReportIssue,
}: OrderCardProps) {
  const status = purchase.status || purchase.deliveryStatus || "pending";
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;
  const isDelivered = status === "delivered" || status === "completed";
  const isShipped = status === "shipped" || status === "in_transit";
  const needsRating = isDelivered && !purchase.hasReview;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-IQ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Card
      className={`p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/30 active:bg-muted/50 ${
        needsRating ? "border-r-4 border-r-amber-400" : ""
      }`}
      onClick={() => onViewDetails(purchase)}
      data-testid={`order-card-${purchase.id}`}
    >
      <div className="flex gap-3 sm:gap-4">
        {/* Thumbnail - Larger on mobile for better touch */}
        <div className="flex-shrink-0">
          {purchase.listing?.images?.[0] ? (
            <img
              src={purchase.listing.images[0]}
              alt={purchase.listing?.title || "منتج"}
              className="w-[72px] h-[72px] sm:w-20 sm:h-20 md:w-24 md:h-24 object-cover rounded-xl"
              loading="lazy"
            />
          ) : (
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 md:w-24 md:h-24 bg-muted rounded-xl flex items-center justify-center">
              <Package className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Order Info */}
        <div className="flex-1 min-w-0">
          {/* Title and Status Row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm sm:text-base line-clamp-2 flex-1">
              {purchase.listing?.title || "منتج"}
            </h3>
            <Badge
              className={`flex-shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 ${statusConfig.color}`}
            >
              <StatusIcon className="h-3 w-3 ml-0.5 sm:ml-1" />
              <span className="hidden xs:inline">{statusConfig.label}</span>
              <span className="xs:hidden">{statusConfig.label.split(" ")[0]}</span>
            </Badge>
          </div>

          {/* Order Meta */}
          <div className="text-[11px] sm:text-xs text-muted-foreground space-y-0.5 mb-2">
            <p className="flex items-center gap-1 flex-wrap">
              <span className="font-mono">#{purchase.id.slice(0, 8).toUpperCase()}</span>
              <span className="mx-0.5 sm:mx-1">•</span>
              <span>{formatDate(purchase.createdAt)}</span>
            </p>
            {purchase.listing?.sellerName && (
              <p className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {purchase.listing.sellerName}
                  {purchase.listing.city && ` • ${purchase.listing.city}`}
                </span>
              </p>
            )}
          </div>

          {/* Price and Quick Actions Row */}
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-primary text-base sm:text-lg">
              {purchase.amount?.toLocaleString() || 0} د.ع
            </p>

            {/* Quick Actions - Responsive layout */}
            <div className="flex items-center gap-1 sm:gap-1.5" onClick={(e) => e.stopPropagation()}>
              {/* Mobile: Show only icons, Desktop: Show text */}
              {isShipped && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 sm:h-7 w-8 sm:w-auto p-0 sm:px-2 text-xs"
                  onClick={() => onTrackPackage(purchase)}
                >
                  <Truck className="h-4 w-4 sm:h-3 sm:w-3 sm:ml-1" />
                  <span className="hidden sm:inline">تتبع</span>
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                className="h-8 sm:h-7 w-8 sm:w-auto p-0 sm:px-2 text-xs"
                onClick={() => onMessageSeller(purchase)}
              >
                <MessageCircle className="h-4 w-4 sm:h-3 sm:w-3 sm:ml-1" />
                <span className="hidden sm:inline">مراسلة</span>
              </Button>

              {needsRating && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 sm:h-7 w-8 sm:w-auto p-0 sm:px-2 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                  onClick={() => onRateSeller(purchase)}
                >
                  <Star className="h-4 w-4 sm:h-3 sm:w-3 sm:ml-1" />
                  <span className="hidden sm:inline">قيّم</span>
                </Button>
              )}

              {isDelivered && purchase.hasReview && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] sm:text-xs hidden sm:flex">
                  <CheckCircle className="h-3 w-3 ml-1" />
                  تم التقييم
                </Badge>
              )}

              {/* More Actions Dropdown - Larger touch target on mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 sm:h-7 sm:w-7 p-0"
                  >
                    <MoreVertical className="h-5 w-5 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 sm:w-48">
                  <DropdownMenuItem onClick={() => onViewDetails(purchase)} className="py-3 sm:py-2">
                    <Eye className="h-4 w-4 ml-2" />
                    عرض التفاصيل
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTrackPackage(purchase)} className="py-3 sm:py-2">
                    <Truck className="h-4 w-4 ml-2" />
                    تتبع الشحنة
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMessageSeller(purchase)} className="py-3 sm:py-2">
                    <MessageCircle className="h-4 w-4 ml-2" />
                    مراسلة البائع
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isDelivered && !purchase.hasReview && (
                    <DropdownMenuItem onClick={() => onRateSeller(purchase)} className="py-3 sm:py-2">
                      <Star className="h-4 w-4 ml-2" />
                      تقييم البائع
                    </DropdownMenuItem>
                  )}
                  {isDelivered && (
                    <DropdownMenuItem onClick={() => onRequestReturn(purchase)} className="py-3 sm:py-2">
                      <RotateCcw className="h-4 w-4 ml-2" />
                      طلب إرجاع
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onReportIssue(purchase)}
                    className="text-red-600 py-3 sm:py-2"
                  >
                    <AlertTriangle className="h-4 w-4 ml-2" />
                    الإبلاغ عن مشكلة
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
