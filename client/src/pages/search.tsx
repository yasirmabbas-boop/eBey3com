import { useMemo, useRef, useEffect, useState } from "react";
import { useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import {
  InstantSearch,
  SearchBox,
  RefinementList,
  Configure,
  useHits,
  useInstantSearch,
  useCurrentRefinements,
  useClearRefinements,
  SortBy,
  RangeInput,
  ClearRefinements,
} from "react-instantsearch";
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Filter,
  SlidersHorizontal,
  AlertTriangle,
  RefreshCw,
  X,
} from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductGridSkeleton } from "@/components/optimized-image";
import { EmptySearchState } from "@/components/empty-state";
import { useLanguage } from "@/lib/i18n";
import {
  SPECIFICATION_OPTIONS,
  CONDITION_LABELS,
  CATEGORY_SEARCH_FILTERS,
  SPECIFICATION_LABELS,
  getSpecLabel,
} from "@/lib/search-data";
import { Component, type ErrorInfo, type ReactNode } from "react";
import type { Listing } from "@shared/schema";

/** Local error boundary so a Meilisearch proxy failure doesn't crash the whole page */
class SearchErrorBoundary extends Component<
  { children: ReactNode; language: string },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[SearchErrorBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      const lang = this.props.language;
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {lang === "ar"
              ? "البحث غير متاح حالياً. يرجى المحاولة لاحقاً."
              : lang === "ku"
                ? "گەڕان لە ئێستادا بەردەست نییە."
                : "Search is temporarily unavailable."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-primary underline text-sm"
          >
            {lang === "ar" ? "إعادة المحاولة" : lang === "ku" ? "دووبارە هەوڵبدە" : "Try again"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SORT_OPTIONS = [
  { value: "listings", labelAr: "الأكثر صلة", labelKu: "پەیوەندیدارترین" },
  { value: "listings:createdAt:desc", labelAr: "الأحدث", labelKu: "نوێترین" },
  { value: "listings:views:desc", labelAr: "الأكثر مشاهدة", labelKu: "زۆرترین بینراو" },
  { value: "listings:price:asc", labelAr: "السعر: من الأقل للأعلى", labelKu: "نرخ: لە کەمەوە بۆ زۆر" },
  { value: "listings:price:desc", labelAr: "السعر: من الأعلى للأقل", labelKu: "نرخ: لە زۆرەوە بۆ کەم" },
];

const MEILISEARCH_PROXY = `${window.location.origin}/api/meilisearch`;

const searchClient = (() => {
  try {
    const { searchClient: sc } = instantMeiliSearch(MEILISEARCH_PROXY, "", {
      placeholderSearch: true,
      keepZeroFacets: true,
      meiliSearchParams: {
        facets: ["*"],
      },
    });
    return sc;
  } catch (err) {
    console.error("[Search] Failed to create search client:", err);
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

/** Banner that checks Meilisearch health and shows a warning if the engine is down or empty */
function SearchHealthBanner({ language }: { language: string }) {
  const { data: health, isLoading } = useQuery<{
    status: "ok" | "degraded" | "down";
    documentCount: number;
    error?: string;
  }>({
    queryKey: ["/api/meilisearch/health"],
    queryFn: () => fetch("/api/meilisearch/health").then((r) => r.json()),
    staleTime: 30_000,
    retry: 1,
  });

  if (isLoading || !health || health.status === "ok") return null;

  const messages: Record<string, { down: string; degraded: string }> = {
    ar: {
      down: "محرك البحث غير متصل حالياً. يرجى المحاولة لاحقاً.",
      degraded: "محرك البحث متصل لكن الفهرس فارغ. قد تظهر النتائج قريباً بعد المزامنة.",
    },
    ku: {
      down: "مۆتۆری گەڕان لە ئێستادا نەبەستراوە. تکایە دواتر هەوڵ بدەرەوە.",
      degraded: "مۆتۆری گەڕان بەستراوە بەڵام ئیندێکسەکە بەتاڵە. ئەنجامەکان دوای هاوکاتکردن دەردەکەون.",
    },
    en: {
      down: "Search engine is currently offline. Please try again later.",
      degraded: "Search engine is connected but the index is empty. Results may appear after sync.",
    },
  };

  const lang = messages[language] || messages.ar;
  const msg = health.status === "down" ? lang.down : lang.degraded;

  return (
    <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{msg}</span>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1 text-xs font-medium hover:underline"
      >
        <RefreshCw className="h-3 w-3" />
        {language === "ar" ? "إعادة" : language === "ku" ? "دووبارە" : "Retry"}
      </button>
    </div>
  );
}

function SearchResults({ language, t }: { language: string; t: (k: string) => string }) {
  const { hits } = useHits<Listing & Record<string, unknown>>();
  const { status, results } = useInstantSearch();
  const { refine: clearAllRefinements, canRefine: hasActiveRefinements } = useClearRefinements();

  // Pre-fetch hot listings so empty state renders instantly
  const { data: hotListings = [] } = useQuery<Listing[]>({
    queryKey: ["/api/hot-listings", 6],
    queryFn: () => fetch("/api/hot-listings?limit=6").then((r) => r.json()),
    staleTime: 60_000,
  });

  if (status === "loading" && hits.length === 0) {
    return <ProductGridSkeleton count={12} />;
  }

  if (hits.length === 0) {
    const query = (results as any)?.query ?? "";
    return (
      <EmptySearchState
        query={query || undefined}
        onClearFilters={hasActiveRefinements ? clearAllRefinements : undefined}
        language={language}
        suggestions={[]}
        fallbackListings={hotListings}
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

/** Read the currently selected categories from InstantSearch state */
function useSelectedCategories(): string[] {
  const { items } = useCurrentRefinements({ includedAttributes: ["category"] });
  const cats: string[] = [];
  for (const item of items) {
    for (const ref of item.refinements) {
      if (typeof ref.value === "string") cats.push(ref.value);
    }
  }
  return cats;
}

/**
 * Automatically clears specification refinements that become irrelevant
 * when the user switches categories (e.g. shoeSize filter left active
 * after switching from Shoes to Electronics).
 */
function StaleSpecCleaner() {
  const selectedCategories = useSelectedCategories();
  const { items } = useCurrentRefinements();
  const prevCatsRef = useRef<string>(selectedCategories.join(","));

  useEffect(() => {
    const catsKey = selectedCategories.join(",");
    if (catsKey === prevCatsRef.current) return;
    prevCatsRef.current = catsKey;

    // Determine which spec attributes are valid for the new category selection
    const validAttrs = new Set<string>();
    for (const cat of selectedCategories) {
      const specs = CATEGORY_SEARCH_FILTERS[cat];
      if (specs) specs.forEach((k) => validAttrs.add(`specifications.${k}`));
    }

    // Clear any active spec refinements that are no longer valid
    for (const item of items) {
      if (
        item.attribute.startsWith("specifications.") &&
        !validAttrs.has(item.attribute)
      ) {
        for (const refinement of item.refinements) {
          item.refine(refinement);
        }
      }
    }
  }); // intentionally no deps — runs every render but early-returns if categories haven't changed

  return null;
}

const REFINEMENT_CLASS_NAMES = {
  list: "space-y-2",
  item: "flex items-center justify-between",
  label: "cursor-pointer flex items-center gap-2",
  checkbox: "mr-2 rtl:ml-2 rtl:mr-0",
  count: "text-xs text-muted-foreground",
};

/** Translation map for saleType facet values */
const SALE_TYPE_LABELS: Record<string, { ar: string; ku: string }> = {
  fixed: { ar: "سعر ثابت", ku: "نرخی جێگیر" },
  auction: { ar: "مزاد", ku: "مزایدە" },
};

/** Translation map for condition facet values */
const CONDITION_FACET_LABELS: Record<string, { ar: string; ku: string }> = {
  New: { ar: "جديد", ku: "نوێ" },
  "Used - Like New": { ar: "شبه جديد", ku: "وەک نوێ" },
  "Used - Good": { ar: "مستعمل - جيد", ku: "بەکارهاتوو - باش" },
  "Used - Fair": { ar: "مستعمل - مقبول", ku: "بەکارهاتوو - قبوڵ" },
  Vintage: { ar: "فينتاج", ku: "ڤینتەیج" },
  "For Parts or Not Working": { ar: "لا يعمل / لأجزاء", ku: "نایەوە کار / بۆ پارچەکان" },
  excellent: { ar: "ممتاز", ku: "نایاب" },
  very_good: { ar: "جيد جداً", ku: "زۆر باش" },
  good: { ar: "جيد", ku: "باش" },
  fair: { ar: "مقبول", ku: "قبوڵ" },
  for_parts: { ar: "للقطع", ku: "بۆ پارچەکان" },
  new: { ar: "جديد", ku: "نوێ" },
  used: { ar: "مستعمل", ku: "بەکارهاتوو" },
};

/** Helper: build a transformItems function that translates facet labels */
function makeTranslator(
  labelMap: Record<string, { ar: string; ku: string }>,
  language: string,
) {
  return (items: Array<{ label: string; [k: string]: any }>) =>
    items.map((item) => {
      const entry = labelMap[item.label];
      if (!entry) return item;
      return {
        ...item,
        label: language === "ar" ? entry.ar : language === "ku" ? entry.ku : item.label,
      };
    });
}

/** Translate spec facet values using SPECIFICATION_OPTIONS from search-data */
function makeSpecTranslator(specKey: string, language: string) {
  const options = SPECIFICATION_OPTIONS[specKey as keyof typeof SPECIFICATION_OPTIONS];
  if (!options || !Array.isArray(options)) return undefined;
  return (items: Array<{ label: string; [k: string]: any }>) =>
    items.map((item) => {
      const opt = (options as Array<{ value: string; labelAr: string; labelKu: string }>).find(
        (o) => o.value === item.label,
      );
      if (!opt) return item;
      return {
        ...item,
        label: language === "ar" ? opt.labelAr : language === "ku" ? opt.labelKu : item.label,
      };
    });
}

/** Price range filter class names for styling the built-in RangeInput */
const RANGE_INPUT_CLASS_NAMES = {
  root: "space-y-2",
  form: "flex items-center gap-2",
  input: "w-full h-9 rounded-md border border-input bg-background px-3 text-sm",
  separator: "text-muted-foreground text-sm",
  submit: "h-9 px-3 rounded-md bg-primary text-white text-sm hover:bg-primary/90",
};

/** Memoized spec filter to avoid recreating transformItems on every parent render */
function MemoizedSpecFilter({
  specKey,
  language,
  showMoreText,
}: {
  specKey: string;
  language: string;
  showMoreText: Record<string, any>;
}) {
  const labels = SPECIFICATION_LABELS[specKey];
  const label = labels
    ? language === "ar" ? labels.ar : labels.ku
    : specKey;
  const specTransform = useMemo(() => makeSpecTranslator(specKey, language), [specKey, language]);

  return (
    <div>
      <h3 className="font-semibold text-sm mb-2">{label}</h3>
      <RefinementList
        attribute={`specifications.${specKey}`}
        limit={10}
        showMoreLimit={30}
        showMore
        classNames={REFINEMENT_CLASS_NAMES}
        {...(specTransform ? { transformItems: specTransform } : {})}
        translations={showMoreText}
      />
    </div>
  );
}

/**
 * Filters panel — rendered inline (NOT in a portal) to stay inside the
 * InstantSearch context tree.  We toggle visibility with a simple boolean
 * state and use a fixed overlay so the UX is the same as the old Sheet.
 */
function FiltersPanel({
  language,
  t,
  open,
  onClose,
}: {
  language: string;
  t: (k: string) => string;
  open: boolean;
  onClose: () => void;
}) {
  const selectedCategories = useSelectedCategories();

  // Collect all spec keys to show based on selected categories
  const specKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const cat of selectedCategories) {
      const specs = CATEGORY_SEARCH_FILTERS[cat];
      if (specs) specs.forEach((k) => keys.add(k));
    }
    return Array.from(keys);
  }, [selectedCategories]);

  // Memoize transform functions so RefinementList doesn't re-render every cycle
  const saleTypeTransform = useMemo(() => makeTranslator(SALE_TYPE_LABELS, language), [language]);
  const conditionTransform = useMemo(() => makeTranslator(CONDITION_FACET_LABELS, language), [language]);
  const showMoreText = useMemo(
    () => ({
      showMoreButtonText({ isShowingMore }: { isShowingMore: boolean }) {
        return isShowingMore
          ? (language === "ar" ? "عرض أقل" : language === "ku" ? "کەمتر پیشان بدە" : "Show less")
          : (language === "ar" ? "عرض المزيد" : language === "ku" ? "زیاتر پیشان بدە" : "Show more");
      },
    }),
    [language],
  );

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 animate-in fade-in-0"
          onClick={onClose}
        />
      )}
      {/*
        Slide-in panel — ALWAYS mounted so RefinementList widgets register with
        InstantSearch on first render and honour initialUiState.
        When closed, we use CSS to hide the panel off-screen.
      */}
      <div
        className={`fixed inset-y-0 ${language === "ar" ? "left-0" : "right-0"} z-50 w-full sm:w-96 bg-background shadow-lg flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : (language === "ar" ? "-translate-x-full" : "translate-x-full")}`}
        dir={language === "ar" ? "rtl" : "ltr"}
        aria-hidden={!open}
      >
        <div className="p-4 border-b border-border/60 bg-muted/60 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Filter className="h-5 w-5 text-primary" />
            {t("filters")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            <ClearRefinements
              classNames={{
                root: "w-full",
                button: "w-full text-red-600 border-red-200 hover:bg-red-50",
              }}
              translations={{ resetButtonText: t("clearAllFilters") }}
            />
            <div>
              <h3 className="font-semibold text-sm mb-2">{t("categoriesLabel")}</h3>
              <RefinementList
                attribute="category"
                showMore
                limit={10}
                showMoreLimit={30}
                classNames={REFINEMENT_CLASS_NAMES}
                translations={showMoreText}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">{t("saleTypeLabel")}</h3>
              <RefinementList
                attribute="saleType"
                classNames={REFINEMENT_CLASS_NAMES}
                transformItems={saleTypeTransform}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">{t("conditionLabel")}</h3>
              <RefinementList
                attribute="condition"
                classNames={{
                  ...REFINEMENT_CLASS_NAMES,
                  label: "cursor-pointer",
                }}
                transformItems={conditionTransform}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">{t("priceRange")}</h3>
              <RangeInput
                attribute="price"
                classNames={RANGE_INPUT_CLASS_NAMES}
                translations={{
                  separatorElementText: "–",
                  submitButtonText: language === "ar" ? "تطبيق" : language === "ku" ? "جێبەجێکردن" : "Go",
                }}
              />
            </div>

            {/* Dynamic specification filters — shown only when a category is selected */}
            {specKeys.map((specKey) => (
              <MemoizedSpecFilter
                key={specKey}
                specKey={specKey}
                language={language}
                showMoreText={showMoreText}
              />
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 pb-20 border-t bg-gray-50">
          <Button className="w-full" onClick={onClose} data-testid="close-filters">
            {t("close")}
          </Button>
        </div>
      </div>
    </>
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const baseFilter = "isDeleted = false AND isActive = true";
  const filter = sellerIdParam
    ? `${baseFilter} AND sellerId = "${sellerIdParam}"`
    : baseFilter;

  return (
    <>
      <Configure filters={filter} hitsPerPage={48} attributesToRetrieve={["*"]} />
      <StaleSpecCleaner />
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/40">
        <div className="flex-1 min-w-0">
          <SearchBox
            placeholder={language === "ar" ? "ابحث عن منتجات..." : language === "ku" ? "گەڕان بۆ بەرهەم..." : "Search products..."}
            queryHook={(query, search) => {
              clearTimeout((window as any).__searchDebounce);
              (window as any).__searchDebounce = setTimeout(() => search(query), 300);
            }}
            classNames={{
              root: "w-full",
              form: "relative",
              input: "w-full h-11 rounded-md border border-blue-300 bg-blue-50 px-3 pr-10 text-base focus:ring-blue-500 focus:border-blue-500",
              submit: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400",
              reset: "absolute right-10 top-1/2 -translate-y-1/2 text-gray-400",
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
        <Button
          variant="outline"
          size="sm"
          className="gap-1 h-8 px-2"
          data-testid="open-filters"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t("filters")}
        </Button>
      </div>
      <SearchHealthBanner language={language} />
      <SearchResults language={language} t={t} />
      {/* Filters panel rendered INLINE (inside InstantSearch context, no portal) */}
      <FiltersPanel
        language={language}
        t={t}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />
    </>
  );
}


export default function SearchPage() {
  const { language, t } = useLanguage();
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const sellerIdParam = params.get("sellerId");
  const initialCategory = params.get("category");
  const initialQuery = params.get("q") || "";

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

  // Build initialUiState from URL parameters
  const initialUiState = useMemo(() => {
    const state: Record<string, any> = {};
    if (initialQuery) {
      state.query = initialQuery;
    }
    if (initialCategory) {
      state.refinementList = {
        category: [initialCategory],
      };
    }
    return { listings: state };
  }, [initialQuery, initialCategory]);

  if (!searchClient) {
    return (
      <Layout hideSearch>
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
    <Layout hideSearch>
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

        <SearchErrorBoundary language={language}>
        <InstantSearch
          searchClient={searchClient}
          indexName="listings"
          initialUiState={initialUiState}
        >
          <SearchContent
            sellerIdParam={sellerIdParam}
            language={language}
            t={t}
          />
        </InstantSearch>
        </SearchErrorBoundary>
      </div>
    </Layout>
  );
}
