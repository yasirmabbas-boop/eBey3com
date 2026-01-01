import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Package, MapPin, User, Calendar } from "lucide-react";
import { useRef } from "react";

interface OrderDetails {
  orderId: string;
  buyerName: string;
  deliveryAddress: string;
  district?: string;
  city: string;
  sellerName: string;
  sellerCity: string;
  productCode: string;
  productTitle: string;
  paymentMethod: string;
  price: number;
  saleDate: Date;
}

interface ShippingLabelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderDetails: OrderDetails;
}

export function ShippingLabel({ open, onOpenChange, orderDetails }: ShippingLabelProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContent = printRef.current;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>بطاقة الشحن - ${orderDetails.orderId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, sans-serif;
            padding: 20px;
            direction: rtl;
          }
          .label {
            border: 3px solid #000;
            padding: 20px;
            max-width: 400px;
            margin: 0 auto;
            border-radius: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 15px;
            margin-bottom: 15px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
          }
          .logo .e { color: #2563EB; }
          .logo .dash { color: #EAB308; }
          .logo .b { color: #DC2626; }
          .logo .y { color: #16A34A; }
          .logo .a { color: #2563EB; }
          .order-id {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }
          .section {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #ddd;
          }
          .section-title {
            font-size: 11px;
            color: #999;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .to-section {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
          }
          .to-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
          }
          .to-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .address {
            font-size: 14px;
            line-height: 1.6;
          }
          .city {
            font-size: 16px;
            font-weight: bold;
            color: #2563EB;
            margin-top: 5px;
          }
          .from-section {
            font-size: 13px;
          }
          .from-name {
            font-weight: bold;
          }
          .product-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .product-code {
            font-family: monospace;
            font-size: 16px;
            font-weight: bold;
            background: #000;
            color: #fff;
            padding: 5px 10px;
            border-radius: 4px;
          }
          .product-title {
            font-size: 14px;
            flex: 1;
            margin-left: 10px;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #999;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px dashed #000;
          }
          .barcode {
            text-align: center;
            margin: 15px 0;
            font-family: monospace;
            font-size: 24px;
            letter-spacing: 5px;
          }
          .payment-badge {
            display: inline-block;
            background: #16A34A;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
          }
          .date {
            font-size: 12px;
            color: #666;
          }
          @media print {
            body { padding: 0; }
            .label { border-width: 2px; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ar-IQ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ar-IQ").format(price) + " د.ع";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            بطاقة الشحن
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <div className="label border-2 border-black p-5 rounded-lg bg-white">
            <div className="header text-center border-b-2 border-dashed border-black pb-4 mb-4">
              <div className="logo text-2xl font-bold mb-1">
                <span className="e text-blue-600">E</span>
                <span className="dash text-yellow-500">-</span>
                <span className="b text-red-600">ب</span>
                <span className="y text-green-600">ي</span>
                <span className="a text-blue-600">ع</span>
              </div>
              <div className="order-id text-sm text-gray-500">
                رقم الطلب: {orderDetails.orderId}
              </div>
            </div>

            <div className="section mb-4 pb-4 border-b border-gray-200">
              <div className="section-title text-xs text-gray-500 font-bold mb-2">إلى</div>
              <div className="to-section bg-gray-100 p-4 rounded-lg">
                <div className="to-name text-xl font-bold mb-2 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {orderDetails.buyerName}
                </div>
                <div className="address text-sm leading-relaxed">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                    <div>
                      <div>{orderDetails.deliveryAddress}</div>
                      {orderDetails.district && <div>{orderDetails.district}</div>}
                    </div>
                  </div>
                </div>
                <div className="city text-lg font-bold text-blue-600 mt-2">
                  {orderDetails.city}
                </div>
              </div>
            </div>

            <div className="section mb-4 pb-4 border-b border-gray-200">
              <div className="section-title text-xs text-gray-500 font-bold mb-2">من</div>
              <div className="from-section text-sm">
                <div className="from-name font-bold">{orderDetails.sellerName}</div>
                <div className="text-gray-600">{orderDetails.sellerCity}</div>
              </div>
            </div>

            <div className="section mb-4 pb-4 border-b border-gray-200">
              <div className="section-title text-xs text-gray-500 font-bold mb-2">المنتج</div>
              <div className="product-info flex justify-between items-center">
                <div className="product-code bg-black text-white px-3 py-1 rounded font-mono text-sm">
                  {orderDetails.productCode}
                </div>
                <div className="product-title flex-1 mr-3 text-sm">
                  {orderDetails.productTitle}
                </div>
              </div>
            </div>

            <div className="section flex justify-between items-center">
              <div>
                <div className="payment-badge bg-green-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                  {orderDetails.paymentMethod === "cash" ? "الدفع عند الاستلام" : orderDetails.paymentMethod}
                </div>
                <div className="text-lg font-bold mt-2">{formatPrice(orderDetails.price)}</div>
              </div>
              <div className="date text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(orderDetails.saleDate)}
              </div>
            </div>

            <div className="barcode text-center my-4 font-mono text-2xl tracking-widest">
              ||||| {orderDetails.orderId.slice(-8).toUpperCase()} |||||
            </div>

            <div className="footer text-center text-xs text-gray-400 pt-4 border-t-2 border-dashed border-black">
              شكراً لاستخدام E-بيع - منصة المزادات العراقية
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button 
            onClick={handlePrint}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-6"
            data-testid="button-print-label"
          >
            <Printer className="h-5 w-5 ml-2" />
            طباعة بطاقة الشحن
          </Button>
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-label"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
