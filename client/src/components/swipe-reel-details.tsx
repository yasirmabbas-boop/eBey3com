import { Link } from "wouter";
import { ExternalLink, MapPin, Truck, RotateCcw, Tag, Eye } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ProductComments } from "@/components/product-comments";
import { useLanguage } from "@/lib/i18n";
import type { Listing } from "@shared/schema";

interface SwipeReelDetailsProps {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SwipeReelDetails({ listing, open, onOpenChange }: SwipeReelDetailsProps) {
  const { language, t } = useLanguage();

  if (!listing) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] p-0"
        dir="rtl"
      >
        <SheetHeader className="px-4 pt-6 pb-4 border-b">
          <SheetTitle className="text-right">
            {language === "ar" ? "تفاصيل المنتج" : "وردەکارییەکانی بەرهەم"}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-80px)]">
          <div className="px-4 py-4 space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-bold text-lg mb-2">{t("description")}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {listing.description || (language === "ar" 
                  ? "لا يوجد وصف متوفر لهذا المنتج."
                  : "هیچ وەسفێک بۆ ئەم بەرهەمە بەردەست نییە."
                )}
              </p>
            </div>

            <Separator />

            {/* Specifications */}
            <div>
              <h3 className="font-bold text-lg mb-3">
                {language === "ar" ? "المواصفات" : "تایبەتمەندییەکان"}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-muted-foreground">{t("condition")}</span>
                  <span className="font-medium">{listing.condition}</span>
                </div>
                
                {(listing as any).brand && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">
                      {language === "ar" ? "الماركة" : "مارکە"}
                    </span>
                    <span className="font-medium">{(listing as any).brand}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-muted-foreground">{t("category")}</span>
                  <span className="font-medium">{listing.category}</span>
                </div>

                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {t("views")}
                  </span>
                  <span className="font-medium">{(listing as any).views || 0}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Shipping Info */}
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                {language === "ar" ? "معلومات الشحن" : "زانیاری گواستنەوە"}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">{t("delivery")}</span>
                  <span className="font-medium">
                    {listing.deliveryWindow || (language === "ar" ? "3-5 أيام" : "٣-٥ ڕۆژ")}
                  </span>
                </div>
                
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">
                    {language === "ar" ? "الشحن" : "گواستنەوە"}
                  </span>
                  <span className="font-medium">
                    {listing.shippingType === "buyer_pays"
                      ? `${(listing.shippingCost || 0).toLocaleString()} ${t("iqd")}`
                      : listing.shippingType === "pickup"
                        ? (language === "ar" ? "استلام شخصي" : "وەرگرتنی کەسی")
                        : (language === "ar" ? "مجاني" : "بەخۆڕایی")}
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
                    {listing.returnPolicy || (language === "ar"
                      ? "يرجى التواصل مع البائع لمعرفة سياسة الإرجاع"
                      : "تکایە پەیوەندی بکە بە فرۆشیار بۆ زانینی سیاسەتی گەڕاندنەوە"
                    )}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <>
                <div>
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    {language === "ar" ? "الكلمات المفتاحية" : "ووشە سەرەکییەکان"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {listing.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Comments */}
            <ProductComments listingId={listing.id} />

            {/* View Full Page Button */}
            <Link href={`/product/${listing.id}`}>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                <ExternalLink className="h-4 w-4 ml-2" />
                {language === "ar" ? "عرض الصفحة الكاملة" : "پەڕەی تەواو ببینە"}
              </Button>
            </Link>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
