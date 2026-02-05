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
  details?: string | null;
  transactionAmount: number;
  listingCategory?: string | null;
  sellerRating?: number;
  buyerRating?: number;
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
   * Returns the first matching rule (highest priority)
   */
  async evaluateReturn(context: ReturnEvaluationContext): Promise<RuleEvaluationResult | null> {
    try {
      // Get prioritized active rules
      const rules = await this.getPrioritizedRules();
      
      if (rules.length === 0) {
        console.log("[RulesEngine] No active rules found");
        return null;
      }
      
      // Evaluate against each rule (in priority order)
      for (const rule of rules) {
        const matches = this.matchesConditions(context, rule.conditions);
        
        if (matches.matched) {
          console.log(`[RulesEngine] Rule "${rule.name}" matched for return ${context.id}`);
          
          return {
            action: rule.action as 'auto_approve' | 'auto_reject' | 'require_review',
            rule,
            confidence: matches.confidence,
            matchedConditions: matches.matchedConditions,
          };
        }
      }
      
      console.log("[RulesEngine] No rules matched for return", context.id);
      return null;
    } catch (error) {
      console.error("[RulesEngine] Error evaluating return:", error);
      // Return null on error - fail-safe
      return null;
    }
  }
  
  /**
   * Test a rule against sample data
   */
  async testRule(ruleId: string, testData: ReturnEvaluationContext): Promise<{
    matched: boolean;
    confidence: number;
    matchedConditions: string[];
  }> {
    const rules = await storage.getReturnRules(false);
    const rule = rules.find(r => r.id === ruleId);
    
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }
    
    return this.matchesConditions(testData, rule.conditions);
  }
  
  /**
   * Check if return request matches rule conditions
   */
  private matchesConditions(
    context: ReturnEvaluationContext,
    conditions: ReturnRuleConditions
  ): {
    matched: boolean;
    confidence: number;
    matchedConditions: string[];
  } {
    const matchedConditions: string[] = [];
    let confidence = 0;
    const operator = conditions.operator || 'AND';
    
    // Reason matching
    if (conditions.reasons && conditions.reasons.length > 0) {
      if (conditions.reasons.includes(context.reason as any)) {
        matchedConditions.push(`reason:${context.reason}`);
        confidence += 20;
      } else if (operator === 'AND') {
        return { matched: false, confidence: 0, matchedConditions: [] };
      }
    }
    
    // Price range matching
    if (conditions.priceRange) {
      const { min, max } = conditions.priceRange;
      if (min !== undefined && context.transactionAmount < min) {
        if (operator === 'AND') return { matched: false, confidence: 0, matchedConditions: [] };
      } else if (max !== undefined && context.transactionAmount > max) {
        if (operator === 'AND') return { matched: false, confidence: 0, matchedConditions: [] };
      } else {
        matchedConditions.push(`price:${context.transactionAmount}`);
        confidence += 15;
      }
    }
    
    // Seller rating matching
    if (conditions.sellerRatingMin !== undefined || conditions.sellerRatingMax !== undefined) {
      const sellerRating = context.sellerRating || 0;
      if (conditions.sellerRatingMin !== undefined && sellerRating < conditions.sellerRatingMin) {
        if (operator === 'AND') return { matched: false, confidence: 0, matchedConditions: [] };
      } else if (conditions.sellerRatingMax !== undefined && sellerRating > conditions.sellerRatingMax) {
        if (operator === 'AND') return { matched: false, confidence: 0, matchedConditions: [] };
      } else {
        matchedConditions.push(`sellerRating:${sellerRating}`);
        confidence += 15;
      }
    }
    
    // Days after delivery matching
    if (conditions.daysAfterDeliveryMin !== undefined || conditions.daysAfterDeliveryMax !== undefined) {
      const daysAfterDelivery = context.daysAfterDelivery || 0;
      if (conditions.daysAfterDeliveryMin !== undefined && daysAfterDelivery < conditions.daysAfterDeliveryMin) {
        if (operator === 'AND') return { matched: false, confidence: 0, matchedConditions: [] };
      } else if (conditions.daysAfterDeliveryMax !== undefined && daysAfterDelivery > conditions.daysAfterDeliveryMax) {
        if (operator === 'AND') return { matched: false, confidence: 0, matchedConditions: [] };
      } else {
        matchedConditions.push(`daysAfterDelivery:${daysAfterDelivery}`);
        confidence += 15;
      }
    }
    
    // Category matching
    if (conditions.categories && conditions.categories.length > 0 && context.listingCategory) {
      if (conditions.categories.includes(context.listingCategory)) {
        matchedConditions.push(`category:${context.listingCategory}`);
        confidence += 10;
      } else if (operator === 'AND') {
        return { matched: false, confidence: 0, matchedConditions: [] };
      }
    }
    
    // Buyer criteria
    if (conditions.buyerMinPurchases !== undefined || conditions.buyerMinRating !== undefined) {
      // Note: These would require additional context data
      // For now, we'll skip these checks or add them later
      matchedConditions.push('buyerCriteria:skipped');
    }
    
    // Determine if matched based on operator
    const hasMatches = matchedConditions.length > 0;
    const matched = operator === 'OR' 
      ? hasMatches 
      : matchedConditions.length >= (conditions.reasons?.length || 0) + (conditions.categories?.length || 0);
    
    return {
      matched,
      confidence: Math.min(confidence, 100),
      matchedConditions,
    };
  }
  
  /**
   * Get prioritized active rules
   * CRITICAL: Filter by isActive to respect soft-deletes
   */
  private async getPrioritizedRules(): Promise<ReturnRule[]> {
    const rules = await storage.getReturnRules(true); // activeOnly = true
    return rules.sort((a, b) => b.priority - a.priority);
  }
}

export const returnRulesEngine = new ReturnRulesEngine();
