import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Gavel,
  ShoppingBag,
  Store,
  Settings,
  Bell,
  Heart,
  LogOut,
} from "lucide-react";

export function AccountDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        className="hover:text-primary font-semibold transition-colors text-xs"
        onClick={() => setOpen(!open)}
      >
        حسابي
      </Button>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="font-bold">حسابي</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <Link href="/settings" asChild>
          <DropdownMenuItem className="cursor-pointer">
            <User className="h-4 w-4 ml-2" />
            <span>ملفي الشخصي</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/my-auctions" asChild>
          <DropdownMenuItem className="cursor-pointer">
            <Gavel className="h-4 w-4 ml-2" />
            <span>مزاداتي</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/my-purchases" asChild>
          <DropdownMenuItem className="cursor-pointer">
            <ShoppingBag className="h-4 w-4 ml-2" />
            <span>مشترياتي</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/my-sales" asChild>
          <DropdownMenuItem className="cursor-pointer">
            <Store className="h-4 w-4 ml-2" />
            <span>مبيعاتي</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/wishlist" asChild>
          <DropdownMenuItem className="cursor-pointer">
            <Heart className="h-4 w-4 ml-2" />
            <span>قائمة المفضلة</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/notifications" asChild>
          <DropdownMenuItem className="cursor-pointer">
            <Bell className="h-4 w-4 ml-2" />
            <span>الإشعارات</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        <Link href="/settings" asChild>
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="h-4 w-4 ml-2" />
            <span>الإعدادات</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={() => {
            // Handle logout
            console.log("Logging out");
            setOpen(false);
          }}
        >
          <LogOut className="h-4 w-4 ml-2" />
          <span>تسجيل الخروج</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
