import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  X,
  ArrowUpDown,
  Eye,
  LayoutGrid,
  ChevronDown
} from "lucide-react";
import { AuctionCountdown } from "@/components/auction-countdown";
import { CategoryCarousel } from "@/components/category-carousel";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductGridSkeleton } from "@/components/optimized-image";
import { EmptySearchState } from "@/components/empty-state";
import { useLanguage } from "@/lib/i18n";
import { CATEGORY_SEARCH_FILTERS, SPECIFICATION_OPTIONS, SPECIFICATION_LABELS, CONDITION_LABELS, CATEGORY_KEYWORDS, getSpecLabel } from "@/lib/search-data";
import type { Listing } from "@shared/schema";

const CATEGORIES = [
  { id: "ساعات", nameAr: "ساعات", nameKu: "کاتژمێر", icon: Watch },
  { id: "إلكترونيات", nameAr: "إلكترونيات", nameKu: "ئەلیکترۆنیات", icon: Smartphone },
  { id: "ملابس", nameAr: "ملابس", nameKu: "جلوبەرگ", icon: Shirt },
  { id: "أحذية", nameAr: "أحذية", nameKu: "پێڵاو", icon: ShoppingBag },
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
  { id: "For Parts or Not Working", labelAr: "لا يعمل / لأجزاء", labelKu: "نایەوە کار / بۆ پارچەکان", aliases: ["For Parts or Not Working", "For Parts", "لا يعمل", "أجزاء"] },
];

const SORT_OPTIONS = [
  { value: "relevance", labelAr: "الأكثر صلة", labelKu: "پەیوەندیدارترین" },
  { value: "newest", labelAr: "الأحدث", labelKu: "نوێترین" },
  { value: "views", labelAr: "الأكثر مشاهدة", labelKu: "زۆرترین بینراو" },
  { value: "price_low", labelAr: "السعر: من الأقل للأعلى", labelKu: "نرخ: لە کەمەوە بۆ زۆر" },
  { value: "price_high", labelAr: "السعر: من الأعلى للأقل", labelKu: "نرخ: لە زۆرەوە بۆ کەم" },
  { value: "ending_soon", labelAr: "ينتهي قريباً", labelKu: "بە زووی تەواو دەبێت" },
  { value: "most_bids", labelAr: "الأكثر مزايدة", labelKu: "زۆرترین مزایدە" },
];

// Server-side facets response shape
interface SearchFacets {
  categories: Array<{ value: string; count: number }>;
  conditions: Array<{ value: string; count: number }>;
  saleTypes: Array<{ value: string; count: number }>;
  priceRange: { min: number; max: number };
  specFacets?: Record<string, Array<{ value: string; count: number }>>;
}

interface FilterState {
  category: string | null;
  conditions: string[];
  saleTypes: string[];
  priceMin: string;
  priceMax: string;
  includeSold: boolean;
  specs: Record<string, string[]>;
}

interface SearchSuggestionItem {
  term: string;
  category: string;
  type: "category" | "product";
}

