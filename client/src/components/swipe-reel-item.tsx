import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, MessageSquare, Share2, Gavel, Eye, Star, BadgeCheck } from "lucide-react";
import { OptimizedImage } from "@/components/optimized-image";
import { FavoriteButton } from "@/components/favorite-button";
import { AuctionCountdown } from "@/components/auction-countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { hapticSuccess } from "@/lib/despia";
import { secureRequest } from "@/lib/queryClient";
import type { Listing } from "@shared/schema";

interface SwipeReelItemProps {
  listing: Listing;
  isActive: boolean;
  onDetailsOpen: () => void;
  onBidOpen: () => void;
  onBuyNow: () => void;
  onShare: () => void;
  onNavigateToListing: () => void;
}

export function SwipeReelItem({
  listing,
  isActive,
  onDetailsOpen,
  onBidOpen,
  onBuyNow,
  onShare,
  onNavigateToListing,
}: SwipeReelItemProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const lastTapRef = useRef<number>(0);
  const viewTrackedRef = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout>();

  const images = listing.images && listing.images.length > 0
    ? listing.images
    : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"];

  // Track view after 2 seconds on same item
  useEffect(() => {
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
    }

    if (isActive && listing?.id && !viewTrackedRef.current) {
      viewTimerRef.current = setTimeout(() => {
        // Only track if viewer is not the seller
        if (!user?.id || user.id !== listing.sellerId) {
          secureRequest(`/api/listings/${listing.id}/view`, {
            method: "POST",
            body: JSON.stringify({ viewerId: user?.id || null })
          }).catch(() => {});
        }
        viewTrackedRef.current = true;
      }, 2000);
    }

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, [isActive, listing?.id, listing?.sellerId, user?.id]);

  // Reset view tracking when item changes
  useEffect(() => {
    viewTrackedRef.current = false;
  }, [listing?.id]);

  const singleTapTimerRef = useRef<NodeJS.Timeout>();
  
  // Handle tap - single tap navigates, double tap favorites
  const handleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap detected - cancel single tap navigation and show heart
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      setShowHeartBurst(true);
      hapticSuccess();
      setTimeout(() => setShowHeartBurst(false), 1000);
    } else {
      // Single tap - wait briefly to see if it's a double tap
      singleTapTimerRef.current = setTimeout(() => {
        onNavigateToListing();
      }, 300);
    }

    lastTapRef.current = now;
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("ar-IQ") + " د.ع";
  };

  const isAuction = listing.saleType === "auction";
  const isSoldOut = (listing.quantityAvailable || 1) - (listing.quantitySold || 0) <= 0;
  const isOwnProduct = user?.id && listing.sellerId === user.id;

  return (
    <div 
      className="relative h-full w-full flex flex-col bg-black"
      onClick={handleTap}
    >
      {/* Image Carousel Area */}
      <div className="swipe-image-area relative flex-1 overflow-hidden">
        {/* CSS Snap Scroll for Performance */}
        <div 
          className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {images.map((img, idx) => (
            <div 
              key={idx}
              className="flex-shrink-0 w-full h-full snap-center relative"
            >
              <OptimizedImage
                src={img}
                alt={`${listing.title} - ${idx + 1}`}
                className="w-full h-full object-contain"
                priority={isActive && idx === 0}
                darkMode={true}
              />
            </div>
          ))}
        </div>


        {/* Dots Indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentImageIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50 w-1.5'
                }`}
              />
            ))}
          </div>
        )}

        {/* Sale Type Badge */}
        {isAuction && (
          <Badge className="absolute top-4 left-4 bg-primary text-white">
            {language === "ar" ? "مزاد" : "مزایدە"}
          </Badge>
        )}

        {/* Double-tap Heart Animation */}
        {showHeartBurst && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Heart className="w-32 h-32 fill-red-500 text-red-500" />
          </motion.div>
        )}
      </div>

      {/* Bottom Overlay with Product Info */}
      <div 
        className="absolute bottom-0 left-0 right-0 pb-6 px-4"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)'
        }}
      >
        <div className="space-y-3">
          {/* Title */}
          <h2 className="text-white font-bold text-lg leading-tight line-clamp-2">
            {listing.title}
          </h2>

          {/* Price/Bid Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-2xl font-bold">
                {formatPrice(listing.currentBid || listing.price)}
              </p>
              {isAuction && (listing as any).totalBids > 0 && (
                <p className="text-white/80 text-sm">
                  {(listing as any).totalBids} {language === "ar" ? "مزايدة" : "مزایدە"}
                </p>
              )}
            </div>

            {/* Views */}
            <div className="flex items-center gap-1 text-white/80 text-sm">
              <Eye className="h-4 w-4" />
              {(listing as any).views || 0}
            </div>
          </div>

          {/* Auction Countdown */}
          {isAuction && listing.auctionEndTime && listing.isActive && (
            <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-500/30 rounded-lg p-2">
              <AuctionCountdown endTime={listing.auctionEndTime} />
            </div>
          )}

          {/* Seller Info */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold">
              {(listing.sellerName || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white/90 text-sm font-medium">
                {listing.sellerName || (language === "ar" ? "بائع" : "فرۆشیار")}
              </span>
              {(listing as any).sellerIsVerified && (
                <BadgeCheck className="h-4 w-4 text-blue-400" />
              )}
            </div>
            {(listing as any).sellerRating && (listing as any).sellerRating > 0 && (
              <div className="flex items-center gap-0.5 text-yellow-400 text-xs">
                <Star className="h-3 w-3 fill-yellow-400" />
                <span>{((listing as any).sellerRating / 10).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons - Right Side - Moved up above text/price */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
        {/* Favorite */}
        <FavoriteButton 
          listingId={listing.id}
          size="lg"
          className="!bg-transparent border border-white/50"
        />

        {/* Details/Comments */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDetailsOpen();
          }}
          className="h-10 w-10 rounded-full border border-white/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        >
          <MessageSquare className="h-5 w-5 text-white" />
        </button>

        {/* Share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="h-10 w-10 rounded-full border border-white/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        >
          <Share2 className="h-5 w-5 text-white" />
        </button>

        {/* Bid Button - Only for auctions */}
        {!isOwnProduct && !isSoldOut && listing.isActive && isAuction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBidOpen();
            }}
            className="h-10 w-10 rounded-full border border-primary bg-primary/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          >
            <Gavel className="h-5 w-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
