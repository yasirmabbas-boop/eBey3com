import type { Express } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";

const router = Router();

router.get("/reports", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;
    
    const { reports: paginatedReports, total } = await storage.getReportsPaginatedWithDetails({ limit, offset });
    
    res.json({ 
      reports: paginatedReports, 
      pagination: { 
        page, 
        limit, 
        total, 
        hasMore: offset + limit < total,
        totalPages: Math.ceil(total / limit)
      } 
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// Legacy endpoint for backward compatibility (if needed)
router.get("/reports/legacy", requireAdmin, async (req, res) => {
  try {
    const reports = await storage.getAllReports();
    const enrichedReports = await Promise.all(
      reports.map(async (report: any) => {
        const [reporter, listing] = await Promise.all([
          storage.getUser(report.reporterId),
          report.targetType === "listing" ? storage.getListing(report.targetId) : null,
        ]);
        
        let seller = null;
        if (listing?.sellerId) {
          seller = await storage.getUser(listing.sellerId);
        }
        
        const listingReports = report.targetType === "listing" 
          ? await storage.getReportsForListing(report.targetId)
          : [];
        
        return {
          ...report,
          reporterName: reporter?.displayName || "Unknown",
          reporterPhone: reporter?.phone,
          listingTitle: listing?.title,
          listingImage: listing?.images?.[0],
          listingPrice: listing?.price,
          sellerId: listing?.sellerId,
          sellerName: seller?.displayName || listing?.sellerName || seller?.username || "بائع غير معروف",
          totalReportsOnTarget: listingReports.length,
          pendingReportsOnTarget: listingReports.filter((r: any) => r.status === "pending").length,
        };
      })
    );
    res.json(enrichedReports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.post("/reports/:id/resolve", requireAdmin, async (req, res) => {
  try {
    const { action, adminNotes } = req.body;
    const adminUser = (req as any).adminUser;
    
    const report = await storage.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    await storage.updateReportStatus(
      req.params.id,
      action === "dismiss" ? "dismissed" : "resolved",
      adminNotes,
      adminUser.id
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error resolving report:", error);
    res.status(500).json({ error: "Failed to resolve report" });
  }
});

export { router as reportsRouter };
