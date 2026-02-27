import { useState } from "react";
import { Link } from "wouter";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { AccountDropdown } from "@/components/account-dropdown";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { ImageSearchModal } from "@/components/image-search-modal";
import { SmartSearch } from "@/components/smart-search";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/lib/i18n";
import { isNative } from "@/lib/capacitor";

interface LayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
}

export function Layout({ children, hideHeader = false }: LayoutProps) {
  const { isLoading } = useAuth();
  const { totalItems } = useCart();
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const { language } = useLanguage();

  const isRtl = language === "ar" || language === "ku";

  return (
    <div className="despia-app bg-background font-sans md:min-h-screen md:block overflow-x-hidden max-w-full" dir={isRtl ? "rtl" : "ltr"} lang={language}>
      {/* Image Search Modal */}
      <ImageSearchModal open={imageSearchOpen} onOpenChange={setImageSearchOpen} />

      {/* Top Bar with Logo, Language, Cart */}
      {!hideHeader && (
      <div
        className="despia-topbar bg-primary text-white px-3 text-[13px] font-semibold shadow-[var(--shadow-1)]"
        style={{
          paddingTop: 'max(var(--safe-area-top, env(safe-area-inset-top, 0px)), 0.5rem)',
          paddingBottom: '0.5rem',
        }}
      >
        <div className="container mx-auto flex justify-between items-center relative">
          <Link href="/" className="flex-shrink-0 flex items-center">
            <Logo className="h-8 md:h-10" />
          </Link>

          <Link
            href="/sell"
            className="absolute left-1/2 -translate-x-1/2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[11px] uppercase tracking-wide transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white flex items-center gap-2"
            data-testid="link-add-product"
          >
            <span className="text-[11px] font-bold leading-tight md:text-xs md:font-semibold">{language === "ar" ? "أضف منتج" : language === "ku" ? "بەرهەم زیاد بکە" : "Add Product"}</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/cart"
              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-colors"
              data-testid="link-cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 h-4 flex items-center justify-center font-bold">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
      )}

      {/* Main Header - Search Only */}
      {!hideHeader && (
      <header className="sticky top-0 z-50 glass-surface border-b border-border/60 shadow-[var(--shadow-1)]">
        <div className="container mx-auto px-3 py-1">
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
      <main className={`despia-content md:pb-0 md:flex-1 pb-[var(--bottom-nav-padding)]`}>
        {children}
        
      </main>
    </div>
  );
}
