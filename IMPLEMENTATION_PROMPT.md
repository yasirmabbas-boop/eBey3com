# eBey3 Search Infrastructure — Stability & Accuracy Patch

**Role:** Lead Developer
**Directive:** Stop all feature development. Patch the critical stability, accuracy, and routing bugs in our Meilisearch + React InstantSearch implementation. Execute the following 4 phases and output code blocks for each file.

---

## Context — What We're Working With

- **Framework:** React + Wouter (SPA router) + TanStack React Query
- **Search:** Meilisearch Cloud proxied through `/api/meilisearch` → `react-instantsearch` v7.14 + `@meilisearch/instant-meilisearch` v0.14
- **Languages:** Arabic (primary), Kurdish, English
- **Categories:** 7 Arabic-named categories: `ملابس`, `أحذية`, `إلكترونيات`, `ساعات`, `سيارات`, `مجوهرات`, `تحف وأثاث`
- **Existing mapping:** `CATEGORY_SEARCH_FILTERS` in `client/src/lib/search-data.ts` already maps each category to its relevant specification keys (e.g., `"أحذية" → ["gender", "shoeBrand", "shoeSize", "shoeStyle", "color"]`)
- **Existing endpoint:** `GET /api/hot-listings?limit=N` returns popular active listings
- **Existing component:** `<EmptySearchState>` accepts `suggestions: string[]` and `fallbackListings: Listing[]` props but they're currently hardcoded to `[]`

---

## Phase 1 — Stop the Network Spam & Fix the Back Button Trap

**Target:** `client/src/pages/search.tsx`

### Action A — Debounce the SearchBox (300ms)

The current `<SearchBox>` (line ~207) fires a network request on every keystroke. Add the `queryHook` prop to debounce:

```tsx
<SearchBox
  queryHook={(query, search) => {
    clearTimeout((window as any).__searchDebounce);
    (window as any).__searchDebounce = setTimeout(() => search(query), 300);
  }}
  // ... keep existing classNames and placeholder props
/>
```

Alternatively, use the `useSearchBox` hook with a local `useState` + `useEffect` debounce for cleaner code — whichever approach is simpler to slot into the existing component structure.

### Action B — Add writeDelay to InstantSearch Routing (400ms)

The current routing config (line ~413) uses raw `stateMapping` without any write delay. Every keystroke pushes a new browser history entry, making the Back button useless.

Import the history router from InstantSearch core and combine it with our existing `stateMapping`:

```tsx
import historyRouter from "instantsearch.js/es/lib/routers/history";
```

Update the `<InstantSearch>` `routing` prop:

```tsx
routing={{
  router: historyRouter({
    writeDelay: 400,
    createURL({ qsModule, routeState, location }) {
      const qs = qsModule.stringify(routeState, { addQueryPrefix: true });
      return `${location.pathname}${qs}`;
    },
  }),
  stateMapping: {
    stateToRoute(uiState) {
      const indexState = uiState.listings || {};
      const route: Record<string, string> = {};
      if (indexState.query) route.q = indexState.query;
      if (indexState.sortBy) route.sort = indexState.sortBy;
      // Persist active category refinement in URL
      if (indexState.refinementList?.category?.length) {
        route.category = indexState.refinementList.category.join(",");
      }
      return route;
    },
    routeToState(routeState) {
      const safe = routeState && typeof routeState === "object" ? routeState : {};
      return {
        listings: {
          query: typeof safe.q === "string" ? safe.q : "",
          sortBy: typeof safe.sort === "string" ? safe.sort : undefined,
          refinementList: {
            category: typeof safe.category === "string"
              ? safe.category.split(",")
              : [],
          },
        },
      };
    },
  },
}}
```

**Why writeDelay: 400:** This batches rapid URL updates (keystrokes, facet clicks) and uses `replaceState` for intermediate changes. Only the final settled state creates a `pushState` entry. 400ms matches the debounce so the URL updates once per search, not once per character.

---

## Phase 2 — Tune Search Accuracy & Multilingual Relevance

**Target:** `server/services/meilisearch.ts` — the `initializeMeilisearch()` function

Add three new configuration calls after the existing `updateSortableAttributes` call:

### Action A — Custom Ranking Rules

```typescript
await index.updateRankingRules([
  "words",
  "typo",
  "proximity",
  "attribute",   // Respects searchableAttributes order: title > description > brand > category
  "sort",
  "exactness",
  "isActive:desc",  // Active listings rank above sold/inactive
  "views:desc",     // Popular items get a relevance boost
]);
```

**Why this order matters for e-commerce:** A title-exact match for "Nike Air Max" should rank above a description mention. Active/in-stock items must always appear above sold-out ones. View count acts as a popularity signal to break ties.

### Action B — Arabic & Kurdish Stop Words

```typescript
await index.updateStopWords([
  // Arabic particles
  "في", "من", "على", "إلى", "و", "أو", "ال", "هو", "هي",
  "هذا", "هذه", "ذلك", "تلك", "مع", "عن", "أن", "لا",
  // Kurdish (Sorani) particles
  "لە", "بۆ", "بە", "لەگەڵ", "و", "یان", "ئەو", "ئەم",
  "کە", "لە", "بە", "هەر",
]);
```

### Action C — Typo Tolerance Tuning

