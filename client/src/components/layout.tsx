import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AccountDropdown } from "@/components/account-dropdown";
import { useAuth } from "@/hooks/use-auth";
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
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const { language } = useLanguage();

  const isRtl = language === "ar" || language === "ku";

  return (
    <div className="despia-app bg-background font-sans md:min-h-screen md:block overflow-x-hidden max-w-full" dir={isRtl ? "rtl" : "ltr"}>
            
      {/* Image Search Modal */}
      <ImageSearchModal open={imageSearchOpen} onOpenChange={setImageSearchOpen} />


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
        
      </main>
    </div>
  );
}
