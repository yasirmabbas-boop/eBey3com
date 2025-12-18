import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  Phone,
} from "lucide-react";

const PURCHASES = [
  {
    id: 1,
    title: "ساعة أوميغا سيماستر أصلية",
    price: 380000,
    image: "https://images.unsplash.com/photo-1523170335684-f42f53bba104?w=500&h=500&fit=crop",
    status: "delivered",
    orderDate: "2025-12-10",
    deliveredDate: "2025-12-18",
    seller: "أحمد العراقي",
    sellerPhone: "07771234567",
    trackingNumber: "IRQ-2025-123456",
    tracking: [
      { status: "تم التأكيد", date: "2025-12-10", time: "14:30", completed: true },
      { status: "قيد التجهيز", date: "2025-12-11", time: "09:15", completed: true },
      { status: "في الطريق", date: "2025-12-12", time: "16:45", completed: true },
      { status: "تم التسليم", date: "2025-12-18", time: "11:20", completed: true },
    ],
    location: "بغداد، العراق",
  },
  {
    id: 2,
    title: "جاكيت جلد إيطالي فينتاج",
    price: 95000,
    image: "https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=500&h=500&fit=crop",
    status: "in_transit",
    orderDate: "2025-12-15",
    seller: "فاطمة الموصلية",
    sellerPhone: "07771234568",
    trackingNumber: "IRQ-2025-123457",
    tracking: [
      { status: "تم التأكيد", date: "2025-12-15", time: "10:30", completed: true },
      { status: "قيد التجهيز", date: "2025-12-16", time: "08:15", completed: true },
      { status: "في الطريق", date: "2025-12-17", time: "14:00", completed: true },
      { status: "سيصل قريباً", date: "2025-12-19", time: "--", completed: false },
    ],
    location: "الموصل، العراق",
  },
  {
    id: 3,
    title: "ساعة رولكس ذهبية كلاسيكية",
    price: 520000,
    image: "https://images.unsplash.com/photo-1579836343264-8b5a5bac4fdf?w=500&h=500&fit=crop",
    status: "processing",
    orderDate: "2025-12-17",
    seller: "محمود البصري",
    sellerPhone: "07771234569",
    trackingNumber: "IRQ-2025-123458",
    tracking: [
      { status: "تم التأكيد", date: "2025-12-17", time: "15:45", completed: true },
      { status: "قيد التجهيز", date: "2025-12-18", time: "10:00", completed: true },
      { status: "في الطريق", date: "--", time: "--", completed: false },
      { status: "قيد الانتظار", date: "--", time: "--", completed: false },
    ],
    location: "البصرة، العراق",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "delivered":
      return (
        <Badge className="bg-green-100 text-green-800 border-0">
          <CheckCircle className="h-3 w-3 ml-1" />
          تم التسليم
        </Badge>
      );
    case "in_transit":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-0">
          <Truck className="h-3 w-3 ml-1" />
          قيد التوصيل
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-0">
          <Clock className="h-3 w-3 ml-1" />
          قيد التجهيز
        </Badge>
      );
    default:
      return null;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "delivered":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "in_transit":
      return <Truck className="h-5 w-5 text-blue-600" />;
    case "processing":
      return <Clock className="h-5 w-5 text-yellow-600" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-600" />;
  }
};

export default function MyPurchases() {
  const [selectedOrder, setSelectedOrder] = useState(PURCHASES[0]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">🛍️ مشترياتي</h1>
          <p className="text-gray-600">تتبع طلباتك وتسليماتك</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Orders List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold text-lg">طلباتي</h3>
            {PURCHASES.map((purchase) => (
              <Card
                key={purchase.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedOrder.id === purchase.id
                    ? "ring-2 ring-primary border-primary"
                    : ""
                }`}
                onClick={() => setSelectedOrder(purchase)}
              >
                <div className="flex gap-3">
                  <img
                    src={purchase.image}
                    alt={purchase.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm line-clamp-2">
                      {purchase.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {purchase.price.toLocaleString()} د.ع
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(purchase.status)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Order Details and Tracking */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Header */}
            <Card className="p-6 border-2 border-primary">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedOrder.title}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    الطلب رقم: {selectedOrder.trackingNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedOrder.status)}
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">السعر</p>
                  <p className="font-bold text-lg">
                    {selectedOrder.price.toLocaleString()}
                    <span className="text-sm ml-1">د.ع</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">تاريخ الطلب</p>
                  <p className="font-semibold text-sm">{selectedOrder.orderDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">الموقع</p>
                  <p className="font-semibold text-sm flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {selectedOrder.location}
                  </p>
                </div>
                {selectedOrder.status === "delivered" && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">تاريخ التسليم</p>
                    <p className="font-semibold text-sm text-green-600">
                      {selectedOrder.deliveredDate}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Seller Info */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="font-bold text-lg mb-4">معلومات البائع</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600">اسم البائع</p>
                  <p className="font-semibold text-lg">{selectedOrder.seller}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-600">رقم الاتصال</p>
                    <p className="font-semibold text-sm">{selectedOrder.sellerPhone}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Tracking Timeline */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                تتبع الشحنة
              </h3>

              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                {/* Timeline Items */}
                <div className="space-y-6">
                  {selectedOrder.tracking.map((step, index) => (
                    <div key={index} className="relative pr-20">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute right-0 top-1 w-4 h-4 rounded-full border-2 ${
                          step.completed
                            ? "bg-green-600 border-green-600"
                            : "bg-white border-gray-300"
                        }`}
                      ></div>

                      {/* Timeline Content */}
                      <div
                        className={`pb-4 ${
                          step.completed
                            ? "text-gray-900 font-semibold"
                            : "text-gray-600"
                        }`}
                      >
                        <p className="font-bold text-sm">{step.status}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {step.date === "--" ? "قريباً" : step.date}
                          {step.time !== "--" && ` - ${step.time}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button className="flex-1 bg-primary hover:bg-primary/90">
                تواصل مع البائع
              </Button>
              <Button variant="outline" className="flex-1">
                طلب استرجاع
              </Button>
              <Button variant="outline" className="flex-1">
                اترك تقييم
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