export default function SearchPage() {
  const { language, t } = useLanguage();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const searchQuery = params.get("q");
  const sellerIdParam = params.get("sellerId");
  const exchangeParam = params.get("exchange");
  
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(() => {
    const categoryParam = params.get("category");
    let category: string | null = categoryParam;
    if (!category && searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      const exactCat = CATEGORIES.find(c => c.id === searchQuery.trim() || c.nameAr === searchQuery.trim() || c.nameKu === searchQuery.trim());
      if (exactCat) category = exactCat.id;
      else {
        for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
          if (keywords.some(kw => kw.toLowerCase() === q)) {
            category = cat;
            break;
          }
        }
      }
    }
    const conditionParam = params.getAll("condition");
    const conditions = conditionParam.length > 0 ? conditionParam : [];
    const saleTypeParam = params.getAll("saleType");
    const saleTypes = saleTypeParam.length > 0 ? saleTypeParam : [];
    const minPrice = params.get("minPrice") || "";
    const maxPrice = params.get("maxPrice") || "";
    const includeSold = params.get("includeSold") === "true";
    const specs: Record<string, string[]> = {};
    params.forEach((val, key) => {
      const match = key.match(/^specs\[(.+)\]$/);
      if (match) {
        const specKey = match[1];
        if (!specs[specKey]) specs[specKey] = [];
        specs[specKey].push(val);
      }
    });
    return {
      category,
      conditions,
      saleTypes,
      priceMin: minPrice,
      priceMax: maxPrice,
      includeSold,
      specs,
    };
  });
  const [sortBy, setSortBy] = useState(() => {
    const sortParam = params.get("sort");
    if (sortParam) return sortParam;
    return searchQuery ? "relevance" : "newest";
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sizePopoverOpen, setSizePopoverOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [mergedListings, setMergedListings] = useState<Listing[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // When URL changes (e.g. new search, back/forward), parse and update state
  useEffect(() => {
    const p = new URLSearchParams(searchString);
    const q = p.get("q");
    let category: string | null = p.get("category");
    if (!category && q) {
      const qLower = q.trim().toLowerCase();
      const exactCat = CATEGORIES.find(c => c.id === q.trim() || c.nameAr === q.trim() || c.nameKu === q.trim());
      if (exactCat) category = exactCat.id;
      else {
        for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
          if (keywords.some(kw => kw.toLowerCase() === qLower)) {
            category = cat;
            break;
          }
        }
      }
    }
    const conditions = p.getAll("condition");
    const saleTypes = p.getAll("saleType");
    const specs: Record<string, string[]> = {};
    p.forEach((val, key) => {
      const match = key.match(/^specs\[(.+)\]$/);
      if (match) {
        const specKey = match[1];
        if (!specs[specKey]) specs[specKey] = [];
        specs[specKey].push(val);
      }
    });
    setAppliedFilters({
      category,
      conditions,
      saleTypes,
      priceMin: p.get("minPrice") || "",
      priceMax: p.get("maxPrice") || "",
      includeSold: p.get("includeSold") === "true",
      specs,
    });
    const sortVal = p.get("sort");
    setSortBy(sortVal || (q ? "relevance" : "newest"));
  }, [searchString]);

  // Save search to localStorage so SmartSearch dropdown shows recent searches for all users
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      try {
        const stored = JSON.parse(localStorage.getItem("previousSearches") || "[]");
        const updated = [searchQuery.trim(), ...stored.filter((s: string) => s !== searchQuery.trim())].slice(0, 10);
        localStorage.setItem("previousSearches", JSON.stringify(updated));
      } catch (e) { /* ignore */ }
    }
  }, [searchQuery]);

  const ITEMS_PER_PAGE = 20;

  const saleTypes = appliedFilters.saleTypes;

  // Use the standardized useListings hook for consistent data fetching and caching
  const { data: listingsData, isLoading, isFetching, isError } = useListings({
    sellerId: sellerIdParam || undefined,
    limit: ITEMS_PER_PAGE,
    page,
    category: appliedFilters.category || undefined,
    includeSold: appliedFilters.includeSold,
    q: searchQuery || undefined,
    sortBy,
    minPrice: appliedFilters.priceMin || undefined,
    maxPrice: appliedFilters.priceMax || undefined,
    condition: appliedFilters.conditions.length > 0 ? appliedFilters.conditions : undefined,
    saleType: saleTypes.length > 0 ? saleTypes : undefined,
    specs: Object.keys(appliedFilters.specs).length > 0 ? appliedFilters.specs : undefined,
  });

  useEffect(() => {
    if (!listingsData?.listings) return;
    if (page === 1) {
      setMergedListings(listingsData.listings);
    } else {
      setMergedListings((prev) => [...prev, ...listingsData.listings]);
    }
  }, [listingsData, page]);

  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading && !isFetching && (listingsData?.pagination?.hasMore ?? false)) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isLoading, isFetching, listingsData?.pagination?.hasMore]);
  
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

  // Server-side facets for accurate filter counts across the entire result set
  const { data: facets } = useQuery<SearchFacets>({
    queryKey: ["/api/listings/facets", searchQuery, appliedFilters.category, appliedFilters.priceMin, appliedFilters.priceMax, appliedFilters.conditions.join(","), appliedFilters.saleTypes.join(","), appliedFilters.includeSold, sellerIdParam, JSON.stringify(appliedFilters.specs)],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (appliedFilters.category) params.append("category", appliedFilters.category);
      if (appliedFilters.priceMin) params.append("minPrice", appliedFilters.priceMin);
      if (appliedFilters.priceMax) params.append("maxPrice", appliedFilters.priceMax);
      if (appliedFilters.includeSold) params.append("includeSold", "true");
      if (sellerIdParam) params.append("sellerId", sellerIdParam);
      appliedFilters.conditions.forEach(c => params.append("condition", c));
      appliedFilters.saleTypes.forEach(s => params.append("saleType", s));
      for (const [key, values] of Object.entries(appliedFilters.specs)) {
        values.forEach(v => params.append(`specs[${key}]`, v));
      }
      const res = await fetch(`/api/listings/facets?${params.toString()}`);
      if (!res.ok) return { categories: [], conditions: [], saleTypes: [], priceRange: { min: 0, max: 0 } };
      return res.json();
    },
    staleTime: 30000,
  });
  
  const listings: Listing[] = mergedListings;

  const allProducts = useMemo(() => {
    return listings;
  }, [listings]);

  const filteredProducts = useMemo(() => allProducts, [allProducts]);

  const displayedProducts = filteredProducts;
  const hasMoreProducts = listingsData?.pagination?.hasMore ?? false;
  const remainingCount = Math.max(
    0,
    (listingsData?.pagination?.total ?? filteredProducts.length) - filteredProducts.length
  );

  const noSearchResults = !isLoading && filteredProducts.length === 0 && !!searchQuery;

  const { data: didYouMeanSuggestions = [] } = useQuery<SearchSuggestionItem[]>({
    queryKey: ["/api/search-suggestions/empty-state", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(searchQuery)}&limit=6`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: noSearchResults,
    staleTime: 30000,
  });

  const { data: fallbackListings = [] } = useQuery<Listing[]>({
    queryKey: ["/api/hot-listings/empty-state"],
    queryFn: async () => {
      const res = await fetch("/api/hot-listings?limit=6");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: noSearchResults,
    staleTime: 60000,
  });

  const didYouMeanTerms = useMemo(() => {
    if (!searchQuery) return [];
    const normalized = searchQuery.trim().toLowerCase();
    const uniq = new Set<string>();
    const terms: string[] = [];
    for (const item of didYouMeanSuggestions) {
      const term = (item.term || "").trim();
      if (!term) continue;
      if (term.toLowerCase() === normalized) continue;
      if (uniq.has(term.toLowerCase())) continue;
      uniq.add(term.toLowerCase());
      terms.push(term);
      if (terms.length >= 4) break;
    }
    return terms;
  }, [didYouMeanSuggestions, searchQuery]);

  // Server-side facet count helpers (accurate across full result set, not just loaded page)
  const getCategoryCount = (categoryId: string | null) => {
    if (!facets) return 0;
    if (!categoryId) return facets.categories.reduce((sum, c) => sum + c.count, 0);
    return facets.categories.find(c => c.value === categoryId)?.count || 0;
  };

  const getConditionCount = (conditionId: string) => {
    if (!facets) return 0;
    const cond = CONDITIONS.find(c => c.id === conditionId);
    const aliases = cond ? cond.aliases.map(a => a.toLowerCase()) : [conditionId.toLowerCase()];
    return facets.conditions
      .filter(fc => aliases.some(alias => fc.value.toLowerCase().includes(alias)))
      .reduce((sum, fc) => sum + fc.count, 0);
  };

  const getSaleTypeCount = (saleType: string) => {
    if (!facets) return 0;
    return facets.saleTypes.find(s => s.value === saleType)?.count || 0;
  };

  const toggleAppliedCondition = (condition: string) => {
    setAppliedFilters(prev => {
      const next = {
        ...prev,
        conditions: prev.conditions.includes(condition)
          ? prev.conditions.filter(c => c !== condition)
          : [...prev.conditions, condition]
      };
      pushFiltersToUrl(next, sortBy);
      return next;
    });
  };

  const toggleAppliedSaleType = (saleType: string) => {
    setAppliedFilters(prev => {
      const next = {
        ...prev,
        saleTypes: prev.saleTypes.includes(saleType)
          ? prev.saleTypes.filter(t => t !== saleType)
          : [...prev.saleTypes, saleType]
      };
      pushFiltersToUrl(next, sortBy);
      return next;
    });
  };

  const toggleAppliedSpec = (specKey: string, specValue: string) => {
    setAppliedFilters(prev => {
      const currentValues = prev.specs[specKey] || [];
      const newValues = currentValues.includes(specValue)
        ? currentValues.filter(v => v !== specValue)
        : [...currentValues, specValue];
      const newSpecs = { ...prev.specs };
      if (newValues.length === 0) {
        delete newSpecs[specKey];
      } else {
        newSpecs[specKey] = newValues;
      }
      const next = { ...prev, specs: newSpecs };
      pushFiltersToUrl(next, sortBy);
      return next;
    });
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy]);

  // Auto-clear includeSold when search query is cleared
  useEffect(() => {
    if (!searchQuery && appliedFilters.includeSold) {
      setAppliedFilters(prev => ({ ...prev, includeSold: false }));
    }
  }, [searchQuery]);

  const clearAllFilters = () => {
    const cleared: FilterState = {
      category: null,
      conditions: [],
      saleTypes: [],
      priceMin: "",
      priceMax: "",
      includeSold: false,
      specs: {},
    };
    setAppliedFilters(cleared);
    pushFiltersToUrl(cleared, sortBy);
  };

  // Reset pagination when filters change - use primitive deps to avoid unnecessary runs
  const filterKey = `${appliedFilters.category}-${appliedFilters.includeSold}-${appliedFilters.priceMin}-${appliedFilters.priceMax}-${appliedFilters.conditions.join(',')}-${appliedFilters.saleTypes.join(',')}-${JSON.stringify(appliedFilters.specs)}`;
  useEffect(() => {
    setPage(1);
    setMergedListings([]);
  }, [filterKey, searchQuery, sellerIdParam]);

  const buildFilterUrl = useCallback((filters: FilterState, sort: string) => {
    const p = new URLSearchParams();
    if (searchQuery) p.set("q", searchQuery);
    if (sellerIdParam) p.set("sellerId", sellerIdParam);
    if (filters.category) p.set("category", filters.category);
    if (sort) p.set("sort", sort);
    filters.conditions.forEach(c => p.append("condition", c));
    filters.saleTypes.forEach(s => p.append("saleType", s));
    if (filters.priceMin) p.set("minPrice", filters.priceMin);
    if (filters.priceMax) p.set("maxPrice", filters.priceMax);
    if (filters.includeSold) p.set("includeSold", "true");
    for (const [key, values] of Object.entries(filters.specs)) {
      values.forEach(v => p.append(`specs[${key}]`, v));
    }
    const query = p.toString();
    return `/search${query ? `?${query}` : ""}`;
  }, [searchQuery, sellerIdParam]);

  // Ref to skip the auto-sync replace after an explicit push already navigated
  const skipNextReplace = useRef(false);

  // Push a new history entry when a user explicitly clicks a filter/facet
  const pushFiltersToUrl = useCallback((filters: FilterState, sort: string) => {
    skipNextReplace.current = true;
    navigate(buildFilterUrl(filters, sort), { replace: false });
  }, [buildFilterUrl, navigate]);

  // Keep URL in sync via replace (no new history entry) for automatic/derived updates
  // (e.g. price input keystrokes). Skipped when pushFiltersToUrl already navigated.
  useEffect(() => {
    if (skipNextReplace.current) {
      skipNextReplace.current = false;
      return;
    }
    const url = buildFilterUrl(appliedFilters, sortBy);
    navigate(url, { replace: true });
  }, [appliedFilters, sortBy, buildFilterUrl, navigate]);

  const activeFiltersCount = [
    appliedFilters.category ? 1 : 0,
    appliedFilters.conditions.length,
    appliedFilters.saleTypes.length,
    appliedFilters.priceMin || appliedFilters.priceMax ? 1 : 0,
    appliedFilters.includeSold ? 1 : 0,
    Object.values(appliedFilters.specs).reduce((sum, vals) => sum + vals.length, 0),
  ].reduce((a, b) => a + b, 0);
  
  const getPageTitle = () => {
    if (searchQuery) return `${t("searchResults")}: "${searchQuery}"`;
    if (appliedFilters.category) {
      const cat = CATEGORIES.find(c => c.id === appliedFilters.category);
      return cat ? (language === "ar" ? cat.nameAr : cat.nameKu) : appliedFilters.category;
    }
    return t("allProducts");
  };

  const quickToggleSaleType = (saleType: string) => {
    setAppliedFilters(prev => {
      const next = {
        ...prev,
        saleTypes: prev.saleTypes.includes(saleType)
          ? prev.saleTypes.filter(t => t !== saleType)
          : [saleType]
      };
      pushFiltersToUrl(next, sortBy);
      return next;
    });
  };

  const quickToggleCategory = (category: string | null) => {
    setAppliedFilters(prev => {
      const newCategory = prev.category === category ? null : category;
      const newSpecs = { ...prev.specs };
      if (prev.category !== newCategory) {
        delete newSpecs.size;
        delete newSpecs.shoeSize;
      }
      const next = { ...prev, category: newCategory, specs: newSpecs };
      pushFiltersToUrl(next, sortBy);
      return next;
    });
  };

  const setSizeSpec = (specKey: "size" | "shoeSize", value: string | null) => {
    setAppliedFilters(prev => {
      const newSpecs = { ...prev.specs };
      delete newSpecs.size;
      delete newSpecs.shoeSize;
      if (value) newSpecs[specKey] = [value];
      const next = { ...prev, specs: newSpecs };
      pushFiltersToUrl(next, sortBy);
      return next;
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Seller Store Header */}
        {sellerIdParam && sellerInfo && (
          <div className="bg-gradient-to-l from-primary via-[#1b2b5a] to-[#0f172a] text-white rounded-xl p-6 mb-6 shadow-[var(--shadow-2)]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                {sellerInfo.displayName?.charAt(0) || sellerInfo.username?.charAt(0) || (language === "ar" ? "م" : language === "ku" ? "د" : "م")}
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

        {/* Compact Search Header */}
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/40">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate" data-testid="search-title">
              {getPageTitle()}
            </h1>
            <p className="text-muted-foreground text-[10px]">
              {filteredProducts.length} {t("productAvailable")}
            </p>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-28 h-8 text-xs soft-border" data-testid="select-sort">
              <ArrowUpDown className="h-3 w-3 ml-1" />
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
                size="sm"
                className="gap-1 h-8 px-2"
                data-testid="open-filters"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {activeFiltersCount > 0 && (
                  <Badge className="bg-primary text-white text-[10px] px-1 py-0 h-4 min-w-4">{activeFiltersCount}</Badge>
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
                    {listingsData?.pagination?.total ?? filteredProducts.length} {t("productAvailable")}
                  </p>
                </SheetHeader>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-6">
                    {(appliedFilters.category || appliedFilters.conditions.length > 0 || appliedFilters.saleTypes.length > 0 || appliedFilters.priceMin || appliedFilters.priceMax) && (
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
                          variant={appliedFilters.category === null ? "default" : "ghost"}
                          className="w-full justify-between"
                          onClick={() => {
                            const next = { ...appliedFilters, category: null, specs: {} };
                            setAppliedFilters(next);
                            pushFiltersToUrl(next, sortBy);
                          }}
                          data-testid="filter-category-all"
                        >
                          <span>{t("allCategories")}</span>
                          <Badge variant="secondary" className="text-xs">{getCategoryCount(null)}</Badge>
                        </Button>
                        {CATEGORIES.map((cat) => (
                          <Button
                            key={cat.id}
                            variant={appliedFilters.category === cat.id ? "default" : "ghost"}
                            className="w-full justify-between"
                            onClick={() => {
                              const next = { ...appliedFilters, category: cat.id, specs: appliedFilters.category !== cat.id ? {} : appliedFilters.specs };
                              setAppliedFilters(next);
                              pushFiltersToUrl(next, sortBy);
                            }}
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
                              checked={appliedFilters.saleTypes.includes("auction")}
                              onCheckedChange={() => toggleAppliedSaleType("auction")}
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
                              checked={appliedFilters.saleTypes.includes("fixed")}
                              onCheckedChange={() => toggleAppliedSaleType("fixed")}
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
                              checked={appliedFilters.includeSold}
                              onCheckedChange={(checked) => {
                                const next = { ...appliedFilters, includeSold: !!checked };
                                setAppliedFilters(next);
                                pushFiltersToUrl(next, sortBy);
                              }}
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
                              {language === "ar" ? "متاح فقط عند البحث" : language === "ku" ? "تەنها لە کاتی گەڕاندا بەردەستە" : "متاح فقط عند البحث"}
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
                                checked={appliedFilters.conditions.includes(condition.id)}
                                onCheckedChange={() => toggleAppliedCondition(condition.id)}
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
                              value={appliedFilters.priceMin}
                              onChange={(e) => setAppliedFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                              className="mt-1"
                              data-testid="filter-price-min"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">{t("to")}</Label>
                            <Input
                              type="number"
                              placeholder="∞"
                              value={appliedFilters.priceMax}
                              onChange={(e) => setAppliedFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                              className="mt-1"
                              data-testid="filter-price-max"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">{t("inIraqiDinar")}</p>
                      </div>
                    </div>

                    {appliedFilters.category && CATEGORY_SEARCH_FILTERS[appliedFilters.category] && (
                      <>
                        {CATEGORY_SEARCH_FILTERS[appliedFilters.category].map((specField) => {
                          const options = SPECIFICATION_OPTIONS[specField as keyof typeof SPECIFICATION_OPTIONS];
                          if (!options || !Array.isArray(options)) return null;
                          
                          const fieldLabel = SPECIFICATION_LABELS[specField];
                          if (!fieldLabel) return null;
                          
                          const facetCounts = facets?.specFacets?.[specField] || [];
                          const hasAnyData = facetCounts.length > 0;
                          
                          const getSpecCount = (value: string) => {
                            return facetCounts.find(f => f.value === value)?.count || 0;
                          };
                          
                          return (
                            <div key={specField} className="bg-card p-4 rounded-lg soft-border elev-1">
                              <h3 className="font-bold mb-4 flex items-center gap-2">
                                <SlidersHorizontal className="h-4 w-4" />
                                {language === "ar" ? fieldLabel.ar : fieldLabel.ku}
                              </h3>
                              <div className="space-y-3 max-h-48 overflow-y-auto">
                                {options.map((option) => {
                                  const count = getSpecCount(option.value);
                                  return (
                                    <div key={option.value} className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2 space-x-reverse">
                                        <Checkbox
                                          id={`spec-${specField}-${option.value}`}
                                          checked={(appliedFilters.specs[specField] || []).includes(option.value)}
                                          onCheckedChange={() => toggleAppliedSpec(specField, option.value)}
                                          data-testid={`filter-spec-${specField}-${option.value}`}
                                        />
                                        <Label htmlFor={`spec-${specField}-${option.value}`} className="cursor-pointer text-sm">
                                          {language === "ar" ? option.labelAr : option.labelKu}
                                        </Label>
                                      </div>
                                      {count > 0 && (
                                        <Badge variant="outline" className="text-xs">{count}</Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </ScrollArea>

                <SheetFooter className="p-4 pb-20 border-t bg-gray-50">
                  <Button 
                    className="w-full"
                    onClick={() => setIsFilterOpen(false)}
                    data-testid="close-filters"
                  >
                    {t("close")}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
        </div>

        {/* Quick Filter Chips - Sale type + Category */}
        <div className="overflow-x-auto scrollbar-hide py-2 mb-2">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => quickToggleSaleType("auction")}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                ${saleTypes.includes("auction")
                  ? "bg-orange-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                }
              `}
            >
              {language === "ar" ? "مزاد" : language === "ku" ? "مزایدە" : "مزاد"}
            </button>
            <button
              onClick={() => quickToggleSaleType("fixed")}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                ${saleTypes.includes("fixed")
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                }
              `}
            >
              {language === "ar" ? "شراء فوري" : language === "ku" ? "کڕینی خێرا" : "شراء فوري"}
            </button>
            <div className="w-px h-6 bg-border flex-shrink-0 self-center" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => quickToggleCategory(cat.id)}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                  ${appliedFilters.category === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }
              `}
            >
              {language === "ar" ? cat.nameAr : cat.nameKu}
            </button>
            ))}
            {(appliedFilters.category === "ملابس" || appliedFilters.category === "أحذية") && (
              <Popover open={sizePopoverOpen} onOpenChange={setSizePopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={`
                      flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1
                      ${(appliedFilters.specs.size?.length || appliedFilters.specs.shoeSize?.length)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }
                  `}
                    data-testid="size-filter-chip"
                  >
                    {(() => {
                      const specKey = appliedFilters.category === "ملابس" ? "size" : "shoeSize";
                      const values = appliedFilters.specs[specKey] || [];
                      const val = values[0];
                      const options = specKey === "size" ? SPECIFICATION_OPTIONS.size : SPECIFICATION_OPTIONS.shoeSize;
                      const option = val ? options?.find((o: { value: string }) => o.value === val) : null;
                      const label = option ? (language === "ar" ? option.labelAr : option.labelKu) : t("all");
                      const fieldLabel = SPECIFICATION_LABELS[specKey];
                      const fieldName = fieldLabel ? (language === "ar" ? fieldLabel.ar : fieldLabel.ku) : specKey;
                      return (
                        <>
                          {fieldName}: {label}
                          <ChevronDown className="h-3 w-3 opacity-70" />
                        </>
                      );
                    })()}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-48 p-0">
                  <ScrollArea className="max-h-60">
                    <div className="p-1">
                      <button
                        onClick={() => {
                          const specKey = appliedFilters.category === "ملابس" ? "size" : "shoeSize";
                          setSizeSpec(specKey, null);
                          setSizePopoverOpen(false);
                        }}
                        className="w-full text-start px-3 py-2 rounded-md text-sm hover:bg-muted"
                        data-testid="size-filter-any"
                      >
                        {t("all")}
                      </button>
                      {((appliedFilters.category === "ملابس" ? SPECIFICATION_OPTIONS.size : SPECIFICATION_OPTIONS.shoeSize) || []).map((option: { value: string; labelAr: string; labelKu: string }) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            const specKey = appliedFilters.category === "ملابس" ? "size" : "shoeSize";
                            setSizeSpec(specKey, option.value);
                            setSizePopoverOpen(false);
                          }}
                          className="w-full text-start px-3 py-2 rounded-md text-sm hover:bg-muted flex items-center justify-between"
                          data-testid={`size-filter-${option.value}`}
                        >
                          {language === "ar" ? option.labelAr : option.labelKu}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
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
            {Object.entries(appliedFilters.specs).map(([specKey, values]) => {
              const fieldLabel = SPECIFICATION_LABELS[specKey];
              const options = SPECIFICATION_OPTIONS[specKey as keyof typeof SPECIFICATION_OPTIONS];
              return values.map(val => {
                const option = options?.find((o: any) => o.value === val);
                const label = option ? (language === "ar" ? option.labelAr : option.labelKu) : val;
                const fieldName = fieldLabel ? (language === "ar" ? fieldLabel.ar : fieldLabel.ku) : specKey;
                return (
                  <Badge key={`${specKey}-${val}`} variant="secondary" className="gap-1 px-3 py-1">
                    {fieldName}: {label}
                    <button onClick={() => setAppliedFilters(prev => {
                      const newSpecs = { ...prev.specs };
                      newSpecs[specKey] = (newSpecs[specKey] || []).filter(v => v !== val);
                      if (newSpecs[specKey].length === 0) delete newSpecs[specKey];
                      return { ...prev, specs: newSpecs };
                    })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              });
            })}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-600"
              onClick={() => setAppliedFilters({ category: null, conditions: [], saleTypes: [], priceMin: "", priceMax: "", includeSold: false, specs: {} })}
            >
              {t("clearAll")}
            </Button>
          </div>
        )}

        <div>
          {isError ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <X className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {language === "ar" ? "حدث خطأ في تحميل النتائج" : language === "ku" ? "هەڵەیەک ڕوویدا لە بارکردنی ئەنجامەکان" : "حدث خطأ في تحميل النتائج"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {language === "ar" ? "يرجى المحاولة مرة أخرى" : language === "ku" ? "تکایە دووبارە هەوڵبدە" : "يرجى المحاولة مرة أخرى"}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                {language === "ar" ? "إعادة المحاولة" : language === "ku" ? "دووبارە هەوڵبدە" : "إعادة المحاولة"}
              </Button>
            </div>
          ) : isLoading ? (
            <ProductGridSkeleton count={12} />
          ) : filteredProducts.length === 0 ? (
            // Only show empty state if user has applied filters or search query
            // Otherwise, this shouldn't happen as we should always have listings
            (activeFiltersCount > 0 || searchQuery) ? (
              <EmptySearchState 
                query={searchQuery || undefined}
                onClearFilters={activeFiltersCount > 0 ? () => setAppliedFilters({ category: null, conditions: [], saleTypes: [], priceMin: "", priceMax: "", includeSold: false, specs: {} }) : undefined}
                language={language}
                suggestions={didYouMeanTerms}
                fallbackListings={fallbackListings}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {language === "ar" ? "لا توجد منتجات متاحة حالياً" : language === "ku" ? "هیچ بەرهەمێک بەردەست نییە لە ئێستادا" : "لا توجد منتجات متاحة حالياً"}
                </p>
                <Link href="/">
                  <Button variant="outline">
                    {language === "ar" ? "العودة للرئيسية" : language === "ku" ? "گەڕانەوە بۆ سەرەکی" : "العودة للرئيسية"}
                  </Button>
                </Link>
              </div>
            )
          ) : (
            <div>
              {/* Responsive Grid View - 2 cols mobile, 3 tablet, 4-5 desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                {displayedProducts.map((product) => {
                  const remaining = (product.quantityAvailable || 1) - (product.quantitySold || 0);
                  const showLowStockBadge = product.isActive && remaining > 0 && remaining <= 3;
                  const shippingCost = product.shippingCost || 0;
                  const shippingType = (product as any).shippingType || "seller_pays";
                  
                  return (
                    <Link key={product.id} href={`/product/${product.id}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-gray-200 bg-white active:scale-[0.98]" data-testid={`search-result-${product.id}`}>
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                          <img 
                            src={product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"} 
                            alt={product.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          {product.saleType === "auction" && product.isActive && (
                            <Badge className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-primary text-white border-0 text-[9px] sm:text-xs shadow-md">
                              مزاد
                            </Badge>
                          )}
                          {/* Favorite Button - Top Left */}
                          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
                            <FavoriteButton listingId={product.id} size="sm" />
                          </div>
                          {!product.isActive && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span className="text-white font-bold text-xs sm:text-sm bg-black/50 px-2 py-1 rounded-lg">{t("sold")}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-2 sm:p-3">
                          <h3 className="font-normal text-sm sm:text-base text-gray-700 line-clamp-2 group-hover:text-primary transition-colors leading-tight mb-1.5">
                            {product.title}
                          </h3>
                          {(() => {
                            const specs = (product as any).specifications as Record<string, string> | undefined;
                            const sizeVal = specs?.size || specs?.shoeSize;
                            const sizeSpecKey = specs?.size ? "size" : "shoeSize";
                            const aspects = [
                              product.condition && (CONDITION_LABELS[product.condition] ? (language === "ar" ? CONDITION_LABELS[product.condition].ar : CONDITION_LABELS[product.condition].ku) : product.condition),
                              sizeVal ? getSpecLabel(sizeSpecKey, sizeVal, language) : undefined,
                              specs?.color ? getSpecLabel("color", specs.color, language) : undefined,
                              specs?.material ? getSpecLabel("material", specs.material, language) : undefined,
                            ].filter(Boolean);
                            return aspects.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 mb-1">
                                {aspects.join(" • ")}
                              </p>
                            );
                          })()}
                          {showLowStockBadge && (
                            <div className="mb-1.5">
                              <Badge className="bg-amber-500 text-white border-0 text-[8px] sm:text-[10px] px-1.5 py-0.5">
                                {remaining <= 1 ? (language === "ar" ? "آخر قطعة" : language === "ku" ? "یەک دانە ماوە" : "آخر قطعة") : (language === "ar" ? `آخر ${remaining} قطع` : `${remaining} دانە ماوە`)}
                              </Badge>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-900 font-bold text-sm sm:text-base">
                              {(product.currentBid || product.price || 0).toLocaleString()} {t("currency")}
                            </p>
                            {shippingType === "buyer_pays" && shippingCost > 0 ? (
                              <p className="text-[10px] sm:text-xs text-gray-400">
                                + {shippingCost.toLocaleString()} {t("shipping")}
                              </p>
                            ) : shippingType === "pickup" ? (
                              <p className="text-[10px] sm:text-xs text-gray-500">
                                {language === "ar" ? "استلام شخصي" : language === "ku" ? "وەرگرتنی کەسی" : "استلام شخصي"}
                              </p>
                            ) : (
                              <p className="text-[10px] sm:text-xs text-green-600">
                                {t("freeShipping")}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>

            </div>
          )}

          {/* Infinite Scroll Sentinel */}
          <div ref={loadMoreRef} className="h-1" />
          {!isLoading && isFetching && hasMoreProducts && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && !hasMoreProducts && mergedListings.length > 20 && (
            <p className="text-center text-muted-foreground text-sm py-6">
              {language === "ar" ? "لا توجد منتجات أخرى" : language === "ku" ? "بەرهەمی تر نییە" : "لا توجد منتجات أخرى"}
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
