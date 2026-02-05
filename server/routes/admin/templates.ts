import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";
import { returnTemplateService } from "../../services/return-template-service";
import { returnRuleConditionsSchema } from "@shared/schema";
import type { InsertReturnTemplate } from "@shared/schema";

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
    const templateData: InsertReturnTemplate = {
      name: req.body.name,
      reason: req.body.reason,
      description: req.body.description || null,
      autoApprove: req.body.autoApprove || false,
      requiresPhotos: req.body.requiresPhotos || false,
      notifyBuyer: req.body.notifyBuyer !== false, // Default to true
      createdBy: adminUser.id,
      isActive: req.body.isActive !== false, // Default to true
    };
    
    // Validate template
    const validation = returnTemplateService.validateTemplate(templateData);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: "Invalid template data",
        errors: validation.errors,
      });
    }
    
    const template = await storage.createReturnTemplate(templateData);
    res.status(201).json(template);
  } catch (error) {
    console.error("[AdminTemplates] Error creating template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
});

// Update template
router.patch("/return-templates/:id", requireAdmin, async (req, res) => {
  try {
    const templateId = req.params.id;
    const templates = await storage.getReturnTemplates(false);
    const existingTemplate = templates.find(t => t.id === templateId);
    
    if (!existingTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const updates: Partial<InsertReturnTemplate> = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.reason !== undefined) updates.reason = req.body.reason;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.autoApprove !== undefined) updates.autoApprove = req.body.autoApprove;
    if (req.body.requiresPhotos !== undefined) updates.requiresPhotos = req.body.requiresPhotos;
    if (req.body.notifyBuyer !== undefined) updates.notifyBuyer = req.body.notifyBuyer;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    
    // Validate if reason is being updated
    if (updates.reason) {
      const validation = returnTemplateService.validateTemplate(updates);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: "Invalid template data",
          errors: validation.errors,
        });
      }
    }
    
    const updatedTemplate = await storage.updateReturnTemplate(templateId, updates);
    res.json(updatedTemplate);
  } catch (error) {
    console.error("[AdminTemplates] Error updating template:", error);
    res.status(500).json({ error: "Failed to update template" });
  }
});

// Delete template (soft delete by setting isActive to false)
router.delete("/return-templates/:id", requireAdmin, async (req, res) => {
  try {
    const templateId = req.params.id;
    const updatedTemplate = await storage.updateReturnTemplate(templateId, { isActive: false });
    
    if (!updatedTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    res.json({ success: true, template: updatedTemplate });
  } catch (error) {
    console.error("[AdminTemplates] Error deleting template:", error);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

export { router as templatesRouter };
