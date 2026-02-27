import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, MessageSquare, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { AUTH_QUERY_KEY } from "@/hooks/use-auth";

interface MandatoryPhoneVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

export function MandatoryPhoneVerificationModal({
  open,
  onOpenChange,
  onVerified,
}: MandatoryPhoneVerificationModalProps) {
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const tr = (ar: string, ku: string, en: string) => 
    language === "ar" ? ar : language === "ku" ? ku : en;

  const otpSectionRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setPhone("");
      setOtpCode("");
      setOtpSent(false);
    }
  }, [open]);

  // Scroll OTP input into view when otpSent becomes true
  useEffect(() => {
    if (open && otpSent && otpSectionRef.current) {
      otpSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [open, otpSent]);

  const handleSendOtp = async () => {
    if (!phone || phone.trim().length < 10) {
      toast({
        title: tr("خطأ", "هەڵە", "Error"),
        description: tr(
          "الرجاء إدخال رقم هاتف صحيح",
          "تکایە ژمارەی مۆبایلی دروست بنووسە",
          "Please enter a valid phone number"
        ),
        variant: "destructive",
      });
      return;
    }

    setIsSendingOtp(true);
    
    try {
      const response = await fetch("/api/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: phone.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || tr(
          "فشل في إرسال رمز التحقق",
          "ناردنی کۆدی پشتڕاستکردنەوە سەرکەوتوو نەبوو",
          "Failed to send verification code"
        ));
      }

      if (data.alreadyVerified) {
        toast({
          title: tr("موثق بالفعل", "پێشتر پشتڕاستکراوە", "Already verified"),
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        onVerified();
        onOpenChange(false);
        return;
      }

      setOtpSent(true);
      toast({
        title: tr("تم إرسال رمز التحقق", "کۆدی پشتڕاستکردنەوە نێردرا", "Verification code sent"),
        description: tr(
          "تم إرسال رمز التحقق إلى واتساب الخاص بك",
          "کۆدی پشتڕاستکردنەوە بۆ واتسئاپەکەت نێردرا",
          "Verification code has been sent to your WhatsApp"
        ),
      });
    } catch (error: any) {
      toast({
        title: tr("خطأ", "هەڵە", "Error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast({
        title: tr("خطأ", "هەڵە", "Error"),
        description: tr(
          "الرجاء إدخال رمز التحقق المكون من 6 أرقام",
          "تکایە کۆدی پشتڕاستکردنەوەی 6 ژمارەیی بنووسە",
          "Please enter the 6-digit verification code"
        ),
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: phone.trim(), code: otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || tr(
          "رمز التحقق غير صحيح",
          "کۆدی پشتڕاستکردنەوە هەڵەیە",
          "Invalid verification code"
        ));
      }

      // Store the new auth token if returned (contains phoneVerified: true)
      if (data.token) {
        localStorage.setItem("authToken", data.token);
        console.log("[PhoneVerification] New auth token stored after verification");
      }

      toast({
        title: tr("تم التحقق بنجاح", "پشتڕاستکرایەوە", "Verified successfully"),
        description: tr(
          "تم التحقق من رقم هاتفك بنجاح. يمكنك الآن المزايدة والشراء.",
          "ژمارەی مۆبایلەکەت بە سەرکەوتوویی پشتڕاستکرایەوە. ئێستا دەتوانیت مزایدە و کڕین بکەیت.",
          "Your phone number has been verified. You can now bid and purchase."
        ),
      });

      // Invalidate and refetch user data to get updated phoneVerified status
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY });
      
      onVerified();
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
              "يجب التحقق من رقم هاتفك للمزايدة والشراء",
              "دەبێت ژمارەی مۆبایلەکەت پشتڕاست بکەیتەوە بۆ مزایدە و کڕین",
              "You must verify your phone number to bid and purchase"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!otpSent ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="text-sm text-amber-800">
                  {tr(
                    "للمزايدة والشراء، يجب التحقق من رقم هاتفك عبر واتساب",
                    "بۆ مزایدە و کڕین، دەبێت ژمارەی مۆبایلەکەت بە واتسئاپ پشتڕاست بکەیتەوە",
                    "To bid and purchase, you must verify your phone number via WhatsApp"
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {tr("رقم الهاتف", "ژمارەی مۆبایل", "Phone Number")}
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setPhone(value);
                  }}
                  placeholder={tr("07501234567", "07501234567", "07501234567")}
                  className="text-lg font-mono"
                  dir="ltr"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {tr(
                    "أدخل رقم هاتفك العراقي (مثال: 07501234567)",
                    "ژمارەی مۆبایلی عێراقی بنووسە (نموونە: 07501234567)",
                    "Enter your Iraqi phone number (e.g., 07501234567)"
                  )}
                </p>
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={isSendingOtp || !phone || phone.length < 10}
                className="w-full"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    {tr("جاري الإرسال...", "ناردن...", "Sending...")}
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 ml-2" />
                    {tr("إرسال رمز التحقق", "ناردنی کۆدی پشتڕاستکردنەوە", "Send Verification Code")}
                  </>
                )}
              </Button>
            </>
          ) : (
            <div ref={otpSectionRef}>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  {tr(
                    `تم إرسال رمز التحقق إلى ${phone}. يرجى إدخال الرمز المكون من 6 أرقام.`,
                    `کۆدی پشتڕاستکردنەوە بۆ ${phone} نێردرا. تکایە کۆدی 6 ژمارەیی بنووسە.`,
                    `Verification code has been sent to ${phone}. Please enter the 6-digit code.`
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {tr("رمز التحقق", "کۆدی پشتڕاستکردنەوە", "Verification Code")}
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setOtpCode(value);
                  }}
                  placeholder={tr("000000", "000000", "000000")}
                  className="text-center text-2xl font-mono tracking-widest"
                  dir="ltr"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  {tr(
                    "الرمز صالح لمدة 5 دقائق",
                    "کۆدەکە بۆ 5 خولەک بەکارهاتووە",
                    "Code is valid for 5 minutes"
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode("");
                  }}
                  disabled={isVerifying}
                  className="flex-1"
                >
                  {tr("إعادة الإرسال", "دووبارە ناردن", "Resend")}
                </Button>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || otpCode.length !== 6}
                  className="flex-1"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      {tr("جاري التحقق...", "پشتڕاستکردنەوە...", "Verifying...")}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 ml-2" />
                      {tr("التحقق", "پشتڕاستکردنەوە", "Verify")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
