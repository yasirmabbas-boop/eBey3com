import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Clock, ShieldCheck, Heart, Share2, Star, Banknote, Truck, RotateCcw, Tag, Printer, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { BiddingWindow } from "@/components/bidding-window";
import { SellerTrustBadge } from "@/components/seller-trust-badge";
import { ContactSeller } from "@/components/contact-seller";
import type { Listing } from "@shared/schema";

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
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const { addToCart, isAdding } = useCart();
  const queryClient = useQueryClient();

  // Offer dialog state
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (data: { listingId: string; offerAmount: number; message?: string }) => {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل في إرسال العرض");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إرسال العرض",
        description: "سيتم إعلامك عندما يرد البائع على عرضك",
      });
      setOfferDialogOpen(false);
      setOfferAmount("");
      setOfferMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: listing, isLoading, error } = useQuery<Listing>({
    queryKey: ["/api/listings", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${params?.id}`);
      if (!res.ok) throw new Error("Listing not found");
      return res.json();
    },
    enabled: !!params?.id,
  });
  
  // Fetch seller data to get real rating info
  const { data: sellerData } = useQuery({
    queryKey: ["/api/users", listing?.sellerId],
    queryFn: async () => {
      if (!listing?.sellerId) return null;
      const res = await fetch(`/api/users/${listing.sellerId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!listing?.sellerId,
  });

  const product = listing ? {
    id: listing.id,
    productCode: (listing as any).productCode || `P-${listing.id.slice(0, 6)}`,
    title: listing.title,
    price: listing.price,
    currentBid: listing.currentBid || undefined,
    totalBids: (listing as any).totalBids || 0,
    image: listing.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    images: listing.images || [],
    saleType: listing.saleType as "auction" | "fixed",
    timeLeft: listing.timeLeft || undefined,
    auctionEndTime: listing.auctionEndTime,
    seller: { 
      name: listing.sellerName, 
      salesCount: sellerData?.totalSales || 0, 
      rating: sellerData?.rating || 0, 
      ratingCount: sellerData?.ratingCount || 0 
    },
    sellerName: listing.sellerName,
    sellerId: listing.sellerId,
    sellerTotalSales: sellerData?.totalSales || 0,
    sellerRating: sellerData?.rating || 0,
    sellerRatingCount: sellerData?.ratingCount || 0,
    category: listing.category,
    condition: listing.condition as "New" | "Used - Like New" | "Used - Good" | "Vintage",
    brand: (listing as any).brand || null,
    deliveryWindow: listing.deliveryWindow,
    returnPolicy: listing.returnPolicy,
    city: listing.city,
    description: listing.description,
    isNegotiable: (listing as any).isNegotiable || false,
    quantityAvailable: (listing as any).quantityAvailable || 1,
    quantitySold: (listing as any).quantitySold || 0,
  } : null;

  const requireAuth = (action: string) => {
    if (!isAuthenticated) {
      toast({
        title: "يرجى تسجيل الدخول",
        description: "يجب عليك تسجيل الدخول للمتابعة",
        variant: "destructive",
      });
      navigate(`/register?redirect=${encodeURIComponent(`/product/${params?.id}`)}&action=${action}`);
      return false;
    }
    return true;
  };

  const handleAddCart = async () => {
    if (!requireAuth("cart")) return;
    if (!listing) return;
    
    if (listing.saleType === "auction") {
      toast({
        title: "غير متاح",
        description: "لا يمكن إضافة منتجات المزاد إلى السلة",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await addToCart({ listingId: listing.id, quantity: 1 });
      toast({
        title: "تم الإضافة للسلة",
        description: "يمكنك الاستمرار في التصفح أو الذهاب للسلة.",
      });
    } catch (error: any) {
      toast({
        title: "حدث خطأ",
        description: error.message || "فشل في إضافة المنتج للسلة",
        variant: "destructive",
      });
    }
  };

  const handleAddWishlist = () => {
    if (!requireAuth("wishlist")) return;
    toast({
      title: "تم الإضافة للقائمة المفضلة",
      description: "يمكنك عرض المفضلة من إعداداتك.",
    });
  };

  const handleBuyNowDirect = () => {
    if (!requireAuth("buy")) return;
    toast({
      title: "تم إضافة الطلب!",
      description: "ستنتقل إلى صفحة الدفع قريباً.",
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-2 text-lg">جاري التحميل...</span>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">المنتج غير موجود</h2>
          <p className="text-gray-600 mb-4">عذراً، لم نتمكن من العثور على هذا المنتج.</p>
          <Button onClick={() => navigate("/")}>العودة للرئيسية</Button>
        </div>
      </Layout>
    );
  }

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
                  <div className="flex gap-2 mb-2">
                    <Badge variant="outline">{product.condition}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 ml-1" />
                      {product.productCode}
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
                  <div className="mt-2">
                    <span className="text-muted-foreground">البائع: </span>
                    <SellerTrustBadge 
                      salesCount={product.seller.salesCount}
                      rating={product.seller.rating}
                      sellerName={product.seller.name}
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {product.seller.ratingCount > 0 ? (
                      <>
                        <div className="flex text-yellow-400">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} className={`h-4 w-4 ${i <= Math.round(product.seller.rating / 20) ? 'fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600 font-bold">({(product.seller.rating / 20).toFixed(1)})</span>
                        <span className="text-xs text-gray-500">- {product.seller.salesCount} عميل</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">التقييم: غير متوفر</span>
                    )}
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

            {product.currentBid ? (
              <BiddingWindow
                listingId={params?.id || ""}
                currentBid={product.currentBid}
                totalBids={product.totalBids || 0}
                minimumBid={(product.currentBid || 0) + 5000}
                timeLeft={product.timeLeft}
                onRequireAuth={() => requireAuth("bid")}
              />
            ) : (
              <div className="bg-muted/30 p-6 rounded-xl border mb-6">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-sm text-muted-foreground mb-1">السعر:</span>
                  <span className="text-4xl font-bold text-primary">
                    {(product.currentBid || product.price).toLocaleString()} <span className="text-lg">د.ع</span>
                  </span>
                  {product.isNegotiable && (
                    <Badge variant="secondary" className="mr-2">قابل للتفاوض</Badge>
                  )}
                </div>
                
                {/* Stock availability */}
                {(() => {
                  const remainingQuantity = product.quantityAvailable - product.quantitySold;
                  const isSoldOut = remainingQuantity <= 0;
                  
                  return (
                    <>
                      <div className="text-sm mb-3">
                        {isSoldOut ? (
                          <span className="text-red-600 font-bold text-base">🚫 نفد - تم البيع</span>
                        ) : remainingQuantity > 10 ? (
                          <span className="text-green-600 font-medium">✓ في المخزون</span>
                        ) : (
                          <span className="text-amber-600 font-medium">متبقي {remainingQuantity} قطعة فقط</span>
                        )}
                      </div>
                      
                      {isSoldOut ? (
                        <div className="bg-red-100 border-2 border-red-300 p-4 rounded-xl text-center mt-4">
                          <p className="text-red-700 font-bold text-lg">هذا المنتج غير متوفر حالياً</p>
                          <p className="text-red-600 text-sm mt-1">تم بيع جميع الكميات المتاحة</p>
                        </div>
                      ) : (
                        <>
                          <Button 
                            size="lg" 
                            className="w-full text-lg h-12 bg-accent hover:bg-accent/90 text-white font-bold mt-4"
                            onClick={handleBuyNowDirect}
                            data-testid="button-buy-now-fixed"
                          >
                            شراء الآن
                          </Button>
                          
                          {/* Make an Offer button for negotiable items */}
                          {product.isNegotiable && (
                            <Button 
                              variant="outline"
                              size="lg" 
                              className="w-full text-lg h-12 mt-3 border-primary text-primary hover:bg-primary/10"
                              onClick={() => {
                                if (!requireAuth("offer")) return;
                                setOfferAmount(Math.floor(product.price * 0.9).toString());
                                setOfferDialogOpen(true);
                              }}
                              data-testid="button-make-offer"
                            >
                              قدّم عرضك
                            </Button>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
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

            {/* Buy Now Option - Only show if product is available */}
            {product && (product.quantityAvailable - product.quantitySold) > 0 && (
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
            )}

            <div className="grid grid-cols-2 gap-3 mb-6">
              {listing?.saleType !== "auction" && product && (product.quantityAvailable - product.quantitySold) > 0 && (
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="h-12" 
                  onClick={handleAddCart}
                  disabled={isAdding}
                  data-testid="button-add-cart"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      جاري الإضافة...
                    </>
                  ) : "أضف للسلة"}
                </Button>
              )}
              <ContactSeller 
                sellerName={product.seller.name}
                sellerId={listing?.sellerId || ""}
                listingId={listing?.id || ""}
                productTitle={product.title}
                productCode={product.productCode}
              />
            </div>

            {/* Seller Tools - Print Shipping Label - Only visible after purchase completion */}
            {/* This section is hidden on product pages - it will appear in the seller's 
                order management page after a buyer completes a purchase */}

            <div className="space-y-4">
              {/* Delivery & Return Policy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-4 bg-purple-50 text-purple-800 rounded-lg text-sm" data-testid="delivery-info">
                  <Truck className="h-5 w-5 mt-0.5 shrink-0 text-purple-600" />
                  <div>
                    <strong>موعد التوصيل:</strong>
                    <p className="mt-1">{product.deliveryWindow}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-orange-50 text-orange-800 rounded-lg text-sm" data-testid="return-info">
                  <RotateCcw className="h-5 w-5 mt-0.5 shrink-0 text-orange-600" />
                  <div>
                    <strong>سياسة الإرجاع:</strong>
                    <p className="mt-1">{product.returnPolicy}</p>
                  </div>
                </div>
              </div>

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
                    <span>{product.brand || "غير محدد"}</span>
                  </li>
                  <li className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">الموقع</span>
                    <span>{product.city || "غير محدد"}</span>
                  </li>
                  <li className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">الفئة</span>
                    <span>{product.category}</span>
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

      {/* Make an Offer Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تقديم عرض سعر</DialogTitle>
            <DialogDescription className="text-right">
              قدّم عرضك للبائع. السعر المطلوب: {product?.price.toLocaleString()} د.ع
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="offer-amount">عرضك (د.ع)</Label>
              <Input
                id="offer-amount"
                type="number"
                placeholder="أدخل السعر المقترح"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                className="text-left"
                dir="ltr"
                data-testid="input-offer-amount"
              />
              {offerAmount && product && (
                <p className="text-xs text-muted-foreground">
                  {parseInt(offerAmount) < product.price ? (
                    <span className="text-amber-600">
                      أقل من السعر المطلوب بـ {((1 - parseInt(offerAmount) / product.price) * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-green-600">
                      يساوي أو أعلى من السعر المطلوب
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-message">رسالة للبائع (اختياري)</Label>
              <Textarea
                id="offer-message"
                placeholder="أضف رسالة توضيحية..."
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                rows={3}
                data-testid="input-offer-message"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOfferDialogOpen(false)}
              data-testid="button-cancel-offer"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!listing?.id || !offerAmount) return;
                createOfferMutation.mutate({
                  listingId: listing.id,
                  offerAmount: parseInt(offerAmount, 10),
                  message: offerMessage || undefined,
                });
              }}
              disabled={!offerAmount || parseInt(offerAmount) <= 0 || createOfferMutation.isPending}
              data-testid="button-submit-offer"
            >
              {createOfferMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 ml-2" />
                  إرسال العرض
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </Layout>
  );
}
