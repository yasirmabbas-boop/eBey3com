import type { Express } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";

const router = Router();

router.get("/listings", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;
    
    const { listings: paginatedListings, total } = await storage.getListingsPaginated({
      limit,
      offset,
      includeSold: true, // Include all listings for admin
    });
    
    const activeListings = paginatedListings
      .filter((l: any) => !l.isDeleted)
      .map((listing: any) => ({
        id: listing.id,
        productCode: listing.productCode,
        title: listing.title,
        price: listing.price,
        category: listing.category,
        saleType: listing.saleType,
        sellerName: listing.sellerName || "بائع غير معروف",
        sellerId: listing.sellerId,
        city: listing.city,
        isActive: listing.isActive,
        isPaused: listing.isPaused,
        isFeatured: listing.isFeatured,
        createdAt: listing.createdAt,
        currentBid: listing.currentBid,
        totalBids: listing.totalBids,
        image: listing.images?.[0] || null,
        views: listing.views || 0,
      }));
    
    res.json({ 
      listings: activeListings, 
      pagination: { 
        page, 
        limit, 
        total, 
        hasMore: offset + limit < total,
        totalPages: Math.ceil(total / limit)
      } 
    });
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

router.get("/listings/deleted", requireAdmin, async (req, res) => {
  try {
    const deletedListings = await storage.getDeletedListings();
    const formattedListings = deletedListings.map((listing: any) => ({
      id: listing.id,
      productCode: listing.productCode,
      title: listing.title,
      price: listing.price,
      category: listing.category,
      saleType: listing.saleType,
      sellerName: listing.sellerName || "بائع غير معروف",
      sellerId: listing.sellerId,
      city: listing.city,
      deletedAt: listing.deletedAt,
      createdAt: listing.createdAt,
      image: listing.images?.[0] || null,
    }));
    res.json(formattedListings);
  } catch (error) {
    console.error("Error fetching deleted listings:", error);
    res.status(500).json({ error: "Failed to fetch deleted listings" });
  }
});

router.post("/listings/:id/feature", requireAdmin, async (req, res) => {
  try {
    await storage.setListingFeatured(req.params.id, true);
    res.json({ success: true });
  } catch (error) {
    console.error("Error featuring listing:", error);
    res.status(500).json({ error: "Failed to feature listing" });
  }
});

router.post("/listings/:id/unfeature", requireAdmin, async (req, res) => {
  try {
    await storage.setListingFeatured(req.params.id, false);
    res.json({ success: true });
  } catch (error) {
    console.error("Error unfeaturing listing:", error);
    res.status(500).json({ error: "Failed to unfeature listing" });
  }
});

router.post("/listings/:id/pause", requireAdmin, async (req, res) => {
  try {
    await storage.updateListing(req.params.id, { isPaused: true });
    res.json({ success: true });
  } catch (error) {
    console.error("Error pausing listing:", error);
    res.status(500).json({ error: "Failed to pause listing" });
  }
});

router.post("/listings/:id/unpause", requireAdmin, async (req, res) => {
  try {
    await storage.updateListing(req.params.id, { isPaused: false });
    res.json({ success: true });
  } catch (error) {
    console.error("Error unpausing listing:", error);
    res.status(500).json({ error: "Failed to unpause listing" });
  }
});

router.delete("/listings/:id", requireAdmin, async (req, res) => {
  try {
    await storage.deleteListing(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

export { router as listingsRouter };
