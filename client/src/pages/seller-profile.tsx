import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Star, MapPin, Calendar, Package, Share2, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { shareToFacebook, shareToWhatsApp, shareToTelegram } from "@/lib/share-utils";
import { VerifiedBadge } from "@/components/verified-badge";
import { useListings } from "@/hooks/use-listings";

interface SellerInfo {
  id: string;
  displayName: string;
  avatar?: string;
  city?: string;
  rating?: number;
  ratingCount?: number;
  isAuthenticated?: boolean;
  createdAt: string;
  totalListings?: number;
  totalSales?: number;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  images: string[];
  saleType: string;
  currentBid?: number;
}

export default function SellerProfile() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { toast } = useToast();

  const { data: seller, isLoading: sellerLoading } = useQuery<SellerInfo>({
    queryKey: ["/api/users", id, "public"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${id}/public`);
      if (!res.ok) throw new Error("Failed to fetch seller");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: listingsData, isLoading: listingsLoading } = useListings({
    sellerId: id || undefined,
    limit: 50,
  });
  
  const listings = listingsData?.listings || [];

  const handleShare = (platform: string) => {
    const shareText = language === "ar" 
      ? `تصفح منتجات ${seller?.displayName || "البائع"} على E-بيع`
      : `Check out ${seller?.displayName || "seller"}'s products on E-بيع`;

    switch (platform) {
      case "whatsapp":
        shareToWhatsApp(window.location.href, shareText);
        break;
      case "facebook":
        shareToFacebook(window.location.href);
        break;
      case "telegram":
        shareToTelegram(window.location.href, shareText);
        break;
      case "copy":
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: language === "ar" ? "تم النسخ!" : "Copied!",
          description: language === "ar" ? "تم نسخ الرابط" : "Link copied to clipboard",
        });
        break;
    }
  };

  if (sellerLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!seller) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">
            {language === "ar" ? "البائع غير موجود" : "Seller not found"}
          </h1>
        </div>
      </Layout>
    );
  }

  const activeListings = listings.filter(l => {
    return true;
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6 soft-border elev-1">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                {seller.avatar ? (
                  <img
                    src={seller.avatar}
                    alt={seller.displayName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
                    {seller.displayName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="text-center md:text-right flex-1">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h1 className="text-2xl font-bold">{seller.displayName}</h1>
                  {seller.isAuthenticated && (
                    <VerifiedBadge size="md" />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-600 mb-4">
                  {seller.rating && seller.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{seller.rating.toFixed(1)}</span>
                      {seller.ratingCount && (
                        <span className="text-sm">({seller.ratingCount})</span>
                      )}
                    </div>
                  )}
                  {seller.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{seller.city}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {language === "ar" ? "عضو منذ" : "Member since"}{" "}
                      {new Date(seller.createdAt).toLocaleDateString("ar-IQ", { year: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{activeListings.length}</span>
                    <span>{language === "ar" ? "منتج" : "products"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border/60">
              <p className="text-sm text-gray-500 mb-3 text-center md:text-right">
                {language === "ar" ? "شارك المتجر:" : "Share this shop:"}
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600"
                  onClick={() => handleShare("whatsapp")}
                  data-testid="button-share-whatsapp-seller"
                >
                  <svg className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600"
                  onClick={() => handleShare("facebook")}
                  data-testid="button-share-facebook-seller"
                >
                  <svg className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-600"
                  onClick={() => handleShare("telegram")}
                  data-testid="button-share-telegram-seller"
                >
                  <svg className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Telegram
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare("copy")}
                  data-testid="button-copy-link-seller"
                >
                  <Share2 className="h-4 w-4 ml-1" />
                  {language === "ar" ? "نسخ الرابط" : "Copy Link"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold mb-4">
          {language === "ar" ? "منتجات البائع" : "Seller's Products"}
        </h2>

        {listingsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : activeListings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {language === "ar" ? "لا توجد منتجات حالياً" : "No products available"}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeListings.map((listing) => (
              <Link key={listing.id} href={`/product/${listing.id}`}>
                <Card className="overflow-hidden soft-border hover-elevate transition-shadow cursor-pointer">
                  <div className="aspect-square relative">
                    <img
                      src={listing.images?.[0] || "/placeholder.png"}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    {listing.saleType === "auction" && (
                      <Badge className="absolute top-2 right-2 bg-primary">
                        {language === "ar" ? "مزاد" : "Auction"}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{listing.title}</h3>
                    <p className="font-bold text-primary">
                      {(listing.currentBid || listing.price).toLocaleString()} د.ع
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
