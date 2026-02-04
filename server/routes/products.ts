import type { Express } from "express";
import { validateCsrfToken, generateCsrfToken } from "../middleware/csrf";
import { z } from "zod";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { insertListingSchema } from "@shared/schema";
import { storage } from "../storage";
import { analyzeImageForSearch } from "../services/gemini-image-search";
import { analyzeProductImage } from "../services/gemini-service";
import {
  BACKGROUND_TOO_COMPLEX_MESSAGE,
  cleanListingPhotoWithGemini,
  UNCLEAR_SUBJECT_TOKEN,
} from "../services/gemini-photo-cleanup";
import { ObjectNotFoundError, ObjectStorageService, objectStorageClient } from "../replit_integrations/object_storage/objectStorage";
import {
  getUserIdFromRequest,
  setCacheHeaders,
  formatPriceForOg,
  escapeSvgText,
  truncateText,
  buildBaseUrl,
  resolveAbsoluteUrl,
  fetchImageBuffer,
  parseCSVLine,
  updateListingSchema,
} from "./shared";

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const enhanceImageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 7 * 1024 * 1024 } });

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

const ENHANCE_ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;
const GENERIC_RETRYABLE_MESSAGE = "Image cleanup failed. Please try again.";

export function registerProductRoutes(app: Express): void {
  // Apply CSRF validation to product mutation routes (middleware already skips GET requests)
  app.use("/api/listings", validateCsrfToken);

  // OG Image generation for product sharing
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

  // List/search products
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
      console.log('[DEBUG-SERVER] API /api/listings request', { 
        category: typeof category === "string" ? category : undefined, 
        sellerId: sellerIdStr, 
        includeSoldRequested: includeSold === "true",
        hasSearchQuery: !!searchQuery,
        isOwnProfile,
        includeSoldFinal: (includeSold === "true" && !!searchQuery) || isOwnProfile, 
        searchQuery, 
        page: pageNum 
      });
      // #region agent log
      fetch('http://localhost:7242/ingest/005f27f0-13ae-4477-918f-9d14680f3cb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes.ts:/api/listings',message:'listings-request',data:{category:typeof category === "string" ? category : undefined,sellerId:sellerIdStr,includeSold:includeSold === "true" || isOwnProfile,searchQuery,page:pageNum,limit},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      const { listings: paginatedListings, total } = await storage.getListingsPaginated({
        limit,
        offset,
        category: typeof category === "string" ? category : undefined,
        saleTypes,
        sellerId: sellerIdStr,
        // Only include sold items if: (explicitly requested via filter AND has search query) OR viewing own profile
        // This prevents browsing all sold items without a search term
        includeSold: (includeSold === "true" && !!searchQuery) || isOwnProfile,
        searchQuery,
        minPrice: typeof minPrice === "string" ? parseInt(minPrice) : undefined,
        maxPrice: typeof maxPrice === "string" ? parseInt(maxPrice) : undefined,
        conditions,
        cities,
      });
      console.log('[DEBUG-SERVER] API /api/listings response', { listingsCount: paginatedListings.length, total });
      // #region agent log
      fetch('http://localhost:7242/ingest/005f27f0-13ae-4477-918f-9d14680f3cb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes.ts:/api/listings',message:'listings-response',data:{listingsCount:paginatedListings.length,total},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H7'})}).catch(()=>{});
      // #endregion
      
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
      
      // Get favorites count for all listings
      const listingIds = paginatedListings.map(l => l.id);
      const favoritesCounts = await storage.getWatchlistCountsForListings(listingIds);
      
      // Add favorites count to each listing
      const listingsWithFavorites = paginatedListings.map(listing => ({
        ...listing,
        favoritesCount: favoritesCounts.get(listing.id) || 0
      }));
      
      // Cache listing responses for 30 seconds to reduce repeat requests
      res.set("Cache-Control", setCacheHeaders(30));
      
      res.json({
        listings: listingsWithFavorites,
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

  // Get purchase status for a listing (check if current user has purchased)
  app.get("/api/listings/:id/purchase-status", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ hasPurchased: false });
      }
      
      const purchase = await storage.getUserTransactionForListing(userId, req.params.id);
      res.json({ hasPurchased: !!purchase });
    } catch (error) {
      console.error("Error checking purchase status:", error);
      res.json({ hasPurchased: false });
    }
  });

  // Get single product
  app.get("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      // #region agent log
      fetch('http://localhost:7242/ingest/005f27f0-13ae-4477-918f-9d14680f3cb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes.ts:/api/listings/:id',message:'listing-detail-fetch',data:{listingId:req.params.id,found:!!listing,isDeleted:listing?.isDeleted,isActive:listing?.isActive,quantitySold:listing?.quantitySold,quantityAvailable:listing?.quantityAvailable},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'H10'})}).catch(()=>{});
      // #endregion
      if (!listing || listing.isDeleted) {
        // #region agent log
        fetch('http://localhost:7242/ingest/005f27f0-13ae-4477-918f-9d14680f3cb3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes.ts:/api/listings/:id',message:'listing-detail-not-found',data:{listingId:req.params.id,found:!!listing,isDeleted:listing?.isDeleted},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'H11'})}).catch(()=>{});
        // #endregion
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
      
      // Get all bids for this listing to check user's bid status
      const listingBids = await storage.getBidsForListing(req.params.id);
      const hasBid = listingBids.some(bid => bid.userId === userId);
      
      // Find the highest bid to determine if user is the highest bidder
      let isHighest = false;
      if (listingBids.length > 0) {
        const highestBid = listingBids.reduce((max, bid) => 
          bid.amount > max.amount ? bid : max, listingBids[0]
        );
        isHighest = highestBid.userId === userId;
      }
      
      res.json({ hasBid, isHighest });
    } catch (error) {
      console.error("Error checking user bid status:", error);
      res.json({ hasBid: false, isHighest: false });
    }
  });

  // Create listing
  app.post("/api/listings", async (req, res) => {
    try {
      const sessionUserId = await getUserIdFromRequest(req);
      
      // Only allow sellers to create listings
      if (!sessionUserId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإضافة منتج" });
      }
      
      const user = await storage.getUser(sessionUserId);
      if (!user) {
        return res.status(403).json({ error: "المستخدم غير موجود" });
      }
      
      // Require phone verification to sell
      if (!user.phoneVerified) {
        return res.status(403).json({ 
          error: "يجب التحقق من رقم هاتفك أولاً لتتمكن من البيع",
          requiresPhoneVerification: true
        });
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
      
      // Validate reserve price for auctions
      if (req.body.saleType === "auction" && req.body.reservePrice) {
        const reservePrice = typeof req.body.reservePrice === "number" 
          ? req.body.reservePrice 
          : parseInt(req.body.reservePrice, 10);
        const startPrice = typeof req.body.price === "number" 
          ? req.body.price 
          : parseInt(req.body.price, 10);
        
        if (reservePrice < startPrice) {
          return res.status(400).json({ 
            error: "السعر الاحتياطي يجب أن يكون أكبر من أو يساوي سعر البداية" 
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
        reservePrice: req.body.reservePrice 
          ? (typeof req.body.reservePrice === "number" ? req.body.reservePrice : parseInt(req.body.reservePrice, 10))
          : null,
        buyNowPrice: req.body.buyNowPrice
          ? (typeof req.body.buyNowPrice === "number" ? req.body.buyNowPrice : parseInt(req.body.buyNowPrice, 10))
          : null,
        deliveryWindow: req.body.deliveryWindow,
        shippingType: req.body.shippingType || "seller_pays",
        shippingCost: typeof req.body.shippingCost === "number" 
          ? req.body.shippingCost 
          : parseInt(req.body.shippingCost, 10) || 0,
        returnPolicy: req.body.returnPolicy,
        returnDetails: req.body.returnDetails || null,
        sellerName: req.body.sellerName,
        sellerId: sessionUserId || req.body.sellerId || null,
        sellerPhone: req.body.sellerPhone || null,
        city: req.body.city || user.city,
        brand: req.body.brand || null,
        isNegotiable: req.body.isNegotiable === true,
        serialNumber: req.body.serialNumber || null,
        quantityAvailable: typeof req.body.quantityAvailable === "number" 
          ? req.body.quantityAvailable 
          : parseInt(req.body.quantityAvailable, 10) || 1,
        allowedBidderType: req.body.allowedBidderType || "verified_only",
        locationLat: req.body.locationLat ?? user.locationLat ?? null,
        locationLng: req.body.locationLng ?? user.locationLng ?? null,
        mapUrl: req.body.mapUrl ?? user.mapUrl ?? null,
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
      if (!user || !user.phoneVerified) {
        return res.status(403).json({ error: "يجب التحقق من رقم هاتفك" });
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
            allowedBidderType: "verified_only",
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

  // CSV Template Download
  app.get("/api/listings/csv-template", (req, res) => {
    const headers = "title,description,price,category,condition,city,brand,images,deliveryWindow,returnPolicy,isNegotiable,quantity";
    const exampleRow = '"ساعة روليكس أصلية","ساعة روليكس موديل 2020 بحالة ممتازة",500000,watches,excellent,بغداد,Rolex,"https://example.com/img1.jpg;https://example.com/img2.jpg","3-5 أيام","إرجاع خلال 7 أيام",true,1';
    const csvContent = `${headers}\n${exampleRow}`;
    
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=ebay_iraq_template.csv");
    res.send("\uFEFF" + csvContent); // BOM for Excel Arabic support
  });

  // AI-powered image analysis for product listing
  app.post("/api/analyze-image", imageUpload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
      }

      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          error: "Invalid image format. Only JPEG, PNG, and WebP are supported" 
        });
      }

      console.log(`[analyze-image] Processing image: ${req.file.mimetype}, ${(req.file.size / 1024).toFixed(1)}KB`);

      const analysis = await analyzeProductImage(req.file.buffer);

      console.log(`[analyze-image] Analysis complete: ${analysis.title} - ${analysis.category}`);

      res.json(analysis);
    } catch (error) {
      console.error("[analyze-image] Error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("GEMINI_API_KEY")) {
          return res.status(500).json({ 
            error: "Configuration error: API key not set" 
          });
        }
        return res.status(500).json({ 
          error: "Failed to analyze image",
          details: error.message 
        });
      }
      
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  async function enhanceImageCore(req: any, res: any) {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return res.status(500).json({ error: "Configuration error: API key not set" });
    }

    let inputBuffer: Buffer | null = null;
    let inputMimeType: string | null = null;
    let existingObjectPath: string | null = null;

    if (req.file?.buffer) {
      inputBuffer = req.file.buffer as Buffer;
      inputMimeType = String(req.file.mimetype || "").toLowerCase();
    } else if (typeof req.body?.imageUrl === "string") {
      const imageUrl = req.body.imageUrl.trim();
      if (!imageUrl.startsWith("/objects/uploads/")) {
        return res.status(400).json({ error: "Invalid image reference" });
      }

      existingObjectPath = imageUrl;
      try {
        const objectStorageService = new ObjectStorageService();
        const file = await objectStorageService.getObjectEntityFile(imageUrl);
        const [metadata] = await file.getMetadata();

        const contentType = String(metadata?.contentType || "").toLowerCase();
        if (!ENHANCE_ALLOWED_MIME_TYPES.includes(contentType as any)) {
          return res.status(400).json({ error: "Unsupported file type" });
        }

        const sizeBytes = typeof metadata?.size === "string" ? parseInt(metadata.size, 10) : Number(metadata?.size);
        if (Number.isFinite(sizeBytes) && sizeBytes > 7 * 1024 * 1024) {
          return res.status(413).json({ error: "File too large" });
        }

        const [downloaded] = await file.download();
        inputBuffer = downloaded;
        inputMimeType = contentType;
      } catch (error) {
        if (error instanceof ObjectNotFoundError) {
          return res.status(404).json({ error: "Image not found" });
        }
        console.error("[enhance-image] Failed to load image from storage:", error);
        return res.status(500).json({ error: "Failed to load image" });
      }
    } else {
      return res.status(400).json({ error: "Image input is required" });
    }

    if (!inputBuffer || !inputMimeType) {
      return res.status(400).json({ error: "Image input is required" });
    }

    if (!ENHANCE_ALLOWED_MIME_TYPES.includes(inputMimeType as any)) {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    if (inputBuffer.byteLength > 7 * 1024 * 1024) {
      return res.status(413).json({ error: "File too large" });
    }

    try {
      const result = await cleanListingPhotoWithGemini({
        apiKey,
        imageBuffer: inputBuffer,
        mimeType: inputMimeType,
      });

      if (result.kind === "unclear_subject") {
        return res.status(422).json({ error: BACKGROUND_TOO_COMPLEX_MESSAGE });
      }

      const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "";
      if (!privateObjectDir) {
        return res.status(500).json({ error: "Object storage not configured" });
      }

      const { bucketName, objectPrefix } = parsePrivateObjectDir(privateObjectDir);
      const bucket = objectStorageClient.bucket(bucketName);

      const mainId = randomUUID();
      const ext = extensionFromMimeType(result.mimeType);

      // Upload main exactly as Gemini returned it (preserve framing/resolution; no resize/rotate).
      const mainEntityId = `uploads/${mainId}.${ext}`;
      const mainObjectName = [objectPrefix, mainEntityId].filter(Boolean).join("/");
      const mainUrl = `/objects/${mainEntityId}`;

      await bucket.file(mainObjectName).save(result.imageBuffer, {
        contentType: result.mimeType,
        metadata: {
          processedAt: new Date().toISOString(),
          enhancedBy: "gemini",
        },
      });

      // Thumbnail only (does not affect main).
      const thumbEntityId = `uploads/${mainId}_thumb.webp`;
      const thumbObjectName = [objectPrefix, thumbEntityId].filter(Boolean).join("/");
      const thumbnailUrl = `/objects/${thumbEntityId}`;
      const thumbBuffer = await sharp(result.imageBuffer, { failOnError: false })
        .resize(400, 400, { fit: "cover", position: "center" })
        .webp({ quality: 70 })
        .toBuffer();

      await bucket.file(thumbObjectName).save(thumbBuffer, {
        contentType: "image/webp",
        metadata: {
          processedAt: new Date().toISOString(),
          enhancedBy: "gemini",
        },
      });

      // Best-effort delete old objects after successful upload.
      if (existingObjectPath) {
        const objectStorageService = new ObjectStorageService();
        await deleteObjectIfExists(objectStorageService, existingObjectPath);
        await deleteObjectIfExists(objectStorageService, thumbPathForObjectPath(existingObjectPath));
      }

      return res.status(200).json({ imageUrl: mainUrl, thumbnailUrl });
    } catch (error) {
      console.error("[enhance-image] Error:", error);
      if (error instanceof Error) {
        if (error.message.includes("GEMINI_API_KEY")) {
          return res.status(500).json({ error: "Configuration error: API key not set" });
        }
        if (error.message.includes(UNCLEAR_SUBJECT_TOKEN)) {
          return res.status(422).json({ error: BACKGROUND_TOO_COMPLEX_MESSAGE });
        }
      }
      return res.status(502).json({ error: GENERIC_RETRYABLE_MESSAGE });
    }
  }

  // POST /api/enhance-image (preferred, follows API conventions)
  app.post("/api/enhance-image", validateCsrfToken, (req, res) => {
    enhanceImageUpload.single("image")(req as any, res as any, async (err: any) => {
      if (err) {
        if (err?.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File too large" });
        }
        if (typeof err?.message === "string" && err.message.startsWith("Unsupported file type")) {
          return res.status(400).json({ error: "Unsupported file type" });
        }
        console.error("[enhance-image] Upload error:", err);
        return res.status(400).json({ error: "Invalid image upload" });
      }
      return enhanceImageCore(req, res);
    });
  });

  // POST /enhance-image (explicit requirement)
  app.post("/enhance-image", validateCsrfToken, (req, res) => {
    enhanceImageUpload.single("image")(req as any, res as any, async (err: any) => {
      if (err) {
        if (err?.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File too large" });
        }
        if (typeof err?.message === "string" && err.message.startsWith("Unsupported file type")) {
          return res.status(400).json({ error: "Unsupported file type" });
        }
        console.error("[enhance-image] Upload error:", err);
        return res.status(400).json({ error: "Invalid image upload" });
      }
      return enhanceImageCore(req, res);
    });
  });

  // Update listing
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
      
      // Handle reserve price for auctions
      if (req.body.reservePrice !== undefined) {
        if (req.body.reservePrice === null || req.body.reservePrice === "") {
          req.body.reservePrice = null;
        } else {
          req.body.reservePrice = typeof req.body.reservePrice === "number" 
            ? req.body.reservePrice 
            : parseInt(req.body.reservePrice, 10);
          if (isNaN(req.body.reservePrice)) {
            return res.status(400).json({ error: "Invalid reserve price value" });
          }
          
          // Validate reserve price is greater than or equal to start price
          const startPrice = req.body.price !== undefined 
            ? req.body.price 
            : existingListing.price;
          if (req.body.reservePrice < startPrice) {
            return res.status(400).json({ 
              error: "السعر الاحتياطي يجب أن يكون أكبر من أو يساوي سعر البداية" 
            });
          }
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

  // Delete listing
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
        allowedBidderType: originalListing.allowedBidderType || "verified_only",
      };

      const validatedData = insertListingSchema.parse(newListingData);
      const newListing = await storage.createListing(validatedData);
      
      res.status(201).json(newListing);
    } catch (error) {
      console.error("Error relisting item:", error);
      res.status(400).json({ error: "فشل في إعادة عرض المنتج", details: String(error) });
    }
  });

  // Get bids for a listing
  app.get("/api/listings/:id/bids", async (req, res) => {
    try {
      const bids = await storage.getBidsForListing(req.params.id);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  // Place a bid on a listing
  app.post("/api/listings/:id/bid", async (req: any, res) => {
    try {
      const listingId = req.params.id;
      const { amount } = req.body;

      // Get user from session, passport, or Authorization token
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول للمزايدة" });
      }

      // Get user to check phone verification
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "المستخدم غير موجود" });
      }

      if (!user.phoneVerified) {
        return res.status(403).json({ error: "يجب التحقق من رقم الهاتف للمزايدة" });
      }

      // Get the listing
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }

      // Check if user is trying to bid on their own listing
      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك المزايدة على منتجاتك" });
      }

      // Get existing bids to check highest bidder
      const existingBids = await storage.getBidsForListing(listingId);
      const highestBid = existingBids.length > 0 
        ? existingBids.reduce((max, bid) => bid.amount > max.amount ? bid : max, existingBids[0])
        : null;
      
      // Check if user is already the highest bidder
      if (highestBid && highestBid.userId === userId) {
        return res.status(400).json({ error: "أنت بالفعل صاحب أعلى مزايدة" });
      }

      // Check if listing is an auction
      if (listing.saleType !== "auction") {
        return res.status(400).json({ error: "هذا المنتج ليس مزاداً" });
      }

      // Check if listing is active
      if (!listing.isActive) {
        return res.status(400).json({ error: "هذا المزاد غير نشط" });
      }

      // Check if auction has ended
      if (listing.auctionEndTime && new Date(listing.auctionEndTime) < new Date()) {
        return res.status(400).json({ error: "انتهى وقت المزاد" });
      }

      // Validate bid amount
      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "مبلغ المزايدة غير صالح" });
      }

      const currentBid = listing.currentBid || listing.price;
      const minBid = currentBid + 1000; // Minimum increment of 1000 IQD

      if (amount < minBid) {
        return res.status(400).json({ 
          error: `الحد الأدنى للمزايدة هو ${minBid.toLocaleString()} د.ع` 
        });
      }

      // Check if bid meets or exceeds buyNowPrice - should use Buy Now instead
      const buyNowPrice = (listing as any).buyNowPrice;
      if (buyNowPrice && amount >= buyNowPrice) {
        return res.status(400).json({ 
          error: `مبلغ المزايدة يساوي أو يتجاوز سعر الشراء الفوري (${buyNowPrice.toLocaleString()} د.ع). استخدم خيار "اشتر الآن" بدلاً من ذلك.` 
        });
      }

      // Create the bid
      const bid = await storage.createBid({
        listingId,
        userId,
        amount,
      });

      // Send outbid notification to previous highest bidder
      if (highestBid && highestBid.userId !== userId) {
        try {
          const { getNotificationMessage } = await import("@shared/notification-messages");
          const { sendToUser } = await import("../websocket");
          
          const bidder = await storage.getUser(highestBid.userId);
          const lang = (bidder?.language || 'ar') as 'ar' | 'en' | 'ku';
          const msg = getNotificationMessage('outbid', lang, {
            title: listing.title,
            amount: amount
          });
          
          const notification = await storage.createNotification({
            userId: highestBid.userId,
            type: "outbid",
            title: msg.title,
            message: msg.body,
            data: JSON.stringify({
              listingId,
              listingTitle: listing.title,
              newBidAmount: amount,
              yourBidAmount: highestBid.amount,
            }),
            linkUrl: `/product/${listingId}`,
            relatedId: listingId,
          });
          
          // Send real-time WebSocket notification
          sendToUser(highestBid.userId, "NOTIFICATION", {
            notification: {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              linkUrl: notification.linkUrl,
            },
          });
          
          console.log(`[bid] Outbid notification sent to user ${highestBid.userId}`);
        } catch (notifError) {
          console.error("[bid] Failed to send outbid notification:", notifError);
        }
      }

      // Check if we need to extend the auction (anti-sniping)
      const now = new Date();
      const endTime = listing.auctionEndTime ? new Date(listing.auctionEndTime) : null;
      let newEndTime = endTime;
      
      if (endTime) {
        const timeRemaining = endTime.getTime() - now.getTime();
        const twoMinutes = 2 * 60 * 1000;
        
        if (timeRemaining < twoMinutes && timeRemaining > 0) {
          // Extend by 2 minutes from now
          newEndTime = new Date(now.getTime() + twoMinutes);
          await storage.updateListing(listingId, { 
            auctionEndTime: newEndTime 
          });
        }
      }

      // Get updated listing for response
      const updatedListing = await storage.getListing(listingId);

      // Broadcast via WebSocket if available
      const { broadcastBidUpdate, broadcastListingUpdate } = await import("../websocket");
      const auctionEndStr = newEndTime?.toISOString() || 
        (listing.auctionEndTime instanceof Date 
          ? listing.auctionEndTime.toISOString() 
          : listing.auctionEndTime || undefined);
      
      // Broadcast to users on the product page (subscribed to this listing)
      broadcastBidUpdate({
        type: "bid_update",
        listingId,
        currentBid: amount,
        totalBids: (updatedListing?.totalBids || 0),
        bidderId: userId,
        bidderName: user.displayName || "مستخدم",
        previousHighBidderId: highestBid?.userId || undefined,
        timestamp: new Date().toISOString(),
        auctionEndTime: auctionEndStr,
        timeExtended: newEndTime !== endTime,
      });
      
      // Broadcast to ALL users so they see consistent prices on home/search pages
      broadcastListingUpdate({
        listingId,
        currentBid: amount,
        totalBids: (updatedListing?.totalBids || 0),
      });

      // Milestone notifications for seller (5, 10, 20, 50 bids)
      const totalBids = updatedListing?.totalBids || 0;
      const milestones = [5, 10, 20, 50];
      if (milestones.includes(totalBids) && listing.sellerId) {
        try {
          await storage.createNotification({
            userId: listing.sellerId,
            type: "auction_milestone",
            title: `مزادك حقق ${totalBids} مزايدة!`,
            message: `منتجك "${listing.title}" وصل إلى ${totalBids} مزايدة. أعلى سعر حالياً: ${amount.toLocaleString()} د.ع`,
            linkUrl: `/product/${listingId}`,
            relatedId: listingId,
          });
          console.log(`[bid] Milestone notification (${totalBids} bids) sent to seller ${listing.sellerId}`);
        } catch (notifError) {
          console.error("[bid] Failed to send milestone notification:", notifError);
        }
      }

      console.log(`[bid] User ${userId} placed bid of ${amount} on listing ${listingId}`);

      res.json({
        success: true,
        bid,
        currentBid: amount,
        totalBids: updatedListing?.totalBids || 0,
        extended: newEndTime !== endTime,
        newEndTime: newEndTime?.toISOString(),
      });
    } catch (error) {
      console.error("Error placing bid:", error);
      res.status(500).json({ error: "فشل في تقديم المزايدة" });
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

  // AI-powered image search - analyze image and find matching products
  // Note: This route is separate from /api/listings, so we apply CSRF protection here
  app.post("/api/image-search", validateCsrfToken, async (req, res) => {
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
}

function parsePrivateObjectDir(privateObjectDir: string): { bucketName: string; objectPrefix: string } {
  const normalized = privateObjectDir.startsWith("/") ? privateObjectDir.slice(1) : privateObjectDir;
  const parts = normalized.split("/").filter(Boolean);
  const bucketName = parts[0] || "";
  const objectPrefix = parts.slice(1).join("/");
  if (!bucketName) {
    throw new Error("Invalid PRIVATE_OBJECT_DIR");
  }
  return { bucketName, objectPrefix };
}

async function deleteObjectIfExists(service: ObjectStorageService, objectPath: string): Promise<void> {
  try {
    const file = await service.getObjectEntityFile(objectPath);
    await file.delete();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      return;
    }
    // Best-effort delete: ignore errors but log for debugging.
    console.warn("[enhance-image] Failed to delete old object:", objectPath, error);
  }
}

function extensionFromMimeType(mimeType: string): "png" | "jpg" | "webp" {
  const mt = (mimeType || "").toLowerCase();
  if (mt === "image/webp") return "webp";
  if (mt === "image/jpeg" || mt === "image/jpg") return "jpg";
  return "png";
}

function thumbPathForObjectPath(objectPath: string): string {
  // e.g. /objects/uploads/abc.webp -> /objects/uploads/abc_thumb.webp
  const lastSlash = objectPath.lastIndexOf("/");
  const dir = lastSlash >= 0 ? objectPath.slice(0, lastSlash + 1) : "";
  const filename = lastSlash >= 0 ? objectPath.slice(lastSlash + 1) : objectPath;
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  return `${dir}${base}_thumb.webp`;
}
