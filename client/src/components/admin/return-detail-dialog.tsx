import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle, XCircle, DollarSign, User, Package, Calendar, FileText, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { secureRequest } from "@/lib/queryClient";

// Normalize image URLs: convert old malformed GCS URLs to proxy paths
function normalizeImageUrl(url: string): string {
  if (url.startsWith("/objects/")) return url;
  const match = url.match(/https:\/\/storage\.googleapis\.com\/+objects\/(.+)/);
  if (match) return `/objects/${match[1]}`;
  return url;
}

interface ReturnRequest {
  id: string;
  transactionId: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  reason: string;
  details?: string;
  status: string;
  sellerResponse?: string;
  createdAt: string;
  refundAmount?: number;
  refundProcessed?: boolean;
  autoApproved?: boolean;
  adminInitiatedBy?: string;
  adminNotes?: string;
  adminResolution?: string;
  adminResolvedAt?: string;
  escalationImages?: string[];
  escalationDetails?: string;
  escalatedAt?: string;
  transaction?: {
    id: string;
    amount: number;
    status: string;
    completedAt?: string;
  };
  listing?: {
    id: string;
    title: string;
    productCode?: string;
    price: number;
    category?: string;
    image?: string;
  };
  buyer?: {
    id: string;
    displayName: string;
    accountCode?: string;
    phone?: string;
  };
  seller?: {
    id: string;
    displayName: string;
    accountCode?: string;
    phone?: string;
  };
}

interface ReturnDetailDialogProps {
  returnRequest: ReturnRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefundProcess?: () => void;
}

