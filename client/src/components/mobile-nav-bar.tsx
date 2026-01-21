import { useLocation } from "wouter";
import { Home, Heart, User, Layers, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavVisibility } from "@/hooks/use-nav-visibility";
import { useLanguage } from "@/lib/i18n";
import { useNavState } from "@/hooks/use-nav-state";
import { hapticLight } from "@/lib/despia";

const HIDDEN_NAV_PATHS: string[] = [];

export function MobileNavBar() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const { isNavVisible } = useNavVisibility();
  const { language } = useLanguage();
  const { navigateToSection } = useNavState();
  
  const isPathHidden = HIDDEN_NAV_PATHS.some(path => location.startsWith(path));
  const shouldShowNav = isNavVisible && !isPathHidden;

  const navItems = [
    { href: "/", icon: Home, label: language === "ar" ? "الرئيسية" : "سەرەکی", testId: "nav-home", section: "home" },
    { href: "/favorites", icon: Heart, label: language === "ar" ? "المفضلة" : "دڵخوازەکان", testId: "nav-favorites", section: "favorites" },
    { href: "/swipe", icon: Layers, label: language === "ar" ? "تصفح" : "گەڕان", testId: "nav-swipe", section: "swipe" },
    { href: "/search", icon: Search, label: language === "ar" ? "البحث" : "گەڕان", testId: "nav-search", section: "search" },
    { href: isAuthenticated ? "/my-account" : "/signin", icon: User, label: language === "ar" ? "حسابي" : "هەژمارەکەم", testId: "nav-account", section: "account" },
  ];

  const isActiveSection = (section: string) => {
    if (section === "home") return location === "/" || location.startsWith("/product/") || location.startsWith("/category/");
    if (section === "favorites") return location.startsWith("/favorites");
    if (section === "swipe") return location.startsWith("/swipe");
    if (section === "search") return location.startsWith("/search");
    if (section === "account") return location.startsWith("/my-account") || location.startsWith("/signin") || location.startsWith("/seller") || location.startsWith("/cart") || location.startsWith("/orders") || location.startsWith("/checkout") || location.startsWith("/my-") || location.startsWith("/security") || location.startsWith("/settings");
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
        paddingBottom: "var(--safe-area-bottom)",
        position: "fixed",
        display: "flex"
      }}
    >
      <div className="flex items-center justify-around w-full h-16 px-2 bg-white">
        {navItems.map((item) => {
          const active = isActiveSection(item.section);
          
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
              <item.icon className={`h-6 w-6 ${active ? "stroke-[2.5]" : ""}`} />
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
