import { storage } from "./storage";
import { broadcastAuctionEnd } from "./websocket";
import { db } from "./db";
import { listings, bids, transactions, notifications } from "@shared/schema";
import { eq, and, lt, isNotNull, sql, desc } from "drizzle-orm";
import { sendPushNotification } from "./push-notifications";

const PROCESS_INTERVAL_MS = 30000;
const GRACE_PERIOD_MS = 5000;

interface AuctionResult {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  winnerId: string | null;
  winnerName: string | null;
  winningBid: number | null;
  totalBids: number;
  success: boolean;
  error?: string;
}

let processorInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

export function log(message: string, level: "info" | "error" | "warn" = "info") {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [auction-processor] [${level.toUpperCase()}]`;
  if (level === "error") {
    console.error(`${prefix} ${message}`);
  } else if (level === "warn") {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export async function getEndedAuctions(): Promise<any[]> {
  const now = new Date();
  const graceTime = new Date(now.getTime() - GRACE_PERIOD_MS);
  
  const endedAuctions = await db
    .select()
    .from(listings)
    .where(
      and(
        eq(listings.isActive, true),
        eq(listings.saleType, "auction"),
        isNotNull(listings.auctionEndTime),
        lt(listings.auctionEndTime, graceTime)
      )
    );
  
  return endedAuctions;
}

export async function processEndedAuction(listing: any): Promise<AuctionResult> {
  const result: AuctionResult = {
    listingId: listing.id,
    listingTitle: listing.title,
    sellerId: listing.sellerId,
    winnerId: null,
    winnerName: null,
    winningBid: null,
    totalBids: 0,
    success: false,
  };

  try {
    const allBids = await db
      .select()
      .from(bids)
      .where(eq(bids.listingId, listing.id))
      .orderBy(desc(bids.amount));

    result.totalBids = allBids.length;

    if (allBids.length === 0) {
      await db
        .update(listings)
        .set({ isActive: false })
        .where(eq(listings.id, listing.id));

      if (listing.sellerId) {
        await storage.createNotification({
          userId: listing.sellerId,
          type: "auction_ended_no_bids",
          title: "انتهى المزاد بدون مزايدات",
          message: `انتهى المزاد على "${listing.title}" بدون أي مزايدات. يمكنك إعادة عرض المنتج.`,
          relatedId: listing.id,
        });
        sendPushNotification(listing.sellerId, {
          title: "انتهى المزاد بدون مزايدات",
          body: `انتهى المزاد على "${listing.title}" بدون أي مزايدات`,
          url: `/product/${listing.id}`,
          tag: `auction-${listing.id}`,
        });
      }

      log(`Auction ${listing.id} ended with no bids`, "info");
      result.success = true;
      
      broadcastAuctionEnd({
        listingId: listing.id,
        status: "no_bids",
        winnerId: null,
        winnerName: null,
        winningBid: null,
      });
      
      return result;
    }

    const highestBid = allBids[0];
    const winner = await storage.getUser(highestBid.userId);
    
    if (!winner) {
      throw new Error(`Winner user not found: ${highestBid.userId}`);
    }

    result.winnerId = winner.id;
    result.winnerName = winner.displayName || winner.phone;
    result.winningBid = highestBid.amount;

    await db
      .update(listings)
      .set({ 
        isActive: false,
        currentBid: highestBid.amount,
      })
      .where(eq(listings.id, listing.id));

    // Get shipping address from winning bid
    let deliveryAddress: string | undefined;
    let deliveryPhone: string | undefined;
    let deliveryCity: string | undefined;
    
    if (highestBid.shippingAddressId) {
      const shippingAddress = await storage.getBuyerAddressById(highestBid.shippingAddressId);
      if (shippingAddress) {
        deliveryAddress = `${shippingAddress.recipientName}\n${shippingAddress.addressLine1}${shippingAddress.district ? ` - ${shippingAddress.district}` : ''}${shippingAddress.notes ? `\n${shippingAddress.notes}` : ''}`;
        deliveryPhone = shippingAddress.phone;
        deliveryCity = shippingAddress.city;
      }
    }

    const [transaction] = await db
      .insert(transactions)
      .values({
        listingId: listing.id,
        buyerId: winner.id,
        sellerId: listing.sellerId,
        amount: highestBid.amount,
        status: "processing",
        deliveryAddress,
        deliveryPhone,
        deliveryCity,
      })
      .returning();

    await storage.createNotification({
      userId: winner.id,
      type: "auction_won",
      title: "مبروك! فزت بالمزاد 🎉",
      message: `فزت بالمزاد على "${listing.title}" بمبلغ ${highestBid.amount.toLocaleString("ar-IQ")} د.ع. سيتم شحن طلبك قريباً.`,
      relatedId: listing.id,
    });
    sendPushNotification(winner.id, {
      title: "مبروك! فزت بالمزاد 🎉",
      body: `فزت بالمزاد على "${listing.title}" بمبلغ ${highestBid.amount.toLocaleString("ar-IQ")} د.ع`,
      url: `/product/${listing.id}`,
      tag: `auction-won-${listing.id}`,
    });

    if (listing.sellerId) {
      await storage.createNotification({
        userId: listing.sellerId,
        type: "auction_sold",
        title: "تم بيع منتجك في المزاد! 🎉",
        message: `تهانينا! تم بيع "${listing.title}" بمبلغ ${highestBid.amount.toLocaleString("ar-IQ")} د.ع للمشتري ${winner.displayName || winner.phone}. يرجى شحن المنتج.`,
        relatedId: listing.id,
        linkUrl: "/seller-dashboard",
      });
      sendPushNotification(listing.sellerId, {
        title: "تم بيع منتجك في المزاد! 🎉",
        body: `تم بيع "${listing.title}" بمبلغ ${highestBid.amount.toLocaleString("ar-IQ")} د.ع`,
        url: "/seller-dashboard",
        tag: `auction-sold-${listing.id}`,
      });
    }

    const outbidUsers = new Set<string>();
    for (const bid of allBids.slice(1)) {
      if (bid.userId !== winner.id && !outbidUsers.has(bid.userId)) {
        outbidUsers.add(bid.userId);
        await storage.createNotification({
          userId: bid.userId,
          type: "auction_lost",
          title: "انتهى المزاد",
          message: `انتهى المزاد على "${listing.title}" ولم تفز. المزايدة الفائزة كانت ${highestBid.amount.toLocaleString("ar-IQ")} د.ع.`,
          relatedId: listing.id,
        });
        sendPushNotification(bid.userId, {
          title: "انتهى المزاد",
          body: `انتهى المزاد على "${listing.title}" ولم تفز`,
          url: `/product/${listing.id}`,
          tag: `auction-lost-${listing.id}`,
        });
      }
    }

    broadcastAuctionEnd({
      listingId: listing.id,
      status: "sold",
      winnerId: winner.id,
      winnerName: winner.displayName || winner.phone,
      winningBid: highestBid.amount,
    });

    log(`Auction ${listing.id} ended - Winner: ${winner.displayName || winner.phone}, Amount: ${highestBid.amount}`, "info");
    result.success = true;
    return result;

  } catch (error: any) {
    result.error = error.message;
    log(`Error processing auction ${listing.id}: ${error.message}`, "error");
    return result;
  }
}

export async function processAllEndedAuctions(): Promise<AuctionResult[]> {
  if (isProcessing) {
    log("Auction processor is already running, skipping this cycle", "warn");
    return [];
  }

  isProcessing = true;
  const results: AuctionResult[] = [];

  try {
    const endedAuctions = await getEndedAuctions();
    
    if (endedAuctions.length === 0) {
      isProcessing = false;
      return results;
    }

    log(`Found ${endedAuctions.length} ended auctions to process`, "info");

    for (const auction of endedAuctions) {
      try {
        const result = await processEndedAuction(auction);
        results.push(result);
      } catch (error: any) {
        log(`Failed to process auction ${auction.id}: ${error.message}`, "error");
        results.push({
          listingId: auction.id,
          listingTitle: auction.title,
          sellerId: auction.sellerId,
          winnerId: null,
          winnerName: null,
          winningBid: null,
          totalBids: 0,
          success: false,
          error: error.message,
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    log(`Processed ${results.length} auctions: ${successful} successful, ${failed} failed`, "info");

  } catch (error: any) {
    log(`Error in auction processor: ${error.message}`, "error");
  } finally {
    isProcessing = false;
  }

  return results;
}

export function startAuctionProcessor() {
  if (processorInterval) {
    log("Auction processor is already running", "warn");
    return;
  }

  log("Starting auction processor...", "info");
  
  setTimeout(() => {
    processAllEndedAuctions();
  }, 5000);

  processorInterval = setInterval(() => {
    processAllEndedAuctions();
  }, PROCESS_INTERVAL_MS);

  log(`Auction processor started, checking every ${PROCESS_INTERVAL_MS / 1000} seconds`, "info");
}

export function stopAuctionProcessor() {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    log("Auction processor stopped", "info");
  }
}

export function getProcessorStatus() {
  return {
    running: processorInterval !== null,
    isProcessing,
    intervalMs: PROCESS_INTERVAL_MS,
    gracePeriodMs: GRACE_PERIOD_MS,
  };
}
