import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShoppingCart, MapPin, Phone, User, Loader2, CheckCircle, ArrowRight, Plus, Store, Truck, Package } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MapPicker } from "@/components/map-picker";
import type { BuyerAddress } from "@shared/schema";

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const authToken = localStorage.getItem("authToken");
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

const IRAQI_CITIES = [
  "بغداد",
  "البصرة", 
  "الموصل",
  "أربيل",
  "النجف",
  "كربلاء",
  "السليمانية",
  "كركوك",
  "الحلة",
  "الناصرية",
  "العمارة",
  "الديوانية",
  "الكوت",
  "السماوة",
  "الرمادي",
  "تكريت",
  "بعقوبة",
  "دهوك",
];

const SHIPPING_PER_ITEM = 5000;

export default function CheckoutPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const { cartItems, totalPrice, clearCart } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isOrderComplete, setIsOrderComplete] = useState(false);

  const { data: savedAddresses = [], isLoading: isAddressesLoading } = useQuery<BuyerAddress[]>({
    queryKey: ["/api/account/addresses"],
    queryFn: async () => {
      const res = await fetch("/api/account/addresses", { 
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["/api/account/profile"],
    queryFn: async () => {
      const res = await fetch("/api/account/profile", { 
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (savedAddresses.length > 0) {
      const defaultAddress = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        fillAddressFields(defaultAddress);
      }
    } else if (userData) {
      setFullName(userData.displayName || "");
      setPhone(userData.phone || "");
      setCity(userData.city || "");
      setAddressLine1(userData.addressLine1 || "");
      setAddressLine2(userData.addressLine2 || "");
    }
  }, [savedAddresses, userData]);

  const fillAddressFields = (address: BuyerAddress) => {
    setFullName(address.recipientName);
    setPhone(address.phone);
    setCity(address.city);
    setAddressLine1(address.addressLine1);
    setAddressLine2(address.addressLine2 || "");
  };

  const handleAddressChange = (addressId: string) => {
    setSelectedAddressId(addressId);
    if (addressId === "new") {
      if (userData) {
        setFullName(userData.displayName || "");
        setPhone(userData.phone || "");
        setCity(userData.city || "");
        setAddressLine1(userData.addressLine1 || "");
        setAddressLine2(userData.addressLine2 || "");
      } else {
        setFullName("");
        setPhone("");
        setCity("");
        setAddressLine1("");
        setAddressLine2("");
      }
    } else {
      const address = savedAddresses.find(a => a.id === addressId);
      if (address) {
        fillAddressFields(address);
      }
    }
  };

  const itemsBySeller = useMemo(() => {
    const grouped = new Map<string, typeof cartItems>();
    cartItems.forEach(item => {
      const sellerId = item.listing?.sellerId || "unknown";
      if (!grouped.has(sellerId)) {
        grouped.set(sellerId, []);
      }
      grouped.get(sellerId)!.push(item);
    });
    return grouped;
  }, [cartItems]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const shippingTotal = totalItems * SHIPPING_PER_ITEM;
  const grandTotal = totalPrice + shippingTotal;

  const checkoutMutation = useMutation({
    mutationFn: async (data: {
      fullName: string;
      phone: string;
      city: string;
      addressLine1: string;
      addressLine2?: string;
      shippingCost: number;
    }) => {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل في إتمام الطلب");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Track purchase event in GTM
      if (data.transactions && Array.isArray(data.transactions)) {
        const items = data.transactions.map((transaction: any, index: number) => {
          const cartItem = cartItems[index];
          return {
            'item_name': cartItem?.listing?.title || 'Unknown Product',
            'item_id': transaction.listingId,
            'price': transaction.amount,
          };
        });

        const totalValue = data.transactions.reduce((sum: number, t: any) => sum + t.amount, 0);

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          'event': 'purchase',
          'ecommerce': {
            'transaction_id': data.transactions.map((t: any) => t.id).join(','),
            'value': totalValue,
            'currency': 'IQD',
            'items': items
          }
        });
      }
      
      setIsOrderComplete(true);
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إتمام الطلب",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: number) => {
    return price.toLocaleString("ar-IQ") + " د.ع";
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      toast({ title: "الاسم الكامل مطلوب", variant: "destructive" });
      return false;
    }
    if (!phone.trim()) {
      toast({ title: "رقم الهاتف مطلوب", variant: "destructive" });
      return false;
    }
    if (!city) {
      toast({ title: "المدينة مطلوبة", variant: "destructive" });
      return false;
    }
    if (!addressLine1.trim()) {
      toast({ title: "العنوان مطلوب", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    checkoutMutation.mutate({
      fullName: fullName.trim(),
      phone: phone.trim(),
      city,
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      shippingCost: shippingTotal,
    });
  };

  if (isAuthLoading || isUserLoading || isAddressesLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">يرجى تسجيل الدخول</h1>
          <p className="text-gray-600 mb-6">تحتاج إلى تسجيل الدخول لإتمام عملية الشراء</p>
          <Button onClick={() => navigate("/auth")}>تسجيل الدخول</Button>
        </div>
      </Layout>
    );
  }

  if (cartItems.length === 0 && !isOrderComplete) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">سلة التسوق فارغة</h1>
          <p className="text-gray-600 mb-6">أضف بعض المنتجات للمتابعة</p>
          <Button onClick={() => navigate("/search")}>تصفح المنتجات</Button>
        </div>
      </Layout>
    );
  }

  if (isOrderComplete) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-green-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="h-14 w-14 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-green-700">تم الطلب بنجاح!</h1>
            <p className="text-gray-600 mb-8">
              شكراً لتسوقك معنا. سيتواصل معك البائع قريباً لتأكيد موعد التوصيل.
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate("/my-purchases")} className="w-full" data-testid="button-view-orders">
                عرض طلباتي
              </Button>
              <Button variant="outline" onClick={() => navigate("/search")} className="w-full" data-testid="button-continue-shopping">
                متابعة التسوق
              </Button>
              <Button variant="ghost" onClick={() => navigate("/")} className="w-full" data-testid="button-home">
                العودة للرئيسية
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/cart")}>
            <ArrowRight className="h-4 w-4 ml-1" />
            العودة للسلة
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          إتمام الشراء
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Saved Addresses */}
            {savedAddresses.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  اختر عنوان التوصيل
                </h2>
                <RadioGroup value={selectedAddressId} onValueChange={handleAddressChange} className="space-y-3">
                  {savedAddresses.map((address) => (
                    <div
                      key={address.id}
                      className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAddressId === address.id ? "border-primary bg-primary/5" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleAddressChange(address.id)}
                      data-testid={`address-option-${address.id}`}
                    >
                      <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">{address.label}</span>
                          {address.isDefault && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">افتراضي</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{address.recipientName}</p>
                        <p className="text-sm text-gray-600">{address.city} - {address.addressLine1}</p>
                        <p className="text-sm text-gray-500" dir="ltr">{address.phone}</p>
                      </div>
                    </div>
                  ))}
                  <div
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedAddressId === "new" ? "border-primary bg-primary/5" : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleAddressChange("new")}
                    data-testid="address-option-new"
                  >
                    <RadioGroupItem value="new" id="new-address" />
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>إدخال عنوان جديد</span>
                    </div>
                  </div>
                </RadioGroup>
              </Card>
            )}

            {/* Address Form */}
            {(savedAddresses.length === 0 || selectedAddressId === "new") && (
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  معلومات التوصيل
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      الاسم الكامل *
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      className="mt-1"
                      data-testid="input-fullname"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      رقم الهاتف *
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XX XXX XXXX"
                      className="mt-1"
                      dir="ltr"
                      data-testid="input-phone"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">المدينة *</Label>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger className="mt-1" data-testid="select-city">
                        <SelectValue placeholder="اختر المدينة" />
                      </SelectTrigger>
                      <SelectContent>
                        {IRAQI_CITIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="address1">العنوان *</Label>
                    <Input
                      id="address1"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="المنطقة، الشارع، رقم البناية"
                      className="mt-1"
                      data-testid="input-address1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address2">تفاصيل إضافية (اختياري)</Label>
                    <Input
                      id="address2"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="رقم الشقة، علامة مميزة"
                      className="mt-1"
                      data-testid="input-address2"
                    />
                  </div>

                  <div className="pt-2">
                    <Label className="mb-2 block">تحديد الموقع على الخريطة (اختياري)</Label>
                    <MapPicker
                      value={mapLocation}
                      onChange={setMapLocation}
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Items grouped by seller */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                المنتجات في طلبك ({totalItems} منتج)
              </h2>
              
              <div className="space-y-6">
                {Array.from(itemsBySeller.entries()).map(([sellerId, items]) => (
                  <div key={sellerId} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <Store className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-700">
                        {items[0]?.listing?.sellerName || "بائع"}
                      </span>
                      <span className="text-sm text-gray-500">({items.length} منتج)</span>
                    </div>
                    
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3" data-testid={`checkout-item-${item.id}`}>
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                            {item.listing?.images?.[0] ? (
                              <img 
                                src={item.listing.images[0]} 
                                alt={item.listing?.title || "منتج"} 
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ShoppingCart className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{item.listing?.title || "منتج"}</h3>
                            <p className="text-xs text-gray-500">الكمية: {item.quantity}</p>
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-primary text-sm">
                              {formatPrice(item.priceSnapshot * item.quantity)}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              +{formatPrice(SHIPPING_PER_ITEM * item.quantity)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4">ملخص الطلب</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">المنتجات ({totalItems})</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" />
                    التوصيل ({totalItems} × {formatPrice(SHIPPING_PER_ITEM)})
                  </span>
                  <span>{formatPrice(shippingTotal)}</span>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between text-lg font-bold mb-6">
                <span>المجموع الكلي</span>
                <span className="text-primary" data-testid="checkout-total">{formatPrice(grandTotal)}</span>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
                <strong>طريقة الدفع:</strong> الدفع نقداً عند الاستلام
              </div>
              
              <Button 
                className="w-full h-12 text-lg font-bold" 
                onClick={handleSubmit}
                disabled={checkoutMutation.isPending}
                data-testid="button-confirm-order"
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin ml-2" />
                    جاري إرسال الطلب...
                  </>
                ) : (
                  "تأكيد الطلب"
                )}
              </Button>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                بالضغط على "تأكيد الطلب" فإنك توافق على شروط الخدمة
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
