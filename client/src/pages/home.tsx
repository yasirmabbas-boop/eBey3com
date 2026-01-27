import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useListings } from "@/hooks/use-listings";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock, Search as SearchIcon } from "lucide-react";
import { AuctionCountdown } from "@/components/auction-countdown";
import { OptimizedImage } from "@/components/optimized-image";
import { FavoriteButton } from "@/components/favorite-button";
import type { Listing } from "@shared/schema";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    price: number;
    currentBid?: number;
    image: string;
    saleType: "auction" | "fixed";
    auctionEndTime?: Date | string | null;
  };
}

function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`}>
      <Card className="overflow-hidden cursor-pointer group soft-border hover-elevate active:scale-[0.98] flex-shrink-0 w-[calc(40vw-12px)] sm:w-[180px]" data-testid={`card-product-${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <OptimizedImage 
            src={product.image} 
            alt={product.title} 
            className="w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
          {product.currentBid && (
            <Badge className="absolute top-1.5 right-1.5 bg-primary text-white text-[10px] px-1.5 py-0.5 z-10">
              مزاد
            </Badge>
          )}
          <div className="absolute top-1 left-1">
            <FavoriteButton listingId={product.id} size="sm" />
          </div>
        </div>
        <CardContent className="p-2">
          <h3 className="font-bold text-xs mb-1 line-clamp-1 group-hover:text-primary transition-colors leading-tight">
            {product.title}
          </h3>
          <p className="font-bold text-sm text-primary">
            {product.currentBid ? product.currentBid.toLocaleString() : product.price.toLocaleString()} <span className="text-[10px]">د.ع</span>
          </p>
        </CardContent>
        {product.saleType === "auction" && product.auctionEndTime && (
          <CardFooter className="px-2 py-1.5 bg-orange-50">
            <AuctionCountdown endTime={product.auctionEndTime} />
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <section className="py-4">
      <div className="container mx-auto px-3">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h2 className="text-sm font-bold text-primary">{title}</h2>
        </div>
        <div 
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [previousSearches, setPreviousSearches] = useState<string[]>([]);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    try {
      const viewedStored = localStorage.getItem("recentlyViewed");
      if (viewedStored) {
        const ids = JSON.parse(viewedStored) as string[];
        setRecentlyViewedIds(ids.slice(0, 10));
      }
      
      const searchesStored = localStorage.getItem("previousSearches");
      if (searchesStored) {
        const searches = JSON.parse(searchesStored) as string[];
        setPreviousSearches(searches.slice(0, 10));
      }
    } catch (e) {
      console.log("Error loading from localStorage:", e);
    }
  }, []);

  const sellerId = user?.id;
  const { data: listingsData, isLoading } = useListings({ limit: 30, sellerId });
  const listings: Listing[] = listingsData?.listings || [];

  const displayProducts = listings
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
    }));

  const recentlyViewedProducts = displayProducts.filter(p => 
    recentlyViewedIds.includes(p.id)
  ).slice(0, 10);

  const relevantProducts = displayProducts.slice(0, 10);

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {recentlyViewedProducts.length > 0 && (
          <Section 
            title={language === "ar" ? "شوهد مؤخراً" : "تازە بینراوەکان"}
            icon={<Eye className="h-4 w-4 text-blue-600" />}
          >
            {recentlyViewedProducts.map((product) => (
              <div key={product.id} className="snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </Section>
        )}

        {previousSearches.length > 0 && (
          <Section 
            title={language === "ar" ? "عمليات بحث سابقة" : "گەڕانە پێشووەکان"}
            icon={<SearchIcon className="h-4 w-4 text-green-600" />}
          >
            {previousSearches.map((search, index) => (
              <div 
                key={index} 
                className="snap-start flex-shrink-0 w-[calc(40vw-12px)] sm:w-[180px]"
                onClick={() => navigate(`/search?q=${encodeURIComponent(search)}`)}
              >
                <Card className="cursor-pointer hover:shadow-md transition-shadow h-full flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="text-center">
                    <SearchIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700 line-clamp-2">{search}</p>
                  </div>
                </Card>
              </div>
            ))}
          </Section>
        )}

        <Section 
          title={language === "ar" ? "منتجات مقترحة" : "بەرهەمە پێشنیارکراوەکان"}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
        >
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="snap-start flex-shrink-0 w-[calc(40vw-12px)] sm:w-[180px]">
                <div className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
              </div>
            ))
          ) : (
            relevantProducts.map((product) => (
              <div key={product.id} className="snap-start">
                <ProductCard product={product} />
              </div>
            ))
          )}
        </Section>

        {relevantProducts.length === 0 && !isLoading && (
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
