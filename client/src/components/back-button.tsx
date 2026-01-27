import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAIN_NAV_PAGES = ["/", "/favorites", "/swipe", "/notifications", "/my-account", "/signin", "/cart"];

interface BackButtonProps {
  fallbackPath?: string;
  className?: string;
}

export function BackButton({ fallbackPath = "/", className = "" }: BackButtonProps) {
  const [location, navigate] = useLocation();

  const handleBack = () => {
    if (window.history.length > 2) {
      window.history.back();
    } else {
      navigate(fallbackPath);
    }
  };

  const isMainNavPage = MAIN_NAV_PAGES.includes(location);
  if (isMainNavPage) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleBack}
      className={`h-9 w-9 rounded-full hover:bg-gray-100 ${className}`}
      data-testid="button-back"
      aria-label="العودة"
    >
      <ArrowRight className="h-5 w-5" />
    </Button>
  );
}
