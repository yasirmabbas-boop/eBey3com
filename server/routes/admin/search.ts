import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";

const router = Router();

router.get("/search/by-code", requireAdmin, async (req, res) => {
  const { code, type } = req.query; 
  
  if (!code) {
    return res.status(400).json({ error: "Code parameter required" });
  }
  
  const codeStr = code as string;
  
  try {
    // If type specified, search only that type
    if (type === "product") {
      const result = await storage.searchProductByCode(codeStr);
      return res.json({ type: "product", result: result || null });
    }
    if (type === "user") {
      const result = await storage.searchUserByAccountCode(codeStr);
      return res.json({ type: "user", result: result || null });
    }
    if (type === "transaction") {
      const result = await storage.searchTransactionById(codeStr);
      return res.json({ type: "transaction", result: result || null });
    }
    
    // Otherwise search all types
    const results = await storage.searchByCode(codeStr);
    res.json(results);
  } catch (error) {
    console.error("[AdminSearch] Error searching by code:", error);
    res.status(500).json({ error: "Failed to search" });
  }
});

export { router as searchRouter };
