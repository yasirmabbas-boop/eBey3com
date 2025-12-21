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
  users, listings, bids, watchlist, analytics, messages, reviews, transactions, categories, buyerAddresses, cartItems 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAccountCode(accountCode: string): Promise<User | undefined>;
  createUser(user: InsertUser & { accountType?: string }): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  
  getListings(): Promise<Listing[]>;
  getListingsByCategory(category: string): Promise<Listing[]>;
  getListingsBySeller(sellerId: string): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: string, listing: Partial<InsertListing> & { auctionEndTime?: Date | string | null }): Promise<Listing | undefined>;
  deleteListing(id: string): Promise<boolean>;
  
  getBidsForListing(listingId: string): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  getHighestBid(listingId: string): Promise<Bid | undefined>;
  getUserBids(userId: string): Promise<Bid[]>;
  
  getWatchlist(userId: string): Promise<Watchlist[]>;
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
  createReview(review: InsertReview): Promise<Review>;
  
  getTransactionsForUser(userId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined>;
  
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Buyer addresses
  getBuyerAddresses(userId: string): Promise<BuyerAddress[]>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByAccountCode(accountCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.accountCode, accountCode));
    return user;
  }

  private generateAccountCode(type: string): string {
    const prefix = type === 'seller' ? 'S' : 'B';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  }

  async createUser(insertUser: InsertUser & { accountType?: string }): Promise<User> {
    const accountType = insertUser.accountType || 'buyer';
    const accountCode = this.generateAccountCode(accountType);
    const userWithCode = {
      ...insertUser,
      accountCode,
      accountType,
    };
    const [user] = await db.insert(users).values(userWithCode).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getListings(): Promise<Listing[]> {
    return db.select().from(listings).where(eq(listings.isActive, true)).orderBy(desc(listings.createdAt));
  }

  async getListingsByCategory(category: string): Promise<Listing[]> {
    return db.select().from(listings)
      .where(and(eq(listings.isActive, true), eq(listings.category, category)))
      .orderBy(desc(listings.createdAt));
  }

  async getListingsBySeller(sellerId: string): Promise<Listing[]> {
    return db.select().from(listings)
      .where(eq(listings.sellerId, sellerId))
      .orderBy(desc(listings.createdAt));
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing;
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

  async updateListing(id: string, updates: Partial<InsertListing> & { auctionEndTime?: Date | string | null }): Promise<Listing | undefined> {
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
    const [listing] = await db.update(listings).set({ isActive: false }).where(eq(listings.id, id)).returning();
    return !!listing;
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

  async getReviewsForSeller(sellerId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.sellerId, sellerId)).orderBy(desc(reviews.createdAt));
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
      .where(sql`${transactions.sellerId} = ${userId} OR ${transactions.buyerId} = ${userId}`)
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [txn] = await db.insert(transactions).values(transaction).returning();
    return txn;
  }

  async updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined> {
    const [txn] = await db.update(transactions).set({ status }).where(eq(transactions.id, id)).returning();
    if (status === "completed") {
      await db.update(transactions).set({ completedAt: new Date() }).where(eq(transactions.id, id));
      if (txn) {
        await db.update(users).set({ 
          totalSales: sql`${users.totalSales} + 1`
        }).where(eq(users.id, txn.sellerId));
      }
    }
    return txn;
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
    averageRating: number;
    ratingCount: number;
  }> {
    const allListings = await db.select().from(listings).where(eq(listings.sellerId, sellerId));
    const activeListings = allListings.filter(l => l.isActive);
    const sellerTransactions = await db.select().from(transactions)
      .where(and(eq(transactions.sellerId, sellerId), eq(transactions.status, "completed")));
    const totalRevenue = sellerTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const user = await this.getUser(sellerId);
    
    return {
      totalListings: allListings.length,
      activeListings: activeListings.length,
      totalSales: user?.totalSales || 0,
      totalRevenue,
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
}

export const storage = new DatabaseStorage();
