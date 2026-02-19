import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useListings } from "@/hooks/use-listings";
import { useLanguage } from "@/lib/i18n";
import { CONDITION_LABELS } from "@/lib/search-data";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock, Tag, Zap, Sparkles, Heart, ShoppingBag, Gavel, TrendingUp, Timer, MapPin, Star } from "lucide-react";
import { OptimizedImage } from "@/components/optimized-image";
import { FavoriteButton } from "@/components/favorite-button";
import type { Listing } from "@shared/schema";

const CATEGORIES = [
  { id: "ساعات", name: "ساعات", nameEn: "watches", icon: Clock, color: "blue" },
  { id: "إلكترونيات", name: "إلكترونيات", nameEn: "electronics", icon: Zap, color: "amber" },
  { id: "ملابس", name: "ملابس", nameEn: "clothing", icon: Tag, color: "purple" },
  { id: "أحذية", name: "أحذية", nameEn: "shoes", icon: ShoppingBag, color: "orange" },
  { id: "تحف وأثاث", name: "تحف وأثاث", nameEn: "antiques", icon: Sparkles, color: "rose" },
  { id: "مجوهرات", name: "مجوهرات", nameEn: "jewelry", icon: Heart, color: "pink" },
  { id: "مكياج", name: "مكياج", nameEn: "makeup", icon: Sparkles, color: "fuchsia" },
  { id: "آلات موسيقية", name: "آلات موسيقية", nameEn: "music", icon: Gavel, color: "indigo" },
  { id: "مقتنيات", name: "مقتنيات", nameEn: "collectibles", icon: ShoppingBag, color: "teal" },
  { id: "أخرى", name: "أخرى", nameEn: "other", icon: Tag, color: "gray" },
];

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    price: number;
    currentBid?: number;
    image: string;
    saleType: "auction" | "fixed";
    auctionEndTime?: Date | string | null;
    views?: number;
    condition?: string;
    specifications?: Record<string, string | number | boolean>;
  };
}

function ProductCard({ product }: ProductCardProps) {
  const { language } = useLanguage();
  const aspects = [
    product.condition && (CONDITION_LABELS[product.condition] ? (language === "ar" ? CONDITION_LABELS[product.condition].ar : CONDITION_LABELS[product.condition].ku) : product.condition),
    (product.specifications as Record<string, string>)?.["size"] || (product.specifications as Record<string, string>)?.["shoeSize"],
    (product.specifications as Record<string, string>)?.["color"],
  ].filter(Boolean);
  return (
    <Link href={`/product/${product.id}`}>
      <div className="overflow-hidden cursor-pointer group flex-shrink-0 w-[calc(40vw-8px)] sm:w-[170px] rounded-lg bg-white shadow-sm hover:shadow-md active:scale-[0.98] transition-all" data-testid={`card-product-${product.id}`}>
        <div className="relative aspect-square overflow-hidden rounded-2xl">
          <OptimizedImage 
            src={product.image} 
            alt={product.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {product.currentBid && (
            <Badge className="absolute top-1.5 right-1.5 bg-primary text-white text-[10px] px-1.5 py-0.5 z-10 shadow-sm">
              مزاد
            </Badge>
          )}
          <div className="absolute top-1 left-1">
            <FavoriteButton listingId={product.id} size="sm" />
          </div>
        </div>
        <div className="p-2">
          <h3 className="font-medium text-[11px] mb-1 line-clamp-2 text-gray-800 group-hover:text-primary transition-colors leading-snug">
            {product.title}
          </h3>
          {aspects.length > 0 && (
            <p className="text-[9px] text-muted-foreground line-clamp-1 mb-0.5">{aspects.join(" • ")}</p>
          )}
          <p className="font-bold text-sm text-primary">
            {product.currentBid ? product.currentBid.toLocaleString() : product.price.toLocaleString()} <span className="text-[10px] font-medium">د.ع</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  seeAllLink?: string;
  seeAllText?: string;
}

function Section({ title, icon, children, seeAllLink, seeAllText }: SectionProps) {
  return (
    <section className="py-3">
      <div className="container mx-auto px-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {icon}
            <h2 className="text-xs font-bold text-primary">{title}</h2>
          </div>
          {seeAllLink && (
            <Link href={seeAllLink} className="text-[10px] text-primary font-medium hover:underline">
              {seeAllText || "عرض الكل"}
            </Link>
          )}
        </div>
        <div 
          className="flex gap-2 overflow-x-auto pb-1.5 snap-x snap-mandatory" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="snap-start flex-shrink-0 w-[calc(40vw-8px)] sm:w-[170px]">
          <div className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
        </div>
      ))}
    </>
  );
}

