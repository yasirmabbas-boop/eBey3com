import { useState } from "react";
import { useRoute } from "wouter";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, MapPin } from "lucide-react";
import { MapPicker } from "@/components/map-picker";

const phoneRegex = /^(\+964|0)?7[0-9]{9}$/;

const IRAQI_DISTRICTS = [
  "بغداد - الكرخ",
  "بغداد - الرصافة",
  "البصرة",
  "نينوى",
  "أربيل",
  "النجف",
  "كربلاء",
  "الأنبار",
  "ديالى",
  "كركوك",
  "صلاح الدين",
  "السليمانية",
  "دهوك",
  "واسط",
  "ميسان",
  "ذي قار",
  "المثنى",
  "القادسية",
  "بابل",
];

const baseSchema = z.object({
  name: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  phone: z.string().regex(phoneRegex, "رقم الهاتف يجب أن يكون رقم عراقي صحيح (07...)"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  agreeTerms: z.boolean().refine(val => val === true, "يجب الموافقة على الشروط والأحكام"),
});

const buyerSchema = baseSchema.extend({
  addressLine1: z.string().min(5, "العنوان الرئيسي مطلوب"),
  addressLine2: z.string().optional(),
  district: z.string().min(1, "المحافظة مطلوبة"),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
});

const sellerSchema = baseSchema.extend({
  idNumber: z.string().optional(),
});

export default function Register() {
  const { toast } = useToast();
  const [params] = useRoute("/register");
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") as "buyer" | "seller" | null;
  
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [activeTab, setActiveTab] = useState<"buyer" | "seller">(initialTab || "buyer");

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const buyerForm = useForm<z.infer<typeof buyerSchema>>({
    resolver: zodResolver(buyerSchema),
    defaultValues: {
      name: "",
      phone: "",
      password: "",
      addressLine1: "",
      addressLine2: "",
      district: "",
      locationLat: undefined,
      locationLng: undefined,
      agreeTerms: false,
    },
  });

  const sellerForm = useForm<z.infer<typeof sellerSchema>>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      name: "",
      phone: "",
      password: "",
      idNumber: "",
      agreeTerms: false,
    },
  });

  const handleLocationChange = (coords: { lat: number; lng: number }) => {
    setLocation(coords);
    buyerForm.setValue("locationLat", coords.lat);
    buyerForm.setValue("locationLng", coords.lng);
  };

  const onBuyerSubmit = async (data: z.infer<typeof buyerSchema>) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep("verify");
      toast({
        title: "تم إرسال رمز التحقق",
        description: `تم إرسال رمز إلى ${data.phone}`,
      });
    }, 1500);
  };

  const onSellerSubmit = async (data: z.infer<typeof sellerSchema>) => {
    setIsLoading(true);
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
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "buyer" | "seller")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="buyer">مشتري</TabsTrigger>
                  <TabsTrigger value="seller">بائع</TabsTrigger>
                </TabsList>
                
                <TabsContent value="buyer">
                  <form onSubmit={buyerForm.handleSubmit(onBuyerSubmit)} className="space-y-4">
                    {/* Social Registration */}
                    <div className="space-y-2 mb-6">
                      <p className="text-sm font-semibold text-gray-700 text-center mb-3">التسجيل السريع</p>
                      <div className="grid grid-cols-3 gap-2">
                        <Button type="button" variant="outline" className="border-2 hover:bg-gray-50">
                           Google
                        </Button>
                        <Button type="button" variant="outline" className="border-2 hover:bg-gray-50">
                           Facebook
                        </Button>
                        <Button type="button" variant="outline" className="border-2 hover:bg-gray-50">
                           Apple
                        </Button>
                      </div>
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">أو</span></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">الاسم الكامل</Label>
                      <Input id="name" {...buyerForm.register("name")} placeholder="مثال: علي محمد" className="text-right" />
                      {buyerForm.formState.errors.name && <p className="text-red-500 text-xs">{buyerForm.formState.errors.name.message}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الهاتف أو البريد الإلكتروني</Label>
                      <Input id="phone" {...buyerForm.register("phone")} placeholder="07xxxxxxxxx أو example@email.com" className="text-right" dir="ltr" />
                      {buyerForm.formState.errors.phone && <p className="text-red-500 text-xs">{buyerForm.formState.errors.phone.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">كلمة المرور</Label>
                      <Input id="password" type="password" {...buyerForm.register("password")} className="text-right" />
                      {buyerForm.formState.errors.password && <p className="text-red-500 text-xs">{buyerForm.formState.errors.password.message}</p>}
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-primary">عنوان التوصيل</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="district">المحافظة</Label>
                          <Select onValueChange={(v) => buyerForm.setValue("district", v)} value={buyerForm.watch("district")}>
                            <SelectTrigger data-testid="select-district">
                              <SelectValue placeholder="اختر المحافظة" />
                            </SelectTrigger>
                            <SelectContent>
                              {IRAQI_DISTRICTS.map((district) => (
                                <SelectItem key={district} value={district}>
                                  {district}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {buyerForm.formState.errors.district && <p className="text-red-500 text-xs">{buyerForm.formState.errors.district.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="addressLine1">العنوان الرئيسي</Label>
                          <Input 
                            id="addressLine1" 
                            {...buyerForm.register("addressLine1")} 
                            placeholder="مثال: حي المنصور، شارع 14 رمضان، قرب مجمع الحارثية" 
                            className="text-right" 
                            data-testid="input-address-line1"
                          />
                          {buyerForm.formState.errors.addressLine1 && <p className="text-red-500 text-xs">{buyerForm.formState.errors.addressLine1.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="addressLine2">تفاصيل إضافية (اختياري)</Label>
                          <Input 
                            id="addressLine2" 
                            {...buyerForm.register("addressLine2")} 
                            placeholder="مثال: بناية رقم 25، الطابق الثالث، شقة 8" 
                            className="text-right" 
                            data-testid="input-address-line2"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>موقعك على الخريطة</Label>
                          <MapPicker 
                            value={location} 
                            onChange={handleLocationChange}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 mt-4">
                      <Checkbox id="terms" checked={buyerForm.watch("agreeTerms")} onCheckedChange={(c) => buyerForm.setValue("agreeTerms", c as boolean)} />
                      <Label htmlFor="terms" className="text-xs leading-tight text-muted-foreground">
                        أوافق على <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">الشروط والأحكام</a> و<a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">سياسة الخصوصية</a>، وأسمح بمشاركة معلوماتي الأساسية مع البائع عند إتمام الشراء.
                      </Label>
                    </div>
                    {buyerForm.formState.errors.agreeTerms && <p className="text-red-500 text-xs">{buyerForm.formState.errors.agreeTerms.message}</p>}

                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-4" disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin" /> : "إنشاء حساب مشتري"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="seller">
                  <form onSubmit={sellerForm.handleSubmit(onSellerSubmit)} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-xs mb-4">
                      ملاحظة: حسابات البائعين تتطلب موافقة الإدارة وتوثيق الهوية.
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="s-name">الاسم الكامل</Label>
                      <Input id="s-name" {...sellerForm.register("name")} placeholder="مثال: علي محمد" className="text-right" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="s-phone">رقم الهاتف (عراقي فقط)</Label>
                      <Input id="s-phone" {...sellerForm.register("phone")} placeholder="07xxxxxxxxx" className="text-right" dir="ltr" />
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
                      <Input id="s-password" type="password" {...sellerForm.register("password")} className="text-right" />
                    </div>

                    <div className="flex items-start gap-3 mt-4">
                      <Checkbox id="s-terms" checked={sellerForm.watch("agreeTerms")} onCheckedChange={(c) => sellerForm.setValue("agreeTerms", c as boolean)} />
                      <Label htmlFor="s-terms" className="text-xs leading-tight text-muted-foreground">
                        أوافق على <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-semibold">الشروط والأحكام</a> و<a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-semibold">سياسة الخصوصية</a>. رقم هاتفي سيبقى سرياً ولن يظهر للمشترين إلا بموافقتي أو عند الضرورة القصوى.
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
