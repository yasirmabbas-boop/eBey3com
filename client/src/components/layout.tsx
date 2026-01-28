import { useState } from "react";
import { Link } from "wouter";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { AccountDropdown } from "@/components/account-dropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { language, setLanguage } = useLanguage();

  const isRtl = language === "ar" || language === "ku";

  return (
    <div className="despia-app bg-background font-sans md:min-h-screen md:block overflow-x-hidden max-w-full" dir={isRtl ? "rtl" : "ltr"}>
            
      {/* Image Search Modal */}
      <ImageSearchModal open={imageSearchOpen} onOpenChange={setImageSearchOpen} />

      {/* Top Bar with Logo, Language, Cart */}
      {!hideHeader && (
      <div className="despia-topbar bg-primary text-white py-2 px-3 text-[13px] font-semibold shadow-[var(--shadow-1)]">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex-shrink-0 flex items-center">
            <Logo className="h-8 md:h-10 brightness-0 invert" />
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Select
              value={language}
              onValueChange={(value) => setLanguage(value as typeof language)}
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
      <header className="sticky top-0 z-50 glass-surface border-b border-border/60 shadow-[var(--shadow-1)]" style={{ paddingTop: 'var(--safe-area-top)' }}>
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
        
      </main>
    </div>
  );
}
