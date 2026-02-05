import { storage } from "../storage";
import type { ReturnTemplate, InsertReturnTemplate } from "@shared/schema";

export class ReturnTemplateService {
  /**
   * Apply a template to create a return request configuration
   */
  async applyTemplate(templateId: string, overrides?: Partial<InsertReturnTemplate>): Promise<Partial<InsertReturnTemplate>> {
    const template = await storage.getReturnTemplates(true).then(templates => 
      templates.find(t => t.id === templateId)
    );
    
    if (!template) {
      throw new Error(`Template ${templateId} not found or inactive`);
    }
    
    return {
      reason: template.reason,
      autoApprove: template.autoApprove,
      requiresPhotos: template.requiresPhotos,
      notifyBuyer: template.notifyBuyer,
      ...overrides,
    };
  }
  
  /**
   * Get all active templates
   */
  async getActiveTemplates(): Promise<ReturnTemplate[]> {
    return storage.getReturnTemplates(true);
  }
  
  /**
   * Validate template data
   */
  validateTemplate(template: Partial<InsertReturnTemplate>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!template.name || template.name.trim().length === 0) {
      errors.push("Template name is required");
    }
    
    if (!template.reason || template.reason.trim().length === 0) {
      errors.push("Return reason is required");
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const returnTemplateService = new ReturnTemplateService();
