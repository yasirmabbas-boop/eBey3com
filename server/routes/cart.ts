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
  shippingCost: z.number().int().min(0).optional(), // Accepted but recalculated server-side
  saveAddress: z.boolean().optional(),
});

const INTER_CITY_SURCHARGE = 2000; // Flat surcharge for inter-city delivery

/** Server-side shipping calculation per item - mirrors client logic */
function calculateItemShipping(
  listing: { shippingType: string | null; shippingCost: number | null; city: string | null },
  quantity: number,
  buyerCity: string
): number {
  if (listing.shippingType === "seller_pays") return 0;
  const baseCost = (listing.shippingCost || 0) * quantity;
  const isSameCity = buyerCity && listing.city && buyerCity === listing.city;
  const surcharge = isSameCity ? 0 : INTER_CITY_SURCHARGE * quantity;
  return baseCost + surcharge;
}

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
              city: listing.city || "",
              shippingType: listing.shippingType || "seller_pays",
              shippingCost: listing.shippingCost || 0,
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

      // Check if buyer has a temporary order ban (no-answer penalty)
      if (user.orderBanUntil && new Date(user.orderBanUntil) > new Date()) {
        const banDate = new Intl.DateTimeFormat("ar-IQ", { year: "numeric", month: "long", day: "numeric" }).format(new Date(user.orderBanUntil));
        return res.status(403).json({
          error: "order_banned",
          message: `حسابك محظور من الطلب مؤقتاً بسبب عدم الرد على التوصيل. سيتم رفع الحظر في ${banDate}`,
          banUntil: user.orderBanUntil,
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

      const deliveryAddress = `${parsed.addressLine1}${parsed.addressLine2 ? ', ' + parsed.addressLine2 : ''}`;

      // Process checkout in transaction (prevents oversell via row-level locking)
      const { transactions, errors, processedItems } = await storage.processCheckout({
        userId,
        cartItems,
        deliveryAddress,
        deliveryPhone: parsed.phone,
        deliveryCity: parsed.city,
        calculateItemShipping,
      });

      // Notifications (after successful transaction commit)
      for (const { listing, transaction } of processedItems) {
        const isAuctionBuyNow = listing.saleType === "auction" && (listing as any).buyNowPrice;

        if (isAuctionBuyNow) {
          const allBids = await storage.getBidsForListing(listing.id);
          const uniqueBidderIds = Array.from(new Set(allBids.map(b => b.userId)));
          for (const bidderId of uniqueBidderIds) {
            if (bidderId !== userId) {
              try {
                await storage.createNotification({
                  userId: bidderId,
                  type: "auction_ended",
                  title: "انتهى المزاد",
                  message: `تم بيع "${listing.title}" عبر خيار الشراء الفوري`,
                  linkUrl: `/product/${listing.id}`,
                  relatedId: listing.id,
                });
                await sendPushNotification(bidderId, {
                  title: "انتهى المزاد",
                  body: `تم بيع "${listing.title}" عبر خيار الشراء الفوري`,
                  url: `/product/${listing.id}`,
                  tag: `auction-ended-${listing.id}`,
                });
              } catch (notifError) {
                console.error(`Failed to notify bidder ${bidderId}:`, notifError);
              }
            }
          }
        }

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

      // Notify the BUYER that their order was received
      if (transactions.length > 0) {
        try {
          const firstTitle = processedItems[0]?.listing?.title || "";
          const itemCount = transactions.length;
          const buyerMessage = itemCount > 1
            ? `تم استلام طلبك (${itemCount} منتجات). سنرسل لك تحديثات عند شحن مشترياتك.`
            : `تم استلام طلبك على "${firstTitle}". سنرسل لك تحديثات عند شحن مشترياتك.`;

          const buyerNotification = await storage.createNotification({
            userId,
            type: "order_received",
            title: "تم استلام طلبك! 🛒",
            message: buyerMessage,
            linkUrl: `/buyer-dashboard?tab=purchases`,
            relatedId: transactions[0].id,
          });
          sendToUser(userId, "NOTIFICATION", {
            notification: {
              id: buyerNotification.id,
              type: buyerNotification.type,
              title: buyerNotification.title,
              message: buyerNotification.message,
              linkUrl: buyerNotification.linkUrl,
            },
          });
          await sendPushNotification(userId, {
            title: "تم استلام طلبك! 🛒",
            body: buyerMessage,
            url: `/buyer-dashboard?tab=purchases`,
            tag: `order-received-${transactions[0].id}`,
          });
        } catch (notifError) {
          console.error(`Failed to notify buyer ${userId}:`, notifError);
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
