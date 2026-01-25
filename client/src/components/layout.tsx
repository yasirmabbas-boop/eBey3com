import { useState } from "react";
import { Link } from "wouter";
import { ShoppingCart, User, Loader2, Plus, Store, LogOut, HelpCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { AccountDropdown } from "@/components/account-dropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { ImageSearchModal } from "@/components/image-search-modal";
import { SmartSearch } from "@/components/smart-search";
import { BackButton } from "@/components/back-button";
import { TutorialTrigger } from "@/components/onboarding-tutorial";
import { useLanguage } from "@/lib/i18n";
import { isNative } from "@/lib/capacitor";

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

  const isRtl = language === "ar" || language === "ku";

  return (
    <div className="despia-app bg-background font-sans md:min-h-screen md:block overflow-x-hidden max-w-full" dir={isRtl ? "rtl" : "ltr"}>
            
      {/* Image Search Modal */}
      <ImageSearchModal open={imageSearchOpen} onOpenChange={setImageSearchOpen} />

      {/* Combined Top Bar with Logo */}
      {!hideHeader && (
      <div className={`despia-topbar ${isAuthenticated && user?.sellerApproved ? 'bg-emerald-600/95' : 'bg-primary'} text-white py-2 px-3 text-[13px] font-semibold shadow-[var(--shadow-1)]`}>
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo - Now in top bar */}
          <Link href="/" className="flex-shrink-0 flex items-center">
            <Logo className="h-8 md:h-10 brightness-0 invert" />
          </Link>

          {/* Navigation Links - Desktop only */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="hover:opacity-80 transition-colors font-medium">{t("home")}</Link>
            <Link href="/search?saleType=auction" className="hover:opacity-80 transition-colors font-medium">{t("auctions")}</Link>
            <Link href="/search?saleType=fixed" className="hover:opacity-80 transition-colors font-medium">{t("buyNow")}</Link>
            {ENABLE_EXCHANGE_FEATURE && <Link href="/search?exchange=true" className="hover:opacity-80 transition-colors font-medium">مراوس</Link>}
            <Link href="/search" className="hover:opacity-80 transition-colors font-medium">{t("viewAll")}</Link>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:flex items-center gap-2 font-bold text-base">
                  {user?.sellerApproved ? <Store className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  {user?.displayName || user?.phone}
                </span>
                <Link href="/my-account" className="hidden sm:inline hover:opacity-80 font-medium">{t("myAccount")}</Link>
                {user?.sellerApproved ? (
                  <Link href="/seller-dashboard" className="hidden sm:inline hover:opacity-80 font-medium">{t("myShop")}</Link>
                ) : (
                  <Link href="/my-purchases" className="hidden sm:inline hover:opacity-80 font-medium">{t("myPurchases")}</Link>
                )}
                <button 
                  onClick={() => logout()}
                  className="hover:opacity-80 font-medium flex items-center gap-2 text-base"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("logout")}</span>
                </button>
                {user?.sellerApproved && (
                  <Link 
                    href="/sell" 
                    className="hidden sm:flex bg-white/95 text-primary hover:bg-white px-4 py-1.5 rounded-full font-bold items-center gap-2 transition-colors text-sm shadow-[var(--shadow-1)]"
                    data-testid="button-sell-item"
                  >
                    <Plus className="h-4 w-4" />
                    {t("addProduct")}
                  </Link>
                )}
              </>
            ) : (
              !isLoading && (
                <Link href="/signin" className="hover:opacity-80 transition-colors flex items-center gap-1.5 text-sm font-medium" data-testid="button-login">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("login")}</span>
                </Link>
              )
            )}
            {/* Compact Language Switcher */}
            <Select
              value={language}
              onValueChange={(value) => {
                setLanguage(value as typeof language);
              }}
            >
              <SelectTrigger
                className="h-6 w-14 bg-white/20 text-white border-0 text-[10px] font-bold px-2"
                data-testid="select-language"
              >
                <SelectValue placeholder={language === "ar" ? "AR" : "کو"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">AR</SelectItem>
                <SelectItem value="ku">کو</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Main Header - Search Only */}
      {!hideHeader && (
      <header className="sticky top-0 z-50 glass-surface border-b border-border/60 shadow-[var(--shadow-1)]">
        <div className="container mx-auto px-3 py-2">
          {/* Full Width Search Bar */}
          <div className="flex items-center gap-2">
            {/* Back Button - Mobile */}
            <BackButton className="md:hidden flex-shrink-0" />

            {/* Search Bar - Full width */}
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
      <main className={`despia-content md:pb-0 md:flex-1 ${isNative ? "pb-6" : "pb-20"}`}>
        {children}
        
        {/* Footer - Panda Black (inside scrollable content) */}
        <footer className={`bg-[#141414] text-gray-300 ${isNative ? "py-6 mt-8" : "py-8 mt-20"}`}>
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
              <div>
                <h3 className="font-bold text-white text-sm mb-2">تواصل معنا</h3>
                <ul className="space-y-1 text-xs">
                  <li><a href="mailto:info@ebey3.com" className="hover:text-white" data-testid="footer-email-info">info@ebey3.com</a></li>
                  <li><a href="mailto:support@ebey3.com" className="hover:text-white" data-testid="footer-email-support">support@ebey3.com</a></li>
                  <li><a href="mailto:security@ebey3.com" className="hover:text-white text-red-400" data-testid="footer-email-security">Report a Security Issue</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-800 text-center text-xs">
            © 2025 اي بيع. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
      </main>
    </div>
  );
}
