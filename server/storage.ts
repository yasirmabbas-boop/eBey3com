import { 
  type User, type InsertUser, 
  type Listing, type InsertListing, 
  type Bid, type InsertBid,
  type Watchlist, type InsertWatchlist,
  type Analytics, type InsertAnalytics,
  type Message, type InsertMessage,
  type Offer, type InsertOffer,
  type Review, type InsertReview,
  type Transaction, type InsertTransaction,
  type Category, type InsertCategory,
  type BuyerAddress, type InsertBuyerAddress,
  type SellerAddress, type InsertSellerAddress,
  type CartItem, type InsertCartItem,
  type Notification, type InsertNotification,
  type Report, type InsertReport,
  type VerificationCode,
  type ReturnRequest, type InsertReturnRequest,
  type ReturnTemplate, type InsertReturnTemplate,
  type ReturnRule, type InsertReturnRule,
  type ContactMessage, type InsertContactMessage,
  type ProductComment, type InsertProductComment,
  type PushSubscription, type InsertPushSubscription,
  users, listings, bids, watchlist, analytics, messages, offers, reviews, transactions, categories, buyerAddresses, sellerAddresses, cartItems, notifications, reports, verificationCodes, returnRequests, returnTemplates, returnApprovalRules, contactMessages, productComments, pushSubscriptions
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, lt, inArray, ne, isNotNull } from "drizzle-orm";
import { expandQuery } from "./services/query-expander";

export interface UserPreferences {
  topCategories: string[];        // e.g. ["ساعات", "إلكترونيات"]
  recentSearches: string[];       // e.g. ["rolex", "iphone 15"]
  priceRange: { low: number; high: number } | null;
  topBrands: string[];            // extracted from search queries via expandQuery
}

// Extended report type with related entity details for admin view
export interface ReportWithDetails {
  id: string;
  reporterId: string;
  reportType: string;
  targetId: string;
  targetType: string;
  reason: string;
  details: string | null;
  status: string;
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  // Reporter info
  reporterName: string | null;
  reporterPhone: string | null;
  // Listing info (when targetType = 'listing')
  listingTitle: string | null;
  listingImage: string | null;
  listingPrice: number | null;
  sellerId: string | null;
  sellerName: string | null;
  // Report count for this target
  totalReportsOnTarget: number;
  pendingReportsOnTarget: number;
}

