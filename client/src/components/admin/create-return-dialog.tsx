import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { secureRequest } from "@/lib/queryClient";

interface CreateReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateReturnDialog({ open, onOpenChange }: CreateReturnDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [transactionId, setTransactionId] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [details, setDetails] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [overridePolicy, setOverridePolicy] = useState(false);

  // Fetch templates for selection
  const { data: templates } = useQuery({
    queryKey: ["/api/admin/return-templates", true],
    queryFn: async () => {
      const res = await secureRequest("/api/admin/return-templates?activeOnly=true");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    enabled: open,
  });

  // Search for transaction
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["/api/admin/search/by-code", searchQuery, "transaction"],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      const res = await secureRequest(`/api/admin/search/by-code?code=${encodeURIComponent(searchQuery)}&type=transaction`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.result;
    },
    enabled: open && searchQuery.trim().length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await secureRequest("/api/admin/returns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: transactionId || searchResults?.id,
            reason: reason === "other" ? customReason : reason,
            details: details || undefined,
            templateId: templateId || undefined,
            overridePolicy,
          }),
        });
        
        if (!res.ok) {
          let errorMessage = "فشل في إنشاء طلب الإرجاع";
          let errorCode: string | undefined;
          let errorDetails: any = {};
          
          try {
            const error = await res.json();
            errorMessage = error.error || error.message || errorMessage;
            errorCode = error.code;
            errorDetails = {
              transactionId: error.transactionId,
              listingId: error.listingId,
              returnRequestId: error.returnRequestId,
            };
          } catch (parseError) {
            // Not JSON response - try to get text
            try {
              const text = await res.text();
              errorMessage = text || `خطأ ${res.status}: ${res.statusText}`;
            } catch {
              errorMessage = `خطأ ${res.status}: ${res.statusText}`;
            }
          }
          
          console.error("[CreateReturn] API Error:", {
            status: res.status,
            statusText: res.statusText,
            message: errorMessage,
            code: errorCode,
            details: errorDetails,
            transactionId: transactionId || searchResults?.id,
          });
          
          // Create error with code attached
          const error = new Error(errorMessage);
          (error as any).code = errorCode;
          (error as any).details = errorDetails;
          throw error;
        }
        return res.json();
      } catch (error) {
        // Handle network errors
        if (error instanceof TypeError && error.message.includes("fetch")) {
          console.error("[CreateReturn] Network Error:", error);
          throw new Error("خطأ في الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "تم إنشاء طلب الإرجاع بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/returns"] });
      onOpenChange(false);
      // Reset form
      setTransactionId("");
      setReason("");
      setCustomReason("");
      setDetails("");
      setTemplateId("");
      setOverridePolicy(false);
      setSearchQuery("");
    },
    onError: (error: Error) => {
      console.error("[CreateReturn] Mutation Error:", error);
      const errorCode = (error as any).code;
      const errorDetails = (error as any).details;
      const isNetworkError = error.message?.includes("الاتصال") || error.message?.includes("fetch");
      
      // Build description with context
      let description: string | undefined;
      if (isNetworkError) {
        description = "يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى";
      } else if (errorCode === "DATABASE_MIGRATION_REQUIRED") {
        description = "يرجى تشغيل migration قاعدة البيانات المطلوبة";
      } else if (errorCode === "TRANSACTION_NOT_FOUND") {
        description = `المعاملة ${errorDetails?.transactionId || "غير موجودة"}`;
      } else if (errorCode === "RETURN_ALREADY_EXISTS") {
        description = `يوجد طلب إرجاع موجود بالفعل (ID: ${errorDetails?.returnRequestId || "غير معروف"})`;
      } else if (errorCode === "LISTING_NOT_FOUND") {
        description = `المنتج المرتبط بالمعاملة غير موجود`;
      } else if (errorCode === "NO_RETURN_POLICY") {
        description = "المنتج لا يحتوي على سياسة إرجاع. استخدم خيار تجاوز السياسة";
      }
      
      toast({ 
        title: error.message || "فشل في إنشاء طلب الإرجاع",
        description,
        variant: "destructive",
        duration: errorCode ? 8000 : 5000, // Longer duration for important errors
      });
    },
  });

  const reasons = [
    "damaged",
    "different_from_description",
    "missing_parts",
    "changed_mind",
    "found_cheaper",
    "quality_issue",
    "wrong_item",
    "defective",
    "other",
  ];

  const reasonLabels: Record<string, string> = {
    damaged: "تالف",
    different_from_description: "مختلف عن الوصف",
    missing_parts: "أجزاء مفقودة",
    changed_mind: "غيرت رأيي",
    found_cheaper: "وجدت أرخص",
    quality_issue: "مشكلة في الجودة",
    wrong_item: "عنصر خاطئ",
    defective: "معيب",
    other: "أخرى",
  };

  const selectedTransactionId = transactionId || searchResults?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            إنشاء طلب إرجاع جديد
          </DialogTitle>
          <DialogDescription>
            يمكن للإدارة إنشاء طلبات إرجاع نيابة عن المشترين
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction Search/Select */}
          <div className="space-y-2">
            <Label>المعاملة</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث برقم المعاملة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              {selectedTransactionId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTransactionId("");
                    setSearchQuery("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {searching && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                جاري البحث...
              </div>
            )}
            {searchResults && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                <div className="font-medium">تم العثور على المعاملة:</div>
                <div className="font-mono">{searchResults.id}</div>
                <div className="text-muted-foreground">
                  المبلغ: {searchResults.amount?.toLocaleString()} د.ع
                </div>
              </div>
            )}
            {searchQuery && !searching && !searchResults && (
              <div className="text-sm text-red-600">
                لم يتم العثور على معاملة بهذا الرقم
              </div>
            )}
          </div>

          {/* Template Selection */}
          {templates && templates.length > 0 && (
            <div className="space-y-2">
              <Label>استخدام قالب (اختياري)</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر قالب..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">لا يوجد</SelectItem>
                  {templates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} - {template.reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>سبب الإرجاع *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="اختر السبب" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {reasonLabels[r] || r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reason === "other" && (
              <Input
                placeholder="حدد السبب..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            )}
          </div>

          {/* Details */}
          <div className="space-y-2">
            <Label>التفاصيل (اختياري)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="أضف تفاصيل إضافية..."
              rows={4}
            />
          </div>

          {/* Override Policy */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="override-policy"
              checked={overridePolicy}
              onCheckedChange={(checked) => setOverridePolicy(checked === true)}
            />
            <Label htmlFor="override-policy" className="cursor-pointer">
              تجاوز سياسة الإرجاع (للحالات الخاصة)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={
              createMutation.isPending ||
              !selectedTransactionId ||
              !reason ||
              (reason === "other" && !customReason.trim())
            }
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Plus className="h-4 w-4 ml-2" />
            )}
            إنشاء الطلب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
