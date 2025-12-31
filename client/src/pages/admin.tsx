import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
import { Loader2, Users, Package, AlertTriangle, DollarSign, BarChart3, FileWarning, CheckCircle, XCircle, Shield, Ban, UserCheck } from "lucide-react";
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
}

interface User {
  id: string;
  username?: string;
  email?: string;
  displayName: string;
  accountType: string;
  isVerified: boolean;
  isBanned: boolean;
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
  const [activeTab, setActiveTab] = useState<"stats" | "reports" | "users">("stats");

  useEffect(() => {
    if (!authLoading && (!user || (user as any).accountType !== "admin")) {
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
    enabled: !authLoading && (user as any)?.accountType === "admin",
  });

  const { data: reports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/admin/reports"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/admin/reports");
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled: !authLoading && (user as any)?.accountType === "admin" && activeTab === "reports",
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !authLoading && (user as any)?.accountType === "admin" && activeTab === "users",
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "تم تحديث البلاغ بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث البلاغ", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { isVerified?: boolean; isBanned?: boolean } }) => {
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

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user || (user as any).accountType !== "admin") {
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

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      buyer: "مشتري",
      seller: "بائع",
      admin: "مدير",
    };
    return labels[type] || type;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8" dir="rtl">
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
                            <TableHead className="text-right">نوع البلاغ</TableHead>
                            <TableHead className="text-right">السبب</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-right">التاريخ</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reports.map((report) => (
                            <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                              <TableCell>{getReportTypeLabel(report.reportType)}</TableCell>
                              <TableCell className="max-w-xs truncate">{report.reason}</TableCell>
                              <TableCell>{getStatusBadge(report.status)}</TableCell>
                              <TableCell>{new Date(report.createdAt).toLocaleDateString("ar-IQ")}</TableCell>
                              <TableCell>
                                {report.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                      onClick={() => updateReportMutation.mutate({ id: report.id, status: "resolved" })}
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
                                      onClick={() => updateReportMutation.mutate({ id: report.id, status: "rejected" })}
                                      disabled={updateReportMutation.isPending}
                                      data-testid={`button-reject-report-${report.id}`}
                                    >
                                      <XCircle className="h-4 w-4 ml-1" />
                                      رفض
                                    </Button>
                                  </div>
                                )}
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
                            <TableHead className="text-right">البريد</TableHead>
                            <TableHead className="text-right">نوع الحساب</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-right">الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((u) => (
                            <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                              <TableCell className="font-medium">{u.displayName}</TableCell>
                              <TableCell>{u.email || "-"}</TableCell>
                              <TableCell>{getAccountTypeLabel(u.accountType)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {u.isVerified && (
                                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">موثق</Badge>
                                  )}
                                  {u.isBanned && (
                                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">محظور</Badge>
                                  )}
                                  {!u.isVerified && !u.isBanned && (
                                    <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">عادي</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {!u.isVerified && u.accountType !== "admin" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                      onClick={() => updateUserMutation.mutate({ id: u.id, updates: { isVerified: true } })}
                                      disabled={updateUserMutation.isPending}
                                      data-testid={`button-verify-user-${u.id}`}
                                    >
                                      <UserCheck className="h-4 w-4 ml-1" />
                                      توثيق
                                    </Button>
                                  )}
                                  {!u.isBanned && u.accountType !== "admin" && (
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
                                  {u.isBanned && u.accountType !== "admin" && (
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
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا يوجد مستخدمين</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}
