import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertListingSchema, insertBidSchema, insertAnalyticsSchema, insertWatchlistSchema, insertMessageSchema, insertReviewSchema, insertTransactionSchema, insertCategorySchema, insertBuyerAddressSchema, insertContactMessageSchema, insertProductCommentSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { broadcastBidUpdate } from "./websocket";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { analyzeImageForSearch } from "./replit_integrations/image";
import multer from "multer";
import sharp from "sharp";
import { financialService } from "./services/financial-service";
import { deliveryService } from "./services/delivery-service";
import { deliveryApi, DeliveryWebhookPayload } from "./services/delivery-api";
import { ObjectStorageService } from "./replit_integrations/object_storage/objectStorage";

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

// Helper to get user ID from session or auth token (Safari/ITP fallback)
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  // Try session first
  const sessionUserId = (req.session as any)?.userId;
  if (sessionUserId) {
    return sessionUserId;
  }
  
  // Fallback to Authorization header token for Safari
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = await storage.getUserByAuthToken(token);
    if (user) {
      return user.id;
    }
  }
  
  return null;
}

function formatPriceForOg(price: number): string {
  return new Intl.NumberFormat("ar-IQ").format(price) + " د.ع";
}

function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function buildBaseUrl(req: Request): string {
  const host = req.get("host");
  if (!host) {
    return "";
  }
  return `${req.protocol}://${host}`;
}

function resolveAbsoluteUrl(rawUrl: string, baseUrl: string): string {
  if (!rawUrl || !baseUrl) return rawUrl;
  try {
    return new URL(rawUrl, baseUrl).toString();
  } catch (error) {
    console.error("Failed to normalize OG image URL:", error);
    return rawUrl;
  }
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Failed to fetch OG image source:", error);
    return null;
  }
}

