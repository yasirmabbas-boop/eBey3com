import { useLocation } from "wouter";
import { Home, Heart, User, Play, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavVisibility } from "@/hooks/use-nav-visibility";
import { useLanguage } from "@/lib/i18n";
import { useNavState } from "@/hooks/use-nav-state";
import { hapticLight, hapticSuccess, hapticError } from "@/lib/despia";
import { isNative, isAndroid } from "@/lib/capacitor";
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import { useNavBarSwipe } from "@/hooks/use-nav-bar-swipe";
import { useEffect, useRef } from "react";

// TikTok-style: Hide nav bar completely on immersive swipe/reels experience
const HIDDEN_NAV_PATHS: string[] = ["/swipe"];

export function MobileNavBar() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const { isNavVisible } = useNavVisibility();
  const { language } = useLanguage();
  const { navigateToSection } = useNavState();
  const isRTL = language === "ar" || language === "ku";
  
  // Fetch unread notification count
  const { data: notificationData } = useQuery({
    queryKey: ["/api/notifications/count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/count", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadCount = notificationData?.count || 0;
  
  const isPathHidden = HIDDEN_NAV_PATHS.some(path => location.startsWith(path));
  const shouldShowNav = isNavVisible && !isPathHidden;

  const navItems = [
    { href: "/", icon: Home, label: language === "ar" ? "الرئيسية" : "سەرەکی", testId: "nav-home", section: "home" },
    { href: "/favorites", icon: Heart, label: language === "ar" ? "المفضلة" : "دڵخوازەکان", testId: "nav-favorites", section: "favorites" },
    { href: "/swipe", icon: Play, label: language === "ar" ? "تصفح" : "گەڕان", testId: "nav-swipe", section: "swipe" },
    { href: "/notifications", icon: Bell, label: language === "ar" ? "الإشعارات" : "ئاگادارییەکان", testId: "nav-notifications", section: "notifications", badge: unreadCount },
    { href: isAuthenticated ? "/my-account" : "/signin", icon: User, label: language === "ar" ? "حسابي" : "هەژمارەکەم", testId: "nav-account", section: "account", skipRestore: true },
  ];

  const isActiveSection = (section: string) => {
    if (section === "home") return location === "/" || location.startsWith("/product/") || location.startsWith("/category/");
    if (section === "favorites") return location.startsWith("/favorites");
    if (section === "swipe") return location.startsWith("/swipe");
    if (section === "notifications") return location.startsWith("/notifications");
    if (section === "account") return (location.startsWith("/my-account") && !location.includes("tab=notifications")) || location.startsWith("/signin") || location.startsWith("/seller") || location.startsWith("/cart") || location.startsWith("/orders") || location.startsWith("/checkout") || location.startsWith("/my-") || location.startsWith("/security") || location.startsWith("/settings");
    return false;
  };

  // Find current tab index
  const currentTabIndex = navItems.findIndex(item => isActiveSection(item.section));
  const currentIndex = currentTabIndex >= 0 ? currentTabIndex : 0;

  // Handle tab change from swipe
  const handleTabChange = (newIndex: number) => {
    const targetItem = navItems[newIndex];
    if (targetItem) {
      hapticSuccess();
      if ((targetItem as any).skipRestore) {
        window.location.href = targetItem.href;
      } else {
        navigateToSection(targetItem.section, targetItem.href);
      }
    }
  };

  // Swipe hook integration
  const { swipeState, navBarRef } = useNavBarSwipe({
    tabCount: navItems.length,
    currentTabIndex: currentIndex,
    onTabChange: handleTabChange,
    isRTL,
    enabled: shouldShowNav,
  });

  // Haptic feedback for swipe milestones
  const lastProgressRef = useRef(0);
  useEffect(() => {
    if (swipeState.isSwiping) {
      // Haptic feedback on swipe start
      if (lastProgressRef.current === 0 && swipeState.progress > 0.1) {
        hapticLight();
      }
      
      // Haptic feedback at milestones
      const milestones = [0.25, 0.5, 0.75];
      for (const milestone of milestones) {
        if (lastProgressRef.current < milestone && swipeState.progress >= milestone) {
          hapticLight();
        }
      }

      // Haptic feedback on boundary hit
      if (swipeState.targetIndex === null && swipeState.progress > 0.2) {
        hapticError();
      }
    }
    lastProgressRef.current = swipeState.progress;
  }, [swipeState.isSwiping, swipeState.progress, swipeState.targetIndex]);

  // Calculate indicator position with swipe animation
  const getIndicatorPosition = () => {
    if (navItems.length === 0) return 0;
    
    const tabWidth = 100 / navItems.length;
    const basePosition = currentIndex * tabWidth;
    
    if (swipeState.isSwiping && swipeState.targetIndex !== null) {
      const targetPosition = swipeState.targetIndex * tabWidth;
      const progress = swipeState.progress;
      return basePosition + (targetPosition - basePosition) * progress;
    }
    
    return basePosition;
  };

  const indicatorPosition = getIndicatorPosition();

  return (
    <nav 
      ref={navBarRef}
      className={`fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] md:hidden transition-transform duration-300 ease-out ${
        shouldShowNav ? 'translate-y-0' : 'translate-y-full'
      }`}
      dir={isRTL ? "rtl" : "ltr"}
      style={{ 
        zIndex: 99999,
        // Android needs explicit padding since env(safe-area-inset-bottom) returns 0
        // iOS uses the CSS env() value. Android gesture nav bar is typically 48-56px
        paddingBottom: isAndroid ? '48px' : 'var(--safe-area-bottom, env(safe-area-inset-bottom, 0px))',
        position: "fixed",
        display: "flex"
      }}
    >
      <div className="flex items-center justify-around w-full h-16 px-2 bg-white relative">

        {navItems.map((item, index) => {
          const active = isActiveSection(item.section);
          const badge = (item as any).badge;
          
          // Calculate scale for swipe preview
          let scale = 1;
          if (swipeState.isSwiping) {
            if (swipeState.targetIndex === index) {
              scale = 1 + (swipeState.progress * 0.1);
            } else if (index === currentIndex) {
              scale = 1 - (swipeState.progress * 0.05);
            }
          }
          
          return (
            <button
              key={item.section}
              onClick={() => {
                hapticLight();
                // For account section, always navigate directly to avoid stale cached paths
                if ((item as any).skipRestore) {
                  window.location.href = item.href;
                } else {
                  navigateToSection(item.section, item.href);
                }
              }}
              className={`flex flex-col items-center justify-center flex-1 py-2 relative transition-all duration-200 active:scale-95 ${
                active ? "text-blue-600" : "text-gray-600"
              }`}
              style={{
                transform: `scale(${scale})`,
                transition: swipeState.isSwiping ? 'none' : 'transform 0.2s ease-out',
              }}
              data-testid={item.testId}
            >
              <div className="relative">
                <item.icon className={`h-6 w-6 transition-all duration-200 ${active ? "stroke-[2.5]" : ""}`} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold px-1">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 transition-all duration-200 ${active ? "font-bold" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
