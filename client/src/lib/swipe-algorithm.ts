import type { Listing } from "@shared/schema";

interface PersonalizationData {
  userPreferredCategories: string[];
  userPriceRange: { min: number; max: number; count: number };
  viewedIds: Set<string>;
}

interface WeightedListing extends Listing {
  _weight: number;
}

/**
 * Apply personalization weights to listings
 * Algorithm:
 * - Preferred categories: 35% weight
 * - Price range match: 25% weight
 * - New/trending: 25% weight
 * - Recency boost: +15% for items listed in last 24h
 */
export function applyPersonalizationWeights(
  listings: Listing[],
  personalizationData: PersonalizationData
): Listing[] {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const weightedListings: WeightedListing[] = listings.map((listing) => {
    let weight = 0;

    // Already viewed - reduce weight significantly
    if (personalizationData.viewedIds.has(listing.id)) {
      weight -= 1000;
    }

    // Preferred category weight (35%)
    if (
      listing.category &&
      personalizationData.userPreferredCategories.includes(listing.category)
    ) {
      const categoryRank = personalizationData.userPreferredCategories.indexOf(listing.category);
      weight += 350 / (categoryRank + 1); // Top category gets 350, second gets 175, etc.
    }

    // Price range match weight (25%)
    const listingPrice = listing.currentBid || listing.price;
    const { min, max } = personalizationData.userPriceRange;
    if (listingPrice >= min && listingPrice <= max) {
      weight += 250;
    } else {
      // Partial credit for being close
      const avgPrice = (min + max) / 2;
      const distance = Math.abs(listingPrice - avgPrice);
      const maxDistance = Math.max(avgPrice - min, max - avgPrice);
      if (maxDistance > 0) {
        weight += 125 * (1 - distance / maxDistance);
      }
    }

    // Trending weight (25%) - based on views and bids
    const views = (listing as any).views || 0;
    const totalBids = (listing as any).totalBids || 0;
    weight += Math.min(250, views * 0.5 + totalBids * 5);

    // Recency boost (+15% for last 24h)
    const createdAt = listing.createdAt ? new Date(listing.createdAt).getTime() : 0;
    if (createdAt > oneDayAgo) {
      weight += 150;
    }

    return {
      ...listing,
      _weight: weight,
    };
  });

  // Sort by weight (highest first)
  return weightedListings
    .sort((a, b) => b._weight - a._weight)
    .map(({ _weight, ...listing }) => listing);
}

/**
 * Get trending items for cold start (new users without preferences)
 */
export function getTrendingItems(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => {
    const aScore = ((a as any).views || 0) + ((a as any).totalBids || 0) * 5;
    const bScore = ((b as any).views || 0) + ((b as any).totalBids || 0) * 5;
    return bScore - aScore;
  });
}

/**
 * Load personalization data from localStorage
 */
export function loadPersonalizationData(): PersonalizationData {
  try {
    const categoriesStored = localStorage.getItem("userPreferredCategories");
    const priceRangeStored = localStorage.getItem("userPriceRange");
    const viewedStored = localStorage.getItem("recentlyViewed");

    return {
      userPreferredCategories: categoriesStored ? JSON.parse(categoriesStored) : [],
      userPriceRange: priceRangeStored
        ? JSON.parse(priceRangeStored)
        : { min: 0, max: Infinity, count: 0 },
      viewedIds: new Set(viewedStored ? JSON.parse(viewedStored) : []),
    };
  } catch (error) {
    console.error("Error loading personalization data:", error);
    return {
      userPreferredCategories: [],
      userPriceRange: { min: 0, max: Infinity, count: 0 },
      viewedIds: new Set(),
    };
  }
}

/**
 * Save viewed item to localStorage
 */
export function trackViewedItem(listingId: string) {
  try {
    const stored = localStorage.getItem("recentlyViewed");
    let recentIds: string[] = stored ? JSON.parse(stored) : [];
    
    // Remove if already exists and add to front
    recentIds = recentIds.filter((id) => id !== listingId);
    recentIds.unshift(listingId);
    
    // Keep only last 100 items
    recentIds = recentIds.slice(0, 100);
    
    localStorage.setItem("recentlyViewed", JSON.stringify(recentIds));
  } catch (error) {
    console.error("Error tracking viewed item:", error);
  }
}
