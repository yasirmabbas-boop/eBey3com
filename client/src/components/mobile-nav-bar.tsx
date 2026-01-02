import { Link, useLocation } from "wouter";
import { Home, Search, Bell, User, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useQuery } from "@tanstack/react-query";

export function MobileNavBar() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { totalItems } = useCart();

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count", { credentials: "include" });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const navItems = [
    { href: "/", icon: Home, label: "الرئيسية", testId: "nav-home" },
    { href: "/search", icon: Search, label: "البحث", testId: "nav-search" },
    { href: "/cart", icon: ShoppingCart, label: "السلة", testId: "nav-cart", badge: totalItems },
    { href: "/notifications", icon: Bell, label: "الإشعارات", testId: "nav-notifications", badge: unreadCount },
    { href: isAuthenticated ? "/my-account" : "/signin", icon: User, label: "حسابي", testId: "nav-account" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] md:hidden"
      dir="rtl"
      style={{ 
        zIndex: 99999,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        position: "fixed",
        display: "flex"
      }}
    >
      <div className="flex items-center justify-around w-full h-16 px-2 bg-white">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-2 relative transition-colors active:scale-95 ${
                active ? "text-blue-600" : "text-gray-600"
              }`}
              data-testid={item.testId}
            >
              <div className="relative">
                <item.icon className={`h-6 w-6 ${active ? "stroke-[2.5]" : ""}`} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 ${active ? "font-bold" : ""}`}>{item.label}</span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
