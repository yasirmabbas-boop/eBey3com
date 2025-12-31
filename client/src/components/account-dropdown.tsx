import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Gavel,
  ShoppingBag,
  Store,
  Settings,
  MessageSquare,
  Heart,
  LogOut,
  Package,
  RefreshCw,
  ChevronDown,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function AccountDropdown() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <Link href="/signin">
        <Button
          variant="ghost"
          className="hover:text-primary font-semibold transition-colors text-xs"
        >
          تسجيل الدخول
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="hover:text-primary font-semibold transition-colors text-xs flex items-center gap-1"
          data-testid="button-account-dropdown"
        >
          {user.avatar ? (
            <img src={user.avatar} alt={user.displayName} className="h-5 w-5 rounded-full" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              {user.displayName?.charAt(0) || "م"}
            </div>
          )}
          {user.displayName || (user as any).phone}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="font-bold flex items-center gap-2">
          {user.avatar ? (
            <img src={user.avatar} alt={user.displayName} className="h-6 w-6 rounded-full" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              {user.displayName?.charAt(0) || "م"}
            </div>
          )}
          <div>
            <p className="text-sm">{user.displayName}</p>
            <p className="text-xs text-muted-foreground font-normal">{user.accountCode || ""}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <Link href="/my-account">
          <DropdownMenuItem className="cursor-pointer" data-testid="menu-my-profile">
            <User className="h-4 w-4 ml-2" />
            <span>حسابي</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/my-purchases">
          <DropdownMenuItem className="cursor-pointer" data-testid="menu-my-purchases">
            <ShoppingBag className="h-4 w-4 ml-2" />
            <span>مشترياتي</span>
          </DropdownMenuItem>
        </Link>

        {(user as any).sellerApproved && (
          <Link href="/my-sales">
            <DropdownMenuItem className="cursor-pointer" data-testid="menu-my-sales">
              <Store className="h-4 w-4 ml-2" />
              <span>مبيعاتي</span>
            </DropdownMenuItem>
          </Link>
        )}

        <Link href="/seller-dashboard">
          <DropdownMenuItem className="cursor-pointer" data-testid="menu-my-listings">
            <Package className="h-4 w-4 ml-2" />
            <span>إعلاناتي</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/my-auctions">
          <DropdownMenuItem className="cursor-pointer" data-testid="menu-my-auctions">
            <Gavel className="h-4 w-4 ml-2" />
            <span>مزاداتي</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/my-bids">
          <DropdownMenuItem className="cursor-pointer" data-testid="menu-my-bids">
            <Gavel className="h-4 w-4 ml-2" />
            <span>مزايداتي</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/exchange-offers">
          <DropdownMenuItem className="cursor-pointer" data-testid="menu-exchange-offers">
            <RefreshCw className="h-4 w-4 ml-2" />
            <span>عروض المراوس</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        <Link href="/messages">
          <DropdownMenuItem className="cursor-pointer" data-testid="menu-messages">
            <MessageSquare className="h-4 w-4 ml-2" />
            <span>الرسائل</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/wishlist">
          <DropdownMenuItem className="cursor-pointer" data-testid="menu-wishlist">
            <Heart className="h-4 w-4 ml-2" />
            <span>قائمة المراقبة</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        <Link href="/settings">
          <DropdownMenuItem className="cursor-pointer" data-testid="menu-settings">
            <Settings className="h-4 w-4 ml-2" />
            <span>الإعدادات</span>
          </DropdownMenuItem>
        </Link>

        {(user as any).isAdmin && (
          <Link href="/admin">
            <DropdownMenuItem className="cursor-pointer text-primary" data-testid="menu-admin">
              <Shield className="h-4 w-4 ml-2" />
              <span>لوحة المشرف</span>
            </DropdownMenuItem>
          </Link>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={() => logout()}
          data-testid="menu-logout"
        >
          <LogOut className="h-4 w-4 ml-2" />
          <span>تسجيل الخروج</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
