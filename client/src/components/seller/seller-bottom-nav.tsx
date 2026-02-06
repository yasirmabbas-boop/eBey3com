/**
 * Seller Bottom Navigation Component
 * 
 * Mobile-only bottom navigation for the seller dashboard.
 * Matches the consolidated 4-tab layout:
 * - Inventory (Products)
 * - Activity (Messages + Offers + Returns)
 * - Orders (Sales)
 * - Earnings (Wallet)
 * 
 * Part of Phase 2: Mobile Navigation Optimization.
 */

import { Package, Bell, ShoppingBag, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { hapticLight } from "@/lib/despia";

export type SellerNavTab = "inventory" | "activity" | "orders" | "earnings";

// Map between new tab names and legacy tab names for compatibility
const TAB_TO_LEGACY: Record<SellerNavTab, string> = {
  inventory: "products",
  activity: "messages", // Default activity section
  orders: "sales",
  earnings: "wallet",
};

interface SellerBottomNavProps {
  /** Currently active tab */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (tab: string) => void;
  /** Unread messages count */
  unreadMessages?: number;
  /** Pending offers count */
  pendingOffers?: number;
  /** Pending returns count */
  pendingReturns?: number;
  /** Pending orders count */
  pendingOrders?: number;
  /** Whether to use new tab names or legacy names */
  useNewTabNames?: boolean;
}

export function SellerBottomNav({
  activeTab,
  onTabChange,
  unreadMessages = 0,
  pendingOffers = 0,
  pendingReturns = 0,
  pendingOrders = 0,
  useNewTabNames = false,
}: SellerBottomNavProps) {
  const { language } = useLanguage();

  // Calculate total activity count
  const totalActivityCount = unreadMessages + pendingOffers + pendingReturns;

  const labels = {
    inventory: {
      ar: "المنتجات",
      ku: "بەرهەم",
      en: "Inventory",
    },
    activity: {
      ar: "النشاط",
      ku: "چالاکی",
      en: "Activity",
    },
    orders: {
      ar: "الطلبات",
      ku: "داواکاری",
      en: "Orders",
    },
    earnings: {
      ar: "الأرباح",
      ku: "قازانج",
      en: "Earnings",
    },
  };

  const navItems: Array<{
    tab: SellerNavTab;
    icon: React.ElementType;
    badge?: number;
  }> = [
    { tab: "inventory", icon: Package },
    { tab: "activity", icon: Bell, badge: totalActivityCount },
    { tab: "orders", icon: ShoppingBag, badge: pendingOrders },
    { tab: "earnings", icon: Wallet },
  ];

  // Check if a tab is active (handle both new and legacy tab names)
  const isTabActive = (tab: SellerNavTab): boolean => {
    const legacyName = TAB_TO_LEGACY[tab];
    
    // For activity tab, check messages, offers, and returns
    if (tab === "activity") {
      return (
        activeTab === "activity" ||
        activeTab === "messages" ||
        activeTab === "offers" ||
        activeTab === "returns"
      );
    }
    
    return activeTab === tab || activeTab === legacyName;
  };

  const handleTabClick = (tab: SellerNavTab) => {
    hapticLight();
    
    // Use new tab names or legacy names based on flag
    if (useNewTabNames) {
      onTabChange(tab);
    } else {
      onTabChange(TAB_TO_LEGACY[tab]);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:hidden"
      dir="rtl"
      style={{
        zIndex: 'var(--seller-nav-z-index, 100000)', // Above main nav and chat widgets
        paddingBottom: 'var(--safe-area-bottom, env(safe-area-inset-bottom, 0px))',
      }}
      data-testid="seller-bottom-nav"
    >
      <div className="flex items-center justify-around w-full h-16 px-2 bg-white">
        {navItems.map((item) => {
          const active = isTabActive(item.tab);
          const Icon = item.icon;

          return (
            <button
              key={item.tab}
              onClick={() => handleTabClick(item.tab)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200 ${
                active
                  ? "text-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              data-testid={`seller-nav-${item.tab}`}
            >
              <div className="relative">
                <Icon
                  className={`h-6 w-6 transition-transform ${
                    active ? "scale-110" : ""
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />
                {item.badge && item.badge > 0 && (
                  <Badge
                    className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center bg-red-500 text-white text-[10px] px-1"
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </Badge>
                )}
              </div>
              <span
                className={`mt-1 text-[10px] transition-all ${
                  active ? "font-semibold" : "font-normal"
                }`}
              >
                {labels[item.tab][language]}
              </span>
              {active && (
                <div className="absolute bottom-0 w-8 h-1 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
