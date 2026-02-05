import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";
import { sendPushNotification } from "../push-notifications";
import { sendToUser } from "../websocket";
import { validateCsrfToken } from "../middleware/csrf";

// Convert Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) numerals to Western numerals (0-9)
function normalizePhone(phone: string): string {
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabic = '۰۱۲۳۴۵۶۷۸۹';
  return phone
    .replace(/[٠-٩]/g, d => String(arabicIndic.indexOf(d)))
    .replace(/[۰-۹]/g, d => String(easternArabic.indexOf(d)))
    .replace(/\s/g, '');
}

const checkoutSchema = z.object({
  fullName: z.string().trim().min(3).max(100),
  phone: z.string().transform(normalizePhone).pipe(z.string().regex(/^07[3-9][0-9]{8}$/)),
  city: z.string().trim().min(3).max(50),
  addressLine1: z.string().trim().min(5).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  shippingCost: z.number().int().min(0),
  saveAddress: z.boolean().optional(),
});

export function registerCartRoutes(app: Express): void {
  // Apply CSRF validation to all cart routes except GET requests
  app.use("/api/cart", validateCsrfToken);
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
          
          // Use listing.sellerName as fallback if seller doesn't exist or has no displayName
          const sellerName = seller?.displayName || 
                            (listing as any).sellerName || 
                            seller?.username || 
                            (seller?.phone ? `مستخدم ${seller.phone.slice(-4)}` : null) ||
                            "بائع مجهول";
          
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
              sellerName,
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

      // Check if user has verified their phone
      const user = await storage.getUser(userId);
      if (!user?.phoneVerified) {
        return res.status(403).json({ 
          error: "يجب التحقق من رقم هاتفك قبل إضافة منتجات للسلة",
          requiresPhoneVerification: true
        });
      }

      const { listingId, quantity = 1, forceAdd = false } = req.body;

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

      // Check if item already exists in cart
      const existingCartItem = await storage.getCartItemWithListing(userId, listingId);
      
      if (existingCartItem) {
        const newTotalQuantity = existingCartItem.quantity + quantity;
        
        // Check if new total exceeds available quantity
        if (newTotalQuantity > listing.quantityAvailable) {
          // If only 1 available and already in cart
          if (listing.quantityAvailable === 1) {
            return res.status(400).json({ 
              error: "هذا المنتج موجود بالفعل في سلتك",
              code: "ALREADY_IN_CART",
              existingQuantity: existingCartItem.quantity
            });
          }
          // More than 1 available but would exceed limit
          return res.status(400).json({ 
            error: `لا يمكن إضافة أكثر من ${listing.quantityAvailable} قطعة. لديك ${existingCartItem.quantity} في السلة`,
            code: "QUANTITY_EXCEEDED",
            existingQuantity: existingCartItem.quantity,
            maxAvailable: listing.quantityAvailable
          });
        }
        
        // If not forcing add, ask user to confirm
        if (!forceAdd) {
          return res.status(200).json({ 
            confirmRequired: true,
            message: `لديك ${existingCartItem.quantity} قطعة من هذا المنتج في سلتك. هل تريد إضافة ${quantity} أخرى؟`,
            existingQuantity: existingCartItem.quantity,
            requestedQuantity: quantity,
            maxAvailable: listing.quantityAvailable
          });
        }
      } else {
        // New item - check quantity against available
        if (listing.quantityAvailable < quantity) {
          return res.status(400).json({ error: "الكمية المطلوبة غير متوفرة" });
        }
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

  // Checkout - complete purchase from cart items
  app.post("/api/checkout", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check if user has verified their phone (consistent with cart requirement)
      const user = await storage.getUser(userId);
      if (!user?.phoneVerified) {
        return res.status(403).json({ 
          error: "يجب التحقق من رقم هاتفك قبل إتمام الطلب",
          requiresPhoneVerification: true,
          phone: user?.phone, // Include phone for frontend
          message: `يرجى التحقق من رقم هاتفك ${user?.phone} عبر واتساب لإتمام الطلب`
        });
      }

      // Normalize Arabic digits to Western digits before validation
      if (req.body.phone) {
        req.body.phone = normalizePhone(req.body.phone);
      }

      const parsed = checkoutSchema.parse(req.body);

      // Get user's cart items
      const cartItems = await storage.getCartItems(userId);
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "السلة فارغة" });
      }

      const transactions = [];
      const errors = [];

      // Process each cart item
      for (const cartItem of cartItems) {
        const listing = await storage.getListing(cartItem.listingId);
        
        if (!listing) {
          errors.push(`المنتج غير موجود: ${cartItem.listingId}`);
          continue;
        }

        if (!listing.isActive) {
          errors.push(`المنتج غير متاح: ${listing.title}`);
          continue;
        }

        if (listing.quantityAvailable < cartItem.quantity) {
          errors.push(`الكمية غير متوفرة: ${listing.title}`);
          continue;
        }

        if (listing.sellerId === userId) {
          errors.push(`لا يمكنك شراء منتجك الخاص: ${listing.title}`);
          continue;
        }

        if (!listing.sellerId) {
          errors.push(`البائع غير معروف: ${listing.title}`);
          continue;
        }

        // Determine the purchase amount
        // For auctions with buyNowPrice, use the buyNowPrice
        const isAuctionBuyNow = listing.saleType === "auction" && (listing as any).buyNowPrice;
        const purchaseAmount = isAuctionBuyNow 
          ? (listing as any).buyNowPrice 
          : listing.price * cartItem.quantity;

        // Create transaction
        const transaction = await storage.createTransaction({
          listingId: cartItem.listingId,
          sellerId: listing.sellerId,
          buyerId: userId,
          amount: purchaseAmount,
          status: "pending",
          paymentMethod: "cash",
          deliveryAddress: `${parsed.addressLine1}${parsed.addressLine2 ? ', ' + parsed.addressLine2 : ''}`,
          deliveryPhone: parsed.phone,
          deliveryCity: parsed.city,
        });

        transactions.push(transaction);

        // Update listing quantity
        const newQuantity = listing.quantityAvailable - cartItem.quantity;
        if (newQuantity <= 0 || isAuctionBuyNow) {
          // For auctions, always mark as sold when Buy Now is used
          await storage.updateListing(cartItem.listingId, { 
            isActive: false,
            quantityAvailable: 0,
            quantitySold: (listing.quantitySold || 0) + cartItem.quantity,
            currentBid: isAuctionBuyNow ? (listing as any).buyNowPrice : listing.currentBid,
          } as any);
          
          // For auction Buy Now, notify all bidders that auction ended
          if (isAuctionBuyNow) {
            const allBids = await storage.getBidsForListing(cartItem.listingId);
            const uniqueBidderIds = Array.from(new Set(allBids.map(b => b.userId)));
            
            for (const bidderId of uniqueBidderIds) {
              if (bidderId !== userId) { // Don't notify the buyer themselves
                try {
                  await storage.createNotification({
                    userId: bidderId,
                    type: "auction_ended",
                    title: "انتهى المزاد",
                    message: `تم بيع "${listing.title}" عبر خيار الشراء الفوري`,
                    linkUrl: `/product/${cartItem.listingId}`,
                    relatedId: cartItem.listingId,
                  });

                  await sendPushNotification(bidderId, {
                    title: "انتهى المزاد",
                    body: `تم بيع "${listing.title}" عبر خيار الشراء الفوري`,
                    url: `/product/${cartItem.listingId}`,
                    tag: `auction-ended-${cartItem.listingId}`,
                  });
                } catch (notifError) {
                  console.error(`Failed to notify bidder ${bidderId}:`, notifError);
                }
              }
            }
          }
        } else {
          await storage.updateListing(cartItem.listingId, { 
            quantityAvailable: newQuantity,
            quantitySold: (listing.quantitySold || 0) + cartItem.quantity,
          } as any);
        }

        // Notify seller with deep link to sales tab
        if (listing.sellerId) {
          try {
            const notification = await storage.createNotification({
              userId: listing.sellerId,
              type: "new_order",
              title: "طلب جديد",
              message: `لديك طلب جديد على "${listing.title}"`,
              linkUrl: `/seller-dashboard?tab=sales&orderId=${transaction.id}`,
              relatedId: transaction.id,
            });

            sendToUser(listing.sellerId, "NOTIFICATION", {
              notification: {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                linkUrl: notification.linkUrl,
              },
            });

            await sendPushNotification(listing.sellerId, {
              title: "طلب جديد",
              body: `لديك طلب جديد على "${listing.title}"`,
              url: `/seller-dashboard?tab=sales&orderId=${transaction.id}`,
              tag: `new-order-${transaction.id}`,
            });
          } catch (notifError) {
            console.error(`Failed to notify seller ${listing.sellerId}:`, notifError);
          }
        }
      }

      // If all items failed, return error
      if (transactions.length === 0 && errors.length > 0) {
        return res.status(400).json({ 
          error: "فشل في إتمام الطلب", 
          details: errors 
        });
      }

      // Save address if requested
      if (parsed.saveAddress) {
        try {
          await storage.createBuyerAddress({
            userId,
            label: "عنوان التوصيل",
            recipientName: parsed.fullName,
            phone: parsed.phone,
            city: parsed.city,
            addressLine1: parsed.addressLine1,
            addressLine2: parsed.addressLine2 || "",
            isDefault: false,
          });
        } catch (e) {
          console.error("Error saving address:", e);
        }
      }

      // Clear the cart
      await storage.clearCart(userId);

      res.status(201).json({
        success: true,
        message: "تم إنشاء الطلب بنجاح",
        transactions,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format errors for better frontend consumption
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        return res.status(400).json({ 
          error: "بيانات غير صالحة",
          details: formattedErrors,
          // Also include a user-friendly summary
          summary: formattedErrors.map(e => `${e.field}: ${e.message}`).join(', ')
        });
      }
      console.error("Error in checkout:", error);
      res.status(500).json({ error: "فشل في إتمام الطلب" });
    }
  });
}
