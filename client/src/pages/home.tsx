import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { PRODUCTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Tag, X } from "lucide-react";
import heroBg from "@assets/generated_images/hero_background_abstract.png";

export default function Home() {
  const [showAd1, setShowAd1] = useState(true);
  const [showAd2, setShowAd2] = useState(true);

  return (
    <Layout>
      {/* Floating Ad 1 - Top Right */}
      {showAd1 && (
        <div className="fixed top-24 left-4 z-40 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-64 relative">
            <button
              onClick={() => setShowAd1(false)}
              className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 h-32 rounded-lg mb-3 flex items-center justify-center text-white font-bold text-xl">
              عرض خاص
            </div>
            <h3 className="font-bold text-lg mb-2">خصم 30% على الساعات</h3>
            <p className="text-sm text-muted-foreground mb-3">استمتع بأفضل العروض على المقتنيات النادرة</p>
            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-sm">
              تصفح الآن
            </Button>
          </div>
        </div>
      )}

      {/* Floating Ad 2 - Bottom Left */}
      {showAd2 && (
        <div className="fixed bottom-24 right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-64 relative">
            <button
              onClick={() => setShowAd2(false)}
              className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 h-32 rounded-lg mb-3 flex items-center justify-center text-white font-bold text-xl">
              بدون عمولة
            </div>
            <h3 className="font-bold text-lg mb-2">ابدأ البيع مجاناً</h3>
            <p className="text-sm text-muted-foreground mb-3">لا توجد رسوم على أول 10 منتجات</p>
            <Button className="w-full bg-accent hover:bg-accent/90 text-white font-bold text-sm">
              اعرض سلعتك
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative h-[400px] md:h-[500px] w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-teal-900/80 to-transparent" />
        
        <div className="container mx-auto px-4 relative h-full flex flex-col justify-center items-start text-white">
          <Badge className="mb-4 bg-accent text-white hover:bg-accent/90 border-none px-4 py-1 text-md">
            سوق العراق الأول
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 max-w-2xl leading-tight">
            بيع وشراء <br/>
            <span className="text-accent">النوادر والمميز</span>
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8 max-w-xl">
            اكتشف ساعات نادرة، ملابس فينتاج، ومقتنيات فريدة. 
            سجل الآن وابدأ البيع والشراء بأمان.
          </p>
          <div className="flex gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-accent text-white hover:bg-accent/90 font-bold px-8 h-12 text-lg">
                ابدأ التصفح
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20 h-12 text-lg backdrop-blur-sm">
                اعرض سلعتك
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center text-primary">تصفح الأقسام</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["ساعات فاخرة", "ملابس كلاسيكية", "إلكترونيات", "تحف وفنون"].map((cat, i) => (
              <div key={i} className="group cursor-pointer bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-border hover:border-primary text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <Tag className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-lg">{cat}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-2xl font-bold text-primary">وصل حديثاً</h2>
            <Link href="/search" className="text-accent hover:underline font-medium">عرض الكل</Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRODUCTS.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-muted">
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <img 
                      src={product.image} 
                      alt={product.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.currentBid && (
                      <Badge className="absolute top-2 right-2 bg-primary text-white">
                        مزاد
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">{product.category}</div>
                    <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                      {product.title}
                    </h3>
                    <div className="flex justify-between items-center mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">السعر الحالي</p>
                        <p className="font-bold text-xl text-primary">
                          {product.currentBid ? product.currentBid.toLocaleString() : product.price.toLocaleString()} د.ع
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  {product.timeLeft && (
                    <CardFooter className="px-4 py-2 bg-red-50 text-red-600 text-xs font-medium flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      ينتهي خلال {product.timeLeft}
                    </CardFooter>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="py-12 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-8">لماذا تختار اي بيع؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-4">
              <h3 className="text-xl font-bold mb-2">موثوق وآمن</h3>
              <p className="opacity-80">جميع البائعين يتم التحقق من هوياتهم لضمان تجربة شراء آمنة.</p>
            </div>
            <div className="p-4">
              <h3 className="text-xl font-bold mb-2">خصوصية تامة</h3>
              <p className="opacity-80">بياناتك الشخصية وأرقام هواتفك محمية ومشفرة.</p>
            </div>
            <div className="p-4">
              <h3 className="text-xl font-bold mb-2">دعم محلي</h3>
              <p className="opacity-80">فريق دعم عراقي جاهز لمساعدتك في أي وقت.</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
