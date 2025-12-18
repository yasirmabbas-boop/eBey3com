import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const phoneRegex = /^(\+964|0)?7[0-9]{9}$/;

const signInSchema = z.object({
  phone: z.string().regex(phoneRegex, "رقم الهاتف يجب أن يكون رقم عراقي صحيح (07...)"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

export default function SignIn() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<"buyer" | "seller">("buyer");

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof signInSchema>) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "تم الدخول بنجاح",
        description: `أهلاً بك في اي بيع كـ${userType === "buyer" ? "مشتري" : "بائع"}!`,
      });
    }, 1500);
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: `جاري الدخول عبر ${provider}`,
      description: "يرجى إدخال رقم الهاتف العراقي للمتابعة",
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[60vh]">
        <Card className="w-full max-w-md shadow-lg border-muted">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-primary">دخول إلى حسابك</CardTitle>
            <CardDescription>
              اختر نوع الحساب والطريقة المناسبة للدخول
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={userType} onValueChange={(v) => setUserType(v as "buyer" | "seller")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="buyer">مشتري</TabsTrigger>
                <TabsTrigger value="seller">بائع</TabsTrigger>
              </TabsList>

              <TabsContent value="buyer">
                <div className="space-y-4">
                  {/* Social Login */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700 text-center">الدخول السريع</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 py-2 hover:bg-blue-50"
                      onClick={() => handleSocialLogin("Google")}
                    >
                      <svg className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="#EA4335"/>
                        <circle cx="12" cy="12" r="6" fill="#EA4335"/>
                      </svg>
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 py-2 hover:bg-blue-100"
                      onClick={() => handleSocialLogin("Facebook")}
                    >
                      <svg className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 py-2 hover:bg-gray-50"
                      onClick={() => handleSocialLogin("Apple")}
                    >
                      <svg className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.06-.93 3.32-1.04 1.71-.13 3.06.87 3.32 2.61-2.58 1.5-2.38 4.9-.5 5.95-1.05 1.75-2.29 2.64-3.72 3.35-.34.15-.67.28-1 .28-.01 0-.02 0-.02 0zm-10.04-13.38C7.47 5.47 9.96 3.64 12.5 3.5c.25 1.91-1.01 3.62-2.95 4.04-.37.07-.76.11-1.16.09"/>
                      </svg>
                      Apple
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">أو استخدم البريد الإلكتروني</span>
                    </div>
                  </div>

                  {/* Traditional Login */}
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="buyer-phone">رقم الهاتف (عراقي)</Label>
                      <Input
                        id="buyer-phone"
                        {...form.register("phone")}
                        placeholder="07xxxxxxxxx"
                        className="text-right"
                        dir="ltr"
                      />
                      {form.formState.errors.phone && (
                        <p className="text-red-500 text-xs">{form.formState.errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buyer-password">كلمة المرور</Label>
                      <Input
                        id="buyer-password"
                        type="password"
                        {...form.register("password")}
                        className="text-right"
                      />
                      {form.formState.errors.password && (
                        <p className="text-red-500 text-xs">{form.formState.errors.password.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : "دخول"}
                    </Button>

                    <div className="text-xs text-muted-foreground text-center mt-6 pt-6 border-t space-y-2">
                      <p>بالدخول، أنت توافق على <a href="/terms" className="text-primary hover:underline font-semibold">الشروط والأحكام</a> و<a href="/privacy" className="text-primary hover:underline font-semibold">سياسة الخصوصية</a></p>
                      <p>ليس لديك حساب؟{" "}
                        <a href="/register" className="text-primary hover:underline font-semibold">
                          إنشاء حساب
                        </a>
                      </p>
                    </div>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="seller">
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-xs mb-4">
                    ملاحظة: حسابات البائعين المتحققة تحصل على خصومات وأولويات في البحث.
                  </div>

                  {/* Social Login */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700 text-center">الدخول السريع</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 py-2 hover:bg-blue-50"
                      onClick={() => handleSocialLogin("Google")}
                    >
                      <svg className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="#EA4335"/>
                        <circle cx="12" cy="12" r="6" fill="#EA4335"/>
                      </svg>
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 py-2 hover:bg-blue-100"
                      onClick={() => handleSocialLogin("Facebook")}
                    >
                      <svg className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 py-2 hover:bg-gray-50"
                      onClick={() => handleSocialLogin("Apple")}
                    >
                      <svg className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.06-.93 3.32-1.04 1.71-.13 3.06.87 3.32 2.61-2.58 1.5-2.38 4.9-.5 5.95-1.05 1.75-2.29 2.64-3.72 3.35-.34.15-.67.28-1 .28-.01 0-.02 0-.02 0zm-10.04-13.38C7.47 5.47 9.96 3.64 12.5 3.5c.25 1.91-1.01 3.62-2.95 4.04-.37.07-.76.11-1.16.09"/>
                      </svg>
                      Apple
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">أو استخدم البريد الإلكتروني</span>
                    </div>
                  </div>

                  {/* Traditional Login */}
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="seller-phone">رقم الهاتف (عراقي)</Label>
                      <Input
                        id="seller-phone"
                        {...form.register("phone")}
                        placeholder="07xxxxxxxxx"
                        className="text-right"
                        dir="ltr"
                      />
                      {form.formState.errors.phone && (
                        <p className="text-red-500 text-xs">{form.formState.errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seller-password">كلمة المرور</Label>
                      <Input
                        id="seller-password"
                        type="password"
                        {...form.register("password")}
                        className="text-right"
                      />
                      {form.formState.errors.password && (
                        <p className="text-red-500 text-xs">{form.formState.errors.password.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-accent hover:bg-accent/90 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : "دخول"}
                    </Button>

                    <div className="text-xs text-muted-foreground text-center mt-6 pt-6 border-t space-y-2">
                      <p>بالدخول، أنت توافق على <a href="/terms" className="text-accent hover:underline font-semibold">الشروط والأحكام</a> و<a href="/privacy" className="text-accent hover:underline font-semibold">سياسة الخصوصية</a></p>
                      <p>ليس لديك حساب؟{" "}
                        <a href="/register" className="text-accent hover:underline font-semibold">
                          اطلب حساب بائع
                        </a>
                      </p>
                    </div>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
