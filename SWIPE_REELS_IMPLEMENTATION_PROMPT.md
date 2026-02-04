# TikTok-Style Swipe Reels Feature - Implementation Guide

## Overview
Create a vertical, swipeable product discovery feature similar to TikTok Reels that allows users to browse items with intuitive gestures, filtering capabilities, and seamless interaction patterns.

---

## Feature Requirements

### 1. Core Functionality

#### A. Vertical Scrolling Interface
- **Behavior**: Snap-scroll vertical navigation (like TikTok)
- **Container**: Within existing `Layout` component with nav bars visible
- **Item Display**: One full item per viewport
- **Smooth Transitions**: Snap to next/previous item with smooth animations
- **Performance**: Virtual scrolling for infinite feed (only render 3-5 items at a time)

#### B. Hybrid Discovery Algorithm
Combine personalization with user-selected filters:

**Personalization Layer** (using existing localStorage data):
```javascript
// Already tracked in your codebase:
- recentlyViewed: Recently viewed product IDs
- userPreferredCategories: Top 5 viewed categories
- userPriceRange: { min, max, count }
```

**Filter Layer**:
- Category filter (existing categories from search page)
- Condition filter: "New", "Used", "Vintage"
- Sale Type filter: "Auction", "Fixed Price" (Buy Now)

**Algorithm Priority**:
1. Apply user-selected filters first (mandatory)
2. Within filtered results, prioritize:
   - Items in user's preferred categories (40% weight)
   - Items in user's typical price range (30% weight)
   - New/trending items user hasn't seen (30% weight)

---

### 2. UI Components Structure

#### A. Main Swipe Container Component: `SwipeReels.tsx`
```typescript
// Location: client/src/pages/swipe.tsx (replace existing placeholder)

interface SwipeReelsProps {
  // Component will manage its own state
}

Key Features:
- Vertical snap-scroll container
- Renders 3-5 items at once (virtual scrolling)
- Preloads next/previous items for smooth experience
- Tracks current item index
- Handles touch/mouse gestures
```

#### B. Individual Item Card Component: `SwipeReelItem.tsx`
```typescript
// Location: client/src/components/swipe-reel-item.tsx

interface SwipeReelItemProps {
  listing: Listing;
  isActive: boolean; // True when this item is in viewport
  onFavoriteToggle: (listingId: string) => void;
  onDetailsOpen: (listing: Listing) => void;
  onBidOpen: (listing: Listing) => void;
}

Layout (full viewport height):
┌─────────────────────────────┐
│                             │
│    Image Carousel (70%)     │
│    - Swipe left/right       │
│    - Dots indicator         │
│                             │
├─────────────────────────────┤
│  Product Info Overlay (30%) │
│  - Title                    │
│  - Price/Current Bid        │
│  - Quick Actions            │
│  - Seller Info              │
└─────────────────────────────┘
```

#### C. Filter Bar Component: `SwipeReelFilters.tsx`
```typescript
// Location: client/src/components/swipe-reel-filters.tsx

Sticky filter bar at the top with:
- Category pills (horizontal scroll)
- Sale type toggle: [All | Auctions | Buy Now]
- Condition toggle: [All | New | Used | Vintage]
- Active filter count badge
- Clear filters button

Use existing Slider component for price range if needed later
```

#### D. Details Sheet Component: `SwipeReelDetails.tsx`
```typescript
// Location: client/src/components/swipe-reel-details.tsx

Bottom sheet (Radix Dialog/Sheet) containing:
- Full product description
- ProductComments component (already exists)
- Specifications
- Shipping details
- Seller profile link
- Share buttons
- Report button
```

#### E. Auction Bidding Sheet: Reuse existing `BiddingWindow`
```typescript
// Open existing BiddingWindow component in a sheet/modal
// Location: client/src/components/bidding-window.tsx (already exists)
```

---

### 3. Gesture Interactions

