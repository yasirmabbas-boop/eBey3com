import { Link } from "wouter";
import { Search, ShoppingCart, User, Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@assets/generated_images/arabic_logo_اي_بيع.png";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans" dir="rtl">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-1 text-xs px-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex gap-4">
            <span>دعم العملاء: ٠٧٧٠٠٠٠٠٠٠٠</span>
            <span>بغداد، العراق</span>
          </div>
          <div className="flex gap-4">
            <Link href="/register" className="hover:underline">تسجيل الدخول / إنشاء حساب</Link>
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
                <Link href="/category/watches" className="text-lg">ساعات</Link>
                <Link href="/category/clothing" className="text-lg">ملابس</Link>
                <Link href="/category/vintage" className="text-lg">مقتنيات قديمة</Link>
                <Link href="/register" className="text-lg text-primary">حسابي</Link>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <img src={logo} alt="اي بيع" className="h-10 md:h-12 object-contain" />
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl relative">
            <Input 
              type="search" 
              placeholder="ابحث عن ساعات، ملابس، مقتنيات..." 
              className="w-full pl-10 pr-4 bg-muted/30 border-primary/20 focus-visible:ring-primary"
            />
            <Button size="icon" className="absolute left-1 top-1 bottom-1 h-auto w-10 bg-primary text-white hover:bg-primary/90 rounded-sm">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/register">
              <Button variant="ghost" size="icon" className="hidden md:flex">
                <User className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-accent text-accent-foreground text-[10px] rounded-full flex items-center justify-center">0</span>
            </Button>
            <Link href="/register">
              <Button className="hidden md:flex bg-accent hover:bg-accent/90 text-white font-bold px-6">
                بيع الآن
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex container mx-auto px-4 py-2 gap-8 text-sm font-medium text-muted-foreground border-t">
          <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
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
            <img src={logo} alt="اي بيع" className="h-12 mb-4 brightness-0 invert opacity-80" />
            <p className="text-sm leading-relaxed">
              منصتك الأولى للبيع والشراء في العراق.
              ساعات، ملابس، وكل ما هو مميز.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/">الرئيسية</Link></li>
              <li><Link href="/about">من نحن</Link></li>
              <li><Link href="/terms">الشروط والأحكام</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">المساعدة</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/support">مركز المساعدة</Link></li>
              <li><Link href="/register">البيع على اي بيع</Link></li>
              <li><Link href="/safety">السلامة والخصوصية</Link></li>
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
