import { storage } from "../storage";
import type { ReturnTemplate, InsertReturnTemplate } from "@shared/schema";

export class ReturnTemplateService {
  /**
   * Apply a template to create a return request configuration
   */
  async applyTemplate(templateId: string, transactionId: string): Promise<{
    reason: string;
    details: string | null;
    autoApprove: boolean;
    requiresPhotos: boolean;
    notifyBuyer: boolean;
  }> {
    const template = await storage.getReturnTemplates(false).then(templates => 
      templates.find(t => t.id === templateId)
    );
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    if (!template.isActive) {
      throw new Error(`Template ${templateId} is not active`);
    }
    
    return {
      reason: template.reason,
      details: template.description || null,
      autoApprove: template.autoApprove || false,
      requiresPhotos: template.requiresPhotos || false,
      notifyBuyer: template.notifyBuyer !== false, // Default to true
    };
  }
  
  /**
   * Get all active templates
   */
  async getActiveTemplates(): Promise<ReturnTemplate[]> {
    return storage.getReturnTemplates(true);
  }
  
  /**
   * Validate template configuration
   */
  validateTemplate(template: Partial<InsertReturnTemplate>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!template.name || template.name.trim().length === 0) {
      errors.push("Template name is required");
    }
    
    if (!template.reason || template.reason.trim().length === 0) {
      errors.push("Return reason is required");
    }
    
    const validReasons = [
      'damaged',
      'different_from_description',
      'missing_parts',
      'changed_mind',
      'found_cheaper',
      'quality_issue',
      'wrong_item',
      'defective',
      'other'
    ];
    
    if (template.reason && !validReasons.includes(template.reason)) {
      errors.push(`Invalid reason. Must be one of: ${validReasons.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const returnTemplateService = new ReturnTemplateService();