#### A. Vertical Swipe (Primary Navigation)
```typescript
- Swipe Up: Next item
- Swipe Down: Previous item
- Velocity-based: Fast swipe = skip to next item
- Snap behavior: Always snap to full item view
- Resistance at boundaries (first/last item)
```

#### B. Horizontal Swipe (Image Navigation)
```typescript
- Swipe Left/Right: Navigate between item images
- Only active on the image area
- Show dots indicator for multiple images
- Snap to each image
- Prevent vertical scroll while swiping images
```

#### C. Tap Interactions
```typescript
- Single Tap on Image: Pause/Resume (no-op if no video)
- Double Tap Anywhere: Toggle favorite (heart animation)
- Tap Details Button: Open details sheet
- Tap Price/Bid: Open bidding sheet (auctions) or buy now
- Tap Seller: Navigate to seller profile
```

---

### 4. UI Layout Specifications

#### A. Item Card Overlay (Bottom 30%)
```css
Position: Absolute bottom overlay with gradient background

Components (from top to bottom):
1. Title (2 lines max, ellipsis)
2. Price/Bid display
   - Fixed price: "50,000 د.ع"
   - Auction: "Current Bid: 50,000 د.ع • 12 bids"
3. Auction countdown (if applicable)
4. Seller mini-card (avatar + name + rating)
5. Action buttons row

Gradient: linear-gradient(transparent, rgba(0,0,0,0.8))
```

#### B. Action Buttons (Right Side Overlay)
```typescript
Vertical stack on right side:
1. FavoriteButton (reuse existing component)
   - Position: Absolute right-4 top-1/3
   - Double-tap anywhere also triggers this
   
2. Details Button (MessageSquare icon)
   - Opens details sheet with comments
   
3. Share Button
   - Native share or copy link
   
4. For Auctions: Gavel icon
   - Opens bidding sheet
   
5. For Fixed Price: ShoppingBag icon
   - Quick add to cart or buy now

Style: Floating circular buttons with backdrop blur
```

#### C. Image Counter & Dots
```typescript
If multiple images:
- Position: Bottom of image area (above overlay)
- Dots indicator: Active dot highlighted
- Counter: "2/5" text overlay (top-right of image)
```

---

### 5. Data Fetching & State Management

#### A. API Integration
```typescript
// Use existing useListings hook with modifications
// Location: client/src/hooks/use-listings.ts

interface SwipeReelsQueryParams {
  limit: 20; // Fetch 20 at a time
  page: number;
  category?: string;
  saleType?: 'auction' | 'fixed' | undefined;
  condition?: string[];
  // Personalization handled client-side for now
}

// Infinite scroll: Load next page when reaching last 3 items
```

#### B. State Management
```typescript
const [items, setItems] = useState<Listing[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);
const [filters, setFilters] = useState({
  category: null,
  saleTypes: [], // ['auction', 'fixed']
  conditions: [], // ['New', 'Used', 'Vintage']
});

// Track viewed items to avoid showing duplicates
const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

// Infinite scroll
const loadMoreItems = async () => {
  // Fetch next page when currentIndex > items.length - 3
};
```

#### C. Item View Tracking
```typescript
// Track view when item becomes active (existing endpoint)
useEffect(() => {
  if (isActive && listing?.id) {
    // POST /api/listings/${listing.id}/view
    // Already implemented in product.tsx
  }
}, [isActive, listing?.id]);
```

---

### 6. Filter Implementation

#### A. Filter Bar Component
```typescript
// Sticky top bar with horizontal scroll

Categories:
- Use existing CATEGORIES array from search.tsx
- Display as pills with icons
- Multi-select (OR logic within categories)
- Active state styling

Sale Type Filter:
<ToggleGroup type="single" value={saleType}>
  <ToggleGroupItem value="all">الكل</ToggleGroupItem>
  <ToggleGroupItem value="auction">مزادات</ToggleGroupItem>
  <ToggleGroupItem value="fixed">شراء</ToggleGroupItem>
</ToggleGroup>

Condition Filter:
<ToggleGroup type="multiple" value={conditions}>
  <ToggleGroupItem value="New">جديد</ToggleGroupItem>
  <ToggleGroupItem value="Used">مستعمل</ToggleGroupItem>
  <ToggleGroupItem value="Vintage">فينتاج</ToggleGroupItem>
</ToggleGroup>
```

