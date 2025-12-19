import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShippingLabel } from "@/components/shipping-label";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  Printer,
  DollarSign,
  User,
} from "lucide-react";

const SALES = [
  {
    id: 1,
    title: "ساعة سيكو فينتاج 1970",
    price: 280000,
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&h=500&fit=crop",
    status: "sold",
    orderDate: "2025-12-15",
    buyer: {
      name: "علي محمد",
      phone: "07801234567",
      address: "بغداد، حي المنصور، شارع 14 رمضان",
      district: "بغداد - الكرخ",
    },
    orderId: "ORD-ABC123",
    productCode: "P-SW-001",
  },
  {
    id: 2,
    title: "ساعة كاسيو جي شوك",
    price: 75000,
    image: "https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=500&h=500&fit=crop",
    status: "pending_shipment",
    orderDate: "2025-12-18",
    buyer: {
      name: "فاطمة أحمد",
      phone: "07701234567",
      address: "البصرة، حي الجزائر، قرب مجمع البصرة",
      district: "البصرة",
    },
    orderId: "ORD-DEF456",
    productCode: "P-SW-002",
  },
  {
    id: 3,
    title: "لابتوب ماك بوك برو 2020",
    price: 850000,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop",
    status: "in_auction",
    orderDate: "2025-12-19",
    buyer: null,
    orderId: null,
    productCode: "P-EL-003",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "sold":
      return (
        <Badge className="bg-green-100 text-green-800 border-0">
          <CheckCircle className="h-3 w-3 ml-1" />
          تم البيع - جاهز للشحن
        </Badge>
      );
    case "pending_shipment":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-0">
          <Clock className="h-3 w-3 ml-1" />
          بانتظار الشحن
        </Badge>
      );
    case "shipped":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-0">
          <Truck className="h-3 w-3 ml-1" />
          تم الشحن
        </Badge>
      );
    case "in_auction":
      return (
        <Badge className="bg-purple-100 text-purple-800 border-0">
          <Clock className="h-3 w-3 ml-1" />
          في المزاد
        </Badge>
      );
    default:
      return null;
  }
};

export default function MySales() {
  const [selectedSale, setSelectedSale] = useState(SALES[0]);
  const [showShippingLabel, setShowShippingLabel] = useState(false);

  const completedSales = SALES.filter(s => s.status === "sold" || s.status === "pending_shipment" || s.status === "shipped");
  const activeSales = SALES.filter(s => s.status === "in_auction");

  const canPrintShippingLabel = selectedSale.status === "sold" || selectedSale.status === "pending_shipment";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">📦 مبيعاتي</h1>
          <p className="text-gray-600">إدارة طلباتك وطباعة بطاقات الشحن</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                المبيعات المكتملة ({completedSales.length})
              </h3>
              <div className="space-y-3">
                {completedSales.map((sale) => (
                  <Card
                    key={sale.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                      selectedSale.id === sale.id
                        ? "ring-2 ring-primary border-primary"
                        : ""
                    }`}
                    onClick={() => setSelectedSale(sale)}
                  >
                    <div className="flex gap-3">
                      <img
                        src={sale.image}
                        alt={sale.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm line-clamp-2">
                          {sale.title}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {sale.price.toLocaleString()} د.ع
                        </p>
                        <div className="mt-2">
                          {getStatusBadge(sale.status)}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {activeSales.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  في المزاد ({activeSales.length})
                </h3>
                <div className="space-y-3">
                  {activeSales.map((sale) => (
                    <Card
                      key={sale.id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-lg opacity-60 ${
                        selectedSale.id === sale.id
                          ? "ring-2 ring-primary border-primary opacity-100"
                          : ""
                      }`}
                      onClick={() => setSelectedSale(sale)}
                    >
                      <div className="flex gap-3">
                        <img
                          src={sale.image}
                          alt={sale.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm line-clamp-2">
                            {sale.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            يبدأ من {sale.price.toLocaleString()} د.ع
                          </p>
                          <div className="mt-2">
                            {getStatusBadge(sale.status)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 border-2 border-primary">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedSale.title}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    كود المنتج: {selectedSale.productCode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedSale.status)}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">السعر</p>
                  <p className="font-bold text-lg text-green-600">
                    {selectedSale.price.toLocaleString()}
                    <span className="text-sm ml-1">د.ع</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">تاريخ البيع</p>
                  <p className="font-semibold text-sm">{selectedSale.orderDate}</p>
                </div>
                {selectedSale.orderId && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">رقم الطلب</p>
                    <p className="font-semibold text-sm">{selectedSale.orderId}</p>
                  </div>
                )}
              </div>
            </Card>

            {selectedSale.buyer ? (
              <>
                <Card className="p-6 bg-blue-50 border-blue-200">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    معلومات المشتري
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">اسم المشتري</p>
                      <p className="font-semibold text-lg">{selectedSale.buyer.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">المحافظة</p>
                      <p className="font-semibold text-sm">{selectedSale.buyer.district}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-600">العنوان الكامل</p>
                      <p className="font-semibold text-sm flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {selectedSale.buyer.address}
                      </p>
                    </div>
                  </div>
                </Card>

                {canPrintShippingLabel && (
                  <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-green-800 text-lg mb-1 flex items-center gap-2">
                          <Printer className="h-5 w-5" />
                          بطاقة الشحن جاهزة
                        </h3>
                        <p className="text-sm text-green-700">
                          اطبع بطاقة الشحن وألصقها على الطرد قبل إرساله للمشتري
                        </p>
                      </div>
                      <Button 
                        onClick={() => setShowShippingLabel(true)}
                        className="bg-green-600 hover:bg-green-700 text-white gap-2 text-lg px-6 py-3 h-auto"
                        data-testid="button-print-shipping-label"
                      >
                        <Printer className="h-5 w-5" />
                        طباعة بطاقة الشحن
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-6 bg-gray-50 border-gray-200">
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-bold text-lg text-gray-600 mb-2">
                    لم يتم البيع بعد
                  </h3>
                  <p className="text-gray-500">
                    هذا المنتج لا يزال في المزاد. ستظهر معلومات المشتري وخيار طباعة بطاقة الشحن بعد إتمام عملية البيع.
                  </p>
                </div>
              </Card>
            )}

            {selectedSale.buyer && (
              <div className="flex gap-2">
                <Button className="flex-1 bg-primary hover:bg-primary/90">
                  تواصل مع المشتري
                </Button>
                <Button variant="outline" className="flex-1">
                  تأكيد الشحن
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedSale.buyer && (
        <ShippingLabel
          open={showShippingLabel}
          onOpenChange={setShowShippingLabel}
          orderDetails={{
            orderId: selectedSale.orderId || "",
            productTitle: selectedSale.title,
            productCode: selectedSale.productCode,
            sellerName: "أحمد العراقي",
            sellerCity: "بغداد",
            buyerName: selectedSale.buyer.name,
            buyerPhone: selectedSale.buyer.phone,
            deliveryAddress: selectedSale.buyer.address,
            city: selectedSale.buyer.district,
            district: selectedSale.buyer.district,
            price: selectedSale.price,
            saleDate: new Date(selectedSale.orderDate),
            paymentMethod: "الدفع عند الاستلام",
          }}
        />
      )}
    </Layout>
  );
}
