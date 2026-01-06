import { useState } from "react";
import { Link } from "wouter";
import { ShoppingCart, User, Menu, Loader2, Plus, Store, LogOut, HelpCircle, Share2, Languages } from "lucide-react";
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
import { BackButton } from "@/components/back-button";
import { TutorialTrigger } from "@/components/onboarding-tutorial";
import { useLanguage } from "@/lib/i18n";

// Feature flag for exchange option - set to true to enable
const ENABLE_EXCHANGE_FEATURE = false;

interface LayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
}

export function Layout({ children, hideHeader = false }: LayoutProps) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const handleShareSite = async () => {
    const shareData = {
      title: "E-بيع - سوق العراق الإلكتروني",
      text: "تسوق واشتري أفضل المنتجات في العراق",
      url: window.location.origin,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.origin);
      alert("تم نسخ الرابط!");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans" dir="rtl">
            
      {/* Image Search Modal */}
      <ImageSearchModal open={imageSearchOpen} onOpenChange={setImageSearchOpen} />

      {/* Combined Top Bar */}
      {!hideHeader && (
      <div className={`${isAuthenticated && (user as any)?.sellerApproved ? 'bg-gradient-to-l from-green-600 via-green-500 to-green-600' : 'bg-[#1E3A8A]'} text-white py-2.5 text-sm px-4 font-medium`}>
        <div className="container mx-auto flex justify-between items-center">
          {/* Navigation Links - Desktop only */}
          <div className="hidden md:flex items-center gap-5">
            <Link href="/" className="hover:opacity-80 transition-colors font-medium">الرئيسية</Link>
            <Link href="/search?saleType=auction" className="hover:opacity-80 transition-colors font-medium">المزادات</Link>
            <Link href="/search?saleType=fixed" className="hover:opacity-80 transition-colors font-medium">شراء الآن</Link>
            {ENABLE_EXCHANGE_FEATURE && <Link href="/search?exchange=true" className="hover:opacity-80 transition-colors font-medium">مراوس</Link>}
            <Link href="/search" className="hover:opacity-80 transition-colors font-medium">عرض الكل</Link>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center gap-3 mr-auto">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:flex items-center gap-1.5 font-bold text-base">
                  {(user as any)?.sellerApproved ? <Store className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  {user?.displayName || (user as any)?.phone}
                </span>
                <Link href="/my-account" className="hidden sm:inline hover:opacity-80 font-medium">حسابي</Link>
                {(user as any)?.sellerApproved ? (
                  <Link href="/seller-dashboard" className="hidden sm:inline hover:opacity-80 font-medium">دكاني</Link>
                ) : (
                  <Link href="/my-purchases" className="hidden sm:inline hover:opacity-80 font-medium">مشترياتي</Link>
                )}
                <button 
                  onClick={() => logout()}
                  className="hover:opacity-80 font-medium flex items-center gap-1.5 text-base"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
                {(user as any)?.sellerApproved && (
                  <Link 
                    href="/sell" 
                    className="bg-white text-[#1E3A8A] hover:bg-gray-100 px-4 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-colors text-sm shadow-md"
                    data-testid="button-sell-item"
                  >
                    <Plus className="h-4 w-4" />
                    أضف منتج
                  </Link>
                )}
              </>
            ) : (
              !isLoading && (
                <Link href="/signin" className="hover:opacity-80 transition-colors flex items-center gap-1.5 text-base font-medium" data-testid="button-login">
                  <User className="h-4 w-4" />
                  تسجيل الدخول
                </Link>
              )
            )}
            <button
              onClick={() => setLanguage(language === "ar" ? "ku" : "ar")}
              className="hover:opacity-80 transition-colors flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-xs font-bold"
              data-testid="button-language-toggle"
              title={language === "ar" ? "کوردی" : "عربي"}
            >
              <Languages className="h-3.5 w-3.5" />
              {language === "ar" ? "کو" : "عر"}
            </button>
            <button
              onClick={handleShareSite}
              className="hover:opacity-80 transition-colors flex items-center gap-1"
              data-testid="button-share-site"
              title={t("shareSite")}
            >
              <Share2 className="h-4 w-4" />
            </button>
            <NotificationsButton />
            <Link href="/cart" className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-colors" data-testid="link-cart">
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 && (
                <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 h-4 flex items-center justify-center font-bold">{totalItems > 99 ? '99+' : totalItems}</span>
              )}
            </Link>
          </div>
        </div>
      </div>
      )}

      {/* Main Header */}
      {!hideHeader && (
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          {/* Top Row: Menu/Back on right, Logo, Search on left */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Back Button - Mobile, Right side */}
            <BackButton className="md:hidden" />

            {/* Mobile Menu - Right side */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden -mr-2">
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

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo className="h-10 md:h-12" />
            </Link>

            {/* Search Bar - Flexible width */}
            <div className="flex-1">
              <SmartSearch 
                onImageSearchClick={() => setImageSearchOpen(true)}
                className="flex w-full gap-2 items-center"
              />
            </div>

            {/* Account Dropdown - Desktop only */}
            <div className="hidden md:flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : (
                <AccountDropdown />
              )}
            </div>
          </div>
        </div>
      </header>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Footer - Panda Black */}
      <footer className="bg-[#141414] text-gray-300 py-8 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-center gap-3 md:flex-col md:items-start">
              <Logo />
              <p className="text-xs md:text-sm leading-relaxed md:mt-2">
                منصتك الأولى للبيع والشراء في العراق
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:flex md:gap-12">
              <div>
                <h3 className="font-bold text-white text-sm mb-2">روابط</h3>
                <ul className="space-y-1 text-xs">
                  <li><Link href="/" className="hover:text-white">الرئيسية</Link></li>
                  <li><Link href="/terms" className="hover:text-white">الشروط</Link></li>
                  <li><Link href="/privacy" className="hover:text-white">الخصوصية</Link></li>
                  <li><Link href="/security" className="hover:text-white">الأمان</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm mb-2">المساعدة</h3>
                <ul className="space-y-1 text-xs">
                  <li><Link href="/register" className="hover:text-white">ابدأ كبائع</Link></li>
                  <li><Link href="/security-guide" className="hover:text-white">دليل الأمان</Link></li>
                  <li><Link href="/contact" className="hover:text-white">اتصل بنا</Link></li>
                  <li className="flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" />
                    <TutorialTrigger />
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-800 text-center text-xs">
            © 2024 اي بيع. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
}
