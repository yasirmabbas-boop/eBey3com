import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useListings } from "@/hooks/use-listings";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  Search, 
  Watch, 
  Smartphone, 
  Shirt, 
  Armchair, 
  Car, 
  Home, 
  Package,
  Filter,
  SlidersHorizontal,
  Gavel,
  ShoppingBag,
  MapPin,
  X,
  ArrowUpDown,
  Check,
  Eye,
  LayoutGrid
} from "lucide-react";
import { AuctionCountdown } from "@/components/auction-countdown";
import { CategoryCarousel } from "@/components/category-carousel";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductGridSkeleton } from "@/components/optimized-image";
import { EmptySearchState } from "@/components/empty-state";
import { useLanguage } from "@/lib/i18n";
import type { Listing } from "@shared/schema";

const CATEGORIES = [
  { id: "ساعات", nameAr: "ساعات", nameKu: "کاتژمێر", icon: Watch },
  { id: "إلكترونيات", nameAr: "إلكترونيات", nameKu: "ئەلیکترۆنیات", icon: Smartphone },
  { id: "ملابس", nameAr: "ملابس", nameKu: "جلوبەرگ", icon: Shirt },
  { id: "تحف وأثاث", nameAr: "تحف وأثاث", nameKu: "کەلوپەل", icon: Armchair },
  { id: "سيارات", nameAr: "سيارات", nameKu: "ئۆتۆمبێل", icon: Car },
  { id: "عقارات", nameAr: "عقارات", nameKu: "خانوبەرە", icon: Home },
  { id: "أخرى", nameAr: "أخرى", nameKu: "تر", icon: Package },
];

const CONDITIONS = [
  { id: "New", labelAr: "جديد", labelKu: "نوێ", aliases: ["New", "جديد"] },
  { id: "Vintage", labelAr: "فينتاج / أنتيك", labelKu: "ڤینتەیج / کۆن", aliases: ["Vintage", "فينتاج", "أنتيك"] },
  { id: "Used - Like New", labelAr: "شبه جديد", labelKu: "وەک نوێ", aliases: ["Used - Like New", "شبه جديد"] },
  { id: "Used - Good", labelAr: "مستعمل - جيد", labelKu: "بەکارهاتوو - باش", aliases: ["Used - Good", "جيد", "مستعمل"] },
  { id: "Used - Fair", labelAr: "مستعمل - مقبول", labelKu: "بەکارهاتوو - قبوڵ", aliases: ["Used - Fair", "مقبول"] },
];

const CITIES = [
  { id: "بغداد", nameAr: "بغداد", nameKu: "بەغدا" },
  { id: "البصرة", nameAr: "البصرة", nameKu: "بەسرە" },
  { id: "أربيل", nameAr: "أربيل", nameKu: "هەولێر" },
  { id: "السليمانية", nameAr: "السليمانية", nameKu: "سلێمانی" },
  { id: "الموصل", nameAr: "الموصل", nameKu: "مووسڵ" },
  { id: "النجف", nameAr: "النجف", nameKu: "نەجەف" },
  { id: "كربلاء", nameAr: "كربلاء", nameKu: "کەربەلا" },
  { id: "كركوك", nameAr: "كركوك", nameKu: "کەرکوک" },
  { id: "دهوك", nameAr: "دهوك", nameKu: "دهۆک" },
  { id: "الأنبار", nameAr: "الأنبار", nameKu: "ئەنبار" },
  { id: "بابل", nameAr: "بابل", nameKu: "بابل" },
  { id: "ديالى", nameAr: "ديالى", nameKu: "دیالە" },
  { id: "ذي قار", nameAr: "ذي قار", nameKu: "زیقار" },
  { id: "القادسية", nameAr: "القادسية", nameKu: "قادسیە" },
  { id: "المثنى", nameAr: "المثنى", nameKu: "موسەننا" },
  { id: "ميسان", nameAr: "ميسان", nameKu: "مەیسان" },
  { id: "صلاح الدين", nameAr: "صلاح الدين", nameKu: "سەلاحەددین" },
  { id: "واسط", nameAr: "واسط", nameKu: "واسط" },
  { id: "نينوى", nameAr: "نينوى", nameKu: "نەینەوا" },
];

