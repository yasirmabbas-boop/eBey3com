import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";

const router = Router();

// Get all return requests with pagination and filtering
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
    const { transactionId, reason, details, templateId, overrideRestrictions } = req.body;
    
    if (!transactionId || !reason) {
      return res.status(400).json({ error: "Transaction ID and reason are required" });
    }
    
    // Get transaction
    const transaction = await storage.getTransactionById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    // Get listing
    const listing = await storage.getListing(transaction.listingId);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }
    
    // Check if return already exists
    const existingReturn = await storage.getReturnRequestByTransaction(transactionId);
    if (existingReturn) {
      return res.status(400).json({ 
        error: "Return request already exists for this transaction",
        returnRequest: existingReturn,
      });
    }
    
    // Admin can override restrictions if overrideRestrictions is true
    if (!overrideRestrictions) {
      // Check return policy (same logic as buyer-initiated)
      const returnPolicyDays = (listing as any).returnPolicyDays || 0;
      const deliveredAt = transaction.completedAt || transaction.createdAt;
      const daysSinceDelivery = Math.floor((Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24));
      
      const isQualityIssue = ["damaged", "different_from_description", "missing_parts"].includes(reason);
      
      if (!isQualityIssue && returnPolicyDays === 0) {
        return res.status(400).json({ 
          error: "This product does not accept returns. Set overrideRestrictions=true to bypass.",
        });
      }
      
      if (!isQualityIssue && daysSinceDelivery > returnPolicyDays) {
        return res.status(400).json({ 
          error: `Return period expired (${returnPolicyDays} days). Set overrideRestrictions=true to bypass.`,
        });
      }
    }
    
    // Create return request with admin fields
    const returnRequest = await storage.createReturnRequest({
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
    
    // Lock payout permission (same as buyer-initiated)
    try {
      const { payoutPermissionService } = await import("../../services/payout-permission-service");
      await payoutPermissionService.lockPermissionForReturn(transactionId, returnRequest.id);
      console.log(`[AdminReturn] Payout permission LOCKED for transaction: ${transactionId}`);
    } catch (lockError) {
      console.error(`[AdminReturn] Failed to lock payout permission: ${lockError}`);
    }
    
    // Notify seller
    try {
      await storage.createNotification({
        userId: transaction.sellerId,
        type: "return_request",
        title: "طلب إرجاع جديد (من الإدارة)",
        message: `تم إنشاء طلب إرجاع من قبل الإدارة للمنتج "${(listing as any).title}"`,
        linkUrl: `/seller-dashboard?tab=returns&returnId=${returnRequest.id}`,
        relatedId: returnRequest.id,
      });
    } catch (notifError) {
      console.error("[AdminReturn] Failed to send seller notification:", notifError);
    }
    
    // Notify buyer
    try {
      await storage.createNotification({
        userId: transaction.buyerId,
        type: "return_request",
        title: "تم إنشاء طلب إرجاع",
        message: `تم إنشاء طلب إرجاع للمنتج "${(listing as any).title}" من قبل الإدارة`,
        linkUrl: `/buyer-dashboard?tab=returns&returnId=${returnRequest.id}`,
        relatedId: returnRequest.id,
      });
    } catch (notifError) {
      console.error("[AdminReturn] Failed to send buyer notification:", notifError);
    }
    
    res.status(201).json({
      success: true,
      returnRequest,
    });
  } catch (error) {
    console.error("[AdminReturns] Error creating admin return:", error);
    res.status(500).json({ error: "Failed to create return request" });
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
    
    // Admin can update any field
    const updatedReturn = await storage.updateReturnRequestByAdmin(returnId, {
      ...updates,
      adminNotes: updates.adminNotes || returnRequest.adminNotes,
    });
    
    res.json({
      success: true,
      returnRequest: updatedReturn,
    });
  } catch (error) {
    console.error("[AdminReturns] Error updating return:", error);
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
    
    // Enrich with full details
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
    console.error("[AdminReturns] Error fetching return:", error);
    res.status(500).json({ error: "Failed to fetch return request" });
  }
});

export { router as returnsRouter };
