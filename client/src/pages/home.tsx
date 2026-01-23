import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tag, ChevronLeft, ChevronRight, Gavel, Search, Zap, LayoutGrid, Sparkles, Loader2, Clock, Camera, ShoppingBag, Eye, Heart } from "lucide-react";
import { AuctionCountdown } from "@/components/auction-countdown";
import { OptimizedImage, ProductGridSkeleton } from "@/components/optimized-image";
import { CategoryCarousel } from "@/components/category-carousel";
import { FavoriteButton } from "@/components/favorite-button";
import { HeroBanner } from "@/components/hero-banner";
import heroBg from "@assets/generated_images/hero_background_abstract.png";
import type { Listing } from "@shared/schema";

const CATEGORIES = [
  { id: "ساعات", name: "ساعات", nameEn: "watches" },
  { id: "إلكترونيات", name: "إلكترونيات", nameEn: "electronics" },
  { id: "ملابس", name: "ملابس", nameEn: "clothing" },
  { id: "تحف وأثاث", name: "تحف وأثاث", nameEn: "antiques" },
  { id: "مجوهرات", name: "مجوهرات", nameEn: "jewelry" },
  { id: "آلات موسيقية", name: "آلات موسيقية", nameEn: "music" },
  { id: "مقتنيات", name: "مقتنيات", nameEn: "collectibles" },
  { id: "أخرى", name: "أخرى", nameEn: "other" },
];

const ADS = [
  {
    id: 1,
    title: "أول مزاد إلكتروني في العراق",
    description: "بيع واشتري بأمان - اكتشف صفقات مميزة وكنوز نادرة من خلال مزاداتنا",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?w=1200&h=300&fit=crop",
    badgeText: "جديد",
    buttonText: "ابدأ الآن",
    link: "/search",
    color: "bg-[#1E3A8A]"
  },
  {
    id: 2,
    title: "عروض رأس السنة 🎉",
    description: "خصومات حصرية وصفقات لا تُفوّت - احتفل معنا بأفضل الأسعار",
    image: "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1200&h=300&fit=crop",
    badgeText: "عروض محدودة",
    buttonText: "تسوق الآن",
    link: "/search",
    color: "bg-[#DC2626]"
  },
  {
    id: 3,
    title: "وصل حديثاً ✨",
    description: "تصفح أحدث المنتجات المضافة - ساعات، إلكترونيات، تحف والمزيد",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=300&fit=crop",
    badgeText: "جديد",
    buttonText: "اكتشف الجديد",
    link: "/search",
    color: "bg-[#141414]"
  },
];

