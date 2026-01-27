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
  Heart,
  Package,
  ShoppingBag,
  Clock,
  Gavel,
  Tag,
  Plus,
  BarChart3,
  MessageSquare,
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  ChevronLeft,
  Loader2,
  Star,
  User,
  Camera,
  Share2,
  BadgeCheck,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneVerificationModal } from "@/components/phone-verification-modal";

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

export default function MyAccount() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

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
  });

  const { data: sellerSummary } = useQuery<SellerSummary>({
    queryKey: ["/api/account/seller-summary"],
    enabled: !!user?.id && user?.isVerified,
  });

  const { data: unreadMessages = 0 } = useQuery<number>({
    queryKey: ["/api/messages/unread-count"],
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول للوصول إلى حسابك",
        variant: "destructive",
      });
      navigate("/signin?redirect=/my-account");
    }
  }, [isLoading, isAuthenticated, navigate, toast]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
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

  const shoppingItems: AccountMenuItem[] = [
    {
      icon: <Package className="h-6 w-6" />,
      label: "مشترياتي",
      description: "سجل طلباتك السابقة",
      href: "/my-purchases",
      badge: buyerSummary?.totalPurchases || undefined,
    },
    {
      icon: <Gavel className="h-6 w-6" />,
      label: "المزايدات والعروض",
      description: "المزادات النشطة وعروضك",
      href: "/buyer-dashboard",
      badge: buyerSummary?.activeOffers || undefined,
    },
    {
      icon: <Gavel className="h-6 w-6" />,
      label: "مزايداتي",
      description: "جميع المزايدات التي قدمتها",
      href: "/my-bids",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      label: "شوهدت مؤخراً",
      description: "المنتجات التي زرتها",
      href: "/search",
    },
  ];

  const sellingItems: AccountMenuItem[] = [
    {
      icon: <Plus className="h-6 w-6" />,
      label: "أضف منتج جديد",
      description: "ابدأ ببيع منتجاتك",
      href: "/sell",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      label: "لوحة البائع",
      description: "إدارة منتجاتك ومبيعاتك",
      href: "/seller-dashboard",
      badge: sellerSummary?.pendingOrders || undefined,
      badgeColor: "bg-red-500",
    },
    {
      icon: <Tag className="h-6 w-6" />,
      label: "منتجاتي النشطة",
      description: `${sellerSummary?.activeListings || 0} منتج معروض`,
      href: "/seller-dashboard",
    },
  ];

  const shortcutItems: AccountMenuItem[] = [
    {
      icon: <MessageSquare className="h-6 w-6" />,
      label: "الرسائل",
      description: "محادثاتك مع البائعين والمشترين",
      href: "/messages",
      badge: unreadMessages || undefined,
      badgeColor: "bg-primary",
    },
    {
      icon: <Settings className="h-6 w-6" />,
      label: "الإعدادات",
      description: "إدارة حسابك وتفضيلاتك",
      href: "/settings",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      label: "إعدادات الأمان",
      description: "المصادقة الثنائية وكلمة المرور",
      href: "/security-settings",
    },
    {
      icon: <HelpCircle className="h-6 w-6" />,
      label: "المساعدة",
      description: "الأسئلة الشائعة والدعم",
      href: "/contact",
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
              <Link href="/cart">
                <ShoppingBag className="h-6 w-6 text-gray-600" />
              </Link>
            </div>
          </div>

          {/* Shopping Section */}
          <div className="bg-white px-4 py-4 -mx-4 md:mx-0 md:px-6 border-b">
            <h2 className="text-lg font-bold text-gray-900 mb-2">التسوق</h2>
            <div className="divide-y">
              {shoppingItems.map((item, i) => (
                <MenuItem key={i} item={item} />
              ))}
            </div>
          </div>

          {/* Selling Section - Show for all users but highlight for sellers */}
          <div className="bg-white px-4 py-4 -mx-4 md:mx-0 md:px-6 border-b">
            <h2 className="text-lg font-bold text-gray-900 mb-2">البيع</h2>
            {!user.isVerified ? (
              <div className="py-4">
                <Link href="/sell">
                  <div className="flex items-center gap-4 py-4 px-4 bg-primary/5 rounded-xl cursor-pointer hover:bg-primary/10 transition-colors border border-primary/20">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-primary">ابدأ البيع على E-بيع</span>
                      <p className="text-sm text-gray-600 mt-0.5">تقدم بطلب للحصول على صلاحية البيع</p>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-primary" />
                  </div>
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {sellingItems.map((item, i) => (
                  <MenuItem key={i} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Shortcuts Section */}
          <div className="bg-white px-4 py-4 -mx-4 md:mx-0 md:px-6 border-b">
            <h2 className="text-lg font-bold text-gray-900 mb-2">اختصارات</h2>
            <div className="divide-y">
              {shortcutItems.map((item, i) => (
                <MenuItem key={i} item={item} />
              ))}
            </div>
          </div>

          {/* Logout Button */}
          <div className="bg-white px-4 py-4 -mx-4 md:mx-0 md:px-6 rounded-b-xl mb-8">
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 py-4 px-2 w-full hover:bg-red-50 rounded-lg cursor-pointer transition-colors text-red-600"
              data-testid="button-logout"
            >
              <LogOut className="h-6 w-6" />
              <span className="font-medium">تسجيل الخروج</span>
            </button>
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
