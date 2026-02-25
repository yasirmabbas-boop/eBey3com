import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";

const router = Router();

// Get all return requests with pagination
router.get("/returns", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    
    const { returns, total } = await storage.getReturnRequestsWithDetails({
      limit,
      offset,
      status,
    });
    
    // Enrich with transaction and listing details
    const enrichedReturns = await Promise.all(
      returns.map(async (returnReq: any) => {
        const [transaction, listing, buyer, seller] = await Promise.all([
          storage.getTransactionById(returnReq.transactionId),
          storage.getListing(returnReq.listingId),
          storage.getUser(returnReq.buyerId),
          storage.getUser(returnReq.sellerId),
        ]);
        
        return {
          ...returnReq,
          transaction: transaction ? {
            id: transaction.id,
            amount: transaction.amount,
            status: transaction.status,
            completedAt: transaction.completedAt,
          } : null,
          listing: listing ? {
            id: listing.id,
            title: listing.title,
            productCode: listing.productCode,
            price: listing.price,
            category: listing.category,
            image: listing.images?.[0] || null,
          } : null,
          buyer: buyer ? {
            id: buyer.id,
            displayName: buyer.displayName,
            accountCode: buyer.accountCode,
            phone: buyer.phone,
          } : null,
          seller: seller ? {
            id: seller.id,
            displayName: seller.displayName,
            accountCode: seller.accountCode,
            phone: seller.phone,
          } : null,
        };
      })
    );
    
    res.json({
      returns: enrichedReturns,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[AdminReturns] Error fetching returns:", error);
    res.status(500).json({ error: "Failed to fetch return requests" });
  }
});

// Admin-initiated return request
router.post("/returns", requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser;
    const { transactionId, reason, details, templateId, overridePolicy } = req.body;
    
    if (!transactionId || !reason) {
      return res.status(400).json({ 
        error: "Transaction ID and reason are required",
        code: "MISSING_REQUIRED_FIELDS"
      });
    }
    
    // Get transaction
    const transaction = await storage.getTransactionById(transactionId);
    if (!transaction) {
      return res.status(404).json({ 
        error: `Transaction not found: ${transactionId}`,
        code: "TRANSACTION_NOT_FOUND",
        transactionId 
      });
    }
    
    // Check if return request already exists
    const existingRequest = await storage.getReturnRequestByTransaction(transactionId);
    if (existingRequest) {
      return res.status(400).json({ 
        error: `Return request already exists for transaction ${transactionId}. Return ID: ${existingRequest.id}`,
        code: "RETURN_ALREADY_EXISTS",
        transactionId,
        returnRequestId: existingRequest.id
      });
    }
    
    // Get listing for category and price
    const listing = await storage.getListing(transaction.listingId);
    if (!listing) {
      return res.status(404).json({ 
        error: `Listing not found: ${transaction.listingId} (for transaction ${transactionId})`,
        code: "LISTING_NOT_FOUND",
        transactionId,
        listingId: transaction.listingId
      });
    }
    
    // Admin can override return policy restrictions
    let returnPolicyDays = 0;
    if (!overridePolicy) {
      // Check normal return policy
      const returnPolicy = (listing as any).returnPolicy || "لا يوجد إرجاع";
      if (returnPolicy === "يوم واحد") returnPolicyDays = 1;
      else if (returnPolicy === "3 أيام") returnPolicyDays = 3;
      else if (returnPolicy === "7 أيام") returnPolicyDays = 7;
      else if (returnPolicy === "14 يوم") returnPolicyDays = 14;
      else if (returnPolicy === "30 يوم") returnPolicyDays = 30;
      else if (returnPolicy === "استبدال فقط") returnPolicyDays = 7;
      
      // Check if within return policy period (unless quality issue)
      const isQualityIssue = ["damaged", "different_from_description", "missing_parts"].includes(reason);
      if (!isQualityIssue && returnPolicyDays === 0) {
        return res.status(400).json({ 
          error: `Product "${listing.title}" (ID: ${listing.id}) has no return policy. Use overridePolicy=true to bypass`,
          code: "NO_RETURN_POLICY",
          transactionId,
          listingId: listing.id,
          listingTitle: listing.title
        });
      }
    }
    
    // Create return request with admin fields
    let returnRequest;
    try {
      returnRequest = await storage.createReturnRequest({
        transactionId,
        buyerId: transaction.buyerId,
        sellerId: transaction.sellerId,
        listingId: transaction.listingId,
        reason,
        details: details || null,
        adminInitiatedBy: adminUser.id,
        templateId: templateId || null,
        category: listing.category || null,
        listingPrice: listing.price || null,
      } as any);
    } catch (dbError: any) {
      console.error("[AdminReturns] Database error creating return request:", dbError);
      
      // Check for common database errors
      const errorMessage = dbError?.message || String(dbError);
      if (errorMessage.includes("does not exist") || errorMessage.includes("relation") || errorMessage.includes("table")) {
        return res.status(500).json({ 
          error: "Database table not found. Please run migration 0030_add_return_management_system.sql",
          code: "DATABASE_MIGRATION_REQUIRED",
          transactionId
        });
      }
      if (errorMessage.includes("violates") || errorMessage.includes("constraint")) {
        return res.status(400).json({ 
          error: `Database constraint violation: ${errorMessage}`,
          code: "DATABASE_CONSTRAINT_ERROR",
          transactionId
        });
      }
      
      // Generic database error
      return res.status(500).json({ 
        error: `Database error: ${errorMessage}`,
        code: "DATABASE_ERROR",
        transactionId
      });
    }
    
    // Lock payout permission immediately
    try {
      const { payoutPermissionService } = await import("../../services/payout-permission-service");
      await payoutPermissionService.lockPermissionForReturn(transactionId, returnRequest.id);
      console.log(`[AdminReturn] Payout permission LOCKED for transaction: ${transactionId}`);
    } catch (lockError) {
      console.error(`[AdminReturn] Failed to lock payout permission: ${lockError}`);
    }
    
    // Notify buyer
    try {
      await storage.createNotification({
        userId: transaction.buyerId,
        type: "return_requested",
        title: "طلب إرجاع جديد",
        message: `تم إنشاء طلب إرجاع لطلبك "${listing.title}"`,
        linkUrl: `/buyer-dashboard?tab=returns`,
        relatedId: returnRequest.id,
      });
    } catch (notifError) {
      console.error("[AdminReturn] Failed to notify buyer:", notifError);
    }
    
    res.status(201).json({
      success: true,
      returnRequest,
    });
  } catch (error: any) {
    console.error("[AdminReturns] Error creating return request:", error);
    const errorMessage = error?.message || String(error);
    const transactionId = req.body?.transactionId || "unknown";
    
    res.status(500).json({ 
      error: `Failed to create return request: ${errorMessage}`,
      code: "INTERNAL_SERVER_ERROR",
      transactionId
    });
  }
});

