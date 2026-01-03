import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, KeyRound, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Step = "phone" | "verify" | "reset" | "success";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم الهاتف",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, type: "password_reset" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل إرسال رمز التحقق");
      }

      toast({
        title: "تم الإرسال",
        description: "تم إرسال رمز التحقق إلى هاتفك",
      });

      setStep("verify");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رمز التحقق المكون من 6 أرقام",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, type: "password_reset" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "رمز التحقق غير صحيح");
      }

      setResetToken(data.resetToken);
      setStep("reset");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمتا المرور غير متطابقتين",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, resetToken, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل إعادة تعيين كلمة المرور");
      }

      setStep("success");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">استعادة كلمة المرور</CardTitle>
            <CardDescription>
              {step === "phone" && "أدخل رقم هاتفك لإرسال رمز التحقق"}
              {step === "verify" && "أدخل رمز التحقق المرسل إلى هاتفك"}
              {step === "reset" && "أدخل كلمة المرور الجديدة"}
              {step === "success" && "تم تغيير كلمة المرور بنجاح"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "phone" && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="07xxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pr-10"
                      dir="ltr"
                      data-testid="input-phone"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-send-code">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 ml-2" />
                  )}
                  إرسال رمز التحقق
                </Button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label>رمز التحقق</Label>
                  <div className="flex justify-center" dir="ltr">
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={(value) => setCode(value)}
                      data-testid="input-otp"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6} data-testid="button-verify-code">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 ml-2" />
                  )}
                  تحقق من الرمز
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleSendCode}
                  disabled={isLoading}
                  data-testid="button-resend-code"
                >
                  إعادة إرسال الرمز
                </Button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="input-new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-reset-password">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 ml-2" />
                  )}
                  تغيير كلمة المرور
                </Button>
              </form>
            )}

            {step === "success" && (
              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-muted-foreground">
                  يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة
                </p>
                <Button onClick={() => navigate("/signin")} className="w-full" data-testid="button-go-signin">
                  تسجيل الدخول
                </Button>
              </div>
            )}

            {step !== "success" && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                تذكرت كلمة المرور؟{" "}
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/signin")} data-testid="link-signin">
                  تسجيل الدخول
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
