/**
 * Activity Section Component for Seller Dashboard
 * 
 * Consolidates Messages, Offers, and Returns into a single tab with sub-navigation.
 * Part of Phase 2: Navigation Redesign.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, HandCoins, RotateCcw } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export type ActivitySubTab = "messages" | "offers" | "returns";

interface ActivitySectionProps {
  /** Currently active sub-tab */
  activeSubTab: ActivitySubTab;
  /** Callback when sub-tab changes */
  onSubTabChange: (tab: ActivitySubTab) => void;
  /** Number of unread messages */
  unreadMessages: number;
  /** Number of pending offers */
  pendingOffers: number;
  /** Number of pending returns */
  pendingReturns: number;
  /** Content to render for messages */
  messagesContent: React.ReactNode;
  /** Content to render for offers */
  offersContent: React.ReactNode;
  /** Content to render for returns */
  returnsContent: React.ReactNode;
}

export function ActivitySection({
  activeSubTab,
  onSubTabChange,
  unreadMessages,
  pendingOffers,
  pendingReturns,
  messagesContent,
  offersContent,
  returnsContent,
}: ActivitySectionProps) {
  const { language } = useLanguage();

  const labels = {
    messages: {
      ar: "الرسائل",
      ku: "نامەکان",
      en: "Messages",
    },
    offers: {
      ar: "العروض",
      ku: "پێشنیارەکان",
      en: "Offers",
    },
    returns: {
      ar: "الإرجاعات",
      ku: "گەڕاندنەوەکان",
      en: "Returns",
    },
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      <Tabs 
        value={activeSubTab} 
        onValueChange={(v) => onSubTabChange(v as ActivitySubTab)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto bg-muted/50">
          <TabsTrigger 
            value="messages" 
            className="gap-2 text-sm"
            data-testid="activity-subtab-messages"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{labels.messages[language]}</span>
            {unreadMessages > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5">
                {unreadMessages}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="offers" 
            className="gap-2 text-sm"
            data-testid="activity-subtab-offers"
          >
            <HandCoins className="h-4 w-4" />
            <span className="hidden sm:inline">{labels.offers[language]}</span>
            {pendingOffers > 0 && (
              <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5">
                {pendingOffers}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="returns" 
            className="gap-2 text-sm"
            data-testid="activity-subtab-returns"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">{labels.returns[language]}</span>
            {pendingReturns > 0 && (
              <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0.5">
                {pendingReturns}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-4">
          {messagesContent}
        </TabsContent>

        <TabsContent value="offers" className="mt-4">
          {offersContent}
        </TabsContent>

        <TabsContent value="returns" className="mt-4">
          {returnsContent}
        </TabsContent>
      </Tabs>
    </div>
  );
}
