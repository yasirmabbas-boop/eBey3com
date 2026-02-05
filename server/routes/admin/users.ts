import type { Express } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";
import { isEligibleForBlueCheck } from "../shared";

const router = Router();

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    const enrichedUsers = users.map((user: any) => ({
      id: user.id,
      phone: user.phone,
      email: user.email,
      displayName: user.displayName,
      accountCode: user.accountCode,
      sellerApproved: user.sellerApproved,
      sellerRequestStatus: user.sellerRequestStatus,
      isAdmin: user.isAdmin,
      isBanned: user.isBanned,
      isAuthenticated: user.isAuthenticated,
      authenticityGuaranteed: user.authenticityGuaranteed,
      totalSales: user.totalSales || 0,
      totalPurchases: user.totalPurchases || 0,
      rating: user.rating || 0,
      ratingCount: user.ratingCount || 0,
      buyerRating: user.buyerRating || 0,
      buyerRatingCount: user.buyerRatingCount || 0,
      createdAt: user.createdAt,
      eligibleForBlueCheck: isEligibleForBlueCheck(user),
    }));
    res.json(enrichedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users/:id/ban", requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    await storage.updateUser(req.params.id, {
      isBanned: true,
      banReason: reason,
      bannedAt: new Date(),
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({ error: "Failed to ban user" });
  }
});

router.post("/users/:id/unban", requireAdmin, async (req, res) => {
  try {
    await storage.updateUser(req.params.id, {
      isBanned: false,
      banReason: null,
      bannedAt: null,
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).json({ error: "Failed to unban user" });
  }
});

router.post("/users/:id/approve-seller", requireAdmin, async (req, res) => {
  try {
    await storage.updateUser(req.params.id, {
      sellerRequestStatus: "approved",
      sellerApprovalDate: new Date(),
    } as any);
    res.json({ success: true });
  } catch (error) {
    console.error("Error approving seller:", error);
    res.status(500).json({ error: "Failed to approve seller" });
  }
});

router.post("/users/:id/revoke-seller", requireAdmin, async (req, res) => {
  try {
    await storage.updateUser(req.params.id, {
      sellerRequestStatus: "none",
    } as any);
    res.json({ success: true });
  } catch (error) {
    console.error("Error revoking seller:", error);
    res.status(500).json({ error: "Failed to revoke seller" });
  }
});

router.post("/users/:id/grant-admin", requireAdmin, async (req, res) => {
  try {
    await storage.updateUser(req.params.id, { isAdmin: true });
    res.json({ success: true });
  } catch (error) {
    console.error("Error granting admin:", error);
    res.status(500).json({ error: "Failed to grant admin" });
  }
});

router.post("/users/:id/revoke-admin", requireAdmin, async (req, res) => {
  try {
    await storage.updateUser(req.params.id, { isAdmin: false });
    res.json({ success: true });
  } catch (error) {
    console.error("Error revoking admin:", error);
    res.status(500).json({ error: "Failed to revoke admin" });
  }
});

router.post("/users/:id/verify", requireAdmin, async (req, res) => {
  try {
    await storage.updateUser(req.params.id, { isAuthenticated: true });
    res.json({ success: true });
  } catch (error) {
    console.error("Error verifying user:", error);
    res.status(500).json({ error: "Failed to verify user" });
  }
});

router.post("/users/:id/unverify", requireAdmin, async (req, res) => {
  try {
    await storage.updateUser(req.params.id, { isAuthenticated: false });
    res.json({ success: true });
  } catch (error) {
    console.error("Error unverifying user:", error);
    res.status(500).json({ error: "Failed to unverify user" });
  }
});

router.post("/users/:id/grant-authenticity", requireAdmin, async (req, res) => {
  try {
    await storage.updateUser(req.params.id, { authenticityGuaranteed: true });
    res.json({ success: true });
  } catch (error) {
    console.error("Error granting authenticity:", error);
    res.status(500).json({ error: "Failed to grant authenticity" });
  }
});

router.post("/users/:id/revoke-authenticity", requireAdmin, async (req, res) => {
  try {
    await storage.updateUser(req.params.id, { authenticityGuaranteed: false });
    res.json({ success: true });
  } catch (error) {
    console.error("Error revoking authenticity:", error);
    res.status(500).json({ error: "Failed to revoke authenticity" });
  }
});

router.post("/users/:id/reset-password", requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await storage.updateUser(req.params.id, { password: hashedPassword });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export { router as usersRouter };