const SORT_OPTIONS = [
  { value: "relevance", labelAr: "الأكثر صلة", labelKu: "پەیوەندیدارترین" },
  { value: "newest", labelAr: "الأحدث", labelKu: "نوێترین" },
  { value: "price_low", labelAr: "السعر: من الأقل للأعلى", labelKu: "نرخ: لە کەمەوە بۆ زۆر" },
  { value: "price_high", labelAr: "السعر: من الأعلى للأقل", labelKu: "نرخ: لە زۆرەوە بۆ کەم" },
  { value: "ending_soon", labelAr: "ينتهي قريباً", labelKu: "بە زووی تەواو دەبێت" },
  { value: "most_bids", labelAr: "الأكثر مزايدة", labelKu: "زۆرترین مزایدە" },
];

function calculateRelevanceScore(product: Listing, query: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  let score = 0;
  
  const title = (product.title || "").toLowerCase();
  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 80;
  else if (title.includes(q)) score += 60;
  
  const tags = product.tags || [];
  if (tags.some((tag: string) => tag.toLowerCase() === q)) score += 50;
  else if (tags.some((tag: string) => tag.toLowerCase().includes(q))) score += 30;
  
  if ((product.category || "").toLowerCase().includes(q)) score += 20;
  if ((product.description || "").toLowerCase().includes(q)) score += 10;
  
  score += ((product as any).viewCount || 0) * 0.01;
  score += ((product as any).totalBids || 0) * 0.5;
  
  return score;
}

interface FilterState {
  category: string | null;
  conditions: string[];
  saleTypes: string[];
  cities: string[];
  priceMin: string;
  priceMax: string;
  includeSold: boolean;
}

