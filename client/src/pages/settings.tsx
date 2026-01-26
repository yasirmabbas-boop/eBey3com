import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function Settings() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>الإعدادات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Link href="/security-settings">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold">إعدادات الأمان</h3>
                    <p className="text-sm text-muted-foreground">إدارة كلمة المرور والتحقق بخطوتين</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/my-account">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold">حسابي</h3>
                    <p className="text-sm text-muted-foreground">إدارة معلومات الحساب</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
