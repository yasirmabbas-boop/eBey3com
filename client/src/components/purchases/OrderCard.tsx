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
      className={`p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
        needsRating ? "border-r-4 border-r-amber-400" : ""
      }`}
      onClick={() => onViewDetails(purchase)}
      data-testid={`order-card-${purchase.id}`}
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          {purchase.listing?.images?.[0] ? (
            <img
              src={purchase.listing.images[0]}
              alt={purchase.listing?.title || "منتج"}
              className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg"
              loading="lazy"
            />
          ) : (
            <div className="w-20 h-20 md:w-24 md:h-24 bg-muted rounded-lg flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Order Info */}
        <div className="flex-1 min-w-0">
          {/* Title and Status Row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm md:text-base line-clamp-2 flex-1">
              {purchase.listing?.title || "منتج"}
            </h3>
            <Badge
              className={`flex-shrink-0 text-xs px-2 py-0.5 ${statusConfig.color}`}
            >
              <StatusIcon className="h-3 w-3 ml-1" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Order Meta */}
          <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
            <p className="flex items-center gap-1">
              <span className="font-mono">#{purchase.id.slice(0, 8).toUpperCase()}</span>
              <span className="mx-1">•</span>
              <span>{formatDate(purchase.createdAt)}</span>
            </p>
            {purchase.listing?.sellerName && (
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {purchase.listing.sellerName}
                {purchase.listing.city && ` • ${purchase.listing.city}`}
              </p>
            )}
          </div>

          {/* Price and Quick Actions Row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-bold text-primary text-base md:text-lg">
              {purchase.amount?.toLocaleString() || 0} د.ع
            </p>

            {/* Quick Actions */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {isShipped && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  onClick={() => onTrackPackage(purchase)}
                >
                  <Truck className="h-3 w-3 ml-1" />
                  تتبع
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => onMessageSeller(purchase)}
              >
                <MessageCircle className="h-3 w-3 ml-1" />
                مراسلة
              </Button>

              {needsRating && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                  onClick={() => onRateSeller(purchase)}
                >
                  <Star className="h-3 w-3 ml-1" />
                  قيّم
                </Button>
              )}

              {isDelivered && purchase.hasReview && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                  <CheckCircle className="h-3 w-3 ml-1" />
                  تم التقييم
                </Badge>
              )}

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onViewDetails(purchase)}>
                    <Eye className="h-4 w-4 ml-2" />
                    عرض التفاصيل
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTrackPackage(purchase)}>
                    <Truck className="h-4 w-4 ml-2" />
                    تتبع الشحنة
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMessageSeller(purchase)}>
                    <MessageCircle className="h-4 w-4 ml-2" />
                    مراسلة البائع
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isDelivered && !purchase.hasReview && (
                    <DropdownMenuItem onClick={() => onRateSeller(purchase)}>
                      <Star className="h-4 w-4 ml-2" />
                      تقييم البائع
                    </DropdownMenuItem>
                  )}
                  {isDelivered && (
                    <DropdownMenuItem onClick={() => onRequestReturn(purchase)}>
                      <RotateCcw className="h-4 w-4 ml-2" />
                      طلب إرجاع
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onReportIssue(purchase)}
                    className="text-red-600"
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
