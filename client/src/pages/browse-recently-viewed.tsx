import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { ProductGridSkeleton } from "@/components/optimized-image";
import { EmptyState } from "@/components/empty-state";
import { useLanguage } from "@/lib/i18n";
import { AuctionCountdown } from "@/components/auction-countdown";
import { useListings } from "@/hooks/use-listings";
import { CONDITION_LABELS } from "@/lib/search-data";
import type { Listing } from "@shared/schema";

export default function BrowseRecentlyViewed() {
  const { language } = useLanguage();
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recentlyViewed");
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setRecentlyViewedIds(ids);
      }
    } catch (e) {
      console.log("Error loading recently viewed:", e);
    }
  }, []);

  const { data: listingsData, isLoading } = useListings({ 
    limit: 100 
  });

  const recentlyViewedProducts = (listingsData?.listings || [])
    .filter((l: Listing) => recentlyViewedIds.includes(l.id))
    .sort((a: Listing, b: Listing) => {
      return recentlyViewedIds.indexOf(a.id) - recentlyViewedIds.indexOf(b.id);
    });

  const formatPrice = (price: number) => {
    return price.toLocaleString("ar-IQ") + " د.ع";
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Eye className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold">
            {language === "ar" ? "شوهد مؤخراً" : language === "ku" ? "تازە بینراوەکان" : "شوهد مؤخراً"}
          </h1>
          {recentlyViewedProducts.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {recentlyViewedProducts.length} {language === "ar" ? "منتج" : language === "ku" ? "بەرهەم" : "Products"}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <ProductGridSkeleton count={6} />
        ) : recentlyViewedProducts.length === 0 ? (
          <EmptyState
            type="search"
            title={language === "ar" ? "لا توجد منتجات شوهدت مؤخراً" : language === "ku" ? "هیچ بەرهەمێکت نەبینیوە" : "لا توجد منتجات شوهدت مؤخراً"}
            description={language === "ar" ? "ابدأ بتصفح المنتجات وسنحفظ سجل المشاهدة هنا لتتمكن من العودة إليها بسهولة" : language === "ku" ? "دەست بکە بە گەڕان بە بەرهەمەکان و ئێمە مێژووی بینینەکەت لێرە پاشەکەوت دەکەین" : "ابدأ بتصفح المنتجات وسنحفظ سجل المشاهدة هنا لتتمكن من العودة إليها بسهولة"}
            actionLabel={language === "ar" ? "تصفح المنتجات" : language === "ku" ? "گەڕان بە بەرهەمەکان" : "تصفح المنتجات"}
            actionHref="/search"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recentlyViewedProducts.map((listing: Listing) => (
              <Card 
                key={listing.id} 
                className="overflow-hidden soft-border hover-elevate transition-shadow group"
              >
                <Link href={`/product/${listing.id}`}>
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted/40">
                    <img
                      src={listing.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {listing.saleType === "auction" && (
                      <Badge className="absolute top-2 right-2 bg-primary text-white text-xs">
                        {language === "ar" ? "مزاد" : language === "ku" ? "مزایدە" : "مزاد"}
                      </Badge>
                    )}
                  </div>
                </Link>
                <CardContent className="p-3">
                  <Link href={`/product/${listing.id}`}>
                    <h3 className="font-bold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {listing.title}
                    </h3>
                  </Link>
                  {(() => {
                    const specs = (listing as any).specifications || {};
                    const aspects = [
                      (listing as any).condition && (CONDITION_LABELS[(listing as any).condition] ? (language === "ar" ? CONDITION_LABELS[(listing as any).condition].ar : CONDITION_LABELS[(listing as any).condition].ku) : (listing as any).condition),
                      specs.size || specs.shoeSize,
                      specs.color,
                    ].filter(Boolean);
                    return aspects.length > 0 ? (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{aspects.join(" • ")}</p>
                    ) : null;
                  })()}
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-primary text-sm">
                      {formatPrice(listing.currentBid || listing.price)}
                    </p>
                    {/* Views - Hidden */}
                    {/* <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {(listing as any).views || 0}
                    </span> */}
                  </div>
                  {listing.saleType === "auction" && listing.auctionEndTime && (
                    <div className="mb-2">
                      <AuctionCountdown endTime={listing.auctionEndTime} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