#### B. Filter Application
```typescript
// Apply filters to query
const filteredQuery = {
  ...baseQuery,
  category: filters.category,
  saleType: filters.saleTypes,
  condition: filters.conditions,
};

// Refetch when filters change
useEffect(() => {
  setCurrentIndex(0);
  setItems([]);
  refetch();
}, [filters]);
```

---

### 7. Performance Optimizations

#### A. Virtual Scrolling
```typescript
// Only render 3-5 items at once
const visibleItems = items.slice(
  Math.max(0, currentIndex - 2),
  Math.min(items.length, currentIndex + 3)
);

// Preload images for next items
useEffect(() => {
  const preloadNext = items[currentIndex + 1];
  if (preloadNext?.images?.[0]) {
    const img = new Image();
    img.src = preloadNext.images[0];
  }
}, [currentIndex, items]);
```

#### B. Image Optimization
```typescript
// Use existing OptimizedImage component
// Location: client/src/components/optimized-image.tsx

<OptimizedImage 
  src={image}
  alt={title}
  className="w-full h-full object-contain"
  priority={isActive} // Prioritize loading for active item
/>
```

#### C. Gesture Library
```typescript
// Install framer-motion (already in dependencies)
import { motion, PanInfo, useMotionValue, animate } from "framer-motion";

// Or use native touch events for better performance
const handleTouchStart = (e: TouchEvent) => {
  touchStartY = e.touches[0].clientY;
};

const handleTouchMove = (e: TouchEvent) => {
  const deltaY = e.touches[0].clientY - touchStartY;
  // Apply transform for smooth drag
};

const handleTouchEnd = (e: TouchEvent) => {
  const deltaY = e.changedTouches[0].clientY - touchStartY;
  const velocity = deltaY / (Date.now() - touchStartTime);
  
  if (Math.abs(velocity) > 0.5 || Math.abs(deltaY) > 100) {
    // Navigate to next/previous
    if (deltaY > 0) previousItem();
    else nextItem();
  } else {
    // Snap back
    snapToCurrent();
  }
};
```

---

### 8. Animations & Transitions

#### A. Item Transition
```typescript
// Smooth snap animation between items
<motion.div
  key={listing.id}
  initial={{ opacity: 0, y: 50 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -50 }}
  transition={{ duration: 0.3, ease: "easeInOut" }}
>
  {/* Item content */}
</motion.div>
```

#### B. Double-Tap Favorite Animation
```typescript
// Heart burst animation on double-tap
const [showHeartBurst, setShowHeartBurst] = useState(false);

const handleDoubleTap = () => {
  setShowHeartBurst(true);
  toggleFavorite(listing.id);
  setTimeout(() => setShowHeartBurst(false), 1000);
};

{showHeartBurst && (
  <motion.div
    className="absolute inset-0 flex items-center justify-center pointer-events-none"
    initial={{ scale: 0, opacity: 1 }}
    animate={{ scale: 2, opacity: 0 }}
    transition={{ duration: 0.8 }}
  >
    <Heart className="w-24 h-24 fill-red-500 text-red-500" />
  </motion.div>
)}
```

#### C. Image Carousel Animation
```typescript
// Use existing Carousel component from product.tsx
// Already has smooth swipe transitions
<Carousel
  opts={{
    align: "start",
    loop: images.length > 1,
    direction: "rtl",
  }}
>
  {/* Images */}
</Carousel>
```

---

### 9. Bilingual Support

#### A. Use Existing i18n System
```typescript
// Location: client/src/lib/i18n.tsx
const { language, t } = useLanguage();

// All text uses t() function or language checks
{language === "ar" ? "مزادات" : "مزایدە"}
```