const updateListingSchema = insertListingSchema.extend({
  auctionEndTime: z.union([z.string(), z.date(), z.null()]).optional(),
  auctionStartTime: z.union([z.string(), z.date(), z.null()]).optional(),
  isActive: z.boolean().optional(),
}).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Register object storage routes for image uploads
  registerObjectStorageRoutes(app);

  // Caching middleware for public GET endpoints to reduce data transfer costs
  const setCacheHeaders = (seconds: number) => {
    return `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`;
  };

  app.get("/api/og/product/:id", async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing || listing.isDeleted) {
        return res.status(404).send("Listing not found");
      }

      const rawTitle = listing.title || "منتج";
      const title = escapeSvgText(truncateText(rawTitle, 70));
      const price = escapeSvgText(
        formatPriceForOg(listing.currentBid || listing.price)
      );
      const saleTypeText = escapeSvgText(
        listing.saleType === "auction" ? "مزاد" : "شراء الآن"
      );

      let imageBase64: string | null = null;
      const imageUrl = listing.images?.[0];
      if (imageUrl) {
        const baseUrl = buildBaseUrl(req);
        const normalizedImageUrl = resolveAbsoluteUrl(imageUrl, baseUrl);
        const imageBuffer = await fetchImageBuffer(normalizedImageUrl);
        if (imageBuffer) {
          const resized = await sharp(imageBuffer)
            .resize(1080, 360, { fit: "cover" })
            .jpeg({ quality: 85 })
            .toBuffer();
          imageBase64 = resized.toString("base64");
        }
      }

      const imageBlock = imageBase64
        ? `<image href="data:image/jpeg;base64,${imageBase64}" x="60" y="40" width="1080" height="360" preserveAspectRatio="xMidYMid slice" />`
        : `<rect x="60" y="40" width="1080" height="360" rx="24" fill="#e2e8f0" />
           <text x="600" y="230" text-anchor="middle" font-size="40" fill="#64748b" font-family="Arial, sans-serif">No image</text>`;

      const svg = `
<svg width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" />
  ${imageBlock}
  <rect x="60" y="430" width="1080" height="150" rx="24" fill="#ffffff" stroke="#e2e8f0" />
  <text x="600" y="485" text-anchor="middle" font-size="44" fill="#0f172a" font-family="Arial, sans-serif" direction="rtl">${title}</text>
  <text x="600" y="535" text-anchor="middle" font-size="32" fill="#2563eb" font-family="Arial, sans-serif">${price}</text>
  <text x="600" y="580" text-anchor="middle" font-size="28" fill="#16a34a" font-family="Arial, sans-serif">${saleTypeText}</text>
  <text x="1120" y="610" text-anchor="end" font-size="24" fill="#2563eb" font-family="Arial, sans-serif">E-بيع</text>
</svg>`;

      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", setCacheHeaders(3600));
      return res.send(png);
    } catch (error) {
      console.error("Error generating OG image:", error);
      return res.status(500).send("Failed to generate OG image");
    }
  });

  app.get("/api/listings", async (req, res) => {
    try {
      const { category, sellerId, page, limit: limitParam, saleType, includeSold, q, minPrice, maxPrice, condition, city } = req.query;
      const saleTypes = Array.isArray(saleType)
        ? saleType.map(s => String(s))
        : typeof saleType === "string"
          ? [saleType]
          : undefined;
      const conditions = Array.isArray(condition)
        ? condition.map(c => String(c))
        : typeof condition === "string"
          ? [condition]
          : undefined;
      const cities = Array.isArray(city)
        ? city.map(c => String(c))
        : typeof city === "string"
          ? [city]
          : undefined;
      const pageNum = parseInt(page as string) || 1;
      const limit = Math.min(parseInt(limitParam as string) || 20, 100);
      const offset = (pageNum - 1) * limit;
      
      // Check if user is viewing their own seller profile
      const viewerId = await getUserIdFromRequest(req);
      const sellerIdStr = typeof sellerId === "string" ? sellerId : undefined;
      const isOwnProfile = !!(viewerId && sellerIdStr && viewerId === sellerIdStr);
      
      // Use optimized paginated query with SQL-level filtering
      const searchQuery = typeof q === "string" ? q : undefined;
      const { listings: paginatedListings, total } = await storage.getListingsPaginated({
        limit,
        offset,
        category: typeof category === "string" ? category : undefined,
        saleTypes,
        sellerId: sellerIdStr,
        // Only include sold items if: explicitly requested via filter OR viewing own profile
        includeSold: includeSold === "true" || isOwnProfile,
        searchQuery,
        minPrice: typeof minPrice === "string" ? parseInt(minPrice) : undefined,
        maxPrice: typeof maxPrice === "string" ? parseInt(maxPrice) : undefined,
        conditions,
        cities,
      });
      
      // Track search analytics when there's a search query
      if (searchQuery && searchQuery.trim()) {
        try {
          const userId = await getUserIdFromRequest(req);
          const sessionId = (req.session as any)?.id || 'anonymous';
          await storage.trackAnalytics({
            sessionId,
            userId: userId || undefined,
            eventType: 'search',
            searchQuery,
            category: typeof category === "string" ? category : undefined,
            eventData: JSON.stringify({
              resultCount: total,
              hasResults: total > 0,
              page: pageNum,
              filters: {
                saleTypes,
                conditions,
                cities,
                priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : undefined
              }
            })
          });
        } catch (analyticsError) {
          // Don't fail the request if analytics fails
          console.error("Error tracking search analytics:", analyticsError);
        }
      }
      
      // Cache listing responses for 30 seconds to reduce repeat requests
      res.set("Cache-Control", setCacheHeaders(30));
      
      res.json({
        listings: paginatedListings,
        pagination: {
          page: pageNum,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  app.get("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing || listing.isDeleted) {
        return res.status(404).json({ error: "Listing not found" });
      }
      // Cache individual listing for 60 seconds
      res.set("Cache-Control", setCacheHeaders(60));
      res.json(listing);
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ error: "Failed to fetch listing" });
    }
  });

  // Hero banner listings (featured + hot items)
  app.get("/api/hero-listings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const heroListings = await storage.getHeroListings(limit);
      res.set("Cache-Control", setCacheHeaders(60));
      res.json(heroListings);
    } catch (error) {
      console.error("Error fetching hero listings:", error);
      res.status(500).json({ error: "Failed to fetch hero listings" });
    }
  });

  // Hot listings (most viewed/bid on)
  app.get("/api/hot-listings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const hotListings = await storage.getHotListings(limit);
      res.set("Cache-Control", setCacheHeaders(60));
      res.json(hotListings);
    } catch (error) {
      console.error("Error fetching hot listings:", error);
      res.status(500).json({ error: "Failed to fetch hot listings" });
    }
  });

  // Check if user has bid on a listing and if they are the highest bidder
  app.get("/api/listings/:id/user-bid-status", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ hasBid: false, isHighest: false });
      }
      
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.json({ hasBid: false, isHighest: false });
      }
      
      const userBids = await storage.getUserBids(userId);
      const hasBid = userBids.some(bid => bid.listingId === req.params.id);
      const isHighest = (listing as any).highestBidderId === userId;
      
      res.json({ hasBid, isHighest });
    } catch (error) {
      console.error("Error checking user bid status:", error);
      res.json({ hasBid: false, isHighest: false });
    }
  });

  app.post("/api/listings", async (req, res) => {
    try {
      const sessionUserId = await getUserIdFromRequest(req);
      
      // Only allow sellers to create listings
      if (!sessionUserId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإضافة منتج" });
      }
      
      const user = await storage.getUser(sessionUserId);
      if (!user || !user.sellerApproved) {
        return res.status(403).json({ error: "يجب أن يكون حسابك معتمداً كبائع لإضافة منتجات" });
      }
      
      // Check if user is banned
      if (user.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك إضافة منتجات." });
      }
      
      // Validate auction times - auctions must have start and end times
      if (req.body.saleType === "auction") {
        if (!req.body.auctionStartTime || !req.body.auctionEndTime) {
          return res.status(400).json({ 
            error: "المزادات تتطلب تحديد تاريخ ووقت البدء والانتهاء" 
          });
        }
        
        const startTime = new Date(req.body.auctionStartTime);
        const endTime = new Date(req.body.auctionEndTime);
        const hoursDiff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return res.status(400).json({ 
            error: "يجب أن تكون مدة المزاد 24 ساعة على الأقل" 
          });
        }
        
        if (endTime <= startTime) {
          return res.status(400).json({ 
            error: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء" 
          });
        }
      }
      
      const listingData = {
        title: req.body.title,
        description: req.body.description,
        price: typeof req.body.price === "number" ? req.body.price : parseInt(req.body.price, 10),
        category: req.body.category,
        condition: req.body.condition,
        images: req.body.images || [],
        saleType: req.body.saleType || "fixed",
        timeLeft: req.body.timeLeft || null,
        auctionStartTime: req.body.auctionStartTime ? new Date(req.body.auctionStartTime) : null,
        auctionEndTime: req.body.auctionEndTime ? new Date(req.body.auctionEndTime) : null,
        deliveryWindow: req.body.deliveryWindow,
        returnPolicy: req.body.returnPolicy,
        returnDetails: req.body.returnDetails || null,
        sellerName: req.body.sellerName,
        sellerId: sessionUserId || req.body.sellerId || null,
        sellerPhone: req.body.sellerPhone || null,
        city: req.body.city,
        brand: req.body.brand || null,
        isNegotiable: req.body.isNegotiable === true,
        serialNumber: req.body.serialNumber || null,
        quantityAvailable: typeof req.body.quantityAvailable === "number" 
          ? req.body.quantityAvailable 
          : parseInt(req.body.quantityAvailable, 10) || 1,
      };

      const validatedData = insertListingSchema.parse(listingData);
      const listing = await storage.createListing(validatedData);
      res.status(201).json(listing);
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(400).json({ error: "Failed to create listing", details: String(error) });
    }
  });

  // CSV Bulk Upload for Sellers
  app.post("/api/listings/bulk-upload", csvUpload.single("file"), async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.sellerApproved) {
        return res.status(403).json({ error: "يجب أن تكون بائعاً معتمداً" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "الرجاء رفع ملف CSV" });
      }

      const csvContent = req.file.buffer.toString("utf-8");
      const lines = csvContent.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ error: "الملف فارغ أو لا يحتوي على بيانات" });
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const requiredHeaders = ["title", "description", "price", "category", "condition", "city"];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        return res.status(400).json({ 
          error: `الأعمدة المطلوبة غير موجودة: ${missingHeaders.join(", ")}` 
        });
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i]);
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ""; });

          const listingData = {
            title: row.title?.trim(),
            description: row.description?.trim(),
            price: parseInt(row.price, 10) || 0,
            category: row.category?.trim() || "other",
            condition: row.condition?.trim() || "used",
            city: row.city?.trim() || user.city || "بغداد",
            brand: row.brand?.trim() || null,
            images: row.images ? row.images.split(";").map(u => u.trim()).filter(Boolean) : [],
            saleType: "fixed" as const,
            deliveryWindow: row.deliverywindow?.trim() || "3-5 أيام",
            returnPolicy: row.returnpolicy?.trim() || "لا يوجد إرجاع",
            sellerName: user.displayName || "",
            sellerId: userId,
            isNegotiable: row.isnegotiable === "true" || row.isnegotiable === "نعم",
            quantityAvailable: parseInt(row.quantity, 10) || 1,
          };

          if (!listingData.title || !listingData.description || listingData.price <= 0) {
            results.failed++;
            results.errors.push(`السطر ${i + 1}: بيانات غير مكتملة`);
            continue;
          }

          await storage.createListing(listingData);
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`السطر ${i + 1}: ${String(err)}`);
        }
      }

      res.json({
        message: `تم استيراد ${results.success} منتج بنجاح${results.failed > 0 ? `، فشل ${results.failed}` : ""}`,
        ...results,
      });
    } catch (error) {
      console.error("Error in bulk upload:", error);
      res.status(500).json({ error: "حدث خطأ أثناء معالجة الملف" });
    }
  });

  // Helper function to parse CSV line (handles quoted values)
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  // CSV Template Download
  app.get("/api/listings/csv-template", (req, res) => {
    const headers = "title,description,price,category,condition,city,brand,images,deliveryWindow,returnPolicy,isNegotiable,quantity";
    const exampleRow = '"ساعة روليكس أصلية","ساعة روليكس موديل 2020 بحالة ممتازة",500000,watches,excellent,بغداد,Rolex,"https://example.com/img1.jpg;https://example.com/img2.jpg","3-5 أيام","إرجاع خلال 7 أيام",true,1';
    const csvContent = `${headers}\n${exampleRow}`;
    
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=ebay_iraq_template.csv");
    res.send("\uFEFF" + csvContent); // BOM for Excel Arabic support
  });

  app.patch("/api/listings/:id", async (req, res) => {
    try {
      const existingListing = await storage.getListing(req.params.id);
      if (!existingListing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      
      const quantitySold = existingListing.quantitySold || 0;
      
      // If items have been sold, only allow updating quantityAvailable
      if (quantitySold > 0) {
        const allowedFields = ['quantityAvailable', 'isActive'];
        const requestedFields = Object.keys(req.body);
        const disallowedFields = requestedFields.filter(f => !allowedFields.includes(f));
        
        if (disallowedFields.length > 0) {
          return res.status(403).json({ 
            error: "بعد البيع، يمكنك فقط تعديل الكمية المتوفرة. لتعديل باقي التفاصيل، أعد عرض المنتج كمنتج جديد." 
          });
        }
        
        // Ensure new quantity is at least equal to quantity sold
        if (req.body.quantityAvailable !== undefined) {
          const newQuantity = typeof req.body.quantityAvailable === "number" 
            ? req.body.quantityAvailable 
            : parseInt(req.body.quantityAvailable, 10);
          
          if (isNaN(newQuantity) || newQuantity < quantitySold) {
            return res.status(400).json({ 
              error: `الكمية الجديدة يجب أن تكون ${quantitySold} على الأقل (عدد المبيعات الحالية)` 
            });
          }
          req.body.quantityAvailable = newQuantity;
          // Re-activate listing if adding more stock
          if (newQuantity > quantitySold) {
            req.body.isActive = true;
          }
        }
      }
      
      if (req.body.price !== undefined) {
        req.body.price = typeof req.body.price === "number" 
          ? req.body.price 
          : parseInt(req.body.price, 10);
        if (isNaN(req.body.price)) {
          return res.status(400).json({ error: "Invalid price value" });
        }
      }
      
      // Convert date strings to Date objects for timestamp columns
      if (req.body.auctionStartTime !== undefined && req.body.auctionStartTime !== null) {
        const parsed = new Date(req.body.auctionStartTime);
        req.body.auctionStartTime = isNaN(parsed.getTime()) ? null : parsed;
      }
      if (req.body.auctionEndTime !== undefined && req.body.auctionEndTime !== null) {
        const parsed = new Date(req.body.auctionEndTime);
        req.body.auctionEndTime = isNaN(parsed.getTime()) ? null : parsed;
      }
      
      // Convert shippingCost to number
      if (req.body.shippingCost !== undefined) {
        req.body.shippingCost = typeof req.body.shippingCost === "number" 
          ? req.body.shippingCost 
          : parseInt(req.body.shippingCost, 10) || 0;
      }
      
      // Ensure internationalCountries is array or null
      if (req.body.internationalCountries !== undefined) {
        if (!Array.isArray(req.body.internationalCountries)) {
          req.body.internationalCountries = null;
        }
      }
      
      // Ensure area and sku are strings or null
      if (req.body.area === "") req.body.area = null;
      if (req.body.sku === "") req.body.sku = null;
      
      const validatedData = updateListingSchema.parse(req.body) as Parameters<typeof storage.updateListing>[1];
      
      const listing = await storage.updateListing(req.params.id, validatedData);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error updating listing:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update listing" });
    }
  });

  app.delete("/api/listings/:id", async (req, res) => {
    try {
      const success = await storage.deleteListing(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: "Failed to delete listing" });
    }
  });

  // Relist an item - creates a new listing based on an existing one
  app.post("/api/listings/:id/relist", async (req, res) => {
    try {
      const sessionUserId = await getUserIdFromRequest(req);
      if (!sessionUserId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const originalListing = await storage.getListing(req.params.id);
      if (!originalListing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }

      // Verify ownership
      if (originalListing.sellerId !== sessionUserId) {
        return res.status(403).json({ error: "لا يمكنك إعادة عرض منتج لا تملكه" });
      }

      // For auctions, require new start and end times
      let auctionStartTime = null;
      let auctionEndTime = null;
      
      if (originalListing.saleType === "auction") {
        if (!req.body.auctionStartTime || !req.body.auctionEndTime) {
          return res.status(400).json({ 
            error: "المزادات تتطلب تحديد تاريخ ووقت البدء والانتهاء الجديد" 
          });
        }
        
        auctionStartTime = new Date(req.body.auctionStartTime);
        auctionEndTime = new Date(req.body.auctionEndTime);
        const hoursDiff = (auctionEndTime.getTime() - auctionStartTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return res.status(400).json({ 
            error: "يجب أن تكون مدة المزاد 24 ساعة على الأقل" 
          });
        }
      }

      // Create new listing with same details but reset stats
      const newListingData = {
        title: originalListing.title,
        description: originalListing.description,
        price: req.body.price || originalListing.price,
        category: originalListing.category,
        condition: originalListing.condition,
        images: originalListing.images,
        saleType: originalListing.saleType,
        timeLeft: null,
        auctionStartTime,
        auctionEndTime,
        deliveryWindow: originalListing.deliveryWindow,
        returnPolicy: originalListing.returnPolicy,
        returnDetails: originalListing.returnDetails,
        sellerName: originalListing.sellerName,
        sellerId: sessionUserId,
        city: originalListing.city,
        brand: originalListing.brand,
        isNegotiable: originalListing.isNegotiable,
        serialNumber: originalListing.serialNumber,
        quantityAvailable: req.body.quantityAvailable || 1,
      };

      const validatedData = insertListingSchema.parse(newListingData);
      const newListing = await storage.createListing(validatedData);
      
      res.status(201).json(newListing);
    } catch (error) {
      console.error("Error relisting item:", error);
      res.status(400).json({ error: "فشل في إعادة عرض المنتج", details: String(error) });
    }
  });

  app.get("/api/listings/:id/bids", async (req, res) => {
    try {
      const bids = await storage.getBidsForListing(req.params.id);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  // Get bids with bidder information (for seller dashboard)
  app.get("/api/listings/:id/bids/detailed", async (req, res) => {
    try {
      const bids = await storage.getBidsWithUserInfo(req.params.id);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching detailed bids:", error);
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  // Track listing view (excludes seller's own views)
  app.post("/api/listings/:id/view", async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      
      // Get viewer ID from request body or session
      const viewerId = req.body?.viewerId || (req.session as any)?.userId;
      
      // Don't count views from the seller themselves
      if (viewerId && viewerId === listing.sellerId) {
        return res.json({ views: listing.views || 0, skipped: true });
      }
      
      const views = await storage.incrementListingViews(req.params.id);
      res.json({ views });
    } catch (error) {
      console.error("Error tracking view:", error);
      res.status(500).json({ error: "Failed to track view" });
    }
  });

  app.post("/api/bids", async (req, res) => {
    try {
      const validatedData = insertBidSchema.parse(req.body);
      
      // Check if user is verified and not banned before allowing bids
      const bidder = await storage.getUser(validatedData.userId);
      if (!bidder) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      if (bidder.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك المزايدة." });
      }

      const listing = await storage.getListing(validatedData.listingId);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      // Enforce participation restrictions
      if (listing.allowedBidderType === "verified_only" && !bidder.isVerified) {
        return res.status(403).json({ error: "هذا المزاد مخصص للمستخدمين الموثقين فقط. يرجى توثيق حسابك للمشاركة." });
      }
      
      // Prevent sellers from bidding on their own items
      if (listing.sellerId && validatedData.userId === listing.sellerId) {
        return res.status(400).json({ error: "لا يمكنك المزايدة على منتجك الخاص" });
      }
      
      if (listing.saleType === "auction" && listing.auctionEndTime) {
        const now = new Date();
        if (now > listing.auctionEndTime) {
          return res.status(400).json({ error: "المزاد انتهى" });
        }
      }
      
      const highestBid = await storage.getHighestBid(validatedData.listingId);
      
      // Prevent users from outbidding themselves
      if (highestBid && highestBid.userId === validatedData.userId) {
        return res.status(400).json({ error: "أنت بالفعل صاحب أعلى مزايدة" });
      }
      
      const minBid = highestBid ? highestBid.amount + 1000 : listing.price;
      
      if (validatedData.amount < minBid) {
        return res.status(400).json({ 
          error: "المزايدة يجب أن تكون أعلى من المزايدة الحالية",
          minBid 
        });
      }
      
      // Get previous high bidder before creating new bid
      const previousHighBid = highestBid;
      const previousHighBidderId = previousHighBid?.userId;
      
      const bid = await storage.createBid(validatedData);
      
      // Update listing with new highest bid info
      await storage.updateListing(validatedData.listingId, {
        currentBid: validatedData.amount,
        highestBidderId: validatedData.userId,
        totalBids: (listing.totalBids || 0) + 1,
      } as any);
      
      // Send notification to previous highest bidder (they've been outbid)
      if (previousHighBidderId && previousHighBidderId !== validatedData.userId) {
        await storage.createNotification({
          userId: previousHighBidderId,
          type: "outbid",
          title: "تم تجاوز مزايدتك!",
          message: `تم تقديم مزايدة أعلى على "${listing.title}". قم بزيادة مزايدتك للفوز.`,
          linkUrl: `/product/${validatedData.listingId}`,
          relatedId: validatedData.listingId,
        });
      }
      
      // Send notification to seller about new bid
      if (listing.sellerId && listing.sellerId !== validatedData.userId) {
        await storage.createNotification({
          userId: listing.sellerId,
          type: "new_bid",
          title: "مزايدة جديدة!",
          message: `${bidder?.displayName || "مستخدم"} قدم مزايدة ${validatedData.amount.toLocaleString()} د.ع على "${listing.title}"`,
          linkUrl: `/product/${validatedData.listingId}`,
          relatedId: validatedData.listingId,
        });
      }
      
      // Anti-sniping: Reset timer to 2 minutes if bid placed in last 2 minutes
      let timeExtended = false;
      let newEndTime: Date | undefined;
      
      if (listing.saleType === "auction" && listing.auctionEndTime) {
        const currentEndTime = new Date(listing.auctionEndTime);
        const now = new Date();
        const timeRemaining = currentEndTime.getTime() - now.getTime();
        const twoMinutes = 2 * 60 * 1000;
        
        if (timeRemaining > 0 && timeRemaining <= twoMinutes) {
          // Bid in last 2 minutes - reset timer to exactly 2 minutes from now
          newEndTime = new Date(now.getTime() + twoMinutes);
          await storage.updateListing(validatedData.listingId, { 
            auctionEndTime: newEndTime 
          });
          timeExtended = true;
        }
      }
      
      const allBids = await storage.getBidsForListing(validatedData.listingId);
      const totalBids = allBids.length;
      const currentBid = validatedData.amount;
      
      // Broadcast with anonymous bidder name for privacy - only seller sees real name via notification
      broadcastBidUpdate({
        type: "bid_update",
        listingId: validatedData.listingId,
        currentBid,
        totalBids,
        bidderName: "مزايد", // Anonymous for public
        bidderId: validatedData.userId,
        timestamp: new Date().toISOString(),
        auctionEndTime: newEndTime?.toISOString() || listing.auctionEndTime?.toISOString(),
        timeExtended,
        previousHighBidderId: previousHighBid?.userId,
      });
      
      res.status(201).json(bid);
    } catch (error) {
      console.error("Error creating bid:", error);
      res.status(400).json({ error: "Failed to create bid", details: String(error) });
    }
  });

  // AI-powered image search - analyze image and find matching products
  app.post("/api/image-search", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Analyze the image using AI vision
      const analysis = await analyzeImageForSearch(imageBase64);
      
      console.log("[image-search] AI Analysis result:", JSON.stringify(analysis, null, 2));
      
      // Get all listings to search through
      const { listings } = await storage.getListingsPaginated({ limit: 200, offset: 0 });
      
      // Build comprehensive search terms from analysis
      const brandTerms: string[] = [
        analysis.brand,
        analysis.model,
        ...analysis.brandVariants
      ].filter((term): term is string => !!term && term.length > 0);
      
      const otherTerms: string[] = [
        analysis.itemType,
        analysis.category,
        analysis.material,
        ...analysis.colors,
        ...analysis.keywords
      ].filter((term): term is string => !!term && term.length > 0);
      
      const allSearchTerms = [...brandTerms, ...otherTerms];
      
      // Score each listing based on how well it matches
      const scoredListings = listings.map(listing => {
        let score = 0;
        let hasBrandMatch = false;
        const title = (listing.title || "").toLowerCase();
        const description = (listing.description || "").toLowerCase();
        const category = (listing.category || "").toLowerCase();
        const tags = (listing.tags || []).map((t: string) => t.toLowerCase());
        const allText = `${title} ${description} ${tags.join(" ")}`;
        
        // BRAND MATCHING - highest priority (200+ points for brand match)
        for (const brandTerm of brandTerms) {
          const lowerBrand = brandTerm.toLowerCase();
          if (title.includes(lowerBrand)) {
            score += 200;
            hasBrandMatch = true;
          } else if (tags.some((tag: string) => tag.includes(lowerBrand) || lowerBrand.includes(tag))) {
            score += 150;
            hasBrandMatch = true;
          } else if (description.includes(lowerBrand)) {
            score += 100;
            hasBrandMatch = true;
          }
        }
        
        // Model matching (e.g., "Submariner", "Speedmaster")
        if (analysis.model) {
          const modelLower = analysis.model.toLowerCase();
          if (allText.includes(modelLower)) {
            score += 80;
          }
        }
        
        // Category must match for watches
        const isWatch = analysis.category === "ساعات" || analysis.itemType.toLowerCase().includes("watch");
        const listingIsWatch = category.includes("ساعات") || category.includes("watch");
        if (isWatch && !listingIsWatch) {
          score = 0; // Exclude non-watches if searching for watches
        } else if (isWatch && listingIsWatch) {
          score += 30; // Bonus for correct category
        }
        
        // Other term matching (lower weight)
        for (const term of otherTerms) {
          const lowerTerm = term.toLowerCase();
          if (lowerTerm.length < 3) continue; // Skip very short terms
          
          if (title.includes(lowerTerm)) score += 15;
          else if (tags.some((tag: string) => tag.includes(lowerTerm))) score += 10;
          else if (description.includes(lowerTerm)) score += 5;
        }
        
        return { listing, score, hasBrandMatch };
      });
      
      // Filter and sort - prioritize brand matches, require minimum score
      const MIN_SCORE = analysis.brand ? 50 : 20; // Higher threshold if brand was detected
      
      let matchingListings = scoredListings
        .filter(item => item.score >= MIN_SCORE)
        .sort((a, b) => {
          // Brand matches always first
          if (a.hasBrandMatch && !b.hasBrandMatch) return -1;
          if (!a.hasBrandMatch && b.hasBrandMatch) return 1;
          return b.score - a.score;
        })
        .slice(0, 12)
        .map(item => ({
          id: item.listing.id,
          title: item.listing.title,
          price: item.listing.price,
          image: item.listing.images?.[0] || "",
          currentBid: item.listing.currentBid,
          saleType: item.listing.saleType,
          score: item.score,
          hasBrandMatch: item.hasBrandMatch
        }));
      
      console.log("[image-search] Found", matchingListings.length, "matches. Brand terms:", brandTerms);
      
      res.json({
        analysis,
        results: matchingListings,
        searchTerms: allSearchTerms,
        brandTerms
      });
    } catch (error) {
      console.error("Error in image search:", error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  // Get public user profile (for seller info on product page)
  app.get("/api/users/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Return only public info - no password or sensitive data
      res.json({
        id: user.id,
        displayName: user.displayName,
        phone: user.phone,
        avatar: user.avatar,
        sellerApproved: user.sellerApproved,
        isVerified: user.isVerified,
        totalSales: user.totalSales,
        rating: user.rating,
        ratingCount: user.ratingCount,
        city: user.city,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Public seller profile endpoint (alias)
  app.get("/api/users/:userId/public", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        displayName: user.displayName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        totalSales: user.totalSales,
        rating: user.rating,
        ratingCount: user.ratingCount,
        city: user.city,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Error fetching public user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/users/:userId/bids", async (req, res) => {
    try {
      const bids = await storage.getUserBids(req.params.userId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching user bids:", error);
      res.status(500).json({ error: "Failed to fetch user bids" });
    }
  });

  app.get("/api/users/:userId/watchlist", async (req, res) => {
    try {
      const items = await storage.getWatchlist(req.params.userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  app.get("/api/watchlist/listings", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }
      const listings = await storage.getWatchlistListings(userId);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching watchlist listings:", error);
      res.status(500).json({ error: "Failed to fetch watchlist listings" });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const validatedData = insertWatchlistSchema.parse(req.body);
      const isAlreadyInWatchlist = await storage.isInWatchlist(validatedData.userId, validatedData.listingId);
      if (isAlreadyInWatchlist) {
        return res.status(400).json({ error: "Already in watchlist" });
      }
      const item = await storage.addToWatchlist(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      res.status(400).json({ error: "Failed to add to watchlist", details: String(error) });
    }
  });

  app.delete("/api/watchlist/:userId/:listingId", async (req, res) => {
    try {
      await storage.removeFromWatchlist(req.params.userId, req.params.listingId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  app.post("/api/analytics", async (req, res) => {
    try {
      const validatedData = insertAnalyticsSchema.parse(req.body);
      const event = await storage.trackAnalytics(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error tracking analytics:", error);
      res.status(400).json({ error: "Failed to track analytics" });
    }
  });

  app.get("/api/analytics/user/:userId", async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsByUser(req.params.userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ error: "Failed to fetch user analytics" });
    }
  });

  app.get("/api/analytics/listing/:listingId", async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsByListing(req.params.listingId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching listing analytics:", error);
      res.status(500).json({ error: "Failed to fetch listing analytics" });
    }
  });

  app.get("/api/messages/:userId", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/:userId1/:userId2", async (req, res) => {
    try {
      const messages = await storage.getConversation(req.params.userId1, req.params.userId2);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإرسال رسالة" });
      }
      
      // Check if user is banned
      const currentUser = await storage.getUser(userId);
      if (currentUser?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك إرسال الرسائل." });
      }
      
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Ensure the sender is the authenticated user
      if (validatedData.senderId !== userId) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      
      // Prevent users from messaging themselves
      if (validatedData.senderId === validatedData.receiverId) {
        return res.status(400).json({ error: "لا يمكنك إرسال رسالة لنفسك" });
      }
      
      const message = await storage.sendMessage(validatedData);
      
      // Create notification for the receiver
      const isOffer = validatedData.content?.includes("عرض سعر:");
      
      await storage.createNotification({
        userId: validatedData.receiverId,
        type: isOffer ? "new_offer" : "new_message",
        title: isOffer ? "عرض سعر جديد!" : "رسالة جديدة",
        message: isOffer 
          ? `${currentUser?.displayName || "مستخدم"} أرسل لك عرض سعر`
          : `${currentUser?.displayName || "مستخدم"} أرسل لك رسالة`,
        linkUrl: `/messages/${validatedData.senderId}`,
        relatedId: validatedData.senderId,
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(400).json({ error: "Failed to send message", details: String(error) });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    try {
      const success = await storage.markMessageAsRead(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  app.get("/api/seller-messages", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }
    try {
      const msgs = await storage.getMessagesForSeller(userId);
      const messagesWithDetails = await Promise.all(msgs.map(async (msg) => {
        const sender = await storage.getUser(msg.senderId);
        const listing = msg.listingId ? await storage.getListing(msg.listingId) : null;
        return {
          ...msg,
          senderName: sender?.displayName || "مستخدم",
          listingTitle: listing?.title || null,
          listingImage: listing?.images?.[0] || null,
        };
      }));
      res.json(messagesWithDetails);
    } catch (error) {
      console.error("Error fetching seller messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Product comments
  app.get("/api/comments/:listingId", async (req, res) => {
    try {
      const comments = await storage.getCommentsForListing(req.params.listingId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول للتعليق" });
      }
      
      // Check if user is banned
      const commenter = await storage.getUser(userId);
      if (commenter?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك التعليق." });
      }
      
      const validatedData = insertProductCommentSchema.parse(req.body);
      
      if (validatedData.userId !== userId) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      
      const comment = await storage.createComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(400).json({ error: "فشل في إضافة التعليق", details: String(error) });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }
      
      const success = await storage.deleteComment(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ error: "التعليق غير موجود أو غير مصرح بحذفه" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "فشل في حذف التعليق" });
    }
  });

  app.get("/api/reviews/seller/:sellerId", async (req, res) => {
    try {
      const reviews = await storage.getReviewsForSeller(req.params.sellerId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const validatedData = insertReviewSchema.parse(req.body);
      
      // Check if user already reviewed this listing
      const alreadyReviewed = await storage.hasReviewForListing(
        validatedData.reviewerId, 
        validatedData.listingId
      );
      if (alreadyReviewed) {
        return res.status(400).json({ error: "لقد قمت بتقييم هذا المنتج مسبقاً" });
      }
      
      const review = await storage.createReview(validatedData);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(400).json({ error: "فشل في إرسال التقييم", details: String(error) });
    }
  });

  app.get("/api/transactions/:userId", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsForUser(req.params.userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const sessionUserId = await getUserIdFromRequest(req);
      
      // Check if user is banned
      if (sessionUserId) {
        const buyer = await storage.getUser(sessionUserId);
        if (buyer?.isBanned) {
          return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
        }
      }
      
      // Check if listing is still available
      const listing = await storage.getListing(validatedData.listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Prevent sellers from buying their own products
      if (sessionUserId && listing.sellerId === sessionUserId) {
        return res.status(400).json({ error: "لا يمكنك شراء منتجك الخاص" });
      }
      
      const availableQuantity = (listing.quantityAvailable || 1) - (listing.quantitySold || 0);
      
      if (availableQuantity <= 0) {
        return res.status(400).json({ error: "المنتج نفد - غير متوفر للشراء" });
      }
      
      const transaction = await storage.createTransaction(validatedData);
      
      // Update listing quantitySold
      const newQuantitySold = (listing.quantitySold || 0) + 1;
      await storage.updateListing(validatedData.listingId, {
        quantitySold: newQuantitySold,
        // Mark as inactive if sold out
        isActive: newQuantitySold < (listing.quantityAvailable || 1)
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(400).json({ error: "Failed to create transaction", details: String(error) });
    }
  });

  // Guest checkout - allows purchases without authentication
  app.post("/api/transactions/guest", async (req, res) => {
    try {
      const { listingId, guestName, guestPhone, guestAddress, guestCity, amount } = req.body;
      
      if (!listingId || !guestName || !guestPhone || !guestAddress) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }
      
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      const availableQuantity = (listing.quantityAvailable || 1) - (listing.quantitySold || 0);
      if (availableQuantity <= 0) {
        return res.status(400).json({ error: "المنتج نفد - غير متوفر للشراء" });
      }
      
      // Create transaction with guest info in delivery address
      const guestInfo = `الاسم: ${guestName}\nالهاتف: ${guestPhone}\nالمدينة: ${guestCity || 'غير محدد'}\nالعنوان: ${guestAddress}`;
      
      const transaction = await storage.createTransaction({
        listingId,
        sellerId: listing.sellerId || "",
        buyerId: "guest",
        amount: amount || listing.price,
        status: "pending",
        paymentMethod: "cash",
        deliveryAddress: guestInfo,
        deliveryStatus: "pending",
      });
      
      // Update listing quantitySold
      const newQuantitySold = (listing.quantitySold || 0) + 1;
      await storage.updateListing(listingId, {
        quantitySold: newQuantitySold,
        isActive: newQuantitySold < (listing.quantityAvailable || 1)
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating guest transaction:", error);
      res.status(400).json({ error: "فشل في إتمام الطلب", details: String(error) });
    }
  });

  app.patch("/api/transactions/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const transaction = await storage.updateTransactionStatus(req.params.id, status);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  // Confirm payment received (seller action for cash transactions)
  app.patch("/api/transactions/:id/confirm-payment", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لتأكيد استلام الدفع" });
      }
      
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بتحديث هذا الطلب" });
      }
      
      if (transaction.status !== "pending_payment") {
        return res.status(400).json({ error: "الطلب ليس في حالة انتظار الدفع" });
      }
      
      const updated = await storage.updateTransactionStatus(transactionId, "pending");
      if (!updated) {
        return res.status(500).json({ error: "فشل في تأكيد استلام الدفع" });
      }
      
      // Notify buyer that payment was confirmed
      if (transaction.buyerId && transaction.buyerId !== "guest") {
        const listing = await storage.getListing(transaction.listingId);
        await storage.createNotification({
          userId: transaction.buyerId,
          type: "payment_confirmed",
          title: "تم تأكيد الدفع",
          message: `تم تأكيد استلام الدفع للطلب ${listing?.title || "منتج"}. البائع يجهز طلبك للشحن.`,
          relatedId: transactionId,
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ error: "فشل في تأكيد استلام الدفع" });
    }
  });

  // Mark transaction as shipped (seller action)
  app.patch("/api/transactions/:id/ship", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      
      // Authentication required
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لتحديث حالة الشحن" });
      }
      
      // Get the specific transaction directly
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      // Verify seller owns this transaction
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بتحديث هذا الطلب" });
      }
      
      // Update delivery status to shipped
      const updated = await storage.updateTransactionStatus(transactionId, "shipped");
      if (!updated) {
        return res.status(500).json({ error: "فشل في تحديث حالة الشحن" });
      }
      
      // If buyer is registered (not guest), send them notification and message
      if (transaction.buyerId && transaction.buyerId !== "guest") {
        const listing = await storage.getListing(transaction.listingId);
        try {
          await storage.createNotification({
            userId: transaction.buyerId,
            type: "order_shipped",
            title: "تم شحن طلبك! 📦",
            message: `تم شحن طلبك "${listing?.title || 'منتج'}". سيصلك قريباً!`,
            relatedId: transaction.listingId,
          });
          await storage.sendMessage({
            senderId: transaction.sellerId,
            receiverId: transaction.buyerId,
            content: `تم شحن طلبك! 📦\n\nالمنتج: ${listing?.title || 'منتج'}\nرقم الطلب: ${transactionId.slice(0, 8).toUpperCase()}\n\nسيصلك قريباً. شكراً لتسوقك معنا!`,
            listingId: transaction.listingId,
          });
        } catch (e) {
          console.log("Could not send shipping notification:", e);
        }
      }
      
      res.json({ 
        success: true, 
        message: "تم تحديث حالة الشحن بنجاح",
        transaction: updated,
        isGuestBuyer: transaction.buyerId === "guest",
        guestInfo: transaction.buyerId === "guest" ? transaction.deliveryAddress : null,
      });
    } catch (error) {
      console.error("Error marking as shipped:", error);
      res.status(500).json({ error: "فشل في تحديث حالة الشحن" });
    }
  });

  // Mark transaction as delivered (seller action)
  app.patch("/api/transactions/:id/deliver", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لتحديث حالة التسليم" });
      }
      
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بتحديث هذا الطلب" });
      }
      
      const updated = await storage.updateTransactionStatus(transactionId, "delivered");
      if (!updated) {
        return res.status(500).json({ error: "فشل في تحديث حالة التسليم" });
      }
      
      // Create wallet settlement for the seller (sale earnings minus commission and shipping)
      try {
        const listing = await storage.getListing(transaction.listingId);
        const shippingCost = listing?.shippingCost || 0;
        
        const settlement = await financialService.createSaleSettlement(
          transaction.sellerId,
          transactionId,
          transaction.amount,
          shippingCost
        );
        
        console.log(`[Wallet] Settlement created for transaction ${transactionId}:`, {
          grossEarnings: settlement.grossEarnings,
          commissionFee: settlement.commissionFee,
          shippingDeduction: settlement.shippingDeduction,
          netEarnings: settlement.netEarnings,
          isCommissionFree: settlement.isCommissionFree,
        });
      } catch (walletError) {
        console.error("Error creating wallet settlement:", walletError);
        // Don't fail the delivery - wallet can be reconciled later
      }
      
      if (transaction.buyerId && transaction.buyerId !== "guest") {
        const listing = await storage.getListing(transaction.listingId);
        try {
          await storage.sendMessage({
            senderId: transaction.sellerId,
            receiverId: transaction.buyerId,
            content: `تم تسليم طلبك بنجاح! ✅\n\nالمنتج: ${listing?.title || 'منتج'}\nرقم الطلب: ${transactionId.slice(0, 8).toUpperCase()}\n\nشكراً لتسوقك معنا! نتمنى أن ينال المنتج إعجابك.`,
            listingId: transaction.listingId,
          });
        } catch (e) {
          console.log("Could not send delivery notification message:", e);
        }
      }
      
      res.json({ 
        success: true, 
        message: "تم تحديث حالة التسليم بنجاح",
        transaction: updated,
      });
    } catch (error) {
      console.error("Error marking as delivered:", error);
      res.status(500).json({ error: "فشل في تحديث حالة التسليم" });
    }
  });

  // Report order issue (returned, unreachable, cancelled)
  app.patch("/api/transactions/:id/issue", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      const { issueType, issueNote, status } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }
      
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بتحديث هذا الطلب" });
      }
      
      // Update transaction with issue info
      const updated = await storage.updateTransactionWithIssue(transactionId, {
        status: status || "issue",
        issueType,
        issueNote,
      });
      
      if (!updated) {
        return res.status(500).json({ error: "فشل في تحديث الطلب" });
      }
      
      res.json({ 
        success: true, 
        message: "تم تسجيل المشكلة بنجاح",
        transaction: updated,
      });
    } catch (error) {
      console.error("Error reporting issue:", error);
      res.status(500).json({ error: "فشل في تسجيل المشكلة" });
    }
  });

  // Seller cancellation - cancel a sale with reason
  app.patch("/api/transactions/:id/seller-cancel", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      const { reason } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإلغاء الطلب" });
      }
      
      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ error: "يجب تقديم سبب الإلغاء (5 أحرف على الأقل)" });
      }
      
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بإلغاء هذا الطلب" });
      }
      
      // Only allow cancellation for pending/pending_payment/pending_shipping orders
      if (!["pending", "pending_payment", "pending_shipping"].includes(transaction.status)) {
        return res.status(400).json({ error: "لا يمكن إلغاء الطلب بعد تأكيد الشحن" });
      }
      
      // Update transaction with cancellation info
      const updated = await storage.cancelTransactionBySeller(transactionId, reason.trim());
      
      if (!updated) {
        return res.status(500).json({ error: "فشل في إلغاء الطلب" });
      }
      
      // Notify buyer about cancellation
      if (transaction.buyerId && transaction.buyerId !== "guest") {
        const listing = await storage.getListing(transaction.listingId);
        try {
          await storage.createNotification({
            userId: transaction.buyerId,
            type: "order_cancelled",
            title: "تم إلغاء طلبك",
            message: `عذراً، تم إلغاء طلبك "${listing?.title || 'منتج'}" من قبل البائع. السبب: ${reason}`,
            relatedId: transaction.listingId,
          });
          await storage.sendMessage({
            senderId: transaction.sellerId,
            receiverId: transaction.buyerId,
            content: `عذراً، تم إلغاء طلبك ❌\n\nالمنتج: ${listing?.title || 'منتج'}\nرقم الطلب: ${transactionId.slice(0, 8).toUpperCase()}\n\nسبب الإلغاء: ${reason}\n\nنعتذر عن أي إزعاج.`,
            listingId: transaction.listingId,
          });
        } catch (e) {
          console.log("Could not send cancellation notification:", e);
        }
      }
      
      res.json({ 
        success: true, 
        message: "تم إلغاء الطلب بنجاح",
        transaction: updated,
      });
    } catch (error) {
      console.error("Error cancelling transaction:", error);
      res.status(500).json({ error: "فشل في إلغاء الطلب" });
    }
  });

  // Buyer cancellation - cancel a purchase with reason
  app.patch("/api/transactions/:id/buyer-cancel", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      const { reason } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإلغاء الطلب" });
      }

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ error: "يجب تقديم سبب الإلغاء (5 أحرف على الأقل)" });
      }

      const transaction = await storage.getTransactionById(transactionId);

      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      if (transaction.buyerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بإلغاء هذا الطلب" });
      }

      if (!["pending", "pending_payment", "pending_shipping"].includes(transaction.status)) {
        return res.status(400).json({ error: "لا يمكن إلغاء الطلب بعد تأكيد الشحن" });
      }

      const updated = await storage.cancelTransactionByBuyer(transactionId, reason.trim());

      if (!updated) {
        return res.status(500).json({ error: "فشل في إلغاء الطلب" });
      }

      const listing = await storage.getListing(transaction.listingId);
      if (listing) {
        const newQuantitySold = Math.max(0, (listing.quantitySold || 0) - 1);
        await storage.updateListing(transaction.listingId, {
          quantitySold: newQuantitySold,
          isActive: newQuantitySold < (listing.quantityAvailable || 1),
        });
      }

      // Notify seller about cancellation
      if (transaction.sellerId) {
        try {
          await storage.createNotification({
            userId: transaction.sellerId,
            type: "order_cancelled",
            title: "تم إلغاء الطلب من قبل المشتري",
            message: `تم إلغاء طلب "${listing?.title || 'منتج'}" من قبل المشتري. السبب: ${reason}`,
            relatedId: transaction.listingId,
          });
          await storage.sendMessage({
            senderId: transaction.buyerId,
            receiverId: transaction.sellerId,
            content: `تم إلغاء الطلب ❌\n\nالمنتج: ${listing?.title || 'منتج'}\nرقم الطلب: ${transactionId.slice(0, 8).toUpperCase()}\n\nسبب الإلغاء: ${reason}\n\nنعتذر عن أي إزعاج.`,
            listingId: transaction.listingId,
          });
        } catch (e) {
          console.log("Could not send cancellation notification:", e);
        }
      }

      res.json({
        success: true,
        message: "تم إلغاء الطلب بنجاح",
        transaction: updated,
      });
    } catch (error) {
      console.error("Error cancelling transaction (buyer):", error);
      res.status(500).json({ error: "فشل في إلغاء الطلب" });
    }
  });

  // Rate buyer (seller rating for buyer)
  app.patch("/api/transactions/:id/rate-buyer", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      const { rating, feedback } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5" });
      }
      
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بتقييم هذا المشتري" });
      }
      
      if (transaction.buyerRating) {
        return res.status(400).json({ error: "تم تقييم هذا المشتري مسبقاً" });
      }
      
      // Update transaction with buyer rating and update buyer's overall rating
      const updated = await storage.rateBuyer(transactionId, rating, feedback);
      
      if (!updated) {
        return res.status(500).json({ error: "فشل في تقييم المشتري" });
      }
      
      res.json({ 
        success: true, 
        message: "تم تقييم المشتري بنجاح",
        transaction: updated,
      });
    } catch (error) {
      console.error("Error rating buyer:", error);
      res.status(500).json({ error: "فشل في تقييم المشتري" });
    }
  });

  // Return Requests Routes
  app.post("/api/return-requests", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const { transactionId, reason, details } = req.body;
      
      if (!transactionId || !reason) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      const transaction = await storage.getTransactionById(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      if (transaction.buyerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بطلب الإرجاع" });
      }

      const existingRequest = await storage.getReturnRequestByTransaction(transactionId);
      if (existingRequest) {
        return res.status(400).json({ error: "تم طلب الإرجاع مسبقاً لهذا الطلب" });
      }

      const listing = await storage.getListing(transaction.listingId);
      if (listing?.returnPolicy === "لا يوجد إرجاع" || listing?.returnPolicy === "no_returns") {
        return res.status(400).json({ error: "هذا المنتج لا يقبل الإرجاع" });
      }

      const returnRequest = await storage.createReturnRequest({
        transactionId,
        buyerId: userId,
        sellerId: transaction.sellerId,
        listingId: transaction.listingId,
        reason,
        details,
      });

      await storage.createNotification({
        userId: transaction.sellerId,
        type: "return_request",
        title: "طلب إرجاع جديد",
        message: `لديك طلب إرجاع جديد للمنتج`,
        linkUrl: `/seller-dashboard?tab=returns`,
        relatedId: returnRequest.id,
      });

      res.status(201).json(returnRequest);
    } catch (error) {
      console.error("Error creating return request:", error);
      res.status(500).json({ error: "فشل في إنشاء طلب الإرجاع" });
    }
  });

  app.get("/api/return-requests/buyer", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const requests = await storage.getReturnRequestsForBuyer(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching return requests:", error);
      res.status(500).json({ error: "فشل في جلب طلبات الإرجاع" });
    }
  });

  app.get("/api/return-requests/seller", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const requests = await storage.getReturnRequestsForSeller(userId);
      
      // Enrich with listing and buyer info
      const enrichedRequests = await Promise.all(requests.map(async (request) => {
        const listing = await storage.getListing(request.listingId);
        const buyer = await storage.getUser(request.buyerId);
        return {
          ...request,
          listing: listing ? {
            id: listing.id,
            title: listing.title,
            images: listing.images,
          } : null,
          buyer: buyer ? {
            id: buyer.id,
            displayName: buyer.displayName,
            phone: buyer.phone,
          } : null,
        };
      }));
      
      res.json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching return requests:", error);
      res.status(500).json({ error: "فشل في جلب طلبات الإرجاع" });
    }
  });

  app.get("/api/return-requests/transaction/:transactionId", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const request = await storage.getReturnRequestByTransaction(req.params.transactionId);
      res.json(request || null);
    } catch (error) {
      console.error("Error fetching return request:", error);
      res.status(500).json({ error: "فشل في جلب طلب الإرجاع" });
    }
  });

  app.patch("/api/return-requests/:id/respond", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const { status, sellerResponse } = req.body;
      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "حالة غير صالحة" });
      }

      const request = await storage.getReturnRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "طلب الإرجاع غير موجود" });
      }

      if (request.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بالرد على هذا الطلب" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ error: "تم الرد على هذا الطلب مسبقاً" });
      }

      const updated = await storage.updateReturnRequestStatus(req.params.id, status, sellerResponse);

      if (status === "approved") {
        await storage.updateTransactionStatus(request.transactionId, "return_approved");
        
        // Reverse wallet settlement when return is approved
        try {
          const returnReason = request.reason || "طلب إرجاع مقبول";
          await financialService.reverseSettlement(request.transactionId, returnReason);
          console.log(`[Wallet] Settlement reversed for transaction ${request.transactionId} due to return approval`);
        } catch (walletError) {
          console.error("Error reversing wallet settlement:", walletError);
          // Don't fail the return approval - wallet can be reconciled later
        }

        // Credit buyer wallet for refund
        try {
          const transaction = await storage.getTransactionById(request.transactionId);
          if (transaction?.amount) {
            await financialService.createBuyerWalletTransaction(
              request.buyerId,
              transaction.amount,
              `استرجاع مبلغ الطلب #${request.transactionId.slice(0, 8)}`,
              "refund",
              "available"
            );
          }
        } catch (walletError) {
          console.error("Error crediting buyer wallet:", walletError);
          // Don't fail the return approval - wallet can be reconciled later
        }
      }

      await storage.createNotification({
        userId: request.buyerId,
        type: "return_response",
        title: status === "approved" ? "تم قبول طلب الإرجاع" : "تم رفض طلب الإرجاع",
        message: status === "approved" 
          ? "تم قبول طلب الإرجاع الخاص بك. يرجى التواصل مع البائع لترتيب الإرجاع."
          : `تم رفض طلب الإرجاع. ${sellerResponse || ""}`,
        linkUrl: `/buyer-dashboard?tab=orders`,
        relatedId: request.id,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error responding to return request:", error);
      res.status(500).json({ error: "فشل في الرد على طلب الإرجاع" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      // Categories rarely change - cache for 5 minutes
      res.set("Cache-Control", setCacheHeaders(300));
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/search-suggestions", async (req, res) => {
    try {
      const { q } = req.query;
      const query = typeof q === "string" ? q : "";
      
      // Use optimized database-level search suggestions
      const suggestions = await storage.getSearchSuggestions(query, 10);
      
      // Cache suggestions for 60 seconds
      res.set("Cache-Control", setCacheHeaders(60));
      
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching search suggestions:", error);
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(400).json({ error: "Failed to create category", details: String(error) });
    }
  });

  // TEMPORARY: Fix admin status endpoint - remove after use
  app.post("/api/admin/fix-admin-status", async (req, res) => {
    try {
      const { secretCode, phone } = req.body;
      
      // Security: require secret code
      if (secretCode !== "Ss120$JyA-ADMIN-FIX") {
        return res.status(403).json({ error: "Invalid secret code" });
      }
      
      const user = await storage.getUserByPhone(phone || "07700000000");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      await storage.updateUser(user.id, { isAdmin: true } as any);
      
      res.json({ 
        success: true, 
        message: `User ${user.displayName} (${user.phone}) is now admin`,
        userId: user.id
      });
    } catch (error) {
      console.error("Error fixing admin status:", error);
      res.status(500).json({ error: "Failed to fix admin status" });
    }
  });

  // SMS Verification Routes
  app.post("/api/auth/send-verification", async (req, res) => {
    try {
      const { phone, type = "registration" } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }
      
      // Check if Twilio is configured
      const { isTwilioConfigured, generateVerificationCode, sendVerificationSMS } = await import("./sms");
      if (!isTwilioConfigured()) {
        return res.status(503).json({ error: "خدمة الرسائل النصية غير متاحة حالياً" });
      }
      
      // For registration, check if phone is already registered
      if (type === "registration") {
        const existingUser = await storage.getUserByPhone(phone);
        if (existingUser) {
          return res.status(400).json({ error: "رقم الهاتف مستخدم بالفعل" });
        }
      }
      
      // For password reset, verify user exists
      if (type === "password_reset") {
        const existingUser = await storage.getUserByPhone(phone);
        if (!existingUser) {
          return res.status(404).json({ error: "لا يوجد حساب بهذا الرقم" });
        }
      }
      
      // Generate and store verification code
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await storage.createVerificationCode(phone, code, type, expiresAt);
      
      // Send SMS
      const sent = await sendVerificationSMS(phone, code, type);
      if (!sent) {
        return res.status(500).json({ error: "فشل في إرسال رمز التحقق" });
      }
      
      res.json({ success: true, message: "تم إرسال رمز التحقق" });
    } catch (error) {
      console.error("Error sending verification:", error);
      res.status(500).json({ error: "فشل في إرسال رمز التحقق" });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { phone, code, type = "registration" } = req.body;
      
      if (!phone || !code) {
        return res.status(400).json({ error: "رقم الهاتف ورمز التحقق مطلوبان" });
      }
      
      const verification = await storage.getValidVerificationCode(phone, code, type);
      if (!verification) {
        return res.status(400).json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" });
      }
      
      // Mark code as used
      await storage.markVerificationCodeUsed(verification.id);
      
      // If it's for password reset, return a one-time reset token
      if (type === "password_reset") {
        const crypto = await import("crypto");
        const resetToken = crypto.randomBytes(32).toString("hex");
        
        // Store reset token in user record temporarily
        const user = await storage.getUserByPhone(phone);
        if (user) {
          await storage.updateUser(user.id, { authToken: resetToken } as any);
        }
        
        return res.json({ success: true, verified: true, resetToken });
      }
      
      res.json({ success: true, verified: true });
    } catch (error) {
      console.error("Error verifying code:", error);
      res.status(500).json({ error: "فشل في التحقق من الرمز" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { phone, resetToken, newPassword } = req.body;
      
      if (!phone || !resetToken || !newPassword) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      
      // Find user and verify reset token
      const user = await storage.getUserByPhone(phone);
      if (!user || user.authToken !== resetToken) {
        return res.status(400).json({ error: "رابط إعادة التعيين غير صالح" });
      }
      
      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { 
        password: hashedPassword,
        authToken: null 
      } as any);
      
      res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "فشل في إعادة تعيين كلمة المرور" });
    }
  });

  // Phone/password authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { phone, password, displayName, ageBracket, interests, city, email } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });
      }

      // Check if phone already exists
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({ error: "رقم الهاتف مستخدم بالفعل" });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        phone,
        password: hashedPassword,
        displayName: displayName || phone,
        email: email || null,
        authProvider: "phone",
        ageBracket: ageBracket || null,
        interests: interests || [],
        city: city || null,
      });

      // Set session
      (req.session as any).userId = user.id;

      res.status(201).json({ 
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        sellerApproved: user.sellerApproved,
        accountCode: user.accountCode,
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "فشل في إنشاء الحساب" });
    }
  });

  // WhatsApp Authentication via WAuth
  app.post("/api/auth/whatsapp", async (req, res) => {
    try {
      const { mobile, name } = req.body;
      
      if (!mobile) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }

      // Normalize phone number - remove country code if present
      let phone = mobile.replace(/\D/g, '');
      if (phone.startsWith('964')) {
        phone = '0' + phone.substring(3);
      } else if (phone.startsWith('+964')) {
        phone = '0' + phone.substring(4);
      } else if (!phone.startsWith('0')) {
        phone = '0' + phone;
      }

      // Check if user exists
      let user = await storage.getUserByPhone(phone);
      
      if (user) {
        // Check if user is banned
        if (user.isBanned) {
          return res.status(403).json({ 
            error: "تم حظر حسابك من المنصة. لا يمكنك تسجيل الدخول.",
            isBanned: true
          });
        }

        // Existing user - log them in
        (req.session as any).userId = user.id;

        // Generate auth token
        const crypto = await import("crypto");
        const authToken = crypto.randomBytes(32).toString("hex");
        await storage.updateUser(user.id, { authToken } as any);

        return res.json({
          success: true,
          isNewUser: false,
          authToken,
          id: user.id,
          phone: user.phone,
          displayName: user.displayName,
          sellerApproved: user.sellerApproved,
          isVerified: user.isVerified,
          accountCode: user.accountCode,
        });
      } else {
        // New user - create account with WhatsApp-verified phone
        const displayName = name || phone;
        
        user = await storage.createUser({
          phone,
          password: null, // No password for WhatsApp auth
          displayName,
          email: null,
          authProvider: "whatsapp",
          isVerified: true, // WhatsApp verified the phone number
        });

        // Set session
        (req.session as any).userId = user.id;

        // Generate auth token
        const crypto = await import("crypto");
        const authToken = crypto.randomBytes(32).toString("hex");
        await storage.updateUser(user.id, { authToken } as any);

        return res.status(201).json({
          success: true,
          isNewUser: true,
          authToken,
          id: user.id,
          phone: user.phone,
          displayName: user.displayName,
          sellerApproved: user.sellerApproved,
          isVerified: true,
          accountCode: user.accountCode,
        });
      }
    } catch (error) {
      console.error("Error with WhatsApp auth:", error);
      res.status(500).json({ error: "فشل في تسجيل الدخول عبر واتساب" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });
      }

      // Find user by phone
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }

      // Check password
      if (!user.password) {
        return res.status(401).json({ error: "هذا الحساب يستخدم طريقة تسجيل دخول مختلفة" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }

      // Check if user is banned - block login completely
      if (user.isBanned) {
        return res.status(403).json({ 
          error: "تم حظر حسابك من المنصة. لا يمكنك تسجيل الدخول.",
          isBanned: true
        });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        // Generate a pending token for 2FA verification
        const crypto = await import("crypto");
        const pendingToken = crypto.randomBytes(32).toString("hex");
        
        // Store pending token temporarily
        await storage.updateUser(user.id, { authToken: pendingToken } as any);
        
        return res.json({ 
          requires2FA: true,
          phone: user.phone,
          pendingToken,
          message: "يرجى إدخال رمز المصادقة الثنائية"
        });
      }

      // Generate auth token for Safari/ITP compatibility
      const crypto = await import("crypto");
      const authToken = crypto.randomBytes(32).toString("hex");

      // Update last login and store auth token
      await storage.updateUser(user.id, { 
        lastLoginAt: new Date(),
        authToken: authToken,
      } as any);

      // Set session (for browsers that support cookies)
      (req.session as any).userId = user.id;

      res.json({ 
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        sellerApproved: user.sellerApproved,
        isAdmin: user.isAdmin,
        accountCode: user.accountCode,
        avatar: user.avatar,
        authToken: authToken,
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "فشل في تسجيل الدخول" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "فشل في تسجيل الخروج" });
      }
      res.json({ success: true });
    });
  });

  // 2FA (Google Authenticator) Routes
  app.post("/api/auth/2fa/setup", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);
          const user = await storage.getUserByAuthToken(token);
          if (!user) {
            return res.status(401).json({ error: "غير مسجل الدخول" });
          }
          (req as any).userId = user.id;
        } else {
          return res.status(401).json({ error: "غير مسجل الدخول" });
        }
      }
      
      const activeUserId = userId || (req as any).userId;
      const user = await storage.getUser(activeUserId);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      const { authenticator } = await import("otplib");
      const qrcode = await import("qrcode");
      
      const secret = authenticator.generateSecret();
      const appName = "E-بيع";
      const otpauth = authenticator.keyuri(user.phone || user.email || user.id, appName, secret);
      
      const qrCodeDataUrl = await qrcode.toDataURL(otpauth);
      
      // Store secret temporarily (not enabled yet)
      await storage.updateUser(activeUserId, { twoFactorSecret: secret } as any);
      
      res.json({ 
        secret,
        qrCode: qrCodeDataUrl,
        message: "امسح رمز QR باستخدام تطبيق المصادقة"
      });
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      res.status(500).json({ error: "فشل في إعداد المصادقة الثنائية" });
    }
  });

  app.post("/api/auth/2fa/verify-setup", async (req, res) => {
    try {
      let userId = (req.session as any)?.userId;
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);
          const user = await storage.getUserByAuthToken(token);
          if (user) userId = user.id;
        }
      }
      
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "رمز التحقق مطلوب" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ error: "يرجى إعداد المصادقة الثنائية أولاً" });
      }

      const { authenticator } = await import("otplib");
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
      
      if (!isValid) {
        return res.status(400).json({ error: "رمز التحقق غير صحيح" });
      }

      // Enable 2FA
      await storage.updateUser(userId, { twoFactorEnabled: true } as any);
      
      res.json({ success: true, message: "تم تفعيل المصادقة الثنائية بنجاح" });
    } catch (error) {
      console.error("Error verifying 2FA setup:", error);
      res.status(500).json({ error: "فشل في التحقق من رمز المصادقة" });
    }
  });

  app.post("/api/auth/2fa/disable", async (req, res) => {
    try {
      let userId = (req.session as any)?.userId;
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);
          const user = await storage.getUserByAuthToken(token);
          if (user) userId = user.id;
        }
      }
      
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { code, password } = req.body;
      if (!code || !password) {
        return res.status(400).json({ error: "رمز التحقق وكلمة المرور مطلوبان" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // Verify password
      if (!user.password) {
        return res.status(400).json({ error: "لا يمكن إيقاف المصادقة الثنائية لهذا الحساب" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "كلمة المرور غير صحيحة" });
      }

      // Verify 2FA code
      if (user.twoFactorSecret) {
        const { authenticator } = await import("otplib");
        const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
        if (!isValid) {
          return res.status(400).json({ error: "رمز التحقق غير صحيح" });
        }
      }

      // Disable 2FA
      await storage.updateUser(userId, { 
        twoFactorEnabled: false,
        twoFactorSecret: null 
      } as any);
      
      res.json({ success: true, message: "تم إيقاف المصادقة الثنائية" });
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      res.status(500).json({ error: "فشل في إيقاف المصادقة الثنائية" });
    }
  });

  app.post("/api/auth/2fa/verify", async (req, res) => {
    try {
      const { phone, code, pendingToken } = req.body;
      
      if (!phone || !code || !pendingToken) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      const user = await storage.getUserByPhone(phone);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ error: "المستخدم غير موجود" });
      }

      // Verify the pending token matches
      if (user.authToken !== pendingToken) {
        return res.status(400).json({ error: "جلسة تسجيل الدخول غير صالحة" });
      }

      const { authenticator } = await import("otplib");
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
      
      if (!isValid) {
        return res.status(400).json({ error: "رمز التحقق غير صحيح" });
      }

      // Generate a new auth token
      const crypto = await import("crypto");
      const authToken = crypto.randomBytes(32).toString("hex");
      await storage.updateUser(user.id, { 
        authToken,
        lastLoginAt: new Date()
      } as any);

      // Set session
      (req.session as any).userId = user.id;

      res.json({ 
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        sellerApproved: user.sellerApproved,
        isAdmin: user.isAdmin,
        accountCode: user.accountCode,
        avatar: user.avatar,
        authToken,
      });
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      res.status(500).json({ error: "فشل في التحقق من رمز المصادقة" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    let userId = (req.session as any)?.userId;
    
    // Safari/ITP fallback: check Authorization header for token
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const user = await storage.getUserByAuthToken(token);
        if (user) {
          userId = user.id;
        }
      }
    }
    
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "المستخدم غير موجود" });
    }

    res.json({
      id: user.id,
      phone: user.phone,
      displayName: user.displayName,
      sellerApproved: user.sellerApproved,
      sellerRequestStatus: user.sellerRequestStatus,
      isAdmin: user.isAdmin,
      accountCode: user.accountCode,
      avatar: user.avatar,
      isVerified: user.isVerified,
      isBanned: user.isBanned,
    });
  });

  // Account Management Routes

  // Get full profile (for account settings)
  app.get("/api/account/profile", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "المستخدم غير موجود" });
    }

    res.json({
      id: user.id,
      phone: user.phone,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      city: user.city,
      district: user.district,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      sellerApproved: user.sellerApproved,
      sellerRequestStatus: user.sellerRequestStatus,
      isAdmin: user.isAdmin,
      accountCode: user.accountCode,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      rating: user.rating,
      ratingCount: user.ratingCount,
      totalSales: user.totalSales,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      ageBracket: user.ageBracket,
      interests: user.interests,
      surveyCompleted: user.surveyCompleted,
    });
  });

  // Update profile
  app.put("/api/account/profile", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const allowedFields = ["displayName", "phone", "city", "district", "addressLine1", "addressLine2", "ageBracket", "interests", "surveyCompleted", "avatar"];
      const updates: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "لم يتم تقديم أي حقول للتحديث" });
      }

      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // If avatar was updated, ensure it has a public ACL policy
      if (req.body.avatar) {
        try {
          const objectStorageService = new ObjectStorageService();
          await objectStorageService.trySetObjectEntityAclPolicy(req.body.avatar, {
            owner: userId,
            visibility: "public",
          });
        } catch (err) {
          console.error("Failed to set avatar ACL:", err);
          // Don't fail the request if ACL setting fails, but log it
        }
      }

      res.json({
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        city: user.city,
        district: user.district,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        ageBracket: user.ageBracket,
        interests: user.interests,
        surveyCompleted: user.surveyCompleted,
        avatar: user.avatar,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "فشل في تحديث الملف الشخصي" });
    }
  });

  // Change password
  app.post("/api/account/password", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "كلمة المرور الحالية والجديدة مطلوبتان" });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({ error: "كلمة المرور الجديدة قصيرة جداً" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(400).json({ error: "لا يمكن تغيير كلمة المرور لهذا الحساب" });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { password: hashedPassword } as any);

      res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "فشل في تغيير كلمة المرور" });
    }
  });

  // Get buyer addresses
  app.get("/api/account/addresses", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const addresses = await storage.getBuyerAddresses(userId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      res.status(500).json({ error: "فشل في جلب العناوين" });
    }
  });

  // Create buyer address
  app.post("/api/account/addresses", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const addressData = {
        ...req.body,
        userId,
      };
      const validatedData = insertBuyerAddressSchema.parse(addressData);
      const address = await storage.createBuyerAddress(validatedData);
      res.status(201).json(address);
    } catch (error) {
      console.error("Error creating address:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "بيانات العنوان غير صحيحة", details: error.errors });
      }
      res.status(500).json({ error: "فشل في إضافة العنوان" });
    }
  });

  // Update buyer address
  app.put("/api/account/addresses/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const addresses = await storage.getBuyerAddresses(userId);
      const addressOwned = addresses.some(a => a.id === req.params.id);
      if (!addressOwned) {
        return res.status(403).json({ error: "لا يمكنك تعديل هذا العنوان" });
      }

      const address = await storage.updateBuyerAddress(req.params.id, req.body);
      if (!address) {
        return res.status(404).json({ error: "العنوان غير موجود" });
      }
      res.json(address);
    } catch (error) {
      console.error("Error updating address:", error);
      res.status(500).json({ error: "فشل في تحديث العنوان" });
    }
  });

  // Delete buyer address
  app.delete("/api/account/addresses/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const addresses = await storage.getBuyerAddresses(userId);
      const addressOwned = addresses.some(a => a.id === req.params.id);
      if (!addressOwned) {
        return res.status(403).json({ error: "لا يمكنك حذف هذا العنوان" });
      }

      const success = await storage.deleteBuyerAddress(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "العنوان غير موجود" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting address:", error);
      res.status(500).json({ error: "فشل في حذف العنوان" });
    }
  });

  // Set default address
  app.post("/api/account/addresses/:id/default", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const success = await storage.setDefaultAddress(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "العنوان غير موجود" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting default address:", error);
      res.status(500).json({ error: "فشل في تعيين العنوان الافتراضي" });
    }
  });

  // Get buyer purchases (transactions where user is the buyer ONLY)
  app.get("/api/account/purchases", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      // Use optimized method with JOINs to avoid N+1 queries
      const purchases = await storage.getPurchasesWithDetails(userId);
      
      // Get all reviews by this buyer to mark which purchases have reviews
      const buyerReviews = await storage.getReviewsByBuyer(userId);
      const reviewedListingIds = new Set(buyerReviews.map(r => r.listingId));
      
      // Add hasReview flag to each purchase
      const purchasesWithReviewStatus = purchases.map(purchase => ({
        ...purchase,
        hasReview: reviewedListingIds.has(purchase.listingId),
      }));
      
      res.json(purchasesWithReviewStatus);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ error: "فشل في جلب المشتريات" });
    }
  });

  // Get seller orders (transactions where user is the seller ONLY)
  app.get("/api/account/seller-orders", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user || !user.sellerApproved) {
        return res.status(403).json({ error: "هذه الميزة متاحة للبائعين المعتمدين فقط" });
      }

      // Use dedicated method that queries ONLY sales where user is seller
      const sellerOrders = await storage.getSalesForSeller(userId);
      
      // Enrich with listing and buyer details
      const enrichedOrders = await Promise.all(
        sellerOrders.map(async (order) => {
          const listing = await storage.getListing(order.listingId);
          const buyer = await storage.getUser(order.buyerId);
          return {
            ...order,
            listing: listing ? {
              id: listing.id,
              title: listing.title,
              price: listing.price,
              images: listing.images,
              productCode: listing.productCode,
            } : undefined,
            buyer: buyer ? {
              id: buyer.id,
              name: buyer.displayName,
              phone: buyer.phone,
              city: buyer.city,
              district: buyer.district,
              address: buyer.addressLine1,
            } : undefined,
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching seller orders:", error);
      res.status(500).json({ error: "فشل في جلب الطلبات" });
    }
  });

  // Get seller summary (stats)
  app.get("/api/account/seller-summary", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user || !user.sellerApproved) {
        return res.status(403).json({ error: "هذه الميزة متاحة للبائعين المعتمدين فقط" });
      }

      const summary = await storage.getSellerSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching seller summary:", error);
      res.status(500).json({ error: "فشل في جلب بيانات البائع" });
    }
  });

  // Get buyer summary (stats) - ONLY purchases where user is buyer
  app.get("/api/account/buyer-summary", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      // Use dedicated method that queries ONLY purchases where user is buyer
      const purchases = await storage.getPurchasesForBuyer(userId);
      const watchlistItems = await storage.getWatchlist(userId);
      const offers = await storage.getOffersByBuyer(userId);
      
      const pendingOrders = purchases.filter(p => 
        p.status === "pending" || p.status === "processing" || p.status === "in_transit"
      ).length;
      const completedOrders = purchases.filter(p => p.status === "completed" || p.status === "delivered").length;
      const totalSpent = purchases
        .filter(p => p.status === "completed" || p.status === "delivered")
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      res.json({
        totalPurchases: purchases.length,
        pendingOrders,
        completedOrders,
        totalSpent,
        wishlistItems: watchlistItems.length,
        activeOffers: offers.filter(o => o.status === "pending").length,
      });
    } catch (error) {
      console.error("Error fetching buyer summary:", error);
      res.status(500).json({ error: "فشل في جلب بيانات المشتري" });
    }
  });

  // Cart routes
  app.get("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const items = await storage.getCartItems(userId);
      // Enrich cart items with listing data
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const listing = await storage.getListing(item.listingId);
        return {
          ...item,
          listing: listing ? {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            images: listing.images,
            saleType: listing.saleType,
            quantityAvailable: listing.quantityAvailable,
            isActive: listing.isActive,
            sellerId: listing.sellerId,
            sellerName: listing.sellerName,
          } : null
        };
      }));
      res.json(enrichedItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ error: "فشل في جلب سلة التسوق" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      // Check if user is banned
      const user = await storage.getUser(userId);
      if (user?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
      }

      const { listingId, quantity = 1 } = req.body;
      if (!listingId) {
        return res.status(400).json({ error: "معرف المنتج مطلوب" });
      }

      // Get listing to verify it exists and get price
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Prevent sellers from adding their own products to cart
      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك إضافة منتجك الخاص للسلة" });
      }
      
      if (!listing.isActive) {
        return res.status(400).json({ error: "هذا المنتج غير متاح حالياً" });
      }
      
      if (listing.saleType === "auction") {
        return res.status(400).json({ error: "لا يمكن إضافة منتجات المزاد إلى السلة" });
      }

      const item = await storage.addToCart({
        userId,
        listingId,
        quantity,
        priceSnapshot: listing.price,
      });
      
      res.json(item);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ error: "فشل في إضافة المنتج للسلة" });
    }
  });

  app.patch("/api/cart/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { id } = req.params;
      const { quantity } = req.body;
      
      if (typeof quantity !== "number" || quantity < 0) {
        return res.status(400).json({ error: "الكمية غير صالحة" });
      }

      const updated = await storage.updateCartItemQuantity(id, quantity);
      if (!updated && quantity > 0) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }
      
      res.json(updated || { deleted: true });
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ error: "فشل في تحديث السلة" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { id } = req.params;
      const deleted = await storage.removeFromCart(id);
      if (!deleted) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ error: "فشل في حذف العنصر من السلة" });
    }
  });

  app.delete("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      await storage.clearCart(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ error: "فشل في إفراغ السلة" });
    }
  });

  // ===== CHECKOUT API =====
  app.post("/api/checkout", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لإتمام الشراء" });
    }

    try {
      // Check if user is banned
      const buyer = await storage.getUser(userId);
      if (buyer?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
      }

      const { fullName, phone, city, addressLine1, addressLine2 } = req.body;
      
      if (!fullName || !phone || !city || !addressLine1) {
        return res.status(400).json({ error: "جميع الحقول المطلوبة يجب ملؤها" });
      }

      // Get cart items
      const cartItems = await storage.getCartItems(userId);
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "سلة التسوق فارغة" });
      }

      // Process each cart item into a transaction
      const transactions = [];
      for (const item of cartItems) {
        const listing = await storage.getListing(item.listingId);
        if (!listing) {
          continue; // Skip unavailable listings
        }

        // Check availability
        const availableQuantity = (listing.quantityAvailable || 1) - (listing.quantitySold || 0);
        if (availableQuantity < item.quantity) {
          return res.status(400).json({ 
            error: `الكمية المطلوبة من "${listing.title}" غير متوفرة. المتبقي: ${availableQuantity}` 
          });
        }

        // Prevent sellers from buying their own products
        if (listing.sellerId === userId) {
          return res.status(400).json({ error: "لا يمكنك شراء منتجك الخاص" });
        }

        // Build delivery address string
        const deliveryAddress = `الاسم: ${fullName}\nالهاتف: ${phone}\nالمدينة: ${city}\nالعنوان: ${addressLine1}${addressLine2 ? '\n' + addressLine2 : ''}`;

        // Create transaction
        const transaction = await storage.createTransaction({
          listingId: item.listingId,
          sellerId: listing.sellerId || "",
          buyerId: userId,
          amount: item.priceSnapshot * item.quantity,
          status: "pending",
          paymentMethod: "cash",
          deliveryAddress,
        });
        transactions.push(transaction);

        // Update listing quantitySold
        const newQuantitySold = (listing.quantitySold || 0) + item.quantity;
        await storage.updateListing(item.listingId, {
          quantitySold: newQuantitySold,
          isActive: newQuantitySold < (listing.quantityAvailable || 1),
        });

        // Notify seller via message system
        if (listing.sellerId) {
          try {
            await storage.sendMessage({
              senderId: userId,
              receiverId: listing.sellerId,
              content: `🛒 طلب جديد! تم شراء "${listing.title}" بقيمة ${(item.priceSnapshot * item.quantity).toLocaleString()} د.ع.\n\nبيانات التوصيل:\n${deliveryAddress}`,
              listingId: item.listingId,
            });
          } catch (msgError) {
            console.error("Error sending sale notification:", msgError);
          }
        }
      }

      // Update user's address info
      await storage.updateUser(userId, {
        displayName: fullName,
        phone,
        city,
        addressLine1,
        addressLine2: addressLine2 || null,
      });

      // Clear cart after successful checkout
      await storage.clearCart(userId);

      res.json({ success: true, transactions });
    } catch (error) {
      console.error("Error during checkout:", error);
      res.status(500).json({ error: "فشل في إتمام الطلب" });
    }
  });

  // ===== OFFERS API =====
  
  // Create a new offer
  app.post("/api/offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لتقديم عرض" });
    }

    try {
      // Check if user is banned
      const buyer = await storage.getUser(userId);
      if (buyer?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك تقديم عروض." });
      }

      const { listingId, offerAmount, message } = req.body;
      
      if (!listingId || !offerAmount) {
        return res.status(400).json({ error: "بيانات العرض غير مكتملة" });
      }
      
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Prevent sellers from making offers on their own products
      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك تقديم عرض على منتجك الخاص" });
      }
      
      if (!listing.isNegotiable) {
        return res.status(400).json({ error: "هذا المنتج لا يقبل التفاوض" });
      }
      
      if (!listing.sellerId) {
        return res.status(400).json({ error: "لا يمكن إرسال عرض لهذا المنتج" });
      }

      const offer = await storage.createOffer({
        listingId,
        buyerId: userId,
        sellerId: listing.sellerId,
        offerAmount: parseInt(offerAmount, 10),
        message: message || null,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours expiry
      });
      
      res.status(201).json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ error: "فشل في إنشاء العرض" });
    }
  });

  // Get offers for a listing (seller view)
  app.get("/api/listings/:id/offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Only seller can see all offers for their listing
      if (listing.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بعرض هذه العروض" });
      }

      const offers = await storage.getOffersForListing(req.params.id);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ error: "فشل في جلب العروض" });
    }
  });

  // Get my offers (buyer view)
  app.get("/api/my-offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const offers = await storage.getOffersByBuyer(userId);
      
      // Enrich offers with listing details
      const enrichedOffers = await Promise.all(
        offers.map(async (offer) => {
          const listing = await storage.getListing(offer.listingId);
          return {
            ...offer,
            listing: listing ? {
              id: listing.id,
              title: listing.title,
              price: listing.price,
              images: listing.images,
              sellerName: listing.sellerName,
            } : undefined,
          };
        })
      );
      
      res.json(enrichedOffers);
    } catch (error) {
      console.error("Error fetching my offers:", error);
      res.status(500).json({ error: "فشل في جلب عروضي" });
    }
  });

  // Get offers received (seller view)
  app.get("/api/received-offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const offers = await storage.getOffersBySeller(userId);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching received offers:", error);
      res.status(500).json({ error: "فشل في جلب العروض المستلمة" });
    }
  });

  // Respond to an offer (accept/reject/counter)
  app.patch("/api/offers/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { status, counterAmount, counterMessage } = req.body;
      
      if (!["accepted", "rejected", "countered"].includes(status)) {
        return res.status(400).json({ error: "حالة العرض غير صالحة" });
      }
      
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "العرض غير موجود" });
      }
      
      if (offer.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بالرد على هذا العرض" });
      }
      
      if (offer.status !== "pending") {
        return res.status(400).json({ error: "تم الرد على هذا العرض مسبقاً" });
      }

      if (status === "countered" && !counterAmount) {
        return res.status(400).json({ error: "يجب تحديد السعر المقترح" });
      }

      const updated = await storage.updateOfferStatus(
        req.params.id, 
        status, 
        status === "countered" ? parseInt(counterAmount, 10) : undefined,
        counterMessage
      );
      
      // Get listing for notification message
      const listing = await storage.getListing(offer.listingId);
      const listingTitle = listing?.title || "منتج";
      
      // Send notification to buyer based on offer status
      if (status === "accepted") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_accepted",
          title: "تم قبول عرضك! 🎉",
          message: `تم قبول عرضك على "${listingTitle}" بقيمة ${offer.offerAmount.toLocaleString()} د.ع`,
          relatedId: offer.listingId,
        });
        
        // Create transaction record
        const transaction = await storage.createTransaction({
          listingId: offer.listingId,
          sellerId: offer.sellerId,
          buyerId: offer.buyerId,
          amount: offer.offerAmount,
          status: "pending",
          paymentMethod: "cash",
          deliveryStatus: "pending",
        });
        
        // Update listing quantitySold and mark as inactive if sold out
        if (listing) {
          const newQuantitySold = (listing.quantitySold || 0) + 1;
          const isSoldOut = newQuantitySold >= (listing.quantityAvailable || 1);
          await storage.updateListing(offer.listingId, {
            quantitySold: newQuantitySold,
            isActive: !isSoldOut,
          });
        }
        
        console.log("Transaction created for accepted offer:", transaction.id);
      } else if (status === "rejected") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_rejected",
          title: "تم رفض عرضك",
          message: `للأسف، رفض البائع عرضك على "${listingTitle}"`,
          relatedId: offer.listingId,
        });
      } else if (status === "countered") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_countered",
          title: "عرض مضاد من البائع! 💬",
          message: `البائع أرسل عرضاً مضاداً على "${listingTitle}" بقيمة ${counterAmount?.toLocaleString()} د.ع`,
          relatedId: offer.listingId,
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ error: "فشل في تحديث العرض" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const notificationsList = await storage.getNotifications(userId);
      res.json(notificationsList);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ count: 0 });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const success = await storage.markNotificationAsRead(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const success = await storage.markAllNotificationsAsRead(userId);
      res.json({ success });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // Push notifications - get VAPID public key
  app.get("/api/push/vapid-public-key", (_req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({ error: "VAPID key not configured" });
    }
    res.json({ publicKey });
  });

  // Push notifications - subscribe
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }
      
      await storage.createPushSubscription(userId, endpoint, keys.p256dh, keys.auth);
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating push subscription:", error);
      res.status(500).json({ error: "Failed to create push subscription" });
    }
  });

  // Push notifications - unsubscribe
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint required" });
      }
      
      await storage.deletePushSubscription(endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // User bids with listing info
  app.get("/api/account/my-bids", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const userBids = await storage.getUserBidsWithListings(userId);
      res.json(userBids);
    } catch (error) {
      console.error("Error fetching user bids:", error);
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  // Reports - Create new report
  app.post("/api/reports", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول للإبلاغ" });
      }
      
      const { reportType, targetId, targetType, reason, details } = req.body;
      
      if (!reportType || !targetId || !targetType || !reason) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (targetType === "listing") {
        const alreadyReported = await storage.hasUserReportedListing(userId, targetId);
        if (alreadyReported) {
          return res.status(400).json({ error: "لقد قمت بالإبلاغ عن هذا المنتج مسبقاً" });
        }
      }
      
      const report = await storage.createReport({
        reporterId: userId,
        reportType,
        targetId,
        targetType,
        reason,
        details: details || null,
      });
      
      if (targetType === "listing") {
        const reportCount = await storage.getReportCountForListing(targetId);
        
        if (reportCount >= 10) {
          const listing = await storage.getListing(targetId);
          if (listing?.sellerId) {
            await storage.createNotification({
              userId: listing.sellerId,
              type: "warning",
              title: "بلاغات على منتجك",
              message: `تم استلام عدد كبير من البلاغات على منتجك "${listing.title}". سيتم مراجعته من قبل الإدارة.`,
              linkUrl: `/product/${targetId}`,
            });
          }
        }
      }
      
      res.status(201).json({ success: true, message: "تم إرسال البلاغ بنجاح" });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  // Check if user has reported a listing
  app.get("/api/reports/check/:listingId", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ hasReported: false });
      }
      
      const hasReported = await storage.hasUserReportedListing(userId, req.params.listingId);
      res.json({ hasReported });
    } catch (error) {
      console.error("Error checking report status:", error);
      res.json({ hasReported: false });
    }
  });

  // Get user's reports
  app.get("/api/reports/my-reports", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const reports = await storage.getReportsByUser(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Seller approval request endpoint
  app.post("/api/seller-request", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      
      if (user.sellerApproved) {
        return res.status(400).json({ error: "أنت بائع معتمد بالفعل" });
      }
      
      if (user.sellerRequestStatus === "pending") {
        return res.status(400).json({ error: "لديك طلب قيد المراجعة بالفعل" });
      }

      const { shopName, phone, city, description } = req.body;

      const updateData: any = {
        sellerRequestStatus: "pending",
      };

      if (shopName) updateData.displayName = shopName;
      if (phone) updateData.phone = phone;
      if (city) updateData.city = city;
      
      await storage.updateUser(userId, updateData);
      await storage.updateUserStatus(userId, { sellerRequestStatus: "pending" });
      
      res.json({ success: true, message: "تم تقديم طلب البيع بنجاح" });
    } catch (error) {
      console.error("Error submitting seller request:", error);
      res.status(500).json({ error: "فشل في تقديم الطلب" });
    }
  });

  // Admin: Get pending seller requests
  app.get("/api/admin/seller-requests", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const allUsers = await storage.getAllUsers();
      const pendingRequests = allUsers.filter(u => u.sellerRequestStatus === "pending");
      res.json(pendingRequests);
    } catch (error) {
      console.error("Error fetching seller requests:", error);
      res.status(500).json({ error: "Failed to fetch seller requests" });
    }
  });

  // Admin: Approve or reject seller request
  app.put("/api/admin/seller-requests/:userId", async (req, res) => {
    try {
      const adminUserId = await getUserIdFromRequest(req);
      if (!adminUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const admin = await storage.getUser(adminUserId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { action } = req.body;
      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }
      
      const targetUserId = req.params.userId;
      const updated = await storage.updateUserStatus(targetUserId, {
        sellerApproved: action === "approve",
        sellerRequestStatus: action === "approve" ? "approved" : "rejected",
      });
      
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error("Error processing seller request:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Admin endpoints
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/reports", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      // Use the new method that includes full details
      const allReports = await storage.getAllReportsWithDetails();
      res.json(allReports);
    } catch (error) {
      console.error("Error fetching admin reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.put("/api/admin/reports/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { status, adminNotes } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      const updated = await storage.updateReportStatus(req.params.id, status, adminNotes, userId);
      if (!updated) {
        return res.status(404).json({ error: "Report not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: "Failed to update report" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { sellerApproved, isVerified, isBanned, sellerRequestStatus, isAuthenticated, authenticityGuaranteed } = req.body;
      const updated = await storage.updateUserStatus(req.params.id, { sellerApproved, isVerified, isBanned, sellerRequestStatus, isAuthenticated, authenticityGuaranteed });
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Admin: Reset user password
  app.post("/api/admin/users/:id/reset-password", async (req, res) => {
    try {
      const adminId = await getUserIdFromRequest(req);
      if (!adminId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Generate a random 8-character temporary password
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let tempPassword = "";
      for (let i = 0; i < 8; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Hash the new password
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Update user's password
      await storage.updateUser(req.params.id, { password: hashedPassword });
      
      res.json({ 
        success: true, 
        tempPassword,
        message: "تم إعادة تعيين كلمة المرور بنجاح" 
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Admin: Get all listings (lightweight version without images for fast loading)
  app.get("/api/admin/listings", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const listings = await storage.getListings();
      // Return listings with thumbnail for admin management
      const adminListings = listings.map(l => ({
        id: l.id,
        productCode: l.productCode,
        title: l.title,
        price: l.price,
        category: l.category,
        saleType: l.saleType,
        sellerName: l.sellerName,
        sellerId: l.sellerId,
        city: l.city,
        isActive: l.isActive,
        isPaused: l.isPaused,
        isFeatured: l.isFeatured || false,
        createdAt: l.createdAt,
        currentBid: l.currentBid,
        totalBids: l.totalBids,
        image: l.images?.[0] || "",
        views: l.views || 0,
      }));
      res.json(adminListings);
    } catch (error) {
      console.error("Error fetching admin listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // Admin: Update listing status (pause/activate/deactivate)
  app.put("/api/admin/listings/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { isActive, isPaused } = req.body;
      const updates: { isActive?: boolean; isPaused?: boolean } = {};
      if (typeof isActive === "boolean") updates.isActive = isActive;
      if (typeof isPaused === "boolean") updates.isPaused = isPaused;
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid updates provided" });
      }
      
      const updated = await storage.updateListing(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(500).json({ error: "Failed to update listing" });
    }
  });

  // Admin: Delete listing
  app.delete("/api/admin/listings/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const deleted = await storage.deleteListing(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: "Failed to delete listing" });
    }
  });

  // Admin: Promote/unpromote listing to hero banner
  app.post("/api/admin/listings/:id/feature", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { isFeatured, featuredOrder } = req.body;
      const updated = await storage.setListingFeatured(
        req.params.id,
        isFeatured !== false,
        typeof featuredOrder === "number" ? featuredOrder : 0
      );
      if (!updated) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error featuring listing:", error);
      res.status(500).json({ error: "Failed to feature listing" });
    }
  });

  // Admin: Get deleted listings (soft-deleted by sellers)
  app.get("/api/admin/listings/deleted", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const listings = await storage.getDeletedListings();
      const deletedListings = listings.map(l => ({
        id: l.id,
        productCode: l.productCode,
        title: l.title,
        price: l.price,
        category: l.category,
        saleType: l.saleType,
        sellerName: l.sellerName,
        sellerId: l.sellerId,
        city: l.city,
        deletedAt: l.deletedAt,
        createdAt: l.createdAt,
        image: l.images?.[0],
      }));
      res.json(deletedListings);
    } catch (error) {
      console.error("Error fetching deleted listings:", error);
      res.status(500).json({ error: "Failed to fetch deleted listings" });
    }
  });

  // Contact messages - public endpoint to submit
  app.post("/api/contact", async (req, res) => {
    try {
      const parsed = insertContactMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }
      const message = await storage.createContactMessage(parsed.data);
      res.status(201).json({ success: true, id: message.id });
    } catch (error) {
      console.error("Error creating contact message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Password reset request - public endpoint
  app.post("/api/password-reset-request", async (req, res) => {
    try {
      const { phone, email } = req.body;
      
      if (!phone || typeof phone !== "string" || !phone.trim()) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }
      
      // Create a contact message for the password reset request
      const message = await storage.createContactMessage({
        name: `طلب استعادة كلمة المرور - ${phone.trim()}`,
        email: email?.trim() || "no-email@ebey3.com",
        subject: "🔑 طلب إعادة تعيين كلمة المرور",
        message: `رقم الهاتف: ${phone.trim()}\n${email?.trim() ? `البريد الإلكتروني: ${email.trim()}` : "البريد الإلكتروني: غير مذكور"}\n\nيرجى إعادة تعيين كلمة المرور لهذا المستخدم.`,
      });
      
      console.log(`Password reset request submitted: phone=${phone.trim()}, email=${email?.trim() || 'none'}`);
      
      res.status(201).json({ success: true, id: message.id });
    } catch (error) {
      console.error("Error creating password reset request:", error);
      res.status(500).json({ error: "فشل في إرسال الطلب" });
    }
  });

  // Admin: Get all contact messages
  app.get("/api/admin/contact-messages", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const messages = await storage.getAllContactMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching contact messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Admin: Get unread contact message count
  app.get("/api/admin/contact-messages/unread-count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const count = await storage.getUnreadContactMessageCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // Admin: Mark contact message as read
  app.put("/api/admin/contact-messages/:id/read", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const success = await storage.markContactMessageAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  // Admin: Get seller cancellations
  app.get("/api/admin/cancellations", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const cancellations = await storage.getCancelledTransactions();
      
      // Enrich with seller and buyer info
      const enriched = await Promise.all(cancellations.map(async (tx) => {
        const seller = await storage.getUser(tx.sellerId);
        const buyer = tx.buyerId !== "guest" ? await storage.getUser(tx.buyerId) : null;
        const listing = await storage.getListing(tx.listingId);
        return {
          ...tx,
          sellerName: seller?.displayName || "بائع",
          buyerName: buyer?.displayName || "ضيف",
          listingTitle: listing?.title || "منتج محذوف",
        };
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching cancellations:", error);
      res.status(500).json({ error: "Failed to fetch cancellations" });
    }
  });

  // =====================================================
  // FINANCIAL SYSTEM ROUTES
  // =====================================================

  // Seller: Get wallet balance
  app.get("/api/wallet/balance", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.sellerApproved) {
        return res.status(403).json({ error: "Not a seller" });
      }
      
      const balance = await financialService.getWalletBalance(userId);
      const monthlyStats = await financialService.getMonthlyStats(userId);
      const nextPayoutDate = financialService.getNextPayoutDate();
      
      res.json({
        ...balance,
        freeSalesRemaining: monthlyStats ? 15 - monthlyStats.freeSalesUsed : 15,
        nextPayoutDate: nextPayoutDate.toISOString(),
        holdDays: financialService.getHoldDays(),
      });
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      res.status(500).json({ error: "Failed to fetch balance" });
    }
  });

  // Seller: Get wallet transactions
  app.get("/api/wallet/transactions", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.sellerApproved) {
        return res.status(403).json({ error: "Not a seller" });
      }
      
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const transactions = await financialService.getWalletTransactions(userId, limit, offset);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching wallet transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Seller: Get payout history
  app.get("/api/wallet/payouts", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.sellerApproved) {
        return res.status(403).json({ error: "Not a seller" });
      }
      
      const payouts = await financialService.getSellerPayouts(userId);
      res.json(payouts);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ error: "Failed to fetch payouts" });
    }
  });

  // Buyer: Get wallet balance
  app.get("/api/buyer/wallet/balance", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const balance = await financialService.getBuyerWalletBalance(userId);
      res.json(balance);
    } catch (error) {
      console.error("Error fetching buyer wallet balance:", error);
      res.status(500).json({ error: "Failed to fetch balance" });
    }
  });

  // Buyer: Get wallet transactions
  app.get("/api/buyer/wallet/transactions", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await financialService.getBuyerWalletTransactions(userId, limit, offset);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching buyer wallet transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Buyer: Get delivery tracking
  app.get("/api/delivery/track/:transactionId", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const tracking = await deliveryService.getDeliveryTracking(req.params.transactionId);
      if (!tracking) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      res.json(tracking);
    } catch (error) {
      console.error("Error fetching tracking:", error);
      res.status(500).json({ error: "Failed to fetch tracking" });
    }
  });

  // Buyer: Confirm delivery acceptance
  app.post("/api/delivery/:transactionId/accept", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const success = await deliveryService.confirmDeliveryAcceptance(req.params.transactionId);
      if (!success) {
        return res.status(400).json({ error: "Cannot accept delivery at this time" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting delivery:", error);
      res.status(500).json({ error: "Failed to accept delivery" });
    }
  });

  // Webhook: Receive delivery status updates from delivery company
  app.post("/api/webhooks/delivery", async (req, res) => {
    try {
      const signature = req.headers["x-delivery-signature"] as string;
      
      // Validate webhook signature (in production)
      if (!deliveryApi.validateWebhookSignature(JSON.stringify(req.body), signature)) {
        return res.status(401).json({ error: "Invalid signature" });
      }
      
      const payload: DeliveryWebhookPayload = req.body;
      await deliveryService.processWebhook(payload);
      
      res.json({ received: true });
    } catch (error) {
      console.error("Error processing delivery webhook:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // Webhook: Receive driver cancellation from delivery company
  app.post("/api/webhooks/delivery/cancellation", async (req, res) => {
    try {
      const signature = req.headers["x-delivery-signature"] as string;
      
      if (!deliveryApi.validateWebhookSignature(JSON.stringify(req.body), signature)) {
        return res.status(401).json({ error: "Invalid signature" });
      }
      
      const { deliveryId, reason, driverNotes, latitude, longitude, timestamp } = req.body;
      
      if (!deliveryId || !reason) {
        return res.status(400).json({ error: "Missing required fields: deliveryId, reason" });
      }
      
      const success = await deliveryService.processCancellationWebhook({
        deliveryId,
        reason,
        driverNotes,
        latitude,
        longitude,
        timestamp: timestamp || new Date().toISOString(),
      });
      
      if (success) {
        res.json({ received: true, processed: true });
      } else {
        res.status(400).json({ received: true, processed: false, error: "Failed to process cancellation" });
      }
    } catch (error) {
      console.error("Error processing cancellation webhook:", error);
      res.status(500).json({ error: "Failed to process cancellation webhook" });
    }
  });

  // Get cancellation reasons (for delivery app)
  app.get("/api/delivery/cancellation-reasons", async (req, res) => {
    try {
      const reasons = deliveryService.getCancellationReasons();
      res.json(reasons);
    } catch (error) {
      console.error("Error fetching cancellation reasons:", error);
      res.status(500).json({ error: "Failed to fetch cancellation reasons" });
    }
  });

  // Admin: Get all pending payouts
  app.get("/api/admin/payouts", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const payouts = await financialService.getPendingPayouts();
      
      // Enrich with seller info
      const enriched = await Promise.all(payouts.map(async (payout) => {
        const seller = await storage.getUser(payout.sellerId);
        return {
          ...payout,
          sellerName: seller?.displayName || "بائع",
          sellerPhone: seller?.phone || "",
        };
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ error: "Failed to fetch payouts" });
    }
  });

  // Admin: Generate weekly payout report
  app.post("/api/admin/payouts/generate", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get the start of the current week (Sunday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      
      const summaries = await financialService.generateWeeklyPayoutReport(weekStart);
      
      // Create payout records for each seller
      const payouts = [];
      for (const summary of summaries) {
        if (summary.netPayout > 0) {
          const payout = await financialService.createWeeklyPayout(
            summary.sellerId,
            weekStart,
            summary
          );
          payouts.push(payout);
        }
      }
      
      res.json({ payoutsCreated: payouts.length, summaries });
    } catch (error) {
      console.error("Error generating payouts:", error);
      res.status(500).json({ error: "Failed to generate payouts" });
    }
  });

  // Admin: Mark payout as paid
  app.post("/api/admin/payouts/:id/pay", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { paymentMethod, paymentReference } = req.body;
      
      await financialService.markPayoutAsPaid(
        req.params.id,
        userId,
        paymentMethod || "cash",
        paymentReference
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking payout as paid:", error);
      res.status(500).json({ error: "Failed to update payout" });
    }
  });

  // Admin: Process hold period expiry (can be called manually or by cron)
  app.post("/api/admin/financial/process-holds", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const released = await financialService.processHoldPeriodExpiry();
      res.json({ releasedTransactions: released });
    } catch (error) {
      console.error("Error processing holds:", error);
      res.status(500).json({ error: "Failed to process holds" });
    }
  });

  // Admin: Adjust seller or buyer wallet balance
  app.post("/api/admin/wallet/adjust", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { targetUserId, accountType, amount, description } = req.body as {
        targetUserId?: string;
        accountType?: "seller" | "buyer";
        amount?: number;
        description?: string;
      };

      if (!targetUserId || !accountType || typeof amount !== "number") {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (accountType === "seller") {
        await financialService.createSellerWalletAdjustment(
          targetUserId,
          amount,
          description || "Admin adjustment"
        );
      } else if (accountType === "buyer") {
        await financialService.createBuyerWalletAdjustment(
          targetUserId,
          amount,
          description || "Admin adjustment"
        );
      } else {
        return res.status(400).json({ error: "Invalid account type" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error adjusting wallet:", error);
      res.status(500).json({ error: "Failed to adjust wallet" });
    }
  });

  // Create delivery order when transaction is confirmed
  app.post("/api/transactions/:id/create-delivery", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const deliveryOrder = await deliveryService.createDeliveryOrder(req.params.id);
      if (!deliveryOrder) {
        return res.status(400).json({ error: "Failed to create delivery order" });
      }
      
      res.json(deliveryOrder);
    } catch (error) {
      console.error("Error creating delivery:", error);
      res.status(500).json({ error: "Failed to create delivery" });
    }
  });

  return httpServer;
}
