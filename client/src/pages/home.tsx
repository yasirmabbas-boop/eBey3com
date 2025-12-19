import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { PRODUCTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tag, ChevronLeft, ChevronRight, Gavel, Search, Zap, LayoutGrid, History, Sparkles, Loader2, Clock, Camera } from "lucide-react";
import { AuctionCountdown } from "@/components/auction-countdown";
import heroBg from "@assets/generated_images/hero_background_abstract.png";
import type { Listing } from "@shared/schema";

const RECENT_SEARCHES = [
  { term: "آيفون 14", count: 5 },
  { term: "ساعات رولكس", count: 3 },
  { term: "بلايستيشن 5", count: 2 },
  { term: "ذهب عراقي", count: 2 },
  { term: "ماك بوك", count: 1 },
];

const CATEGORIES = [
  { id: "ساعات", name: "ساعات", nameEn: "watches" },
  { id: "إلكترونيات", name: "إلكترونيات", nameEn: "electronics" },
  { id: "ملابس", name: "ملابس", nameEn: "clothing" },
  { id: "تحف وأثاث", name: "تحف وأثاث", nameEn: "antiques" },
  { id: "سيارات", name: "سيارات", nameEn: "cars" },
  { id: "عقارات", name: "عقارات", nameEn: "realestate" },
  { id: "أخرى", name: "أخرى", nameEn: "other" },
];

const ADS = [
  {
    id: 1,
    title: "اكتشف كنوز الزمن",
    description: "رحلة ممتعة في عالم الساعات الكلاسيكية - قطع نادرة تحكي قصص الأناقة",
    image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=1200&h=300&fit=crop",
    badgeText: "مغامرة جديدة",
    buttonText: "ابدأ الاستكشاف",
    link: "/search?category=ساعات",
    color: "bg-blue-900"
  },
  {
    id: 2,
    title: "كنوز من الماضي",
    description: "سجاد عريق وتحف نادرة تنتظر من يقدّرها - كل قطعة لها حكاية",
    image: "https://images.unsplash.com/photo-1555529733-0e670560f7e1?w=1200&h=300&fit=crop",
    badgeText: "اكتشف التراث",
    buttonText: "شاهد المجموعة",
    link: "/search?category=تحف وأثاث",
    color: "bg-amber-800"
  },
  {
    id: 3,
    title: "صفقات مميزة بانتظارك",
    description: "نصائح ذهبية للفوز بأفضل العروض - دليلك للتسوق الذكي والممتع",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?w=1200&h=300&fit=crop",
    badgeText: "نصائح مفيدة",
    buttonText: "اقرأ الدليل",
    link: "/deals-guide",
    color: "bg-green-800"
  },
];