#### B. Key Translations Needed
```typescript
// Add to i18n.tsx
"swipeUp": { ar: "اسحب للأعلى", ku: "بۆ سەرەوە بیخلیسکێنە" },
"swipeForMore": { ar: "اسحب لمزيد من الصور", ku: "بۆ وێنەی زیاتر بیخلیسکێنە" },
"doubleTapToLike": { ar: "انقر مرتين للإعجاب", ku: "دووجار بکلیک بکە بۆ حەزکردن" },
"viewDetails": { ar: "عرض التفاصيل", ku: "وردەکاری ببینە" },
"placeBid": { ar: "تقديم مزايدة", ku: "مزایدە بکە" },
"buyNow": { ar: "اشتر الآن", ku: "ئێستا بیکڕە" },
"filters": { ar: "فلاتر", ku: "فلتەر" },
"allCategories": { ar: "كل الفئات", ku: "هەموو جۆرەکان" },
"auctions": { ar: "مزادات", ku: "مزایدەکان" },
"buyNowItems": { ar: "شراء فوري", ku: "کڕینی خێرا" },
```

---

### 10. Integration with Existing Features

#### A. Favorite Button
```typescript
// Reuse existing component
import { FavoriteButton } from "@/components/favorite-button";

<FavoriteButton 
  listingId={listing.id}
  size="lg"
  className="absolute right-4 top-1/3"
/>
```

#### B. Comments
```typescript
// Show in details sheet
import { ProductComments } from "@/components/product-comments";

<Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
  <SheetContent side="bottom" className="h-[80vh]">
    <ProductComments listingId={listing.id} />
  </SheetContent>
</Sheet>
```

#### C. Bidding
```typescript
// Show in modal/sheet for auctions
import { BiddingWindow } from "@/components/bidding-window";

<Sheet open={biddingOpen} onOpenChange={setBiddingOpen}>
  <SheetContent side="bottom" className="h-auto">
    <BiddingWindow
      listingId={listing.id}
      currentBid={listing.currentBid}
      // ... other props
    />
  </SheetContent>
</Sheet>
```

#### D. Navigation
```typescript
// Use existing wouter routing
import { useLocation } from "wouter";
const [, navigate] = useLocation();

// Navigate to product page for full details
navigate(`/product/${listing.id}`);

// Navigate to seller profile
navigate(`/search?sellerId=${listing.sellerId}`);
```

---

### 11. Mobile Responsiveness

#### A. Touch Gestures
```typescript
// Prevent page scroll when swiping
useEffect(() => {
  const preventDefault = (e: TouchEvent) => {
    if (isSwipeReelsPage) {
      e.preventDefault();
    }
  };
  
  document.addEventListener('touchmove', preventDefault, { passive: false });
  return () => document.removeEventListener('touchmove', preventDefault);
}, []);
```

#### B. Safe Areas
```typescript
// Account for notch/safe areas
<div className="pb-safe pt-safe">
  {/* Content */}
</div>

// In global CSS:
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
.pt-safe {
  padding-top: env(safe-area-inset-top);
}
```

#### C. Performance on Mobile
```typescript
// Use CSS transforms for better performance
.swipe-item {
  transform: translateZ(0); /* Force GPU acceleration */
  will-change: transform;
}

// Debounce scroll events
const debouncedScroll = useMemo(
  () => debounce(handleScroll, 16), // ~60fps
  []
);
```

---

### 12. Accessibility

#### A. Keyboard Navigation
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') previousItem();
    if (e.key === 'ArrowDown') nextItem();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Navigate images
    }
    if (e.key === 'Enter') openDetails();
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentIndex]);
```

#### B. Screen Reader Support
```typescript
<div 
  role="feed"
  aria-label={t("productFeed")}
  aria-live="polite"
>
  <article 
    aria-label={`${listing.title}, ${listing.price} د.ع`}
    tabIndex={0}
  >
    {/* Content */}
  </article>
