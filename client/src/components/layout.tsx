import { useState } from "react";
import { Link } from "wouter";
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
import { GlobalAIAssistant } from "@/components/global-ai-assistant";
import { ImageSearchModal } from "@/components/image-search-modal";
import { NotificationsButton } from "@/components/notifications";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [imageSearchOpen, setImageSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans" dir="rtl">
      {/* Global AI Assistant */}
      <GlobalAIAssistant />
      
      {/* Image Search Modal */}
      <ImageSearchModal open={imageSearchOpen} onOpenChange={setImageSearchOpen} />

      {/* Top Bar */}
      <div className="bg-white text-gray-700 py-2 text-xs px-4 border-b border-gray-200">
        <div className="container mx-auto flex justify-between items-center gap-8">
          <div className="flex gap-6 w-full justify-start items-center">
            <Link href="/sell" className="hover:text-green-600 font-semibold transition-colors flex items-center gap-1 text-green-700 bg-green-50 px-3 py-1 rounded-full">
              <PlusCircle className="h-4 w-4" />
              بيع منتج
            </Link>
            <div className="h-4 w-px bg-gray-300 mx-2"></div>
            
            {isLoading ? (
              <div className="flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري التحميل...</span>
              </div>
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {user.avatar && (
                    <img src={user.avatar} alt={user.displayName} className="h-6 w-6 rounded-full" />
                  )}
                  <span className="font-semibold text-primary">{user.displayName}</span>
                </div>
                <button 
                  onClick={() => logout()}
                  className="hover:text-red-600 font-semibold transition-colors flex items-center gap-1"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </button>
              </div>
            ) : (
              <a href="/api/login" className="hover:text-primary font-semibold transition-colors flex items-center gap-1" data-testid="button-login">
                <User className="h-4 w-4" />
                تسجيل الدخول / إنشاء حساب
              </a>
            )}
            
            <div className="h-4 w-px bg-gray-300 mx-2"></div>
            <NotificationsButton />
            <div className="h-4 w-px bg-gray-300 mx-2"></div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-semibold">السلة</span>
              <span className="bg-red-600 text-white text-[10px] rounded-full px-1.5 h-4 flex items-center justify-center font-bold">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4 md:gap-8 justify-between">
          
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

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center">
            <Logo className="h-16 md:h-20" />
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl relative gap-2 items-center">
            <div className="relative flex-1">
              <Input 
                type="search" 
                placeholder="البحث..." 
                className="w-full pl-10 pr-4 bg-blue-50 border-blue-300 focus-visible:ring-blue-500 focus-visible:border-blue-500"
              />
              <Button 
                size="icon" 
                variant="ghost" 
                className="absolute left-1 top-1 bottom-1 h-auto w-10 text-gray-500 hover:text-primary hover:bg-transparent"
                onClick={() => setImageSearchOpen(true)}
                data-testid="button-image-search"
              >
                <Camera className="h-5 w-5" />
              </Button>
            </div>
            <Button className="bg-blue-600 text-white hover:bg-blue-700 px-6 rounded-md font-bold">
              بحث
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
             {/* Basket moved to top bar */}
          </div>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex container mx-auto px-4 py-2 gap-8 text-sm font-medium text-muted-foreground border-t">
          <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
          <Link href="/live-auction" className="hover:text-primary transition-colors text-red-600 font-bold flex items-center gap-1">
            🔴 مزاد حي
          </Link>
          <Link href="/search?c=watches" className="hover:text-primary transition-colors">ساعات</Link>
          <Link href="/search?c=clothing" className="hover:text-primary transition-colors">ملابس</Link>
          <Link href="/search?c=antiques" className="hover:text-primary transition-colors">تحف وانتيكات</Link>
          <Link href="/search?c=electronics" className="hover:text-primary transition-colors">إلكترونيات</Link>
        </nav>
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
