import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Smartphone, Bell, Key, User, Save } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "تم حفظ الإعدادات بنجاح ✅",
        description: "تم تحديث تفضيلاتك.",
      });
    }, 1000);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">الإعدادات</h1>

        <Tabs defaultValue="security" className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-8">
            <TabsTrigger value="security">الأمان والحماية</TabsTrigger>
            <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                حماية الحساب
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">المصادقة الثنائية (2FA)</Label>
                    <p className="text-sm text-gray-500">
                      طلب رمز تحقق عند تسجيل الدخول من جهاز جديد
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">تنبيهات تسجيل الدخول عبر واتساب</Label>
                    <p className="text-sm text-gray-500">
                      إرسال رسالة واتساب تلقائية عند الدخول للحساب
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">تغيير كلمة المرور</Label>
                    <p className="text-sm text-gray-500">
                      آخر تغيير كان قبل 3 أشهر
                    </p>
                  </div>
                  <Button variant="outline" size="sm">تغيير</Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                الأجهزة المتصلة
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">iPhone 14 Pro</p>
                      <p className="text-xs text-green-600">الجهاز الحالي • بغداد, العراق</p>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">نشط الآن</span>
                </div>
              </div>
            </Card>

            <Button onClick={handleSave} className="w-full md:w-auto" disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                المعلومات الشخصية
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input defaultValue="علي محمد" />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input defaultValue="07701234567" disabled className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input defaultValue="ali@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>المدينة</Label>
                  <Input defaultValue="بغداد" />
                </div>
              </div>
              <Button onClick={handleSave} className="mt-6 w-full md:w-auto" disabled={loading}>
                {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