</div>
```

---

### 13. Error Handling & Edge Cases

#### A. No Items Found
```typescript
{items.length === 0 && !isLoading && (
  <EmptyState
    type="search"
    title={t("noItemsFound")}
    description={t("tryDifferentFilters")}
    actionLabel={t("clearFilters")}
    actionHref="#"
    onAction={() => setFilters(defaultFilters)}
  />
)}
```

#### B. Network Errors
```typescript
{error && (
  <div className="flex flex-col items-center justify-center h-screen">
    <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
    <p className="text-lg">{t("errorLoadingItems")}</p>
    <Button onClick={() => refetch()}>{t("retry")}</Button>
  </div>
)}
```

#### C. End of Feed
```typescript
{currentIndex >= items.length - 1 && !hasMore && (
  <div className="text-center py-8">
    <p className="text-muted-foreground">{t("youveSeenItAll")}</p>
    <Button onClick={() => setCurrentIndex(0)}>
      {t("backToStart")}
    </Button>
  </div>
)}
```

---

### 14. Testing Considerations

#### A. Component Tests
```typescript
// Test gesture recognition
describe('SwipeReels', () => {
  it('navigates to next item on swipe up', () => {
    // Test vertical swipe
  });
  
  it('navigates between images on horizontal swipe', () => {
    // Test horizontal swipe on image area
  });
  
  it('toggles favorite on double tap', () => {
    // Test double tap anywhere
  });
  
  it('applies filters correctly', () => {
    // Test filter combinations
  });
});
```

#### B. E2E Tests
```typescript
// Test full user journey
- Open swipe page
- Apply category filter
- Swipe through 5 items
- Double-tap to favorite
- Open details sheet
- View comments
- Place bid on auction item
- Navigate to product page
```

---

### 15. Future Enhancements (Post-MVP)

#### A. Video Support (When Available)
```typescript
// Auto-play videos when active
<video 
  ref={videoRef}
  autoPlay={isActive}
  muted
  loop
  playsInline
  className="w-full h-full object-cover"
  src={listing.videoUrl}
/>
```

#### B. Advanced Personalization
```typescript
// ML-based recommendations
- Track interaction time per item
- Track completion rate of swipes
- A/B test different sorting algorithms
- Collaborative filtering based on similar users
```

#### C. Social Features
```typescript
// Share directly to social media
- Generate story-format images
- Deep linking back to app
- Referral tracking
```

---

## Implementation Checklist

### Phase 1: Core Structure (Week 1)
- [ ] Create SwipeReels.tsx main page
- [ ] Create SwipeReelItem.tsx component
- [ ] Implement vertical snap-scroll
- [ ] Add basic gesture detection (swipe up/down)
- [ ] Connect to existing useListings hook

### Phase 2: Interactions (Week 1)
- [ ] Implement horizontal image swipe
- [ ] Add double-tap favorite with animation
- [ ] Add single-tap interactions
- [ ] Create action buttons overlay
- [ ] Integrate FavoriteButton component

### Phase 3: Filters (Week 2)
- [ ] Create SwipeReelFilters component
- [ ] Implement category filter
- [ ] Implement sale type filter (auction/buy now)
- [ ] Implement condition filter
- [ ] Add filter persistence
- [ ] Implement personalization algorithm

### Phase 4: Details & Actions (Week 2)
- [ ] Create SwipeReelDetails sheet
- [ ] Integrate ProductComments
- [ ] Create auction bidding sheet
- [ ] Add buy now functionality
- [ ] Add share functionality

### Phase 5: Polish (Week 3)
- [ ] Add animations and transitions
- [ ] Optimize performance (virtual scrolling)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Implement infinite scroll
- [ ] Add keyboard navigation
- [ ] Mobile testing and optimization

### Phase 6: Testing & Launch (Week 3)
- [ ] Component testing
- [ ] E2E testing
- [ ] Performance testing
- [ ] Accessibility audit
- [ ] Cross-browser testing
- [ ] Bilingual testing (Arabic/Kurdish)
- [ ] Analytics integration
- [ ] Soft launch to beta users

---

## File Structure

```
client/src/
├── pages/
│   └── swipe.tsx                    # Main swipe reels page (replace existing)
├── components/
│   ├── swipe-reel-item.tsx         # Individual item card
│   ├── swipe-reel-filters.tsx      # Filter bar component
│   ├── swipe-reel-details.tsx      # Details sheet component
│   └── swipe-reel-action-buttons.tsx # Action buttons overlay
├── hooks/
│   └── use-swipe-gesture.ts        # Custom hook for gesture detection
└── lib/
    └── swipe-algorithm.ts          # Personalization algorithm
