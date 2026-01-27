import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { share } from "@/lib/nativeShare";
import { getUserAvatarSrc } from "@/lib/avatar";
import { authFetch } from "@/lib/api";
import {
  Package,
  Plus,
  BarChart3,
  MessageSquare,
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Loader2,
  Star,
  User,
  Camera,
  Share2,
  BadgeCheck,
  AlertCircle,
  MapPin,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneVerificationModal } from "@/components/phone-verification-modal";

// Skeleton loading component for the account page
function AccountSkeleton() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          
          {/* Profile Header Skeleton */}
          <div className="flex items-center gap-4 py-6 border-b bg-white rounded-t-xl px-4 -mx-4 md:mx-0 md:px-6">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="w-6 h-6 rounded" />
          </div>

          {/* Sell Item CTA - Static, shows immediately */}
          <Link href="/sell">
            <div className="bg-blue-500 px-4 py-4 -mx-4 md:mx-0 md:px-6 border-b hover:bg-blue-600 transition-colors cursor-pointer">
              <div className="flex items-center gap-4 py-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-white text-lg">أضف منتج جديد</span>
                  <p className="text-blue-100 text-sm mt-0.5">ابدأ ببيع منتجاتك الآن</p>
                </div>
                <ChevronLeft className="h-6 w-6 text-white" />
              </div>
            </div>
          </Link>

          {/* Shopping Section - Static structure with skeleton badges */}
          <div className="bg-white px-4 py-4 -mx-4 md:mx-0 md:px-6 border-b">
            <h2 className="text-lg font-bold text-gray-900 mb-2">التسوق</h2>
            <Link href="/buyer-dashboard">
              <div className="flex items-center gap-4 py-4 px-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                <Package className="h-6 w-6 text-gray-600" />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">مركز المشتري</span>
                  <p className="text-sm text-gray-500 mt-0.5">مشترياتك ومزايداتك وعروضك</p>
                </div>
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </div>

          {/* Address Section - Static */}
          <div className="bg-white px-4 py-4 -mx-4 md:mx-0 md:px-6 border-b">
            <Link href="/settings">
              <div className="flex items-center gap-4 py-4 px-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                <MapPin className="h-6 w-6 text-gray-600" />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">العنوان</span>
                  <p className="text-sm text-gray-500 mt-0.5">إدارة عنوان التوصيل</p>
                </div>
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </div>

          {/* Settings Section - Static */}
          <div className="bg-white px-4 py-4 -mx-4 md:mx-0 md:px-6 rounded-b-xl mb-20">
            <div className="flex items-center gap-4 py-4 px-2">
              <Settings className="h-6 w-6 text-gray-600" />
              <div className="flex-1">
                <span className="font-medium text-gray-900">الإعدادات</span>
                <p className="text-sm text-gray-500 mt-0.5">إدارة حسابك والأمان والمساعدة</p>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

interface AccountMenuItem {
  icon: React.ReactNode;
  label: string;
  description?: string;
  href: string;
  badge?: string | number;
  badgeColor?: string;
}

interface BuyerSummary {
  totalPurchases: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent: number;
  wishlistItems: number;
  activeOffers: number;
}

interface SellerSummary {
  activeListings: number;
  pendingOrders: number;
  totalSales: number;
  totalRevenue: number;
}

// Check if user likely has a session (optimistic check)
function hasAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("authToken");
}

