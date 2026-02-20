import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Heart,
  ShoppingBag,
  Gavel,
  Package,
  MessageCircle,
  Search,
  Bell,
  ShoppingCart,
  Store,
  FileText,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/i18n";
import type { Listing } from "@shared/schema";

type EmptyStateType = 
  | "favorites"
  | "cart"
  | "bids"
  | "orders"
  | "messages"
  | "search"
  | "notifications"
  | "listings"
  | "sales"
  | "products"
  | "generic";

interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  language?: "ar" | "ku" | "en";
}

const iconMap: Record<EmptyStateType, React.ComponentType<{ className?: string }>> = {
  favorites: Heart,
  cart: ShoppingCart,
  bids: Gavel,
  orders: Package,
  messages: MessageCircle,
  search: Search,
  notifications: Bell,
  listings: Store,
  sales: ShoppingBag,
  products: Package,
  generic: FileText,
};

const illustrationColors: Record<EmptyStateType, string> = {
  favorites: "text-pink-300",
  cart: "text-blue-300",
  bids: "text-amber-300",
  orders: "text-green-300",
  messages: "text-purple-300",
  search: "text-gray-300",
  notifications: "text-orange-300",
  listings: "text-indigo-300",
  sales: "text-teal-300",
  products: "text-cyan-300",
  generic: "text-gray-300",
};

export function EmptyState({
  type = "generic",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  const Icon = iconMap[type];
  const iconColor = illustrationColors[type];

  return (
    <div className={cn("text-center py-12 px-4", className)}>
      <div className="relative mx-auto w-24 h-24 mb-6">
        <div className="absolute inset-0 bg-gray-100 rounded-full animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={cn("h-12 w-12", iconColor)} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full border-2 border-gray-100 flex items-center justify-center">
          <Clock className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
      
      {description && (
        <p className="text-gray-500 mb-6 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      
      {(actionLabel && (actionHref || onAction)) && (
        actionHref ? (
          <Link href={actionHref}>
            <Button className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              {actionLabel}
            </Button>
          </Link>
        ) : (
          <Button onClick={onAction} className="gap-2">
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}

export function EmptySearchState({ 
  query,
  onClearFilters,
  language = "ar",
  suggestions = [],
  fallbackListings = [],
}: { 
  query?: string;
  onClearFilters?: () => void;
  language?: Language;
  suggestions?: string[];
  fallbackListings?: Listing[];
}) {
  const texts = {
    ar: {
      noResults: "لم نجد نتائج",
      noResultsFor: "لم نجد نتائج لـ",
      suggestions: "جرب البحث بكلمات مختلفة أو تصفح الفئات",
      didYouMean: "هل تقصد:",
      popularNow: "منتجات شائعة الآن",
      clearFilters: "مسح الفلاتر",
      browseAll: "تصفح جميع المنتجات"
    },
    ku: {
      noResults: "هیچ ئەنجامێک نەدۆزرایەوە",
      noResultsFor: "هیچ ئەنجامێک نەدۆزرایەوە بۆ",
      suggestions: "هەوڵ بدە بە وشەی جیاواز بگەڕێیت یان پۆلەکان ببینە",
      didYouMean: "مەبەستت ئەمەیە:",
      popularNow: "بەرهەمە باوەکانی ئێستا",
      clearFilters: "سڕینەوەی فلتەرەکان",
      browseAll: "بینینی هەموو بەرهەمەکان"
    }
  };
  
  const t = texts[language as keyof typeof texts] || texts.ar;

  return (
    <div className="text-center py-12 px-4 bg-gray-50 rounded-xl">
      <div className="relative mx-auto w-20 h-20 mb-6">
        <div className="absolute inset-0 bg-gray-200 rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Search className="h-10 w-10 text-gray-400" />
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-gray-800 mb-2">
        {query ? `${t.noResultsFor} "${query}"` : t.noResults}
      </h3>
      
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        {t.suggestions}
      </p>

      {suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">{t.didYouMean}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((term) => (
              <Link key={term} href={`/search?q=${encodeURIComponent(term)}`}>
                <Button variant="outline" size="sm">
                  {term}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            {t.clearFilters}
          </Button>
        )}
        <Link href="/search">
          <Button variant="default">
            {t.browseAll}
          </Button>
        </Link>
      </div>

      {fallbackListings.length > 0 && (
        <div className="mt-8 text-right">
          <p className="text-sm font-medium text-gray-700 mb-3 text-center">{t.popularNow}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fallbackListings.slice(0, 6).map((item) => (
              <Link key={item.id} href={`/product/${item.id}`}>
                <div className="rounded-lg border bg-white overflow-hidden hover:shadow-sm transition-shadow">
                  <img
                    src={item.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300"}
                    alt={item.title}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="p-2">
                    <p className="text-xs text-gray-700 line-clamp-1">{item.title}</p>
                    <p className="text-xs font-semibold text-gray-900">
                      {(item.currentBid || item.price || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
