import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/star-rating";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Truck,
  CheckCircle,
  MapPin,
  Phone,
  CreditCard,
  MessageCircle,
  ExternalLink,
  Store,
  Star,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Loader2,
  X,
} from "lucide-react";
import type { Purchase } from "./OrderCard";

export type ModalAction = "view" | "return" | "rate" | "report";

interface OrderDetailModalProps {
  purchase: Purchase | null;
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  initialAction?: ModalAction;
}

type DeliveryStep = "paid" | "tracking" | "delivered";

const getDeliverySteps = (purchase: Purchase): { step: DeliveryStep; completed: boolean; date?: string }[] => {
  const status = purchase.status || purchase.deliveryStatus || "pending";
  return [
    { step: "paid", completed: true, date: purchase.createdAt },
    {
      step: "tracking",
      completed: !!purchase.trackingNumber || ["shipped", "in_transit", "delivered", "completed"].includes(status),
      date: purchase.trackingAvailableAt || purchase.shippedAt,
    },
    {
      step: "delivered",
      completed: ["delivered", "completed"].includes(status),
      date: purchase.completedAt,
    },
  ];
};

const getStepLabel = (step: DeliveryStep): string => {
  const labels: Record<DeliveryStep, string> = { paid: "تم الطلب", tracking: "تم الشحن", delivered: "تم التسليم" };
  return labels[step];
};

const getStatusBadge = (status: string) => {
  const configs: Record<string, { label: string; className: string }> = {
    delivered: { label: "تم التسليم", className: "bg-green-500 text-white border-0" },
    completed: { label: "تم التسليم", className: "bg-green-500 text-white border-0" },
    shipped: { label: "قيد التوصيل", className: "bg-blue-500 text-white border-0" },
    in_transit: { label: "قيد التوصيل", className: "bg-blue-500 text-white border-0" },
    processing: { label: "قيد التجهيز", className: "bg-yellow-500 text-white border-0" },
    pending: { label: "قيد التجهيز", className: "bg-yellow-500 text-white border-0" },
  };
  const config = configs[status] || { label: status, className: "bg-gray-500 text-white border-0" };
  return <Badge className={`${config.className} text-sm px-3 py-1`}>{config.label}</Badge>;
};

function DeliveryTimeline({ purchase }: { purchase: Purchase }) {
  const steps = getDeliverySteps(purchase);
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("ar-IQ", { month: "short", day: "numeric" });
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {steps.map((stepInfo) => {
          const formattedDate = formatDate(stepInfo.date);
          return (
            <div key={stepInfo.step} className="flex flex-col items-center flex-1 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stepInfo.completed ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                {stepInfo.completed ? <CheckCircle className="h-5 w-5" /> : <div className="w-3 h-3 rounded-full bg-current" />}
              </div>
              <p className={`text-xs mt-2 font-medium text-center ${stepInfo.completed ? "text-green-600" : "text-gray-400"}`}>
                {getStepLabel(stepInfo.step)}
              </p>
              {formattedDate ? (
                <p className="text-[10px] text-gray-500 mt-0.5">{formattedDate}</p>
              ) : !stepInfo.completed ? (
                <p className="text-[10px] text-gray-400 mt-0.5">في انتظار التحديث</p>
              ) : null}
            </div>
          );
        })}
        <div className="absolute top-4 right-[16.66%] left-[16.66%] h-0.5 bg-gray-200 -z-0">
          <div className="h-full bg-green-500 transition-all" style={{ width: steps[2].completed ? "100%" : steps[1].completed ? "50%" : "0%" }} />
        </div>
      </div>
    </div>
  );
}

