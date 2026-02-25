import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Users, Package, AlertTriangle, DollarSign, BarChart3, FileWarning, CheckCircle, XCircle, Shield, Ban, UserCheck, Store, Pause, Play, Trash2, Eye, Search, Mail, MailOpen, Key, Copy, BadgeCheck, Award, Star, StarOff, Wallet, BanknoteIcon, Clock, Calendar, RotateCcw, Plus } from "lucide-react";
import { AdminSearchBar } from "@/components/admin/admin-search-bar";
import { ReturnsTable } from "@/components/admin/returns-table";
import { ReturnDetailDialog } from "@/components/admin/return-detail-dialog";
import { CreateReturnDialog } from "@/components/admin/create-return-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface AdminStats {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  totalTransactions: number;
  pendingReports: number;
  totalRevenue: number;
}

interface Report {
  id: string;
  reporterId: string;
  reportType: string;
  targetId: string;
  targetType: string;
  reason: string;
  details?: string;
  status: string;
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  // Enhanced fields from joined data
  reporterName?: string;
  reporterPhone?: string;
  listingTitle?: string;
  listingImage?: string;
  listingPrice?: number;
  sellerId?: string;
  sellerName?: string;
  totalReportsOnTarget: number;
  pendingReportsOnTarget: number;
}

interface User {
  id: string;
  phone?: string;
  email?: string;
  displayName: string;
  accountCode?: string;
  sellerApproved: boolean;
  sellerRequestStatus?: string;
  isAdmin: boolean;
  isBanned: boolean;
  isAuthenticated: boolean;
  authenticityGuaranteed: boolean;
  totalSales: number;
  totalPurchases: number;
  rating: number;
  ratingCount: number;
  buyerRating: number;
  buyerRatingCount: number;
  createdAt: string;
}

interface AdminListing {
  id: string;
  productCode?: string;
  title: string;
  price: number;
  category: string;
  saleType: string;
  sellerName: string;
  sellerId?: string;
  city: string;
  isActive: boolean;
  isPaused: boolean;
  isFeatured: boolean;
  createdAt: string;
  currentBid?: number;
  totalBids?: number;
  image?: string;
  views?: number;
}

