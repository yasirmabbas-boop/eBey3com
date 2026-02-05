import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, MessageSquare, Share2, Gavel, Eye, Star, BadgeCheck } from "lucide-react";
import { OptimizedImage } from "@/components/optimized-image";
import { FavoriteButton } from "@/components/favorite-button";
import { AuctionCountdown } from "@/components/auction-countdown";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { hapticSuccess } from "@/lib/despia";
import { secureRequest } from "@/lib/queryClient";
import type { Listing } from "@shared/schema";

interface SwipeReelItemProps {
  listing: Listing;
  isActive: boolean;
  shouldPreload?: boolean;
  onDetailsOpen: () => void;
  onBidOpen: () => void;
  onBuyNow: () => void;
  onShare: () => void;
  onNavigateToListing: () => void;
}

export function SwipeReelItem({
  listing,
  isActive,
  shouldPreload = false,
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
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());
  const lastTapRef = useRef<number>(0);
  const viewTrackedRef = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const images = listing.images && listing.images.length > 0
    ? listing.images
    : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"];

  // Aggressive image preloading to prevent white flashes
  useEffect(() => {
    if (!shouldPreload && !isActive) return;

    const preloadImages = async () => {
      images.forEach((src, idx) => {
        const img = new Image();
        img.onload = () => {
          setImagesLoaded(prev => new Set(prev).add(idx));
        };
        img.src = src;
      });
    };

    preloadImages();
  }, [shouldPreload, isActive, images]);

  // Track image carousel scroll position for dots indicator
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || images.length <= 1) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const itemWidth = container.clientWidth;
      const index = Math.round(scrollLeft / itemWidth);
      setCurrentImageIndex(index);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [images.length]);

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

  // Case-insensitive check for saleType
  const isAuction = listing.saleType?.toLowerCase() === "auction";
  const isSoldOut = (listing.quantityAvailable || 1) - (listing.quantitySold || 0) <= 0;
  const isOwnProduct = user?.id && listing.sellerId === user.id;

  return (
    <div 
      className="relative h-full w-full flex flex-col"
      onClick={handleTap}
    >
      {/* Image Carousel Area */}
      <div className="swipe-image-area relative flex-1 overflow-hidden">
        {/* CSS Snap Scroll for Performance */}
        <div 
          ref={scrollContainerRef}
          className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {images.map((img, idx) => (
            <div 
              key={idx}
              className="flex-shrink-0 w-full h-full snap-center relative z-10"
            >
              <OptimizedImage
                src={img}
                alt={`${listing.title} - ${idx + 1}`}
                className="w-full h-full"
                priority={(shouldPreload || isActive) && idx === 0}
                darkMode={true}
                objectFit="contain"
              />
            </div>
          ))}
        </div>


        {/* Dots Indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentImageIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50 w-2'
                }`}
              />
            ))}
          </div>
        )}

        {/* Sale Type Badge */}
        {isAuction && (
          <Badge className="absolute top-4 left-4 bg-primary text-white z-20 shadow-lg">
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
        className="absolute bottom-0 left-0 right-0 pb-6 px-4 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)'
        }}
      >
        <div className="space-y-3 pointer-events-auto">
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

            {/* Views - Hidden */}
            {/* <div className="flex items-center gap-1 text-white/80 text-sm">
              <Eye className="h-4 w-4" />
              {(listing as any).views || 0}
            </div> */}
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

      {/* Action Buttons - Instagram-style, Right Side */}
      <div 
        className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4"
        style={{ 
          zIndex: 9999,
          position: 'fixed',
          pointerEvents: 'auto',
          isolation: 'isolate'
        }}
      >
        {/* Favorite Button */}
        <div className="backdrop-blur-md bg-black/30 rounded-full p-1">
          <FavoriteButton 
            listingId={listing.id}
            size="lg"
            className="!bg-transparent"
          />
        </div>

        {/* Details/Comments Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDetailsOpen();
          }}
          className="h-12 w-12 rounded-full backdrop-blur-md bg-black/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        >
          <MessageSquare className="h-6 w-6 text-white" />
        </button>

        {/* Share Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="h-12 w-12 rounded-full backdrop-blur-md bg-black/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        >
          <Share2 className="h-6 w-6 text-white" />
        </button>

        {/* Bid/Buy Button - Show for ALL listings (temp: removed isOwnProduct check) */}
        {!isSoldOut && listing.isActive && (
          <>
            {isAuction ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBidOpen();
                }}
                className="h-14 w-14 rounded-full backdrop-blur-md bg-primary/90 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg border-2 border-white/20"
                aria-label={language === "ar" ? "مزايدة" : "مزایدە"}
              >
                <Gavel className="h-7 w-7 text-white" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBuyNow();
                }}
                className="h-14 w-14 rounded-full backdrop-blur-md bg-green-500/90 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg border-2 border-white/20"
                aria-label={language === "ar" ? "اشتري الآن" : "ئێستا بکڕە"}
              >
                <span className="text-white font-bold text-xl">$</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
