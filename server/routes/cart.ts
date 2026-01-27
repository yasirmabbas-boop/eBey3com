import type { Express } from "express";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";

export function registerCartRoutes(app: Express): void {
  // Get cart items for current user
  app.get("/api/cart", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const cartItems = await storage.getCartItems(userId);
      
      // Enrich cart items with listing details
      const enrichedItems = await Promise.all(
        cartItems.map(async (item) => {
          const listing = await storage.getListing(item.listingId);
          if (!listing) {
            return {
              ...item,
              listing: null,
            };
          }
          
          const seller = listing.sellerId ? await storage.getUser(listing.sellerId) : null;
          
          return {
            ...item,
            listing: {
              id: listing.id,
              title: listing.title,
              price: listing.price,
              images: listing.images,
              saleType: listing.saleType,
              quantityAvailable: listing.quantityAvailable,
              isActive: listing.isActive,
              sellerId: listing.sellerId,
              sellerName: seller?.displayName || "بائع مجهول",
            },
          };
        })
      );

      res.json(enrichedItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  // Add item to cart
  app.post("/api/cart", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { listingId, quantity = 1 } = req.body;

      if (!listingId) {
        return res.status(400).json({ error: "Listing ID is required" });
      }

      // Verify listing exists and is available
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      if (!listing.isActive) {
        return res.status(400).json({ error: "هذا المنتج غير متاح حالياً" });
      }

      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك إضافة منتجك الخاص للسلة" });
      }

      if (listing.quantityAvailable < quantity) {
        return res.status(400).json({ error: "الكمية المطلوبة غير متوفرة" });
      }

      const cartItem = await storage.addToCart({
        userId,
        listingId,
        quantity,
        priceSnapshot: listing.price,
      });

      res.status(201).json(cartItem);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ error: "Failed to add to cart" });
    }
  });

  // Update cart item quantity
  app.patch("/api/cart/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      const { quantity } = req.body;

      if (typeof quantity !== "number" || quantity < 0) {
        return res.status(400).json({ error: "Invalid quantity" });
      }

      const updated = await storage.updateCartItemQuantity(id, quantity);
      
      if (!updated && quantity > 0) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      res.json(updated || { deleted: true });
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ error: "Failed to update cart item" });
    }
  });

  // Remove item from cart
  app.delete("/api/cart/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      const deleted = await storage.removeFromCart(id);

      if (!deleted) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ error: "Failed to remove from cart" });
    }
  });

  // Clear entire cart
  app.delete("/api/cart", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await storage.clearCart(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });
}