export default function Home() {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const currentAd = ADS[currentAdIndex];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/search");
    }
  };

  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
    queryFn: async () => {
      const res = await fetch("/api/listings");
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
  });

  const displayProducts = listings.length > 0 ? listings.map(l => ({
    id: l.id,
    productCode: (l as any).productCode || `P-${l.id.slice(0, 6)}`,
    title: l.title,
    price: l.price,
    currentBid: l.currentBid || undefined,
    image: l.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    saleType: l.saleType as "auction" | "fixed",
    timeLeft: l.timeLeft || undefined,
    auctionEndTime: l.auctionEndTime,
    seller: { name: l.sellerName, salesCount: 0, rating: 95 },
    sellerName: l.sellerName,
    sellerTotalSales: 0,
    sellerRating: 5,
    category: l.category,
    condition: l.condition as "New" | "Used - Like New" | "Used - Good" | "Vintage",
    deliveryWindow: l.deliveryWindow,
    returnPolicy: l.returnPolicy,
    city: l.city,
  })) : PRODUCTS;

  const recommendedProducts = displayProducts.slice(0, 6);
  
  const productsByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = displayProducts.filter(p => p.category === cat.id).slice(0, 4);
    return acc;
  }, {} as Record<string, typeof displayProducts>);

  const categoriesWithProducts = CATEGORIES.filter(cat => productsByCategory[cat.id].length > 0);

  const nextAd = () => {
    setCurrentAdIndex((prev) => (prev + 1) % ADS.length);
  };

  const prevAd = () => {
    setCurrentAdIndex((prev) => (prev - 1 + ADS.length) % ADS.length);
  };

  return (
    <Layout>
      {/* Sliding Ads Section */}
      <section className="bg-gray-50 border-b">
        <div className="w-full px-2 sm:px-4 py-4">
          <div className="relative overflow-hidden rounded-xl shadow-xl h-[200px] sm:h-[240px]">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
              <img 
                src={currentAd.image} 
                alt={currentAd.title}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className={`absolute inset-0 opacity-90 ${currentAd.color} mix-blend-multiply transition-colors duration-500`}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-center items-start px-6 md:px-12 text-white max-w-2xl">
              <Badge className="mb-2 bg-white/20 hover:bg-white/30 text-white border-none px-3 py-0.5 text-xs backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                {currentAd.badgeText}
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 leading-tight animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                {currentAd.title}
              </h2>
              <p className="text-sm sm:text-base opacity-90 mb-4 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                {currentAd.description}
              </p>
              <Link href={currentAd.link}>
                <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100 font-bold px-6 h-9 text-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
                  {currentAd.buttonText}
                </Button>
              </Link>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={prevAd}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors backdrop-blur-sm border border-white/10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={nextAd}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors backdrop-blur-sm border border-white/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {ADS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentAdIndex(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentAdIndex ? "bg-white w-8" : "bg-white/40 w-2 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Search Section */}
      <section className="bg-gradient-to-b from-blue-600 to-blue-700 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              ابحث عن ما تريد
            </h2>
            <p className="text-blue-100 mb-6">
              اكتشف آلاف المنتجات من الساعات والإلكترونيات والتحف والمزيد
            </p>
            <form onSubmit={handleSearch} className="flex gap-2 bg-white p-2 rounded-xl shadow-xl">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input 
                  type="search"
                  placeholder="ابحث عن ساعات، هواتف، سيارات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 h-12 text-lg border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-home-search"
                />
              </div>
              <Button 
                type="submit"
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 h-12"
                data-testid="button-home-search"
              >
                <Search className="h-5 w-5 ml-2" />
                بحث
              </Button>
            </form>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <span className="text-blue-200 text-sm">بحث سريع:</span>
              {["ساعات رولكس", "آيفون", "سجاد فارسي", "سيارات", "ذهب"].map((term) => (
                <Link key={term} href={`/search?q=${encodeURIComponent(term)}`}>
                  <Badge 
                    variant="secondary" 
                    className="bg-white/20 hover:bg-white/30 text-white border-0 cursor-pointer"
                  >
                    {term}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Personalized Section - Based on History & Searches */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          {/* Recent Searches */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-primary">عمليات البحث الأخيرة</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {RECENT_SEARCHES.map((search, i) => (
                <Link key={i} href={`/search?q=${encodeURIComponent(search.term)}`}>
                  <Badge 
                    variant="outline" 
                    className="px-4 py-2 text-sm cursor-pointer hover:bg-primary hover:text-white transition-colors"
                    data-testid={`badge-recent-search-${i}`}
                  >
                    {search.term}
                    <span className="mr-2 text-xs text-muted-foreground">({search.count})</span>
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Recommended Items Based on History */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-bold text-primary">مقترحة لك بناءً على اهتماماتك</h2>
              </div>
              <Link href="/search" className="text-accent hover:underline font-medium text-sm">عرض المزيد</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recommendedProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-gray-200" data-testid={`card-recommended-${product.id}`}>
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.currentBid && (
                        <Badge className="absolute top-2 right-2 bg-primary text-white text-xs">
                          مزاد
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-bold text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>
                      <p className="font-bold text-primary text-sm">
                        {(product.currentBid || product.price).toLocaleString()} د.ع
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories - Quick Access */}
      <section className="py-6 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-primary">تصفح الأقسام</h2>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
            {CATEGORIES.map((cat, i) => (
              <Link key={i} href={`/search?category=${encodeURIComponent(cat.id)}`}>
                <div className="group cursor-pointer bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-primary text-center" data-testid={`category-${cat.id}`}>
                  <div className={`h-10 w-10 ${
                    cat.nameEn === "watches" ? "bg-blue-50" :
                    cat.nameEn === "electronics" ? "bg-amber-50" :
                    cat.nameEn === "clothing" ? "bg-purple-50" :
                    cat.nameEn === "antiques" ? "bg-rose-50" :
                    cat.nameEn === "cars" ? "bg-red-50" :
                    cat.nameEn === "realestate" ? "bg-green-50" :
                    "bg-gray-50"
                  } rounded-full mx-auto mb-2 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    {cat.nameEn === "watches" ? <Clock className="h-5 w-5 text-blue-600" /> :
                     cat.nameEn === "electronics" ? <Zap className="h-5 w-5 text-amber-600" /> :
                     cat.nameEn === "clothing" ? <Tag className="h-5 w-5 text-purple-600" /> :
                     cat.nameEn === "antiques" ? <Search className="h-5 w-5 text-rose-600" /> :
                     cat.nameEn === "cars" ? <Zap className="h-5 w-5 text-red-600" /> :
                     cat.nameEn === "realestate" ? <LayoutGrid className="h-5 w-5 text-green-600" /> :
                     <Tag className="h-5 w-5 text-gray-600" />}
                  </div>
                  <h3 className="font-medium text-sm text-gray-800">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Items - New Arrivals */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-2xl font-bold text-primary">وصل حديثاً</h2>
            <Link href="/search" className="text-accent hover:underline font-medium">عرض الكل</Link>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-gray-200" data-testid={`card-product-${product.id}`}>
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.currentBid && (
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
                            {product.currentBid ? product.currentBid.toLocaleString() : product.price.toLocaleString()} د.ع
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
      </section>

      {/* Category-Based Recommendations */}
      {categoriesWithProducts.length > 0 && (
        <section className="py-12 bg-white border-t">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-8">
              <LayoutGrid className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-primary">تصفح حسب القسم</h2>
            </div>
            
            <div className="space-y-12">
              {categoriesWithProducts.slice(0, 3).map((cat) => (
                <div key={cat.id} className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        cat.nameEn === "watches" ? "bg-blue-100" :
                        cat.nameEn === "electronics" ? "bg-amber-100" :
                        cat.nameEn === "antiques" ? "bg-rose-100" :
                        "bg-gray-100"
                      }`}>
                        {cat.nameEn === "watches" ? <Clock className="h-5 w-5 text-blue-600" /> :
                         cat.nameEn === "electronics" ? <Zap className="h-5 w-5 text-amber-600" /> :
                         cat.nameEn === "antiques" ? <Search className="h-5 w-5 text-rose-600" /> :
                         <Tag className="h-5 w-5 text-gray-600" />}
                      </div>
                      <h3 className="text-xl font-bold text-primary">{cat.name}</h3>
                    </div>
                    <Link href={`/search?category=${encodeURIComponent(cat.id)}`}>
                      <Button variant="outline" size="sm">
                        عرض الكل
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {productsByCategory[cat.id].map((product) => (
                      <Link key={product.id} href={`/product/${product.id}`}>
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-gray-200" data-testid={`card-category-${cat.id}-${product.id}`}>
                          <div className="relative aspect-square overflow-hidden bg-gray-100">
                            <img 
                              src={product.image} 
                              alt={product.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            {product.currentBid && (
                              <Badge className="absolute top-2 right-2 bg-primary text-white text-xs">
                                مزاد
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-3">
                            <h3 className="font-bold text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                              {product.title}
                            </h3>
                            <p className="font-bold text-primary text-sm">
                              {(product.currentBid || product.price).toLocaleString()} د.ع
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Join Auction CTA */}
      <section className="relative py-16 w-full overflow-hidden bg-primary">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="container mx-auto px-4 relative text-center text-white">
          <Badge className="mb-4 bg-accent text-white hover:bg-accent/90 border-none px-4 py-1 text-md">
            سوق العراق الأول
          </Badge>
          <h2 className="text-2xl md:text-4xl font-bold mb-4 leading-tight">
            مزادات <span className="text-accent">النوادر والمميز</span>
          </h2>
          <p className="text-lg opacity-90 mb-6 max-w-xl mx-auto">
            سجل الآن وابدأ المزايدة على آلاف المنتجات المميزة
          </p>
          <Link href="/live-auction">
            <Button size="lg" className="bg-accent text-white hover:bg-accent/90 font-bold px-8 h-12 text-lg flex items-center gap-2 mx-auto">
              <Gavel className="h-5 w-5" />
              شارك في المزاد
            </Button>
          </Link>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="py-12 bg-white border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-8 text-primary">لماذا تختار E-بيع؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="text-xl font-bold mb-2">موثوق وآمن</h3>
              <p className="opacity-80 text-gray-600">جميع البائعين يتم التحقق من هوياتهم لضمان تجربة شراء آمنة.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="text-xl font-bold mb-2">خصوصية تامة</h3>
              <p className="opacity-80 text-gray-600">بياناتك الشخصية وأرقام هواتفك محمية ومشفرة.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="text-xl font-bold mb-2">دعم محلي</h3>
              <p className="opacity-80 text-gray-600">فريق دعم عراقي جاهز لمساعدتك في أي وقت.</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
