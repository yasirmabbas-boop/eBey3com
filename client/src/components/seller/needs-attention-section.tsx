/**
 * Needs Attention Section Component for Seller Dashboard
 * 
 * Displays a row of action cards for items requiring immediate seller attention.
 * Implements the "task-first" design pattern following eBay's Seller Hub approach.
 * 
 * This component replaces the legacy yellow alert card with a more actionable,
 * visually organized set of task cards.
 */

import { useLanguage } from "@/lib/i18n";
import { ActionCard, ActionCardType } from "./action-card";
import { AlertCircle, Printer, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NeedsAttentionSectionProps {
  /** Number of orders waiting to be shipped */
  pendingOrders: number;
  /** Number of offers waiting for response */
  pendingOffers: number;
  /** Number of unread messages */
  unreadMessages: number;
  /** Number of return requests waiting for response */
  pendingReturns: number;
  /** Callback when user clicks an action card */
  onNavigate: (tab: string, section?: string) => void;
  /** Optional: Callback to open shipping label dialog */
  onPrintShippingLabels?: () => void;
}

export function NeedsAttentionSection({
  pendingOrders,
  pendingOffers,
  unreadMessages,
  pendingReturns,
  onNavigate,
  onPrintShippingLabels,
}: NeedsAttentionSectionProps) {
  const { language } = useLanguage();
  
  // Calculate total items needing attention
  const totalItems = pendingOrders + pendingOffers + unreadMessages + pendingReturns;
  
  // Don't render if nothing needs attention
  if (totalItems === 0) {
    return null;
  }
  
  // Determine which quick actions to show
  const showShippingAction = pendingOrders > 0;
  const showMessagesAction = unreadMessages > 0;

  const handleCardClick = (type: ActionCardType) => {
    switch (type) {
      case "ship":
        // Navigate to sales tab with pending filter
        onNavigate("sales");
        break;
      case "offers":
        // Navigate to offers tab (or activity > offers in Phase 2)
        onNavigate("offers");
        break;
      case "messages":
        // Navigate to messages tab (or activity > messages in Phase 2)
        onNavigate("messages");
        break;
      case "returns":
        // Navigate to returns tab (or activity > returns in Phase 2)
        onNavigate("returns");
        break;
    }
  };

  return (
    <section 
      className="mb-6" 
      aria-label={language === "ar" ? "يحتاج إلى اهتمامك" : "Needs your attention"}
      data-testid="needs-attention-section"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-5 w-5 text-amber-500" />
        <h2 className="font-semibold text-lg">
          {language === "ar" 
            ? `يحتاج إلى اهتمامك (${totalItems})`
            : language === "ku"
            ? `ئاگاداریت پێویستە (${totalItems})`
            : `Needs Your Attention (${totalItems})`
          }
        </h2>
      </div>

      {/* Horizontally scrollable cards */}
      <div 
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Order priority: Ship > Offers > Returns > Messages */}
        {pendingOrders > 0 && (
          <ActionCard
            type="ship"
            count={pendingOrders}
            onClick={() => handleCardClick("ship")}
            urgent={pendingOrders > 0}
          />
        )}
        
        {pendingOffers > 0 && (
          <ActionCard
            type="offers"
            count={pendingOffers}
            onClick={() => handleCardClick("offers")}
            urgent={true} // Offers are always time-sensitive
          />
        )}
        
        {pendingReturns > 0 && (
          <ActionCard
            type="returns"
            count={pendingReturns}
            onClick={() => handleCardClick("returns")}
          />
        )}
        
        {unreadMessages > 0 && (
          <ActionCard
            type="messages"
            count={unreadMessages}
            onClick={() => handleCardClick("messages")}
          />
        )}
      </div>

      {/* Quick Action Center - Primary Actions */}
      {(showShippingAction || showMessagesAction) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {showShippingAction && onPrintShippingLabels && (
            <Button
              onClick={onPrintShippingLabels}
              size="sm"
              variant="default"
              className="gap-2"
              data-testid="action-print-shipping-labels"
            >
              <Printer className="h-4 w-4" />
              {language === "ar" 
                ? "طباعة ملصقات الشحن"
                : language === "ku"
                ? "چاپکردنی لیبلی ناردن"
                : "Print Shipping Labels"
              }
            </Button>
          )}
          
          {showMessagesAction && (
            <Button
              onClick={() => handleCardClick("messages")}
              size="sm"
              variant="secondary"
              className="gap-2"
              data-testid="action-reply-messages"
            >
              <MessageSquare className="h-4 w-4" />
              {language === "ar"
                ? "الرد على الرسائل"
                : language === "ku"
                ? "وەڵامدانەوەی نامەکان"
                : "Reply to Messages"
              }
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