export default function MyAccount() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  
  // Optimistic: if we have a token, assume logged in until proven otherwise
  const hasToken = hasAuthToken();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("[Avatar] Starting upload, file:", file.name, file.size);

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً", description: "الحد الأقصى 5 ميغابايت", variant: "destructive" });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("images", file);

      console.log("[Avatar] Uploading to /api/uploads/optimized...");
      const response = await fetch("/api/uploads/optimized", {
        method: "POST",
        body: uploadFormData,
      });

      console.log("[Avatar] Upload response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Avatar] Upload failed:", errorText);
        throw new Error("Failed to upload image");
      }

      const result = await response.json();
      console.log("[Avatar] Upload result:", result);
      const avatarUrl = result.images[0].main;
      console.log("[Avatar] Avatar URL to save:", avatarUrl);

      console.log("[Avatar] Saving to profile...");
      const res = await authFetch("/api/account/profile", {
        method: "PUT",
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      console.log("[Avatar] Profile update response status:", res.status);
      if (res.ok) {
        const profileResult = await res.json();
        console.log("[Avatar] Profile update result:", profileResult);
        toast({ title: "تم تحديث الصورة بنجاح" });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      } else {
        const errorText = await res.text();
        console.error("[Avatar] Profile update failed:", errorText);
        toast({ title: "خطأ", description: "فشل في حفظ الصورة", variant: "destructive" });
      }
    } catch (error) {
      console.error("[Avatar] Error:", error);
      toast({ title: "خطأ", description: "فشل في رفع أو حفظ الصورة", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/seller/${user?.id}`;
    const shared = await share({ 
      title: `متجر ${user?.displayName}`, 
      url,
      dialogTitle: 'مشاركة المتجر'
    });
    
    if (!shared) {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "تم نسخ رابط المتجر" });
      } catch {
        toast({ title: "فشل نسخ الرابط", variant: "destructive" });
      }
    }
  };

  const { data: buyerSummary } = useQuery<BuyerSummary>({
    queryKey: ["/api/account/buyer-summary"],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - show cached data instantly
  });

  const { data: sellerSummary } = useQuery<SellerSummary>({
    queryKey: ["/api/account/seller-summary"],
    enabled: !!user?.id && user?.isVerified,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const { data: unreadMessages = 0 } = useQuery<number>({
    queryKey: ["/api/messages/unread-count"],
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds for messages
    retry: false, // Don't retry if endpoint doesn't exist
  });

  useEffect(() => {
    // Only redirect if auth check completed AND user is not authenticated
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول للوصول إلى حسابك",
        variant: "destructive",
      });
      navigate("/signin?redirect=/my-account");
    }
  }, [isLoading, isAuthenticated, navigate, toast]);

  // Optimistic rendering: if we have a token, show skeleton immediately
  // This makes the page feel instant for logged-in users
  if (isLoading && hasToken) {
    return <AccountSkeleton />;
  }

  // No token and still loading - show skeleton briefly
  if (isLoading) {
    return <AccountSkeleton />;
  }

  // Auth check completed but not authenticated - will redirect via useEffect
  if (!isAuthenticated || !user) {
    return <AccountSkeleton />;
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      toast({
        title: "تم تسجيل الخروج",
        description: "نراك قريباً!",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تسجيل الخروج",
        variant: "destructive",
      });
    }
  };

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const sellingItems: AccountMenuItem[] = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      label: "لوحة البائع",
      description: "إدارة منتجاتك ومبيعاتك",
      href: "/seller-dashboard",
      badge: sellerSummary?.pendingOrders || undefined,
      badgeColor: "bg-red-500",
    },
  ];

  const settingsSubItems = [
    {
      icon: <Shield className="h-5 w-5" />,
      label: "إعدادات الأمان",
      description: "المصادقة الثنائية وكلمة المرور",
      href: "/security-settings",
    },
    {
      icon: <HelpCircle className="h-5 w-5" />,
      label: "المساعدة",
      description: "الأسئلة الشائعة والدعم",
      href: "/contact",
    },
    {
      icon: <Info className="h-5 w-5" />,
      label: "حول التطبيق",
      description: "معلومات عن E-بيع",
      href: "/about",
    },
  ];

  const MenuItem = ({ item }: { item: AccountMenuItem }) => (
    <Link href={item.href}>
      <div className="flex items-center gap-4 py-4 px-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" data-testid={`menu-${item.label}`}>
        <div className="text-gray-600">{item.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{item.label}</span>
            {item.badge && (
              <Badge className={`${item.badgeColor || "bg-gray-500"} text-white text-xs px-2 py-0.5`}>
                {item.badge}
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
          )}
        </div>
        <ChevronLeft className="h-5 w-5 text-gray-400" />
      </div>
    </Link>
  );

  const memberSince = user.createdAt 
    ? new Date(user.createdAt).getFullYear() 
    : new Date().getFullYear();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          
          {/* Profile Header - v2 Updated */}
          <div className="flex items-center gap-4 py-6 border-b bg-white rounded-t-xl px-4 -mx-4 md:mx-0 md:px-6">
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                data-testid="input-avatar-upload"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative group"
                disabled={isUploadingAvatar}
                data-testid="button-change-avatar"
              >
                {getUserAvatarSrc(user) ? (
                  <img 
                    src={getUserAvatarSrc(user) || ''} 
                    alt={user.displayName || "صورة الملف الشخصي"} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {user.displayName?.charAt(0) || user.phone?.charAt(0) || "م"}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingAvatar ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="absolute bottom-0 left-0 bg-primary rounded-full p-1">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </button>
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg text-gray-900">{user.displayName || user.phone}</h1>
              <p className="text-sm text-gray-500">عضو منذ {memberSince}</p>
              {user.isVerified && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm text-gray-600">
                    {user.rating ? `${Math.round(user.rating * 20)}% تقييم إيجابي` : "جديد"} 
                    {user.totalSales ? ` • ${user.totalSales} عملية بيع` : ""}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {user.isVerified && (
                <button 
                  onClick={handleShareProfile}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  data-testid="button-share-profile"
                >
                  <Share2 className="h-5 w-5 text-gray-600" />
                </button>
              )}
              <Link href="/messages">
                <div className="relative">
                  <MessageSquare className="h-6 w-6 text-gray-600" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          </div>

          {/* Sell Item - Featured CTA */}
          <Link href="/sell">
            <div className="bg-blue-500 px-4 py-4 -mx-4 md:mx-0 md:px-6 border-b hover:bg-blue-600 transition-colors cursor-pointer" data-testid="menu-sell-item">
              <div className="flex items-center gap-4 py-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-white text-lg">أضف منتج جديد</span>
                  <p className="text-blue-100 text-sm mt-0.5">ابدأ ببيع منتجاتك الآن</p>
                </div>
                <ChevronLeft className="h-6 w-6 text-white" />
              </div>
            </div>
          </Link>

          {/* Shopping Section */}
          <div className="bg-white px-4 py-4 -mx-4 md:mx-0 md:px-6 border-b">
            <h2 className="text-lg font-bold text-gray-900 mb-2">التسوق</h2>
            <Link href="/buyer-dashboard">
              <div className="flex items-center gap-4 py-4 px-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" data-testid="menu-buyer-center">
                <div className="text-gray-600">
                  <Package className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">مركز المشتري</span>
                    {(buyerSummary?.activeOffers || 0) > 0 && (
                      <Badge className="bg-primary text-white text-xs px-2 py-0.5">
                        {buyerSummary?.activeOffers}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">مشترياتك ومزايداتك وعروضك</p>
                </div>
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </div>

          {/* Address Section */}
          <div className="bg-white px-4 py-4 -mx-4 md:mx-0 md:px-6 border-b">
            <Link href="/settings">
              <div className="flex items-center gap-4 py-4 px-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" data-testid="menu-address">
                <div className="text-gray-600">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">العنوان</span>
                  <p className="text-sm text-gray-500 mt-0.5">إدارة عنوان التوصيل</p>
                </div>
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </div>

          {/* Selling Section - Only show for verified sellers */}
          {user.isVerified && (
            <div className="bg-white px-4 py-4 -mx-4 md:mx-0 md:px-6 border-b">
              <h2 className="text-lg font-bold text-gray-900 mb-2">البيع</h2>
              <div className="divide-y">
                {sellingItems.map((item, i) => (
                  <MenuItem key={i} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Settings Section */}
          <div className="bg-white px-4 py-4 -mx-4 md:mx-0 md:px-6 rounded-b-xl mb-20">
            <div>
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="flex items-center gap-4 py-4 px-2 w-full hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                data-testid="menu-settings-dropdown"
              >
                <div className="text-gray-600">
                  <Settings className="h-6 w-6" />
                </div>
                <div className="flex-1 text-right">
                  <span className="font-medium text-gray-900">الإعدادات</span>
                  <p className="text-sm text-gray-500 mt-0.5">إدارة حسابك والأمان والمساعدة</p>
                </div>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showSettingsMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showSettingsMenu && (
                <div className="mr-8 border-r border-gray-200 pr-4">
                  {settingsSubItems.map((item, i) => (
                    <Link key={i} href={item.href}>
                      <div className="flex items-center gap-3 py-3 px-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors" data-testid={`menu-${item.label}`}>
                        <div className="text-gray-500">{item.icon}</div>
                        <div className="flex-1">
                          <span className="font-medium text-gray-700 text-sm">{item.label}</span>
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                        </div>
                        <ChevronLeft className="h-4 w-4 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 py-3 px-2 w-full hover:bg-red-50 rounded-lg cursor-pointer transition-colors text-red-600 mt-2 border-t border-gray-100 pt-3"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium text-sm">تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <PhoneVerificationModal
        open={showPhoneVerification}
        onOpenChange={setShowPhoneVerification}
        phone={user.phone || ""}
        phoneVerified={user.phoneVerified || false}
      />
    </Layout>
  );
}
