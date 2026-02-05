import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";
import { returnTemplateService } from "../../services/return-template-service";
import { returnRuleConditionsSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all templates
router.get("/return-templates", requireAdmin, async (req, res) => {
  try {
    const activeOnly = req.query.activeOnly === "true";
    const templates = await storage.getReturnTemplates(activeOnly);
    res.json(templates);
  } catch (error) {
    console.error("[AdminTemplates] Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// Get single template
router.get("/return-templates/:id", requireAdmin, async (req, res) => {
  try {
    const templates = await storage.getReturnTemplates(false);
    const template = templates.find(t => t.id === req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    res.json(template);
  } catch (error) {
    console.error("[AdminTemplates] Error fetching template:", error);
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

// Create template
router.post("/return-templates", requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser;
    const { name, reason, description, autoApprove, requiresPhotos, notifyBuyer, isActive } = req.body;
    
    // Validate
    const validation = returnTemplateService.validateTemplate({
      name,
      reason,
      description,
      autoApprove,
      requiresPhotos,
      notifyBuyer,
    });
    
    if (!validation.valid) {
      return res.status(400).json({ error: "Validation failed", details: validation.errors });
    }
    
    const template = await storage.createReturnTemplate({
      name,
      reason,
      description: description || null,
      autoApprove: autoApprove || false,
      requiresPhotos: requiresPhotos || false,
      notifyBuyer: notifyBuyer !== false, // Default true
      createdBy: adminUser.id,
      isActive: isActive !== false, // Default true
    });
    
    res.status(201).json(template);
  } catch (error) {
    console.error("[AdminTemplates] Error creating template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
});

// Update template
router.patch("/return-templates/:id", requireAdmin, async (req, res) => {
  try {
    const { name, reason, description, autoApprove, requiresPhotos, notifyBuyer, isActive } = req.body;
    
    // Validate if name/reason are being updated
    if (name || reason) {
      const validation = returnTemplateService.validateTemplate({
        name: name || undefined,
        reason: reason || undefined,
      });
      
      if (!validation.valid) {
        return res.status(400).json({ error: "Validation failed", details: validation.errors });
      }
    }
    
    const updated = await storage.updateReturnTemplate(req.params.id, {
      name,
      reason,
      description,
      autoApprove,
      requiresPhotos,
      notifyBuyer,
      isActive,
    });
    
    if (!updated) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("[AdminTemplates] Error updating template:", error);
    res.status(500).json({ error: "Failed to update template" });
  }
});

export { router as templatesRouter };