// Update return request (admin override)
router.patch("/returns/:id", requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser;
    const returnId = req.params.id;
    const updates = req.body;

    const returnRequest = await storage.getReturnRequestById(returnId);
    if (!returnRequest) {
      return res.status(404).json({ error: "Return request not found" });
    }

    const oldStatus = returnRequest.status;

    // Add admin notes if status is being changed
    if (updates.status && updates.status !== oldStatus) {
      updates.adminNotes = updates.adminNotes || `Status changed from ${oldStatus} to ${updates.status} by admin`;
      updates.processedBy = adminUser.id;
      updates.processedAt = new Date();
    }

    const updated = await storage.updateReturnRequestByAdmin(returnId, updates);

    // Handle payout permission changes on status override
    if (updates.status && updates.status !== oldStatus) {
      try {
        const { payoutPermissionService } = await import("../../services/payout-permission-service");

        if (updates.status === "approved" && (oldStatus === "rejected" || oldStatus === "escalated")) {
          // Admin overriding rejection/escalation → lock payout for refund processing
          await payoutPermissionService.lockPermissionForReturn(returnRequest.transactionId, returnId);
          console.log(`[AdminReturns] Payout permission LOCKED (admin override to approved) for transaction: ${returnRequest.transactionId}`);
        } else if (updates.status === "rejected" && (oldStatus === "escalated" || oldStatus === "approved" || oldStatus === "pending")) {
          // Admin rejecting → unlock payout so seller can get paid
          await payoutPermissionService.unlockPermission(
            returnRequest.transactionId,
            `Admin rejected return request ${returnId}: ${updates.adminNotes || "No reason"}`
          );
          console.log(`[AdminReturns] Payout permission UNLOCKED (admin rejected) for transaction: ${returnRequest.transactionId}`);
        }
      } catch (payoutError) {
        console.error(`[AdminReturns] Failed to update payout permission: ${payoutError}`);
      }

      // Notify buyer of admin decision
      try {
        const listing = await storage.getListing(returnRequest.listingId);
        const listingTitle = (listing as any)?.title || "المنتج";

        if (updates.status === "approved") {
          await storage.createNotification({
            userId: returnRequest.buyerId,
            type: "return_approved",
            title: "الإدارة وافقت على طلب الإرجاع",
            message: `وافقت الإدارة على إرجاع "${listingTitle}". سيتم معالجة المبلغ المسترجع قريباً.`,
            linkUrl: `/buyer-dashboard?tab=returns&returnId=${returnId}`,
            relatedId: returnId,
          });
        } else if (updates.status === "rejected") {
          await storage.createNotification({
            userId: returnRequest.buyerId,
            type: "return_rejected",
            title: "الإدارة رفضت طلب الإرجاع",
            message: `بعد المراجعة، تم رفض طلب إرجاع "${listingTitle}". ${updates.adminNotes || ""}`,
            linkUrl: `/buyer-dashboard?tab=returns&returnId=${returnId}`,
            relatedId: returnId,
          });
        }
      } catch (notifError) {
        console.error("[AdminReturns] Failed to notify buyer:", notifError);
      }
    }

    res.json({
      success: true,
      returnRequest: updated,
    });
  } catch (error) {
    console.error("[AdminReturns] Error updating return request:", error);
    res.status(500).json({ error: "Failed to update return request" });
  }
});

// Get single return request with full details
router.get("/returns/:id", requireAdmin, async (req, res) => {
  try {
    const returnId = req.params.id;
    const returnRequest = await storage.getReturnRequestById(returnId);
    
    if (!returnRequest) {
      return res.status(404).json({ error: "Return request not found" });
    }
    
    // Enrich with all related data
    const [transaction, listing, buyer, seller] = await Promise.all([
      storage.getTransactionById(returnRequest.transactionId),
      storage.getListing(returnRequest.listingId),
      storage.getUser(returnRequest.buyerId),
      storage.getUser(returnRequest.sellerId),
    ]);
    
    res.json({
      returnRequest: {
        ...returnRequest,
        transaction,
        listing,
        buyer,
        seller,
      },
    });
  } catch (error) {
    console.error("[AdminReturns] Error fetching return request:", error);
    res.status(500).json({ error: "Failed to fetch return request" });
  }
});

export { router as returnsRouter };
