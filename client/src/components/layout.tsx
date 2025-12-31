import { useState } from "react";
import { Link } from "wouter";
import { ShoppingCart, User, Menu, Loader2, Phone, Plus, Store, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { AccountDropdown } from "@/components/account-dropdown";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { ImageSearchModal } from "@/components/image-search-modal";
import { NotificationsButton } from "@/components/notifications";
import { SmartSearch } from "@/components/smart-search";
import { MobileNavBar } from "@/components/mobile-nav-bar";
import { BackButton } from "@/components/back-button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const [imageSearchOpen, setImageSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans" dir="rtl">
            
      {/* Image Search Modal */}
      <ImageSearchModal open={imageSearchOpen} onOpenChange={setImageSearchOpen} />

      {/* Seller Account Ribbon - Only show for approved sellers */}
      {isAuthenticated && (user as any)?.sellerApproved && (
        <div className="bg-gradient-to-l from-amber-500 via-yellow-500 to-amber-500 text-black py-1.5 text-xs px-4">
          <div className="container mx-auto flex justify-between items-center">
            {/* Seller Info */}
            <div className="flex items-center gap-3">
              <Store className="h-4 w-4" />
              <span className="font-bold">{user?.displayName || (user as any)?.phone}</span>
              <span className="hidden sm:inline">|</span>
              <Link href="/my-account" className="hidden sm:inline hover:underline font-medium">
                حسابي
              </Link>
              <Link href="/my-sales" className="hidden sm:inline hover:underline font-medium">
                مبيعاتي
              </Link>
              <span className="hidden sm:inline">|</span>
              <button 
                onClick={() => logout()}
                className="hover:underline font-medium flex items-center gap-1"
                data-testid="button-seller-logout"
              >
                <LogOut className="h-3 w-3" />
                خروج
              </button>
            </div>
            
            {/* List Item Button - Top Right */}
            <Link 
              href="/sell" 
              className="bg-black text-yellow-400 hover:bg-gray-900 px-4 py-1 rounded-full font-bold flex items-center gap-1.5 transition-colors shadow-md"
              data-testid="button-sell-item"
            >
              <Plus className="h-4 w-4" />
              أضف منتج للبيع
            </Link>
          </div>
        </div>
      )}

      {/* Buyer Ribbon - Only show for non-sellers */}
      {isAuthenticated && !(user as any)?.sellerApproved && (
        <div className="bg-gradient-to-l from-blue-500 via-blue-600 to-blue-500 text-white py-1.5 text-xs px-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4" />
              <span className="font-bold">{user?.displayName || (user as any)?.phone}</span>
              <span className="hidden sm:inline">|</span>
              <Link href="/my-account" className="hidden sm:inline hover:underline font-medium">
                حسابي
              </Link>
              <Link href="/my-purchases" className="hidden sm:inline hover:underline font-medium">
                مشترياتي
              </Link>
              <span className="hidden sm:inline">|</span>
              <button 
                onClick={() => logout()}
                className="hover:underline font-medium flex items-center gap-1"
                data-testid="button-buyer-logout"
              >
                <LogOut className="h-3 w-3" />
                خروج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="bg-blue-600 text-white py-1.5 text-xs px-4">
        <div className="container mx-auto flex justify-between items-center">
          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-5">
            <Link href="/" className="hover:text-blue-200 transition-colors font-medium">الرئيسية</Link>
            <Link href="/search?saleType=auction" className="hover:text-blue-200 transition-colors font-medium">المزادات</Link>
            <Link href="/search?saleType=fixed" className="hover:text-blue-200 transition-colors font-medium">شراء الآن</Link>
            <Link href="/search?exchange=true" className="hover:text-blue-200 transition-colors font-medium">مراوس</Link>
            <Link href="/search" className="hover:text-blue-200 transition-colors font-medium">عرض الكل</Link>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center gap-3 mr-auto">
            {!isLoading && !isAuthenticated && (
              <Link href="/signin" className="hover:text-blue-200 transition-colors flex items-center gap-1" data-testid="button-login">
                <User className="h-3 w-3" />
                تسجيل الدخول
              </Link>
            )}
            <NotificationsButton />
            <Link href="/cart" className="flex items-center gap-1 cursor-pointer hover:text-blue-200 transition-colors" data-testid="link-cart">
              <ShoppingCart className="h-3 w-3" />
              {totalItems > 0 && (
                <span className="bg-red-500 text-white text-[9px] rounded-full px-1 h-3 flex items-center justify-center font-bold">{totalItems > 99 ? '99+' : totalItems}</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          {/* Top Row: Logo, Menu, Account */}
          <div className="flex items-center gap-4 md:gap-6 mb-3">
            {/* Back Button - Mobile */}
            <BackButton className="md:hidden" />

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
                  <Link href="/search" className="text-lg">البحث</Link>
                  {isAuthenticated && (
                    <>
                      <Link href="/my-account" className="text-lg text-primary font-semibold">حسابي</Link>
                      {(user as any)?.sellerApproved && (
                        <>
                          <Link href="/seller-dashboard" className="text-lg">لوحة البائع</Link>
                          <Link href="/sell" className="text-lg">إضافة منتج</Link>
                        </>
                      )}
                      <Link href="/my-purchases" className="text-lg">مشترياتي</Link>
                      <Link href="/messages" className="text-lg">الرسائل</Link>
                      <Link href="/settings" className="text-lg">الإعدادات</Link>
                    </>
                  )}
                  {!isAuthenticated && (
                    <Link href="/signin" className="text-lg text-primary font-semibold">تسجيل الدخول</Link>
                  )}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Account Dropdown - Far Right in RTL */}
            <div className="hidden md:flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : (
                <AccountDropdown />
              )}
            </div>

            {/* Logo - Center area */}
            <Link href="/" className="flex-shrink-0 flex items-center mx-auto md:mx-0">
              <Logo className="h-12 md:h-14" />
            </Link>
          </div>
          
          {/* Search Bar - Full Width */}
          <SmartSearch 
            onImageSearchClick={() => setImageSearchOpen(true)}
            className="flex w-full gap-2 items-center"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNavBar />

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
