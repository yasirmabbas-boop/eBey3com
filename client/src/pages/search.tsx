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
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
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
  ArrowUpDown
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
  { id: "Used - Like New", label: "شبه جديد", aliases: ["Used - Like New", "شبه جديد"] },
  { id: "Used - Good", label: "جيد", aliases: ["Used - Good", "جيد"] },
  { id: "Used - Fair", label: "مقبول", aliases: ["Used - Fair", "مقبول"] },
  { id: "Vintage", label: "فينتاج / أنتيك", aliases: ["Vintage", "فينتاج", "أنتيك"] },
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

export default function SearchPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get("category");
  const searchQuery = params.get("q");
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedSaleTypes, setSelectedSaleTypes] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
    queryFn: async () => {
      const res = await fetch("/api/listings");
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
  });

  const filteredProducts = useMemo(() => {
    let products = listings.length > 0 ? listings : PRODUCTS.map(p => ({
      ...p,
      images: [p.image],
      saleType: p.currentBid ? "auction" : "fixed",
      auctionEndTime: p.auctionEndTime || null,
      deliveryWindow: p.deliveryWindow || "",
      returnPolicy: p.returnPolicy || "",
      returnDetails: p.returnDetails || null,
      isActive: true,
      createdAt: new Date(),
      city: p.city || "بغداد",
      totalBids: p.totalBids || 0,
    } as unknown as Listing));

    if (selectedCategory) {
      products = products.filter(p => p.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      products = products.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    if (selectedConditions.length > 0) {
      const selectedAliases = selectedConditions.flatMap(condId => {
        const cond = CONDITIONS.find(c => c.id === condId);
        return cond ? cond.aliases : [condId];
      });
      products = products.filter(p => selectedAliases.includes(p.condition || ""));
    }

    if (selectedSaleTypes.length > 0) {
      products = products.filter(p => selectedSaleTypes.includes(p.saleType || ""));
    }

    if (selectedCities.length > 0) {
      products = products.filter(p => selectedCities.includes(p.city || ""));
    }

    const minPrice = priceMin ? parseInt(priceMin) : 0;
    const maxPrice = priceMax ? parseInt(priceMax) : Infinity;
    if (priceMin || priceMax) {
      products = products.filter(p => {
        const price = p.currentBid || p.price;
        return price >= minPrice && price <= maxPrice;
      });
    }

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
  }, [listings, selectedCategory, searchQuery, selectedConditions, selectedSaleTypes, selectedCities, priceMin, priceMax, sortBy]);

  const toggleCondition = (condition: string) => {
    setSelectedConditions(prev => 
      prev.includes(condition) 
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  const toggleSaleType = (saleType: string) => {
    setSelectedSaleTypes(prev => 
      prev.includes(saleType) 
        ? prev.filter(t => t !== saleType)
        : [...prev, saleType]
    );
  };

  const toggleCity = (city: string) => {
    setSelectedCities(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedConditions([]);
    setSelectedSaleTypes([]);
    setSelectedCities([]);
    setPriceMin("");
    setPriceMax("");
    setSortBy("newest");
  };

  const activeFiltersCount = [
    selectedCategory ? 1 : 0,
    selectedConditions.length,
    selectedSaleTypes.length,
    selectedCities.length,
    priceMin || priceMax ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const getPageTitle = () => {
    if (searchQuery) return `نتائج البحث: "${searchQuery}"`;
    if (selectedCategory) return selectedCategory;
    return "جميع المنتجات";
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      {activeFiltersCount > 0 && (
        <Button 
          variant="outline" 
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
          onClick={clearAllFilters}
          data-testid="clear-all-filters"
        >
          <X className="h-4 w-4 ml-2" />
          مسح جميع الفلاتر ({activeFiltersCount})
        </Button>
      )}

      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Search className="h-4 w-4" />
          الفئات
        </h3>
        <div className="space-y-2">
          <Button
            variant={selectedCategory === null ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setSelectedCategory(null)}
            data-testid="filter-category-all"
          >
            جميع الفئات
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedCategory(cat.id)}
              data-testid={`filter-category-${cat.id}`}
            >
              <cat.icon className="h-4 w-4 ml-2" />
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm">
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
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="mt-1"
                data-testid="filter-price-min"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">إلى</Label>
              <Input
                type="number"
                placeholder="∞"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="mt-1"
                data-testid="filter-price-max"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">بالدينار العراقي</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Gavel className="h-4 w-4" />
          نوع البيع
        </h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox 
              id="auction" 
              checked={selectedSaleTypes.includes("auction")}
              onCheckedChange={() => toggleSaleType("auction")}
              data-testid="filter-sale-auction"
            />
            <Label htmlFor="auction" className="flex items-center gap-2 cursor-pointer">
              <Gavel className="h-4 w-4 text-primary" />
              مزاد
            </Label>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox 
              id="fixed" 
              checked={selectedSaleTypes.includes("fixed")}
              onCheckedChange={() => toggleSaleType("fixed")}
              data-testid="filter-sale-fixed"
            />
            <Label htmlFor="fixed" className="flex items-center gap-2 cursor-pointer">
              <ShoppingBag className="h-4 w-4 text-green-600" />
              سعر ثابت
            </Label>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4" />
          الحالة
        </h3>
        <div className="space-y-3">
          {CONDITIONS.map((condition) => (
            <div key={condition.id} className="flex items-center space-x-2 space-x-reverse">
              <Checkbox 
                id={condition.id}
                checked={selectedConditions.includes(condition.id)}
                onCheckedChange={() => toggleCondition(condition.id)}
                data-testid={`filter-condition-${condition.id}`}
              />
              <Label htmlFor={condition.id} className="cursor-pointer">{condition.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          المدينة
        </h3>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {CITIES.map((city) => (
            <div key={city} className="flex items-center space-x-2 space-x-reverse">
              <Checkbox 
                id={`city-${city}`}
                checked={selectedCities.includes(city)}
                onCheckedChange={() => toggleCity(city)}
                data-testid={`filter-city-${city}`}
              />
              <Label htmlFor={`city-${city}`} className="cursor-pointer">{city}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

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
            <Button 
              variant="outline" 
              className="md:hidden"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              data-testid="toggle-mobile-filters"
            >
              <Filter className="h-4 w-4 ml-2" />
              الفلاتر
              {activeFiltersCount > 0 && (
                <Badge className="mr-2 bg-primary">{activeFiltersCount}</Badge>
              )}
            </Button>

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

        {showMobileFilters && (
          <div className="md:hidden mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">الفلاتر</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowMobileFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <FiltersContent />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="hidden md:block">
            <FiltersContent />
          </div>

          <div className="md:col-span-3">
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
                  <Button variant="outline" onClick={clearAllFilters}>
                    مسح الفلاتر
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-muted" data-testid={`search-result-${product.id}`}>
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        <img 
                          src={product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"} 
                          alt={product.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 right-2 flex flex-col gap-1">
                          {product.saleType === "auction" ? (
                            <Badge className="bg-primary text-white">
                              <Gavel className="h-3 w-3 ml-1" />
                              مزاد
                            </Badge>
                          ) : (
                            <Badge className="bg-green-600 text-white">
                              <ShoppingBag className="h-3 w-3 ml-1" />
                              سعر ثابت
                            </Badge>
                          )}
                        </div>
                        {product.city && (
                          <Badge variant="secondary" className="absolute bottom-2 right-2 text-xs">
                            <MapPin className="h-3 w-3 ml-1" />
                            {product.city}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground mb-1">{product.category}</div>
                        <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                          {product.title}
                        </h3>
                        <div className="flex justify-between items-center mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {product.saleType === "auction" ? "السعر الحالي" : "السعر"}
                            </p>
                            <p className="font-bold text-xl text-primary">
                              {(product.currentBid || product.price).toLocaleString()} د.ع
                            </p>
                          </div>
                          {product.saleType === "auction" && product.totalBids && (
                            <div className="text-left">
                              <p className="text-xs text-muted-foreground">المزايدات</p>
                              <p className="font-bold text-primary">{product.totalBids}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      {product.saleType === "auction" && product.auctionEndTime && (
                        <CardFooter className="px-4 py-2 bg-orange-50">
                          <AuctionCountdown endTime={product.auctionEndTime} />
                        </CardFooter>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
