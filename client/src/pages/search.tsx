import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
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
import type { Listing } from "@shared/schema";

const CATEGORIES = [
  { id: "ساعات", name: "ساعات", icon: Watch },
  { id: "إلكترونيات", name: "إلكترونيات", icon: Smartphone },
  { id: "ملابس", name: "ملابس", icon: Shirt },
  { id: "تحف وأثاث", name: "تحف وأثاث", icon: Armchair },
  { id: "سيارات", name: "سيارات", icon: Car },
  { id: "عقارات", name: "عقارات", icon: Home },
  { id: "أخرى", name: "أخرى", icon: Package },
];

const CONDITIONS = [
  { id: "New", label: "جديد", aliases: ["New", "جديد"] },
  { id: "Vintage", label: "فينتاج / أنتيك", aliases: ["Vintage", "فينتاج", "أنتيك"] },
  { id: "Used - Like New", label: "شبه جديد", aliases: ["Used - Like New", "شبه جديد"] },
  { id: "Used - Good", label: "مستعمل - جيد", aliases: ["Used - Good", "جيد", "مستعمل"] },
  { id: "Used - Fair", label: "مستعمل - مقبول", aliases: ["Used - Fair", "مقبول"] },
];

const CITIES = [
  "بغداد",
  "البصرة", 
  "أربيل", 
  "السليمانية", 
  "الموصل",
  "النجف", 
  "كربلاء", 
  "كركوك", 
  "دهوك",
  "الأنبار",
  "بابل",
  "ديالى",
  "ذي قار",
  "القادسية",
  "المثنى",
  "ميسان",
  "صلاح الدين",
  "واسط",
  "نينوى",
];