interface RecentActivity {
  id: string;
  type: 'listing' | 'transaction' | 'user' | 'report';
  title: string;
  description: string;
  link?: string;
  createdAt: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const authToken = getAuthToken();
  const headers: HeadersInit = { ...options.headers };
  if (authToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${authToken}`;
  }
  return fetch(url, { ...options, credentials: "include", headers });
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"stats" | "reports" | "users" | "seller-requests" | "listings" | "deleted-listings" | "messages" | "cancellations" | "payouts" | "returns">("stats");
  const [listingSearch, setListingSearch] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [highlightedReportId, setHighlightedReportId] = useState<string | null>(null);
  const highlightedReportRef = useRef<HTMLTableRowElement>(null);
  
  // Pagination state for each tab
  const [reportsPage, setReportsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [listingsPage, setListingsPage] = useState(1);
  const pageSize = 20;
  const [walletAdjustment, setWalletAdjustment] = useState({
    targetUserId: "",
    accountType: "seller",
    amount: "",
    description: "",
  });
  const [reportAction, setReportAction] = useState<{
    id: string;
    status: "resolved" | "rejected";
    adminNotes: string;
    targetLabel: string;
  } | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [showReturnDetail, setShowReturnDetail] = useState(false);
  const [showCreateReturn, setShowCreateReturn] = useState(false);

  // Handle deep linking from notifications
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const reportId = params.get("reportId");
    
    if (tab && ["stats", "reports", "users", "seller-requests", "listings", "deleted-listings", "messages", "cancellations", "payouts", "returns"].includes(tab)) {
      setActiveTab(tab as typeof activeTab);
    }
    
    if (reportId) {
      setHighlightedReportId(reportId);
      // Clear highlight after 5 seconds
      setTimeout(() => setHighlightedReportId(null), 5000);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || !(user as any).isAdmin)) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !authLoading && (user as any)?.isAdmin,
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery<{ reports: Report[]; pagination: { page: number; limit: number; total: number; hasMore: boolean; totalPages: number } }>({
    queryKey: ["/api/admin/reports", reportsPage],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/admin/reports?page=${reportsPage}&limit=${pageSize}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled: !authLoading && (user as any)?.isAdmin && activeTab === "reports",
  });
  const reports = reportsData?.reports || [];
  const reportsPagination = reportsData?.pagination;

  // Scroll to highlighted report when data loads
  useEffect(() => {
    if (highlightedReportId && highlightedReportRef.current && reports.length > 0) {
      setTimeout(() => {
        highlightedReportRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "center" 
        });
      }, 300);
    }
  }, [highlightedReportId, reports]);

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: User[]; pagination: { page: number; limit: number; total: number; hasMore: boolean; totalPages: number } }>({
    queryKey: ["/api/admin/users", usersPage],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/admin/users?page=${usersPage}&limit=${pageSize}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !authLoading && (user as any)?.isAdmin && (activeTab === "users" || activeTab === "seller-requests"),
  });
  const users = usersData?.users || [];
  const usersPagination = usersData?.pagination;

  const { data: listingsData, isLoading: listingsLoading } = useQuery<{ listings: AdminListing[]; pagination: { page: number; limit: number; total: number; hasMore: boolean; totalPages: number } }>({
    queryKey: ["/api/admin/listings", listingsPage],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/admin/listings?page=${listingsPage}&limit=${pageSize}`);
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
    enabled: !authLoading && (user as any)?.isAdmin && activeTab === "listings",
  });
  const listings = listingsData?.listings || [];
  const listingsPagination = listingsData?.pagination;

  interface DeletedListing {
    id: string;
    productCode?: string;
    title: string;
    price: number;
    category: string;
    saleType: string;
    sellerName: string;
    sellerId?: string;
    city: string;
    deletedAt?: string;
    createdAt: string;
    image?: string;
  }

  const { data: deletedListings, isLoading: deletedListingsLoading } = useQuery<DeletedListing[]>({
    queryKey: ["/api/admin/listings/deleted"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/admin/listings/deleted");
      if (!res.ok) throw new Error("Failed to fetch deleted listings");
      return res.json();
    },
    enabled: !authLoading && (user as any)?.isAdmin && activeTab === "deleted-listings",
  });

  const { data: contactMessages, isLoading: messagesLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/contact-messages"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/admin/contact-messages");
      if (!res.ok) throw new Error("Failed to fetch contact messages");
      return res.json();
    },
    enabled: !authLoading && (user as any)?.isAdmin && activeTab === "messages",
  });

  interface CancelledTransaction {
    id: string;
    listingId: string;
    sellerId: string;
    buyerId: string;
    amount: number;
    cancellationReason: string;
    cancelledAt: string;
    sellerName: string;
    buyerName: string;
    listingTitle: string;
  }

  const { data: cancellations, isLoading: cancellationsLoading } = useQuery<CancelledTransaction[]>({
    queryKey: ["/api/admin/cancellations"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/admin/cancellations");
      if (!res.ok) throw new Error("Failed to fetch cancellations");
      return res.json();
    },
    enabled: !authLoading && (user as any)?.isAdmin && activeTab === "cancellations",
  });

  interface AdminPayout {
    id: string;
    sellerId: string;
    sellerName: string;
    sellerPhone: string;
    weekStartDate: string;
    weekEndDate: string;
    totalEarnings: number;
    totalCommission: number;
    totalShipping: number;
    totalReturns: number;
    netPayout: number;
    status: string;
    paidAt?: string;
    paidBy?: string;
    paymentMethod?: string;
    paymentReference?: string;
  }

  const { data: pendingPayouts, isLoading: payoutsLoading } = useQuery<AdminPayout[]>({
    queryKey: ["/api/admin/payouts"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/admin/payouts");
      if (!res.ok) throw new Error("Failed to fetch payouts");
      return res.json();
    },
    enabled: !authLoading && (user as any)?.isAdmin && activeTab === "payouts",
  });

  const generatePayoutsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth("/api/admin/payouts/generate", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate payouts");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      toast({ title: `تم إنشاء ${data.payoutsCreated} دفعة جديدة` });
    },
    onError: () => {
      toast({ title: "فشل في إنشاء الدفعات", variant: "destructive" });
    },
  });

  const markPayoutPaidMutation = useMutation({
    mutationFn: async ({ id, paymentMethod, paymentReference }: { id: string; paymentMethod: string; paymentReference?: string }) => {
      const res = await fetchWithAuth(`/api/admin/payouts/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, paymentReference }),
      });
      if (!res.ok) throw new Error("Failed to mark payout as paid");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      toast({ title: "تم تحديث حالة الدفع بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث حالة الدفع", variant: "destructive" });
    },
  });

  const processHoldsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth("/api/admin/financial/process-holds", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to process holds");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `تم تحرير ${data.releasedTransactions} معاملة من فترة الانتظار` });
    },
    onError: () => {
      toast({ title: "فشل في معالجة فترات الانتظار", variant: "destructive" });
    },
  });

  const walletAdjustmentMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(walletAdjustment.amount);
      const res = await fetchWithAuth("/api/admin/wallet/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: walletAdjustment.targetUserId,
          accountType: walletAdjustment.accountType,
          amount,
          description: walletAdjustment.description,
        }),
      });
      if (!res.ok) throw new Error("Failed to adjust wallet");
      return res.json();
    },
    onSuccess: () => {
      setWalletAdjustment({
        targetUserId: "",
        accountType: "seller",
        amount: "",
        description: "",
      });
      toast({ title: "تم تحديث الرصيد بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تعديل الرصيد", variant: "destructive" });
    },
  });

  const markMessageReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(`/api/admin/contact-messages/${id}/read`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to mark message as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contact-messages"] });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const res = await fetchWithAuth(`/api/admin/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!res.ok) throw new Error("Failed to update report");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports", reportsPage] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "تم تحديث البلاغ بنجاح" });
      setReportAction(null);
    },
    onError: () => {
      toast({ title: "فشل في تحديث البلاغ", variant: "destructive" });
    },
  });


  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { isBanned?: boolean; sellerApproved?: boolean; sellerRequestStatus?: string; isAuthenticated?: boolean; authenticityGuaranteed?: boolean } }) => {
      const res = await fetchWithAuth(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "تم تحديث المستخدم بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث المستخدم", variant: "destructive" });
    },
  });

  const [resetPasswordResult, setResetPasswordResult] = useState<{ userId: string; userName: string; tempPassword: string } | null>(null);

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetchWithAuth(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to reset password");
      return res.json();
    },
    onSuccess: (data, userId) => {
      const targetUser = users?.find(u => u.id === userId);
      setResetPasswordResult({
        userId,
        userName: targetUser?.displayName || "المستخدم",
        tempPassword: data.tempPassword,
      });
      toast({ title: "تم إعادة تعيين كلمة المرور بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في إعادة تعيين كلمة المرور", variant: "destructive" });
    },
  });

  const updateListingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { isActive?: boolean; isPaused?: boolean } }) => {
      const res = await fetchWithAuth(`/api/admin/listings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update listing");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "تم تحديث المنتج بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث المنتج", variant: "destructive" });
    },
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(`/api/admin/listings/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete listing");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings", listingsPage] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "تم حذف المنتج بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في حذف المنتج", variant: "destructive" });
    },
  });

  const featureListingMutation = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      const res = await fetchWithAuth(`/api/admin/listings/${id}/feature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured }),
      });
      if (!res.ok) throw new Error("Failed to feature listing");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings", listingsPage] });
      queryClient.invalidateQueries({ queryKey: ["/api/hero-listings"] });
      toast({ title: variables.isFeatured ? "تم ترقية المنتج للصفحة الرئيسية" : "تم إزالة المنتج من الصفحة الرئيسية" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث المنتج", variant: "destructive" });
    },
  });

  const handleSellerRequest = (userId: string, action: "approve" | "reject") => {
    updateUserMutation.mutate({
      id: userId,
      updates: {
        sellerApproved: action === "approve",
        sellerRequestStatus: action === "approve" ? "approved" : "rejected",
      },
    });
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user || !(user as any).isAdmin) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">قيد المراجعة</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">تم الحل</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      spam: "سبام",
      fraud: "احتيال",
      inappropriate: "محتوى غير لائق",
      fake: "منتج مزيف",
      other: "أخرى",
    };
    return labels[type] || type;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8" dir="rtl">
        {/* Global Search Bar */}
        <div className="mb-6 flex justify-end">
          <AdminSearchBar />
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-64 shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  لوحة التحكم
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="flex flex-col">
                  <button
                    onClick={() => setActiveTab("stats")}
                    className={`flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors ${activeTab === "stats" ? "bg-muted font-semibold border-r-4 border-primary" : ""}`}
                    data-testid="button-tab-stats"
                  >
                    <BarChart3 className="h-5 w-5" />
                    إحصائيات
                  </button>
                  <button
                    onClick={() => setActiveTab("reports")}
                    className={`flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors ${activeTab === "reports" ? "bg-muted font-semibold border-r-4 border-primary" : ""}`}
                    data-testid="button-tab-reports"
                  >
                    <FileWarning className="h-5 w-5" />
                    البلاغات
                    {stats?.pendingReports ? (
                      <Badge variant="destructive" className="mr-auto">{stats.pendingReports}</Badge>
                    ) : null}
                  </button>
                  <button
                    onClick={() => setActiveTab("users")}
                    className={`flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors ${activeTab === "users" ? "bg-muted font-semibold border-r-4 border-primary" : ""}`}
                    data-testid="button-tab-users"
                  >
                    <Users className="h-5 w-5" />
                    المستخدمين
                  </button>
                  <button
                    onClick={() => setActiveTab("seller-requests")}
                    className={`flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors ${activeTab === "seller-requests" ? "bg-muted font-semibold border-r-4 border-primary" : ""}`}
                    data-testid="button-tab-seller-requests"
                  >
                    <UserCheck className="h-5 w-5" />
                    طلبات البائعين
                    {users?.filter(u => u.sellerRequestStatus === "pending").length ? (
                      <Badge variant="secondary" className="mr-auto bg-amber-100 text-amber-800">
                        {users.filter(u => u.sellerRequestStatus === "pending").length}
                      </Badge>
                    ) : null}
                  </button>
                  <button
                    onClick={() => setActiveTab("listings")}
                    className={`flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors ${activeTab === "listings" ? "bg-muted font-semibold border-r-4 border-primary" : ""}`}
                    data-testid="button-tab-listings"
                  >
                    <Package className="h-5 w-5" />
                    إدارة المنتجات
                  </button>
                  <button
                    onClick={() => setActiveTab("deleted-listings")}
                    className={`flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors ${activeTab === "deleted-listings" ? "bg-muted font-semibold border-r-4 border-primary" : ""}`}
                    data-testid="button-tab-deleted-listings"
                  >
                    <Trash2 className="h-5 w-5" />
                    المنتجات المحذوفة
                  </button>
                  <button
                    onClick={() => setActiveTab("messages")}
                    className={`flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors ${activeTab === "messages" ? "bg-muted font-semibold border-r-4 border-primary" : ""}`}
                    data-testid="button-tab-messages"
                  >
                    <Mail className="h-5 w-5" />
                    رسائل التواصل
                    {contactMessages?.filter(m => !m.isRead).length ? (
                      <Badge variant="secondary" className="mr-auto bg-blue-100 text-blue-800">
                        {contactMessages.filter(m => !m.isRead).length}
                      </Badge>
                    ) : null}
                  </button>
                  <button
                    onClick={() => setActiveTab("cancellations")}
                    className={`flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors ${activeTab === "cancellations" ? "bg-muted font-semibold border-r-4 border-primary" : ""}`}
                    data-testid="button-tab-cancellations"
                  >
                    <XCircle className="h-5 w-5" />
                    إلغاءات البائعين
                    {cancellations?.length ? (
                      <Badge variant="secondary" className="mr-auto bg-red-100 text-red-800">
                        {cancellations.length}
                      </Badge>
                    ) : null}
                  </button>
                  <button
                    onClick={() => setActiveTab("payouts")}
                    className={`flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors ${activeTab === "payouts" ? "bg-muted font-semibold border-r-4 border-primary" : ""}`}
                    data-testid="button-tab-payouts"
                  >
                    <Wallet className="h-5 w-5" />
                    المدفوعات الأسبوعية
                    {pendingPayouts?.filter(p => p.status === "pending").length ? (
                      <Badge variant="secondary" className="mr-auto bg-green-100 text-green-800">
                        {pendingPayouts.filter(p => p.status === "pending").length}
                      </Badge>
                    ) : null}
                  </button>
                  <button
                    onClick={() => setActiveTab("returns")}
                    className={`flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors ${activeTab === "returns" ? "bg-muted font-semibold border-r-4 border-primary" : ""}`}
                    data-testid="button-tab-returns"
                  >
                    <RotateCcw className="h-5 w-5" />
                    طلبات الإرجاع
                  </button>
                </nav>
              </CardContent>
            </Card>
          </aside>

          <main className="flex-1">
            {activeTab === "stats" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">إحصائيات الموقع</h2>
                {statsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : stats ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card data-testid="card-stat-users">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
                            <p className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                          </div>
                          <Users className="h-10 w-10 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-stat-listings">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
                            <p className="text-3xl font-bold">{stats.totalListings.toLocaleString()}</p>
                          </div>
                          <Package className="h-10 w-10 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-stat-active-listings">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">المنتجات النشطة</p>
                            <p className="text-3xl font-bold">{stats.activeListings.toLocaleString()}</p>
                          </div>
                          <Package className="h-10 w-10 text-emerald-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-stat-transactions">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">إجمالي المعاملات</p>
                            <p className="text-3xl font-bold">{stats.totalTransactions.toLocaleString()}</p>
                          </div>
                          <DollarSign className="h-10 w-10 text-yellow-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-stat-reports">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">البلاغات المعلقة</p>
                            <p className="text-3xl font-bold">{stats.pendingReports.toLocaleString()}</p>
                          </div>
                          <AlertTriangle className="h-10 w-10 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === "reports" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">إدارة البلاغات</h2>
                {reportsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : reports && reports.length > 0 ? (
                  <Card>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">المنتج المُبلَّغ عنه</TableHead>
                            <TableHead className="text-right">نوع البلاغ</TableHead>
                            <TableHead className="text-right">السبب والتفاصيل</TableHead>
                            <TableHead className="text-right">المُبلِّغ</TableHead>
                            <TableHead className="text-right">البائع</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-right">التاريخ</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reports.map((report) => (
                            <TableRow 
                              key={report.id} 
                              ref={highlightedReportId === report.id ? highlightedReportRef : null}
                              data-testid={`row-report-${report.id}`} 
                              className={cn(
                                report.pendingReportsOnTarget >= 3 && "bg-red-50",
                                highlightedReportId === report.id && "bg-yellow-100 border-2 border-yellow-400 animate-pulse"
                              )}
                            >
                              <TableCell>
                                {report.targetType === "listing" && report.listingTitle ? (
                                  <Link href={`/product/${report.targetId}`}>
                                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                                      {report.listingImage && (
                                        <img 
                                          src={report.listingImage} 
                                          alt={report.listingTitle}
                                          className="w-12 h-12 object-cover rounded border"
                                        />
                                      )}
                                      <div>
                                        <p className="font-medium text-sm max-w-[150px] truncate">{report.listingTitle}</p>
                                        {report.listingPrice && (
                                          <p className="text-xs text-muted-foreground">{report.listingPrice.toLocaleString()} د.ع</p>
                                        )}
                                      </div>
                                    </div>
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground text-sm">
                                    {report.targetType === "user" ? "مستخدم" : report.targetType}
                                    <br />
                                    <span className="text-xs">{report.targetId.slice(0, 8)}...</span>
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  {getReportTypeLabel(report.reportType)}
                                  {report.pendingReportsOnTarget > 1 && (
                                    <Badge variant="destructive" className="text-xs w-fit">
                                      {report.pendingReportsOnTarget} بلاغات معلقة
                                    </Badge>
                                  )}
                                  {report.totalReportsOnTarget > report.pendingReportsOnTarget && (
                                    <Badge variant="outline" className="text-xs w-fit">
                                      إجمالي {report.totalReportsOnTarget}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <p className="text-sm">{report.reason}</p>
                                {report.details && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">{report.details}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="font-medium">{report.reporterName || "مجهول"}</p>
                                  {report.reporterPhone && (
                                    <p className="text-xs text-muted-foreground" dir="ltr">{report.reporterPhone}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {report.sellerId ? (
                                  <div className="text-sm">
                                    <p className="font-medium">{report.sellerName || "غير معروف"}</p>
                                    <Link href={`/search?sellerId=${report.sellerId}`}>
                                      <span className="text-xs text-primary hover:underline cursor-pointer">عرض منتجاته</span>
                                    </Link>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>{getStatusBadge(report.status)}</TableCell>
                              <TableCell className="text-sm">{new Date(report.createdAt).toLocaleDateString("ar-IQ")}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-2">
                                  {report.targetType === "listing" && (
                                    <Link href={`/product/${report.targetId}`}>
                                      <Button size="sm" variant="outline" className="w-full">
                                        <Eye className="h-4 w-4 ml-1" />
                                        عرض
                                      </Button>
                                    </Link>
                                  )}
                                  {report.status === "pending" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600 border-green-600 hover:bg-green-50"
                                        onClick={() => setReportAction({
                                          id: report.id,
                                          status: "resolved",
                                          adminNotes: "",
                                          targetLabel: report.listingTitle || report.targetId.slice(0, 8),
                                        })}
                                        disabled={updateReportMutation.isPending}
                                        data-testid={`button-resolve-report-${report.id}`}
                                      >
                                        <CheckCircle className="h-4 w-4 ml-1" />
                                        حل
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 border-red-600 hover:bg-red-50"
                                        onClick={() => setReportAction({
                                          id: report.id,
                                          status: "rejected",
                                          adminNotes: "",
                                          targetLabel: report.listingTitle || report.targetId.slice(0, 8),
                                        })}
                                        disabled={updateReportMutation.isPending}
                                        data-testid={`button-reject-report-${report.id}`}
                                      >
                                        <XCircle className="h-4 w-4 ml-1" />
                                        رفض
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {reportsPagination && reportsPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          عرض {((reportsPage - 1) * pageSize) + 1} - {Math.min(reportsPage * pageSize, reportsPagination.total)} من {reportsPagination.total}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReportsPage(p => Math.max(1, p - 1))}
                            disabled={reportsPage === 1}
                          >
                            السابق
                          </Button>
                          <span className="flex items-center px-3 text-sm">
                            صفحة {reportsPage} من {reportsPagination.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReportsPage(p => Math.min(reportsPagination.totalPages, p + 1))}
                            disabled={reportsPage >= reportsPagination.totalPages}
                          >
                            التالي
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <FileWarning className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد بلاغات</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "users" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">إدارة المستخدمين</h2>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>ملاحظة:</strong> التحقق من الأصالة هو مسؤولية البائع والمشتري. المنصة لا تضمن صحة المنتجات. شارة "مصادق عليه" تعني أن البائع أكد الأصالة فقط.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="بحث بالاسم أو رقم الحساب..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="max-w-md"
                    data-testid="input-user-search"
                  />
                  <Button variant="outline" onClick={() => setUserSearchQuery("")} data-testid="button-clear-search">
                    مسح
                  </Button>
                </div>
                {usersLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : users && users.length > 0 ? (
                  <Card>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">الاسم</TableHead>
                            <TableHead className="text-right">رقم الحساب</TableHead>
                            <TableHead className="text-right">الهاتف/البريد</TableHead>
                            <TableHead className="text-right">صلاحيات البيع</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.filter(u => {
                            if (!userSearchQuery.trim()) return true;
                            const query = userSearchQuery.toLowerCase();
                            return (
                              u.displayName?.toLowerCase().includes(query) ||
                              u.accountCode?.toLowerCase().includes(query) ||
                              u.phone?.toLowerCase().includes(query) ||
                              u.email?.toLowerCase().includes(query)
                            );
                          }).map((u) => (
                            <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                              <TableCell className="font-medium">{u.displayName}</TableCell>
                              <TableCell className="font-mono text-sm">{u.accountCode || "-"}</TableCell>
                              <TableCell>{u.phone || u.email || "-"}</TableCell>
                              <TableCell>
                                {u.isAdmin ? (
                                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">مدير</Badge>
                                ) : u.sellerApproved ? (
                                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">بائع معتمد</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">مشتري</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {u.isBanned && (
                                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">محظور</Badge>
                                  )}
                                  {u.isAuthenticated && (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                      <BadgeCheck className="h-3 w-3 ml-1" />
                                      علامة زرقاء
                                    </Badge>
                                  )}
                                  {u.authenticityGuaranteed && (
                                    <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                                      <Award className="h-3 w-3 ml-1" />
                                      مصادق عليه
                                    </Badge>
                                  )}
                                  {(u as any).eligibleForBlueCheck && !u.isAuthenticated && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                                      مؤهل للعلامة الزرقاء
                                    </Badge>
                                  )}
                                  {!u.isBanned && !u.isAuthenticated && !u.authenticityGuaranteed && (
                                    <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">عادي</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {u.sellerApproved && !u.isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                                      onClick={() => updateUserMutation.mutate({ id: u.id, updates: { sellerApproved: false, sellerRequestStatus: "rejected" } })}
                                      disabled={updateUserMutation.isPending}
                                      data-testid={`button-revoke-seller-${u.id}`}
                                    >
                                      <Store className="h-4 w-4 ml-1" />
                                      إلغاء صلاحية البيع
                                    </Button>
                                  )}
                                  {!u.isBanned && !u.isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-600 hover:bg-red-50"
                                      onClick={() => updateUserMutation.mutate({ id: u.id, updates: { isBanned: true } })}
                                      disabled={updateUserMutation.isPending}
                                      data-testid={`button-ban-user-${u.id}`}
                                    >
                                      <Ban className="h-4 w-4 ml-1" />
                                      حظر
                                    </Button>
                                  )}
                                  {u.isBanned && !u.isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                      onClick={() => updateUserMutation.mutate({ id: u.id, updates: { isBanned: false } })}
                                      disabled={updateUserMutation.isPending}
                                      data-testid={`button-unban-user-${u.id}`}
                                    >
                                      <UserCheck className="h-4 w-4 ml-1" />
                                      إلغاء الحظر
                                    </Button>
                                  )}
                                  {!u.isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-purple-600 border-purple-600 hover:bg-purple-50"
                                      onClick={() => resetPasswordMutation.mutate(u.id)}
                                      disabled={resetPasswordMutation.isPending}
                                      data-testid={`button-reset-password-${u.id}`}
                                    >
                                      <Key className="h-4 w-4 ml-1" />
                                      إعادة كلمة المرور
                                    </Button>
                                  )}
                                  {!u.isAuthenticated && !u.isAdmin && (u as any).eligibleForBlueCheck && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                      onClick={() => updateUserMutation.mutate({ id: u.id, updates: { isAuthenticated: true } })}
                                      disabled={updateUserMutation.isPending}
                                      data-testid={`button-authenticate-${u.id}`}
                                    >
                                      <BadgeCheck className="h-4 w-4 ml-1" />
                                      منح العلامة الزرقاء
                                    </Button>
                                  )}
                                  {u.isAuthenticated && !u.isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-gray-500 border-gray-500 hover:bg-gray-50"
                                      onClick={() => updateUserMutation.mutate({ id: u.id, updates: { isAuthenticated: false } })}
                                      disabled={updateUserMutation.isPending}
                                      data-testid={`button-unauthenticate-${u.id}`}
                                    >
                                      <BadgeCheck className="h-4 w-4 ml-1" />
                                      إزالة العلامة الزرقاء
                                    </Button>
                                  )}
                                  {!u.authenticityGuaranteed && !u.isAdmin && u.sellerApproved && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-purple-500 border-purple-500 hover:bg-purple-50"
                                      onClick={() => updateUserMutation.mutate({ id: u.id, updates: { authenticityGuaranteed: true } })}
                                      disabled={updateUserMutation.isPending}
                                      data-testid={`button-grant-authenticity-${u.id}`}
                                    >
                                      <Award className="h-4 w-4 ml-1" />
                                      منح شارة الأصالة
                                    </Button>
                                  )}
                                  {u.authenticityGuaranteed && !u.isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-gray-500 border-gray-500 hover:bg-gray-50"
                                      onClick={() => updateUserMutation.mutate({ id: u.id, updates: { authenticityGuaranteed: false } })}
                                      disabled={updateUserMutation.isPending}
                                      data-testid={`button-revoke-authenticity-${u.id}`}
                                    >
                                      <Award className="h-4 w-4 ml-1" />
                                      إزالة شارة الأصالة
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {usersPagination && usersPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          عرض {((usersPage - 1) * pageSize) + 1} - {Math.min(usersPage * pageSize, usersPagination.total)} من {usersPagination.total}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                            disabled={usersPage === 1}
                          >
                            السابق
                          </Button>
                          <span className="flex items-center px-3 text-sm">
                            صفحة {usersPage} من {usersPagination.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsersPage(p => Math.min(usersPagination.totalPages, p + 1))}
                            disabled={usersPage >= usersPagination.totalPages}
                          >
                            التالي
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا يوجد مستخدمين</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "seller-requests" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">طلبات التسجيل كبائع</h2>
                {usersLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : users && users.filter(u => u.sellerRequestStatus === "pending").length > 0 ? (
                  <Card>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">الاسم</TableHead>
                            <TableHead className="text-right">رقم الهاتف</TableHead>
                            <TableHead className="text-right">تاريخ الطلب</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.filter(u => u.sellerRequestStatus === "pending").map((u) => (
                            <TableRow key={u.id} data-testid={`row-seller-request-${u.id}`}>
                              <TableCell className="font-medium">{u.displayName}</TableCell>
                              <TableCell dir="ltr">{u.phone || "-"}</TableCell>
                              <TableCell>{new Date(u.createdAt).toLocaleDateString("ar-IQ")}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleSellerRequest(u.id, "approve")}
                                    disabled={updateUserMutation.isPending}
                                    data-testid={`button-approve-seller-${u.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 ml-1" />
                                    موافقة
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={() => handleSellerRequest(u.id, "reject")}
                                    disabled={updateUserMutation.isPending}
                                    data-testid={`button-reject-seller-${u.id}`}
                                  >
                                    <XCircle className="h-4 w-4 ml-1" />
                                    رفض
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد طلبات جديدة للتسجيل كبائع</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "listings" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <h2 className="text-2xl font-bold">إدارة المنتجات</h2>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالعنوان أو البائع..."
                      value={listingSearch}
                      onChange={(e) => setListingSearch(e.target.value)}
                      className="pr-10"
                      data-testid="input-listing-search"
                    />
                  </div>
                </div>
                {listingsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : listings && listings.length > 0 ? (
                  <Card>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">العنوان</TableHead>
                            <TableHead className="text-right">البائع</TableHead>
                            <TableHead className="text-right">السعر</TableHead>
                            <TableHead className="text-right">النوع</TableHead>
                            <TableHead className="text-right">المشاهدات</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {listings
                            .filter(l => 
                              !listingSearch || 
                              l.title.toLowerCase().includes(listingSearch.toLowerCase()) ||
                              l.sellerName.toLowerCase().includes(listingSearch.toLowerCase())
                            )
                            .map((listing) => (
                            <TableRow key={listing.id} data-testid={`row-listing-${listing.id}`} className="hover:bg-muted/50">
                              <TableCell>
                                <a 
                                  href={`/product/${listing.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 group"
                                >
                                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                    {listing.image && (
                                      <img 
                                        src={listing.image} 
                                        alt={listing.title}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate max-w-[200px] group-hover:text-primary transition-colors">
                                      {listing.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-mono">{listing.productCode || `#${listing.id.slice(0, 8)}`}</p>
                                  </div>
                                </a>
                              </TableCell>
                              <TableCell>
                                <a 
                                  href={`/search?sellerId=${listing.sellerId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-primary hover:underline transition-colors"
                                >
                                  {listing.sellerName}
                                </a>
                              </TableCell>
                              <TableCell>{(listing.currentBid || listing.price).toLocaleString()} د.ع</TableCell>
                              <TableCell>
                                {listing.saleType === "auction" ? (
                                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">مزاد</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">سعر ثابت</Badge>
                                )}
                              </TableCell>
                              {/* Views - Hidden */}
                              {/* <TableCell>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="text-sm">{(listing.views || 0).toLocaleString()}</span>
                                </div>
                              </TableCell> */}
                              <TableCell>
                                <div className="flex gap-1">
                                  {!listing.isActive ? (
                                    <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">غير نشط</Badge>
                                  ) : listing.isPaused ? (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">متوقف</Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">نشط</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`/product/${listing.id}`, '_blank')}
                                    data-testid={`button-view-listing-${listing.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {listing.isActive && !listing.isPaused && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                                      onClick={() => updateListingMutation.mutate({ id: listing.id, updates: { isPaused: true } })}
                                      disabled={updateListingMutation.isPending}
                                      data-testid={`button-pause-listing-${listing.id}`}
                                    >
                                      <Pause className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {listing.isActive && listing.isPaused && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                      onClick={() => updateListingMutation.mutate({ id: listing.id, updates: { isPaused: false } })}
                                      disabled={updateListingMutation.isPending}
                                      data-testid={`button-resume-listing-${listing.id}`}
                                    >
                                      <Play className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {listing.isActive && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-gray-600 border-gray-600 hover:bg-gray-50"
                                      onClick={() => updateListingMutation.mutate({ id: listing.id, updates: { isActive: false } })}
                                      disabled={updateListingMutation.isPending}
                                      data-testid={`button-deactivate-listing-${listing.id}`}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {!listing.isActive && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                      onClick={() => updateListingMutation.mutate({ id: listing.id, updates: { isActive: true, isPaused: false } })}
                                      disabled={updateListingMutation.isPending}
                                      data-testid={`button-activate-listing-${listing.id}`}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {listing.isFeatured ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-purple-600 border-purple-600 hover:bg-purple-50"
                                      onClick={() => featureListingMutation.mutate({ id: listing.id, isFeatured: false })}
                                      disabled={featureListingMutation.isPending}
                                      title="إزالة من المميز"
                                      data-testid={`button-unfeature-listing-${listing.id}`}
                                    >
                                      <StarOff className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                                      onClick={() => featureListingMutation.mutate({ id: listing.id, isFeatured: true })}
                                      disabled={featureListingMutation.isPending}
                                      title="ترقية للصفحة الرئيسية"
                                      data-testid={`button-feature-listing-${listing.id}`}
                                    >
                                      <Star className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
                                        deleteListingMutation.mutate(listing.id);
                                      }
                                    }}
                                    disabled={deleteListingMutation.isPending}
                                    data-testid={`button-delete-listing-${listing.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد منتجات</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "deleted-listings" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">المنتجات المحذوفة</h2>
                <p className="text-muted-foreground">المنتجات التي حذفها البائعون - محفوظة للمراجعة</p>
                {deletedListingsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : deletedListings && deletedListings.length > 0 ? (
                  <Card>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">العنوان</TableHead>
                            <TableHead className="text-right">البائع</TableHead>
                            <TableHead className="text-right">السعر</TableHead>
                            <TableHead className="text-right">النوع</TableHead>
                            <TableHead className="text-right">تاريخ الحذف</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deletedListings.map((listing) => (
                            <TableRow key={listing.id} data-testid={`row-deleted-listing-${listing.id}`} className="hover:bg-muted/50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                    {listing.image && (
                                      <img 
                                        src={listing.image} 
                                        alt={listing.title}
                                        className="w-full h-full object-cover opacity-50"
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate max-w-[200px] text-muted-foreground line-through">
                                      {listing.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-mono">{listing.productCode || `#${listing.id.slice(0, 8)}`}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <a 
                                  href={`/search?sellerId=${listing.sellerId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-primary hover:underline transition-colors"
                                >
                                  {listing.sellerName}
                                </a>
                              </TableCell>
                              <TableCell>{listing.price.toLocaleString()} د.ع</TableCell>
                              <TableCell>
                                {listing.saleType === "auction" ? (
                                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">مزاد</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">سعر ثابت</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {listing.deletedAt ? new Date(listing.deletedAt).toLocaleDateString("ar-IQ") : "-"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(`/product/${listing.id}`, '_blank')}
                                  data-testid={`button-view-deleted-listing-${listing.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد منتجات محذوفة</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "messages" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">رسائل التواصل</h2>
                {messagesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : contactMessages && contactMessages.length > 0 ? (
                  <div className="space-y-4">
                    {contactMessages.map((msg) => (
                      <Card key={msg.id} className={msg.isRead ? "opacity-75" : "border-primary/50"} data-testid={`card-message-${msg.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                {msg.isRead ? (
                                  <MailOpen className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <Mail className="h-5 w-5 text-primary" />
                                )}
                                <span className="font-semibold text-lg">{msg.name}</span>
                                {!msg.isRead && (
                                  <Badge variant="default" className="bg-blue-500">جديد</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">{msg.email}</span>
                                <span className="mx-2">•</span>
                                <span>{new Date(msg.createdAt).toLocaleDateString("ar-IQ", { 
                                  year: "numeric", 
                                  month: "long", 
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}</span>
                              </div>
                              <div className="mt-2">
                                <Badge variant="outline" className="mb-2">{msg.subject}</Badge>
                                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{msg.message}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {!msg.isRead && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markMessageReadMutation.mutate(msg.id)}
                                  disabled={markMessageReadMutation.isPending}
                                  data-testid={`button-mark-read-${msg.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 ml-1" />
                                  تم القراءة
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.location.href = `mailto:${msg.email}?subject=رد: ${msg.subject}`}
                                data-testid={`button-reply-${msg.id}`}
                              >
                                <Mail className="h-4 w-4 ml-1" />
                                رد بالإيميل
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد رسائل تواصل</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "cancellations" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">إلغاءات البائعين</h2>
                <p className="text-muted-foreground">عرض جميع الطلبات الملغاة من قبل البائعين مع أسباب الإلغاء</p>
                
                {cancellationsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : cancellations && cancellations.length > 0 ? (
                  <div className="space-y-4">
                    {cancellations.map((cancellation) => (
                      <Card key={cancellation.id} className="border-red-200" data-testid={`card-cancellation-${cancellation.id}`}>
                        <CardContent className="py-4">
                          <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-5 w-5 text-red-500" />
                                <span className="font-bold text-lg">{cancellation.listingTitle}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">البائع: </span>
                                  <span className="font-medium">{cancellation.sellerName}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">المشتري: </span>
                                  <span className="font-medium">{cancellation.buyerName}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">المبلغ: </span>
                                  <span className="font-medium">{cancellation.amount.toLocaleString()} د.ع</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">تاريخ الإلغاء: </span>
                                  <span className="font-medium">
                                    {new Date(cancellation.cancelledAt).toLocaleDateString("ar-IQ")}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                <span className="text-sm text-red-700 font-medium">سبب الإلغاء: </span>
                                <span className="text-red-800">{cancellation.cancellationReason}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد إلغاءات من البائعين</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "payouts" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">المدفوعات الأسبوعية</h2>
                    <p className="text-muted-foreground">إدارة دفعات البائعين الأسبوعية</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => processHoldsMutation.mutate()}
                      disabled={processHoldsMutation.isPending}
                      data-testid="button-process-holds"
                    >
                      {processHoldsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      ) : (
                        <Clock className="h-4 w-4 ml-2" />
                      )}
                      معالجة فترات الانتظار
                    </Button>
                    <Button
                      onClick={() => generatePayoutsMutation.mutate()}
                      disabled={generatePayoutsMutation.isPending}
                      data-testid="button-generate-payouts"
                    >
                      {generatePayoutsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      ) : (
                        <BanknoteIcon className="h-4 w-4 ml-2" />
                      )}
                      إنشاء دفعات الأسبوع
                    </Button>
                  </div>
                </div>

                <Card className="soft-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      تعديل رصيد المحفظة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <Input
                        placeholder="معرف المستخدم"
                        value={walletAdjustment.targetUserId}
                        onChange={(e) => setWalletAdjustment(prev => ({ ...prev, targetUserId: e.target.value }))}
                        data-testid="input-wallet-target-user"
                      />
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={walletAdjustment.accountType}
                        onChange={(e) => setWalletAdjustment(prev => ({ ...prev, accountType: e.target.value }))}
                        data-testid="select-wallet-account-type"
                      >
                        <option value="seller">بائع</option>
                        <option value="buyer">مشتري</option>
                      </select>
                      <Input
                        type="number"
                        placeholder="المبلغ (سالب للخصم)"
                        value={walletAdjustment.amount}
                        onChange={(e) => setWalletAdjustment(prev => ({ ...prev, amount: e.target.value }))}
                        data-testid="input-wallet-amount"
                      />
                      <Input
                        placeholder="وصف مختصر"
                        value={walletAdjustment.description}
                        onChange={(e) => setWalletAdjustment(prev => ({ ...prev, description: e.target.value }))}
                        data-testid="input-wallet-description"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => walletAdjustmentMutation.mutate()}
                        disabled={
                          walletAdjustmentMutation.isPending ||
                          !walletAdjustment.targetUserId ||
                          walletAdjustment.amount.trim() === "" ||
                          Number.isNaN(Number(walletAdjustment.amount))
                        }
                        data-testid="button-wallet-adjust"
                      >
                        {walletAdjustmentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 ml-2" />
                        )}
                        تطبيق التعديل
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {payoutsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : pendingPayouts && pendingPayouts.length > 0 ? (
                  <div className="space-y-4">
                    {pendingPayouts.map((payout) => (
                      <Card 
                        key={payout.id} 
                        className={payout.status === "pending" ? "border-green-200" : "border-gray-200"}
                        data-testid={`card-payout-${payout.id}`}
                      >
                        <CardContent className="py-4">
                          <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <Wallet className="h-5 w-5 text-green-600" />
                                <span className="font-bold text-lg">{payout.sellerName}</span>
                                <Badge className={payout.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>
                                  {payout.status === "pending" ? "قيد الانتظار" : "مدفوع"}
                                </Badge>
                              </div>
                              
                              {payout.sellerPhone && (
                                <p className="text-sm text-muted-foreground">
                                  📱 {payout.sellerPhone}
                                </p>
                              )}

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-muted-foreground block">الأرباح</span>
                                  <span className="font-medium text-green-600">{payout.totalEarnings.toLocaleString()} د.ع</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-muted-foreground block">العمولة (5%)</span>
                                  <span className="font-medium text-red-600">-{payout.totalCommission.toLocaleString()} د.ع</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-muted-foreground block">الشحن</span>
                                  <span className="font-medium text-red-600">-{payout.totalShipping.toLocaleString()} د.ع</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-muted-foreground block">المرتجعات</span>
                                  <span className="font-medium text-red-600">-{payout.totalReturns.toLocaleString()} د.ع</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-sm">
                                <div>
                                  <Calendar className="h-4 w-4 inline ml-1 text-muted-foreground" />
                                  <span className="text-muted-foreground">فترة الدفع: </span>
                                  <span>{new Date(payout.weekStartDate).toLocaleDateString("ar-IQ")} - {new Date(payout.weekEndDate).toLocaleDateString("ar-IQ")}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                              <div className="text-left">
                                <p className="text-sm text-muted-foreground">صافي الدفع</p>
                                <p className="text-2xl font-bold text-green-600">{payout.netPayout.toLocaleString()} د.ع</p>
                              </div>
                              
                              {payout.status === "pending" && (
                                <Button
                                  onClick={() => markPayoutPaidMutation.mutate({ 
                                    id: payout.id, 
                                    paymentMethod: "cash" 
                                  })}
                                  disabled={markPayoutPaidMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                  data-testid={`button-mark-paid-${payout.id}`}
                                >
                                  {markPayoutPaidMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 ml-2" />
                                  )}
                                  تأكيد الدفع
                                </Button>
                              )}

                              {payout.status === "paid" && payout.paidAt && (
                                <div className="text-sm text-muted-foreground text-left">
                                  <p>تم الدفع: {new Date(payout.paidAt).toLocaleDateString("ar-IQ")}</p>
                                  {payout.paymentMethod && <p>طريقة الدفع: {payout.paymentMethod}</p>}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد دفعات معلقة</p>
                      <p className="text-sm mt-2">اضغط على "إنشاء دفعات الأسبوع" لإنشاء دفعات جديدة للبائعين</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Returns Tab */}
            {activeTab === "returns" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">إدارة طلبات الإرجاع</h2>
                  <Button onClick={() => setShowCreateReturn(true)}>
                    <Plus className="h-4 w-4 ml-2" />
                    إنشاء طلب إرجاع
                  </Button>
                </div>
                <ReturnsTable
                  onViewDetail={(returnReq) => {
                    setSelectedReturn(returnReq);
                    setShowReturnDetail(true);
                  }}
                />
              </div>
            )}
          </main>
        </div>
      </div>

      <Dialog open={!!reportAction} onOpenChange={(open) => { if (!open) setReportAction(null); }}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">
              {reportAction?.status === "resolved" ? "تأكيد حل البلاغ" : "تأكيد رفض البلاغ"}
            </DialogTitle>
            <DialogDescription className="text-right">
              {reportAction?.targetLabel ? `العنصر: ${reportAction.targetLabel}` : "يرجى تأكيد الإجراء"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="ملاحظات الإدارة (اختياري)"
              value={reportAction?.adminNotes ?? ""}
              onChange={(e) => setReportAction(prev => prev ? { ...prev, adminNotes: e.target.value } : prev)}
              data-testid="textarea-report-admin-notes"
            />
            <p className="text-xs text-muted-foreground">
              ستُحفظ هذه الملاحظات مع البلاغ.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReportAction(null)} data-testid="button-cancel-report-action">
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!reportAction) return;
                updateReportMutation.mutate({
                  id: reportAction.id,
                  status: reportAction.status,
                  adminNotes: reportAction.adminNotes.trim() || undefined,
                });
              }}
              disabled={updateReportMutation.isPending}
              data-testid="button-confirm-report-action"
            >
              {updateReportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <CheckCircle className="h-4 w-4 ml-2" />
              )}
              {reportAction?.status === "resolved" ? "حل البلاغ" : "رفض البلاغ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Result Dialog */}
      <Dialog open={!!resetPasswordResult} onOpenChange={() => setResetPasswordResult(null)}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">تم إعادة تعيين كلمة المرور</DialogTitle>
            <DialogDescription className="text-right">
              كلمة المرور المؤقتة للمستخدم: <strong>{resetPasswordResult?.userName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-4 bg-gray-100 rounded-lg">
              <code className="flex-1 text-lg font-mono text-center select-all" dir="ltr">
                {resetPasswordResult?.tempPassword}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (resetPasswordResult?.tempPassword) {
                    navigator.clipboard.writeText(resetPasswordResult.tempPassword);
                    toast({ title: "تم نسخ كلمة المرور" });
                  }
                }}
                data-testid="button-copy-password"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              يرجى إرسال كلمة المرور هذه للمستخدم. ينصح بتغييرها عند تسجيل الدخول.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetPasswordResult(null)} data-testid="button-close-password-dialog">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Detail Dialog */}
      {showReturnDetail && selectedReturn && (
        <ReturnDetailDialog
          returnRequest={selectedReturn}
          open={showReturnDetail}
          onOpenChange={setShowReturnDetail}
          onRefundProcess={() => {
            setShowReturnDetail(false);
            setSelectedReturn(null);
          }}
        />
      )}

      {/* Create Return Dialog */}
      {showCreateReturn && (
        <CreateReturnDialog
          open={showCreateReturn}
          onOpenChange={setShowCreateReturn}
        />
      )}
    </Layout>
  );
}
