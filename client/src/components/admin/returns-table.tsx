import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RotateCcw, Eye, Filter, Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { secureRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

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

interface ReturnsTableProps {
  onViewDetail: (returnRequest: ReturnRequest) => void;
}

export function ReturnsTable({ onViewDetail }: ReturnsTableProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const pageSize = 20;

  const { data, isLoading, error } = useQuery<{
    returns: ReturnRequest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/admin/returns", page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      const res = await secureRequest(`/api/admin/returns?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch returns");
      return res.json();
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      processing: "bg-blue-100 text-blue-800",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "قيد الانتظار",
      approved: "موافق عليه",
      rejected: "مرفوض",
      processing: "قيد المعالجة",
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        فشل في تحميل طلبات الإرجاع
      </div>
    );
  }

  const returns = data?.returns || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="حالة الطلب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="pending">قيد الانتظار</SelectItem>
              <SelectItem value="approved">موافق عليه</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الطلب</TableHead>
              <TableHead>المعاملة</TableHead>
              <TableHead>المشتري</TableHead>
              <TableHead>البائع</TableHead>
              <TableHead>المنتج</TableHead>
              <TableHead>السبب</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  لا توجد طلبات إرجاع
                </TableCell>
              </TableRow>
            ) : (
              returns.map((returnReq) => (
                <TableRow key={returnReq.id}>
                  <TableCell className="font-mono text-sm">
                    #{returnReq.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {returnReq.transaction?.id.slice(0, 8) || "N/A"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{returnReq.buyer?.displayName || "غير معروف"}</div>
                      {returnReq.buyer?.accountCode && (
                        <div className="text-xs text-muted-foreground">
                          {returnReq.buyer.accountCode}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{returnReq.seller?.displayName || "غير معروف"}</div>
                      {returnReq.seller?.accountCode && (
                        <div className="text-xs text-muted-foreground">
                          {returnReq.seller.accountCode}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <div className="font-medium truncate">{returnReq.listing?.title || "غير معروف"}</div>
                      {returnReq.listing?.productCode && (
                        <div className="text-xs text-muted-foreground">
                          {returnReq.listing.productCode}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate" title={returnReq.reason}>
                      {returnReq.reason}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(returnReq.status)}>
                      {getStatusLabel(returnReq.status)}
                    </Badge>
                    {returnReq.autoApproved && (
                      <div className="text-xs text-muted-foreground mt-1">تلقائي</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {returnReq.refundAmount ? (
                      <div>
                        <div className="font-medium">{returnReq.refundAmount.toLocaleString()} د.ع</div>
                        {returnReq.refundProcessed && (
                          <div className="text-xs text-green-600">تم الدفع</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(returnReq.createdAt).toLocaleDateString("ar-IQ")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewDetail(returnReq)}
                    >
                      <Eye className="h-4 w-4 ml-1" />
                      عرض
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            صفحة {pagination.page} من {pagination.totalPages} ({pagination.total} طلب)
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              السابق
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasMore}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