```

---

## Key Technical Decisions

### 1. Virtual Scrolling vs. Full List
**Decision**: Virtual scrolling (render 3-5 items at once)
**Reason**: Performance on mobile devices, especially with images

### 2. Gesture Library
**Decision**: Native touch events with framer-motion for animations
**Reason**: Better performance than heavy gesture libraries

### 3. State Management
**Decision**: React Query for server state, useState for UI state
**Reason**: Already using React Query throughout the app

### 4. Image Optimization
**Decision**: Reuse existing OptimizedImage component
**Reason**: Already optimized for your infrastructure

### 5. Filtering Strategy
**Decision**: Client-side personalization, server-side filtering
**Reason**: Balance between performance and flexibility

---

## Analytics to Track

```typescript
// Track these events for optimization
- swipe_item_viewed (listingId, duration)
- swipe_filter_applied (filterType, filterValue)
- swipe_favorite_added (listingId, method: 'button' | 'double-tap')
- swipe_details_opened (listingId)
- swipe_bid_placed (listingId, bidAmount)
- swipe_purchase_initiated (listingId)
- swipe_session_duration
- swipe_items_per_session
- swipe_filter_combination (most used filters)
```

---

## Success Metrics

### User Engagement
- Average time spent in swipe mode
- Items viewed per session
- Swipe-to-favorite conversion rate
- Swipe-to-purchase conversion rate

### Technical Performance
- Time to first meaningful paint
- Average frame rate (target: 60fps)
- Memory usage
- API response times

### Business Metrics
- Increased product discovery
- Higher engagement vs. traditional search
- Improved conversion rates
- User retention

---

## Additional Resources

### Existing Components to Leverage
1. `FavoriteButton` - client/src/components/favorite-button.tsx
2. `ProductComments` - client/src/components/product-comments.tsx
3. `BiddingWindow` - client/src/components/bidding-window.tsx
4. `OptimizedImage` - client/src/components/optimized-image.tsx
5. `Carousel` - client/src/components/ui/carousel.tsx
6. `Layout` - client/src/components/layout.tsx
7. `useAuth` - client/src/hooks/use-auth.ts
8. `useListings` - client/src/hooks/use-listings.ts

### External Libraries Already Available
- framer-motion (animations)
- @radix-ui/react-* (UI components)
- @tanstack/react-query (data fetching)
- lucide-react (icons)

---

## Notes for AI Agent Implementation

1. **Start with the basic structure**: Build the container and basic swipe before adding complexity
2. **Reuse existing components**: Your codebase already has excellent components - integrate them
3. **Follow existing patterns**: Use wouter for routing, React Query for data, existing styling patterns
4. **Maintain bilingual support**: Every text string needs Arabic and Kurdish translations
5. **Test on mobile first**: This is primarily a mobile feature
6. **Performance is critical**: Users expect 60fps smooth scrolling
7. **Respect existing auth flows**: Use existing useAuth hook and authentication patterns
8. **Keep nav bars visible**: Not full-screen immersive mode
9. **Filter integration**: Use the existing categories and filter structure from search.tsx

---

## End of Implementation Guide

This comprehensive guide provides everything needed to implement a TikTok-style swipe reels feature that fits seamlessly with your existing marketplace platform. The feature will enhance product discovery while maintaining your app's professional quality and bilingual support.
