/**
 * Meilisearch service for listings search.
 * Replaces PostgreSQL hybrid search with Meilisearch for full-text and faceted search.
 */

import { Meilisearch } from "meilisearch";
import { eq } from "drizzle-orm";
import { listings } from "@shared/schema";
import type { Listing } from "@shared/schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@shared/schema";

const INDEX_NAME = "listings";

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || "http://localhost:7700";
const MEILISEARCH_MASTER_KEY = process.env.MEILISEARCH_MASTER_KEY || "";

let client: Meilisearch | null = null;

function getClient(): Meilisearch | null {
  if (!MEILISEARCH_MASTER_KEY) {
    return null;
  }
  if (!client) {
    client = new Meilisearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_MASTER_KEY,
    });
  }
  return client;
}

const SEARCHABLE_ATTRIBUTES = ["title", "description", "brand", "category"];

const FILTERABLE_ATTRIBUTES = [
  "category",
  "condition",
  "price",
  "isDeleted",
  "isActive",
  "sellerId",
  "saleType",
  "specifications.size",
  "specifications.color",
  "specifications.gender",
  "specifications.shoeSize",
  "specifications.clothingType",
  "specifications.clothingBrand",
  "specifications.material",
  "specifications.shoeBrand",
  "specifications.shoeStyle",
  "specifications.storage",
  "specifications.ram",
  "specifications.movement",
  "specifications.caseSize",
  "specifications.fuelType",
  "specifications.transmission",
  "specifications.bodyType",
  "specifications.jewelryMaterial",
  "specifications.gemstone",
  "specifications.era",
];

/**
 * Initialize Meilisearch: ensure listings index exists and configure settings.
 * Fails gracefully if Meilisearch is unavailable.
 */
export async function initializeMeilisearch(): Promise<void> {
  const c = getClient();
  if (!c) {
    console.warn("[Meilisearch] MEILISEARCH_MASTER_KEY not set - search sync disabled");
    return;
  }

  try {
    const index = c.index(INDEX_NAME);

    await index.updateSearchableAttributes(SEARCHABLE_ATTRIBUTES);
    await index.updateFilterableAttributes(FILTERABLE_ATTRIBUTES);
    await index.updateSortableAttributes([
      "price",
      "createdAt",
      "views",
      "totalBids",
      "auctionEndTime",
    ]);

    // Reset ranking rules to Meilisearch defaults (undo any custom ranking from previous deploys)
    await index.updateRankingRules([
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ]);

    // Reset stop words and typo tolerance to defaults
    await index.updateStopWords([]);
    await index.updateTypoTolerance({ enabled: true, minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 } });

    console.log("[Meilisearch] Index 'listings' configured (settings reset to defaults)");
  } catch (err) {
    console.error("[Meilisearch] Failed to initialize:", (err as Error).message);
  }
}

/**
 * Map a Listing DB row to Meilisearch document format.
 * Excludes internal fields and ensures specifications are nested for filtering.
 */
function listingToDocument(listing: Listing): Record<string, unknown> {
  const {
    id,
    title,
    description,
    price,
    category,
    condition,
    brand,
    saleType,
    isDeleted,
    specifications,
    images,
    currentBid,
    sellerId,
    sellerName,
    city,
    isActive,
    isPaused,
    quantityAvailable,
    quantitySold,
    createdAt,
    views,
    totalBids,
    auctionEndTime,
    ...rest
  } = listing as Listing & Record<string, unknown>;

  return {
    id,
    title: title ?? "",
    description: description ?? "",
    price: price ?? 0,
    category: category ?? "",
    condition: condition ?? "",
    brand: brand ?? "",
    saleType: saleType ?? "fixed",
    isDeleted: !!isDeleted,
    specifications: specifications ?? {},
    images: images ?? [],
    currentBid: currentBid ?? null,
    sellerId: sellerId ?? null,
    sellerName: sellerName ?? "",
    city: city ?? "",
    isActive: !!isActive,
    isPaused: !!isPaused,
    quantityAvailable: quantityAvailable ?? 1,
    quantitySold: quantitySold ?? 0,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
    views: views ?? 0,
    totalBids: totalBids ?? 0,
    auctionEndTime:
      auctionEndTime instanceof Date ? auctionEndTime.toISOString() : auctionEndTime,
    ...rest,
  };
}

/**
 * Sync a single listing to Meilisearch.
 * - isDeleted === false: upsert document
 * - isDeleted === true: delete document from index
 * Fire-and-forget; errors are logged but do not throw.
 */
export async function syncListingToMeilisearch(listing: Listing): Promise<void> {
  const c = getClient();
  if (!c) return;

  try {
    const index = c.index(INDEX_NAME);

    if (listing.isDeleted) {
      await index.deleteDocument(listing.id);
    } else {
      const doc = listingToDocument(listing);
      await index.addDocuments([doc], { primaryKey: "id" });
    }
  } catch (err) {
    console.error("[Meilisearch] sync failed for listing", listing.id, (err as Error).message);
  }
}

const BULK_BATCH_SIZE = 500;

/**
 * Bulk sync all non-deleted listings from PostgreSQL to Meilisearch.
 * Uses pagination to avoid loading the entire table into memory.
 */
export async function bulkSyncListingsToMeilisearch(
  db: NodePgDatabase<typeof schema>
): Promise<{ totalProcessed: number; totalBatches: number }> {
  const c = getClient();
  if (!c) {
    throw new Error("[Meilisearch] MEILISEARCH_MASTER_KEY not set - bulk sync disabled");
  }

  const index = c.index(INDEX_NAME);
  let totalProcessed = 0;
  let totalBatches = 0;
  let offset = 0;
  let batch: Listing[];

  do {
    batch = await db
      .select()
      .from(listings)
      .where(eq(listings.isDeleted, false))
      .limit(BULK_BATCH_SIZE)
      .offset(offset);

    if (batch.length > 0) {
      const docs = batch.map(listingToDocument);
      await index.addDocuments(docs, { primaryKey: "id" });
      totalProcessed += batch.length;
      totalBatches += 1;
    }

    offset += BULK_BATCH_SIZE;
  } while (batch.length === BULK_BATCH_SIZE);

  return { totalProcessed, totalBatches };
}
