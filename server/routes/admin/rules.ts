import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";
import { returnRulesEngine } from "../../services/return-rules-engine";
import { returnRuleConditionsSchema } from "@shared/schema";

const router = Router();

// Get all rules
router.get("/return-rules", requireAdmin, async (req, res) => {
  try {
    const activeOnly = req.query.activeOnly === "true";
    const rules = await storage.getReturnRules(activeOnly);
    res.json(rules);
  } catch (error) {
    console.error("[AdminRules] Error fetching rules:", error);
    res.status(500).json({ error: "Failed to fetch rules" });
  }
});

// Get single rule
router.get("/return-rules/:id", requireAdmin, async (req, res) => {
  try {
    const rules = await storage.getReturnRules(false);
    const rule = rules.find(r => r.id === req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: "Rule not found" });
    }
    
    res.json(rule);
  } catch (error) {
    console.error("[AdminRules] Error fetching rule:", error);
    res.status(500).json({ error: "Failed to fetch rule" });
  }
});

// Create rule
router.post("/return-rules", requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser;
    const { name, description, priority, conditions, action, isActive } = req.body;
    
    // Validate conditions with Zod schema
    const validationResult = returnRuleConditionsSchema.safeParse(conditions);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid rule conditions format",
        details: validationResult.error.errors,
      });
    }
    
    // Validate action
    if (!['auto_approve', 'auto_reject', 'require_review'].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be: auto_approve, auto_reject, or require_review" });
    }
    
    const rule = await storage.createReturnRule({
      name,
      description: description || null,
      priority: priority || 0,
      conditions: validationResult.data,
      action,
      isActive: isActive !== false, // Default true
      createdBy: adminUser.id,
    });
    
    res.status(201).json(rule);
  } catch (error) {
    console.error("[AdminRules] Error creating rule:", error);
    res.status(500).json({ error: "Failed to create rule" });
  }
});

// Update rule
router.patch("/return-rules/:id", requireAdmin, async (req, res) => {
  try {
    const { name, description, priority, conditions, action, isActive } = req.body;
    
    // Validate conditions if provided
    if (conditions) {
      const validationResult = returnRuleConditionsSchema.safeParse(conditions);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid rule conditions format",
          details: validationResult.error.errors,
        });
      }
      
      // Update with validated conditions
      const updated = await storage.updateReturnRule(req.params.id, {
        name,
        description,
        priority,
        conditions: validationResult.data,
        action,
        isActive,
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Rule not found" });
      }
      
      return res.json(updated);
    }
    
    // Update without conditions
    const updated = await storage.updateReturnRule(req.params.id, {
      name,
      description,
      priority,
      action,
      isActive,
    });
    
    if (!updated) {
      return res.status(404).json({ error: "Rule not found" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("[AdminRules] Error updating rule:", error);
    res.status(500).json({ error: "Failed to update rule" });
  }
});

// Test rule
router.post("/return-rules/:id/test", requireAdmin, async (req, res) => {
  try {
    const { testData } = req.body;
    
    const result = await returnRulesEngine.testRule(req.params.id, testData);
    res.json(result);
  } catch (error) {
    console.error("[AdminRules] Error testing rule:", error);
    res.status(500).json({ error: "Failed to test rule" });
  }
});

export { router as rulesRouter };
