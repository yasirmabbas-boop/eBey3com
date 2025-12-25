import { Link, useLocation } from "wouter";
import { Home, Search, MessageCircle, User, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";

export function MobileNavBar() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const { totalItems } = useCart();

  const navItems = [
    { href: "/", icon: Home, label: "الرئيسية", testId: "nav-home" },
    { href: "/search", icon: Search, label: "البحث", testId: "nav-search" },
    { href: "/cart", icon: ShoppingCart, label: "السلة", testId: "nav-cart", badge: totalItems },
    { href: "/messages", icon: MessageCircle, label: "الرسائل", testId: "nav-messages" },
    { href: isAuthenticated ? "/my-account" : "/signin", icon: User, label: "حسابي", testId: "nav-account" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden safe-area-pb" dir="rtl">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-2 relative transition-colors ${
                active ? "text-blue-600" : "text-gray-500"
              }`}
              data-testid={item.testId}
            >
              <div className="relative">
                <item.icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 ${active ? "font-bold" : ""}`}>{item.label}</span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
