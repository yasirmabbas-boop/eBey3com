import { Link } from "wouter";
import { ExternalLink, MapPin, Truck, RotateCcw, Tag, Star, BadgeCheck } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ProductComments } from "@/components/product-comments";
import { useLanguage } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { VerifiedBadge } from "@/components/verified-badge";
import { AuctionCountdown } from "@/components/auction-countdown";
import type { Listing } from "@shared/schema";

interface SwipeReelDetailsProps {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SwipeReelDetails({ listing, open, onOpenChange }: SwipeReelDetailsProps) {
  const { language, t } = useLanguage();

  // Fetch seller data
  const { data: sellerData } = useQuery({
    queryKey: ["/api/users", listing?.sellerId, "public"],
    queryFn: async () => {
      if (!listing?.sellerId) return null;
      const res = await fetch(`/api/users/${listing.sellerId}/public`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!listing?.sellerId && open,
  });

  const formatPrice = (price: number) => {
    return price.toLocaleString("ar-IQ") + " د.ع";
  };

  if (!listing) return null;

  const isAuction = listing.saleType?.toLowerCase() === "auction";
  const isSoldOut = (listing.quantityAvailable || 1) - (listing.quantitySold || 0) <= 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className="h-[95vh] p-0 max-h-[95vh]"
        dir="rtl"
      >
        <DrawerHeader className="px-4 pt-6 pb-4 border-b">
          <DrawerTitle className="text-right">
            {language === "ar" ? "تفاصيل المنتج" : language === "ku" ? "وردەکارییەکانی بەرهەم" : "تفاصيل المنتج"}
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="h-[calc(95vh-140px)] flex-1">
          <div className="px-4 py-4 pb-24 space-y-6">
            {/* Title */}
            <h1 className="text-xl font-bold leading-tight">
              {listing.title}
            </h1>

            {/* Price Section */}
            <div className="py-2 border-b">
              {isAuction ? (
                <>
                  <p className="text-3xl font-bold">
                    {formatPrice(listing.currentBid || listing.price)}
                  </p>
                  {(listing as any).totalBids > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {(listing as any).totalBids} {language === "ar" ? "مزايدة" : language === "ku" ? "مزایدە" : "مزايدة"}
                    </p>
                  )}
                  {listing.auctionEndTime && listing.isActive && (
                    <div className="mt-2">
                      <AuctionCountdown endTime={listing.auctionEndTime} simple />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold">{formatPrice(listing.price)}</p>
                  {listing.isNegotiable && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === "ar" ? "أو أفضل عرض" : language === "ku" ? "یان باشترین پێشنیار" : "أو أفضل عرض"}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Seller Info */}
            <Link 
              href={`/search?sellerId=${listing.sellerId}`}
              className="flex items-center gap-3 py-3 border-b hover:bg-gray-50 transition-colors"
            >
              {sellerData?.avatar ? (
                <img 
                  src={sellerData.avatar} 
                  alt={listing.sellerName || "البائع"}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm">
                  {(listing.sellerName || "ب").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{listing.sellerName || (language === "ar" ? "بائع" : language === "ku" ? "فرۆشیار" : "بائع")}</span>
                  {sellerData?.isVerified && <VerifiedBadge size="sm" />}
                  {(sellerData?.totalSales || 0) > 0 && (
                    <span className="text-xs text-muted-foreground">({sellerData?.totalSales})</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {(sellerData?.ratingCount || 0) > 0 ? (
                    <span className="text-green-600 font-medium">
                      {Math.round((sellerData?.rating || 0) * 20)}% {language === "ar" ? "تقييم إيجابي" : language === "ku" ? "هەڵسەنگاندنی ئەرێنی" : "تقييم إيجابي"}
                    </span>
                  ) : (
                    <span>{language === "ar" ? "بائع جديد" : language === "ku" ? "فرۆشیاری نوێ" : "بائع جديد"}</span>
                  )}
                </div>
              </div>
            </Link>

            {/* Description */}
            {listing.description && (
              <div className="py-2 border-b">
                <h2 className="font-bold text-lg mb-2">{t("description")}</h2>
                <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Specifications */}
            <div>
              <h3 className="font-bold text-lg mb-3">
                {language === "ar" ? "المواصفات" : language === "ku" ? "تایبەتمەندییەکان" : "المواصفات"}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-muted-foreground">{t("condition")}</span>
                  <span className="font-medium">{listing.condition}</span>
                </div>
                
                {(listing as any).brand && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">
                      {language === "ar" ? "الماركة" : language === "ku" ? "مارکە" : "الماركة"}
                    </span>
                    <span className="font-medium">{(listing as any).brand}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-muted-foreground">{t("category")}</span>
                  <span className="font-medium">{listing.category}</span>
                </div>

                {(listing as any).productCode && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">{t("productCode")}</span>
                    <span className="font-medium text-xs">{(listing as any).productCode}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Shipping Info */}
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                {language === "ar" ? "معلومات الشحن" : language === "ku" ? "زانیاری گواستنەوە" : "معلومات الشحن"}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">{t("delivery")}</span>
                  <span className="font-medium">
                    {listing.deliveryWindow || (language === "ar" ? "3-5 أيام" : language === "ku" ? "٣-٥ ڕۆژ" : "3-5 أيام")}
                  </span>
                </div>
                
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "الشحن" : language === "ku" ? "گواستنەوە" : "الشحن"}
                  </span>
                  <span className="font-medium">
                    {listing.shippingType === "buyer_pays"
                      ? `${(listing.shippingCost || 0).toLocaleString()} ${t("iqd")}`
                      : listing.shippingType === "pickup"
                        ? (language === "ar" ? "استلام شخصي" : language === "ku" ? "وەرگرتنی کەسی" : "استلام شخصي")
                        : (language === "ar" ? "مجاني" : language === "ku" ? "بەخۆڕایی" : "مجاني")}
                  </span>
                </div>

                {listing.city && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {t("location")}
                    </span>
                    <span className="font-medium">{listing.city}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Return Policy */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <RotateCcw className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800 mb-1">{t("returnPolicy")}</p>
                  <p className="text-sm text-amber-700">
                    {listing.returnPolicy || (language === "ar" ? "لا يوجد إرجاع" : language === "ku" ? "گەڕاندنەوە نییە" : "لا يوجد إرجاع")}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  {language === "ar" ? "الكلمات المفتاحية" : language === "ku" ? "ووشە سەرەکییەکان" : "الكلمات المفتاحية"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {listing.tags.map((tag: string, index: number) => (
                    <Link
                      key={index}
                      href={`/search?q=${encodeURIComponent(tag)}`}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Comments - Without Composer */}
            <ProductComments listingId={listing.id} hideComposer />

            {/* View Full Page Button */}
            <Link href={`/product/${listing.id}`}>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                <ExternalLink className="h-4 w-4 ml-2" />
                {language === "ar" ? "عرض الصفحة الكاملة" : language === "ku" ? "پەڕەی تەواو ببینە" : "عرض الصفحة الكاملة"}
              </Button>
            </Link>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
