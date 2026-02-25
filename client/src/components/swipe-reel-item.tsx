import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Share2, Star, BadgeCheck } from "lucide-react";
import { OptimizedImage } from "@/components/optimized-image";
import { FavoriteButton } from "@/components/favorite-button";
import { AuctionCountdown } from "@/components/auction-countdown";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { secureRequest } from "@/lib/queryClient";
import type { Listing } from "@shared/schema";

interface SwipeReelItemProps {
  listing: Listing;
  isActive: boolean;
  shouldPreload?: boolean;
  clearMode?: boolean;
  onToggleClearMode?: () => void;
  onDetailsOpen: () => void;
  onBidOpen: () => void;
  onMakeOffer: () => void;
  onShare: () => void;
  onNavigateToListing: () => void;
}

export function SwipeReelItem({
  listing,
  isActive,
  shouldPreload = false,
  clearMode = false,
  onToggleClearMode,
  onDetailsOpen,
  onBidOpen,
  onMakeOffer,
  onShare,
  onNavigateToListing,
}: SwipeReelItemProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());
  const viewTrackedRef = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const images = listing.images && listing.images.length > 0
    ? listing.images
    : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"];

  useEffect(() => {
    if (!shouldPreload && !isActive) return;
    images.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => setImagesLoaded(prev => new Set(prev).add(idx));
      img.src = src;
    });
  }, [shouldPreload, isActive, images]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || images.length <= 1) return;
    const handleScroll = () => {
      const index = Math.round(container.scrollLeft / container.clientWidth);
      setCurrentImageIndex(index);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [images.length]);

  useEffect(() => {
    if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    if (isActive && listing?.id && !viewTrackedRef.current) {
      viewTimerRef.current = setTimeout(() => {
        if (!user?.id || user.id !== listing.sellerId) {
          secureRequest(`/api/listings/${listing.id}/view`, {
            method: "POST",
            body: JSON.stringify({ viewerId: user?.id || null })
          }).catch(() => {});
        }
        viewTrackedRef.current = true;
      }, 2000);
    }
    return () => { if (viewTimerRef.current) clearTimeout(viewTimerRef.current); };
  }, [isActive, listing?.id, listing?.sellerId, user?.id]);

  useEffect(() => {
    viewTrackedRef.current = false;
  }, [listing?.id]);

  const formatPrice = (price: number) => price.toLocaleString("ar-IQ") + " د.ع";

  const isAuction = listing.saleType?.toLowerCase() === "auction";
  const isSoldOut = (listing.quantityAvailable || 1) - (listing.quantitySold || 0) <= 0;

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onToggleClearMode?.();
    } else if (!clearMode) {
      onDetailsOpen();
    } else {
      onToggleClearMode?.();
    }
  };

  return (
    <div
      className="relative h-full w-full flex flex-col bg-black"
      onClick={handleContainerClick}
    >
      {/* Image area with blurred backdrop + contained foreground */}
      <div className="swipe-image-area relative flex-1 overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {images.map((img, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-full h-full snap-center relative overflow-hidden"
            >
              {/* Blurred backdrop fills the full cell */}
              <div className="absolute inset-0">
                <img
                  src={img}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover scale-110"
                  style={{ filter: 'blur(20px)', opacity: 0.55 }}
                />
              </div>

              {/* Foreground image contained at natural ratio */}
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <OptimizedImage
                  src={img}
                  alt={`${listing.title} - ${idx + 1}`}
                  className="max-w-full max-h-full"
                  priority={(shouldPreload || isActive) && idx === 0}
                  darkMode={false}
                  objectFit="contain"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Instagram-style pill dots indicator */}
        {images.length > 1 && !clearMode && (
          <div className="absolute bottom-[156px] left-0 right-0 flex justify-center items-center gap-1 py-2 z-30">
            {images.map((_, idx) => (
              <div
                key={idx}
                className="rounded-full transition-all duration-300"
                style={{
                  height: '6px',
                  width: idx === currentImageIndex ? '18px' : '6px',
                  backgroundColor: idx === currentImageIndex
                    ? 'rgba(255,255,255,0.95)'
                    : 'rgba(255,255,255,0.45)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Frosted glass info panel */}
      {!clearMode && (
        <div
          className="flex-shrink-0 px-4 pt-4 pb-safe z-20 pointer-events-none"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderRadius: '20px 20px 0 0',
            paddingBottom: 'max(var(--safe-area-bottom, env(safe-area-inset-bottom, 16px)), 16px)',
          }}
        >
          <div className="space-y-2 pointer-events-auto">
            {/* Title */}
            {listing.title && (
              <p className="text-white font-semibold text-base leading-snug line-clamp-1">
                {listing.title}
              </p>
            )}

            {/* Price */}
            <div>
              <p className="text-white text-2xl font-extrabold">
                {formatPrice(listing.currentBid || listing.price)}
              </p>
              {isAuction && (listing as any).totalBids > 0 && (
                <p className="text-white/70 text-xs mt-0.5">
                  {(listing as any).totalBids} {language === "ar" ? "مزايدة" : "مزایدە"}
                </p>
              )}
            </div>

            {/* Auction countdown */}
            {isAuction && listing.auctionEndTime && listing.isActive && (
              <AuctionCountdown endTime={listing.auctionEndTime} simple />
            )}

            {/* Seller info */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(listing.sellerName || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-white/85 text-sm font-medium truncate">
                  {listing.sellerName || (language === "ar" ? "بائع" : "فرۆشیار")}
                </span>
                {(listing as any).sellerIsVerified && (
                  <BadgeCheck className="h-4 w-4 text-blue-400 flex-shrink-0" />
                )}
              </div>
              {(listing as any).sellerRating > 0 && (
                <div className="flex items-center gap-0.5 text-yellow-400 text-xs flex-shrink-0">
                  <Star className="h-3 w-3 fill-yellow-400" />
                  <span>{((listing as any).sellerRating / 10).toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {listing.description && (
              <p className="text-white/65 text-xs line-clamp-2">
                {listing.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action buttons — glass style, middle-right */}
      {!clearMode && (
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3"
          style={{ zIndex: 30, pointerEvents: 'auto' }}
        >
          <FavoriteButton
            listingId={listing.id}
            size="lg"
            className="!bg-black/35 !backdrop-blur-sm rounded-full"
          />

          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="h-11 w-11 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
            style={{
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <Share2 className="h-5 w-5 text-white stroke-2" />
          </button>

          {/* Bid button */}
          {!isSoldOut && listing.isActive && isAuction && (
            <motion.button
              onClick={(e) => { e.stopPropagation(); onBidOpen(); }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="h-8 px-2 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center shadow-lg border border-white/25"
              aria-label={language === "ar" ? "زاود" : "Add your bid"}
            >
              {language === "ar" ? "زاود" : "Add your bid"}
            </motion.button>
          )}

          {/* Make offer button */}
          {!isSoldOut && listing.isActive && !isAuction && listing.isNegotiable && (
            <motion.button
              onClick={(e) => { e.stopPropagation(); onMakeOffer(); }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="h-8 px-2 rounded-full bg-blue-500/90 text-white text-xs font-semibold flex items-center justify-center shadow-lg border border-white/25"
              aria-label={language === "ar" ? "فاوض" : "پێشکەشکردنی عەرز"}
            >
              {language === "ar" ? "فاوض" : "پێشکەشکردنی عەرز"}
            </motion.button>
          )}

          {/* Buy now button */}
          {!isSoldOut && listing.isActive && !isAuction && !listing.isNegotiable && (
            <motion.button
              onClick={(e) => { e.stopPropagation(); onNavigateToListing(); }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="h-8 px-2 rounded-full bg-green-500 text-white text-xs font-semibold flex items-center justify-center shadow-lg border border-white/25"
              aria-label={language === "ar" ? "اشتري" : "بکڕە"}
            >
              {language === "ar" ? "اشتري" : "بکڕە"}
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}
