import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, CheckCircle, XCircle, Smartphone } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TwoFactorSettingsProps {
  isEnabled: boolean;
}

export function TwoFactorSettings({ isEnabled }: TwoFactorSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [setupData, setSetupData] = useState<{ qrCode: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [step, setStep] = useState<"qr" | "verify">("qr");

  const getAuthToken = () => localStorage.getItem("authToken");

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const authToken = getAuthToken();
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل في إعداد المصادقة الثنائية");
      }

      setSetupData({ qrCode: data.qrCode, secret: data.secret });
      setShowSetupDialog(true);
      setStep("qr");
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

  const handleVerifySetup = async () => {
    if (verifyCode.length !== 6) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رمز التحقق المكون من 6 أرقام",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const authToken = getAuthToken();
      const response = await fetch("/api/auth/2fa/verify-setup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: "include",
        body: JSON.stringify({ code: verifyCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "رمز التحقق غير صحيح");
      }

      toast({
        title: "تم التفعيل",
        description: "تم تفعيل المصادقة الثنائية بنجاح",
      });

      setShowSetupDialog(false);
      setSetupData(null);
      setVerifyCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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

  const handleDisable = async () => {
    if (disableCode.length !== 6 || !disablePassword) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رمز التحقق وكلمة المرور",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const authToken = getAuthToken();
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: "include",
        body: JSON.stringify({ code: disableCode, password: disablePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل في إيقاف المصادقة الثنائية");
      }

      toast({
        title: "تم الإيقاف",
        description: "تم إيقاف المصادقة الثنائية",
      });

      setShowDisableDialog(false);
      setDisableCode("");
      setDisablePassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            المصادقة الثنائية (2FA)
          </CardTitle>
          <CardDescription>
            أضف طبقة حماية إضافية لحسابك باستخدام تطبيق Google Authenticator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isEnabled ? (
                <>
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-700">مفعّلة</p>
                    <p className="text-sm text-muted-foreground">حسابك محمي بالمصادقة الثنائية</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <XCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-yellow-700">غير مفعّلة</p>
                    <p className="text-sm text-muted-foreground">قم بتفعيلها لحماية أفضل</p>
                  </div>
                </>
              )}
            </div>

            {isEnabled ? (
              <Button 
                variant="destructive" 
                onClick={() => setShowDisableDialog(true)}
                disabled={isLoading}
                data-testid="button-disable-2fa"
              >
                إيقاف
              </Button>
            ) : (
              <Button 
                onClick={handleSetup}
                disabled={isLoading}
                data-testid="button-setup-2fa"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Smartphone className="h-4 w-4 ml-2" />
                )}
                تفعيل
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إعداد المصادقة الثنائية</DialogTitle>
            <DialogDescription>
              {step === "qr" 
                ? "امسح رمز QR باستخدام تطبيق Google Authenticator"
                : "أدخل رمز التحقق من التطبيق"
              }
            </DialogDescription>
          </DialogHeader>

          {step === "qr" && setupData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img src={setupData.qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  أو أدخل هذا الرمز يدوياً:
                </p>
                <code className="bg-muted px-3 py-1 rounded text-sm font-mono break-all">
                  {setupData.secret}
                </code>
              </div>

              <Button 
                onClick={() => setStep("verify")} 
                className="w-full"
                data-testid="button-next-verify"
              >
                التالي
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>رمز التحقق</Label>
                <div className="flex justify-center" dir="ltr">
                  <InputOTP
                    maxLength={6}
                    value={verifyCode}
                    onChange={(value) => setVerifyCode(value)}
                    data-testid="input-setup-code"
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

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep("qr")}
                  className="flex-1"
                >
                  رجوع
                </Button>
                <Button 
                  onClick={handleVerifySetup}
                  disabled={isLoading || verifyCode.length !== 6}
                  className="flex-1"
                  data-testid="button-confirm-setup"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "تأكيد"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إيقاف المصادقة الثنائية</DialogTitle>
            <DialogDescription>
              للتأكد من هويتك، يرجى إدخال رمز التحقق وكلمة المرور
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>رمز التحقق من التطبيق</Label>
              <div className="flex justify-center" dir="ltr">
                <InputOTP
                  maxLength={6}
                  value={disableCode}
                  onChange={(value) => setDisableCode(value)}
                  data-testid="input-disable-code"
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

            <div className="space-y-2">
              <Label htmlFor="disable-password">كلمة المرور</Label>
              <Input
                id="disable-password"
                type="password"
                placeholder="أدخل كلمة المرور"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                data-testid="input-disable-password"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDisableDialog(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDisable}
                disabled={isLoading || disableCode.length !== 6 || !disablePassword}
                className="flex-1"
                data-testid="button-confirm-disable"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "إيقاف"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
