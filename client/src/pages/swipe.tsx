import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, RotateCw } from "lucide-react";
import { Layout } from "@/components/layout";
import { SwipeReelItem } from "@/components/swipe-reel-item";
import { SwipeReelFilters, SwipeFilters } from "@/components/swipe-reel-filters";
import { SwipeReelDetails } from "@/components/swipe-reel-details";
import { BiddingWindow } from "@/components/bidding-window";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useListings } from "@/hooks/use-listings";
import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import {
  applyPersonalizationWeights,
  getTrendingItems,
  loadPersonalizationData,
  trackViewedItem,
} from "@/lib/swipe-algorithm";
import type { Listing } from "@shared/schema";

const ITEMS_PER_PAGE = 20;

export default function SwipePage() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [, navigate] = useLocation();

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState<SwipeFilters>({
    categories: [],
    saleType: 'all',
    conditions: [],
  });
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Listing[]>([]);
  const [processedItems, setProcessedItems] = useState<Listing[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [biddingOpen, setBiddingOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isAnySheetOpen = detailsOpen || biddingOpen;

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
  }, [listingsData, page, hasUserPreferences, personalizationData]);

  // Reset when filters change
  useEffect(() => {
    setCurrentIndex(0);
    setPage(1);
    setAllItems([]);
    setProcessedItems([]);
  }, [filters]);

  // Infinite scroll - load more when reaching end
  useEffect(() => {
    if (currentIndex >= processedItems.length - 3 && !isLoading) {
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

  const handleBuyNow = async (listing: Listing) => {
    if (!user) {
      toast({
        title: t("loginRequired"),
        description: language === "ar"
          ? "يجب عليك تسجيل الدخول للشراء"
          : "دەبێت بچیتە ژوورەوە بۆ کڕین",
        variant: "destructive",
      });
      navigate(`/signin?redirect=/swipe`);
      return;
    }

    try {
      await addToCart({ listingId: listing.id, quantity: 1 });
      toast({
        title: language === "ar" ? "تم إضافة المنتج للسلة" : "بەرهەم زیادکرا بۆ سەبەتە",
        description: language === "ar" 
          ? "سيتم توجيهك لإتمام الشراء..." 
          : "دەگوازرێیتەوە بۆ تەواوکردنی کڕین...",
      });
      navigate("/checkout");
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleShare = (listing: Listing) => {
    const url = `${window.location.origin}/product/${listing.id}`;
    const text = `${listing.title} - ${listing.price.toLocaleString()} د.ع`;

    if (navigator.share) {
      navigator.share({ title: listing.title, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: language === "ar" ? "تم النسخ" : "کۆپی کرا",
        description: language === "ar" ? "تم نسخ رابط المنتج" : "لینکی بەرهەم کۆپی کرا",
      });
    }
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

  // Loading state
  if (isLoading && processedItems.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {language === "ar" ? "جاري التحميل..." : "بارکردن..."}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen px-4">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {language === "ar" ? "حدث خطأ" : "هەڵەیەک ڕوویدا"}
            </h2>
            <p className="text-muted-foreground mb-4">
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
      </Layout>
    );
  }

  // Empty state
  if (processedItems.length === 0) {
    return (
      <Layout>
        <SwipeReelFilters filters={filters} onFiltersChange={setFilters} />
        <div className="flex items-center justify-center h-[calc(100vh-120px)] px-4">
          <div className="text-center">
            <p className="text-xl font-bold mb-2">
              {language === "ar" ? "لا توجد منتجات" : "هیچ بەرهەمێک نییە"}
            </p>
            <p className="text-muted-foreground mb-4">
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
      </Layout>
    );
  }

  const currentListing = processedItems[currentIndex];

  return (
    <Layout>
      {/* Filters */}
      <SwipeReelFilters filters={filters} onFiltersChange={setFilters} />

      {/* Swipe Container */}
      <div
        ref={containerRef}
        className="relative h-[calc(100vh-120px)] overflow-hidden bg-black"
        style={{ touchAction: 'none' }}
      >
        <AnimatePresence mode="wait">
          {visibleItems.map(({ item, actualIndex }) => (
            actualIndex === currentIndex && (
              <motion.div
                key={item.id}
                className="absolute inset-0"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <SwipeReelItem
                  listing={item}
                  isActive={actualIndex === currentIndex}
                  onDetailsOpen={() => handleDetailsOpen(item)}
                  onBidOpen={() => handleBidOpen(item)}
                  onBuyNow={() => handleBuyNow(item)}
                  onShare={() => handleShare(item)}
                />
              </motion.div>
            )
          ))}
        </AnimatePresence>

        {/* Progress Indicator */}
        <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-3 py-1 rounded-full z-20">
          {currentIndex + 1} / {processedItems.length}
        </div>
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
    </Layout>
  );
}
