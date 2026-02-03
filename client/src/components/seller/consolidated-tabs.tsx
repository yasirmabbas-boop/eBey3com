/**
 * Consolidated Tabs Component for Seller Dashboard
 * 
 * Implements the new 4-tab layout (Phase 2):
 * - Inventory (formerly Products)
 * - Activity (Messages + Offers + Returns)
 * - Orders (formerly Sales)
 * - Earnings (formerly Wallet)
 * 
 * This component wraps the Tabs component with the new structure
 * while maintaining feature flag support for gradual rollout.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Package, Bell, ShoppingBag, Wallet } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { ActivitySection, ActivitySubTab } from "./activity-section";

export type ConsolidatedTabName = "inventory" | "activity" | "orders" | "earnings";

interface ConsolidatedTabsProps {
  /** Currently active main tab */
  activeTab: ConsolidatedTabName;
  /** Callback when main tab changes */
  onTabChange: (tab: ConsolidatedTabName) => void;
  /** Currently active activity sub-tab */
  activitySubTab: ActivitySubTab;
  /** Callback when activity sub-tab changes */
  onActivitySubTabChange: (tab: ActivitySubTab) => void;
  
  // Badge counts
  unreadMessages: number;
  pendingOffers: number;
  pendingReturns: number;
  pendingOrders: number;
  
  // Tab content
  inventoryContent: React.ReactNode;
  messagesContent: React.ReactNode;
  offersContent: React.ReactNode;
  returnsContent: React.ReactNode;
  ordersContent: React.ReactNode;
  earningsContent: React.ReactNode;
}

export function ConsolidatedTabs({
  activeTab,
  onTabChange,
  activitySubTab,
  onActivitySubTabChange,
  unreadMessages,
  pendingOffers,
  pendingReturns,
  pendingOrders,
  inventoryContent,
  messagesContent,
  offersContent,
  returnsContent,
  ordersContent,
  earningsContent,
}: ConsolidatedTabsProps) {
  const { language } = useLanguage();

  // Calculate total activity count for badge
  const totalActivityCount = unreadMessages + pendingOffers + pendingReturns;

  const labels = {
    inventory: {
      ar: "المنتجات",
      ku: "بەرهەمەکان",
      en: "Inventory",
    },
    activity: {
      ar: "النشاط",
      ku: "چالاکی",
      en: "Activity",
    },
    orders: {
      ar: "الطلبات",
      ku: "داواکاریەکان",
      en: "Orders",
    },
    earnings: {
      ar: "الأرباح",
      ku: "قازانج",
      en: "Earnings",
    },
  };

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={(v) => onTabChange(v as ConsolidatedTabName)} 
      className="space-y-6"
    >
      <TabsList className="grid grid-cols-4 w-full max-w-2xl">
        {/* Inventory Tab */}
        <TabsTrigger 
          value="inventory" 
          className="gap-2"
          data-testid="tab-inventory"
        >
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">{labels.inventory[language]}</span>
        </TabsTrigger>

        {/* Activity Tab (Messages + Offers + Returns) */}
        <TabsTrigger 
          value="activity" 
          className="gap-2"
          data-testid="tab-activity"
        >
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">{labels.activity[language]}</span>
          {totalActivityCount > 0 && (
            <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5">
              {totalActivityCount}
            </Badge>
          )}
        </TabsTrigger>

        {/* Orders Tab */}
        <TabsTrigger 
          value="orders" 
          className="gap-2"
          data-testid="tab-orders"
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden sm:inline">{labels.orders[language]}</span>
          {pendingOrders > 0 && (
            <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0.5">
              {pendingOrders}
            </Badge>
          )}
        </TabsTrigger>

        {/* Earnings Tab */}
        <TabsTrigger 
          value="earnings" 
          className="gap-2"
          data-testid="tab-earnings"
        >
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">{labels.earnings[language]}</span>
        </TabsTrigger>
      </TabsList>

      {/* Inventory Content */}
      <TabsContent value="inventory" className="space-y-4">
        {inventoryContent}
      </TabsContent>

      {/* Activity Content (with sub-tabs) */}
      <TabsContent value="activity" className="space-y-4">
        <ActivitySection
          activeSubTab={activitySubTab}
          onSubTabChange={onActivitySubTabChange}
          unreadMessages={unreadMessages}
          pendingOffers={pendingOffers}
          pendingReturns={pendingReturns}
          messagesContent={messagesContent}
          offersContent={offersContent}
          returnsContent={returnsContent}
        />
      </TabsContent>

      {/* Orders Content */}
      <TabsContent value="orders" className="space-y-4">
        {ordersContent}
      </TabsContent>

      {/* Earnings Content */}
      <TabsContent value="earnings" className="space-y-6">
        {earningsContent}
      </TabsContent>
    </Tabs>
  );
}
