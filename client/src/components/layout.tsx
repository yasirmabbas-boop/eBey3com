import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, User, Menu, Phone, Camera, PlusCircle, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { AccountDropdown } from "@/components/account-dropdown";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { ImageSearchModal } from "@/components/image-search-modal";
import { NotificationsButton } from "@/components/notifications";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/search");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans" dir="rtl">
            
      {/* Image Search Modal */}
      <ImageSearchModal open={imageSearchOpen} onOpenChange={setImageSearchOpen} />

      {/* Top Navigation Bar */}
      <div className="bg-blue-600 text-white py-1 text-xs px-4">
        <div className="container mx-auto flex justify-between items-center">
          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/" className="hover:text-blue-200 transition-colors font-medium">الرئيسية</Link>
            <Link href="/live-auction" className="hover:text-blue-200 transition-colors font-medium flex items-center gap-1">
              🔴 مزاد حي
            </Link>
            <Link href="/search?category=ساعات" className="hover:text-blue-200 transition-colors">ساعات</Link>
            <Link href="/search?category=إلكترونيات" className="hover:text-blue-200 transition-colors">إلكترونيات</Link>
            <Link href="/search?category=ملابس" className="hover:text-blue-200 transition-colors">ملابس</Link>
            <Link href="/search?category=تحف وأثاث" className="hover:text-blue-200 transition-colors">تحف وأثاث</Link>
            <Link href="/search?category=سيارات" className="hover:text-blue-200 transition-colors">سيارات</Link>
            <Link href="/search" className="hover:text-blue-200 transition-colors font-medium">عرض الكل</Link>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center gap-3 mr-auto">
            {isLoading ? (
              <div className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {user.avatar && (
                  <img src={user.avatar} alt={user.displayName} className="h-5 w-5 rounded-full" />
                )}
                <span className="font-medium">{user.displayName}</span>
                <button 
                  onClick={() => logout()}
                  className="hover:text-blue-200 transition-colors flex items-center gap-1"
                  data-testid="button-logout"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <a href="/api/login" className="hover:text-blue-200 transition-colors flex items-center gap-1" data-testid="button-login">
                <User className="h-3 w-3" />
                تسجيل الدخول
              </a>
            )}
            <NotificationsButton />
            <div className="flex items-center gap-1 cursor-pointer hover:text-blue-200 transition-colors">
              <ShoppingCart className="h-3 w-3" />
              <span className="bg-red-500 text-white text-[9px] rounded-full px-1 h-3 flex items-center justify-center font-bold">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4 md:gap-6">
          
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="/" className="text-lg font-semibold">الرئيسية</Link>
                <Link href="/live-auction" className="text-lg text-red-600 font-bold">🔴 مزاد حي</Link>
                <Link href="/category/watches" className="text-lg">ساعات</Link>
                <Link href="/category/clothing" className="text-lg">ملابس</Link>
                <Link href="/category/vintage" className="text-lg">مقتنيات قديمة</Link>
                <Link href="/search" className="text-lg">البحث</Link>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Search Bar - First (Right side in RTL) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl relative gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input 
                type="search" 
                placeholder="ابحث عن ساعات، هواتف، سيارات، تحف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-12 h-11 bg-blue-50 border-blue-300 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-base"
                data-testid="input-header-search"
              />
              <Button 
                type="button"
                size="icon" 
                variant="ghost" 
                className="absolute left-1 top-1 bottom-1 h-auto w-10 text-gray-500 hover:text-primary hover:bg-transparent"
                onClick={() => setImageSearchOpen(true)}
                data-testid="button-image-search"
              >
                <Camera className="h-5 w-5" />
              </Button>
            </div>
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 px-6 h-11 rounded-md font-bold">
              <Search className="h-4 w-4 ml-2" />
              بحث
            </Button>
          </form>

          {/* Logo and Registration - Left side in RTL */}
          <div className="flex items-center gap-4 mr-auto">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo className="h-12 md:h-14" />
            </Link>
            
            {/* Registration/Login Button */}
            <div className="hidden md:flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : isAuthenticated && user ? (
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                  {user.avatar && (
                    <img src={user.avatar} alt={user.displayName} className="h-6 w-6 rounded-full" />
                  )}
                  <span className="font-medium text-sm">{user.displayName}</span>
                  <button 
                    onClick={() => logout()}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                    data-testid="button-logout-header"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <a 
                  href="/api/login" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                  data-testid="button-login-header"
                >
                  <User className="h-4 w-4" />
                  تسجيل الدخول
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 mt-20">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="mb-4">
              <div className="text-xl font-bold leading-tight tracking-wider">
                <span className="text-blue-400">E</span>
                <span className="text-yellow-400">-</span>
                <span className="text-red-400">ب</span>
                <span className="text-green-400">ي</span>
                <span className="text-blue-400">ع</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              منصتك الأولى للبيع والشراء في العراق.
              ساعات، ملابس، وكل ما هو مميز.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/">الرئيسية</Link></li>
              <li><Link href="/terms">الشروط والأحكام</Link></li>
              <li><Link href="/privacy">سياسة الخصوصية</Link></li>
              <li><Link href="/security">الأمان والحماية</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">المساعدة</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register">ابدأ كبائع</Link></li>
              <li><Link href="/register">ابدأ كمشتري</Link></li>
              <li><Link href="/security-guide">دليل الأمان</Link></li>
              <li>
                <Link href="/contact" className="hover:text-blue-300">
                  اتصل بنا
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">تواصل معنا</h3>
            <div className="flex items-center gap-2 mb-2 text-sm">
              <Phone className="h-4 w-4" />
              <span>٠٧٧٠٠٠٠٠٠٠٠</span>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-8 border-t border-slate-800 text-center text-xs">
          © 2024 اي بيع. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}