```typescript
await index.updateTypoTolerance({
  minWordSizeForTypos: {
    oneTypo: 4,   // No typo matching on 1-3 char words (Arabic particles like "في", "من")
    twoTypos: 8,  // Two-typo tolerance only on 8+ char words
  },
});
```

**Why:** Arabic and Kurdish have many 2-3 character function words. With default typo tolerance, searching "من" (from) fuzzy-matches unrelated words, producing garbage results.

---

## Phase 3 — Dynamic Filters & Empty State Recovery

**Target:** `client/src/pages/search.tsx`

### Action A — Category-Aware Dynamic Filters

The `CATEGORY_SEARCH_FILTERS` map in `client/src/lib/search-data.ts` already defines which specifications belong to each category:

```
"ملابس"      → ["gender", "clothingType", "clothingBrand", "size", "color", "material"]
"أحذية"      → ["gender", "shoeBrand", "shoeSize", "shoeStyle", "color"]
"إلكترونيات" → ["storage", "ram", "color"]
"ساعات"      → ["movement", "caseSize", "color"]
"سيارات"     → ["fuelType", "transmission", "bodyType"]
"مجوهرات"    → ["jewelryMaterial", "gemstone", "color"]
"تحف وأثاث"  → ["era", "material"]
```

In the `FiltersSheet` component:

1. Import `useCurrentRefinements` from `react-instantsearch` and `CATEGORY_SEARCH_FILTERS` + `SPEC_LABELS` (the label map) from `@/lib/search-data`
2. Read the currently refined category: `const { items } = useCurrentRefinements({ includedAttributes: ["category"] })`
3. Extract the selected categories from items
4. Look up which spec attributes to show: `CATEGORY_SEARCH_FILTERS[selectedCategory]`
5. For each spec key in the list, render a `<RefinementList attribute={`specifications.${specKey}`} />` with the translated label from `SPEC_LABELS`
6. If no category is selected, show no spec filters (just the base 4: category, saleType, condition, price)

This means when someone selects "أحذية", they see shoeSize, shoeStyle, etc. When they select "ساعات", they see movement, caseSize, etc. When nothing is selected, the panel stays clean.

### Action B — Populate the Empty State

The `<EmptySearchState>` component already supports `suggestions` and `fallbackListings` props — they're just hardcoded to `[]`.

In the `SearchResults` component, when `hits.length === 0`:

1. Add a `useQuery` fetch to `GET /api/hot-listings?limit=6` to get popular products
2. Pass the results as `fallbackListings` to `<EmptySearchState>`
3. For `suggestions`, extract 2-3 recent/common search terms if available, or omit

```tsx
const { data: hotListings = [] } = useQuery({
  queryKey: ["/api/hot-listings", 6],
  queryFn: () => fetch("/api/hot-listings?limit=6").then(r => r.json()),
  staleTime: 60_000,
});

return (
  <EmptySearchState
    query={query || undefined}
    onClearFilters={undefined}
    language={language}
    suggestions={[]}
    fallbackListings={hotListings}
  />
);
```

Now the user always has a recovery path — popular products to browse when their search returns nothing.

---

## Phase 4 — Proxy Stability & Error Handling

### Action A — Proxy Timeout

**Target:** `server/routes/meilisearch.ts`

Wrap the `fetch()` call in a 5-second AbortController. If Meilisearch Cloud hangs, the proxy returns a clean 504 instead of holding a Cloud Run slot indefinitely:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, { ...init, signal: controller.signal });
  clearTimeout(timeout);
  // ... rest of handler
} catch (err) {
  clearTimeout(timeout);
  if ((err as Error).name === "AbortError") {
    res.status(504).json({ error: "Meilisearch request timed out" });
  } else {
    console.error("[Meilisearch proxy] Error:", (err as Error).message);
    res.status(502).json({ error: "Meilisearch proxy error" });
  }
}
```

### Action B — React Error Boundary (Optional but Recommended)

Wrap `<InstantSearch>` in a local error boundary so a proxy failure shows "Search temporarily unavailable" instead of crashing the entire page tree. The global ErrorBoundary in App.tsx catches this today, but a local boundary gives a better UX with a retry button.

---

## Output Protocol

Execute Phase 1 and Phase 2 first. Output the complete modified files. Wait for confirmation before proceeding to Phase 3 and Phase 4.

## Files Touched

| Phase | File | What Changes |
|-------|------|-------------|
| 1A | `client/src/pages/search.tsx` | SearchBox `queryHook` debounce |
| 1B | `client/src/pages/search.tsx` | `historyRouter({ writeDelay: 400 })` + updated stateMapping |
| 2A | `server/services/meilisearch.ts` | `updateRankingRules()` call |
| 2B | `server/services/meilisearch.ts` | `updateStopWords()` call |
| 2C | `server/services/meilisearch.ts` | `updateTypoTolerance()` call |
| 3A | `client/src/pages/search.tsx` | Dynamic spec filters via `useCurrentRefinements` + `CATEGORY_SEARCH_FILTERS` |
| 3B | `client/src/pages/search.tsx` | `useQuery("/api/hot-listings")` → `<EmptySearchState fallbackListings={...}>` |
| 4A | `server/routes/meilisearch.ts` | 5-second AbortController timeout |
| 4B | `client/src/pages/search.tsx` | Local ErrorBoundary around InstantSearch (optional) |
