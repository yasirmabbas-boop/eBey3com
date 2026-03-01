import { useMemo } from "react";
import { useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import {
  InstantSearch,
  SearchBox,
  RefinementList,
  Configure,
  useHits,
  SortBy,
  RangeInput,
  ClearRefinements,
} from "react-instantsearch";
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductGridSkeleton } from "@/components/optimized-image";
import { EmptySearchState } from "@/components/empty-state";
import { useLanguage } from "@/lib/i18n";
import {
  SPECIFICATION_OPTIONS,
  CONDITION_LABELS,
  getSpecLabel,
} from "@/lib/search-data";
import type { Listing } from "@shared/schema";

const SORT_OPTIONS = [
  { value: "listings:relevance", labelAr: "الأكثر صلة", labelKu: "پەیوەندیدارترین" },
  { value: "listings:createdAt:desc", labelAr: "الأحدث", labelKu: "نوێترین" },
  { value: "listings:views:desc", labelAr: "الأكثر مشاهدة", labelKu: "زۆرترین بینراو" },
  { value: "listings:price:asc", labelAr: "السعر: من الأقل للأعلى", labelKu: "نرخ: لە کەمەوە بۆ زۆر" },
  { value: "listings:price:desc", labelAr: "السعر: من الأعلى للأقل", labelKu: "نرخ: لە زۆرەوە بۆ کەم" },
];

const MEILISEARCH_PROXY = `${window.location.origin}/api/meilisearch`;

const searchClient = (() => {
  try {
    const { searchClient: sc } = instantMeiliSearch(MEILISEARCH_PROXY, "");
    return sc;
  } catch {
    return null;
  }
})();

