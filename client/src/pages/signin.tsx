import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, Lock, LogIn, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export default function SignIn() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phone || !formData.password) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم الهاتف وكلمة المرور",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      console.log("[DEBUG] Login response:", JSON.stringify(data, null, 2));
      console.log("[DEBUG] Response ok:", response.ok);

      if (!response.ok) {
        throw new Error(data.error || "فشل تسجيل الدخول");
      }

      console.log("[DEBUG] authToken received:", data.authToken ? "YES" : "NO");
      
      if (data.authToken) {
        try {
          localStorage.setItem("authToken", data.authToken);
          const savedToken = localStorage.getItem("authToken");
          console.log("[DEBUG] Token saved to localStorage:", savedToken ? "SUCCESS" : "FAILED");
          console.log("[DEBUG] Saved token value:", savedToken);
        } catch (storageError) {
          console.error("[DEBUG] localStorage error:", storageError);
        }
      } else {
        console.error("[DEBUG] No authToken in response!");
      }
      
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `مرحباً ${data.displayName}`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "خطأ في تسجيل الدخول",
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
              <LogIn className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
            <CardDescription>
              أدخل رقم هاتفك وكلمة المرور للمتابعة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="07xxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="pr-10"
                    dir="ltr"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="أدخل كلمة المرور"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="pr-10"
                    data-testid="input-password"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-signin"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>

              <div className="text-left">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                  نسيت كلمة المرور؟
                </Link>
              </div>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">ليس لديك حساب؟ </span>
              <Link href="/register" className="text-primary hover:underline font-medium">
                إنشاء حساب جديد
              </Link>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  أو
                </span>
              </div>
            </div>

            <a 
              href="/api/login" 
              className="flex items-center justify-center gap-2 w-full border rounded-lg py-2.5 hover:bg-gray-50 transition-colors"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4" />
              <span className="text-sm font-medium">تسجيل الدخول عبر Google / Apple</span>
            </a>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
