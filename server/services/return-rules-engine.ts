import { storage } from "../storage";
import type { ReturnRule, ReturnRuleConditions } from "@shared/schema";
import { returnRuleConditionsSchema } from "@shared/schema";

export interface ReturnEvaluationContext {
  id: string;
  transactionId: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  reason: string;
  transactionAmount?: number;
  listingCategory?: string | null;
  sellerRating?: number;
  daysAfterDelivery?: number;
}

export interface RuleEvaluationResult {
  action: 'auto_approve' | 'auto_reject' | 'require_review';
  rule: ReturnRule;
  confidence: number;
  matchedConditions: string[];
}

export class ReturnRulesEngine {
  /**
   * Evaluate a return request against all active rules
   * Returns the highest priority matching rule's action
   */
  async evaluateReturn(context: ReturnEvaluationContext): Promise<RuleEvaluationResult | null> {
    try {
      // Get all active rules sorted by priority (highest first)
      const rules = await this.getPrioritizedRules();
      
      if (rules.length === 0) {
        return null; // No rules configured
      }
      
      // Evaluate each rule in priority order
      for (const rule of rules) {
        const matches = this.matchesConditions(context, rule.conditions);
        
        if (matches) {
          return {
            action: rule.action as 'auto_approve' | 'auto_reject' | 'require_review',
            rule,
            confidence: 1.0,
            matchedConditions: this.getMatchedConditionNames(context, rule.conditions),
          };
        }
      }
      
      // No rules matched - require review
      return null;
    } catch (error) {
      console.error("[ReturnRulesEngine] Error evaluating return:", error);
      // Fail-safe: return null to require manual review
      return null;
    }
  }
  
  /**
   * Test a rule against sample data
   */
  async testRule(ruleId: string, testData: ReturnEvaluationContext): Promise<{
    matches: boolean;
    matchedConditions: string[];
  }> {
    const rules = await storage.getReturnRules(false);
    const rule = rules.find(r => r.id === ruleId);
    
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }
    
    const matches = this.matchesConditions(testData, rule.conditions);
    return {
      matches,
      matchedConditions: matches ? this.getMatchedConditionNames(testData, rule.conditions) : [],
    };
  }
  
  /**
   * Check if return request matches rule conditions
   */
  private matchesConditions(context: ReturnEvaluationContext, conditions: ReturnRuleConditions): boolean {
    const operator = conditions.operator || 'AND';
    const checks: boolean[] = [];
    
    // Reason check
    if (conditions.reasons && conditions.reasons.length > 0) {
      checks.push(conditions.reasons.includes(context.reason as any));
    }
    
    // Price range check
    if (conditions.priceRange) {
      const amount = context.transactionAmount || 0;
      const min = conditions.priceRange.min ?? 0;
      const max = conditions.priceRange.max ?? Infinity;
      checks.push(amount >= min && amount <= max);
    }
    
    // Seller rating check
    if (conditions.sellerRatingMin !== undefined || conditions.sellerRatingMax !== undefined) {
      const rating = context.sellerRating || 0;
      const min = conditions.sellerRatingMin ?? 0;
      const max = conditions.sellerRatingMax ?? 5;
      checks.push(rating >= min && rating <= max);
    }
    
    // Days after delivery check
    if (conditions.daysAfterDeliveryMin !== undefined || conditions.daysAfterDeliveryMax !== undefined) {
      const days = context.daysAfterDelivery || 0;
      const min = conditions.daysAfterDeliveryMin ?? 0;
      const max = conditions.daysAfterDeliveryMax ?? Infinity;
      checks.push(days >= min && days <= max);
    }
    
    // Category check
    if (conditions.categories && conditions.categories.length > 0) {
      const category = context.listingCategory || '';
      checks.push(conditions.categories.includes(category));
    }
    
    // Buyer criteria (if we have buyer data)
    // Note: buyerMinPurchases and buyerMinRating would require additional context
    
    // Apply operator
    if (operator === 'AND') {
      return checks.length > 0 && checks.every(check => check === true);
    } else {
      return checks.some(check => check === true);
    }
  }
  
  /**
   * Get prioritized active rules
   */
  private async getPrioritizedRules(): Promise<ReturnRule[]> {
    const rules = await storage.getReturnRules(true); // activeOnly = true
    return rules.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Get names of matched conditions for logging
   */
  private getMatchedConditionNames(context: ReturnEvaluationContext, conditions: ReturnRuleConditions): string[] {
    const matched: string[] = [];
    
    if (conditions.reasons && conditions.reasons.includes(context.reason as any)) {
      matched.push(`reason:${context.reason}`);
    }
    
    if (conditions.priceRange && context.transactionAmount) {
      const amount = context.transactionAmount;
      const min = conditions.priceRange.min ?? 0;
      const max = conditions.priceRange.max ?? Infinity;
      if (amount >= min && amount <= max) {
        matched.push(`price:${amount}`);
      }
    }
    
    if (conditions.sellerRatingMin !== undefined || conditions.sellerRatingMax !== undefined) {
      const rating = context.sellerRating || 0;
      const min = conditions.sellerRatingMin ?? 0;
      const max = conditions.sellerRatingMax ?? 5;
      if (rating >= min && rating <= max) {
        matched.push(`sellerRating:${rating}`);
      }
    }
    
    if (conditions.daysAfterDeliveryMin !== undefined || conditions.daysAfterDeliveryMax !== undefined) {
      const days = context.daysAfterDelivery || 0;
      const min = conditions.daysAfterDeliveryMin ?? 0;
      const max = conditions.daysAfterDeliveryMax ?? Infinity;
      if (days >= min && days <= max) {
        matched.push(`daysAfterDelivery:${days}`);
      }
    }
    
    if (conditions.categories && context.listingCategory) {
      if (conditions.categories.includes(context.listingCategory)) {
        matched.push(`category:${context.listingCategory}`);
      }
    }
    
    return matched;
  }
}

export const returnRulesEngine = new ReturnRulesEngine();
