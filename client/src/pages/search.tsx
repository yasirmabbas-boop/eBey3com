import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { PRODUCTS } from "@/lib/mock-data";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Clock, Loader2, Search, Watch, Smartphone, Shirt, Armchair, Car, Home, Package } from "lucide-react";
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

export default function SearchPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get("category");
  const searchQuery = params.get("q");
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

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
      auctionEndTime: null,
      sellerPhone: null,
      deliveryWindow: "",
      returnPolicy: "",
      returnDetails: null,
      isActive: true,
      createdAt: new Date(),
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
      products = products.filter(p => selectedConditions.includes(p.condition || ""));
    }

    return products;
  }, [listings, selectedCategory, searchQuery, selectedConditions]);

  const toggleCondition = (condition: string) => {
    setSelectedConditions(prev => 
      prev.includes(condition) 
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  const getPageTitle = () => {
    if (searchQuery) return `نتائج البحث: "${searchQuery}"`;
    if (selectedCategory) return selectedCategory;
    return "جميع المنتجات";
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4 text-primary" data-testid="search-title">
          {getPageTitle()}
        </h1>
        <p className="text-muted-foreground mb-8">
          {filteredProducts.length} منتج
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="font-bold mb-4">الفئات</h3>
              <div className="space-y-2">
                <Button
                  variant={selectedCategory === null ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(null)}
                  data-testid="filter-category-all"
                >
                  <Search className="h-4 w-4 ml-2" />
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
              <h3 className="font-bold mb-4">الحالة</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="new" 
                    checked={selectedConditions.includes("جديد")}
                    onCheckedChange={() => toggleCondition("جديد")}
                  />
                  <Label htmlFor="new">جديد</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="used" 
                    checked={selectedConditions.includes("مستعمل")}
                    onCheckedChange={() => toggleCondition("مستعمل")}
                  />
                  <Label htmlFor="used">مستعمل</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="vintage" 
                    checked={selectedConditions.includes("فينتاج")}
                    onCheckedChange={() => toggleCondition("فينتاج")}
                  />
                  <Label htmlFor="vintage">فينتاج / أنتيك</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="md:col-span-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">لا توجد نتائج</h3>
                <p className="text-muted-foreground">جرب تغيير الفلاتر أو البحث بكلمات أخرى</p>
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
                        {product.saleType === "auction" && (
                          <Badge className="absolute top-2 right-2 bg-primary text-white">
                            مزاد
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
                            <p className="text-xs text-muted-foreground">السعر الحالي</p>
                            <p className="font-bold text-xl text-primary">
                              {(product.currentBid || product.price).toLocaleString()} د.ع
                            </p>
                          </div>
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