const availableListingCondition = and(
  eq(listings.isActive, true),
  sql`${listings.quantitySold} < ${listings.quantityAvailable}`
);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByAccountCode(accountCode: string): Promise<User | undefined>;
  getUserByAuthToken(token: string): Promise<User | undefined>;
  getAdminUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  upsertFacebookUser(data: { facebookId: string; email: string | null; displayName: string; photoUrl: string | null }): Promise<User>;
  
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
    userId?: string;
  }): Promise<{ listings: Listing[]; total: number }>;
  getSearchSuggestions(query: string, limit?: number): Promise<Array<{ term: string; category: string; type: "category" | "product" }>>;
  getSearchFacets(options: {
    category?: string;
    saleTypes?: string[];
    sellerId?: string;
    includeSold?: boolean;
    searchQuery?: string;
    minPrice?: number;
    maxPrice?: number;
    conditions?: string[];
    cities?: string[];
  }): Promise<{
    categories: Array<{ value: string; count: number }>;
    conditions: Array<{ value: string; count: number }>;
    saleTypes: Array<{ value: string; count: number }>;
    cities: Array<{ value: string; count: number }>;
    priceRange: { min: number; max: number };
  }>;
  getListingsByCategory(category: string): Promise<Listing[]>;
  getListingsBySeller(sellerId: string): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  getListingsByIds(ids: string[]): Promise<Listing[]>;
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
  getUserActiveBids(userId: string): Promise<Bid[]>; // Get bids where user is winning
  
  getWatchlist(userId: string): Promise<Watchlist[]>;
  getWatchlistListings(userId: string): Promise<Listing[]>;
  addToWatchlist(item: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(userId: string, listingId: string): Promise<boolean>;
  isInWatchlist(userId: string, listingId: string): Promise<boolean>;
  getWatchlistCountForListing(listingId: string): Promise<number>;
  getWatchlistCountsForListings(listingIds: string[]): Promise<Map<string, number>>;
  
  trackAnalytics(event: InsertAnalytics): Promise<Analytics>;
  getAnalyticsByUser(userId: string): Promise<Analytics[]>;
  getAnalyticsByListing(listingId: string): Promise<Analytics[]>;
  getUserPreferences(userId: string): Promise<UserPreferences>;
  
  getMessages(userId: string): Promise<Message[]>;
  getConversation(userId1: string, userId2: string): Promise<Message[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<boolean>;

  // Offers
  createOffer(offer: InsertOffer): Promise<Offer>;
  getOffer(id: string): Promise<Offer | undefined>;
  getOffersByBuyer(buyerId: string): Promise<Offer[]>;
  getOffersBySeller(sellerId: string): Promise<Offer[]>;
  getOffersForListing(listingId: string): Promise<Offer[]>;
  getPendingOffersForListing(listingId: string): Promise<Offer[]>;
  getBuyerPendingOfferForListing(buyerId: string, listingId: string): Promise<Offer | undefined>;
  rejectAllPendingOffersForListing(listingId: string, reason?: string): Promise<number>;
  updateOfferStatus(id: string, status: string, counterAmount?: number, counterMessage?: string): Promise<Offer | undefined>;
  expireOldOffers(): Promise<number>;
  
  getReviewsForSeller(sellerId: string): Promise<Review[]>;
  hasReviewForListing(reviewerId: string, listingId: string): Promise<boolean>;
  getReviewsByBuyer(buyerId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  getTransactionsForUser(userId: string): Promise<Transaction[]>;
  getPurchasesForBuyer(buyerId: string): Promise<Transaction[]>;
  getSalesForSeller(sellerId: string): Promise<Transaction[]>;
  getRatedTransactionsForSeller(sellerId: string): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | undefined>;
  getUserTransactionForListing(userId: string, listingId: string): Promise<Transaction | undefined>;
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
  getNotifications(userId: string, page?: number, limit?: number): Promise<{ notifications: Notification[], total: number }>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  cleanupOldNotifications(): Promise<{ readDeleted: number; unreadDeleted: number }>;
  
  // Reports
  createReport(report: InsertReport): Promise<Report>;
  getReportsByUser(userId: string): Promise<Report[]>;
  getReportById(id: string): Promise<Report | undefined>;
  hasUserReportedListing(userId: string, listingId: string): Promise<boolean>;
  getReportCountForListing(listingId: string): Promise<number>;
  getReportsForListing(listingId: string): Promise<Report[]>;
  
  // Admin functions
  getAllReports(): Promise<Report[]>;
  getAllReportsWithDetails(): Promise<ReportWithDetails[]>;
  getReportsPaginatedWithDetails(options: { limit: number; offset: number }): Promise<{ reports: ReportWithDetails[]; total: number }>;
  updateReportStatus(id: string, status: string, adminNotes?: string, resolvedBy?: string): Promise<Report | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersPaginated(options: { limit: number; offset: number }): Promise<{ users: User[]; total: number }>;
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
  markReturnAsProcessed(returnRequestId: string, refundAmount: number, processedBy: string, adminNotes?: string): Promise<ReturnRequest | undefined>;
  getAllReturnRequests(): Promise<ReturnRequest[]>;
  getReturnRequestsWithDetails(options?: { limit?: number; offset?: number; status?: string }): Promise<{ returns: ReturnRequest[]; total: number }>;
  updateReturnRequestByAdmin(id: string, updates: Partial<ReturnRequest>): Promise<ReturnRequest | undefined>;
  
  // Search by code
  searchByCode(code: string): Promise<{ products?: Listing[]; users?: User[]; transactions?: Transaction[] }>;
  searchProductByCode(code: string): Promise<Listing | undefined>;
  searchUserByAccountCode(code: string): Promise<User | undefined>;
  searchTransactionById(id: string): Promise<Transaction | undefined>;
  
  // Return templates
  createReturnTemplate(template: any): Promise<any>;
  getReturnTemplates(activeOnly?: boolean): Promise<any[]>;
  updateReturnTemplate(id: string, updates: Partial<any>): Promise<any | undefined>;
  
  // Return approval rules
  createReturnRule(rule: any): Promise<any>;
  getReturnRules(activeOnly?: boolean): Promise<any[]>;
  updateReturnRule(id: string, updates: Partial<any>): Promise<any | undefined>;
  
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
  createPushSubscription(
    userId: string, 
    endpoint: string | null, 
    p256dh: string | null, 
    auth: string | null,
    platform: string,
    fcmToken: string | null,
    deviceId?: string | null,
    deviceName?: string | null
  ): Promise<any>;
  getPushSubscription(userId: string): Promise<any | undefined>;
  getPushSubscriptionsByUserId(userId: string): Promise<any[]>;
  deletePushSubscription(endpoint: string): Promise<boolean>;
  deletePushSubscriptionByToken(token: string): Promise<boolean>;
  deletePushSubscriptionsByUserId(userId: string): Promise<number>;
  updatePushSubscription(id: string, data: { lastUsed?: Date }): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private normalizeAvatar(avatar: string | null | undefined): string | null {
    if (!avatar) return null;
    if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
      try {
        const url = new URL(avatar);
        if (url.pathname.startsWith("/objects/")) {
          return url.pathname;
        }
      } catch (e) {
        // Fallback if URL parsing fails
      }
    }
    return avatar;
  }

  private normalizeUser(user: User | undefined): User | undefined {
    if (!user) return undefined;
    return {
      ...user,
      avatar: this.normalizeAvatar(user.avatar),
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return this.normalizeUser(user);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return this.normalizeUser(user);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return this.normalizeUser(user);
  }

  async getUserByAccountCode(accountCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.accountCode, accountCode));
    return this.normalizeUser(user);
  }

  async getUserByAuthToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.authToken, token));
    return this.normalizeUser(user);
  }

  async getAdminUsers(): Promise<User[]> {
    const adminUsers = await db.select().from(users).where(eq(users.isAdmin, true));
    return adminUsers.map(user => this.normalizeUser(user)).filter(Boolean) as User[];
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
    return this.normalizeUser(user)!;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return this.normalizeUser(user);
  }

  async upsertFacebookUser(data: { facebookId: string; email: string | null; displayName: string; photoUrl: string | null }): Promise<User> {
    return db.transaction(async (tx) => {
      // First, search for existing user by facebookId
      const [existingByFacebookId] = await tx
        .select()
        .from(users)
        .where(eq(users.facebookId, data.facebookId))
        .limit(1);

      if (existingByFacebookId) {
        return this.normalizeUser(existingByFacebookId)!;
      }

      // If not found, search for existing user by email
      if (data.email) {
        const [existingByEmail] = await tx
          .select()
          .from(users)
          .where(eq(users.email, data.email))
          .limit(1);

        if (existingByEmail) {
          // Update that user's record to include the facebookId
          const [updatedUser] = await tx
            .update(users)
            .set({
              facebookId: data.facebookId,
              avatar: data.photoUrl || existingByEmail.avatar,
              displayName: data.displayName || existingByEmail.displayName,
              authProvider: "facebook",
              authProviderId: data.facebookId,
              lastLoginAt: new Date(),
            })
            .where(eq(users.id, existingByEmail.id))
            .returning();
          return this.normalizeUser(updatedUser)!;
        }
      }

      // If email does NOT exist: Insert a new user record
      // Generate account code within transaction
      const accountCodeResult = await tx
        .select({ accountCode: users.accountCode })
        .from(users)
        .where(sql`account_code LIKE 'EB-%'`)
        .orderBy(sql`CAST(SUBSTRING(account_code FROM 4) AS INTEGER) DESC`)
        .limit(1);
      
      let nextNumber = 10001; // Start from 10001
      if (accountCodeResult.length > 0 && accountCodeResult[0].accountCode) {
        const match = accountCodeResult[0].accountCode.match(/EB-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      const accountCode = `EB-${nextNumber}`;

      const [newUser] = await tx
        .insert(users)
        .values({
          email: data.email,
          facebookId: data.facebookId,
          displayName: data.displayName,
          avatar: data.photoUrl,
          authProvider: "facebook",
          authProviderId: data.facebookId,
          accountCode,
          phone: null, // Leave phone NULL so onboarding flow triggers
          biddingLimit: 0, // Bidding limits removed - no restrictions
          phoneVerified: false, // Require phone verification
          completedPurchases: 0,
        })
        .returning();
      return this.normalizeUser(newUser)!;
    });
  }

  async getListings(): Promise<Listing[]> {
    return db.select().from(listings)
      .where(and(eq(listings.isDeleted, false), availableListingCondition))
      .orderBy(desc(listings.createdAt));
  }

  /**
   * Build the common WHERE conditions array used by both getListingsPaginated
   * and getSearchFacets so the filters are always identical.
   */
  private buildSearchConditions(options: {
    category?: string;
    saleTypes?: string[];
    sellerId?: string;
    includeSold?: boolean;
    searchQuery?: string;
    minPrice?: number;
    maxPrice?: number;
    conditions?: string[];
    cities?: string[];
    userPreferences?: UserPreferences | null;
  }): { where: any; searchRankSql: any; expanded: ReturnType<typeof expandQuery> | null } {
    const { category, saleTypes, sellerId, includeSold, searchQuery, minPrice, maxPrice, conditions: conditionFilters, cities, userPreferences } = options;

    const conds: any[] = [eq(listings.isDeleted, false)];
    if (!includeSold) {
      conds.push(availableListingCondition);
    }
    if (category) conds.push(eq(listings.category, category));
    if (saleTypes && saleTypes.length > 0) {
      conds.push(inArray(listings.saleType, saleTypes));
    }
    if (sellerId) conds.push(eq(listings.sellerId, sellerId));

    // ── Full-text search + trigram + LIKE with synonym expansion ──
    let searchRankSql: any = null;
    let expanded: ReturnType<typeof expandQuery> | null = null;

    if (searchQuery && searchQuery.trim()) {
      expanded = expandQuery(searchQuery);
      const rawTerm = `%${searchQuery.trim().toLowerCase()}%`;

      // Build LIKE clauses for each synonym term (capped to 8 for perf)
      const likeTerms = expanded.allTerms.slice(0, 8);
      const likeClauses: any[] = [];
      for (const term of likeTerms) {
        const patt = `%${term.toLowerCase()}%`;
        likeClauses.push(sql`LOWER(${listings.title}) LIKE ${patt}`);
        likeClauses.push(sql`LOWER(COALESCE(${listings.brand}, '')) LIKE ${patt}`);
      }

      // Full-text search via search_vector (uses GIN index from migration 0003)
      const ftsClause = sql`${listings.searchVector}::tsvector @@ to_tsquery('english', ${expanded.tsqueryString})`;

      // Word-level trigram similarity for typo tolerance -- compares query against each
      // word in the title individually so short misspellings aren't drowned out
      const searchTrimmed = searchQuery.trim();
      const trigramClause = sql`EXISTS (SELECT 1 FROM unnest(string_to_array(${listings.title}, ' ')) AS word WHERE similarity(word, ${searchTrimmed}) > 0.35)`;

      // Original LIKE on description/tags as fallback
      likeClauses.push(sql`LOWER(${listings.description}) LIKE ${rawTerm}`);
      likeClauses.push(sql`LOWER(${listings.category}) LIKE ${rawTerm}`);
      likeClauses.push(sql`EXISTS (SELECT 1 FROM unnest(${listings.tags}) AS tag WHERE LOWER(tag) LIKE ${rawTerm})`);

      conds.push(or(ftsClause, trigramClause, ...likeClauses));

      // ── Best Match composite score ──
      // Weights: FTS rank (40), trigram similarity (10), title LIKE (10),
      //          brand LIKE (5), category LIKE (3), seller rating (5),
      //          engagement: views (capped), bids (capped), featured (3)
      // Personalization: category affinity (+2), brand affinity (+2) -- small nudge
      let personalizationSql = sql`0`;
      if (userPreferences && (userPreferences.topCategories.length > 0 || userPreferences.topBrands.length > 0)) {
        const boosts: any[] = [];
        if (userPreferences.topCategories.length > 0) {
          const catList = userPreferences.topCategories;
          const catClauses = catList.map(c => sql`LOWER(${listings.category}) = ${c.toLowerCase()}`);
          boosts.push(sql`CASE WHEN (${or(...catClauses)}) THEN 2 ELSE 0 END`);
        }
        if (userPreferences.topBrands.length > 0) {
          const brandList = userPreferences.topBrands;
          const brandClauses = brandList.map(b => sql`LOWER(COALESCE(${listings.brand}, '')) = ${b.toLowerCase()}`);
          boosts.push(sql`CASE WHEN (${or(...brandClauses)}) THEN 2 ELSE 0 END`);
        }
        personalizationSql = boosts.length === 1 ? boosts[0] : sql`${boosts[0]} + ${boosts[1]}`;
      }

      searchRankSql = sql`(
        COALESCE(ts_rank_cd(${listings.searchVector}::tsvector, to_tsquery('english', ${expanded.tsqueryString})), 0) * 40
        + COALESCE((SELECT MAX(similarity(word, ${searchTrimmed})) FROM unnest(string_to_array(${listings.title}, ' ')) AS word), 0) * 10
        + CASE WHEN LOWER(${listings.title}) LIKE ${rawTerm} THEN 10 ELSE 0 END
        + CASE WHEN LOWER(COALESCE(${listings.brand}, '')) LIKE ${rawTerm} THEN 5 ELSE 0 END
        + CASE WHEN LOWER(${listings.category}) LIKE ${rawTerm} THEN 3 ELSE 0 END
        + COALESCE((SELECT rating FROM users WHERE users.id = ${listings.sellerId}), 0) * 5
        + LEAST(COALESCE(${listings.views}, 0), 500) * 0.01
        + LEAST(COALESCE(${listings.totalBids}, 0), 50) * 0.1
        + CASE WHEN ${listings.isFeatured} THEN 3 ELSE 0 END
        + ${personalizationSql}
      )`;
    }

    // Price filters
    if (minPrice !== undefined && !isNaN(minPrice)) {
      conds.push(sql`COALESCE(${listings.currentBid}, ${listings.price}) >= ${minPrice}`);
    }
    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      conds.push(sql`COALESCE(${listings.currentBid}, ${listings.price}) <= ${maxPrice}`);
    }

    // Condition filter
    if (conditionFilters && conditionFilters.length > 0) {
      const condClauses = conditionFilters.map((c) =>
        sql`LOWER(${listings.condition}) LIKE ${`%${c.toLowerCase()}%`}`
      );
      conds.push(or(...condClauses));
    }

    // City filter
    if (cities && cities.length > 0) {
      const cityClauses = cities.map((city) =>
        sql`LOWER(${listings.city}) LIKE ${`%${city.toLowerCase()}%`}`
      );
      conds.push(or(...cityClauses));
    }

    const where = conds.length > 1 ? and(...conds) : conds[0];
    return { where, searchRankSql, expanded };
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
    userId?: string;
  }): Promise<{ listings: Listing[]; total: number }> {
    const { limit, offset, userId } = options;

    // Fetch user preferences for personalized ranking (only when searching with a logged-in user)
    let userPreferences: UserPreferences | null = null;
    if (userId && options.searchQuery) {
      try {
        userPreferences = await this.getUserPreferences(userId);
      } catch (e) {
        // Non-critical: fall back to non-personalized ranking
      }
    }

    const { where: whereClause, searchRankSql } = this.buildSearchConditions({ ...options, userPreferences });

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .where(whereClause);

    // Build select fields
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
      isNegotiable: listings.isNegotiable,
      createdAt: listings.createdAt,
      views: listings.views,
      sellerName: listings.sellerName,
      description: listings.description,
      productCode: listings.productCode,
      quantityAvailable: listings.quantityAvailable,
      quantitySold: listings.quantitySold,
      brand: listings.brand,
      shippingCost: listings.shippingCost,
      shippingType: listings.shippingType,
      isFeatured: listings.isFeatured,
    };

    if (searchRankSql) {
      selectFields.relevanceScore = searchRankSql;
    }

    // Order by Best Match score when searching, otherwise by created date
    const results = searchRankSql
      ? await db.select(selectFields)
          .from(listings)
          .where(whereClause)
          .orderBy(desc(searchRankSql), desc(listings.createdAt))
          .limit(limit)
          .offset(offset)
      : await db.select(selectFields)
          .from(listings)
          .where(whereClause)
          .orderBy(desc(listings.createdAt))
          .limit(limit)
          .offset(offset);

    return { listings: results as Listing[], total: countResult?.count || 0 };
  }

  async getSearchSuggestions(query: string, limit: number = 10): Promise<Array<{ term: string; category: string; type: "category" | "product" }>> {
    if (!query || !query.trim()) {
      return [];
    }

    const expanded = expandQuery(query);
    const searchTerm = query.trim().toLowerCase();
    const suggestions: Array<{ term: string; category: string; type: "category" | "product" }> = [];

    // Build LIKE patterns for synonym terms (capped to 6)
    const likeTerms = expanded.allTerms.slice(0, 6);

    // Get category suggestions using DISTINCT + synonyms
    const catLikeClauses = likeTerms.map(t =>
      sql`LOWER(${listings.category}) LIKE ${`%${t.toLowerCase()}%`}`
    );

    const categoryResults = await db.selectDistinct({
      category: listings.category,
    })
      .from(listings)
      .where(and(
        eq(listings.isDeleted, false),
        availableListingCondition,
        or(...catLikeClauses)
      ))
      .limit(5);

    categoryResults.forEach(row => {
      if (row.category) {
        suggestions.push({ term: row.category, category: row.category, type: "category" });
      }
    });

    // Get product title suggestions using FTS + trigram + LIKE with synonyms
    const titleLikeClauses = likeTerms.flatMap(t => {
      const patt = `%${t.toLowerCase()}%`;
      return [
        sql`LOWER(${listings.title}) LIKE ${patt}`,
        sql`LOWER(COALESCE(${listings.brand}, '')) LIKE ${patt}`,
      ];
    });
    const ftsClause = sql`${listings.searchVector}::tsvector @@ to_tsquery('english', ${expanded.tsqueryString})`;
    const trigramClause = sql`EXISTS (SELECT 1 FROM unnest(string_to_array(${listings.title}, ' ')) AS word WHERE similarity(word, ${searchTerm}) > 0.35)`;

    const productResults = await db.select({
      title: listings.title,
      category: listings.category,
      relevance: sql<number>`(
        COALESCE(ts_rank_cd(${listings.searchVector}::tsvector, to_tsquery('english', ${expanded.tsqueryString})), 0) * 10
        + COALESCE((SELECT MAX(similarity(word, ${searchTerm})) FROM unnest(string_to_array(${listings.title}, ' ')) AS word), 0) * 5
      )`,
    })
      .from(listings)
      .where(and(
        eq(listings.isDeleted, false),
        availableListingCondition,
        or(ftsClause, trigramClause, ...titleLikeClauses)
      ))
      .orderBy(sql`(
        COALESCE(ts_rank_cd(${listings.searchVector}::tsvector, to_tsquery('english', ${expanded.tsqueryString})), 0) * 10
        + COALESCE((SELECT MAX(similarity(word, ${searchTerm})) FROM unnest(string_to_array(${listings.title}, ' ')) AS word), 0) * 5
      ) DESC`)
      .limit(limit - suggestions.length);

    productResults.forEach(row => {
      // Deduplicate by term
      if (!suggestions.find(s => s.term === row.title)) {
        suggestions.push({
          term: row.title,
          category: row.category || "",
          type: "product"
        });
      }
    });

    return suggestions.slice(0, limit);
  }

  async getSearchFacets(options: {
    category?: string;
    saleTypes?: string[];
    sellerId?: string;
    includeSold?: boolean;
    searchQuery?: string;
    minPrice?: number;
    maxPrice?: number;
    conditions?: string[];
    cities?: string[];
  }): Promise<{
    categories: Array<{ value: string; count: number }>;
    conditions: Array<{ value: string; count: number }>;
    saleTypes: Array<{ value: string; count: number }>;
    cities: Array<{ value: string; count: number }>;
    priceRange: { min: number; max: number };
  }> {
    const { where: whereClause } = this.buildSearchConditions(options);

    // Run all aggregations in parallel for speed
    const [catRows, condRows, saleRows, cityRows, priceRow] = await Promise.all([
      db.select({
        value: listings.category,
        count: sql<number>`count(*)::int`,
      }).from(listings).where(whereClause).groupBy(listings.category).orderBy(sql`count(*) DESC`).limit(20),

      db.select({
        value: listings.condition,
        count: sql<number>`count(*)::int`,
      }).from(listings).where(whereClause).groupBy(listings.condition).orderBy(sql`count(*) DESC`).limit(20),

      db.select({
        value: listings.saleType,
        count: sql<number>`count(*)::int`,
      }).from(listings).where(whereClause).groupBy(listings.saleType).orderBy(sql`count(*) DESC`).limit(10),

      db.select({
        value: listings.city,
        count: sql<number>`count(*)::int`,
      }).from(listings).where(whereClause).groupBy(listings.city).orderBy(sql`count(*) DESC`).limit(30),

      db.select({
        min: sql<number>`COALESCE(MIN(COALESCE(${listings.currentBid}, ${listings.price})), 0)::int`,
        max: sql<number>`COALESCE(MAX(COALESCE(${listings.currentBid}, ${listings.price})), 0)::int`,
      }).from(listings).where(whereClause),
    ]);

    return {
      categories: catRows.filter(r => r.value).map(r => ({ value: r.value!, count: r.count })),
      conditions: condRows.filter(r => r.value).map(r => ({ value: r.value!, count: r.count })),
      saleTypes: saleRows.filter(r => r.value).map(r => ({ value: r.value!, count: r.count })),
      cities: cityRows.filter(r => r.value).map(r => ({ value: r.value!, count: r.count })),
      priceRange: { min: priceRow[0]?.min || 0, max: priceRow[0]?.max || 0 },
    };
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
      sellerRating: transactions.sellerRating,
      sellerFeedback: transactions.sellerFeedback,
      listingTitle: listings.title,
      listingPrice: listings.price,
      listingImages: listings.images,
      listingCity: listings.city,
      listingReturnPolicy: listings.returnPolicy,
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
      sellerRating: r.sellerRating,
      sellerFeedback: r.sellerFeedback,
      listing: {
        id: r.listingId,
        title: r.listingTitle,
        price: r.listingPrice,
        images: r.listingImages,
        city: r.listingCity || "العراق",
        sellerId: r.sellerId,
        sellerName: r.sellerName || "بائع",
        returnPolicy: r.listingReturnPolicy || "لا يوجد إرجاع",
      },
      seller: {
        id: r.sellerId,
        displayName: r.sellerName || "بائع",
        phone: r.sellerPhone,
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
      .where(and(availableListingCondition, eq(listings.isDeleted, false), eq(listings.category, category)))
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

  async getListingsByIds(ids: string[]): Promise<Listing[]> {
    if (ids.length === 0) return [];
    return db.select().from(listings).where(inArray(listings.id, ids));
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
        availableListingCondition,
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
        availableListingCondition,
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
    return await db.transaction(async (tx) => {
      // 1. First, set ALL existing bids for this listing to isWinning: false
      await tx.update(bids)
        .set({ isWinning: false })
        .where(eq(bids.listingId, insertBid.listingId));
      
      // 2. Insert the new bid with isWinning: true
      const [bid] = await tx.insert(bids)
        .values({ ...insertBid, isWinning: true })
        .returning();
      
      // 3. Update the listing with current bid, total bids, and highest bidder
      await tx.update(listings).set({ 
        currentBid: insertBid.amount,
        totalBids: sql`${listings.totalBids} + 1`,
        highestBidderId: insertBid.userId
      }).where(eq(listings.id, insertBid.listingId));
      
      return bid;
    });
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

  async getUserActiveBids(userId: string): Promise<Bid[]> {
    // Get all active bids where this user is currently winning
    const result = await db
      .select({
        id: bids.id,
        listingId: bids.listingId,
        userId: bids.userId,
        amount: bids.amount,
        shippingAddressId: bids.shippingAddressId,
        isWinning: bids.isWinning,
        createdAt: bids.createdAt,
      })
      .from(bids)
      .innerJoin(listings, eq(bids.listingId, listings.id))
      .where(
        and(
          eq(bids.userId, userId),
          eq(bids.isWinning, true),
          eq(listings.isActive, true)
        )
      );
    
    return result;
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
        availableListingCondition,
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

  async getWatchlistCountForListing(listingId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(watchlist)
      .where(eq(watchlist.listingId, listingId));
    return result[0]?.count || 0;
  }

  async getWatchlistCountsForListings(listingIds: string[]): Promise<Map<string, number>> {
    if (listingIds.length === 0) return new Map();
    
    const results = await db.select({
      listingId: watchlist.listingId,
      count: sql<number>`count(*)::int`
    })
      .from(watchlist)
      .where(inArray(watchlist.listingId, listingIds))
      .groupBy(watchlist.listingId);
    
    const countsMap = new Map<string, number>();
    for (const row of results) {
      countsMap.set(row.listingId, row.count);
    }
    return countsMap;
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

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Top 5 categories the user searches/views in the last 90 days
    const topCategoriesResult = await db.execute(sql`
      SELECT category, COUNT(*)::int as cnt
      FROM analytics
      WHERE user_id = ${userId} AND category IS NOT NULL AND category != ''
        AND created_at > NOW() - INTERVAL '90 days'
      GROUP BY category ORDER BY cnt DESC LIMIT 5
    `);
    const topCategories = (topCategoriesResult.rows as any[]).map((r: any) => r.category as string);

    // Recent unique search terms (last 30 days, up to 10)
    const recentSearchesResult = await db.execute(sql`
      SELECT search_query, MAX(created_at) as latest
      FROM analytics
      WHERE user_id = ${userId} AND event_type = 'search'
        AND search_query IS NOT NULL AND search_query != ''
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY search_query
      ORDER BY latest DESC
      LIMIT 10
    `);
    const recentSearches = (recentSearchesResult.rows as any[]).map((r: any) => r.search_query as string);

    // Typical price range (25th to 75th percentile from viewed/searched listings)
    const priceRangeResult = await db.execute(sql`
      SELECT
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY l.price) as price_low,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY l.price) as price_high
      FROM analytics a JOIN listings l ON a.listing_id = l.id
      WHERE a.user_id = ${userId} AND a.created_at > NOW() - INTERVAL '90 days'
    `);
    const priceRow = (priceRangeResult.rows as any[])[0];
    const priceRange = priceRow?.price_low != null && priceRow?.price_high != null
      ? { low: Number(priceRow.price_low), high: Number(priceRow.price_high) }
      : null;

    // Extract top brands from search queries using expandQuery
    const brandCounts = new Map<string, number>();
    for (const searchTerm of recentSearches) {
      const expanded = expandQuery(searchTerm);
      if (expanded.brand) {
        const brand = expanded.brand.toLowerCase();
        brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
      }
    }
    const topBrands = Array.from(brandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand]) => brand);

    return { topCategories, recentSearches, priceRange, topBrands };
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

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [created] = await db.insert(offers).values(offer).returning();
    return created;
  }

  async getOffer(id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer;
  }

  async getOffersByBuyer(buyerId: string): Promise<Offer[]> {
    return db.select().from(offers)
      .where(eq(offers.buyerId, buyerId))
      .orderBy(desc(offers.createdAt));
  }

  async getOffersBySeller(sellerId: string): Promise<Offer[]> {
    return db.select().from(offers)
      .where(eq(offers.sellerId, sellerId))
      .orderBy(desc(offers.createdAt));
  }

  async getOffersForListing(listingId: string): Promise<Offer[]> {
    return db.select().from(offers)
      .where(eq(offers.listingId, listingId))
      .orderBy(desc(offers.createdAt));
  }

  async getPendingOffersForListing(listingId: string): Promise<Offer[]> {
    return db.select().from(offers)
      .where(and(
        eq(offers.listingId, listingId),
        or(eq(offers.status, "pending"), eq(offers.status, "countered"))
      ))
      .orderBy(desc(offers.createdAt));
  }

  async getBuyerPendingOfferForListing(buyerId: string, listingId: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers)
      .where(and(
        eq(offers.buyerId, buyerId),
        eq(offers.listingId, listingId),
        or(eq(offers.status, "pending"), eq(offers.status, "countered"))
      ))
      .limit(1);
    return offer;
  }

  async rejectAllPendingOffersForListing(listingId: string, reason?: string): Promise<number> {
    const pendingOffers = await this.getPendingOffersForListing(listingId);
    
    if (pendingOffers.length === 0) {
      return 0;
    }

    // Update all pending/countered offers to rejected
    await db.update(offers)
      .set({
        status: "rejected",
        respondedAt: new Date(),
      })
      .where(and(
        eq(offers.listingId, listingId),
        or(eq(offers.status, "pending"), eq(offers.status, "countered"))
      ));

    return pendingOffers.length;
  }

  async updateOfferStatus(id: string, status: string, counterAmount?: number, counterMessage?: string): Promise<Offer | undefined> {
    const updateData: Record<string, unknown> = {
      status,
      respondedAt: new Date(),
    };

    if (status === "countered") {
      updateData.counterAmount = counterAmount ?? null;
      updateData.counterMessage = counterMessage ?? null;
      // Extend expiration to 48 hours for counter offers (eBay practice)
      updateData.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    } else {
      updateData.counterAmount = null;
      updateData.counterMessage = null;
    }

    const [updated] = await db.update(offers)
      .set(updateData)
      .where(eq(offers.id, id))
      .returning();
    return updated;
  }

  async expireOldOffers(): Promise<number> {
    // Expire offers past their expiration date that are still pending or countered
    const now = new Date();
    const result = await db.update(offers)
      .set({ status: "expired" })
      .where(
        and(
          or(
            eq(offers.status, "pending"),
            eq(offers.status, "countered")
          ),
          lt(offers.expiresAt, now)
        )
      )
      .returning();
    return result.length;
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

  async getRatedTransactionsForSeller(sellerId: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(and(
        eq(transactions.sellerId, sellerId),
        isNotNull(transactions.sellerRating)
      ))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    const [txn] = await db.select().from(transactions).where(eq(transactions.id, id));
    return txn;
  }

  async getUserTransactionForListing(userId: string, listingId: string): Promise<Transaction | undefined> {
    const [txn] = await db.select().from(transactions)
      .where(and(
        eq(transactions.buyerId, userId),
        eq(transactions.listingId, listingId)
      ))
      .orderBy(desc(transactions.createdAt))
      .limit(1);
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

  async rateSeller(transactionId: string, rating: number, feedback?: string): Promise<Transaction | undefined> {
    const transaction = await this.getTransactionById(transactionId);
    if (!transaction) return undefined;
    
    const [updated] = await db.update(transactions).set({ 
      sellerRating: rating,
      sellerFeedback: feedback,
    }).where(eq(transactions.id, transactionId)).returning();
    
    if (transaction.sellerId) {
      const seller = await this.getUser(transaction.sellerId);
      if (seller) {
        const newCount = (seller.ratingCount || 0) + 1;
        const currentTotal = (seller.rating || 0) * (seller.ratingCount || 0);
        const newRating = (currentTotal + rating) / newCount;
        
        await db.update(users).set({
          rating: newRating,
          ratingCount: newCount,
        }).where(eq(users.id, transaction.sellerId));
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

  // Seller addresses methods
  async getSellerAddresses(userId: string): Promise<SellerAddress[]> {
    return db.select().from(sellerAddresses)
      .where(eq(sellerAddresses.userId, userId))
      .orderBy(desc(sellerAddresses.isDefault), desc(sellerAddresses.createdAt));
  }

  async getSellerAddressById(id: string): Promise<SellerAddress | undefined> {
    const [address] = await db.select().from(sellerAddresses)
      .where(eq(sellerAddresses.id, id))
      .limit(1);
    return address;
  }

  async createSellerAddress(address: InsertSellerAddress): Promise<SellerAddress> {
    // If this is marked as default, unset other defaults first
    if (address.isDefault) {
      await db.update(sellerAddresses)
        .set({ isDefault: false })
        .where(eq(sellerAddresses.userId, address.userId));
    }
    const [newAddress] = await db.insert(sellerAddresses).values(address).returning();
    return newAddress;
  }

  async updateSellerAddress(id: string, updates: Partial<InsertSellerAddress>): Promise<SellerAddress | undefined> {
    const [address] = await db.update(sellerAddresses)
      .set(updates)
      .where(eq(sellerAddresses.id, id))
      .returning();
    return address;
  }

  async deleteSellerAddress(id: string): Promise<boolean> {
    const [deleted] = await db.delete(sellerAddresses)
      .where(eq(sellerAddresses.id, id))
      .returning();
    return !!deleted;
  }

  async setDefaultSellerAddress(userId: string, addressId: string): Promise<boolean> {
    // Unset all defaults for this user
    await db.update(sellerAddresses)
      .set({ isDefault: false })
      .where(eq(sellerAddresses.userId, userId));
    // Set the new default
    const [updated] = await db.update(sellerAddresses)
      .set({ isDefault: true })
      .where(and(eq(sellerAddresses.id, addressId), eq(sellerAddresses.userId, userId)))
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
      bidderAvatar: this.normalizeAvatar(r.bidderAvatar),
    }));
  }

  async getUserBidsWithListings(userId: string): Promise<Array<Bid & { listing?: Listing }>> {
    // Use optimized JOIN query instead of N+1
    return this.getUserBidsWithDetails(userId);
  }

  async getNotifications(
    userId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<{ notifications: Notification[], total: number }> {
    const offset = (page - 1) * limit;
    
    const [items, countResult] = await Promise.all([
      db.select().from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      
      db.select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(eq(notifications.userId, userId))
    ]);
    
    return {
      notifications: items,
      total: countResult[0]?.count || 0
    };
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

  async cleanupOldNotifications(): Promise<{ readDeleted: number; unreadDeleted: number }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Delete read notifications older than 30 days
    const readResult = await db.delete(notifications)
      .where(and(
        eq(notifications.isRead, true),
        lt(notifications.createdAt, thirtyDaysAgo)
      ));

    // Delete unread notifications older than 90 days
    const unreadResult = await db.delete(notifications)
      .where(and(
        eq(notifications.isRead, false),
        lt(notifications.createdAt, ninetyDaysAgo)
      ));

    return {
      readDeleted: readResult.rowCount || 0,
      unreadDeleted: unreadResult.rowCount || 0,
    };
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

  async getAllReportsWithDetails(): Promise<ReportWithDetails[]> {
    return this.getReportsPaginatedWithDetails({ limit: 10000, offset: 0 }).then(r => r.reports);
  }

  async getReportsPaginatedWithDetails(options: { limit: number; offset: number }): Promise<{ reports: ReportWithDetails[]; total: number }> {
    const { limit, offset } = options;
    
    // Get total count
    const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(reports);
    const total = totalResult?.count || 0;
    
    // Get paginated reports with reporter info, listing info, and seller info
    const results = await db.select({
      // Report fields
      id: reports.id,
      reporterId: reports.reporterId,
      reportType: reports.reportType,
      targetId: reports.targetId,
      targetType: reports.targetType,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      adminNotes: reports.adminNotes,
      resolvedBy: reports.resolvedBy,
      resolvedAt: reports.resolvedAt,
      createdAt: reports.createdAt,
      // Reporter info (join with users)
      reporterName: sql<string>`reporter.display_name`,
      reporterPhone: sql<string>`reporter.phone`,
      // Listing info (join with listings when targetType = 'listing')
      listingTitle: listings.title,
      listingImage: sql<string>`(${listings.images})[1]`,
      listingPrice: listings.price,
      sellerId: listings.sellerId,
      // Seller name (join with users as seller)
      sellerName: sql<string>`seller.display_name`,
    })
    .from(reports)
    .leftJoin(sql`users as reporter`, sql`reporter.id = ${reports.reporterId}`)
    .leftJoin(listings, and(
      eq(reports.targetId, listings.id),
      eq(reports.targetType, 'listing')
    ))
    .leftJoin(sql`users as seller`, sql`seller.id = ${listings.sellerId}`)
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset(offset);

    // Get report counts for each target to help prioritize
    const pendingReportCounts = await db.select({
      targetId: reports.targetId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(reports)
    .where(eq(reports.status, "pending"))
    .groupBy(reports.targetId);

    const totalReportCounts = await db.select({
      targetId: reports.targetId,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(reports)
    .groupBy(reports.targetId);

    const pendingMap = new Map(pendingReportCounts.map(r => [r.targetId, r.count]));
    const totalMap = new Map(totalReportCounts.map(r => [r.targetId, r.count]));

    const reportsWithDetails = results.map(r => ({
      ...r,
      totalReportsOnTarget: totalMap.get(r.targetId) || 1,
      pendingReportsOnTarget: pendingMap.get(r.targetId) || 0,
    }));

    return { reports: reportsWithDetails, total };
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
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    return allUsers.map(u => this.normalizeUser(u)!);
  }

  async getUsersPaginated(options: { limit: number; offset: number }): Promise<{ users: User[]; total: number }> {
    const { limit, offset } = options;
    
    // Get total count
    const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const total = totalResult?.count || 0;
    
    // Get paginated users
    const paginatedUsers = await db.select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
    
    return {
      users: paginatedUsers.map(u => this.normalizeUser(u)!).filter(Boolean) as User[],
      total,
    };
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
    return this.normalizeUser(updated);
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

  async markPhoneAsVerified(userId: string): Promise<void> {
    try {
      await db
        .update(users)
        .set({ phoneVerified: true })
        .where(eq(users.id, userId));
    } catch (error: any) {
      // If column doesn't exist, log error and provide helpful message
      if (error.message?.includes('phone_verified') || error.message?.includes('column') || error.code === '42703') {
        console.error("[Storage] ERROR: phone_verified column not found in database!");
        console.error("[Storage] Please run the migration: tsx server/verify-phone-verification-migration.ts");
        console.error("[Storage] Or run: ./run-phone-verification-migration.sh");
        console.error("[Storage] Or manually run: ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;");
        throw new Error("Database migration required: phone_verified column missing. Run migration script to fix.");
      }
      throw error;
    }
  }

  async checkAndNotifyLimitUpgrade(userId: string): Promise<void> {
    // Bidding limits removed - no restrictions on bidding except phone verification
    return;
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

  async markReturnAsProcessed(returnRequestId: string, refundAmount: number, processedBy: string, adminNotes?: string): Promise<ReturnRequest | undefined> {
    const [result] = await db.update(returnRequests)
      .set({
        refundProcessed: true,
        refundAmount,
        processedBy,
        processedAt: new Date(),
        adminNotes,
      })
      .where(eq(returnRequests.id, returnRequestId))
      .returning();
    return result;
  }

  async getAllReturnRequests(): Promise<ReturnRequest[]> {
    return db.select().from(returnRequests)
      .orderBy(desc(returnRequests.createdAt));
  }

  async getReturnRequestsWithDetails(options?: { limit?: number; offset?: number; status?: string }): Promise<{ returns: ReturnRequest[]; total: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    let query = db.select().from(returnRequests);
    if (options?.status) {
      query = query.where(eq(returnRequests.status, options.status)) as any;
    }
    
    const returns = await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(returnRequests.createdAt));
    
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(returnRequests);
    const total = Number(totalResult[0]?.count || 0);
    
    return { returns, total };
  }

  async updateReturnRequestByAdmin(id: string, updates: Partial<ReturnRequest>): Promise<ReturnRequest | undefined> {
    const [result] = await db.update(returnRequests)
      .set(updates)
      .where(eq(returnRequests.id, id))
      .returning();
    return result;
  }

  async searchByCode(code: string): Promise<{ products?: Listing[]; users?: User[]; transactions?: Transaction[] }> {
    const results: { products?: Listing[]; users?: User[]; transactions?: Transaction[] } = {};
    const searchTerm = `%${code}%`;
    
    // Search products by productCode
    const products = await db.select().from(listings)
      .where(sql`LOWER(COALESCE(${listings.productCode}, '')) LIKE LOWER(${searchTerm})`)
      .limit(10);
    if (products.length > 0) {
      results.products = products;
    }
    
    // Search users by accountCode
    const userResults = await db.select().from(users)
      .where(sql`LOWER(COALESCE(${users.accountCode}, '')) LIKE LOWER(${searchTerm})`)
      .limit(10);
    if (userResults.length > 0) {
      results.users = userResults;
    }
    
    // Search transactions by ID
    const transactionResults = await db.select().from(transactions)
      .where(sql`${transactions.id}::text LIKE ${searchTerm}`)
      .limit(10);
    if (transactionResults.length > 0) {
      results.transactions = transactionResults;
    }
    
    return results;
  }

  async searchProductByCode(code: string): Promise<Listing | undefined> {
    const [result] = await db.select().from(listings)
      .where(eq(listings.productCode, code));
    return result;
  }

  async searchUserByAccountCode(code: string): Promise<User | undefined> {
    const [result] = await db.select().from(users)
      .where(eq(users.accountCode, code));
    return result;
  }

  async searchTransactionById(id: string): Promise<Transaction | undefined> {
    const [result] = await db.select().from(transactions)
      .where(eq(transactions.id, id));
    return result;
  }

  async createReturnTemplate(template: InsertReturnTemplate): Promise<ReturnTemplate> {
    const [result] = await db.insert(returnTemplates).values(template).returning();
    return result;
  }

  async getReturnTemplates(activeOnly = false): Promise<ReturnTemplate[]> {
    let query = db.select().from(returnTemplates);
    if (activeOnly) {
      query = query.where(eq(returnTemplates.isActive, true)) as any;
    }
    return query.orderBy(desc(returnTemplates.createdAt));
  }

  async updateReturnTemplate(id: string, updates: Partial<ReturnTemplate>): Promise<ReturnTemplate | undefined> {
    const [result] = await db.update(returnTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(returnTemplates.id, id))
      .returning();
    return result;
  }

  async createReturnRule(rule: InsertReturnRule): Promise<ReturnRule> {
    const [result] = await db.insert(returnApprovalRules).values(rule).returning();
    return result;
  }

  async getReturnRules(activeOnly = false): Promise<ReturnRule[]> {
    let query = db.select().from(returnApprovalRules);
    if (activeOnly) {
      query = query.where(eq(returnApprovalRules.isActive, true)) as any;
    }
    return query.orderBy(desc(returnApprovalRules.priority));
  }

  async updateReturnRule(id: string, updates: Partial<ReturnRule>): Promise<ReturnRule | undefined> {
    const [result] = await db.update(returnApprovalRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(returnApprovalRules.id, id))
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
      userAvatar: this.normalizeAvatar(r.userAvatar),
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

  async createPushSubscription(
    userId: string, 
    endpoint: string | null, 
    p256dh: string | null, 
    auth: string | null,
    platform: string,
    fcmToken: string | null,
    deviceId?: string | null,
    deviceName?: string | null
  ): Promise<any> {
    // Check if subscription already exists
    let existing: any[] = [];
    
    if (deviceId) {
      // For native: check by user + deviceId
      existing = await db.select().from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.deviceId, deviceId)
        ));
    } else if (endpoint) {
      // For web: check by endpoint
      existing = await db.select().from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, endpoint));
    } else if (fcmToken) {
      // For native without deviceId: check by token
      existing = await db.select().from(pushSubscriptions)
        .where(eq(pushSubscriptions.fcmToken, fcmToken));
    }
    
    if (existing.length > 0) {
      // Update existing subscription
      const [result] = await db.update(pushSubscriptions)
        .set({ 
          endpoint,
          p256dh,
          auth,
          fcmToken,
          platform,
          deviceName,
          lastUsed: sql`now()`
        })
        .where(eq(pushSubscriptions.id, existing[0].id))
        .returning();
      return result;
    }
    
    // Create new subscription
    const [result] = await db.insert(pushSubscriptions).values({ 
      userId, 
      endpoint,
      p256dh,
      auth,
      platform,
      fcmToken,
      deviceId: deviceId || null,
      deviceName: deviceName || null,
    }).returning();
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

  async deletePushSubscriptionByToken(token: string): Promise<boolean> {
    const [result] = await db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.fcmToken, token))
      .returning();
    return !!result;
  }

  async deletePushSubscriptionsByUserId(userId: string): Promise<number> {
    const results = await db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
      .returning();
    return results.length;
  }

  async updatePushSubscription(id: string, data: { lastUsed?: Date }): Promise<void> {
    await db.update(pushSubscriptions)
      .set(data)
      .where(eq(pushSubscriptions.id, id));
  }
}

export const storage = new DatabaseStorage();
