import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Package } from "lucide-react";

interface ShippingLabelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderDetails: {
    orderId: string;
    buyerName: string;
    buyerPhone: string;
    deliveryAddress: string;
    city: string;
    district?: string;
    sellerName: string;
    sellerPhone: string;
    sellerCity: string;
    sellerAddress?: string;
    productTitle: string;
    productCode: string;
    price: number;
    paymentMethod: string;
    saleDate: Date;
    weight?: string;
  };
}

export function ShippingLabel({ open, onOpenChange, orderDetails }: ShippingLabelProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=420,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>إيصال توصيل - ${orderDetails.orderId}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          @page {
            size: 105mm 148mm;
            margin: 0;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #fff;
            direction: rtl;
            width: 105mm;
            height: 148mm;
          }
          .label-container {
            width: 105mm;
            height: 148mm;
            padding: 3mm;
            position: relative;
          }
          .label {
            border: 2px solid #000;
            height: 100%;
            padding: 10px;
            display: flex;
            flex-direction: column;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header-left {
            text-align: right;
          }
          .header-left h1 {
            font-size: 20px;
            font-weight: 900;
            margin-bottom: 2px;
          }
          .header-left .subtitle {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .header-left .date {
            font-size: 9px;
            color: #999;
            margin-top: 3px;
          }
          .cod-badge {
            border: 2px solid #000;
            padding: 3px 8px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
          }
          .cod-badge span {
            display: block;
            font-size: 8px;
            font-weight: normal;
          }
          .barcode-section {
            text-align: center;
            margin: 8px 0;
          }
          .addresses {
            display: flex;
            gap: 8px;
            flex: 1;
            margin-bottom: 8px;
          }
          .address-box {
            flex: 1;
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 8px;
          }
          .address-box.buyer {
            border: 2px solid #000;
            background: #f9f9f9;
          }
          .address-header {
            display: flex;
            align-items: center;
            gap: 5px;
            font-weight: bold;
            font-size: 11px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ddd;
            margin-bottom: 5px;
          }
          .address-content {
            font-size: 10px;
            line-height: 1.4;
          }
          .address-content .name {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 3px;
          }
          .address-content .phone {
            font-weight: 600;
            direction: ltr;
            text-align: left;
          }
          .cod-amount {
            background: #FEF3C7;
            border: 2px solid #F59E0B;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
            margin-bottom: 8px;
          }
          .cod-amount .label-text {
            font-size: 9px;
            color: #92400E;
            margin-bottom: 3px;
          }
          .cod-amount .amount {
            font-size: 24px;
            font-weight: 900;
            color: #78350F;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .product-info {
            flex: 1;
          }
          .product-info .label-text {
            font-size: 8px;
            color: #999;
          }
          .product-info .title {
            font-size: 10px;
            font-weight: 500;
          }
          .product-info .weight {
            font-size: 8px;
            color: #666;
          }
          .qr-code {
            margin-right: 10px;
          }
          .company-footer {
            text-align: center;
            font-size: 8px;
            color: #999;
            padding-top: 5px;
            border-top: 1px solid #eee;
            margin-top: 5px;
          }
          @media print {
            body { 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
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
    }, 500);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ar-IQ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ar-IQ").format(price);
  };

  const qrData = JSON.stringify({
    id: orderDetails.orderId,
    cod: orderDetails.price,
    d: formatDate(orderDetails.saleDate)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            إيصال التوصيل
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 bg-gray-100">
          <div ref={printRef}>
            <div className="label-container" style={{ width: "105mm", height: "148mm", padding: "3mm" }}>
              <div className="label bg-white border-2 border-black h-full p-3 flex flex-col" style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
                
                <div className="header flex justify-between items-start border-b-2 border-black pb-2 mb-2">
                  <div className="header-left text-right">
                    <h1 className="text-xl font-black">إيصال توصيل</h1>
                    <div className="text-[10px] text-gray-600 uppercase tracking-widest">SHIPPING LABEL</div>
                    <div className="text-[9px] text-gray-400 mt-1">{formatDate(orderDetails.saleDate)}</div>
                  </div>
                  <div className="cod-badge border-2 border-black px-2 py-1 text-center">
                    <div className="font-bold text-lg">COD</div>
                    <span className="text-[8px]">الدفع عند الاستلام</span>
                  </div>
                </div>

                <div className="barcode-section text-center my-2">
                  <Barcode 
                    value={orderDetails.orderId} 
                    width={1.5} 
                    height={40} 
                    fontSize={10} 
                    displayValue={true} 
                    background="transparent"
                    margin={0}
                  />
                </div>

                <div className="addresses flex gap-2 flex-1 mb-2">
                  <div className="address-box flex-1 border border-gray-300 rounded-md p-2">
                    <div className="address-header flex items-center gap-1 font-bold text-[11px] pb-1 border-b border-gray-200 mb-1">
                      <span>📦</span>
                      <span>من: البائع</span>
                    </div>
                    <div className="address-content text-[10px] leading-relaxed">
                      <div className="name font-bold text-xs mb-1">{orderDetails.sellerName}</div>
                      <div className="text-gray-600">{orderDetails.sellerCity}</div>
                      {orderDetails.sellerAddress && <div className="text-gray-500 text-[9px]">{orderDetails.sellerAddress}</div>}
                      <div className="phone font-semibold mt-1" dir="ltr">{orderDetails.sellerPhone}</div>
                    </div>
                  </div>
                  
                  <div className="address-box buyer flex-1 border-2 border-black rounded-md p-2 bg-gray-50">
                    <div className="address-header flex items-center gap-1 font-bold text-[11px] pb-1 border-b border-gray-400 mb-1">
                      <span>🏠</span>
                      <span>إلى: المشتري</span>
                    </div>
                    <div className="address-content text-[10px] leading-relaxed">
                      <div className="name font-bold text-sm mb-1">{orderDetails.buyerName}</div>
                      <div className="text-gray-700">{orderDetails.city}</div>
                      {orderDetails.district && <div className="text-gray-600">{orderDetails.district}</div>}
                      <div className="text-gray-500 text-[9px]">{orderDetails.deliveryAddress}</div>
                      <div className="phone font-bold mt-1" dir="ltr">{orderDetails.buyerPhone}</div>
                    </div>
                  </div>
                </div>

                <div className="cod-amount bg-amber-100 border-2 border-amber-500 rounded-md p-3 text-center mb-2">
                  <div className="label-text text-[9px] text-amber-700 mb-1">المبلغ المطلوب (الدفع عند الاستلام)</div>
                  <div className="amount text-2xl font-black text-amber-900">
                    {formatPrice(orderDetails.price)} د.ع
                  </div>
                </div>

                <div className="footer-section flex justify-between items-end">
                  <div className="product-info flex-1">
                    <div className="label-text text-[8px] text-gray-400">المحتويات:</div>
                    <div className="title text-[10px] font-medium">{orderDetails.productTitle}</div>
                    {orderDetails.weight && <div className="weight text-[8px] text-gray-500">الوزن: {orderDetails.weight}</div>}
                  </div>
                  <div className="qr-code mr-2">
                    <QRCodeSVG value={qrData} size={50} level="M" />
                  </div>
                </div>

                <div className="company-footer text-center text-[8px] text-gray-400 pt-1 border-t border-gray-200 mt-1">
                  E-بيع | www.ebey3.com | منصة المزادات العراقية
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t">
          <Button 
            onClick={handlePrint}
            className="flex-1 bg-black hover:bg-gray-800 text-white font-bold py-6"
            data-testid="button-print-label"
          >
            <Printer className="h-5 w-5 ml-2" />
            طباعة الإيصال
          </Button>
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-4"
            data-testid="button-close-label"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
