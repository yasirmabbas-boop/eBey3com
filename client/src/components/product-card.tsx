import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ShoppingCart, Gavel, ExternalLink } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { OptimizedImage } from "@/components/optimized-image";
import { AuctionCountdown } from "@/components/auction-countdown";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  currentBid?: number;
  image: string;
  category?: string;
  views?: number;
  saleType?: "auction" | "fixed";
  auctionEndTime?: string;
  className?: string;
  showQuickActions?: boolean;
}

export function ProductCard({
  id,
  title,
  price,
  currentBid,
  image,
  category,
  views = 0,
  saleType = "fixed",
  auctionEndTime,
  className,
  showQuickActions = true,
}: ProductCardProps) {
  const isAuction = saleType === "auction";
  const displayPrice = currentBid || price;

  return (
    <Link href={`/product/${id}`}>
      <Card 
        className={cn(
          "overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-gray-200 active:scale-[0.98] relative",
          className
        )} 
        data-testid={`card-product-${id}`}
      >
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <OptimizedImage 
            src={image} 
            alt={title} 
            className="w-full h-full group-hover:scale-110 transition-transform duration-500"
          />
          
          {isAuction && (
            <Badge className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-primary text-white text-[10px] sm:text-xs px-1.5 py-0.5 z-10">
              مزاد
            </Badge>
          )}
          
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-10">
            <FavoriteButton listingId={id} size="sm" />
          </div>

          {showQuickActions && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 rounded-full shadow-lg hover:scale-110 transition-transform"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `/product/${id}`;
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full shadow-lg hover:scale-110 transition-transform"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `/product/${id}`;
                  }}
                >
                  {isAuction ? <Gavel className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <CardContent className="p-2 sm:p-4">
          {category && (
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">
              <span className="truncate">{category}</span>
              <span className="flex items-center gap-0.5 sm:gap-1">
                <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {views}
              </span>
            </div>
          )}
          
          <h3 className="font-bold text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2 sm:line-clamp-1 group-hover:text-primary transition-colors leading-tight">
            {title}
          </h3>
          
          <div className="flex items-center justify-between">
            <p className="font-bold text-primary text-xs sm:text-base">
              {displayPrice.toLocaleString()} <span className="text-[10px] sm:text-xs">د.ع</span>
            </p>
          </div>
          
          {isAuction && auctionEndTime && (
            <div className="mt-1 sm:mt-2">
              <AuctionCountdown endTime={auctionEndTime} />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