export default function Home() {
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [userPreferredCategories, setUserPreferredCategories] = useState<string[]>([]);
  const [userPriceRange, setUserPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: Infinity });
  const { language } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    try {
      const viewedStored = localStorage.getItem("recentlyViewed");
      if (viewedStored) {
        const ids = JSON.parse(viewedStored) as string[];
        setRecentlyViewedIds(ids.slice(0, 10));
      }

      const categoriesStored = localStorage.getItem("userPreferredCategories");
      if (categoriesStored) {
        const categories = JSON.parse(categoriesStored) as string[];
        setUserPreferredCategories(categories);
      }

      const priceRangeStored = localStorage.getItem("userPriceRange");
      if (priceRangeStored) {
        const range = JSON.parse(priceRangeStored);
        setUserPriceRange(range);
      }
    } catch (e) {
      console.log("Error loading from localStorage:", e);
    }
  }, []);

  // Fetch server-side user preferences (for logged-in users)
  const { data: serverPreferences } = useQuery<{
    topCategories: string[];
    recentSearches: string[];
    priceRange: { low: number; high: number } | null;
    topBrands: string[];
  }>({
    queryKey: ["/api/account/preferences"],
    queryFn: async () => {
      const res = await fetch("/api/account/preferences");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user?.id,
  });

  // Sync server preferences to localStorage when available
  useEffect(() => {
    if (serverPreferences) {
      if (serverPreferences.topCategories.length > 0) {
        setUserPreferredCategories(serverPreferences.topCategories);
        localStorage.setItem("userPreferredCategories", JSON.stringify(serverPreferences.topCategories));
      }
      if (serverPreferences.priceRange) {
        const range = { min: serverPreferences.priceRange.low, max: serverPreferences.priceRange.high };
        setUserPriceRange(range);
        localStorage.setItem("userPriceRange", JSON.stringify(range));
      }
    }
  }, [serverPreferences]);

  // Fetch personalized recommendations (for logged-in users)
  const { data: recommendations } = useQuery<{
    categoryRecommendations: Array<{ category: string; label: string; listings: any[] }>;
    recommended: any[];
    popularInArea: any[];
  }>({
    queryKey: ["/api/recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/recommendations");
      if (!res.ok) return { categoryRecommendations: [], recommended: [], popularInArea: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id,
  });

  const { data: listingsData, isLoading } = useListings({ limit: 100 });
  const listings: Listing[] = listingsData?.listings || [];

  const { data: watchlistData } = useQuery({
    queryKey: ["watchlist", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/users/${user.id}/watchlist`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  const displayProducts = useMemo(() => {
    return listings
      .filter(l => {
        const remaining = (l.quantityAvailable || 1) - (l.quantitySold || 0);
        return remaining > 0;
      })
      .map(l => ({
        id: l.id,
        title: l.title,
        price: l.price,
        currentBid: l.currentBid || undefined,
        image: l.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
        saleType: l.saleType as "auction" | "fixed",
        auctionEndTime: l.auctionEndTime,
        category: l.category,
        views: l.views || 0,
        createdAt: l.createdAt,
        condition: l.condition || undefined,
        specifications: (l as any).specifications || undefined,
      }));
  }, [listings]);

  const recentlyViewedProducts = useMemo(() => {
    return displayProducts.filter(p => recentlyViewedIds.includes(p.id)).slice(0, 10);
  }, [displayProducts, recentlyViewedIds]);

  const favoriteProducts = useMemo(() => {
    if (!watchlistData || !Array.isArray(watchlistData)) return [];
    const watchlistIds = watchlistData.map((w: any) => w.listingId);
    return displayProducts.filter(p => watchlistIds.includes(p.id)).slice(0, 10);
  }, [displayProducts, watchlistData]);

  const newArrivals = useMemo(() => {
    let filtered = [...displayProducts];
    if (userPreferredCategories.length > 0) {
      const inPreferred = filtered.filter(p => userPreferredCategories.includes(p.category || ""));
      const others = filtered.filter(p => !userPreferredCategories.includes(p.category || ""));
      filtered = [...inPreferred, ...others];
    }
    return filtered
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);
  }, [displayProducts, userPreferredCategories]);

  const endingSoon = useMemo(() => {
    const now = new Date();
    let auctions = displayProducts.filter(p => {
      if (p.saleType !== "auction" || !p.auctionEndTime) return false;
      const endTime = new Date(p.auctionEndTime);
      return endTime > now;
    });
    if (userPreferredCategories.length > 0) {
      const inPreferred = auctions.filter(p => userPreferredCategories.includes(p.category || ""));
      const others = auctions.filter(p => !userPreferredCategories.includes(p.category || ""));
      auctions = [...inPreferred, ...others];
    }
    return auctions
      .sort((a, b) => new Date(a.auctionEndTime!).getTime() - new Date(b.auctionEndTime!).getTime())
      .slice(0, 10);
  }, [displayProducts, userPreferredCategories]);

  const mostViewed = useMemo(() => {
    let filtered = [...displayProducts];
    if (userPreferredCategories.length > 0) {
      const inPreferred = filtered.filter(p => userPreferredCategories.includes(p.category || ""));
      const others = filtered.filter(p => !userPreferredCategories.includes(p.category || ""));
      filtered = [...inPreferred, ...others];
    }
    return filtered.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  }, [displayProducts, userPreferredCategories]);

  return (
    <Layout>
      {/* Categories - Horizontal Sliding Strip */}
      <section className="py-2 bg-gradient-to-l from-primary/5 to-primary/10 overflow-hidden border-b border-border/30">
        <div className="container mx-auto px-3">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <Link key={i} href={`/search?category=${encodeURIComponent(cat.id)}`}>
                  <div 
                    className="group cursor-pointer flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full soft-border hover:shadow-md transition-all whitespace-nowrap active:scale-95 hover:bg-primary hover:text-white"
                    data-testid={`category-top-${cat.id}`}
                  >
                    <div className={`h-5 w-5 bg-${cat.color}-100 group-hover:bg-${cat.color}-200 rounded-full flex items-center justify-center transition-all`}>
                      <Icon className={`h-3 w-3 text-${cat.color}-600`} />
                    </div>
                    <span className="font-medium text-xs text-gray-800 group-hover:text-white transition-colors">{cat.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="min-h-screen bg-background">
        {/* Recently Viewed */}
        {recentlyViewedProducts.length > 0 && (
          <Section 
            title={language === "ar" ? "شوهد مؤخراً" : "تازە بینراوەکان"}
            icon={<Eye className="h-4 w-4 text-blue-600" />}
            seeAllLink="/browse/recently-viewed"
            seeAllText={language === "ar" ? "عرض الكل" : "هەموو"}
          >
            {recentlyViewedProducts.map((product) => (
              <div key={product.id} className="snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </Section>
        )}

        {/* Favorites / Watchlist */}
        {favoriteProducts.length > 0 && (
          <Section 
            title={language === "ar" ? "المفضلة" : "دڵخوازەکان"}
            icon={<Heart className="h-4 w-4 text-red-500" />}
            seeAllLink="/favorites"
            seeAllText={language === "ar" ? "عرض الكل" : "هەموو"}
          >
            {favoriteProducts.map((product) => (
              <div key={product.id} className="snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </Section>
        )}

        {/* Category recommendations -- subtle, per-category rows */}
        {recommendations?.categoryRecommendations?.map((group) => {
          const catInfo = CATEGORIES.find(c => c.id === group.category);
          const CatIcon = catInfo?.icon || Tag;
          return (
            <Section
              key={group.category}
              title={group.label}
              icon={<CatIcon className="h-4 w-4 text-primary" />}
              seeAllLink={`/search?category=${encodeURIComponent(group.category)}`}
              seeAllText={language === "ar" ? "عرض الكل" : "هەموو"}
            >
              {group.listings.map((product: any) => (
                <div key={product.id} className="snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </Section>
          );
        })}

        {/* Recommended for you */}
        {recommendations?.recommended && recommendations.recommended.length > 0 && (
          <Section
            title={language === "ar" ? "مقترح لك" : "پێشنیارکراو بۆ تۆ"}
            icon={<Star className="h-4 w-4 text-yellow-500" />}
            seeAllLink="/search"
            seeAllText={language === "ar" ? "عرض الكل" : "هەموو"}
          >
            {recommendations.recommended.map((product: any) => (
              <div key={product.id} className="snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </Section>
        )}

        {/* New Arrivals */}
        <Section 
          title={language === "ar" ? "جديد الآن" : "تازەکان"}
          icon={<Sparkles className="h-4 w-4 text-purple-600" />}
          seeAllLink="/search?sort=newest"
          seeAllText={language === "ar" ? "عرض الكل" : "هەموو"}
        >
          {isLoading ? <LoadingSkeleton /> : (
            newArrivals.map((product) => (
              <div key={product.id} className="snap-start">
                <ProductCard product={product} />
              </div>
            ))
          )}
        </Section>

        {/* Ending Soon (Auctions) */}
        {endingSoon.length > 0 && (
          <Section 
            title={language === "ar" ? "ينتهي قريباً" : "زوو دەکوژرێتەوە"}
            icon={<Timer className="h-4 w-4 text-orange-600" />}
            seeAllLink="/search?saleType=auction&sort=ending_soon"
            seeAllText={language === "ar" ? "عرض الكل" : "هەموو"}
          >
            {endingSoon.map((product) => (
              <div key={product.id} className="snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </Section>
        )}

        {/* Popular in your area */}
        {recommendations?.popularInArea && recommendations.popularInArea.length > 0 && (
          <Section
            title={language === "ar" ? "رائج في منطقتك" : "بەناوبانگ لە ناوچەکەت"}
            icon={<MapPin className="h-4 w-4 text-green-500" />}
            seeAllLink="/search"
            seeAllText={language === "ar" ? "عرض الكل" : "هەموو"}
          >
            {recommendations.popularInArea.map((product: any) => (
              <div key={product.id} className="snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </Section>
        )}

        {/* Trending */}
        <Section 
          title={language === "ar" ? "الأكثر رواجاً" : "ترێند"}
          icon={<TrendingUp className="h-4 w-4 text-indigo-600" />}
          seeAllLink="/search?sort=views"
          seeAllText={language === "ar" ? "عرض الكل" : "هەموو"}
        >
          {isLoading ? <LoadingSkeleton /> : (
            mostViewed.map((product) => (
              <div key={product.id} className="snap-start">
                <ProductCard product={product} />
              </div>
            ))
          )}
        </Section>

        {displayProducts.length === 0 && !isLoading && (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500">
              {language === "ar" ? "لا توجد منتجات حالياً" : "هیچ بەرهەمێک نییە"}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
