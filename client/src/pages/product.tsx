import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { PRODUCTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, ShieldCheck, Heart, Share2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProductPage() {
  const [match, params] = useRoute("/product/:id");
  const { toast } = useToast();
  
  const product = PRODUCTS.find(p => p.id === params?.id) || PRODUCTS[0];

  const handleAction = () => {
    toast({
      title: "يجب تسجيل الدخول",
      description: "يرجى إنشاء حساب أو تسجيل الدخول للمتابعة.",
      variant: "destructive",
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border">
              <img 
                src={product.image} 
                alt={product.title} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border cursor-pointer hover:border-primary">
                  <img 
                    src={product.image} 
                    alt="thumbnail" 
                    className="w-full h-full object-cover opacity-70 hover:opacity-100"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="outline" className="mb-2">{product.condition}</Badge>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
                  <p className="text-muted-foreground">البائع: <span className="text-primary font-medium">أحمد العراقي</span> (موثوق)</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500">
                    <Heart className="h-6 w-6" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Share2 className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="bg-muted/30 p-6 rounded-xl border mb-6">
              <div className="flex items-end gap-2 mb-2">
                <span className="text-sm text-muted-foreground mb-1">السعر الحالي:</span>
                <span className="text-4xl font-bold text-primary">
                  {(product.currentBid || product.price).toLocaleString()} <span className="text-lg">د.ع</span>
                </span>
              </div>
              
              {product.timeLeft && (
                <div className="flex items-center gap-2 text-red-600 font-medium mb-6">
                  <Clock className="h-5 w-5" />
                  <span>ينتهي المزاد خلال: {product.timeLeft}</span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {product.currentBid ? (
                  <Button size="lg" className="w-full text-lg h-12 bg-accent hover:bg-accent/90 text-white font-bold" onClick={handleAction}>
                    ضع مزايدة ({((product.currentBid || 0) + 5000).toLocaleString()} د.ع)
                  </Button>
                ) : (
                  <Button size="lg" className="w-full text-lg h-12 bg-accent hover:bg-accent/90 text-white font-bold" onClick={handleAction}>
                    شراء الآن
                  </Button>
                )}
                <Button variant="outline" size="lg" className="w-full h-12" onClick={handleAction}>
                  أضف للسلة
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0" />
                <p>
                  <strong>حماية المشتري:</strong> أموالك محفوظة حتى تستلم المنتج وتتأكد من مطابقته للمواصفات.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-bold text-lg">الوصف</h3>
                <p className="text-gray-600 leading-relaxed">
                  هذا النص هو مثال لنص يمكن أن يستبدل في نفس المساحة، لقد تم توليد هذا النص من مولد النص العربى، حيث يمكنك أن تولد مثل هذا النص أو العديد من النصوص الأخرى إضافة إلى زيادة عدد الحروف التى يولدها التطبيق.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-lg">المواصفات</h3>
                <ul className="grid grid-cols-2 gap-2 text-sm">
                  <li className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">الحالة</span>
                    <span>{product.condition}</span>
                  </li>
                  <li className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">الماركة</span>
                    <span>غير محدد</span>
                  </li>
                  <li className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">الموقع</span>
                    <span>بغداد، الكرادة</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}
