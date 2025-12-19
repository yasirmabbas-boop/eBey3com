import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { PRODUCTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Tag, ChevronLeft, ChevronRight, Gavel, Search, Zap, LayoutGrid } from "lucide-react";
import heroBg from "@assets/generated_images/hero_background_abstract.png";

const ADS = [
  {
    id: 1,
    title: "استكشف عالم الساعات",
    description: "مجموعة نادرة من الساعات الفاخرة والكلاسيكية بانتظارك",
    image: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&h=400&fit=crop",
    badgeText: "قسم مميز",
    buttonText: "تصفح الساعات",
    link: "/search?c=watches",
    color: "bg-blue-900"
  },
  {
    id: 2,
    title: "عالم الإلكترونيات",
    description: "أحدث الأجهزة وأفضل العروض التقنية في مكان واحد",
    image: "https://images.unsplash.com/photo-1498049860654-af1a5c5668ba?w=800&h=400&fit=crop",
    badgeText: "تكنولوجيا",
    buttonText: "تصفح الإلكترونيات",
    link: "/search?c=electronics",
    color: "bg-purple-900"
  },
  {
    id: 3,
    title: "اكتشف المزيد",
    description: "تحف، مقتنيات، ملابس، وكل ما هو فريد ومميز",
    image: "https://images.unsplash.com/photo-1555529733-0e670560f7e1?w=800&h=400&fit=crop",
    badgeText: "منوعات",
    buttonText: "تصفح الكل",
    link: "/search",
    color: "bg-amber-800"
  },
  {
    id: 4,
    title: "كيف تجد أفضل الصفقات؟",
    description: "نصائح وإرشادات للحصول على أفضل الأسعار في المزادات",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?w=800&h=400&fit=crop",
    badgeText: "دليل المشتري",
    buttonText: "تعلم المزيد",
    link: "/help",
    color: "bg-green-800"
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
      <section className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="relative overflow-hidden rounded-2xl shadow-xl h-[400px]">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
              <img 
                src={currentAd.image} 
                alt={currentAd.title}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className={`absolute inset-0 opacity-90 ${currentAd.color} mix-blend-multiply transition-colors duration-500`}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-center items-start px-8 md:px-16 text-white max-w-3xl">
              <Badge className="mb-4 bg-white/20 hover:bg-white/30 text-white border-none px-4 py-1 text-sm backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                {currentAd.badgeText}
              </Badge>
              <h2 className="text-4xl md:text-6xl font-bold mb-4 leading-tight animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                {currentAd.title}
              </h2>
              <p className="text-lg md:text-xl opacity-90 mb-8 max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                {currentAd.description}
              </p>
              <Link href={currentAd.link}>
                <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 font-bold px-8 h-12 text-lg animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
                  {currentAd.buttonText}
                </Button>
              </Link>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={prevAd}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors backdrop-blur-sm border border-white/10"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
            <button
              onClick={nextAd}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors backdrop-blur-sm border border-white/10"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>

            {/* Indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {ADS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentAdIndex(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentAdIndex ? "bg-white w-8" : "bg-white/40 w-2 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative h-[300px] w-full overflow-hidden bg-primary">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        
        <div className="container mx-auto px-4 relative h-full flex flex-col justify-center items-center text-center text-white">
          <Badge className="mb-4 bg-accent text-white hover:bg-accent/90 border-none px-4 py-1 text-md">
            سوق العراق الأول
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
             مزادات <span className="text-accent">النوادر والمميز</span>
          </h1>
          <p className="text-lg opacity-90 mb-6 max-w-xl">
            سجل الآن وابدأ المزايدة على آلاف المنتجات المميزة
          </p>
          <div className="flex gap-4">
            <Link href="/live-auction">
              <Button size="lg" className="bg-accent text-white hover:bg-accent/90 font-bold px-8 h-12 text-lg flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                شارك في المزاد
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center text-primary flex items-center justify-center gap-2">
            <LayoutGrid className="h-6 w-6" />
            تصفح الأقسام
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "ساعات فاخرة", icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
              { name: "ملابس كلاسيكية", icon: Tag, color: "text-purple-600", bg: "bg-purple-50" },
              { name: "إلكترونيات", icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
              { name: "تحف وفنون", icon: Search, color: "text-rose-600", bg: "bg-rose-50" }
            ].map((cat, i) => (
              <div key={i} className="group cursor-pointer bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-primary text-center">
                <div className={`h-16 w-16 ${cat.bg} rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <cat.icon className={`h-8 w-8 ${cat.color}`} />
                </div>
                <h3 className="font-bold text-lg text-gray-800">{cat.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-2xl font-bold text-primary">وصل حديثاً</h2>
            <Link href="/search" className="text-accent hover:underline font-medium">عرض الكل</Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {PRODUCTS.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-gray-200">
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
      <section className="py-12 bg-white border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-8 text-primary">لماذا تختار E-بيع؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="text-xl font-bold mb-2">موثوق وآمن</h3>
              <p className="opacity-80 text-gray-600">جميع البائعين يتم التحقق من هوياتهم لضمان تجربة شراء آمنة.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="text-xl font-bold mb-2">خصوصية تامة</h3>
              <p className="opacity-80 text-gray-600">بياناتك الشخصية وأرقام هواتفك محمية ومشفرة.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="text-xl font-bold mb-2">دعم محلي</h3>
              <p className="opacity-80 text-gray-600">فريق دعم عراقي جاهز لمساعدتك في أي وقت.</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
