import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";
import { returnRulesEngine } from "../../services/return-rules-engine";
import { returnRuleConditionsSchema } from "@shared/schema";
import type { InsertReturnRule } from "@shared/schema";

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
    const { conditions, action, name, description, priority } = req.body;
    
    // VALIDATE CONDITIONS BEFORE SAVING
    const validationResult = returnRuleConditionsSchema.safeParse(conditions);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid rule conditions format",
        details: validationResult.error.errors,
      });
    }
    
    const ruleData: InsertReturnRule = {
      name: name || `Rule ${Date.now()}`,
      description: description || null,
      priority: priority || 0,
      conditions: validationResult.data, // Type-safe validated data
      action: action || 'require_review',
      isActive: req.body.isActive !== false, // Default to true
      createdBy: adminUser.id,
    };
    
    // Validate action
    const validActions = ['auto_approve', 'auto_reject', 'require_review'];
    if (!validActions.includes(ruleData.action)) {
      return res.status(400).json({ 
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
      });
    }
    
    const rule = await storage.createReturnRule(ruleData);
    res.status(201).json(rule);
  } catch (error) {
    console.error("[AdminRules] Error creating rule:", error);
    res.status(500).json({ error: "Failed to create rule" });
  }
});

// Update rule
router.patch("/return-rules/:id", requireAdmin, async (req, res) => {
  try {
    const ruleId = req.params.id;
    const rules = await storage.getReturnRules(false);
    const existingRule = rules.find(r => r.id === ruleId);
    
    if (!existingRule) {
      return res.status(404).json({ error: "Rule not found" });
    }
    
    const updates: Partial<InsertReturnRule> = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.priority !== undefined) updates.priority = req.body.priority;
    if (req.body.action !== undefined) {
      const validActions = ['auto_approve', 'auto_reject', 'require_review'];
      if (!validActions.includes(req.body.action)) {
        return res.status(400).json({ 
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        });
      }
      updates.action = req.body.action;
    }
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    
    // Validate conditions if being updated
    if (req.body.conditions !== undefined) {
      const validationResult = returnRuleConditionsSchema.safeParse(req.body.conditions);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid rule conditions format",
          details: validationResult.error.errors,
        });
      }
      updates.conditions = validationResult.data;
    }
    
    const updatedRule = await storage.updateReturnRule(ruleId, updates);
    res.json(updatedRule);
  } catch (error) {
    console.error("[AdminRules] Error updating rule:", error);
    res.status(500).json({ error: "Failed to update rule" });
  }
});

// Test rule with sample data
router.post("/return-rules/:id/test", requireAdmin, async (req, res) => {
  try {
    const ruleId = req.params.id;
    const testData = req.body;
    
    const result = await returnRulesEngine.testRule(ruleId, testData);
    res.json(result);
  } catch (error) {
    console.error("[AdminRules] Error testing rule:", error);
    res.status(500).json({ error: "Failed to test rule" });
  }
});

// Delete rule (soft delete by setting isActive to false)
router.delete("/return-rules/:id", requireAdmin, async (req, res) => {
  try {
    const ruleId = req.params.id;
    const updatedRule = await storage.updateReturnRule(ruleId, { isActive: false });
    
    if (!updatedRule) {
      return res.status(404).json({ error: "Rule not found" });
    }
    
    res.json({ success: true, rule: updatedRule });
  } catch (error) {
    console.error("[AdminRules] Error deleting rule:", error);
    res.status(500).json({ error: "Failed to delete rule" });
  }
});

export { router as rulesRouter };