const SORT_OPTIONS = [
  { value: "relevance", label: "الأكثر صلة" },
  { value: "newest", label: "الأحدث" },
  { value: "price_low", label: "السعر: من الأقل للأعلى" },
  { value: "price_high", label: "السعر: من الأعلى للأقل" },
  { value: "ending_soon", label: "ينتهي قريباً" },
  { value: "most_bids", label: "الأكثر مزايدة" },
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
  const [displayLimit, setDisplayLimit] = useState(20);

  useEffect(() => {
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
    setDisplayLimit(20);
  }, [searchQuery, categoryParam]);

  const ITEMS_PER_PAGE = 20;

  const buildApiUrl = useCallback(() => {
    const apiParams = new URLSearchParams();
    apiParams.set("limit", "500");
    
    if (sellerIdParam) apiParams.set("sellerId", sellerIdParam);
    if (appliedFilters.includeSold) apiParams.set("includeSold", "true");
    if (searchQuery) apiParams.set("q", searchQuery);
    if (appliedFilters.category) apiParams.set("category", appliedFilters.category);
    if (appliedFilters.priceMin) apiParams.set("minPrice", appliedFilters.priceMin);
    if (appliedFilters.priceMax) apiParams.set("maxPrice", appliedFilters.priceMax);
    if (saleTypeParam) apiParams.set("saleType", saleTypeParam);
    if (appliedFilters.saleTypes.length === 1) apiParams.set("saleType", appliedFilters.saleTypes[0]);
    if (appliedFilters.conditions.length === 1) apiParams.set("condition", appliedFilters.conditions[0]);
    if (appliedFilters.cities.length === 1) apiParams.set("city", appliedFilters.cities[0]);
    
    return `/api/listings?${apiParams.toString()}`;
  }, [sellerIdParam, appliedFilters, searchQuery, saleTypeParam]);

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ["/api/listings", sellerIdParam, appliedFilters, searchQuery, saleTypeParam],
    queryFn: async () => {
      const url = buildApiUrl();
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
  });

  const handleLoadMore = useCallback(() => {
    setDisplayLimit(prev => prev + ITEMS_PER_PAGE);
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
  
  const listings: Listing[] = Array.isArray(listingsData) 
    ? listingsData 
    : (listingsData?.listings || []);

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

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, displayLimit);
  }, [filteredProducts, displayLimit]);

  const hasMoreProducts = displayLimit < filteredProducts.length;

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
    setAppliedFilters(draftFilters);
    setDisplayLimit(ITEMS_PER_PAGE);
    setIsFilterOpen(false);
  };

  useEffect(() => {
    setDisplayLimit(ITEMS_PER_PAGE);
  }, [searchQuery, sortBy]);

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
  ].reduce((a, b) => a + b, 0);

  const getPageTitle = () => {
    if (searchQuery) return `نتائج البحث: "${searchQuery}"`;
    if (appliedFilters.category) return appliedFilters.category;
    return "جميع المنتجات";
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
          <div className="bg-gradient-to-l from-blue-500 to-blue-600 text-white rounded-xl p-6 mb-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                {sellerInfo.displayName?.charAt(0) || sellerInfo.username?.charAt(0) || "م"}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">متجر {sellerInfo.displayName || sellerInfo.username}</h2>
                <div className="flex items-center gap-4 mt-1 text-blue-100 text-sm">
                  {sellerInfo.totalSales > 0 && (
                    <span>{sellerInfo.totalSales} عملية بيع</span>
                  )}
                  {sellerInfo.ratingCount > 0 && (
                    <span>{Math.round((sellerInfo.rating || 0) * 20)}% تقييم إيجابي</span>
                  )}
                  <span>{filteredProducts.length} منتج</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b">
          <span className="text-sm font-medium text-muted-foreground ml-2">تصفية سريعة:</span>
          <Button
            variant={appliedFilters.saleTypes.includes("auction") ? "default" : "outline"}
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => quickToggleSaleType("auction")}
            data-testid="quick-filter-auction"
          >
            <Gavel className="h-3.5 w-3.5" />
            مزادات
          </Button>
          <Button
            variant={appliedFilters.saleTypes.includes("fixed") ? "default" : "outline"}
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => quickToggleSaleType("fixed")}
            data-testid="quick-filter-fixed"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            شراء فوري
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
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
              {cat.name}
            </Button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="search-title">
              {getPageTitle()}
            </h1>
            <p className="text-muted-foreground text-sm">
              {filteredProducts.length} منتج متاح
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 text-sm" data-testid="select-sort">
                <ArrowUpDown className="h-3.5 w-3.5 ml-1" />
                <SelectValue placeholder="ترتيب" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
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
                  المزيد
                  {activeFiltersCount > 0 && (
                    <Badge className="bg-primary text-white text-xs px-1.5">{activeFiltersCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col" dir="rtl">
                <SheetHeader className="p-4 border-b bg-blue-50">
                  <SheetTitle className="flex items-center gap-2 text-xl">
                    <Filter className="h-5 w-5 text-blue-600" />
                    الفلاتر
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    {draftFilteredProducts.length} منتج متاح
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
                        مسح جميع الفلاتر
                      </Button>
                    )}

                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        الفئات
                      </h3>
                      <div className="space-y-2">
                        <Button
                          variant={draftFilters.category === null ? "default" : "ghost"}
                          className="w-full justify-between"
                          onClick={() => setDraftFilters(prev => ({ ...prev, category: null }))}
                          data-testid="filter-category-all"
                        >
                          <span>جميع الفئات</span>
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
                              {cat.name}
                            </span>
                            <Badge variant="secondary" className="text-xs">{getCategoryCount(cat.id)}</Badge>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Gavel className="h-4 w-4" />
                        نوع البيع
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
                              مزاد
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
                              سعر ثابت
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
                            />
                            <Label htmlFor="includeSold" className="flex items-center gap-2 cursor-pointer text-muted-foreground">
                              عرض المباع
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        الحالة
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
                              <Label htmlFor={condition.id} className="cursor-pointer">{condition.label}</Label>
                            </div>
                            <Badge variant="outline" className="text-xs">{getConditionCount(condition.id)}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        نطاق السعر
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">من</Label>
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
                            <Label className="text-xs text-muted-foreground">إلى</Label>
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
                        <p className="text-xs text-muted-foreground text-center">بالدينار العراقي</p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="font-bold mb-4 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        المدينة
                      </h3>
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {CITIES.map((city) => (
                          <div key={city} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <Checkbox 
                                id={`city-${city}`}
                                checked={draftFilters.cities.includes(city)}
                                onCheckedChange={() => toggleDraftCity(city)}
                                data-testid={`filter-city-${city}`}
                              />
                              <Label htmlFor={`city-${city}`} className="cursor-pointer">{city}</Label>
                            </div>
                            <Badge variant="outline" className="text-xs">{getCityCount(city)}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <SheetFooter className="p-4 border-t bg-gray-50">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6"
                    onClick={applyFilters}
                    data-testid="apply-filters"
                  >
                    <Check className="h-5 w-5 ml-2" />
                    تطبيق الفلاتر ({draftFilteredProducts.length} منتج)
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
                {appliedFilters.category}
                <button onClick={() => setAppliedFilters(prev => ({ ...prev, category: null }))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {appliedFilters.saleTypes.map(type => (
              <Badge key={type} variant="secondary" className="gap-1 px-3 py-1">
                {type === "auction" ? "مزاد" : "سعر ثابت"}
                <button onClick={() => setAppliedFilters(prev => ({ ...prev, saleTypes: prev.saleTypes.filter(t => t !== type) }))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {appliedFilters.conditions.map(cond => (
              <Badge key={cond} variant="secondary" className="gap-1 px-3 py-1">
                {CONDITIONS.find(c => c.id === cond)?.label || cond}
                <button onClick={() => setAppliedFilters(prev => ({ ...prev, conditions: prev.conditions.filter(c => c !== cond) }))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {appliedFilters.cities.map(city => (
              <Badge key={city} variant="secondary" className="gap-1 px-3 py-1">
                {city}
                <button onClick={() => setAppliedFilters(prev => ({ ...prev, cities: prev.cities.filter(c => c !== city) }))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {(appliedFilters.priceMin || appliedFilters.priceMax) && (
              <Badge variant="secondary" className="gap-1 px-3 py-1">
                السعر: {appliedFilters.priceMin || "0"} - {appliedFilters.priceMax || "∞"}
                <button onClick={() => setAppliedFilters(prev => ({ ...prev, priceMin: "", priceMax: "" }))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {appliedFilters.includeSold && (
              <Badge variant="secondary" className="gap-1 px-3 py-1 bg-gray-200">
                عرض المباع
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
              مسح الكل
            </Button>
          </div>
        )}

        <div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">لا توجد نتائج</h3>
              <p className="text-muted-foreground mb-4">جرب تغيير الفلاتر أو البحث بكلمات أخرى</p>
              {activeFiltersCount > 0 && (
                <Button variant="outline" onClick={() => setAppliedFilters({ category: null, conditions: [], saleTypes: [], cities: [], priceMin: "", priceMax: "", includeSold: false })}>
                  مسح الفلاتر
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group products by category for carousel view */}
              {(() => {
                const productsByCategory = CATEGORIES.reduce((acc, cat) => {
                  const catProducts = displayedProducts.filter(p => p.category === cat.id);
                  if (catProducts.length > 0) {
                    acc[cat.id] = { name: cat.name, icon: cat.icon, products: catProducts };
                  }
                  return acc;
                }, {} as Record<string, { name: string; icon: any; products: Listing[] }>);

                const categoriesWithProducts = Object.entries(productsByCategory);

                if (categoriesWithProducts.length === 0) {
                  return (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">لا توجد نتائج</h3>
                    </div>
                  );
                }

                return categoriesWithProducts.map(([catId, { name, icon: CatIcon, products }]) => (
                  <div key={catId} className="bg-gray-50 rounded-xl p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center bg-primary/10">
                          <CatIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </div>
                        <h3 className="text-sm sm:text-lg font-bold text-primary">{name}</h3>
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
                                    تم البيع
                                  </Badge>
                                )}
                                {product.saleType === "auction" ? (
                                  <Badge className="bg-purple-600 text-white border-0 text-[9px] sm:text-xs shadow-md">
                                    مزاد
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-600 text-white border-0 text-[9px] sm:text-xs shadow-md">
                                    شراء فوري
                                  </Badge>
                                )}
                              </div>
                              <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
                                <FavoriteButton listingId={product.id} size="sm" />
                              </div>
                              {!product.isActive && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <span className="text-white font-bold text-sm sm:text-lg bg-black/50 px-2 sm:px-4 py-1 sm:py-2 rounded-lg">تم البيع</span>
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
                عرض المزيد ({filteredProducts.length - displayLimit} منتج آخر)
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
