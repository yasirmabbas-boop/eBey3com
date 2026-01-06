import { Link, useLocation } from "wouter";
import { Home, Heart, User, Layers } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { NotificationsButton } from "@/components/notifications";
import { useNavVisibility } from "@/hooks/use-nav-visibility";

export function MobileNavBar() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const { isNavVisible } = useNavVisibility();

  const navItems = [
    { href: "/", icon: Home, label: "الرئيسية", testId: "nav-home" },
    { href: "/favorites", icon: Heart, label: "المفضلة", testId: "nav-favorites" },
    { href: "/swipe", icon: Layers, label: "تصفح", testId: "nav-swipe" },
    { type: "notifications" as const },
    { href: isAuthenticated ? "/my-account" : "/signin", icon: User, label: "حسابي", testId: "nav-account" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] md:hidden transition-transform duration-300 ease-out ${
        isNavVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      dir="rtl"
      style={{ 
        zIndex: 99999,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        position: "fixed",
        display: "flex"
      }}
    >
      <div className="flex items-center justify-around w-full h-16 px-2 bg-white">
        {navItems.map((item, index) => {
          if (item.type === "notifications") {
            return (
              <div 
                key="notifications" 
                className="flex flex-col items-center justify-center flex-1 py-2"
                data-testid="nav-notifications"
              >
                <NotificationsButton variant="mobile" />
                <span className="text-[11px] mt-1 text-gray-600">الإشعارات</span>
              </div>
            );
          }
          
          const active = isActive(item.href!);
          return (
            <Link
              key={item.href}
              href={item.href!}
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