export default function Home() {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { language, t } = useLanguage();

  // Load recently viewed items from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("recentlyViewed");
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setRecentlyViewedIds(ids.slice(0, 10));
      }
    } catch (e) {
      console.log("Error loading recently viewed:", e);
    }
  }, []);
  const debugHeroLabel = language === "ar" ? "بيع واشتري بأمان" : "بە پارێزراوی بکڕە و بفرۆشە";
  if (language === "en") {
    // #region agent log
    fetch('http://localhost:7242/ingest/005f27f0-13ae-4477-918f-9d14680f3cb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'pages/home.tsx:Home',message:'home ternary label for hero',data:{language,label:debugHeroLabel},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
  }
  const currentAd = ADS[currentAdIndex];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ADS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/search");
    }
  };

  const sellerId = user?.id;

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ["/api/listings", sellerId],
    queryFn: async () => {
      const url = sellerId 
        ? `/api/listings?sellerId=${encodeURIComponent(sellerId)}&limit=24` 
        : "/api/listings?limit=24";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
  });
  
  const listings: Listing[] = Array.isArray(listingsData) 
    ? listingsData 
    : (listingsData?.listings || []);

  const displayProducts = listings
    .filter(l => {
      const remaining = (l.quantityAvailable || 1) - (l.quantitySold || 0);
      return remaining > 0;
    })
    .map(l => ({
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
      quantityAvailable: l.quantityAvailable || 1,
      quantitySold: l.quantitySold || 0,
      views: (l as any).views || 0,
      favoritesCount: (l as any).favoritesCount || 0,
    }));

  const recommendedProducts = displayProducts.slice(0, 6);

  // Get recently viewed products from the displayProducts list
  const recentlyViewedProducts = displayProducts.filter(p => 
    recentlyViewedIds.includes(p.id)
  ).slice(0, 8);
  
  const productsByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = displayProducts.filter(p => p.category === cat.id).slice(0, 12);
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
      {/* Categories - Horizontal Sliding Strip */}
      <section className="py-2 bg-gradient-to-l from-primary/5 to-primary/10 overflow-hidden border-b border-border/30">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {CATEGORIES.map((cat, i) => (
              <Link key={i} href={`/search?category=${encodeURIComponent(cat.id)}`}>
                <div 
                  className="group cursor-pointer flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 sm:px-4 sm:py-2 rounded-full soft-border hover:shadow-md transition-all whitespace-nowrap active:scale-95 hover:bg-primary hover:text-white"
                  data-testid={`category-top-${cat.id}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className={`h-5 w-5 sm:h-6 sm:w-6 ${
                    cat.nameEn === "watches" ? "bg-blue-100 group-hover:bg-blue-200" :
                    cat.nameEn === "electronics" ? "bg-amber-100 group-hover:bg-amber-200" :
                    cat.nameEn === "clothing" ? "bg-purple-100 group-hover:bg-purple-200" :
                    cat.nameEn === "antiques" ? "bg-rose-100 group-hover:bg-rose-200" :
                    cat.nameEn === "jewelry" ? "bg-pink-100 group-hover:bg-pink-200" :
                    cat.nameEn === "music" ? "bg-indigo-100 group-hover:bg-indigo-200" :
                    cat.nameEn === "collectibles" ? "bg-teal-100 group-hover:bg-teal-200" :
                    "bg-gray-100 group-hover:bg-gray-200"
                  } rounded-full flex items-center justify-center transition-all`}>
                    {cat.nameEn === "watches" ? <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600" /> :
                     cat.nameEn === "electronics" ? <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" /> :
                     cat.nameEn === "clothing" ? <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-600" /> :
                     cat.nameEn === "antiques" ? <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-600" /> :
                     cat.nameEn === "jewelry" ? <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-pink-600" /> :
                     cat.nameEn === "music" ? <Gavel className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-600" /> :
                     cat.nameEn === "collectibles" ? <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-teal-600" /> :
                     <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-600" />}
                  </div>
                  <span className="font-medium text-xs sm:text-sm text-gray-800 group-hover:text-white transition-colors">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Hero Banner */}
      <section className="relative bg-gradient-to-l from-primary via-[#1b2b5a] to-[#0f172a] text-white py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-8 right-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-8 left-10 w-48 h-48 bg-amber-400 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Cairo, sans-serif" }}>
              {language === "ar" ? "بيع واشتري بأمان" : "بە پارێزراوی بکڕە و بفرۆشە"}
            </h1>
            <p className="text-sm md:text-base text-blue-200 mb-8">
              {language === "ar" ? "منصتك الأولى للمزادات والتسوق الآمن في العراق" : "یەکەم پلاتفۆرمی مزایدە و کڕین بە پارێزراوی لە عێراق"}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/sell">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold px-8 shadow-[var(--shadow-2)]">
                  <Tag className="h-5 w-5 ml-2" />
                  {language === "ar" ? "ابدأ البيع" : "دەست بە فرۆشتن بکە"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured/Hot Products Banner */}
      <section className="py-4 sm:py-6 bg-gradient-to-b from-muted/60 to-background">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg sm:text-xl font-bold text-primary">{language === "ar" ? "المنتجات المميزة والرائجة" : "بەرهەمە تایبەت و باوەکان"}</h2>
            </div>
          </div>
          <HeroBanner />
        </div>
      </section>

      {/* Recently Viewed Section */}
      {recentlyViewedProducts.length > 0 && (
        <section className="py-4 sm:py-6 bg-gradient-to-l from-blue-50/50 to-indigo-50/50">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <h2 className="text-base sm:text-lg font-bold text-primary">{language === "ar" ? "شوهد مؤخراً" : "تازە بینراوەکان"}</h2>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {recentlyViewedProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <Card className="overflow-hidden cursor-pointer group soft-border hover-elevate active:scale-[0.98] flex-shrink-0 w-36 sm:w-44" data-testid={`card-recent-${product.id}`}>
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {product.saleType === "auction" && (
                        <Badge className="absolute top-1.5 right-1.5 bg-primary text-white text-[10px] px-1.5 py-0.5">
                          مزاد
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-2 sm:p-3">
                      <h3 className="font-medium text-xs sm:text-sm line-clamp-2 text-gray-800 mb-1">{product.title}</h3>
                      <p className="font-bold text-sm sm:text-base text-primary">
                        {(product.currentBid || product.price).toLocaleString()} {t("iqd")}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recommended Items Section */}
      {recommendedProducts.length > 0 && (
        <section className="py-4 sm:py-8 bg-background border-b border-border/60">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex justify-between items-center mb-3 sm:mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                <h2 className="text-base sm:text-xl font-bold text-primary">{language === "ar" ? "منتجات مقترحة" : "بەرهەمە پێشنیارکراوەکان"}</h2>
              </div>
              <Link href="/search" className="text-accent hover:underline font-medium text-xs sm:text-sm">{language === "ar" ? "عرض المزيد" : "زیاتر ببینە"}</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
              {recommendedProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`} className="snap-start">
                  <Card className="overflow-hidden cursor-pointer group soft-border hover-elevate active:scale-[0.98] flex-shrink-0 w-36 sm:w-48" data-testid={`card-recommended-${product.id}`}>
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        style={{ imageRendering: "auto" }}
                      />
                      {product.currentBid && (
                      <Badge className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-primary text-white text-[9px] sm:text-xs px-1 sm:px-1.5 shadow-[var(--shadow-1)]">
                          مزاد
                        </Badge>
                      )}
                      <div className="absolute top-1 left-1 sm:top-2 sm:left-2">
                        <FavoriteButton listingId={product.id} size="sm" />
                      </div>
                    </div>
                    <CardContent className="p-1.5 sm:p-3">
                      <h3 className="font-bold text-[10px] sm:text-sm mb-0.5 sm:mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-primary text-[10px] sm:text-sm">
                          {(product.currentBid || product.price).toLocaleString()} <span className="hidden sm:inline">د.ع</span>
                        </p>
                        <div className="flex items-center gap-2 hidden sm:flex">
                          <span className="text-[9px] sm:text-xs text-gray-400 flex items-center gap-0.5">
                            <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-400" />
                            {product.favoritesCount}
                          </span>
                          <span className="text-[9px] sm:text-xs text-gray-400 flex items-center gap-0.5">
                            <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {product.views}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Items - New Arrivals */}
      <section className="py-6 sm:py-12 bg-muted/40">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex justify-between items-center mb-4 sm:mb-8">
            <h2 className="text-lg sm:text-2xl font-bold text-primary">{language === "ar" ? "وصل حديثاً" : "تازە گەیشتوو"}</h2>
            <Link href="/search" className="text-accent hover:underline font-medium text-sm">{t("viewAll")}</Link>
          </div>
          
          {isLoading ? (
            <ProductGridSkeleton count={10} />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
              {displayProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`} className="snap-start">
                  <Card className="overflow-hidden cursor-pointer group soft-border hover-elevate active:scale-[0.98] flex-shrink-0 w-40 sm:w-52" data-testid={`card-product-${product.id}`}>
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <OptimizedImage 
                        src={product.image} 
                        alt={product.title} 
                        className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.currentBid && (
                        <Badge className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-primary text-white text-[10px] sm:text-xs px-1.5 py-0.5 z-10">
                          مزاد
                        </Badge>
                      )}
                      <div className="absolute top-1 left-1 sm:top-2 sm:left-2">
                        <FavoriteButton listingId={product.id} size="sm" />
                      </div>
                    </div>
                    <CardContent className="p-2 sm:p-3">
                      <h3 className="font-bold text-xs sm:text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors leading-tight">
                        {product.title}
                      </h3>
                      <p className="font-bold text-sm sm:text-base text-primary">
                        {product.currentBid ? product.currentBid.toLocaleString() : product.price.toLocaleString()} <span className="text-[10px] sm:text-xs">د.ع</span>
                      </p>
                    </CardContent>
                    {product.saleType === "auction" && (
                      <CardFooter className="px-2 py-1.5 bg-orange-50">
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

      {/* Category-Based Recommendations - Horizontal Scroll */}
      {categoriesWithProducts.length > 0 && (
        <section className="py-4 sm:py-8 bg-white border-t">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h2 className="text-lg sm:text-2xl font-bold text-primary">تصفح حسب القسم</h2>
            </div>
            
            <div className="space-y-4 sm:space-y-8">
              {categoriesWithProducts.map((cat) => (
                <div key={cat.id} className="bg-gray-50 rounded-xl p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`h-7 w-7 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center ${
                        cat.nameEn === "watches" ? "bg-blue-100" :
                        cat.nameEn === "electronics" ? "bg-amber-100" :
                        cat.nameEn === "antiques" ? "bg-rose-100" :
                        cat.nameEn === "clothing" ? "bg-purple-100" :
                        cat.nameEn === "jewelry" ? "bg-pink-100" :
                        "bg-gray-100"
                      }`}>
                        {cat.nameEn === "watches" ? <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" /> :
                         cat.nameEn === "electronics" ? <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" /> :
                         cat.nameEn === "antiques" ? <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-600" /> :
                         <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />}
                      </div>
                      <h3 className="text-sm sm:text-lg font-bold text-primary">{cat.name}</h3>
                    </div>
                    <Link href={`/search?category=${encodeURIComponent(cat.id)}`}>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs sm:text-sm h-8 px-2 sm:px-3">
                        عرض الكل
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                      </Button>
                    </Link>
                  </div>
                  
                  <CategoryCarousel>
                    {productsByCategory[cat.id].map((product) => (
                      <Link key={product.id} href={`/product/${product.id}`} className="snap-start">
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-gray-200 flex-shrink-0 w-32 sm:w-52 active:scale-[0.98]" data-testid={`card-category-${cat.id}-${product.id}`}>
                          <div className="relative aspect-square overflow-hidden bg-gray-100">
                            <img 
                              src={product.image} 
                              alt={product.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            {product.currentBid && (
                              <Badge className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-primary text-white text-[9px] sm:text-xs px-1 sm:px-1.5">
                                مزاد
                              </Badge>
                            )}
                            <div className="absolute top-1 left-1 sm:top-2 sm:left-2">
                              <FavoriteButton listingId={product.id} size="sm" />
                            </div>
                            {product.saleType === "auction" && product.auctionEndTime && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 sm:p-2">
                                <div className="text-[9px] sm:text-xs text-white font-medium">
                                  <AuctionCountdown endTime={product.auctionEndTime} />
                                </div>
                              </div>
                            )}
                          </div>
                          <CardContent className="p-1.5 sm:p-3">
                            <h3 className="font-bold text-[10px] sm:text-sm mb-0.5 sm:mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                              {product.title}
                            </h3>
                            <p className="font-bold text-primary text-[10px] sm:text-sm">
                              {(product.currentBid || product.price).toLocaleString()} <span className="hidden sm:inline">د.ع</span>
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </CategoryCarousel>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Browse Products CTA */}
      <section className="relative py-10 sm:py-16 w-full overflow-hidden bg-primary">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="container mx-auto px-4 relative text-center text-white">
          <Badge className="mb-3 sm:mb-4 bg-accent text-white hover:bg-accent/90 border-none px-3 sm:px-4 py-0.5 sm:py-1 text-xs sm:text-md">
            سوق العراق الأول
          </Badge>
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-3 sm:mb-4 leading-tight px-4">
            اكتشف <span className="text-accent">آلاف المنتجات المميزة</span>
          </h2>
          <p className="text-sm sm:text-lg opacity-90 mb-4 sm:mb-6 max-w-xl mx-auto px-4">
            سجل الآن وابدأ التسوق من أفضل البائعين في العراق
          </p>
          <Link href="/search">
            <Button size="default" className="bg-accent text-white hover:bg-accent/90 font-bold px-6 sm:px-8 h-10 sm:h-12 text-sm sm:text-lg flex items-center gap-2 mx-auto">
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
              تصفح المنتجات
            </Button>
          </Link>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="py-8 sm:py-12 bg-white border-t">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <h2 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-8 text-primary">لماذا تختارنا؟</h2>
          <div className="grid grid-cols-1 gap-3 sm:gap-8 md:grid-cols-3">
            <div className="p-4 sm:p-6 bg-gray-50 rounded-xl">
              <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">موثوق وآمن</h3>
              <p className="opacity-80 text-gray-600 text-sm sm:text-base">جميع البائعين يتم التحقق من هوياتهم لضمان تجربة شراء آمنة.</p>
            </div>
            <div className="p-4 sm:p-6 bg-gray-50 rounded-xl">
              <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">خصوصية تامة</h3>
              <p className="opacity-80 text-gray-600 text-sm sm:text-base">بياناتك الشخصية وأرقام هواتفك محمية ومشفرة.</p>
            </div>
            <div className="p-4 sm:p-6 bg-gray-50 rounded-xl">
              <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">دعم محلي</h3>
              <p className="opacity-80 text-gray-600 text-sm sm:text-base">فريق دعم عراقي جاهز لمساعدتك في أي وقت.</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
