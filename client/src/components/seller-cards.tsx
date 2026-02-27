import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Store, Star } from "lucide-react";
import { OptimizedImage } from "@/components/optimized-image";
import { FavoriteButton } from "@/components/favorite-button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { CONDITION_LABELS, getSpecLabel } from "@/lib/search-data";

interface SellerCardListing {
  id: string;
  title: string;
  price: number;
  currentBid?: number;
  image: string;
  saleType: string;
  auctionEndTime?: string | null;
  views?: number;
  condition?: string;
  specifications?: Record<string, string | number | boolean>;
}

interface SellerCardData {
  sellerId: string;
  sellerName: string;
  avatar: string | null;
  rating: number | null;
  listings: SellerCardListing[];
}

interface ProductCardProps {
  product: SellerCardListing;
}

function SellerProductCard({ product }: ProductCardProps) {
  const { language } = useLanguage();
  const specs = product.specifications as Record<string, string> | undefined;
  const sizeVal = specs?.size || specs?.shoeSize;
  const sizeSpecKey = specs?.size ? "size" : "shoeSize";
  const aspects = [
    product.condition && (CONDITION_LABELS[product.condition as keyof typeof CONDITION_LABELS]
      ? (language === "ar" ? CONDITION_LABELS[product.condition as keyof typeof CONDITION_LABELS].ar : CONDITION_LABELS[product.condition as keyof typeof CONDITION_LABELS].ku)
      : product.condition),
    sizeVal ? getSpecLabel(sizeSpecKey, sizeVal, language) : undefined,
    specs?.color ? getSpecLabel("color", specs.color, language) : undefined,
    specs?.material ? getSpecLabel("material", specs.material, language) : undefined,
  ].filter(Boolean);
  return (
    <Link href={`/product/${product.id}`}>
      <div className="overflow-hidden cursor-pointer group flex-shrink-0 w-[calc(40vw-8px)] sm:w-[170px] rounded-lg bg-white shadow-sm hover:shadow-md active:scale-[0.98] transition-all">
        <div className="relative aspect-square overflow-hidden rounded-2xl">
          <OptimizedImage
            src={product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"}
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
            {product.currentBid ? product.currentBid.toLocaleString() : product.price.toLocaleString()}{" "}
            <span className="text-[10px] font-medium">د.ع</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

function SellerCard({ card }: { card: SellerCardData }) {
  const { language } = useLanguage();
  const avatarSrc = card.avatar || undefined;

  return (
    <div className="snap-start flex-shrink-0 w-full min-w-[min(100%,320px)] sm:min-w-[360px]">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mx-2">
        <Link href={`/seller/${card.sellerId}`}>
          <div className="flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
            <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt={card.sellerName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Store className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800 truncate">{card.sellerName}</p>
              {card.rating != null && card.rating > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>{card.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </Link>
        <div
          className="flex gap-2 overflow-x-auto p-3 pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        >
          {card.listings.map((listing) => (
            <div key={listing.id} className="snap-start">
              <SellerProductCard product={listing} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SellerCards() {
  const { language } = useLanguage();
  const { data: { sellerCards = [] } = {}, isLoading } = useQuery<{ sellerCards: SellerCardData[] }>({
    queryKey: ["/api/seller-cards"],
    queryFn: async () => {
      const res = await fetch("/api/seller-cards?limit=5");
      if (!res.ok) return { sellerCards: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || sellerCards.length === 0) return null;

  const title = language === "ar" ? "متاجر قد تعجبك" : language === "ku" ? "ئەو فرۆشگایانەی کە ڕەنگە بەدڵت بن" : "متاجر قد تعجبك";

  return (
    <section className="py-3">
      <div className="container mx-auto px-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Store className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold text-primary">{title}</h2>
        </div>
        <div
          className="flex gap-0 overflow-x-auto pb-1.5 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        >
          {sellerCards.map((card) => (
            <SellerCard key={card.sellerId} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
