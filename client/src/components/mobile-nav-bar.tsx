import { useLocation } from "wouter";
import { Home, Heart, User, Play, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavVisibility } from "@/hooks/use-nav-visibility";
import { useLanguage } from "@/lib/i18n";
import { useNavState } from "@/hooks/use-nav-state";
import { hapticLight } from "@/lib/despia";
import { isNative } from "@/lib/capacitor";
import { useQuery } from "@tanstack/react-query";

const HIDDEN_NAV_PATHS: string[] = [];

export function MobileNavBar() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const { isNavVisible } = useNavVisibility();
  const { language } = useLanguage();
  const { navigateToSection } = useNavState();
  
  // Fetch unread notification count
  const { data: notificationData } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count");
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
    { href: "/my-account?tab=notifications", icon: Bell, label: language === "ar" ? "الإشعارات" : "ئاگادارییەکان", testId: "nav-notifications", section: "notifications", badge: unreadCount },
    { href: isAuthenticated ? "/my-account" : "/signin", icon: User, label: language === "ar" ? "حسابي" : "هەژمارەکەم", testId: "nav-account", section: "account" },
  ];

  const isActiveSection = (section: string) => {
    if (section === "home") return location === "/" || location.startsWith("/product/") || location.startsWith("/category/");
    if (section === "favorites") return location.startsWith("/favorites");
    if (section === "swipe") return location.startsWith("/swipe");
    if (section === "notifications") return location.includes("tab=notifications");
    if (section === "account") return (location.startsWith("/my-account") && !location.includes("tab=notifications")) || location.startsWith("/signin") || location.startsWith("/seller") || location.startsWith("/cart") || location.startsWith("/orders") || location.startsWith("/checkout") || location.startsWith("/my-") || location.startsWith("/security") || location.startsWith("/settings");
    return false;
  };

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] md:hidden transition-transform duration-300 ease-out ${
        shouldShowNav ? 'translate-y-0' : 'translate-y-full'
      }`}
      dir="rtl"
      style={{ 
        zIndex: 99999,
        paddingBottom: isNative ? "0px" : "var(--safe-area-bottom)",
        position: "fixed",
        display: "flex"
      }}
    >
      <div className="flex items-center justify-around w-full h-16 px-2 bg-white">
        {navItems.map((item) => {
          const active = isActiveSection(item.section);
          const badge = (item as any).badge;
          
          return (
            <button
              key={item.section}
              onClick={() => {
                hapticLight();
                navigateToSection(item.section, item.href);
              }}
              className={`flex flex-col items-center justify-center flex-1 py-2 relative transition-colors active:scale-95 ${
                active ? "text-blue-600" : "text-gray-600"
              }`}
              data-testid={item.testId}
            >
              <div className="relative">
                <item.icon className={`h-6 w-6 ${active ? "stroke-[2.5]" : ""}`} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold px-1">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 ${active ? "font-bold" : ""}`}>{item.label}</span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
