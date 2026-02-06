import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, RotateCw } from "lucide-react";
import { SwipeReelItem } from "@/components/swipe-reel-item";
import { SwipeReelFilters, SwipeFilters } from "@/components/swipe-reel-filters";
import { SwipeReelDetails } from "@/components/swipe-reel-details";
import { BiddingWindow } from "@/components/bidding-window";
import { MakeOfferDialog } from "@/components/make-offer-dialog";
import { ShareMenuDialog } from "@/components/share-menu-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useListings } from "@/hooks/use-listings";
import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import { useToast } from "@/hooks/use-toast";
import {
  applyPersonalizationWeights,
  getTrendingItems,
  loadPersonalizationData,
  trackViewedItem,
} from "@/lib/swipe-algorithm";
import type { Listing } from "@shared/schema";

const ITEMS_PER_PAGE = 20;

const SWIPE_STATE_KEY = 'swipe_position_state';

export default function SwipePage() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Load saved swipe position and filters from sessionStorage
  const loadSavedState = () => {
    try {
      const saved = sessionStorage.getItem(SWIPE_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Check if saved state is recent (within last 30 minutes)
        const thirtyMinutes = 30 * 60 * 1000;
        if (parsed.timestamp && Date.now() - parsed.timestamp < thirtyMinutes) {
          return parsed;
        } else {
          // Clear stale state
          sessionStorage.removeItem(SWIPE_STATE_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to load swipe state:', error);
    }
    return null;
  };

  const savedState = loadSavedState();

  // State
  const [currentIndex, setCurrentIndex] = useState(savedState?.currentIndex || 0);
  const [filters, setFilters] = useState<SwipeFilters>(
    savedState?.filters || {
      categories: [],
      saleType: 'all',
      conditions: [],
    }
  );
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Listing[]>([]);
  const [processedItems, setProcessedItems] = useState<Listing[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [biddingOpen, setBiddingOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [shareListing, setShareListing] = useState<Listing | null>(null);
  const [clearMode, setClearMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isAnySheetOpen = detailsOpen || biddingOpen || offerOpen;

  // Load personalization data
  const personalizationData = useMemo(() => loadPersonalizationData(), []);
  const hasUserPreferences = personalizationData.userPreferredCategories.length > 0;

  // Build query params from filters
  const queryParams = useMemo(() => {
    const params: any = {
      limit: ITEMS_PER_PAGE,
      page,
    };

    if (filters.categories.length > 0) {
      params.category = filters.categories[0]; // API takes single category
    }

    if (filters.saleType !== 'all') {
      params.saleType = filters.saleType === 'auction' ? ['auction'] : ['fixed'];
    }

    if (filters.conditions.length > 0) {
      params.condition = filters.conditions;
    }

    return params;
  }, [filters, page]);

  // Fetch listings
  const { data: listingsData, isLoading, error, refetch } = useListings(queryParams);

  // Process and sort listings when data changes
  useEffect(() => {
    if (!listingsData?.listings) return;

    const newListings = listingsData.listings;
    
    // Merge with existing items (for pagination)
    const merged = page === 1 
      ? newListings 
      : [...allItems, ...newListings];

    // Remove duplicates
    const uniqueItems = Array.from(
      new Map(merged.map(item => [item.id, item])).values()
    );

    setAllItems(uniqueItems);

    // Apply personalization/sorting
    let sorted: Listing[];
    if (hasUserPreferences) {
      // Returning user - apply personalization
      sorted = applyPersonalizationWeights(uniqueItems, personalizationData);
    } else {
      // New user - show trending
      sorted = getTrendingItems(uniqueItems);
    }

    setProcessedItems(sorted);

    // If returning with saved state, ensure index is valid
    if (savedState && savedState.currentIndex > 0 && sorted.length > 0) {
      // Clamp index to valid range
      const validIndex = Math.min(savedState.currentIndex, sorted.length - 1);
      if (validIndex !== currentIndex) {
        setCurrentIndex(validIndex);
      }
    }
  }, [listingsData, page, hasUserPreferences, personalizationData]);

  // Track filter changes to trigger refetch
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);
  
  // Reset when filters change - but don't clear items immediately to avoid flash
  useEffect(() => {
    setCurrentIndex(0);
    setPage(1);
    setAllItems([]);
    setIsFiltersChanged(true);
    
    // Clear saved state when filters change
    sessionStorage.removeItem(SWIPE_STATE_KEY);
  }, [filters]);
  
  // Clear the filters changed flag when new data arrives
  useEffect(() => {
    if (listingsData?.listings && isFiltersChanged) {
      setIsFiltersChanged(false);
    }
  }, [listingsData, isFiltersChanged]);

  // Infinite scroll - load more when reaching end
  useEffect(() => {
    // Only trigger pagination when we have items AND are near the end
    // This prevents page 2 from loading before page 1 is displayed
    if (processedItems.length > 0 && currentIndex >= processedItems.length - 3 && !isLoading) {
      const hasMore = listingsData?.pagination?.hasMore;
      if (hasMore) {
        setPage(prev => prev + 1);
      }
    }
  }, [currentIndex, processedItems.length, isLoading, listingsData]);

  // Track viewed item
  useEffect(() => {
    const currentListing = processedItems[currentIndex];
    if (currentListing) {
      trackViewedItem(currentListing.id);
    }
  }, [currentIndex, processedItems]);

  // Gesture handling
  const nextItem = () => {
    if (currentIndex < processedItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const previousItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  useSwipeGesture(containerRef, {
    onSwipeUp: nextItem,
    onSwipeDown: previousItem,
    disabled: isAnySheetOpen,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnySheetOpen) return;

      if (e.key === 'ArrowUp') previousItem();
      if (e.key === 'ArrowDown') nextItem();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnySheetOpen, currentIndex]);

  // Save swipe position to sessionStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      currentIndex,
      filters,
      timestamp: Date.now(),
    };
    
    try {
      sessionStorage.setItem(SWIPE_STATE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save swipe state:', error);
    }
  }, [currentIndex, filters]);

  // Cleanup: Clear saved state when component unmounts (user navigates away from swipe)
  // But keep it if they're just opening sheets/dialogs
  useEffect(() => {
    return () => {
      // Only clear if sheets are not open (meaning user is leaving swipe page)
      if (!isAnySheetOpen) {
        // Note: We DON'T clear here - we want state to persist for back navigation
        // State will auto-expire after 30 minutes
      }
    };
  }, [isAnySheetOpen]);

  // Handlers
  const handleDetailsOpen = (listing: Listing) => {
    setSelectedListing(listing);
    setDetailsOpen(true);
  };

  const handleBidOpen = (listing: Listing) => {
    if (!user) {
      toast({
        title: t("loginRequired"),
        description: language === "ar"
          ? "يجب عليك تسجيل الدخول للمزايدة"
          : "دەبێت بچیتە ژوورەوە بۆ مزایدەکردن",
        variant: "destructive",
      });
      navigate(`/signin?redirect=/swipe`);
      return;
    }
    setSelectedListing(listing);
    setBiddingOpen(true);
  };

  const handleMakeOffer = (listing: Listing) => {
    if (!user) {
      toast({
        title: t("loginRequired"),
        description: language === "ar"
          ? "يجب عليك تسجيل الدخول لتقديم عرض"
          : "دەبێت بچیتە ژوورەوە بۆ پێشکەشکردنی عەرز",
        variant: "destructive",
      });
      navigate(`/signin?redirect=/swipe`);
      return;
    }
    setSelectedListing(listing);
    setOfferOpen(true);
  };

  const handleShare = (listing: Listing) => {
    setShareListing(listing);
    setShareMenuOpen(true);
  };

  // Virtual scrolling - render only visible items
  const visibleItems = useMemo(() => {
    const start = Math.max(0, currentIndex - 2);
    const end = Math.min(processedItems.length, currentIndex + 3);
    return processedItems.slice(start, end).map((item, idx) => ({
      item,
      actualIndex: start + idx,
    }));
  }, [processedItems, currentIndex]);

  // Loading state - show when loading OR when filters just changed
  if ((isLoading || isFiltersChanged) && processedItems.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        <SwipeReelFilters filters={filters} onFiltersChange={setFilters} />
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/70">
            {language === "ar" ? "جاري التحميل..." : "بارکردن..."}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center px-4" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-white">
            {language === "ar" ? "حدث خطأ" : "هەڵەیەک ڕوویدا"}
          </h2>
          <p className="text-white/70 mb-4">
            {language === "ar"
              ? "فشل في تحميل المنتجات"
              : "بارکردنی بەرهەمەکان شکستی هێنا"}
          </p>
          <Button onClick={() => refetch()}>
            <RotateCw className="h-4 w-4 ml-2" />
            {language === "ar" ? "إعادة المحاولة" : "دووبارە هەوڵ بدەرەوە"}
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (processedItems.length === 0) {
    return (
      <div className="fixed inset-0 bg-black" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        <SwipeReelFilters filters={filters} onFiltersChange={setFilters} />
        <div className="flex items-center justify-center h-full px-4">
          <div className="text-center">
            <p className="text-xl font-bold mb-2 text-white">
              {language === "ar" ? "لا توجد منتجات" : "هیچ بەرهەمێک نییە"}
            </p>
            <p className="text-white/70 mb-4">
              {language === "ar"
                ? "جرب تغيير الفلاتر"
                : "فلتەرەکان بگۆڕە"}
            </p>
            <Button
              onClick={() => setFilters({ categories: [], saleType: 'all', conditions: [] })}
            >
              {language === "ar" ? "مسح الفلاتر" : "سڕینەوەی فلتەرەکان"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentListing = processedItems[currentIndex];

  return (
    <div 
      className="fixed inset-0 bg-black" 
      style={{ 
        height: 'calc(var(--vh, 1vh) * 100)',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50
      }}
    >
      {/* Swipe Container - Full screen edge-to-edge */}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden"
        style={{ 
          touchAction: 'none',
        }}
      >
        {/* Filters Overlay */}
        <SwipeReelFilters 
          filters={filters} 
          onFiltersChange={setFilters}
          hidden={clearMode}
        />
        {/* Pre-render adjacent items for instant transitions */}
        {visibleItems.map(({ item, actualIndex }) => {
          const offset = actualIndex - currentIndex;
          const isVisible = Math.abs(offset) <= 1;
          const isCurrent = offset === 0;
          
          return (
            <motion.div
              key={item.id}
              className="absolute inset-0"
              initial={false}
              animate={{ 
                y: `${offset * 100}%`,
                opacity: isVisible ? 1 : 0,
                scale: isCurrent ? 1 : 0.95,
              }}
              transition={{ 
                duration: 0.35, 
                ease: [0.25, 0.1, 0.25, 1],
              }}
              style={{ 
                zIndex: isCurrent ? 10 : 5,
                willChange: 'transform, opacity',
              }}
            >
              <SwipeReelItem
                listing={item}
                isActive={isCurrent}
                shouldPreload={isVisible}
                clearMode={clearMode}
                onToggleClearMode={() => setClearMode(!clearMode)}
                onDetailsOpen={() => handleDetailsOpen(item)}
                onBidOpen={() => handleBidOpen(item)}
                onMakeOffer={() => handleMakeOffer(item)}
                onShare={() => handleShare(item)}
                onNavigateToListing={() => navigate(`/product/${item.id}`)}
              />
            </motion.div>
          );
        })}

      </div>

      {/* Details Sheet */}
      <SwipeReelDetails
        listing={selectedListing}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Bidding Sheet */}
      {selectedListing?.saleType === "auction" && (
        <Sheet open={biddingOpen} onOpenChange={setBiddingOpen}>
          <SheetContent side="bottom" className="h-auto" dir="rtl">
            <BiddingWindow
              listingId={selectedListing.id}
              userId={user?.id}
              currentBid={selectedListing.currentBid || selectedListing.price}
              totalBids={(selectedListing as any).totalBids || 0}
              minimumBid={(selectedListing.currentBid || selectedListing.price) + 1000}
              timeLeft={selectedListing.timeLeft || undefined}
              auctionEndTime={
                selectedListing.auctionEndTime
                  ? typeof selectedListing.auctionEndTime === 'string'
                    ? selectedListing.auctionEndTime
                    : selectedListing.auctionEndTime.toISOString()
                  : undefined
              }
              onRequireAuth={() => {
                toast({
                  title: t("loginRequired"),
                  variant: "destructive",
                });
                navigate(`/signin?redirect=/swipe`);
                return false;
              }}
              onRequirePhoneVerification={() => {
                toast({
                  title: language === "ar" ? "التحقق من الهاتف مطلوب" : "پشتڕاستکردنەوەی مۆبایل پێویستە",
                  variant: "destructive",
                });
              }}
              onBidSuccess={() => {
                setBiddingOpen(false);
                toast({
                  title: language === "ar" ? "تم تقديم المزايدة" : "مزایدەکە سەرکەوتوو بوو",
                });
              }}
              isWinning={false}
              isAuthLoading={false}
              phoneVerified={user?.phoneVerified || false}
              allowedBidderType={selectedListing.allowedBidderType}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Make Offer Dialog */}
      <MakeOfferDialog
        open={offerOpen}
        onOpenChange={setOfferOpen}
        listingId={selectedListing?.id || ""}
        defaultOfferAmount={selectedListing?.price}
      />

      {/* Share Menu Dialog */}
      {shareListing && (
        <ShareMenuDialog
          open={shareMenuOpen}
          onOpenChange={setShareMenuOpen}
          url={`${window.location.origin}/product/${shareListing.id}`}
          title={shareListing.title}
          text={`${shareListing.title} - ${shareListing.price.toLocaleString()} د.ع`}
        />
      )}
    </div>
  );
}
