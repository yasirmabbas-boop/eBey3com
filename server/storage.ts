import { 
  type User, type InsertUser, 
  type Listing, type InsertListing, 
  type Bid, type InsertBid,
  type Watchlist, type InsertWatchlist,
  type Analytics, type InsertAnalytics,
  type Message, type InsertMessage,
  type Review, type InsertReview,
  type Transaction, type InsertTransaction,
  type Category, type InsertCategory,
  type BuyerAddress, type InsertBuyerAddress,
  type CartItem, type InsertCartItem,
  type Notification, type InsertNotification,
  type Report, type InsertReport,
  type VerificationCode,
  type ReturnRequest, type InsertReturnRequest,
  type ContactMessage, type InsertContactMessage,
  type ProductComment, type InsertProductComment,
  type PushSubscription, type InsertPushSubscription,
  users, listings, bids, watchlist, analytics, messages, reviews, transactions, categories, buyerAddresses, cartItems, notifications, reports, verificationCodes, returnRequests, contactMessages, productComments, pushSubscriptions
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, lt, inArray, ne } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByAccountCode(accountCode: string): Promise<User | undefined>;
  getUserByAuthToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  
  getListings(): Promise<Listing[]>;
  getListingsPaginated(options: {
    limit: number;
    offset: number;
    category?: string;
    saleTypes?: string[];
    sellerId?: string;
    includeSold?: boolean;
    searchQuery?: string;
    minPrice?: number;
    maxPrice?: number;
    conditions?: string[];
    cities?: string[];
  }): Promise<{ listings: Listing[]; total: number }>;
  getSearchSuggestions(query: string, limit?: number): Promise<Array<{ term: string; category: string; type: "category" | "product" }>>;
  getListingsByCategory(category: string): Promise<Listing[]>;
  getListingsBySeller(sellerId: string): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  getDeletedListings(): Promise<Listing[]>;
  getPurchasesWithDetails(buyerId: string): Promise<any[]>;
  getUserBidsWithDetails(userId: string): Promise<any[]>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: string, listing: Partial<InsertListing> & { auctionEndTime?: Date | string | null; isActive?: boolean }): Promise<Listing | undefined>;
  deleteListing(id: string): Promise<boolean>;
  
  // Featured/Hero listings
  getFeaturedListings(): Promise<Listing[]>;
  getHotListings(limit?: number): Promise<Listing[]>;
  getHeroListings(limit?: number): Promise<Listing[]>;
  setListingFeatured(id: string, isFeatured: boolean, order?: number): Promise<Listing | undefined>;
  
  getBidsForListing(listingId: string): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  getHighestBid(listingId: string): Promise<Bid | undefined>;
  getUserBids(userId: string): Promise<Bid[]>;
  
  getWatchlist(userId: string): Promise<Watchlist[]>;
  getWatchlistListings(userId: string): Promise<Listing[]>;
  addToWatchlist(item: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(userId: string, listingId: string): Promise<boolean>;
  isInWatchlist(userId: string, listingId: string): Promise<boolean>;
  
  trackAnalytics(event: InsertAnalytics): Promise<Analytics>;
  getAnalyticsByUser(userId: string): Promise<Analytics[]>;
  getAnalyticsByListing(listingId: string): Promise<Analytics[]>;
  
  getMessages(userId: string): Promise<Message[]>;
  getConversation(userId1: string, userId2: string): Promise<Message[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<boolean>;
  
  getReviewsForSeller(sellerId: string): Promise<Review[]>;
  hasReviewForListing(reviewerId: string, listingId: string): Promise<boolean>;
  getReviewsByBuyer(buyerId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  getTransactionsForUser(userId: string): Promise<Transaction[]>;
  getPurchasesForBuyer(buyerId: string): Promise<Transaction[]>;
  getSalesForSeller(sellerId: string): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined>;
  updateTransactionWithIssue(id: string, data: { status: string; issueType: string; issueNote?: string }): Promise<Transaction | undefined>;
  rateBuyer(transactionId: string, rating: number, feedback?: string): Promise<Transaction | undefined>;
  cancelTransactionBySeller(id: string, reason: string): Promise<Transaction | undefined>;
  cancelTransactionByBuyer(id: string, reason: string): Promise<Transaction | undefined>;
  getCancelledTransactions(): Promise<Transaction[]>;
  
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Buyer addresses
  getBuyerAddresses(userId: string): Promise<BuyerAddress[]>;
  getBuyerAddressById(id: string): Promise<BuyerAddress | undefined>;
  createBuyerAddress(address: InsertBuyerAddress): Promise<BuyerAddress>;
  updateBuyerAddress(id: string, address: Partial<InsertBuyerAddress>): Promise<BuyerAddress | undefined>;
  deleteBuyerAddress(id: string): Promise<boolean>;
  setDefaultAddress(userId: string, addressId: string): Promise<boolean>;
  
  // Seller summary
  getSellerSummary(sellerId: string): Promise<{
    totalListings: number;
    activeListings: number;
    totalSales: number;
    totalRevenue: number;
    pendingShipments: number;
    averageRating: number;
    ratingCount: number;
  }>;
  
  // Cart operations
  getCartItems(userId: string): Promise<CartItem[]>;
  getCartItemWithListing(userId: string, listingId: string): Promise<CartItem | undefined>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(userId: string): Promise<boolean>;
  
  // View tracking
  incrementListingViews(listingId: string): Promise<number>;
  
  // Bid with user info
  getBidsWithUserInfo(listingId: string): Promise<Array<Bid & { bidderName: string; bidderAvatar?: string | null }>>;
  
  // User bids with listing info
  getUserBidsWithListings(userId: string): Promise<Array<Bid & { listing?: Listing }>>;
  
  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  
  // Reports
  createReport(report: InsertReport): Promise<Report>;
  getReportsByUser(userId: string): Promise<Report[]>;
  getReportById(id: string): Promise<Report | undefined>;
  hasUserReportedListing(userId: string, listingId: string): Promise<boolean>;
  getReportCountForListing(listingId: string): Promise<number>;
  getReportsForListing(listingId: string): Promise<Report[]>;
  
  // Admin functions
  getAllReports(): Promise<Report[]>;
  updateReportStatus(id: string, status: string, adminNotes?: string, resolvedBy?: string): Promise<Report | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserStatus(id: string, updates: { sellerApproved?: boolean; isVerified?: boolean; isBanned?: boolean; sellerRequestStatus?: string; isAuthenticated?: boolean; authenticityGuaranteed?: boolean }): Promise<User | undefined>;
  getAdminStats(): Promise<{ totalUsers: number; totalListings: number; activeListings: number; totalTransactions: number; pendingReports: number; totalRevenue: number }>;
  
  // Verification codes
  createVerificationCode(phone: string, code: string, type: string, expiresAt: Date): Promise<any>;
  getValidVerificationCode(phone: string, code: string, type: string): Promise<any | undefined>;
  markVerificationCodeUsed(id: string): Promise<boolean>;
  deleteExpiredVerificationCodes(): Promise<number>;
  
  // Return requests
  createReturnRequest(request: InsertReturnRequest): Promise<ReturnRequest>;
  getReturnRequestById(id: string): Promise<ReturnRequest | undefined>;
  getReturnRequestByTransaction(transactionId: string): Promise<ReturnRequest | undefined>;
  getReturnRequestsForBuyer(buyerId: string): Promise<ReturnRequest[]>;
  getReturnRequestsForSeller(sellerId: string): Promise<ReturnRequest[]>;
  updateReturnRequestStatus(id: string, status: string, sellerResponse?: string): Promise<ReturnRequest | undefined>;
  
  // Contact messages
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getAllContactMessages(): Promise<ContactMessage[]>;
  getContactMessageById(id: string): Promise<ContactMessage | undefined>;
  markContactMessageAsRead(id: string): Promise<boolean>;
  getUnreadContactMessageCount(): Promise<number>;
  
  // Product comments
  getCommentsForListing(listingId: string): Promise<Array<ProductComment & { userName: string; userAvatar?: string | null }>>;
  createComment(comment: InsertProductComment): Promise<ProductComment>;
  deleteComment(id: string, userId: string): Promise<boolean>;
  
  // Push subscriptions
  createPushSubscription(userId: string, endpoint: string, p256dh: string, auth: string): Promise<any>;
  getPushSubscription(userId: string): Promise<any | undefined>;
  getPushSubscriptionsByUserId(userId: string): Promise<any[]>;
  deletePushSubscription(endpoint: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async getUserByAccountCode(accountCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.accountCode, accountCode));
    return user;
  }

  async getUserByAuthToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.authToken, token));
    return user;
  }

  private async generateAccountCode(): Promise<string> {
    // Get highest account number to create sequential codes like EB-10001
    const result = await db.select({ accountCode: users.accountCode })
      .from(users)
      .where(sql`account_code LIKE 'EB-%'`)
      .orderBy(sql`CAST(SUBSTRING(account_code FROM 4) AS INTEGER) DESC`)
      .limit(1);
    
    let nextNumber = 10001; // Start from 10001
    if (result.length > 0 && result[0].accountCode) {
      const match = result[0].accountCode.match(/EB-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    return `EB-${nextNumber}`;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const accountCode = await this.generateAccountCode();
    const userWithCode = {
      ...insertUser,
      accountCode,
    };
    const [user] = await db.insert(users).values(userWithCode).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getListings(): Promise<Listing[]> {
    return db.select().from(listings).where(and(eq(listings.isActive, true), eq(listings.isDeleted, false))).orderBy(desc(listings.createdAt));
  }

  async getListingsPaginated(options: { 
    limit: number; 
    offset: number; 
    category?: string; 
    saleTypes?: string[]; 
    sellerId?: string; 
    includeSold?: boolean;
    searchQuery?: string;
    minPrice?: number;
    maxPrice?: number;
    conditions?: string[];
    cities?: string[];
  }): Promise<{ listings: Listing[]; total: number }> {
    const { limit, offset, category, saleTypes, sellerId, includeSold, searchQuery, minPrice, maxPrice, conditions: conditionFilters, cities } = options;
    
    // When fetching for a specific seller, show ALL their products (including ended auctions)
    // For public listing pages, only show active listings unless includeSold is true
    // Always filter out deleted items
    const conditions: any[] = [eq(listings.isDeleted, false)];
    if (!sellerId && !includeSold) {
      conditions.push(eq(listings.isActive, true));
    }
    if (category) conditions.push(eq(listings.category, category));
    if (saleTypes && saleTypes.length > 0) {
      conditions.push(inArray(listings.saleType, saleTypes));
    }
    if (sellerId) conditions.push(eq(listings.sellerId, sellerId));
    
    // Enhanced search with full-text search and fuzzy matching
    let searchRankSql = null;
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.trim();
      const searchTerm = `%${query.toLowerCase()}%`;
      
      // Use full-text search with tsvector for better performance and relevance
      // Combine with fuzzy matching for typo tolerance
      conditions.push(
        or(
          // Full-text search using tsvector (fastest, weighted by field importance)
          sql`${listings.searchVector} @@ plainto_tsquery('english', ${query})`,
          // Fuzzy matching on title using trigrams (handles typos)
          sql`similarity(${listings.title}, ${query}) > 0.3`,
          // Fuzzy matching on brand (critical for "watches" etc)
          sql`similarity(COALESCE(${listings.brand}, ''), ${query}) > 0.3`,
          // Fallback LIKE search for exact partial matches
          sql`LOWER(${listings.title}) LIKE ${searchTerm}`,
          sql`LOWER(COALESCE(${listings.brand}, '')) LIKE ${searchTerm}`,
          sql`LOWER(${listings.description}) LIKE ${searchTerm}`,
          sql`LOWER(${listings.category}) LIKE ${searchTerm}`,
          sql`LOWER(COALESCE(${listings.serialNumber}, '')) LIKE ${searchTerm}`,
          sql`LOWER(COALESCE(${listings.sku}, '')) LIKE ${searchTerm}`,
          sql`LOWER(COALESCE(${listings.productCode}, '')) LIKE ${searchTerm}`,
          sql`EXISTS (SELECT 1 FROM unnest(${listings.tags}) AS tag WHERE LOWER(tag) LIKE ${searchTerm})`
        )
      );
      
      // Calculate relevance score combining full-text rank and fuzzy similarity
      searchRankSql = sql`(
        ts_rank_cd(${listings.searchVector}, plainto_tsquery('english', ${query})) * 10 +
        similarity(${listings.title}, ${query}) * 5 +
        similarity(COALESCE(${listings.brand}, ''), ${query}) * 5
      )`;
    }
    
    // Price filters
    if (minPrice !== undefined && !isNaN(minPrice)) {
      conditions.push(sql`COALESCE(${listings.currentBid}, ${listings.price}) >= ${minPrice}`);
    }
    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      conditions.push(sql`COALESCE(${listings.currentBid}, ${listings.price}) <= ${maxPrice}`);
    }
    
    // Condition filter
    if (conditionFilters && conditionFilters.length > 0) {
      const conditionClauses = conditionFilters.map((condition) =>
        sql`LOWER(${listings.condition}) LIKE ${`%${condition.toLowerCase()}%`}`
      );
      conditions.push(or(...conditionClauses));
    }
    
    // City filter
    if (cities && cities.length > 0) {
      const cityClauses = cities.map((city) =>
        sql`LOWER(${listings.city}) LIKE ${`%${city.toLowerCase()}%`}`
      );
      conditions.push(or(...cityClauses));
    }
    
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
    
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .where(whereClause);
    
    // Build select with optional relevance score
    const selectFields: any = {
      id: listings.id,
      title: listings.title,
      price: listings.price,
      currentBid: listings.currentBid,
      images: listings.images,
      category: listings.category,
      saleType: listings.saleType,
      auctionEndTime: listings.auctionEndTime,
      city: listings.city,
      condition: listings.condition,
      totalBids: listings.totalBids,
      tags: listings.tags,
      sellerId: listings.sellerId,
      isActive: listings.isActive,
      createdAt: listings.createdAt,
      views: listings.views,
      sellerName: listings.sellerName,
      description: listings.description,
      productCode: listings.productCode,
      quantityAvailable: listings.quantityAvailable,
      quantitySold: listings.quantitySold,
    };
    
    // Add relevance score when searching
    if (searchRankSql) {
      selectFields.relevanceScore = searchRankSql;
    }
    
    let query = db.select(selectFields)
      .from(listings)
      .where(whereClause);
    
    // Order by relevance when searching, otherwise by created date
    if (searchRankSql) {
      query = query.orderBy(desc(searchRankSql), desc(listings.createdAt));
    } else {
      query = query.orderBy(desc(listings.createdAt));
    }
    
    const results = await query
      .limit(limit)
      .offset(offset);
    
    return { listings: results as Listing[], total: countResult?.count || 0 };
  }

  async getSearchSuggestions(query: string, limit: number = 10): Promise<Array<{ term: string; category: string; type: "category" | "product" }>> {
    if (!query || !query.trim()) {
      return [];
    }
    
    const searchTerm = query.trim().toLowerCase();
    const suggestions: Array<{ term: string; category: string; type: "category" | "product" }> = [];
    
    // Get category suggestions using DISTINCT
    const categoryResults = await db.selectDistinct({
      category: listings.category,
    })
      .from(listings)
      .where(and(
        eq(listings.isDeleted, false),
        eq(listings.isActive, true),
        or(
          sql`LOWER(${listings.category}) LIKE ${`%${searchTerm}%`}`,
          sql`similarity(${listings.category}, ${query}) > 0.3`
        )
      ))
      .limit(5);
    
    categoryResults.forEach(row => {
      if (row.category) {
        suggestions.push({ term: row.category, category: row.category, type: "category" });
      }
    });
    
    // Get product title suggestions using full-text search and fuzzy matching
    const productResults = await db.select({
      title: listings.title,
      category: listings.category,
    })
      .from(listings)
      .where(and(
        eq(listings.isDeleted, false),
        eq(listings.isActive, true),
        or(
          sql`${listings.searchVector} @@ plainto_tsquery('english', ${query})`,
          sql`similarity(${listings.title}, ${query}) > 0.3`,
          sql`LOWER(${listings.title}) LIKE ${`%${searchTerm}%`}`,
          sql`LOWER(COALESCE(${listings.brand}, '')) LIKE ${`%${searchTerm}%`}`
        )
      ))
      .orderBy(
        desc(sql`(
          ts_rank_cd(${listings.searchVector}, plainto_tsquery('english', ${query})) * 10 +
          similarity(${listings.title}, ${query}) * 5
        )`)
      )
      .limit(limit - suggestions.length);
    
    productResults.forEach(row => {
      suggestions.push({ 
        term: row.title, 
        category: row.category || "", 
        type: "product" 
      });
    });
    
    return suggestions.slice(0, limit);
  }

  async getPurchasesWithDetails(buyerId: string): Promise<any[]> {
    const results = await db.select({
      id: transactions.id,
      listingId: transactions.listingId,
      buyerId: transactions.buyerId,
      sellerId: transactions.sellerId,
      amount: transactions.amount,
      status: transactions.status,
      deliveryAddress: transactions.deliveryAddress,
      deliveryPhone: transactions.deliveryPhone,
      deliveryCity: transactions.deliveryCity,
      deliveryStatus: transactions.deliveryStatus,
      trackingNumber: transactions.trackingNumber,
      createdAt: transactions.createdAt,
      completedAt: transactions.completedAt,
      listingTitle: listings.title,
      listingPrice: listings.price,
      listingImages: listings.images,
      listingCity: listings.city,
      sellerName: users.displayName,
      sellerPhone: users.phone,
    })
      .from(transactions)
      .leftJoin(listings, eq(transactions.listingId, listings.id))
      .leftJoin(users, eq(transactions.sellerId, users.id))
      .where(and(eq(transactions.buyerId, buyerId), ne(transactions.sellerId, buyerId)))
      .orderBy(desc(transactions.createdAt));
    
    return results.map(r => ({
      id: r.id,
      listingId: r.listingId,
      buyerId: r.buyerId,
      sellerId: r.sellerId,
      amount: r.amount,
      status: r.status,
      deliveryAddress: r.deliveryAddress,
      deliveryPhone: r.deliveryPhone,
      deliveryCity: r.deliveryCity,
      deliveryStatus: r.deliveryStatus,
      trackingNumber: r.trackingNumber,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      listing: {
        id: r.listingId,
        title: r.listingTitle,
        price: r.listingPrice,
        images: r.listingImages,
        city: r.listingCity || "العراق",
        sellerId: r.sellerId,
        sellerName: r.sellerName || "بائع",
      },
    }));
  }

  async getUserBidsWithDetails(userId: string): Promise<any[]> {
    const results = await db.select({
      id: bids.id,
      listingId: bids.listingId,
      userId: bids.userId,
      amount: bids.amount,
      createdAt: bids.createdAt,
      listingTitle: listings.title,
      listingPrice: listings.price,
      listingCurrentBid: listings.currentBid,
      listingImages: listings.images,
      listingAuctionEndTime: listings.auctionEndTime,
      listingIsActive: listings.isActive,
      listingSaleType: listings.saleType,
    })
      .from(bids)
      .leftJoin(listings, eq(bids.listingId, listings.id))
      .where(eq(bids.userId, userId))
      .orderBy(desc(bids.createdAt));
    
    return results.map(r => ({
      id: r.id,
      listingId: r.listingId,
      userId: r.userId,
      amount: r.amount,
      createdAt: r.createdAt,
      listing: {
        id: r.listingId,
        title: r.listingTitle,
        price: r.listingPrice,
        currentBid: r.listingCurrentBid,
        images: r.listingImages,
        auctionEndTime: r.listingAuctionEndTime,
        isActive: r.listingIsActive,
        saleType: r.listingSaleType,
      },
    }));
  }

  async getListingsByCategory(category: string): Promise<Listing[]> {
    return db.select().from(listings)
      .where(and(eq(listings.isActive, true), eq(listings.isDeleted, false), eq(listings.category, category)))
      .orderBy(desc(listings.createdAt));
  }

  async getListingsBySeller(sellerId: string): Promise<Listing[]> {
    return db.select().from(listings)
      .where(and(eq(listings.sellerId, sellerId), eq(listings.isDeleted, false)))
      .orderBy(desc(listings.createdAt));
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing;
  }

  async getDeletedListings(): Promise<Listing[]> {
    return db.select().from(listings)
      .where(eq(listings.isDeleted, true))
      .orderBy(desc(listings.deletedAt));
  }

  private generateProductCode(): string {
    const sequence = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `P-${sequence}${random}`;
  }

  async createListing(insertListing: InsertListing & { auctionEndTime?: string | Date | null }): Promise<Listing> {
    const dbValues: Record<string, unknown> = { 
      ...insertListing,
      productCode: this.generateProductCode(),
    };
    if (insertListing.auctionEndTime !== undefined) {
      dbValues.auctionEndTime = insertListing.auctionEndTime instanceof Date 
        ? insertListing.auctionEndTime 
        : insertListing.auctionEndTime 
          ? new Date(insertListing.auctionEndTime) 
          : null;
    }
    const [listing] = await db.insert(listings).values(dbValues as InsertListing).returning();
    return listing;
  }

  async updateListing(id: string, updates: Partial<InsertListing> & { auctionEndTime?: Date | string | null; isActive?: boolean }): Promise<Listing | undefined> {
    const dbUpdates: Record<string, unknown> = { ...updates };
    if (updates.auctionEndTime !== undefined) {
      dbUpdates.auctionEndTime = updates.auctionEndTime instanceof Date 
        ? updates.auctionEndTime 
        : updates.auctionEndTime 
          ? new Date(updates.auctionEndTime) 
          : null;
    }
    const [listing] = await db.update(listings).set(dbUpdates).where(eq(listings.id, id)).returning();
    return listing;
  }

  async deleteListing(id: string): Promise<boolean> {
    const [listing] = await db.update(listings).set({ 
      isActive: false,
      isDeleted: true,
      deletedAt: new Date()
    }).where(eq(listings.id, id)).returning();
    return !!listing;
  }

  async getFeaturedListings(): Promise<Listing[]> {
    return db.select().from(listings)
      .where(and(
        eq(listings.isActive, true),
        eq(listings.isDeleted, false),
        eq(listings.isFeatured, true)
      ))
      .orderBy(listings.featuredOrder, desc(listings.featuredAt));
  }

  async getHotListings(limit: number = 10): Promise<Listing[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return db.select().from(listings)
      .where(and(
        eq(listings.isActive, true),
        eq(listings.isDeleted, false)
      ))
      .orderBy(desc(listings.views), desc(listings.totalBids))
      .limit(limit);
  }

  async getHeroListings(limit: number = 10): Promise<Listing[]> {
    const featured = await this.getFeaturedListings();
    if (featured.length >= limit) {
      return featured.slice(0, limit);
    }
    const hot = await this.getHotListings(limit - featured.length);
    const featuredIds = new Set(featured.map(f => f.id));
    const uniqueHot = hot.filter(h => !featuredIds.has(h.id));
    return [...featured, ...uniqueHot].slice(0, limit);
  }

  async setListingFeatured(id: string, isFeatured: boolean, order: number = 0): Promise<Listing | undefined> {
    const [updated] = await db.update(listings)
      .set({
        isFeatured,
        featuredOrder: order,
        featuredAt: isFeatured ? new Date() : null
      })
      .where(eq(listings.id, id))
      .returning();
    return updated;
  }

  async getBidsForListing(listingId: string): Promise<Bid[]> {
    return db.select().from(bids).where(eq(bids.listingId, listingId)).orderBy(desc(bids.amount));
  }

  async createBid(insertBid: InsertBid): Promise<Bid> {
    const [bid] = await db.insert(bids).values(insertBid).returning();
    await db.update(bids).set({ isWinning: false }).where(eq(bids.listingId, insertBid.listingId));
    await db.update(bids).set({ isWinning: true }).where(eq(bids.id, bid.id));
    await db.update(listings).set({ 
      currentBid: insertBid.amount,
      totalBids: sql`${listings.totalBids} + 1`
    }).where(eq(listings.id, insertBid.listingId));
    return bid;
  }

  async getHighestBid(listingId: string): Promise<Bid | undefined> {
    const [bid] = await db.select().from(bids)
      .where(eq(bids.listingId, listingId))
      .orderBy(desc(bids.amount))
      .limit(1);
    return bid;
  }

  async getUserBids(userId: string): Promise<Bid[]> {
    return db.select().from(bids).where(eq(bids.userId, userId)).orderBy(desc(bids.createdAt));
  }

  async getWatchlist(userId: string): Promise<Watchlist[]> {
    return db.select().from(watchlist).where(eq(watchlist.userId, userId)).orderBy(desc(watchlist.createdAt));
  }

  async getWatchlistListings(userId: string): Promise<Listing[]> {
    const ids = await db.select({ listingId: watchlist.listingId })
      .from(watchlist)
      .where(eq(watchlist.userId, userId));

    if (ids.length === 0) {
      return [];
    }

    return db.select().from(listings)
      .where(and(
        inArray(listings.id, ids.map((item) => item.listingId)),
        eq(listings.isActive, true),
        eq(listings.isDeleted, false),
      ))
      .orderBy(desc(listings.createdAt));
  }

  async addToWatchlist(item: InsertWatchlist): Promise<Watchlist> {
    const [watchlistItem] = await db.insert(watchlist).values(item).returning();
    return watchlistItem;
  }

  async removeFromWatchlist(userId: string, listingId: string): Promise<boolean> {
    const result = await db.delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.listingId, listingId)));
    return true;
  }

  async isInWatchlist(userId: string, listingId: string): Promise<boolean> {
    const [item] = await db.select().from(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.listingId, listingId)));
    return !!item;
  }

  async trackAnalytics(event: InsertAnalytics): Promise<Analytics> {
    const [analyticsEvent] = await db.insert(analytics).values(event).returning();
    return analyticsEvent;
  }

  async getAnalyticsByUser(userId: string): Promise<Analytics[]> {
    return db.select().from(analytics).where(eq(analytics.userId, userId)).orderBy(desc(analytics.createdAt));
  }

  async getAnalyticsByListing(listingId: string): Promise<Analytics[]> {
    return db.select().from(analytics).where(eq(analytics.listingId, listingId)).orderBy(desc(analytics.createdAt));
  }

  async getMessages(userId: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`)
      .orderBy(desc(messages.createdAt));
  }

  async getConversation(userId1: string, userId2: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(sql`(${messages.senderId} = ${userId1} AND ${messages.receiverId} = ${userId2}) OR (${messages.senderId} = ${userId2} AND ${messages.receiverId} = ${userId1})`)
      .orderBy(messages.createdAt);
  }

  async sendMessage(message: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(message).returning();
    return msg;
  }

  async markMessageAsRead(id: string): Promise<boolean> {
    const [msg] = await db.update(messages).set({ isRead: true }).where(eq(messages.id, id)).returning();
    return !!msg;
  }

  async getMessagesForSeller(sellerId: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.receiverId, sellerId))
      .orderBy(desc(messages.createdAt));
  }

  async getReviewsForSeller(sellerId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.sellerId, sellerId)).orderBy(desc(reviews.createdAt));
  }

  async hasReviewForListing(reviewerId: string, listingId: string): Promise<boolean> {
    const [existing] = await db.select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.reviewerId, reviewerId), eq(reviews.listingId, listingId)))
      .limit(1);
    return !!existing;
  }

  async getReviewsByBuyer(buyerId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.reviewerId, buyerId));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    const sellerReviews = await this.getReviewsForSeller(review.sellerId);
    const avgRating = sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length;
    await db.update(users).set({ 
      rating: avgRating,
      ratingCount: sellerReviews.length
    }).where(eq(users.id, review.sellerId));
    return newReview;
  }

  async getTransactionsForUser(userId: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(or(eq(transactions.sellerId, userId), eq(transactions.buyerId, userId)))
      .orderBy(desc(transactions.createdAt));
  }

  async getPurchasesForBuyer(buyerId: string): Promise<Transaction[]> {
    // Only return purchases where the buyer is NOT also the seller (exclude self-purchases)
    return db.select().from(transactions)
      .where(and(eq(transactions.buyerId, buyerId), ne(transactions.sellerId, buyerId)))
      .orderBy(desc(transactions.createdAt));
  }

  async getSalesForSeller(sellerId: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(eq(transactions.sellerId, sellerId))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    const [txn] = await db.select().from(transactions).where(eq(transactions.id, id));
    return txn;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [txn] = await db.insert(transactions).values(transaction).returning();
    return txn;
  }

  async updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined> {
    // Map status to appropriate deliveryStatus
    let deliveryStatus = "pending";
    if (status === "shipped") {
      deliveryStatus = "in_transit";
    } else if (status === "delivered" || status === "completed") {
      deliveryStatus = "delivered";
    }
    
    const [txn] = await db.update(transactions).set({ 
      status,
      deliveryStatus 
    }).where(eq(transactions.id, id)).returning();
    
    if (status === "completed" || status === "delivered") {
      await db.update(transactions).set({ completedAt: new Date() }).where(eq(transactions.id, id));
      if (txn) {
        await db.update(users).set({ 
          totalSales: sql`${users.totalSales} + 1`
        }).where(eq(users.id, txn.sellerId));
      }
    }
    return txn;
  }

  async updateTransactionWithIssue(id: string, data: { status: string; issueType: string; issueNote?: string }): Promise<Transaction | undefined> {
    const [txn] = await db.update(transactions).set({ 
      status: data.status,
      issueType: data.issueType,
      issueNote: data.issueNote,
      completedAt: new Date(),
    }).where(eq(transactions.id, id)).returning();
    return txn;
  }

  async rateBuyer(transactionId: string, rating: number, feedback?: string): Promise<Transaction | undefined> {
    const transaction = await this.getTransactionById(transactionId);
    if (!transaction) return undefined;
    
    const [updated] = await db.update(transactions).set({ 
      buyerRating: rating,
      buyerFeedback: feedback,
    }).where(eq(transactions.id, transactionId)).returning();
    
    if (transaction.buyerId && transaction.buyerId !== "guest") {
      const buyer = await this.getUser(transaction.buyerId);
      if (buyer) {
        const newCount = (buyer.buyerRatingCount || 0) + 1;
        const currentTotal = (buyer.buyerRating || 0) * (buyer.buyerRatingCount || 0);
        const newRating = (currentTotal + rating) / newCount;
        
        await db.update(users).set({
          buyerRating: newRating,
          buyerRatingCount: newCount,
        }).where(eq(users.id, transaction.buyerId));
      }
    }
    
    return updated;
  }

  async cancelTransactionBySeller(id: string, reason: string): Promise<Transaction | undefined> {
    const [txn] = await db.update(transactions).set({ 
      status: "cancelled",
      cancelledBySeller: true,
      cancellationReason: reason,
      cancelledAt: new Date(),
    }).where(eq(transactions.id, id)).returning();
    return txn;
  }

  async cancelTransactionByBuyer(id: string, reason: string): Promise<Transaction | undefined> {
    const [txn] = await db.update(transactions).set({
      status: "cancelled",
      cancelledByBuyer: true,
      cancellationReason: reason,
      cancelledAt: new Date(),
    }).where(eq(transactions.id, id)).returning();
    return txn;
  }

  async getCancelledTransactions(): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(eq(transactions.cancelledBySeller, true))
      .orderBy(desc(transactions.cancelledAt));
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.order);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [cat] = await db.insert(categories).values(category).returning();
    return cat;
  }

  // Buyer addresses methods
  async getBuyerAddresses(userId: string): Promise<BuyerAddress[]> {
    return db.select().from(buyerAddresses)
      .where(eq(buyerAddresses.userId, userId))
      .orderBy(desc(buyerAddresses.isDefault), desc(buyerAddresses.createdAt));
  }

  async getBuyerAddressById(id: string): Promise<BuyerAddress | undefined> {
    const [address] = await db.select().from(buyerAddresses)
      .where(eq(buyerAddresses.id, id))
      .limit(1);
    return address;
  }

  async createBuyerAddress(address: InsertBuyerAddress): Promise<BuyerAddress> {
    // If this is marked as default, unset other defaults first
    if (address.isDefault) {
      await db.update(buyerAddresses)
        .set({ isDefault: false })
        .where(eq(buyerAddresses.userId, address.userId));
    }
    const [newAddress] = await db.insert(buyerAddresses).values(address).returning();
    return newAddress;
  }

  async updateBuyerAddress(id: string, updates: Partial<InsertBuyerAddress>): Promise<BuyerAddress | undefined> {
    const [address] = await db.update(buyerAddresses)
      .set(updates)
      .where(eq(buyerAddresses.id, id))
      .returning();
    return address;
  }

  async deleteBuyerAddress(id: string): Promise<boolean> {
    const [deleted] = await db.delete(buyerAddresses)
      .where(eq(buyerAddresses.id, id))
      .returning();
    return !!deleted;
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<boolean> {
    // Unset all defaults for this user
    await db.update(buyerAddresses)
      .set({ isDefault: false })
      .where(eq(buyerAddresses.userId, userId));
    // Set the new default
    const [updated] = await db.update(buyerAddresses)
      .set({ isDefault: true })
      .where(and(eq(buyerAddresses.id, addressId), eq(buyerAddresses.userId, userId)))
      .returning();
    return !!updated;
  }

  // Seller summary
  async getSellerSummary(sellerId: string): Promise<{
    totalListings: number;
    activeListings: number;
    totalSales: number;
    totalRevenue: number;
    pendingShipments: number;
    averageRating: number;
    ratingCount: number;
  }> {
    const allListings = await db.select().from(listings).where(eq(listings.sellerId, sellerId));
    const activeListings = allListings.filter(l => l.isActive);
    const sellerTransactions = await db.select().from(transactions)
      .where(eq(transactions.sellerId, sellerId));
    const completedTransactions = sellerTransactions.filter(t => 
      t.status === "completed" || t.status === "delivered"
    );
    const pendingTransactions = sellerTransactions.filter(t => 
      t.status === "pending" || t.status === "processing"
    );
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const user = await this.getUser(sellerId);
    
    return {
      totalListings: allListings.length,
      activeListings: activeListings.length,
      totalSales: sellerTransactions.length,
      totalRevenue,
      pendingShipments: pendingTransactions.length,
      averageRating: user?.rating || 0,
      ratingCount: user?.ratingCount || 0,
    };
  }

  // Cart operations
  async getCartItems(userId: string): Promise<CartItem[]> {
    return db.select().from(cartItems)
      .where(eq(cartItems.userId, userId))
      .orderBy(desc(cartItems.createdAt));
  }

  async getCartItemWithListing(userId: string, listingId: string): Promise<CartItem | undefined> {
    const [item] = await db.select().from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.listingId, listingId)));
    return item;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const existing = await this.getCartItemWithListing(item.userId, item.listingId);
    if (existing) {
      // Update quantity instead
      const [updated] = await db.update(cartItems)
        .set({ 
          quantity: existing.quantity + (item.quantity || 1),
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, existing.id))
        .returning();
      return updated;
    }
    const [newItem] = await db.insert(cartItems).values(item).returning();
    return newItem;
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    if (quantity <= 0) {
      await this.removeFromCart(id);
      return undefined;
    }
    const [updated] = await db.update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, id))
      .returning();
    return updated;
  }

  async removeFromCart(id: string): Promise<boolean> {
    const [deleted] = await db.delete(cartItems)
      .where(eq(cartItems.id, id))
      .returning();
    return !!deleted;
  }

  async clearCart(userId: string): Promise<boolean> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return true;
  }


  async incrementListingViews(listingId: string): Promise<number> {
    const [updated] = await db.update(listings)
      .set({ views: sql`${listings.views} + 1` })
      .where(eq(listings.id, listingId))
      .returning();
    return updated?.views ?? 0;
  }

  async getBidsWithUserInfo(listingId: string): Promise<Array<Bid & { bidderName: string; bidderAvatar?: string | null }>> {
    const result = await db.select({
      id: bids.id,
      listingId: bids.listingId,
      userId: bids.userId,
      amount: bids.amount,
      shippingAddressId: bids.shippingAddressId,
      isWinning: bids.isWinning,
      createdAt: bids.createdAt,
      bidderName: users.displayName,
      bidderAvatar: users.avatar,
    })
    .from(bids)
    .leftJoin(users, eq(bids.userId, users.id))
    .where(eq(bids.listingId, listingId))
    .orderBy(desc(bids.amount));
    
    return result.map(r => ({
      ...r,
      bidderName: r.bidderName || "مستخدم مجهول",
    }));
  }

  async getUserBidsWithListings(userId: string): Promise<Array<Bid & { listing?: Listing }>> {
    // Use optimized JOIN query instead of N+1
    return this.getUserBidsWithDetails(userId);
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return !!updated;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return true;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async getReportsByUser(userId: string): Promise<Report[]> {
    return db.select().from(reports)
      .where(eq(reports.reporterId, userId))
      .orderBy(desc(reports.createdAt));
  }

  async getReportById(id: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async hasUserReportedListing(userId: string, listingId: string): Promise<boolean> {
    const [report] = await db.select().from(reports)
      .where(and(
        eq(reports.reporterId, userId),
        eq(reports.targetId, listingId),
        eq(reports.targetType, "listing")
      ));
    return !!report;
  }

  async getReportCountForListing(listingId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(DISTINCT reporter_id)::int` })
      .from(reports)
      .where(and(
        eq(reports.targetId, listingId),
        eq(reports.targetType, "listing")
      ));
    return result[0]?.count || 0;
  }

  async getReportsForListing(listingId: string): Promise<Report[]> {
    return db.select().from(reports)
      .where(and(
        eq(reports.targetId, listingId),
        eq(reports.targetType, "listing")
      ))
      .orderBy(desc(reports.createdAt));
  }

  // Admin functions
  async getAllReports(): Promise<Report[]> {
    return db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async updateReportStatus(id: string, status: string, adminNotes?: string, resolvedBy?: string): Promise<Report | undefined> {
    const updateData: Record<string, unknown> = { status };
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (resolvedBy !== undefined) updateData.resolvedBy = resolvedBy;
    if (status === "resolved" || status === "rejected") {
      updateData.resolvedAt = new Date();
    }
    const [updated] = await db.update(reports)
      .set(updateData)
      .where(eq(reports.id, id))
      .returning();
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserStatus(id: string, updates: { sellerApproved?: boolean; isVerified?: boolean; isBanned?: boolean; sellerRequestStatus?: string; isAuthenticated?: boolean; authenticityGuaranteed?: boolean }): Promise<User | undefined> {
    const updateData: Record<string, unknown> = {};
    if (updates.sellerApproved !== undefined) {
      updateData.sellerApproved = updates.sellerApproved;
      if (updates.sellerApproved) {
        updateData.sellerApprovalDate = new Date();
      }
    }
    if (updates.sellerRequestStatus !== undefined) updateData.sellerRequestStatus = updates.sellerRequestStatus;
    if (updates.isVerified !== undefined) updateData.isVerified = updates.isVerified;
    if (updates.isBanned !== undefined) {
      updateData.isBanned = updates.isBanned;
      if (updates.isBanned) {
        updateData.bannedAt = new Date();
      }
    }
    if (updates.isAuthenticated !== undefined) updateData.isAuthenticated = updates.isAuthenticated;
    if (updates.authenticityGuaranteed !== undefined) updateData.authenticityGuaranteed = updates.authenticityGuaranteed;
    const [updated] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getAdminStats(): Promise<{ totalUsers: number; totalListings: number; activeListings: number; totalTransactions: number; pendingReports: number; totalRevenue: number }> {
    const [usersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [listingsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(listings);
    const [activeListingsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(listings).where(eq(listings.isActive, true));
    const [transactionsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(transactions);
    const [pendingReportsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(reports).where(eq(reports.status, "pending"));
    const [revenueResult] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)::int` }).from(transactions).where(inArray(transactions.status, ['completed', 'delivered']));
    
    return {
      totalUsers: usersCount?.count || 0,
      totalListings: listingsCount?.count || 0,
      activeListings: activeListingsCount?.count || 0,
      totalTransactions: transactionsCount?.count || 0,
      pendingReports: pendingReportsCount?.count || 0,
      totalRevenue: revenueResult?.total || 0,
    };
  }

  async createVerificationCode(phone: string, code: string, type: string, expiresAt: Date): Promise<VerificationCode> {
    const [result] = await db.insert(verificationCodes).values({
      phone,
      code,
      type,
      expiresAt,
    }).returning();
    return result;
  }

  async getValidVerificationCode(phone: string, code: string, type: string): Promise<VerificationCode | undefined> {
    const [result] = await db.select()
      .from(verificationCodes)
      .where(and(
        eq(verificationCodes.phone, phone),
        eq(verificationCodes.code, code),
        eq(verificationCodes.type, type),
        sql`${verificationCodes.expiresAt} > NOW()`,
        sql`${verificationCodes.usedAt} IS NULL`
      ));
    return result;
  }

  async markVerificationCodeUsed(id: string): Promise<boolean> {
    const [result] = await db.update(verificationCodes)
      .set({ usedAt: new Date() })
      .where(eq(verificationCodes.id, id))
      .returning();
    return !!result;
  }

  async deleteExpiredVerificationCodes(): Promise<number> {
    const result = await db.delete(verificationCodes)
      .where(lt(verificationCodes.expiresAt, new Date()));
    return 0;
  }

  async createReturnRequest(request: InsertReturnRequest): Promise<ReturnRequest> {
    const [result] = await db.insert(returnRequests).values(request).returning();
    return result;
  }

  async getReturnRequestById(id: string): Promise<ReturnRequest | undefined> {
    const [result] = await db.select().from(returnRequests).where(eq(returnRequests.id, id));
    return result;
  }

  async getReturnRequestByTransaction(transactionId: string): Promise<ReturnRequest | undefined> {
    const [result] = await db.select().from(returnRequests).where(eq(returnRequests.transactionId, transactionId));
    return result;
  }

  async getReturnRequestsForBuyer(buyerId: string): Promise<ReturnRequest[]> {
    return db.select().from(returnRequests)
      .where(eq(returnRequests.buyerId, buyerId))
      .orderBy(desc(returnRequests.createdAt));
  }

  async getReturnRequestsForSeller(sellerId: string): Promise<ReturnRequest[]> {
    return db.select().from(returnRequests)
      .where(eq(returnRequests.sellerId, sellerId))
      .orderBy(desc(returnRequests.createdAt));
  }

  async updateReturnRequestStatus(id: string, status: string, sellerResponse?: string): Promise<ReturnRequest | undefined> {
    const [result] = await db.update(returnRequests)
      .set({ 
        status, 
        sellerResponse,
        respondedAt: new Date()
      })
      .where(eq(returnRequests.id, id))
      .returning();
    return result;
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [result] = await db.insert(contactMessages).values(message).returning();
    return result;
  }

  async getAllContactMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async getContactMessageById(id: string): Promise<ContactMessage | undefined> {
    const [result] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return result;
  }

  async markContactMessageAsRead(id: string): Promise<boolean> {
    const [result] = await db.update(contactMessages)
      .set({ isRead: true })
      .where(eq(contactMessages.id, id))
      .returning();
    return !!result;
  }

  async getUnreadContactMessageCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(contactMessages)
      .where(eq(contactMessages.isRead, false));
    return Number(result[0]?.count || 0);
  }

  async getCommentsForListing(listingId: string): Promise<Array<ProductComment & { userName: string; userAvatar?: string | null }>> {
    const results = await db.select({
      id: productComments.id,
      listingId: productComments.listingId,
      userId: productComments.userId,
      content: productComments.content,
      parentId: productComments.parentId,
      createdAt: productComments.createdAt,
      userName: users.displayName,
      userAvatar: users.avatar,
    })
      .from(productComments)
      .leftJoin(users, eq(productComments.userId, users.id))
      .where(eq(productComments.listingId, listingId))
      .orderBy(desc(productComments.createdAt));
    
    return results.map(r => ({
      id: r.id,
      listingId: r.listingId,
      userId: r.userId,
      content: r.content,
      parentId: r.parentId,
      createdAt: r.createdAt,
      userName: r.userName || "مستخدم",
      userAvatar: r.userAvatar,
    }));
  }

  async createComment(comment: InsertProductComment): Promise<ProductComment> {
    const [result] = await db.insert(productComments).values(comment).returning();
    return result;
  }

  async deleteComment(id: string, userId: string): Promise<boolean> {
    const [result] = await db.delete(productComments)
      .where(and(eq(productComments.id, id), eq(productComments.userId, userId)))
      .returning();
    return !!result;
  }

  async createPushSubscription(userId: string, endpoint: string, p256dh: string, auth: string): Promise<any> {
    const [existing] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    if (existing) {
      const [result] = await db.update(pushSubscriptions)
        .set({ userId, p256dh, auth })
        .where(eq(pushSubscriptions.endpoint, endpoint))
        .returning();
      return result;
    }
    const [result] = await db.insert(pushSubscriptions).values({ userId, endpoint, p256dh, auth }).returning();
    return result;
  }

  async getPushSubscription(userId: string): Promise<any | undefined> {
    const [result] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    return result;
  }

  async getPushSubscriptionsByUserId(userId: string): Promise<any[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(endpoint: string): Promise<boolean> {
    const [result] = await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).returning();
    return !!result;
  }
}

export const storage = new DatabaseStorage();
