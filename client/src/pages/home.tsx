import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { PRODUCTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Tag, ChevronLeft, ChevronRight, Gavel } from "lucide-react";
import heroBg from "@assets/generated_images/hero_background_abstract.png";

const ADS = [
  {
    id: 1,
    title: "مزاد - ساعة ذهبية فينتاج",
    description: "ابدأ المزايدة الآن على ساعة نادرة",
    image: PRODUCTS[0].image,
    badgeText: "مزاد حي",
    buttonText: "خلي سومتك",
    isAuction: true,
  },
  {
    id: 2,
    title: "مزاد - جاكيت جلد قديم",
    description: "تنتهي المزايدة خلال 5 ساعات",
    image: PRODUCTS[1].image,
    badgeText: "ينتهي قريباً",
    buttonText: "خلي سومتك",
    isAuction: true,
  },
  {
    id: 3,
    title: "مزاد - ساعة أوميغا نادرة",
    description: "المزاد الحصري لأندر الساعات",
    image: PRODUCTS[2].image,
    badgeText: "مزاد حي",
    buttonText: "شاهد المزاد",
    isAuction: true,
  },
];

export default function Home() {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const currentAd = ADS[currentAdIndex];

  const nextAd = () => {
    setCurrentAdIndex((prev) => (prev + 1) % ADS.length);
  };

  const prevAd = () => {
    setCurrentAdIndex((prev) => (prev - 1 + ADS.length) % ADS.length);
  };

  return (
    <Layout>
      {/* Sliding Ads Section */}
      <section className="py-8 bg-gray-50 border-b">
        <div className="container mx-auto px-4">
          <div className="relative flex items-center justify-center gap-4">
            <button
              onClick={prevAd}
              className="absolute right-0 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5 text-primary" />
            </button>

            <div className="w-full max-w-3xl">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* Image */}
                  <div className="relative h-64 md:h-80 overflow-hidden bg-gray-200">
                    <img 
                      src={currentAd.image} 
                      alt={currentAd.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-red-600 text-white border-0 flex items-center gap-1">
                        <Gavel className="h-3 w-3" />
                        {currentAd.badgeText}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentAd.title}</h3>
                      <p className="text-gray-600 text-lg mb-6">{currentAd.description}</p>
                      <div className="text-sm text-gray-500 mb-4">
                        💰 السعر الحالي: <span className="font-bold text-primary">85,000 د.ع</span>
                      </div>
                    </div>
                    <Button className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 flex items-center gap-2 justify-center">
                      <Gavel className="h-5 w-5" />
                      {currentAd.buttonText}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={nextAd}
              className="absolute left-0 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5 text-primary" />
            </button>
          </div>

          {/* Indicator Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {ADS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentAdIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentAdIndex ? "bg-primary w-8" : "bg-gray-300 w-2"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

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
            مزادات <br/>
            <span className="text-accent">النوادر والمميز</span>
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8 max-w-xl">
            ابحث عن ساعات نادرة، ملابس فينتاج، ومقتنيات فريدة عبر مزادات حية آمنة. 
            سجل الآن وابدأ المزايدة.
          </p>
          <div className="flex gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-accent text-white hover:bg-accent/90 font-bold px-8 h-12 text-lg flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                شارك في المزاد
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20 h-12 text-lg backdrop-blur-sm">
                أضف منتجاً للمزاد
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
          <h2 className="text-2xl font-bold mb-8">لماذا تختار E-بيع؟</h2>
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
