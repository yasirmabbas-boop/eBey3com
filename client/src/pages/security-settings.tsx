import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface UserProfile {
  id: string;
  phone: string;
  displayName: string;
  twoFactorEnabled?: boolean;
}

export default function SecuritySettings() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/account/profile"],
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول للوصول إلى إعدادات الأمان",
        variant: "destructive",
      });
      navigate("/signin?redirect=/security-settings");
    }
  }, [authLoading, isAuthenticated, navigate, toast]);

  if (authLoading || profileLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">إعدادات الأمان</h1>
          </div>
          <p className="text-muted-foreground">
            إدارة إعدادات الأمان والحماية لحسابك
          </p>
        </div>

        <div className="space-y-6">
          <TwoFactorSettings isEnabled={!!profile?.twoFactorEnabled} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                كلمة المرور
              </CardTitle>
              <CardDescription>
                تغيير كلمة المرور الخاصة بحسابك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/forgot-password">
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium">تغيير كلمة المرور</p>
                    <p className="text-sm text-muted-foreground">
                      قم بتغيير كلمة المرور لحماية حسابك
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                نصائح أمان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز</p>
              <p>• لا تشارك كلمة المرور أو رموز التحقق مع أي شخص</p>
              <p>• فعّل المصادقة الثنائية للحماية من الاختراق</p>
              <p>• تحقق من هوية المشتري/البائع قبل إتمام الصفقات</p>
              <p>• احذر من الروابط المشبوهة ورسائل الاحتيال</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
