import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { PRODUCTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, ShieldCheck, Heart, Share2, Star, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AIAssistant } from "@/components/ai-assistant";
import { BiddingWindow } from "@/components/bidding-window";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const SIMILAR_PRODUCTS = Array.from({ length: 20 }).map((_, i) => ({
  id: `sim-${i}`,
  title: `منتج مشابه مميز ${i + 1}`,
  price: 50000 + (i * 25000),
  rating: (3 + Math.random() * 2).toFixed(1),
  bids: Math.floor(Math.random() * 50) + 5,
  timeLeft: `${Math.floor(Math.random() * 24) + 1} ساعة`,
  image: `https://images.unsplash.com/photo-${1500000000000 + (i * 1000)}?w=400&h=400&fit=crop`
}));

export default function ProductPage() {
  const [match, params] = useRoute("/product/:id");
  const { toast } = useToast();
  
  const product = PRODUCTS.find(p => p.id === params?.id) || PRODUCTS[0];

  const handleBid = () => {
    toast({
      title: "تم إضافة مزايدة!",
      description: "ستتم معالجة مزايدتك قريباً.",
    });
  };

  const handleAddCart = () => {
    toast({
      title: "تم الإضافة للسلة",
      description: "يمكنك الاستمرار في التصفح أو الذهاب للسلة.",
    });
  };

  const handleAddWishlist = () => {
    toast({
      title: "تم الإضافة للقائمة المفضلة",
      description: "يمكنك عرض المفضلة من إعداداتك.",
    });
  };

  const handleBuyNowDirect = () => {
    toast({
      title: "تم إضافة الطلب!",
      description: "ستنتقل إلى صفحة الدفع قريباً.",
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
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex text-yellow-400">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                    </div>
                    <span className="text-sm text-gray-600 font-bold">(5.0)</span>
                    <span className="text-xs text-gray-500">- 124 تقييم</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-red-500"
                    onClick={handleAddWishlist}
                    data-testid="button-add-wishlist"
                  >
                    <Heart className="h-6 w-6" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground"
                    data-testid="button-share"
                  >
                    <Share2 className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Registration Warning - Simulated Logic */}
            {product.currentBid && (
               <div className="mb-4 text-center">
                  <p className="text-xs text-red-500 mb-2 font-semibold">يجب عليك تسجيل الدخول للمزايدة أو الشراء</p>
               </div>
            )}

            {product.currentBid ? (
              <BiddingWindow
                currentBid={product.currentBid}
                totalBids={product.totalBids || 0}
                minimumBid={(product.currentBid || 0) + 5000}
                timeLeft={product.timeLeft}
                onBidSubmit={handleBid}
              />
            ) : (
              <div className="bg-muted/30 p-6 rounded-xl border mb-6">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-sm text-muted-foreground mb-1">السعر:</span>
                  <span className="text-4xl font-bold text-primary">
                    {(product.currentBid || product.price).toLocaleString()} <span className="text-lg">د.ع</span>
                  </span>
                </div>
                <Button 
                  size="lg" 
                  className="w-full text-lg h-12 bg-accent hover:bg-accent/90 text-white font-bold mt-4"
                  onClick={handleBuyNowDirect}
                  data-testid="button-buy-now-fixed"
                >
                  شراء الآن
                </Button>
              </div>
            )}

            {/* Cash Payment Note */}
            <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4 flex items-start gap-2 text-sm text-green-900">
              <Banknote className="h-5 w-5 shrink-0 text-green-700" />
              <p>
                <strong>ملاحظة:</strong> الدفع حالياً نقداً عند الاستلام فقط (Cash on Delivery).
                خدمة الدفع بالبطاقات ستتوفر قريباً.
              </p>
            </div>

            {/* Buy Now Option - Optional for Sellers */}
            <div className="bg-green-50 border-2 border-green-200 p-6 rounded-xl mb-6">
              <div className="flex items-end gap-2 mb-2">
                <span className="text-sm text-green-700 font-semibold mb-1">🛒 شراء فوري (اختياري):</span>
                <span className="text-3xl font-bold text-green-600">
                  450,000 <span className="text-lg">د.ع</span>
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-3">شراء مباشر بدون انتظار نتيجة المزاد</p>
              <Button 
                size="lg" 
                className="w-full text-lg h-12 bg-green-600 hover:bg-green-700 text-white font-bold"
                onClick={handleBuyNowDirect}
                data-testid="button-buy-now-direct"
              >
                🛒 اشتر الآن مباشرة
              </Button>
            </div>

            <Button 
              variant="outline" 
              size="lg" 
              className="w-full h-12 mb-6" 
              onClick={handleAddCart}
              data-testid="button-add-cart"
            >
              أضف للسلة
            </Button>

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
                  {product.description || "هذا النص هو مثال لنص يمكن أن يستبدل في نفس المساحة، لقد تم توليد هذا النص من مولد النص العربى، حيث يمكنك أن تولد مثل هذا النص أو العديد من النصوص الأخرى إضافة إلى زيادة عدد الحروف التى يولدها التطبيق."}
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

      {/* Similar Suggestions Slider */}
      <section className="bg-gray-50 py-12 border-t">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-primary mb-8 text-center">قد يعجبك أيضاً</h2>
          <Carousel 
            opts={{
              align: "start",
              direction: "rtl",
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {SIMILAR_PRODUCTS.map((item) => (
                <CarouselItem key={item.id} className="pl-4 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border aspect-square flex flex-col">
                    <div className="relative h-2/3 bg-gray-200">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-black/50 hover:bg-black/60 border-0 backdrop-blur-sm">
                        ينتهي: {item.timeLeft}
                      </Badge>
                    </div>
                    <div className="p-3 flex flex-col justify-between flex-1">
                      <div>
                        <h3 className="font-bold text-sm line-clamp-1 mb-1">{item.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-yellow-500 mb-2">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="font-medium text-gray-700">{item.rating}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-gray-500">السعر الحالي</p>
                          <p className="font-bold text-primary">{item.price.toLocaleString()} د.ع</p>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="font-bold text-gray-900">{item.bids}</span>
                          مزايدة
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex left-0" />
            <CarouselNext className="hidden md:flex right-0" />
          </Carousel>
        </div>
      </section>

      {/* AI Assistant */}
      <AIAssistant 
        productTitle={product.title} 
        productDescription={product.description || "منتج مميز"} 
      />
    </Layout>
  );
}