export function OrderDetailModal({ purchase, isOpen, onClose, userId, initialAction = "view" }: OrderDetailModalProps) {
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnDetails, setReturnDetails] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Handle initial action when modal opens
  useEffect(() => {
    if (isOpen && purchase) {
      // Small delay to ensure modal is rendered first
      const timer = setTimeout(() => {
        if (initialAction === "return") {
          setIsReturnDialogOpen(true);
        } else if (initialAction === "rate") {
          setIsRatingOpen(true);
        } else if (initialAction === "report") {
          setIsReportDialogOpen(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialAction, purchase]);

  if (!purchase) return null;

  const status = purchase.status || purchase.deliveryStatus || "pending";
  const isDelivered = status === "delivered" || status === "completed";

  const { data: existingReturnRequest } = useQuery({
    queryKey: ["/api/return-requests/transaction", purchase.id],
    queryFn: async () => {
      const res = await fetch(`/api/return-requests/transaction/${purchase.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!purchase.id && isOpen,
  });

  const reportMutation = useMutation({
    mutationFn: async (data: { reportType: string; targetId: string; targetType: string; reason: string; details?: string }) => {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!response.ok) throw new Error("Failed to create report");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "تم إرسال البلاغ", description: "سيتم مراجعة بلاغك من قبل فريق الدعم" });
      setIsReportDialogOpen(false);
      setReportReason("");
      setReportDetails("");
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في إرسال البلاغ. يرجى المحاولة مرة أخرى", variant: "destructive" });
    },
  });

  const returnRequestMutation = useMutation({
    mutationFn: async (data: { transactionId: string; reason: string; details?: string }) => {
      const response = await fetch("/api/return-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create return request");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "تم إرسال طلب الإرجاع", description: "سيتم مراجعة طلبك من قبل البائع" });
      setIsReturnDialogOpen(false);
      setReturnReason("");
      setReturnDetails("");
      queryClient.invalidateQueries({ queryKey: ["/api/return-requests/transaction", purchase.id] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message || "فشل في إرسال طلب الإرجاع", variant: "destructive" });
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (data: { sellerId: string; reviewerId: string; listingId: string; rating: number; comment: string }) => {
      const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to submit review");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم إرسال التقييم", description: "شكراً لك على تقييم البائع" });
      setIsRatingOpen(false);
      setRating(0);
      setRatingComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/account/purchases"] });
    },
    onError: () => {
      toast({ title: "فشل إرسال التقييم", description: "حدث خطأ، يرجى المحاولة مرة أخرى", variant: "destructive" });
    },
  });

  const handleSubmitReport = () => {
    if (!reportReason) return;
    reportMutation.mutate({ reportType: "order_issue", targetId: purchase.id, targetType: "transaction", reason: reportReason, details: reportDetails || undefined });
  };

  const handleSubmitReturnRequest = () => {
    if (!returnReason) return;
    returnRequestMutation.mutate({ transactionId: purchase.id, reason: returnReason, details: returnDetails || undefined });
  };

  const handleSubmitRating = () => {
    if (!purchase.listing?.sellerId || !purchase.listingId || rating === 0 || !userId) return;
    submitReviewMutation.mutate({ sellerId: purchase.listing.sellerId, reviewerId: userId, listingId: purchase.listingId, rating, comment: ratingComment });
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between">
              <SheetTitle>تفاصيل الطلب</SheetTitle>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
          </SheetHeader>

          <div className="p-4 space-y-4">
            {/* Product Header */}
            <div className="flex gap-4">
              {purchase.listing?.images?.[0] ? (
                <img src={purchase.listing.images[0]} alt={purchase.listing?.title || "منتج"} className="w-24 h-24 object-cover rounded-lg" loading="lazy" />
              ) : (
                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center"><Package className="h-10 w-10 text-muted-foreground/40" /></div>
              )}
              <div className="flex-1">
                <div className="mb-2">{getStatusBadge(status)}</div>
                <Link href={`/product/${purchase.listingId}`}>
                  <h2 className="font-bold text-lg hover:text-primary transition-colors">{purchase.listing?.title || "منتج"}</h2>
                </Link>
                <p className="text-xl font-bold text-primary mt-1">{purchase.amount?.toLocaleString() || 0} د.ع</p>
              </div>
            </div>

            {/* Delivery Timeline */}
            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Truck className="h-4 w-4 text-primary" />حالة التوصيل</h3>
              <DeliveryTimeline purchase={purchase} />
              {purchase.trackingNumber && <p className="text-sm text-muted-foreground mt-2">رقم التتبع: <span className="font-mono">{purchase.trackingNumber}</span></p>}
            </Card>

            {/* Shipping Address */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />عنوان الشحن</h3>
              <div className="space-y-1 text-sm">
                {purchase.deliveryAddress ? (
                  <>
                    <p className="font-medium">{purchase.deliveryAddress}</p>
                    {purchase.deliveryCity && <p className="text-muted-foreground">{purchase.deliveryCity}</p>}
                    {purchase.deliveryPhone && <p className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{purchase.deliveryPhone}</p>}
                  </>
                ) : <p className="text-muted-foreground">لم يتم تحديد عنوان</p>}
              </div>
            </Card>

            {/* Payment Info */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />معلومات الدفع</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">طريقة الدفع</span><span className="font-medium">{purchase.paymentMethod === "card" ? "بطاقة ائتمان" : "الدفع عند الاستلام"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">تاريخ الطلب</span><span className="font-medium flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(purchase.createdAt).toLocaleDateString("ar-IQ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">رقم الطلب</span><span className="font-mono">{purchase.id.slice(0, 8).toUpperCase()}</span></div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold"><span>المجموع</span><span className="text-primary">{purchase.amount?.toLocaleString() || 0} د.ع</span></div>
              </div>
            </Card>

            {/* Seller Info */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Store className="h-4 w-4 text-blue-600" />معلومات البائع</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><Store className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <p className="font-semibold">{purchase.listing?.sellerName || "بائع"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{purchase.listing?.city || "العراق"}</p>
                  </div>
                </div>
                {purchase.listing?.sellerId && (
                  <Link href={`/messages?to=${purchase.listing.sellerId}`}>
                    <Button variant="outline" size="sm" className="gap-1"><MessageCircle className="h-4 w-4" />مراسلة</Button>
                  </Link>
                )}
              </div>
            </Card>

            {/* Rate Seller */}
            {isDelivered && !purchase.hasReview && userId && (
              <Card className="p-4 bg-amber-50 border-amber-200">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Star className="h-4 w-4 text-amber-600" />قيّم البائع</h3>
                <p className="text-sm text-muted-foreground mb-3">كيف كانت تجربتك مع {purchase.listing?.sellerName || "البائع"}؟</p>
                <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => setIsRatingOpen(true)}>
                  <Star className="h-4 w-4 ml-2" />إضافة تقييم
                </Button>
              </Card>
            )}

            {purchase.hasReview && (
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div><h3 className="font-semibold text-green-700">تم تقييم البائع</h3><p className="text-sm text-green-600">شكراً لك على مشاركة تجربتك</p></div>
                </div>
              </Card>
            )}

            {/* Actions */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">إجراءات</h3>
              <div className="space-y-2">
                <Link href={`/product/${purchase.listingId}`}>
                  <Button variant="outline" className="w-full justify-start"><ExternalLink className="h-4 w-4 ml-2" />عرض المنتج</Button>
                </Link>
                {purchase.listing?.sellerId && (
                  <Link href={`/messages?to=${purchase.listing.sellerId}`}>
                    <Button variant="outline" className="w-full justify-start"><MessageCircle className="h-4 w-4 ml-2" />تواصل مع البائع</Button>
                  </Link>
                )}
                {isDelivered && (
                  existingReturnRequest ? (
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 text-sm">
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">طلب الإرجاع</span>
                        <Badge className={`${existingReturnRequest.status === "approved" ? "bg-green-100 text-green-700" : existingReturnRequest.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"} border-0`}>
                          {existingReturnRequest.status === "approved" ? "مقبول" : existingReturnRequest.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => setIsReturnDialogOpen(true)}>
                      <RotateCcw className="h-4 w-4 ml-2" />طلب إرجاع المنتج
                    </Button>
                  )
                )}
                <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setIsReportDialogOpen(true)}>
                  <AlertTriangle className="h-4 w-4 ml-2" />الإبلاغ عن مشكلة
                </Button>
              </div>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />الإبلاغ عن مشكلة</DialogTitle>
            <DialogDescription>أخبرنا عن المشكلة التي تواجهها مع هذا الطلب</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>سبب البلاغ</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger><SelectValue placeholder="اختر سبب البلاغ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_received">لم أستلم المنتج</SelectItem>
                  <SelectItem value="wrong_item">استلمت منتجاً مختلفاً</SelectItem>
                  <SelectItem value="damaged">المنتج تالف أو مكسور</SelectItem>
                  <SelectItem value="not_as_described">المنتج مختلف عن الوصف</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تفاصيل إضافية (اختياري)</Label>
              <Textarea placeholder="اشرح المشكلة بالتفصيل..." value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmitReport} disabled={!reportReason || reportMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {reportMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}إرسال البلاغ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-orange-500" />طلب إرجاع المنتج</DialogTitle>
            <DialogDescription>يرجى تحديد سبب الإرجاع وسيتم إرسال طلبك للبائع للمراجعة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>سبب الإرجاع</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger><SelectValue placeholder="اختر سبب الإرجاع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">المنتج معيب أو تالف</SelectItem>
                  <SelectItem value="different_from_description">المنتج مختلف عن الوصف</SelectItem>
                  <SelectItem value="missing_parts">أجزاء ناقصة</SelectItem>
                  <SelectItem value="wrong_item">استلمت منتجاً خاطئاً</SelectItem>
                  <SelectItem value="changed_mind">غيرت رأيي</SelectItem>
                  <SelectItem value="other">سبب آخر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تفاصيل إضافية (اختياري)</Label>
              <Textarea placeholder="اشرح سبب الإرجاع بالتفصيل..." value={returnDetails} onChange={(e) => setReturnDetails(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmitReturnRequest} disabled={!returnReason || returnRequestMutation.isPending} className="bg-orange-600 hover:bg-orange-700">
              {returnRequestMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}إرسال طلب الإرجاع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-amber-500" />تقييم البائع</DialogTitle>
            <DialogDescription>كيف كانت تجربتك مع {purchase.listing?.sellerName || "البائع"}؟</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>التقييم</Label>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>
            <div className="space-y-2">
              <Label>تعليق (اختياري)</Label>
              <Textarea placeholder="شارك تجربتك مع هذا البائع..." value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsRatingOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmitRating} disabled={rating === 0 || submitReviewMutation.isPending}>
              {submitReviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}إرسال التقييم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