export function ReturnDetailDialog({
  returnRequest,
  open,
  onOpenChange,
  onRefundProcess,
}: ReturnDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusUpdate, setStatusUpdate] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [adminResolution, setAdminResolution] = useState<string>("");

  const updateMutation = useMutation({
    mutationFn: async (updates: { status?: string; adminNotes?: string }) => {
      if (!returnRequest) throw new Error("No return request");
      const res = await secureRequest(`/api/admin/returns/${returnRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update return");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تحديث حالة الطلب بنجاح — تم إشعار المشتري والبائع" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/returns"] });
      setStatusUpdate("");
      setAdminNotes("");
      setAdminResolution("");
    },
    onError: () => {
      toast({ title: "فشل في تحديث الطلب", variant: "destructive" });
    },
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      if (!returnRequest) throw new Error("No return request");
      const res = await secureRequest(`/api/admin/returns/${returnRequest.id}/finalize-refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: adminNotes || undefined }),
      });
      if (!res.ok) throw new Error("Failed to process refund");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم معالجة الاسترجاع بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/returns"] });
      onRefundProcess?.();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "فشل في معالجة الاسترجاع", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      escalated: "bg-orange-100 text-orange-800",
      processing: "bg-blue-100 text-blue-800",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "قيد الانتظار",
      approved: "موافق عليه",
      rejected: "مرفوض",
      escalated: "مصعّد من المشتري",
      processing: "قيد المعالجة",
    };
    return labels[status] || status;
  };

  if (!returnRequest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            تفاصيل طلب الإرجاع #{returnRequest.id.slice(0, 8)}
          </DialogTitle>
          <DialogDescription>
            {new Date(returnRequest.createdAt).toLocaleDateString("ar-IQ", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Section */}
          <div className="flex items-center gap-4">
            <Badge className={getStatusBadge(returnRequest.status)}>
              {getStatusLabel(returnRequest.status)}
            </Badge>
            {returnRequest.autoApproved && (
              <Badge variant="secondary">تمت الموافقة تلقائياً</Badge>
            )}
            {returnRequest.refundProcessed && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                تم معالجة الاسترجاع
              </Badge>
            )}
          </div>

          {/* Transaction Info */}
          {returnRequest.transaction && (
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                معلومات المعاملة
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">رقم المعاملة:</span>
                  <div className="font-mono">{returnRequest.transaction.id}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">المبلغ:</span>
                  <div className="font-medium">{returnRequest.transaction.amount.toLocaleString()} د.ع</div>
                </div>
                <div>
                  <span className="text-muted-foreground">حالة المعاملة:</span>
                  <div>{returnRequest.transaction.status}</div>
                </div>
                {returnRequest.transaction.completedAt && (
                  <div>
                    <span className="text-muted-foreground">تاريخ الاستلام:</span>
                    <div>{new Date(returnRequest.transaction.completedAt).toLocaleDateString("ar-IQ")}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Listing Info */}
          {returnRequest.listing && (
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                معلومات المنتج
              </h3>
              <div className="flex gap-4">
                {returnRequest.listing.image && (
                  <img
                    src={returnRequest.listing.image}
                    alt={returnRequest.listing.title}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium">{returnRequest.listing.title}</div>
                  {returnRequest.listing.productCode && (
                    <div className="text-sm text-muted-foreground">
                      رمز المنتج: {returnRequest.listing.productCode}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    السعر: {returnRequest.listing.price.toLocaleString()} د.ع
                  </div>
                  {returnRequest.listing.category && (
                    <div className="text-sm text-muted-foreground">
                      الفئة: {returnRequest.listing.category}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Buyer & Seller Info */}
          <div className="grid grid-cols-2 gap-4">
            {returnRequest.buyer && (
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  المشتري
                </h3>
                <div className="text-sm space-y-1">
                  <div className="font-medium">{returnRequest.buyer.displayName}</div>
                  {returnRequest.buyer.accountCode && (
                    <div className="text-muted-foreground">رمز الحساب: {returnRequest.buyer.accountCode}</div>
                  )}
                  {returnRequest.buyer.phone && (
                    <div className="text-muted-foreground">الهاتف: {returnRequest.buyer.phone}</div>
                  )}
                </div>
              </div>
            )}

            {returnRequest.seller && (
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  البائع
                </h3>
                <div className="text-sm space-y-1">
                  <div className="font-medium">{returnRequest.seller.displayName}</div>
                  {returnRequest.seller.accountCode && (
                    <div className="text-muted-foreground">رمز الحساب: {returnRequest.seller.accountCode}</div>
                  )}
                  {returnRequest.seller.phone && (
                    <div className="text-muted-foreground">الهاتف: {returnRequest.seller.phone}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Return Details */}
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              تفاصيل طلب الإرجاع
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">السبب:</span>
                <div className="font-medium">{returnRequest.reason}</div>
              </div>
              {returnRequest.details && (
                <div>
                  <span className="text-muted-foreground">التفاصيل:</span>
                  <div className="mt-1">{returnRequest.details}</div>
                </div>
              )}
              {returnRequest.sellerResponse && (
                <div>
                  <span className="text-muted-foreground">رد البائع:</span>
                  <div className="mt-1">{returnRequest.sellerResponse}</div>
                </div>
              )}
              {returnRequest.adminNotes && (
                <div>
                  <span className="text-muted-foreground">ملاحظات الإدارة:</span>
                  <div className="mt-1">{returnRequest.adminNotes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Refund Info */}
          {returnRequest.refundAmount && (
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">معلومات الاسترجاع</h3>
              <div className="text-sm">
                <div>
                  <span className="text-muted-foreground">مبلغ الاسترجاع:</span>
                  <span className="font-medium mr-2">{returnRequest.refundAmount.toLocaleString()} د.ع</span>
                </div>
                <div>
                  <span className="text-muted-foreground">حالة المعالجة:</span>
                  <span className="mr-2">
                    {returnRequest.refundProcessed ? "تمت المعالجة" : "قيد المعالجة"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Escalation Evidence (shown when escalated) */}
          {returnRequest.status === "escalated" && (returnRequest.escalationImages?.length || returnRequest.escalationDetails) && (
            <div className="border-2 border-orange-200 rounded-lg p-4 space-y-3 bg-orange-50">
              <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                أدلة المشتري عند التصعيد
              </h3>
              {returnRequest.escalationDetails && (
                <p className="text-sm text-orange-700">{returnRequest.escalationDetails}</p>
              )}
              {returnRequest.escalationImages && returnRequest.escalationImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {returnRequest.escalationImages.map((url: string, i: number) => {
                    const imgUrl = normalizeImageUrl(url);
                    return (
                      <a key={i} href={imgUrl} target="_blank" rel="noreferrer">
                        <img
                          src={imgUrl}
                          alt={`دليل ${i + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border-2 border-orange-300 hover:border-orange-500 transition-colors cursor-pointer"
                        />
                      </a>
                    );
                  })}
                </div>
              )}
              {returnRequest.escalatedAt && (
                <p className="text-xs text-orange-600">
                  تاريخ التصعيد: {new Date(returnRequest.escalatedAt).toLocaleDateString("ar-IQ")}
                </p>
              )}
            </div>
          )}

          {/* Seller response */}
          {returnRequest.sellerResponse && (
            <div className="border rounded-lg p-4 space-y-1 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">رد البائع</h3>
              <p className="text-sm text-gray-600">{returnRequest.sellerResponse}</p>
            </div>
          )}

          {/* Admin Actions */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">إجراءات الإدارة</h3>

            {/* Update Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">تحديث الحالة</label>
              <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر حالة جديدة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="approved">✅ موافق عليه (يُشعر المشتري والبائع)</SelectItem>
                  <SelectItem value="rejected">❌ مرفوض (يُشعر المشتري والبائع)</SelectItem>
                  <SelectItem value="escalated">🔶 مصعّد من المشتري</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Admin Resolution Message — shown to both parties */}
            {(statusUpdate === "approved" || statusUpdate === "rejected") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">رسالة القرار (تُرسل للمشتري والبائع)</label>
                <Textarea
                  value={adminResolution}
                  onChange={(e) => setAdminResolution(e.target.value)}
                  placeholder="اكتب قرارك النهائي وسبب الموافقة أو الرفض..."
                  rows={3}
                  className="border-blue-200 focus:border-blue-400"
                />
                <p className="text-xs text-muted-foreground">
                  هذه الرسالة ستظهر للمشتري والبائع في إشعاراتهم.
                </p>
              </div>
            )}

            {/* Internal Admin Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات داخلية (للإدارة فقط)</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="ملاحظات داخلية غير مرئية للمستخدمين..."
                rows={2}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {statusUpdate && (
                <Button
                  onClick={() => updateMutation.mutate({
                    status: statusUpdate,
                    adminNotes: adminNotes || undefined,
                    adminResolution: adminResolution || undefined,
                  } as any)}
                  disabled={updateMutation.isPending}
                  className={statusUpdate === "approved" ? "bg-green-600 hover:bg-green-700" : statusUpdate === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 ml-2" />
                  )}
                  {statusUpdate === "approved" ? "موافقة وإشعار الطرفين" :
                   statusUpdate === "rejected" ? "رفض وإشعار الطرفين" :
                   "تحديث الحالة"}
                </Button>
              )}

              {returnRequest.status === "approved" && !returnRequest.refundProcessed && (
                <Button
                  onClick={() => refundMutation.mutate()}
                  disabled={refundMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {refundMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <DollarSign className="h-4 w-4 ml-2" />
                  )}
                  معالجة الاسترجاع وإشعار الطرفين
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