function ListingHitCard({
  hit,
  language,
  t,
}: {
  hit: Listing & Record<string, unknown>;
  language: string;
  t: (k: string) => string;
}) {
  const remaining = (hit.quantityAvailable || 1) - (hit.quantitySold || 0);
  const showLowStockBadge = hit.isActive && remaining > 0 && remaining <= 3;
  const shippingCost = hit.shippingCost || 0;
  const shippingType = (hit as Record<string, unknown>).shippingType || "seller_pays";

  return (
    <Link href={`/product/${hit.id}`}>
      <Card
        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-gray-200 bg-white active:scale-[0.98]"
        data-testid={`search-result-${hit.id}`}
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
          <img
            src={(hit.images as string[])?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"}
            alt={hit.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {hit.saleType === "auction" && hit.isActive && (
            <Badge className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-primary text-white border-0 text-[9px] sm:text-xs shadow-md">
              مزاد
            </Badge>
          )}
          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
            <FavoriteButton listingId={hit.id} size="sm" />
          </div>
          {!hit.isActive && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="text-white font-bold text-xs sm:text-sm bg-black/50 px-2 py-1 rounded-lg">
                {t("sold")}
              </span>
            </div>
          )}
        </div>
        <div className="p-2 sm:p-3">
          <h3 className="font-normal text-sm sm:text-base text-gray-700 line-clamp-2 group-hover:text-primary transition-colors leading-tight mb-1.5">
            {hit.title}
          </h3>
          {(() => {
            const specs = (hit.specifications || {}) as Record<string, string>;
            const sizeVal = specs?.size || specs?.shoeSize;
            const sizeSpecKey = specs?.size ? "size" : "shoeSize";
            const aspects = [
              hit.condition && (CONDITION_LABELS[hit.condition]
                ? language === "ar"
                  ? CONDITION_LABELS[hit.condition].ar
                  : CONDITION_LABELS[hit.condition].ku
                : hit.condition),
              sizeVal ? (getSpecLabel(sizeSpecKey as keyof typeof SPECIFICATION_OPTIONS, sizeVal, language) ?? sizeVal) : undefined,
              specs?.color ? (getSpecLabel("color", specs.color, language) ?? specs.color) : undefined,
              specs?.material ? (getSpecLabel("material", specs.material, language) ?? specs.material) : undefined,
            ].filter(Boolean);
            return (
              aspects.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 mb-1">
                  {aspects.join(" • ")}
                </p>
              )
            );
          })()}
          {showLowStockBadge && (
            <div className="mb-1.5">
              <Badge className="bg-amber-500 text-white border-0 text-[8px] sm:text-[10px] px-1.5 py-0.5">
                {remaining <= 1
                  ? language === "ar"
                    ? "آخر قطعة"
                    : "یەک دانە ماوە"
                  : language === "ar"
                    ? `آخر ${remaining} قطع`
                    : `${remaining} دانە ماوە`}
              </Badge>
            </div>
          )}
          <div>
            <p className="text-gray-900 font-bold text-sm sm:text-base">
              {(hit.currentBid || hit.price || 0).toLocaleString()} {t("currency")}
            </p>
            {shippingType === "buyer_pays" && shippingCost > 0 ? (
              <p className="text-[10px] sm:text-xs text-gray-400">
                + {shippingCost.toLocaleString()} {t("shipping")}
              </p>
            ) : shippingType === "pickup" ? (
              <p className="text-[10px] sm:text-xs text-gray-500">
                {language === "ar" ? "استلام شخصي" : "وەرگرتنی کەسی"}
              </p>
            ) : (
              <p className="text-[10px] sm:text-xs text-green-600">{t("freeShipping")}</p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function SearchResults({ language, t }: { language: string; t: (k: string) => string }) {
  const { hits, results, status } = useHits<Listing & Record<string, unknown>>();

  if (status === "loading" || status === "idle") {
    return <ProductGridSkeleton count={12} />;
  }

  if (hits.length === 0) {
    const query = results?.query ?? "";
    return (
      <EmptySearchState
        query={query || undefined}
        onClearFilters={undefined}
        language={language}
        suggestions={[]}
        fallbackListings={[]}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
      {hits.map((hit) => (
        <ListingHitCard key={hit.id} hit={hit} language={language} t={t} />
      ))}
    </div>
  );
}

function SearchContent({
  sellerIdParam,
  language,
  t,
}: {
  sellerIdParam: string | null;
  language: string;
  t: (k: string) => string;
}) {
  const baseFilter = "isDeleted = false";
  const filter = sellerIdParam
    ? `${baseFilter} AND sellerId = "${sellerIdParam}"`
    : baseFilter;

  return (
    <>
      <Configure filter={filter} hitsPerPage={24} attributesToRetrieve={["*"]} />
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/40">
        <div className="flex-1 min-w-0">
          <SearchBox
            placeholder={language === "ar" ? "ابحث عن منتجات..." : language === "ku" ? "گەڕان بۆ بەرهەم..." : "Search products..."}
            classNames={{
              root: "w-full",
              form: "relative",
              input: "w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm",
              submit: "absolute right-2 top-1/2 -translate-y-1/2",
              reset: "absolute right-10 top-1/2 -translate-y-1/2",
            }}
          />
        </div>
        <SortBy
          items={SORT_OPTIONS.map((opt) => ({
            value: opt.value,
            label: language === "ar" ? opt.labelAr : opt.labelKu,
          }))}
          classNames={{
            root: "min-w-[120px]",
            select: "h-8 text-xs rounded-md border border-input bg-background px-2",
          }}
        />
        <FiltersSheet language={language} t={t} />
      </div>
      <SearchResults language={language} t={t} />
    </>
  );
}

function FiltersSheet({ language, t }: { language: string; t: (k: string) => string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-8 px-2" data-testid="open-filters">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t("filters")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
        <SheetHeader className="p-4 border-b border-border/60 bg-muted/60">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-5 w-5 text-primary" />
            {t("filters")}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            <ClearRefinements
              classNames={{
                root: "w-full",
                button: "w-full text-red-600 border-red-200 hover:bg-red-50",
              }}
              translations={{ reset: t("clearAllFilters") }}
            />
            <div>
              <h3 className="font-semibold text-sm mb-2">{t("categoriesLabel")}</h3>
              <RefinementList
                attribute="category"
                showMore
                limit={20}
                classNames={{
                  list: "space-y-2",
                  item: "flex items-center justify-between",
                  label: "cursor-pointer flex items-center gap-2",
                  checkbox: "mr-2",
                  count: "text-xs text-muted-foreground",
                }}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">{t("saleTypeLabel")}</h3>
              <RefinementList
                attribute="saleType"
                classNames={{
                  list: "space-y-2",
                  item: "flex items-center justify-between",
                  label: "cursor-pointer flex items-center gap-2",
                  checkbox: "mr-2",
                  count: "text-xs text-muted-foreground",
                }}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">{t("conditionLabel")}</h3>
              <RefinementList
                attribute="condition"
                classNames={{
                  list: "space-y-2",
                  item: "flex items-center justify-between",
                  label: "cursor-pointer",
                  checkbox: "mr-2",
                  count: "text-xs text-muted-foreground",
                }}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">{t("priceRange")}</h3>
              <RangeInput
                attribute="price"
                classNames={{
                  form: "space-y-4",
                  input: "h-9 rounded-md border border-input bg-background px-3 text-sm",
                  separator: "text-muted-foreground",
                  submit: "mt-2 h-9 px-4 rounded-md bg-primary text-primary-foreground",
                }}
                translations={{
                  separatorElementText: "-",
                  submitButtonText: t("submit"),
                }}
              />
            </div>
          </div>
        </ScrollArea>
        <SheetFooter className="p-4 pb-20 border-t bg-gray-50">
          <SheetTrigger asChild>
            <Button className="w-full" data-testid="close-filters">
              {t("close")}
            </Button>
          </SheetTrigger>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function SearchPage() {
  const { language, t } = useLanguage();
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const sellerIdParam = params.get("sellerId");

  const { data: sellerInfo } = useQuery({
    queryKey: ["/api/users", sellerIdParam],
    queryFn: async () => {
      if (!sellerIdParam) return null;
      const res = await fetch(`/api/users/${sellerIdParam}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!sellerIdParam,
  });

  const dir = language === "ar" ? "rtl" : "ltr";

  if (!searchClient) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6" dir={dir}>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {language === "ar"
                ? "البحث غير متاح حالياً. يرجى المحاولة لاحقاً."
                : language === "ku"
                  ? "گەڕان لە ئێستادا بەردەست نییە."
                  : "Search is temporarily unavailable."}
            </p>
            <Link href="/">
              <Button variant="outline">
                {language === "ar" ? "العودة للرئيسية" : language === "ku" ? "گەڕانەوە بۆ سەرەکی" : "Back to Home"}
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6" dir={dir}>
        {sellerIdParam && sellerInfo && (
          <div className="bg-gradient-to-l from-primary via-[#1b2b5a] to-[#0f172a] text-white rounded-xl p-6 mb-6 shadow-[var(--shadow-2)]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                {sellerInfo.displayName?.charAt(0) ||
                  sellerInfo.username?.charAt(0) ||
                  (language === "ar" ? "م" : language === "ku" ? "د" : "م")}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">
                  {t("store")} {sellerInfo.displayName || sellerInfo.username}
                </h2>
                <div className="flex items-center gap-4 mt-1 text-blue-100 text-sm">
                  {sellerInfo.totalSales > 0 && (
                    <span>
                      {sellerInfo.totalSales} {t("salesCount")}
                    </span>
                  )}
                  {sellerInfo.ratingCount > 0 && (
                    <span>
                      {Math.round((sellerInfo.rating || 0) * 20)}% {t("positiveRating")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <InstantSearch
          searchClient={searchClient}
          indexName="listings"
          initialUiState={{
            listings: {
              query: params.get("q") || "",
            },
          }}
          routing={{
            stateMapping: {
              stateToRoute(uiState) {
                const indexState = uiState.listings || {};
                const route: Record<string, string> = {};
                if (indexState.query) route.q = indexState.query;
                if (indexState.sortBy) route.sort = indexState.sortBy;
                return route;
              },
              routeToState(routeState) {
                // Guard against non-object values (e.g., ?q=yasir parsed as string)
                const safe = routeState && typeof routeState === "object" ? routeState : {};
                return {
                  listings: {
                    query: (typeof safe.q === "string" ? safe.q : "") as string,
                    sortBy: (typeof safe.sort === "string" ? safe.sort : undefined) as string | undefined,
                  },
                };
              },
            },
          }}
        >
          <SearchContent sellerIdParam={sellerIdParam} language={language} t={t} />
        </InstantSearch>
      </div>
    </Layout>
  );
}
