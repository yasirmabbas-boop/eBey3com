import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

// Iraqi Phone Regex: Starts with 07 or +9647, followed by 9 digits
const phoneRegex = /^(\+964|0)?7[0-9]{9}$/;

const registerSchema = z.object({
  name: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  phone: z.string().regex(phoneRegex, "رقم الهاتف يجب أن يكون رقم عراقي صحيح (07...)"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  agreeTerms: z.boolean().refine(val => val === true, "يجب الموافقة على الشروط والأحكام"),
});

const sellerSchema = registerSchema.extend({
  idNumber: z.string().min(5, "رقم الهوية مطلوب"),
});

export default function Register() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "verify">("form");

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      phone: "",
      password: "",
      agreeTerms: false,
    },
  });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setStep("verify");
      toast({
        title: "تم إرسال رمز التحقق",
        description: `تم إرسال رمز إلى ${data.phone}`,
      });
    }, 1500);
  };

  const onVerify = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "تم التسجيل بنجاح",
        description: "أهلاً بك في اي بيع!",
      });
    }, 1500);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[60vh]">
        <Card className="w-full max-w-md shadow-lg border-muted">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-primary">إنشاء حساب جديد</CardTitle>
            <CardDescription>
              انضم إلى مجتمع اي بيع للبيع والشراء الآمن
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "form" ? (
              <Tabs defaultValue="buyer" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="buyer">مشتري</TabsTrigger>
                  <TabsTrigger value="seller">بائع</TabsTrigger>
                </TabsList>
                
                <TabsContent value="buyer">
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">الاسم الكامل</Label>
                      <Input id="name" {...form.register("name")} placeholder="مثال: علي محمد" className="text-right" />
                      {form.formState.errors.name && <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الهاتف (عراقي فقط)</Label>
                      <Input id="phone" {...form.register("phone")} placeholder="07xxxxxxxxx" className="text-right" dir="ltr" />
                      {form.formState.errors.phone && <p className="text-red-500 text-xs">{form.formState.errors.phone.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">كلمة المرور</Label>
                      <Input id="password" type="password" {...form.register("password")} className="text-right" />
                      {form.formState.errors.password && <p className="text-red-500 text-xs">{form.formState.errors.password.message}</p>}
                    </div>

                    <div className="flex items-start gap-3 mt-4">
                      <Checkbox id="terms" checked={form.watch("agreeTerms")} onCheckedChange={(c) => form.setValue("agreeTerms", c as boolean)} />
                      <Label htmlFor="terms" className="text-xs leading-tight text-muted-foreground">
                        أوافق على الشروط والأحكام وسياسة الخصوصية، وأسمح بمشاركة معلوماتي الأساسية مع البائع عند إتمام الشراء.
                      </Label>
                    </div>
                    {form.formState.errors.agreeTerms && <p className="text-red-500 text-xs">{form.formState.errors.agreeTerms.message}</p>}

                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-4" disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin" /> : "إنشاء حساب مشتري"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="seller">
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-xs mb-4">
                      ملاحظة: حسابات البائعين تتطلب موافقة الإدارة وتوثيق الهوية.
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="s-name">الاسم الكامل</Label>
                      <Input id="s-name" {...form.register("name")} placeholder="مثال: علي محمد" className="text-right" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="s-phone">رقم الهاتف (عراقي فقط)</Label>
                      <Input id="s-phone" {...form.register("phone")} placeholder="07xxxxxxxxx" className="text-right" dir="ltr" />
                    </div>

                    <div className="space-y-2">
                      <Label>صورة الهوية / البطاقة الموحدة</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                        <Upload className="h-8 w-8 mb-2" />
                        <span className="text-xs">اضغط لرفع صورة الهوية</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="s-password">كلمة المرور</Label>
                      <Input id="s-password" type="password" {...form.register("password")} className="text-right" />
                    </div>

                    <div className="flex items-start gap-3 mt-4">
                      <Checkbox id="s-terms" checked={form.watch("agreeTerms")} onCheckedChange={(c) => form.setValue("agreeTerms", c as boolean)} />
                      <Label htmlFor="s-terms" className="text-xs leading-tight text-muted-foreground">
                        أوافق على الشروط والأحكام. رقم هاتفي سيبقى سرياً ولن يظهر للمشترين إلا بموافقتي أو عند الضرورة القصوى.
                      </Label>
                    </div>

                    <Button type="submit" className="w-full bg-accent hover:bg-accent/90 mt-4 text-white" disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin" /> : "طلب حساب بائع"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-6 py-4">
                <div className="text-center">
                  <h3 className="font-bold text-lg mb-2">أدخل رمز التحقق</h3>
                  <p className="text-sm text-muted-foreground">
                    تم إرسال رمز مكون من 4 أرقام إلى هاتفك
                  </p>
                </div>
                
                <div className="flex justify-center gap-2" dir="ltr">
                  {[1, 2, 3, 4].map((i) => (
                    <Input key={i} className="w-12 h-12 text-center text-xl font-bold" maxLength={1} />
                  ))}
                </div>

                <Button onClick={onVerify} className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : "تحقق"}
                </Button>
                
                <Button variant="ghost" onClick={() => setStep("form")} className="w-full text-xs text-muted-foreground">
                  تغيير رقم الهاتف
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
