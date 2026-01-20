import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";

interface PhoneVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  isVerified: boolean;
}

export function PhoneVerificationModal({
  open,
  onOpenChange,
  phone,
  isVerified,
}: PhoneVerificationModalProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const tr = (ar: string, ku: string, en: string) => 
    language === "ar" ? ar : language === "ku" ? ku : en;

  const handleVerifyWhatsApp = async () => {
    setIsVerifying(true);
    
    try {
      // This would trigger the WhatsApp SDK verification
      // For now, we'll call the backend endpoint directly with the phone
      const response = await fetch("/api/auth/verify-phone-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mobile: phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || tr(
          "فشل في التحقق من رقم الهاتف",
          "پشتڕاستکردنەوەی ژمارەی مۆبایل سەرکەوتوو نەبوو",
          "Phone verification failed"
        ));
      }

      toast({
        title: tr("تم التحقق بنجاح", "پشتڕاستکرایەوە", "Verified successfully"),
        description: tr(
          "تم التحقق من رقم هاتفك بنجاح عبر واتساب",
          "ژمارەی مۆبایلەکەت بە سەرکەوتوویی پشتڕاستکرایەوە",
          "Your phone number has been verified via WhatsApp"
        ),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: tr("خطأ", "هەڵە", "Error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {tr("التحقق من رقم الهاتف", "پشتڕاستکردنەوەی ژمارەی مۆبایل", "Phone Verification")}
          </DialogTitle>
          <DialogDescription>
            {tr(
              "تحقق من ملكيتك لرقم الهاتف المسجل في حسابك",
              "پشتڕاستی بکەوە کە ژمارەی مۆبایلەکە هی تۆیە",
              "Verify ownership of your registered phone number"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">
              {tr("رقم الهاتف المسجل", "ژمارەی مۆبایلی تۆمارکراو", "Registered Phone")}
            </div>
            <div className="text-lg font-bold font-mono" dir="ltr">
              {phone}
            </div>
          </div>

          {isVerified ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-800">
                {tr(
                  "رقم هاتفك موثق بالفعل",
                  "ژمارەی مۆبایلەکەت پێشتر پشتڕاستکراوەتەوە",
                  "Your phone number is already verified"
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  {tr(
                    "لم يتم التحقق من رقم هاتفك بعد. التحقق يزيد من أمان حسابك ومصداقيتك.",
                    "ژمارەی مۆبایلەکەت هێشتا پشتڕاست نەکراوەتەوە. پشتڕاستکردنەوە پارێزراوی هەژمارەکەت زیاد دەکات.",
                    "Your phone number is not verified yet. Verification increases your account security and credibility."
                  )}
                </div>
              </div>

              <Button
                onClick={handleVerifyWhatsApp}
                disabled={isVerifying}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    {tr("جاري التحقق...", "پشتڕاستکردنەوە...", "Verifying...")}
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 ml-2" />
                    {tr("التحقق عبر واتساب", "پشتڕاستکردنەوە لە ڕێگەی واتسئاپ", "Verify via WhatsApp")}
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {tr(
                  "سيتم إرسال طلب تحقق إلى رقم واتساب الخاص بك",
                  "داواکاری پشتڕاستکردنەوە بۆ ژمارەی واتسئاپەکەت دەنێردرێت",
                  "A verification request will be sent to your WhatsApp number"
                )}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
