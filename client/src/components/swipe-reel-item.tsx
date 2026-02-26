import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Share2, Star, BadgeCheck, ShoppingCart } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { AuctionCountdown } from "@/components/auction-countdown";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { secureRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  const { addToCart, isAdding } = useCart();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const viewTrackedRef = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const images = listing.images && listing.images.length > 0
    ? listing.images
    : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"];

  // Scroll-based dot indicator
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || images.length <= 1) return;
    const handleScroll = () => {
      const index = Math.round(container.scrollLeft / container.clientWidth);
      setCurrentImageIndex(index);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [images.length]);

  // View tracking
  useEffect(() => {
    if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    if (isActive && listing?.id && !viewTrackedRef.current) {
      viewTimerRef.current = setTimeout(() => {
        if (!user?.id || user.id !== listing.sellerId) {
          secureRequest(`/api/listings/${listing.id}/view`, {
            method: "POST",
            body: JSON.stringify({ viewerId: user?.id || null }),
          }).catch(() => {});
        }
        viewTrackedRef.current = true;
      }, 2000);
    }
    return () => { if (viewTimerRef.current) clearTimeout(viewTimerRef.current); };
  }, [isActive, listing?.id, listing?.sellerId, user?.id]);

  useEffect(() => { viewTrackedRef.current = false; }, [listing?.id]);

  const formatPrice = (price: number) =>
    price.toLocaleString("ar-IQ") + " د.ع";

  const isAuction = listing.saleType?.toLowerCase() === "auction";
  const isSoldOut = (listing.quantityAvailable || 1) - (listing.quantitySold || 0) <= 0;
  const isFixedPrice = !isAuction;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { onNavigateToListing(); return; }
    try {
      await addToCart({ listingId: listing.id, quantity: 1 });
      toast({ title: language === "ar" ? "تمت الإضافة للسلة" : language === "ku" ? "زیادکرا بۆ سەبەتە" : "تمت الإضافة للسلة" });
    } catch {
      toast({ title: language === "ar" ? "فشل الإضافة" : language === "ku" ? "زیادکردن سەرکەوتو نەبوو" : "فشل الإضافة", variant: "destructive" });
    }
  };

  return (
    <div
      className="relative h-full w-full flex flex-col bg-black overflow-hidden"
      onClick={() => { if (!clearMode) onDetailsOpen(); else onToggleClearMode?.(); }}
    >
      {/* ── Image carousel ── */}
      <div className="absolute inset-0">
        <div
          ref={scrollContainerRef}
          className="flex h-full w-full overflow-x-auto scrollbar-hide"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative flex-shrink-0 w-full h-full overflow-hidden"
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Blurred backdrop */}
              <img
                src={img}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "blur(22px)", transform: "scale(1.15)", opacity: 0.6 }}
                loading={idx === 0 ? "eager" : "lazy"}
              />
              {/* Foreground — contained, centered */}
              <img
                src={img}
                alt={`${listing.title} ${idx + 1}`}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ zIndex: 2 }}
                loading={idx === 0 && (isActive || shouldPreload) ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Pill dots ── */}
      {images.length > 1 && !clearMode && (
        <div
          className="absolute left-0 right-0 flex justify-center items-center gap-[5px] z-10"
          style={{ bottom: "168px" }}
        >
          {images.map((_, idx) => (
            <div
              key={idx}
              className="rounded-full transition-all duration-300"
              style={{
                height: 6,
                width: idx === currentImageIndex ? 18 : 6,
                background: idx === currentImageIndex
                  ? "rgba(255,255,255,0.95)"
                  : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      )}

      {/* ── Frosted glass info panel ── */}
      {!clearMode && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 px-4 pt-5 pb-6"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 70%, transparent 100%)",
            paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
          }}
        >
          {/* Title */}
          {listing.title && (
            <p className="text-white font-bold text-base leading-snug line-clamp-1 mb-1">
              {listing.title}
            </p>
          )}

          {/* Price */}
          <p className="text-white text-2xl font-extrabold leading-none mb-1">
            {formatPrice(listing.currentBid || listing.price)}
          </p>

          {/* Auction meta */}
          {isAuction && (listing as any).totalBids > 0 && (
            <p className="text-white/65 text-xs mb-1">
              {(listing as any).totalBids}{" "}
              {language === "ar" ? "مزايدة" : language === "ku" ? "مزایدە" : "مزايدة"}
            </p>
          )}

          {/* Countdown */}
          {isAuction && listing.auctionEndTime && listing.isActive && (
            <div className="mb-2">
              <AuctionCountdown endTime={listing.auctionEndTime} simple />
            </div>
          )}

          {/* Seller row */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(listing.sellerName || "U").charAt(0).toUpperCase()}
            </div>
            <span className="text-white/80 text-sm font-medium truncate">
              {listing.sellerName || (language === "ar" ? "بائع" : language === "ku" ? "فرۆشیار" : "بائع")}
            </span>
            {(listing as any).sellerIsVerified && (
              <BadgeCheck className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
            )}
            {(listing as any).sellerRating > 0 && (
              <div className="flex items-center gap-0.5 text-yellow-400 text-xs flex-shrink-0 mr-auto">
                <Star className="h-3 w-3 fill-yellow-400" />
                <span>{((listing as any).sellerRating / 10).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Right-side action buttons ── */}
      {!clearMode && (
        <div
          className="absolute right-3 z-20 flex flex-col gap-3"
          style={{ top: "50%", transform: "translateY(-60%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Favorite */}
          <FavoriteButton
            listingId={listing.id}
            size="lg"
            className="!rounded-full !shadow-lg"
            style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(8px)" } as any}
          />

          {/* Share */}
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="h-11 w-11 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90"
            style={{ background: "rgba(0,0,0,0.38)", backdropFilter: "blur(8px)" }}
          >
            <Share2 className="h-5 w-5 text-white stroke-2" />
          </button>

          {/* Add to cart — fixed price only, not sold out */}
          {isFixedPrice && !isSoldOut && listing.isActive && (
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="h-11 w-11 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90"
              style={{ background: "rgba(22,163,74,0.85)", backdropFilter: "blur(8px)" }}
              aria-label={language === "ar" ? "أضف للسلة" : language === "ku" ? "زیادکردن بۆ سەبەتە" : "أضف للسلة"}
            >
              <ShoppingCart className="h-5 w-5 text-white stroke-2" />
            </button>
          )}

          {/* Bid button */}
          {isAuction && !isSoldOut && listing.isActive && (
            <motion.button
              onClick={(e) => { e.stopPropagation(); onBidOpen(); }}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="px-2 h-9 rounded-full text-white text-xs font-bold shadow-lg"
              style={{ background: "rgba(234,88,12,0.92)", backdropFilter: "blur(8px)" }}
            >
              {language === "ar" ? "زاود" : language === "ku" ? "بزاودە" : "زاود"}
            </motion.button>
          )}

          {/* Make offer */}
          {isFixedPrice && !isSoldOut && listing.isActive && listing.isNegotiable && (
            <motion.button
              onClick={(e) => { e.stopPropagation(); onMakeOffer(); }}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="px-2 h-9 rounded-full text-white text-xs font-bold shadow-lg"
              style={{ background: "rgba(37,99,235,0.88)", backdropFilter: "blur(8px)" }}
            >
              {language === "ar" ? "فاوض" : language === "ku" ? "چاوپێکەوتن" : "فاوض"}
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}
