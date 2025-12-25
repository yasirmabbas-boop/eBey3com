import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";

export default function CartPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { 
    cartItems, 
    totalItems, 
    totalPrice, 
    isLoading, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    isUpdating,
    isRemoving,
    isClearing 
  } = useCart();

  const formatPrice = (price: number) => {
    return price.toLocaleString("ar-IQ") + " د.ع";
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-2">سلة التسوق</h1>
            <p className="text-gray-600 mb-6">يجب عليك تسجيل الدخول لعرض سلة التسوق</p>
            <Link href="/signin">
              <Button data-testid="button-signin">تسجيل الدخول</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="mr-2">جاري التحميل...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold mb-2">سلة التسوق فارغة</h1>
            <p className="text-gray-600 mb-6">لم تضف أي منتجات إلى سلة التسوق بعد</p>
            <Link href="/search">
              <Button data-testid="button-browse-products">
                <ArrowLeft className="h-4 w-4 ml-2" />
                تصفح المنتجات
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            سلة التسوق
            <span className="text-sm font-normal text-gray-500">({totalItems} منتج)</span>
          </h1>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => clearCart()}
            disabled={isClearing}
            data-testid="button-clear-cart"
          >
            {isClearing ? (
              <Loader2 className="h-4 w-4 animate-spin ml-1" />
            ) : (
              <Trash2 className="h-4 w-4 ml-1" />
            )}
            إفراغ السلة
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id} className="p-4" data-testid={`cart-item-${item.id}`}>
                <div className="flex gap-4">
                  <Link href={`/product/${item.listingId}`}>
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                      {item.listing?.images?.[0] ? (
                        <img 
                          src={item.listing.images[0]} 
                          alt={item.listing?.title || "منتج"} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                          style={{ imageRendering: "auto" }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ShoppingCart className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.listingId}`}>
                      <h3 className="font-semibold text-lg truncate hover:text-primary transition-colors" data-testid={`cart-item-title-${item.id}`}>
                        {item.listing?.title || "منتج غير متاح"}
                      </h3>
                    </Link>
                    
                    {item.listing && !item.listing.isActive && (
                      <p className="text-red-500 text-sm mt-1">هذا المنتج لم يعد متاحاً</p>
                    )}
                    
                    <p className="text-sm text-gray-500 mt-1">
                      البائع: {item.listing?.sellerName || "غير معروف"}
                    </p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity({ id: item.id, quantity: item.quantity - 1 })}
                          disabled={isUpdating || item.quantity <= 1}
                          data-testid={`button-decrease-${item.id}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium" data-testid={`cart-item-quantity-${item.id}`}>{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity({ id: item.id, quantity: item.quantity + 1 })}
                          disabled={isUpdating || (item.listing?.quantityAvailable !== undefined && item.quantity >= item.listing.quantityAvailable)}
                          data-testid={`button-increase-${item.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-primary" data-testid={`cart-item-price-${item.id}`}>
                          {formatPrice(item.priceSnapshot * item.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeFromCart(item.id)}
                          disabled={isRemoving}
                          data-testid={`button-remove-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4">ملخص الطلب</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">المجموع الفرعي ({totalItems} منتج)</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">التوصيل</span>
                  <span className="text-green-600">سيتم تحديده لاحقاً</span>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between text-lg font-bold mb-6">
                <span>المجموع</span>
                <span className="text-primary" data-testid="cart-total">{formatPrice(totalPrice)}</span>
              </div>
              
              <Button 
                className="w-full h-12 text-lg font-bold" 
                onClick={() => navigate("/checkout")}
                data-testid="button-checkout"
              >
                إتمام الشراء
              </Button>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                الدفع نقداً عند الاستلام
              </p>
              
              <Link href="/search">
                <Button variant="outline" className="w-full mt-3" data-testid="button-continue-shopping">
                  <ArrowLeft className="h-4 w-4 ml-2" />
                  متابعة التسوق
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