export default function SearchPage() {
  const { language, t } = useLanguage();
  const [location] = useLocation();
  const searchString = useSearch();
  
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const categoryParam = params.get("category");
  const searchQuery = params.get("q");
  const sellerIdParam = params.get("sellerId");
  const saleTypeParam = params.get("saleType");
  const exchangeParam = params.get("exchange");
  
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    category: categoryParam,
    conditions: [],
    saleTypes: [],
    cities: [],
    priceMin: "",
    priceMax: "",
    includeSold: false,
  });
  
  const [draftFilters, setDraftFilters] = useState<FilterState>(appliedFilters);
  const [sortBy, setSortBy] = useState(searchQuery ? "relevance" : "newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [mergedListings, setMergedListings] = useState<Listing[]>([]);

  useEffect(() => {
    console.log('[DEBUG-A] useEffect1 triggered', { categoryParam, searchQuery });
    // #region agent log
    fetch('http://localhost:7242/ingest/005f27f0-13ae-4477-918f-9d14680f3cb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search.tsx:useEffect1',message:'init-filters-from-params',data:{categoryParam,searchQuery},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const freshFilters: FilterState = {
      category: categoryParam,
      conditions: [],
      saleTypes: [],
      cities: [],
      priceMin: "",
      priceMax: "",
      includeSold: false,
    };
    setAppliedFilters(freshFilters);
    setDraftFilters(freshFilters);
    setSortBy(searchQuery ? "relevance" : "newest");
    // Note: page reset and mergedListings reset handled by the appliedFilters effect
  }, [searchQuery, categoryParam]);

  const ITEMS_PER_PAGE = 20;

  // Determine saleType array: use appliedFilters.saleTypes if available, otherwise fall back to saleTypeParam
  const saleTypes = appliedFilters.saleTypes.length
    ? appliedFilters.saleTypes
    : saleTypeParam
      ? [saleTypeParam]
      : [];

  // Use the standardized useListings hook for consistent data fetching and caching
  const { data: listingsData, isLoading, isFetching } = useListings({
    sellerId: sellerIdParam || undefined,
    limit: ITEMS_PER_PAGE,
    page,
    category: appliedFilters.category || undefined,
    includeSold: appliedFilters.includeSold,
    q: searchQuery || undefined,
    minPrice: appliedFilters.priceMin || undefined,
    maxPrice: appliedFilters.priceMax || undefined,
    condition: appliedFilters.conditions.length > 0 ? appliedFilters.conditions : undefined,
    saleType: saleTypes.length > 0 ? saleTypes : undefined,
    city: appliedFilters.cities.length > 0 ? appliedFilters.cities : undefined,
  });

  useEffect(() => {
    // #region agent log
    fetch('http://localhost:7242/ingest/005f27f0-13ae-4477-918f-9d14680f3cb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search.tsx:loading-state',message:'loading-flags',data:{isLoading,isFetching,hasListingsData:!!listingsData?.listings,listingsCount:listingsData?.listings?.length,category:appliedFilters.category,page},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H8'})}).catch(()=>{});
    // #endregion
  }, [isLoading, isFetching, listingsData?.listings?.length, appliedFilters.category, page]);

  useEffect(() => {
    console.log('[DEBUG-D] useEffect3 - update mergedListings', { 
      hasListingsData: !!listingsData?.listings, 
      listingsCount: listingsData?.listings?.length, 
      page,
      firstListingId: listingsData?.listings?.[0]?.id,
      firstListingIsActive: listingsData?.listings?.[0]?.isActive,
      firstListingQuantitySold: listingsData?.listings?.[0]?.quantitySold,
      firstListingQuantityAvailable: listingsData?.listings?.[0]?.quantityAvailable
    });
    // #region agent log
    fetch('http://localhost:7242/ingest/005f27f0-13ae-4477-918f-9d14680f3cb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search.tsx:update-merged',message:'update-mergedListings',data:{page,hasListingsData:!!listingsData?.listings,listingsCount:listingsData?.listings?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    if (!listingsData?.listings) {
      console.log('[SEARCH] No listings data to merge');
      return;
    }
    if (page === 1) {
      // Store page 1 data for when pagination starts
      console.log('[SEARCH] Setting page 1 listings:', listingsData.listings.length);
      setMergedListings(listingsData.listings);
    } else {
      // Append new pages to existing data
      console.log('[SEARCH] Appending page', page, 'listings:', listingsData.listings.length);
      setMergedListings((prev) => [...prev, ...listingsData.listings]);
    }
  }, [listingsData, page]);

  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);
  
  const { data: sellerInfo } = useQuery({
    queryKey: ["/api/users", sellerIdParam],
    queryFn: async () => {
      if (!sellerIdParam) return null;
      const res = await fetch(`/api/users/${sellerIdParam}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!sellerIdParam,
  });
  
  // Use data directly from React Query for page 1, merged state only for infinite scroll
  const listings: Listing[] = page === 1 
    ? (listingsData?.listings || [])
    : mergedListings.length > 0 ? mergedListings : (listingsData?.listings || []);
  console.log('[DEBUG-E] listings computed', { 
    page, 
    listingsDataCount: listingsData?.listings?.length, 
    mergedListingsLen: mergedListings.length, 
    finalListingsLen: listings.length, 
    isLoading,
    appliedIncludeSold: appliedFilters.includeSold,
    draftIncludeSold: draftFilters.includeSold
  });

  const allProducts = useMemo(() => {
    return listings;
  }, [listings]);

  const filteredProducts = useMemo(() => {
    const sortedProducts = [...allProducts];
    switch (sortBy) {
      case "relevance":
        if (searchQuery) {
          sortedProducts.sort((a, b) => 
            calculateRelevanceScore(b, searchQuery) - calculateRelevanceScore(a, searchQuery)
          );
        } else {
          sortedProducts.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
        }
        break;
      case "price_low":
        sortedProducts.sort((a, b) => (a.currentBid || a.price) - (b.currentBid || b.price));
        break;
      case "price_high":
        sortedProducts.sort((a, b) => (b.currentBid || b.price) - (a.currentBid || a.price));
        break;
      case "ending_soon":
        sortedProducts.sort((a, b) => {
          if (!a.auctionEndTime) return 1;
          if (!b.auctionEndTime) return -1;
          return new Date(a.auctionEndTime).getTime() - new Date(b.auctionEndTime).getTime();
        });
        break;
      case "most_bids":
        sortedProducts.sort((a, b) => (b.totalBids || 0) - (a.totalBids || 0));
        break;
      case "newest":
      default:
        sortedProducts.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return sortedProducts;
  }, [allProducts, searchQuery, sortBy]);

  useEffect(() => {
    // #region agent log
    fetch('http://localhost:7242/ingest/005f27f0-13ae-4477-918f-9d14680f3cb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search.tsx:filteredProducts',message:'filtered-products-counts',data:{allProductsCount:allProducts.length,filteredProductsCount:filteredProducts.length,sortBy,category:appliedFilters.category,searchQuery,isLoading,isFetching},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
  }, [allProducts.length, filteredProducts.length, sortBy, appliedFilters.category, searchQuery, isLoading, isFetching]);

  const displayedProducts = filteredProducts;
  const hasMoreProducts = listingsData?.pagination?.hasMore ?? false;
  const remainingCount = Math.max(
    0,
    (listingsData?.pagination?.total ?? filteredProducts.length) - filteredProducts.length
  );

  const draftFilteredProducts = useMemo(() => {
    return allProducts;
  }, [allProducts]);

  const getCategoryCount = (categoryId: string | null) => {
    return allProducts.filter(p => !categoryId || p.category === categoryId).length;
  };

  const getConditionCount = (conditionId: string) => {
    const cond = CONDITIONS.find(c => c.id === conditionId);
    const aliases = cond ? cond.aliases.map(a => a.toLowerCase()) : [conditionId.toLowerCase()];
    return allProducts.filter(p => {
      const productCondition = (p.condition || "").toLowerCase();
      return aliases.some(alias => productCondition.includes(alias));
    }).length;
  };

  const getSaleTypeCount = (saleType: string) => {
    return allProducts.filter(p => p.saleType === saleType).length;
  };

  const getCityCount = (city: string) => {
    return allProducts.filter(p => (p.city || "").includes(city)).length;
  };

  const toggleDraftCondition = (condition: string) => {
    setDraftFilters(prev => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter(c => c !== condition)
        : [...prev.conditions, condition]
    }));
  };

  const toggleDraftSaleType = (saleType: string) => {
    setDraftFilters(prev => ({
      ...prev,
      saleTypes: prev.saleTypes.includes(saleType)
        ? prev.saleTypes.filter(t => t !== saleType)
        : [...prev.saleTypes, saleType]
    }));
  };

  const toggleDraftCity = (city: string) => {
    setDraftFilters(prev => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter(c => c !== city)
        : [...prev.cities, city]
    }));
  };

  const applyFilters = () => {
    console.log('[SEARCH] Applying filters:', {
      draftFilters,
      prevAppliedFilters: appliedFilters
    });
    setAppliedFilters(draftFilters);
    setPage(1);
    setMergedListings([]); // Clear merged listings when filters change
    setIsFilterOpen(false);
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy]);

  // Auto-clear includeSold when search query is cleared
  useEffect(() => {
    if (!searchQuery && (appliedFilters.includeSold || draftFilters.includeSold)) {
      console.log('[SEARCH] Auto-clearing includeSold because search query is empty');
      setAppliedFilters(prev => ({ ...prev, includeSold: false }));
      setDraftFilters(prev => ({ ...prev, includeSold: false }));
    }
  }, [searchQuery]);

  const clearAllFilters = () => {
    const cleared: FilterState = {
      category: null,
      conditions: [],
      saleTypes: [],
      cities: [],
      priceMin: "",
      priceMax: "",
      includeSold: false,
    };
    setDraftFilters(cleared);
  };

  // Reset pagination when filters change - use primitive deps to avoid unnecessary runs
  const filterKey = `${appliedFilters.category}-${appliedFilters.includeSold}-${appliedFilters.priceMin}-${appliedFilters.priceMax}-${appliedFilters.conditions.join(',')}-${appliedFilters.saleTypes.join(',')}-${appliedFilters.cities.join(',')}`;
  useEffect(() => {
    console.log('[DEBUG-F] useEffect2 - reset pagination', { filterKey, searchQuery, saleTypeParam, sellerIdParam });
    setPage(1);
    setMergedListings([]);
  }, [filterKey, searchQuery, saleTypeParam, sellerIdParam]);

  const openFilters = () => {
    setDraftFilters(appliedFilters);
    setIsFilterOpen(true);
  };

  const activeFiltersCount = [
    appliedFilters.category ? 1 : 0,
    appliedFilters.conditions.length,
    appliedFilters.saleTypes.length,
    appliedFilters.cities.length,
    appliedFilters.priceMin || appliedFilters.priceMax ? 1 : 0,
    appliedFilters.includeSold ? 1 : 0, // Count includeSold as an active filter
  ].reduce((a, b) => a + b, 0);
  
  console.log('[SEARCH] Active filters count:', activeFiltersCount, 'includeSold:', appliedFilters.includeSold);

  const getPageTitle = () => {
    if (searchQuery) return `${t("searchResults")}: "${searchQuery}"`;
    if (appliedFilters.category) {
      const cat = CATEGORIES.find(c => c.id === appliedFilters.category);
      return cat ? (language === "ar" ? cat.nameAr : cat.nameKu) : appliedFilters.category;
    }
    return t("allProducts");
  };

  const quickToggleSaleType = (saleType: string) => {
    setAppliedFilters(prev => ({
      ...prev,
      saleTypes: prev.saleTypes.includes(saleType)
        ? prev.saleTypes.filter(t => t !== saleType)
        : [saleType]
    }));
  };

  const quickToggleCategory = (category: string | null) => {
    // #region agent log
    fetch('http://localhost:7242/ingest/005f27f0-13ae-4477-918f-9d14680f3cb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'search.tsx:quickToggleCategory',message:'category-toggle',data:{current:appliedFilters.category,next:appliedFilters.category === category ? null : category},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H9'})}).catch(()=>{});
    // #endregion
    setAppliedFilters(prev => ({
      ...prev,
      category: prev.category === category ? null : category
    }));
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Seller Store Header */}
        {sellerIdParam && sellerInfo && (
          <div className="bg-gradient-to-l from-primary via-[#1b2b5a] to-[#0f172a] text-white rounded-xl p-6 mb-6 shadow-[var(--shadow-2)]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                {sellerInfo.displayName?.charAt(0) || sellerInfo.username?.charAt(0) || (language === "ar" ? "م" : "د")}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{t("store")} {sellerInfo.displayName || sellerInfo.username}</h2>
                <div className="flex items-center gap-4 mt-1 text-blue-100 text-sm">
                  {sellerInfo.totalSales > 0 && (
                    <span>{sellerInfo.totalSales} {t("salesCount")}</span>
                  )}
                  {sellerInfo.ratingCount > 0 && (
                    <span>{Math.round((sellerInfo.rating || 0) * 20)}% {t("positiveRating")}</span>
                  )}
                  <span>{filteredProducts.length} {t("product")}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border/60">
          <span className="text-sm font-medium text-muted-foreground ml-2">{t("quickFilter")}</span>
          <Button
            variant={appliedFilters.saleTypes.includes("auction") ? "default" : "outline"}
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => quickToggleSaleType("auction")}
            data-testid="quick-filter-auction"
          >
            <Gavel className="h-3.5 w-3.5" />
            {t("auctions")}
          </Button>
          <Button
            variant={appliedFilters.saleTypes.includes("fixed") ? "default" : "outline"}
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => quickToggleSaleType("fixed")}
            data-testid="quick-filter-fixed"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {t("buyNow")}
          </Button>
          <div className="h-4 w-px bg-border/70 mx-1" />
          {CATEGORIES.slice(0, 4).map((cat) => (
            <Button
              key={cat.id}
              variant={appliedFilters.category === cat.id ? "default" : "outline"}
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => quickToggleCategory(cat.id)}
              data-testid={`quick-filter-${cat.id}`}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {language === "ar" ? cat.nameAr : cat.nameKu}
            </Button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="search-title">
              {getPageTitle()}
            </h1>
            <p className="text-muted-foreground text-sm">
              {filteredProducts.length} {t("productAvailable")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/swipe${categoryParam ? `?category=${categoryParam}` : ""}${filteredProducts[0]?.id ? `${categoryParam ? "&" : "?"}id=${filteredProducts[0].id}` : ""}`}>
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0"
                data-testid="button-swipe-view"
                title={t("browseMode")}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </Link>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 text-sm soft-border" data-testid="select-sort">
                <ArrowUpDown className="h-3.5 w-3.5 ml-1" />
                <SelectValue placeholder={t("sortBy")} />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {language === "ar" ? option.labelAr : option.labelKu}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={openFilters}
                  className="gap-1.5"
                  data-testid="open-filters"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {t("moreFilters")}
                  {activeFiltersCount > 0 && (
                    <Badge className="bg-primary text-white text-xs px-1.5">{activeFiltersCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col" dir="rtl">
                <SheetHeader className="p-4 border-b border-border/60 bg-muted/60">
                  <SheetTitle className="flex items-center gap-2 text-xl">
                    <Filter className="h-5 w-5 text-primary" />
                    {t("filters")}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    {draftFilteredProducts.length} {t("productAvailable")}
                  </p>
                </SheetHeader>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-6">
                    {(draftFilters.category || draftFilters.conditions.length > 0 || draftFilters.saleTypes.length > 0 || draftFilters.cities.length > 0 || draftFilters.priceMin || draftFilters.priceMax) && (
                      <Button 
                        variant="outline" 
                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                        onClick={clearAllFilters}
                        data-testid="clear-all-filters"
                      >
                        <X className="h-4 w-4 ml-2" />
                        {t("clearAllFilters")}
                      </Button>
                    )}

                    <div className="bg-card p-4 rounded-lg soft-border elev-1">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        {t("categoriesLabel")}
                      </h3>
                      <div className="space-y-2">
                        <Button
                          variant={draftFilters.category === null ? "default" : "ghost"}
                          className="w-full justify-between"
                          onClick={() => setDraftFilters(prev => ({ ...prev, category: null }))}
                          data-testid="filter-category-all"
                        >
                          <span>{t("allCategories")}</span>
                          <Badge variant="secondary" className="text-xs">{getCategoryCount(null)}</Badge>
                        </Button>
                        {CATEGORIES.map((cat) => (
                          <Button
                            key={cat.id}
                            variant={draftFilters.category === cat.id ? "default" : "ghost"}
                            className="w-full justify-between"
                            onClick={() => setDraftFilters(prev => ({ ...prev, category: cat.id }))}
                            data-testid={`filter-category-${cat.id}`}
                          >
                            <span className="flex items-center gap-2">
                              <cat.icon className="h-4 w-4" />
                              {language === "ar" ? cat.nameAr : cat.nameKu}
                            </span>
                            <Badge variant="secondary" className="text-xs">{getCategoryCount(cat.id)}</Badge>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-card p-4 rounded-lg soft-border elev-1">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Gavel className="h-4 w-4" />
                        {t("saleTypeLabel")}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox 
                              id="auction" 
                              checked={draftFilters.saleTypes.includes("auction")}
                              onCheckedChange={() => toggleDraftSaleType("auction")}
                              data-testid="filter-sale-auction"
                            />
                            <Label htmlFor="auction" className="flex items-center gap-2 cursor-pointer">
                              <Gavel className="h-4 w-4 text-primary" />
                              {t("auction")}
                            </Label>
                          </div>
                          <Badge variant="outline" className="text-xs">{getSaleTypeCount("auction")}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox 
                              id="fixed" 
                              checked={draftFilters.saleTypes.includes("fixed")}
                              onCheckedChange={() => toggleDraftSaleType("fixed")}
                              data-testid="filter-sale-fixed"
                            />
                            <Label htmlFor="fixed" className="flex items-center gap-2 cursor-pointer">
                              <ShoppingBag className="h-4 w-4 text-green-600" />
                              {t("fixedPrice")}
                            </Label>
                          </div>
                          <Badge variant="outline" className="text-xs">{getSaleTypeCount("fixed")}</Badge>
                        </div>
                        <div className="border-t pt-3 mt-3">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox 
                              id="includeSold" 
                              checked={draftFilters.includeSold}
                              onCheckedChange={(checked) => setDraftFilters(prev => ({ ...prev, includeSold: !!checked }))}
                              data-testid="filter-include-sold"
                              disabled={!searchQuery}
                            />
                            <Label 
                              htmlFor="includeSold" 
                              className={`flex items-center gap-2 cursor-pointer ${!searchQuery ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
                            >
                              {t("showSold")}
                            </Label>
                          </div>
                          {!searchQuery && (
                            <p className="text-xs text-muted-foreground/70 mt-1 mr-6">
                              {language === "ar" 
                                ? "متاح فقط عند البحث" 
                                : "تەنها لە کاتی گەڕاندا بەردەستە"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        {t("conditionLabel")}
                      </h3>
                      <div className="space-y-3">
                        {CONDITIONS.map((condition) => (
                          <div key={condition.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <Checkbox 
                                id={condition.id}
                                checked={draftFilters.conditions.includes(condition.id)}
                                onCheckedChange={() => toggleDraftCondition(condition.id)}
                                data-testid={`filter-condition-${condition.id}`}
                              />
                              <Label htmlFor={condition.id} className="cursor-pointer">{language === "ar" ? condition.labelAr : condition.labelKu}</Label>
                            </div>
                            <Badge variant="outline" className="text-xs">{getConditionCount(condition.id)}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        {t("priceRange")}
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">{t("from")}</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={draftFilters.priceMin}
                              onChange={(e) => setDraftFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                              className="mt-1"
                              data-testid="filter-price-min"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">{t("to")}</Label>
                            <Input
                              type="number"
                              placeholder="∞"
                              value={draftFilters.priceMax}
                              onChange={(e) => setDraftFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                              className="mt-1"
                              data-testid="filter-price-max"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">{t("inIraqiDinar")}</p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {t("cityLabel")}
                      </h3>
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {CITIES.map((city) => (
                          <div key={city.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <Checkbox 
                                id={`city-${city.id}`}
                                checked={draftFilters.cities.includes(city.id)}
                                onCheckedChange={() => toggleDraftCity(city.id)}
                                data-testid={`filter-city-${city.id}`}
                              />
                              <Label htmlFor={`city-${city.id}`} className="cursor-pointer">{language === "ar" ? city.nameAr : city.nameKu}</Label>
                            </div>
                            <Badge variant="outline" className="text-xs">{getCityCount(city.id)}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <SheetFooter className="p-4 pb-20 border-t bg-gray-50">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6"
                    onClick={applyFilters}
                    data-testid="apply-filters"
                  >
                    <Check className="h-5 w-5 ml-2" />
                    {t("applyFilters")} ({draftFilteredProducts.length} {t("product")})
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {appliedFilters.category && (
              <Badge variant="secondary" className="gap-1 px-3 py-1">
                {(() => {
                  const cat = CATEGORIES.find(c => c.id === appliedFilters.category);
                  return cat ? (language === "ar" ? cat.nameAr : cat.nameKu) : appliedFilters.category;
                })()}
                <button onClick={() => setAppliedFilters(prev => ({ ...prev, category: null }))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {appliedFilters.saleTypes.map(type => (
              <Badge key={type} variant="secondary" className="gap-1 px-3 py-1">
                {type === "auction" ? t("auction") : t("fixedPrice")}
                <button onClick={() => setAppliedFilters(prev => ({ ...prev, saleTypes: prev.saleTypes.filter(t => t !== type) }))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {appliedFilters.conditions.map(cond => {
              const condition = CONDITIONS.find(c => c.id === cond);
              return (
                <Badge key={cond} variant="secondary" className="gap-1 px-3 py-1">
                  {condition ? (language === "ar" ? condition.labelAr : condition.labelKu) : cond}
                  <button onClick={() => setAppliedFilters(prev => ({ ...prev, conditions: prev.conditions.filter(c => c !== cond) }))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            {appliedFilters.cities.map(cityId => {
              const city = CITIES.find(c => c.id === cityId);
              return (
                <Badge key={cityId} variant="secondary" className="gap-1 px-3 py-1">
                  {city ? (language === "ar" ? city.nameAr : city.nameKu) : cityId}
                  <button onClick={() => setAppliedFilters(prev => ({ ...prev, cities: prev.cities.filter(c => c !== cityId) }))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            {(appliedFilters.priceMin || appliedFilters.priceMax) && (
              <Badge variant="secondary" className="gap-1 px-3 py-1">
                {t("priceLabel")} {appliedFilters.priceMin || "0"} - {appliedFilters.priceMax || "∞"}
                <button onClick={() => setAppliedFilters(prev => ({ ...prev, priceMin: "", priceMax: "" }))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {appliedFilters.includeSold && (
              <Badge variant="secondary" className="gap-1 px-3 py-1 bg-gray-200">
                {t("showSold")}
                <button onClick={() => setAppliedFilters(prev => ({ ...prev, includeSold: false }))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-600"
              onClick={() => setAppliedFilters({ category: null, conditions: [], saleTypes: [], cities: [], priceMin: "", priceMax: "", includeSold: false })}
            >
              {t("clearAll")}
            </Button>
          </div>
        )}

        <div>
          {isLoading ? (
            <ProductGridSkeleton count={12} />
          ) : filteredProducts.length === 0 ? (
            // Only show empty state if user has applied filters or search query
            // Otherwise, this shouldn't happen as we should always have listings
            (activeFiltersCount > 0 || searchQuery) ? (
              <EmptySearchState 
                query={searchQuery || undefined}
                onClearFilters={activeFiltersCount > 0 ? () => setAppliedFilters({ category: null, conditions: [], saleTypes: [], cities: [], priceMin: "", priceMax: "", includeSold: false }) : undefined}
                language={language}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {language === "ar" ? "لا توجد منتجات متاحة حالياً" : "هیچ بەرهەمێک بەردەست نییە لە ئێستادا"}
                </p>
                <Link href="/">
                  <Button variant="outline">
                    {language === "ar" ? "العودة للرئيسية" : "گەڕانەوە بۆ سەرەکی"}
                  </Button>
                </Link>
              </div>
            )
          ) : (
            <div className="space-y-6">
              {/* Group products by category for carousel view */}
              {(() => {
                const productsByCategory = CATEGORIES.reduce((acc, cat) => {
                  const catProducts = displayedProducts.filter(p => p.category === cat.id);
                  if (catProducts.length > 0) {
                    acc[cat.id] = { nameAr: cat.nameAr, nameKu: cat.nameKu, icon: cat.icon, products: catProducts };
                  }
                  return acc;
                }, {} as Record<string, { nameAr: string; nameKu: string; icon: any; products: Listing[] }>);

                const categoriesWithProducts = Object.entries(productsByCategory);

                if (categoriesWithProducts.length === 0) {
                  return (
                    <EmptySearchState 
                      query={searchQuery || undefined}
                      language={language}
                    />
                  );
                }

                return categoriesWithProducts.map(([catId, { nameAr, nameKu, icon: CatIcon, products }]) => (
                  <div key={catId} className="bg-gray-50 rounded-xl p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center bg-primary/10">
                          <CatIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </div>
                        <h3 className="text-sm sm:text-lg font-bold text-primary">{language === "ar" ? nameAr : nameKu}</h3>
                        <Badge variant="secondary" className="text-xs">{products.length}</Badge>
                      </div>
                    </div>
                    
                    <CategoryCarousel>
                      {products.map((product) => (
                        <Link key={product.id} href={`/product/${product.id}`} className="snap-start">
                          <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-gray-200 bg-white flex-shrink-0 w-36 sm:w-56 active:scale-[0.98]" data-testid={`search-result-${product.id}`}>
                            <div className="relative aspect-square overflow-hidden bg-gray-100">
                              <img 
                                src={product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"} 
                                alt={product.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex flex-col gap-1">
                                {!product.isActive && (
                                  <Badge className="bg-gray-700 text-white border-0 text-[9px] sm:text-xs shadow-md">
                                    {t("sold")}
                                  </Badge>
                                )}
                                {product.saleType === "auction" ? (
                                  <Badge className="bg-purple-600 text-white border-0 text-[9px] sm:text-xs shadow-md">
                                    {t("auction")}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-600 text-white border-0 text-[9px] sm:text-xs shadow-md">
                                    {t("buyNow")}
                                  </Badge>
                                )}
                              </div>
                              <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
                                <FavoriteButton listingId={product.id} size="sm" />
                              </div>
                              {!product.isActive && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <span className="text-white font-bold text-sm sm:text-lg bg-black/50 px-2 sm:px-4 py-1 sm:py-2 rounded-lg">{t("sold")}</span>
                                </div>
                              )}
                              {product.saleType === "auction" && product.auctionEndTime && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 sm:p-2">
                                  <div className="text-[9px] sm:text-xs text-white font-medium">
                                    <AuctionCountdown endTime={product.auctionEndTime} />
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="p-2 sm:p-3">
                              <h3 className="font-semibold text-[10px] sm:text-sm text-gray-900 line-clamp-1 group-hover:text-primary transition-colors leading-tight mb-1">
                                {product.title}
                              </h3>
                              {product.tags && product.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {product.tags.slice(0, 3).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="text-[8px] sm:text-[10px] px-1.5 py-0.5 text-muted-foreground border-border/60"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <p className="font-bold text-sm sm:text-base text-primary">
                                {(product.currentBid || product.price).toLocaleString()} <span className="text-[9px] sm:text-xs font-normal text-gray-600">د.ع</span>
                              </p>
                              <div className="flex items-center justify-between text-[9px] sm:text-xs text-gray-500 mt-1">
                                {product.city && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                    {product.city}
                                  </span>
                                )}
                                <span className="flex items-center gap-0.5">
                                  <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                  {(product as any).views || 0}
                                </span>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </CategoryCarousel>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Load More Button */}
          {!isLoading && hasMoreProducts && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                size="lg"
                onClick={handleLoadMore}
                className="px-8"
                data-testid="button-load-more"
              >
                {t("showMore")} {remainingCount > 0 ? `(${remainingCount} ${t("anotherProduct")})` : ""}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
