import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountCode: text("account_code").unique(),
  phone: text("phone").unique().notNull(),
  email: text("email").unique(),
  password: text("password"),
  displayName: text("display_name").notNull(),
  avatar: text("avatar"),
  role: text("role").notNull().default("user"),
  isVerified: boolean("is_verified").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  isTrusted: boolean("is_trusted").notNull().default(false),
  isAuthenticated: boolean("is_authenticated").notNull().default(false),
  authenticityGuaranteed: boolean("authenticity_guaranteed").notNull().default(false),
  totalPurchases: integer("total_purchases").notNull().default(0),
  isBanned: boolean("is_banned").notNull().default(false),
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at"),
  idDocumentUrl: text("id_document_url"),
  verificationStatus: text("verification_status").default("pending"),
  sellerApproved: boolean("seller_approved").notNull().default(false),
  sellerRequestStatus: text("seller_request_status").default("none"),
  sellerRequestDate: timestamp("seller_request_date"),
  sellerApprovalDate: timestamp("seller_approval_date"),
  totalSales: integer("total_sales").notNull().default(0),
  rating: real("rating").default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  buyerRating: real("buyer_rating").default(0),
  buyerRatingCount: integer("buyer_rating_count").notNull().default(0),
  authProvider: text("auth_provider").default("phone"),
  authProviderId: text("auth_provider_id"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  city: text("city"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  district: text("district"),
  locationLat: real("location_lat"),
  locationLng: real("location_lng"),
  ageBracket: text("age_bracket"),
  gender: text("gender"),
  interests: text("interests").array(),
  surveyCompleted: boolean("survey_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  lastLoginAt: timestamp("last_login_at"),
  authToken: text("auth_token"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
  totalSales: true,
  rating: true,
  ratingCount: true,
  sellerApproved: true,
  sellerRequestStatus: true,
  sellerRequestDate: true,
  sellerApprovalDate: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull(),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  shippingAddressId: varchar("shipping_address_id"),
  isWinning: boolean("is_winning").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  createdAt: true,
  isWinning: true,
});

export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bids.$inferSelect;

export const watchlist = pgTable("watchlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  listingId: varchar("listing_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  createdAt: true,
});

export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type Watchlist = typeof watchlist.$inferSelect;

export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(),
  eventData: text("event_data"),
  listingId: varchar("listing_id"),
  category: text("category"),
  searchQuery: text("search_query"),
  pageUrl: text("page_url"),
  referrer: text("referrer"),
  deviceType: text("device_type"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Analytics = typeof analytics.$inferSelect;

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  listingId: varchar("listing_id"),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Offers system
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull(),
  buyerId: varchar("buyer_id").notNull(),
  sellerId: varchar("seller_id").notNull(),
  offerAmount: integer("offer_amount").notNull(),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  counterAmount: integer("counter_amount"),
  counterMessage: text("counter_message"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  respondedAt: timestamp("responded_at"),
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewerId: varchar("reviewer_id").notNull(),
  sellerId: varchar("seller_id").notNull(),
  listingId: varchar("listing_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull(),
  sellerId: varchar("seller_id").notNull(),
  buyerId: varchar("buyer_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").default("cash"),
  deliveryAddress: text("delivery_address"),
  deliveryPhone: text("delivery_phone"),
  deliveryCity: text("delivery_city"),
  deliveryStatus: text("delivery_status").default("pending"),
  trackingNumber: text("tracking_number"),
  shippedAt: timestamp("shipped_at"),
  trackingAvailableAt: timestamp("tracking_available_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
  buyerRating: integer("buyer_rating"),
  buyerFeedback: text("buyer_feedback"),
  issueType: text("issue_type"),
  issueNote: text("issue_note"),
  cancelledBySeller: boolean("cancelled_by_seller").default(false),
  cancelledByBuyer: boolean("cancelled_by_buyer").default(false),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at"),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  icon: text("icon"),
  parentId: varchar("parent_id"),
  order: integer("order").notNull().default(0),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Buyer delivery addresses
export const buyerAddresses = pgTable("buyer_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  label: text("label").notNull(), // e.g., "المنزل", "العمل"
  recipientName: text("recipient_name").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  district: text("district"),
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  notes: text("notes"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertBuyerAddressSchema = createInsertSchema(buyerAddresses).omit({
  id: true,
  createdAt: true,
});

export type InsertBuyerAddress = z.infer<typeof insertBuyerAddressSchema>;
export type BuyerAddress = typeof buyerAddresses.$inferSelect;

// Shopping cart items
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  listingId: varchar("listing_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  priceSnapshot: integer("price_snapshot").notNull(), // Price at time of adding to cart
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;


export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productCode: text("product_code").unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  category: text("category").notNull(),
  condition: text("condition").notNull(),
  brand: text("brand"),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  saleType: text("sale_type").notNull().default("fixed"),
  currentBid: integer("current_bid"),
  totalBids: integer("total_bids").default(0),
  highestBidderId: varchar("highest_bidder_id"),
  timeLeft: text("time_left"),
  auctionStartTime: timestamp("auction_start_time"),
  auctionEndTime: timestamp("auction_end_time"),
  deliveryWindow: text("delivery_window").notNull(),
  shippingCost: integer("shipping_cost").default(0),
  shippingType: text("shipping_type").default("seller_pays"),
  internationalShipping: boolean("international_shipping").notNull().default(false),
  internationalCountries: text("international_countries").array().default(sql`ARRAY[]::text[]`),
  returnPolicy: text("return_policy").notNull(),
  returnDetails: text("return_details"),
  sellerName: text("seller_name").notNull(),
  sellerId: varchar("seller_id"),
  city: text("city").notNull(),
  area: text("area"),
  sku: text("sku"),
  isActive: boolean("is_active").notNull().default(true),
  isPaused: boolean("is_paused").notNull().default(false),
  isNegotiable: boolean("is_negotiable").notNull().default(false),
  serialNumber: text("serial_number"),
  quantityAvailable: integer("quantity_available").notNull().default(1),
  quantitySold: integer("quantity_sold").notNull().default(0),
  views: integer("views").notNull().default(0),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  removedByAdmin: boolean("removed_by_admin").notNull().default(false),
  removalReason: text("removal_reason"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  isFeatured: boolean("is_featured").notNull().default(false),
  featuredOrder: integer("featured_order").default(0),
  featuredAt: timestamp("featured_at"),
  searchVector: text("search_vector"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
  totalBids: true,
  currentBid: true,
  isActive: true,
  searchVector: true,
});

export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;


// Reports system
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull(),
  reportType: text("report_type").notNull(),
  targetId: varchar("target_id").notNull(),
  targetType: text("target_type").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  status: true,
  adminNotes: true,
  resolvedBy: true,
  resolvedAt: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// Return requests
export const returnRequests = pgTable("return_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull(),
  buyerId: varchar("buyer_id").notNull(),
  sellerId: varchar("seller_id").notNull(),
  listingId: varchar("listing_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("pending"),
  sellerResponse: text("seller_response"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertReturnRequestSchema = createInsertSchema(returnRequests).omit({
  id: true,
  createdAt: true,
  status: true,
  sellerResponse: true,
  respondedAt: true,
});

export type InsertReturnRequest = z.infer<typeof insertReturnRequestSchema>;
export type ReturnRequest = typeof returnRequests.$inferSelect;


// Notifications system
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  linkUrl: text("link_url"),
  relatedId: varchar("related_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Verification codes for SMS verification
export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(), // 'registration', 'password_reset', 'login_2fa'
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;

// Contact form submissions
export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
  isRead: true,
  repliedAt: true,
});

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

// Product comments
export const productComments = pgTable("product_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  parentId: varchar("parent_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertProductCommentSchema = createInsertSchema(productComments).omit({
  id: true,
  createdAt: true,
});

export type InsertProductComment = z.infer<typeof insertProductCommentSchema>;
export type ProductComment = typeof productComments.$inferSelect;

// Push notification subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// =====================================================
// FINANCIAL SYSTEM TABLES
// =====================================================

// Wallet transactions - Every money movement for sellers
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  transactionId: varchar("transaction_id"), // Links to transactions table (order)
  type: text("type").notNull(), // 'sale_earning', 'commission_fee', 'shipping_deduction', 'payout', 'return_reversal', 'adjustment'
  amount: integer("amount").notNull(), // Positive for credit, negative for debit
  description: text("description"),
  status: text("status").notNull().default("pending"), // 'pending', 'available', 'paid', 'reversed'
  holdUntil: timestamp("hold_until"), // 5-day hold period end
  weeklyPayoutId: varchar("weekly_payout_id"), // Links to payout when paid
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  availableAt: timestamp("available_at"), // When funds became available
});

// Buyer wallet transactions - Credits/debits for buyers
export const buyerWalletTransactions = pgTable("buyer_wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull(),
  transactionId: varchar("transaction_id"), // Links to transactions table (order/return)
  type: text("type").notNull(), // 'refund', 'credit', 'adjustment', 'debit'
  amount: integer("amount").notNull(), // Positive for credit, negative for debit
  description: text("description"),
  status: text("status").notNull().default("available"), // 'pending', 'available', 'reversed'
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
  availableAt: true,
});

export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

export const insertBuyerWalletTransactionSchema = createInsertSchema(buyerWalletTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertBuyerWalletTransaction = z.infer<typeof insertBuyerWalletTransactionSchema>;
export type BuyerWalletTransaction = typeof buyerWalletTransactions.$inferSelect;

// Weekly payouts - Settlement records per seller per week
export const weeklyPayouts = pgTable("weekly_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  weekStartDate: timestamp("week_start_date").notNull(), // Start of the week (Sunday)
  weekEndDate: timestamp("week_end_date").notNull(), // End of the week (Saturday)
  totalEarnings: integer("total_earnings").notNull().default(0), // Gross earnings
  totalCommission: integer("total_commission").notNull().default(0), // Total 5% fees
  totalShipping: integer("total_shipping").notNull().default(0), // Total shipping deductions
  totalReturns: integer("total_returns").notNull().default(0), // Return reversals
  netPayout: integer("net_payout").notNull().default(0), // Final amount to pay
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'paid', 'cancelled'
  paymentMethod: text("payment_method"), // 'bank_transfer', 'cash', 'mobile_wallet'
  paymentReference: text("payment_reference"), // Bank ref or receipt number
  paidAt: timestamp("paid_at"),
  paidBy: varchar("paid_by"), // Admin who marked as paid
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertWeeklyPayoutSchema = createInsertSchema(weeklyPayouts).omit({
  id: true,
  createdAt: true,
  paidAt: true,
});

export type InsertWeeklyPayout = z.infer<typeof insertWeeklyPayoutSchema>;
export type WeeklyPayout = typeof weeklyPayouts.$inferSelect;

// Monthly commission tracker - Tracks 15 free sales per month per seller
export const monthlyCommissionTracker = pgTable("monthly_commission_tracker", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  salesCount: integer("sales_count").notNull().default(0), // Total confirmed sales
  freeSalesUsed: integer("free_sales_used").notNull().default(0), // Max 15
  commissionPaidSales: integer("commission_paid_sales").notNull().default(0), // Sales with 5% fee
  totalCommissionPaid: integer("total_commission_paid").notNull().default(0), // Total fees collected
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertMonthlyCommissionTrackerSchema = createInsertSchema(monthlyCommissionTracker).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMonthlyCommissionTracker = z.infer<typeof insertMonthlyCommissionTrackerSchema>;
export type MonthlyCommissionTracker = typeof monthlyCommissionTracker.$inferSelect;

// Delivery orders - Links orders to delivery company system
export const deliveryOrders = pgTable("delivery_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull(), // Links to transactions table
  externalDeliveryId: text("external_delivery_id"), // ID in delivery company system
  externalTrackingNumber: text("external_tracking_number"),
  pickupAddress: text("pickup_address").notNull(),
  pickupCity: text("pickup_city").notNull(),
  pickupPhone: text("pickup_phone").notNull(),
  pickupContactName: text("pickup_contact_name").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryCity: text("delivery_city").notNull(),
  deliveryPhone: text("delivery_phone").notNull(),
  deliveryContactName: text("delivery_contact_name").notNull(),
  codAmount: integer("cod_amount").notNull(), // Cash on delivery amount
  shippingCost: integer("shipping_cost").notNull().default(0),
  itemDescription: text("item_description"),
  itemWeight: real("item_weight"),
  status: text("status").notNull().default("pending"), // 'pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'cancelled'
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  currentLat: real("current_lat"),
  currentLng: real("current_lng"),
  lastLocationUpdate: timestamp("last_location_update"),
  estimatedDeliveryDate: timestamp("estimated_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  deliveryProofUrl: text("delivery_proof_url"), // Photo proof
  signatureUrl: text("signature_url"),
  returnReason: text("return_reason"),
  cashCollected: boolean("cash_collected").default(false),
  cashCollectedAt: timestamp("cash_collected_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertDeliveryOrderSchema = createInsertSchema(deliveryOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeliveryOrder = z.infer<typeof insertDeliveryOrderSchema>;
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;

// Delivery status log - History of status updates from delivery API
export const deliveryStatusLog = pgTable("delivery_status_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliveryOrderId: varchar("delivery_order_id").notNull(),
  status: text("status").notNull(),
  statusMessage: text("status_message"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  driverNotes: text("driver_notes"),
  photoUrl: text("photo_url"),
  receivedFromApi: boolean("received_from_api").notNull().default(true), // true = from webhook, false = manual
  rawPayload: text("raw_payload"), // Store raw API response for debugging
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertDeliveryStatusLogSchema = createInsertSchema(deliveryStatusLog).omit({
  id: true,
  createdAt: true,
});

export type InsertDeliveryStatusLog = z.infer<typeof insertDeliveryStatusLogSchema>;
export type DeliveryStatusLog = typeof deliveryStatusLog.$inferSelect;

export * from "./models/auth";
