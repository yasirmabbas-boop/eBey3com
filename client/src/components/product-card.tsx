import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShoppingCart, Gavel, MoreVertical, Share2, User, Flag, Clock } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { OptimizedImage } from "@/components/optimized-image";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  currentBid?: number;
  image: string;
  category?: string;
  saleType?: "auction" | "fixed";
  auctionEndTime?: string;
  className?: string;
}

export function ProductCard({
  id,
  title,
  price,
  currentBid,
  image,
  category,
  saleType = "fixed",
  auctionEndTime,
  className,
}: ProductCardProps) {
  const isAuction = saleType === "auction";
  const displayPrice = currentBid || price;
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalHours: number;
    expired: boolean;
  } | null>(null);

  // Calculate time remaining for badge color and display
  useEffect(() => {
    if (!isAuction || !auctionEndTime) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const end = typeof auctionEndTime === "string" ? new Date(auctionEndTime) : new Date(auctionEndTime);
      if (isNaN(end.getTime())) {
        setTimeRemaining(null);
        return;
      }

      const now = new Date();
      const difference = end.getTime() - now.getTime();
      
      if (difference <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, totalHours: 0, expired: true });
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      const totalHours = difference / (1000 * 60 * 60);

      setTimeRemaining({ hours, minutes, seconds, totalHours, expired: false });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isAuction, auctionEndTime]);

  const isUrgent = timeRemaining !== null && timeRemaining.totalHours < 24 && !timeRemaining.expired;
  
  const formatCountdown = () => {
    if (!timeRemaining || timeRemaining.expired) return "انتهى";
    if (timeRemaining.hours > 0) {
      return `${timeRemaining.hours}:${String(timeRemaining.minutes).padStart(2, '0')}:${String(timeRemaining.seconds).padStart(2, '0')}`;
    }
    return `${timeRemaining.minutes}:${String(timeRemaining.seconds).padStart(2, '0')}`;
  };

  return (
    <Link href={`/product/${id}`}>
      <Card
        className={cn(
          "group relative flex flex-col overflow-hidden border-border/50 bg-background transition-all hover:shadow-lg active:scale-[0.99]",
          className
        )}
        data-testid={`card-product-${id}`}
      >
        {/* IMAGE SECTION */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/20">
          <OptimizedImage
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Top Left: Auction Timer Badge */}
          {isAuction && auctionEndTime && timeRemaining && (
            <div className="absolute left-2 top-2 z-10">
              <Badge
                variant={isUrgent ? "destructive" : "secondary"}
                className="w-fit px-2 py-0.5 text-[10px] backdrop-blur-sm flex items-center gap-1"
              >
                <Clock className="h-3 w-3" />
                <span className="font-mono">{formatCountdown()}</span>
              </Badge>
            </div>
          )}

          {/* Top Right: More Menu */}
          <div className="absolute right-2 top-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white/80 shadow-sm backdrop-blur-sm hover:bg-white"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  data-testid={`button-more-menu-${id}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Share logic here
                  }}
                  data-testid={`menu-share-${id}`}
                >
                  <Share2 className="h-4 w-4 ml-2" />
                  مشاركة المنتج
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // View seller logic here
                  }}
                  data-testid={`menu-view-seller-${id}`}
                >
                  <User className="h-4 w-4 ml-2" />
                  عرض البائع
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Report logic here
                  }}
                  data-testid={`menu-report-${id}`}
                  className="text-red-600 focus:text-red-600"
                >
                  <Flag className="h-4 w-4 ml-2" />
                  الإبلاغ عن المنتج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* CONTENT SECTION */}
        <CardContent className="flex flex-1 flex-col gap-2 p-3">
          <h3
            className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight text-foreground"
            title={title}
          >
            {title}
          </h3>

          <div className="mt-auto flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">
                {displayPrice.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-muted-foreground">د.ع</span>
            </div>
            
            <FavoriteButton
              listingId={id}
              className="h-7 w-7 shrink-0"
            />
          </div>
        </CardContent>

        {/* FOOTER ACTION */}
        <div className="px-3 pb-3 pt-0">
          <Button
            className="w-full gap-2 rounded-lg bg-secondary/80 text-xs font-semibold text-secondary-foreground"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              // Add to cart logic would go here if needed, or just let the Link handle navigation
            }}
            data-testid={`button-action-${id}`}
          >
            {isAuction ? (
              <Gavel className="h-3.5 w-3.5" />
            ) : (
              <ShoppingCart className="h-3.5 w-3.5" />
            )}
            {isAuction ? "زايد الآن" : "أضف للسلة"}
          </Button>
        </div>
      </Card>
    </Link>
  );
}
