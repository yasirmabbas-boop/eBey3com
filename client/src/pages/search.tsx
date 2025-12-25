import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { PRODUCTS } from "@/lib/mock-data";
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
  Check
} from "lucide-react";
import { AuctionCountdown } from "@/components/auction-countdown";
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
  { value: "newest", label: "الأحدث" },
  { value: "price_low", label: "السعر: من الأقل للأعلى" },
  { value: "price_high", label: "السعر: من الأعلى للأقل" },
  { value: "ending_soon", label: "ينتهي قريباً" },
  { value: "most_bids", label: "الأكثر مزايدة" },
];

interface FilterState {
  category: string | null;
  conditions: string[];
  saleTypes: string[];
  cities: string[];
  priceMin: string;
  priceMax: string;
}

export default function SearchPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get("category");
  const searchQuery = params.get("q");
  
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    category: categoryParam,
    conditions: [],
    saleTypes: [],
    cities: [],
    priceMin: "",
    priceMax: "",
  });
  
  const [draftFilters, setDraftFilters] = useState<FilterState>(appliedFilters);
  const [sortBy, setSortBy] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
    queryFn: async () => {
      const res = await fetch("/api/listings");
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
  });

  const allProducts = useMemo(() => {
    return listings.length > 0 ? listings : PRODUCTS.map(p => ({
      ...p,
      images: [p.image],
      saleType: p.saleType || (p.currentBid ? "auction" : "fixed"),
      auctionEndTime: p.auctionEndTime || null,
      deliveryWindow: p.deliveryWindow || "",
      returnPolicy: p.returnPolicy || "",
      returnDetails: p.returnDetails || null,
      isActive: true,
      createdAt: new Date(),
      city: p.city || "بغداد",
      totalBids: p.totalBids || 0,
    } as unknown as Listing));
  }, [listings]);

  const applyFiltersToProducts = (products: Listing[], filters: FilterState) => {
    let result = [...products];

    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    if (filters.conditions.length > 0) {
      const selectedAliases = filters.conditions.flatMap(condId => {
        const cond = CONDITIONS.find(c => c.id === condId);
        return cond ? cond.aliases.map(a => a.toLowerCase().trim()) : [condId.toLowerCase().trim()];
      });
      result = result.filter(p => {
        const productCondition = (p.condition || "").toLowerCase().trim();
        return selectedAliases.some(alias => productCondition.includes(alias) || alias.includes(productCondition));
      });
    }

    if (filters.saleTypes.length > 0) {
      result = result.filter(p => filters.saleTypes.includes(p.saleType || ""));
    }

    if (filters.cities.length > 0) {
      result = result.filter(p => {
        const productCity = (p.city || "").trim();
        return filters.cities.some(city => 
          productCity === city || 
          productCity.includes(city) || 
          city.includes(productCity)
        );
      });
    }

    const minPrice = filters.priceMin ? parseInt(filters.priceMin) : 0;
    const maxPrice = filters.priceMax ? parseInt(filters.priceMax) : Infinity;
    if (filters.priceMin || filters.priceMax) {
      result = result.filter(p => {
        const price = p.currentBid || p.price;
        return price >= minPrice && price <= maxPrice;
      });
    }

    return result;
  };

  const filteredProducts = useMemo(() => {
    let products = applyFiltersToProducts(allProducts, appliedFilters);

    const sortedProducts = [...products];
    switch (sortBy) {
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
  }, [allProducts, appliedFilters, searchQuery, sortBy]);

  const draftFilteredProducts = useMemo(() => {
    return applyFiltersToProducts(allProducts, draftFilters);
  }, [allProducts, draftFilters, searchQuery]);

  const getCategoryCount = (categoryId: string | null) => {
    const testFilters = { ...draftFilters, category: categoryId };
    return applyFiltersToProducts(allProducts, testFilters).length;
  };

  const getConditionCount = (conditionId: string) => {
    const newConditions = draftFilters.conditions.includes(conditionId)
      ? draftFilters.conditions
      : [...draftFilters.conditions, conditionId];
    const testFilters = { ...draftFilters, conditions: [conditionId] };
    const baseFilters = { ...draftFilters, conditions: [] };
    return applyFiltersToProducts(allProducts, { ...baseFilters, conditions: [conditionId] }).length;
  };

  const getSaleTypeCount = (saleType: string) => {
    const baseFilters = { ...draftFilters, saleTypes: [] };
    return applyFiltersToProducts(allProducts, { ...baseFilters, saleTypes: [saleType] }).length;
  };

  const getCityCount = (city: string) => {
    const baseFilters = { ...draftFilters, cities: [] };
    return applyFiltersToProducts(allProducts, { ...baseFilters, cities: [city] }).length;
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
    setIsFilterOpen(false);
  };

  const clearAllFilters = () => {
    const cleared: FilterState = {
      category: null,
      conditions: [],
      saleTypes: [],
      cities: [],
      priceMin: "",
      priceMax: "",
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary" data-testid="search-title">
              {getPageTitle()}
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredProducts.length} منتج
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={openFilters}
                  className="gap-2"
                  data-testid="open-filters"
                >
                  <Filter className="h-4 w-4" />
                  الفلاتر
                  {activeFiltersCount > 0 && (
                    <Badge className="bg-primary text-white">{activeFiltersCount}</Badge>
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

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48" data-testid="select-sort">
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-600"
              onClick={() => setAppliedFilters({ category: null, conditions: [], saleTypes: [], cities: [], priceMin: "", priceMax: "" })}
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
                <Button variant="outline" onClick={() => setAppliedFilters({ category: null, conditions: [], saleTypes: [], cities: [], priceMin: "", priceMax: "" })}>
                  مسح الفلاتر
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-gray-200 bg-white" data-testid={`search-result-${product.id}`}>
                    <div className="flex gap-4 p-3">
                      {/* Product Image */}
                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        <img 
                          src={product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"} 
                          alt={product.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          style={{ imageRendering: "auto" }}
                        />
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div>
                          {/* Title */}
                          <h3 className="font-semibold text-base sm:text-lg text-gray-900 line-clamp-2 group-hover:text-primary transition-colors leading-tight mb-1">
                            {product.title}
                          </h3>
                          
                          {/* Condition & Brand */}
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">{product.condition}</span>
                            {product.brand && <span> · {product.brand}</span>}
                          </p>
                        </div>
                        
                        {/* Price Section */}
                        <div className="mt-auto">
                          <p className="font-bold text-lg sm:text-xl text-gray-900">
                            {(product.currentBid || product.price).toLocaleString()} <span className="text-sm font-normal">د.ع</span>
                          </p>
                          
                          {/* Delivery & Location Info */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-gray-500">
                            {product.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {product.city}
                              </span>
                            )}
                            {product.saleType === "auction" && product.totalBids ? (
                              <span>{product.totalBids} مزايدة</span>
                            ) : null}
                          </div>
                          
                          {/* Auction Timer */}
                          {product.saleType === "auction" && product.auctionEndTime && (
                            <div className="mt-1">
                              <AuctionCountdown endTime={product.auctionEndTime} />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Sale Type Badge */}
                      <div className="flex-shrink-0 self-start">
                        {product.saleType === "auction" ? (
                          <Badge className="bg-purple-100 text-purple-800 border-0 text-xs">
                            مزاد
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                            شراء فوري
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
