import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Package } from "lucide-react";

type LabelSize = "a6" | "thermal-100" | "thermal-80";

const LABEL_SIZES: Record<LabelSize, { width: string; height: string; label: string }> = {
  "a6": { width: "105mm", height: "148mm", label: "A6 (105×148mm)" },
  "thermal-100": { width: "100mm", height: "150mm", label: "Thermal 100×150mm" },
  "thermal-80": { width: "80mm", height: "120mm", label: "Thermal 80×120mm" },
};

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
    shippingCost?: number;
  };
  isReturn?: boolean; // For return shipment labels with swapped addresses
}

export function ShippingLabel({ open, onOpenChange, orderDetails, isReturn = false }: ShippingLabelProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [labelSize, setLabelSize] = useState<LabelSize>("a6");

  const sizeConfig = LABEL_SIZES[labelSize];
  const isCompact = labelSize === "thermal-80";
  const totalCOD = orderDetails.price + (orderDetails.shippingCost || 0);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const headerFontSize = isCompact ? "16px" : "20px";
    const codFontSize = isCompact ? "20px" : "24px";
    const basePadding = isCompact ? "2mm" : "3mm";
    const innerPadding = isCompact ? "6px" : "10px";

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${isReturn ? "إيصال إرجاع" : "إيصال توصيل"} - ${orderDetails.orderId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: ${sizeConfig.width} ${sizeConfig.height}; margin: 0; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #fff; direction: rtl;
            width: ${sizeConfig.width}; height: ${sizeConfig.height};
          }
          .label-container { width: ${sizeConfig.width}; height: ${sizeConfig.height}; padding: ${basePadding}; position: relative; }
          .label { border: 2px solid #000; height: 100%; padding: ${innerPadding}; display: flex; flex-direction: column; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: ${isCompact ? "6px" : "10px"}; margin-bottom: ${isCompact ? "6px" : "10px"}; }
          .header-left { text-align: right; }
          .header-left h1 { font-size: ${headerFontSize}; font-weight: 900; margin-bottom: 2px; }
          .header-left .subtitle { font-size: ${isCompact ? "8px" : "10px"}; color: #666; text-transform: uppercase; letter-spacing: 2px; }
          .header-left .date { font-size: ${isCompact ? "8px" : "9px"}; color: #999; margin-top: 3px; }
          .cod-badge { border: 2px solid #000; padding: 3px 8px; font-weight: bold; font-size: ${isCompact ? "13px" : "16px"}; text-align: center; }
          .cod-badge span { display: block; font-size: ${isCompact ? "7px" : "8px"}; font-weight: normal; }
          .barcode-section { text-align: center; margin: ${isCompact ? "4px 0" : "8px 0"}; }
          .addresses { display: flex; gap: ${isCompact ? "4px" : "8px"}; flex: 1; margin-bottom: ${isCompact ? "4px" : "8px"}; }
          .address-box { flex: 1; border: 1px solid #ccc; border-radius: 6px; padding: ${isCompact ? "4px" : "8px"}; }
          .address-box.buyer { border: 2px solid #000; background: #f9f9f9; }
          .address-header { display: flex; align-items: center; gap: 5px; font-weight: bold; font-size: ${isCompact ? "9px" : "11px"}; padding-bottom: ${isCompact ? "3px" : "5px"}; border-bottom: 1px solid #ddd; margin-bottom: ${isCompact ? "3px" : "5px"}; }
          .address-content { font-size: ${isCompact ? "8px" : "10px"}; line-height: 1.4; }
          .address-content .name { font-weight: bold; font-size: ${isCompact ? "10px" : "12px"}; margin-bottom: 3px; }
          .address-content .phone { font-weight: 600; direction: ltr; text-align: left; }
          .cod-amount { background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 6px; padding: ${isCompact ? "6px" : "10px"}; text-align: center; margin-bottom: ${isCompact ? "4px" : "8px"}; }
          .cod-amount .label-text { font-size: ${isCompact ? "8px" : "9px"}; color: #92400E; margin-bottom: 3px; }
          .cod-amount .amount { font-size: ${codFontSize}; font-weight: 900; color: #78350F; }
          .cod-amount .breakdown { font-size: ${isCompact ? "7px" : "8px"}; color: #92400E; margin-top: 2px; }
          .footer-section { display: flex; justify-content: space-between; align-items: flex-end; }
          .product-info { flex: 1; }
          .product-info .label-text { font-size: ${isCompact ? "7px" : "8px"}; color: #999; }
          .product-info .title { font-size: ${isCompact ? "8px" : "10px"}; font-weight: 500; }
          .product-info .weight { font-size: ${isCompact ? "7px" : "8px"}; color: #666; }
          .qr-code { margin-right: ${isCompact ? "5px" : "10px"}; }
          .company-footer { text-align: center; font-size: ${isCompact ? "7px" : "8px"}; color: #999; padding-top: ${isCompact ? "3px" : "5px"}; border-top: 1px solid #eee; margin-top: ${isCompact ? "3px" : "5px"}; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `;

    // Use a hidden iframe instead of window.open to avoid Capacitor navigation issues
    const existingFrame = document.getElementById("print-frame") as HTMLIFrameElement | null;
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "print-frame";
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Wait for content to render, then trigger print dialog
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (_) {
        // Fallback: use main window print
        window.print();
      }
      // Clean up iframe after printing
      setTimeout(() => {
        iframe.remove();
      }, 1000);
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
    cod: totalCOD,
    d: formatDate(orderDetails.saleDate)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 flex flex-col max-h-[90vh]" dir="rtl">
        <DialogHeader className="p-4 pb-0 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className={`h-5 w-5 ${isReturn ? 'text-red-600' : 'text-blue-600'}`} />
            {isReturn ? "إيصال الإرجاع" : "إيصال التوصيل"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 bg-gray-100 overflow-y-auto flex-1 min-h-0">
          <div ref={printRef}>
            <div className="label-container mx-auto" style={{ width: "100%", maxWidth: "340px", aspectRatio: `${parseInt(sizeConfig.width)} / ${parseInt(sizeConfig.height)}`, padding: isCompact ? "2mm" : "3mm" }}>
              <div className="label bg-white border-2 border-black h-full flex flex-col" style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif", padding: isCompact ? "6px" : "12px" }}>
                
                <div className="header flex justify-between items-start border-b-2 border-black pb-2 mb-2">
                  <div className="header-left text-right">
                    <h1 className="text-xl font-black">{isReturn ? "إيصال إرجاع" : "إيصال توصيل"}</h1>
                    <div className="text-[10px] text-gray-600 uppercase tracking-widest">{isReturn ? "RETURN LABEL" : "SHIPPING LABEL"}</div>
                    <div className="text-[9px] text-gray-400 mt-1">{formatDate(orderDetails.saleDate)}</div>
                  </div>
                  {isReturn ? (
                    <div className="cod-badge border-2 border-red-600 bg-red-50 px-2 py-1 text-center">
                      <div className="font-bold text-lg text-red-600">إرجاع</div>
                      <span className="text-[8px] text-red-500">RETURN</span>
                    </div>
                  ) : (
                    <div className="cod-badge border-2 border-black px-2 py-1 text-center">
                      <div className="font-bold text-lg">COD</div>
                      <span className="text-[8px]">الدفع عند الاستلام</span>
                    </div>
                  )}
                </div>

                <div className="barcode-section text-center my-1">
                  <Barcode
                    value={orderDetails.orderId}
                    width={isCompact ? 1.2 : 1.5}
                    height={isCompact ? 30 : 40}
                    fontSize={isCompact ? 8 : 10}
                    displayValue={true}
                    background="transparent"
                    margin={0}
                  />
                </div>

                <div className="addresses flex gap-2 flex-1 mb-2">
                  {isReturn ? (
                    <>
                      {/* Return: Buyer is sender (from) */}
                      <div className="address-box flex-1 border border-gray-300 rounded-md p-2">
                        <div className="address-header flex items-center gap-1 font-bold text-[11px] pb-1 border-b border-gray-200 mb-1">
                          <span>📦</span>
                          <span>من: المشتري</span>
                        </div>
                        <div className="address-content text-[10px] leading-relaxed">
                          <div className="name font-bold text-xs mb-1">{orderDetails.buyerName}</div>
                          <div className="text-gray-600">{orderDetails.city}</div>
                          {orderDetails.district && <div className="text-gray-500 text-[9px]">{orderDetails.district}</div>}
                          <div className="text-gray-500 text-[9px]">{orderDetails.deliveryAddress}</div>
                          <div className="phone font-semibold mt-1" dir="ltr">{orderDetails.buyerPhone}</div>
                        </div>
                      </div>
                      
                      {/* Return: Seller is receiver (to) */}
                      <div className="address-box buyer flex-1 border-2 border-red-600 rounded-md p-2 bg-red-50">
                        <div className="address-header flex items-center gap-1 font-bold text-[11px] pb-1 border-b border-red-200 mb-1">
                          <span>🏠</span>
                          <span>إلى: البائع</span>
                        </div>
                        <div className="address-content text-[10px] leading-relaxed">
                          <div className="name font-bold text-sm mb-1">{orderDetails.sellerName}</div>
                          <div className="text-gray-700">{orderDetails.sellerCity}</div>
                          {orderDetails.sellerAddress && <div className="text-gray-600 text-[9px]">{orderDetails.sellerAddress}</div>}
                          <div className="phone font-bold mt-1" dir="ltr">{orderDetails.sellerPhone}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Standard: Seller is sender (from) */}
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
                      
                      {/* Standard: Buyer is receiver (to) */}
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
                    </>
                  )}
                </div>

                {isReturn ? (
                  <div className="cod-amount bg-gray-100 border-2 border-gray-400 rounded-md p-2 text-center mb-2">
                    <div className="label-text text-[9px] text-gray-600 mb-1">طلب إرجاع - لا يوجد مبلغ للتحصيل</div>
                    <div className="amount text-lg font-bold text-gray-700">
                      إرجاع بدون رسوم
                    </div>
                  </div>
                ) : (
                  <div className="cod-amount bg-amber-100 border-2 border-amber-500 rounded-md p-2 text-center mb-2">
                    <div className="label-text text-[9px] text-amber-700 mb-1">المبلغ المطلوب (الدفع عند الاستلام)</div>
                    <div className={`amount font-black text-amber-900 ${isCompact ? 'text-xl' : 'text-2xl'}`}>
                      {formatPrice(totalCOD)} د.ع
                    </div>
                    {!isReturn && orderDetails.shippingCost != null && orderDetails.shippingCost > 0 && (
                      <div className="breakdown text-[8px] text-amber-700 mt-1">
                        سعر المنتج: {formatPrice(orderDetails.price)} | الشحن: {formatPrice(orderDetails.shippingCost)}
                      </div>
                    )}
                  </div>
                )}

                <div className="footer-section flex justify-between items-end">
                  <div className="product-info flex-1">
                    <div className={`label-text text-gray-400 ${isCompact ? 'text-[7px]' : 'text-[8px]'}`}>المحتويات:</div>
                    <div className={`title font-medium ${isCompact ? 'text-[8px]' : 'text-[10px]'}`}>{orderDetails.productTitle}</div>
                    {orderDetails.weight && <div className={`weight text-gray-500 ${isCompact ? 'text-[7px]' : 'text-[8px]'}`}>الوزن: {orderDetails.weight}</div>}
                  </div>
                  <div className={`qr-code ${isCompact ? 'mr-1' : 'mr-2'}`}>
                    <QRCodeSVG value={qrData} size={isCompact ? 38 : 50} level="M" />
                  </div>
                </div>

                <div className="company-footer text-center text-[8px] text-gray-400 pt-1 border-t border-gray-200 mt-1">
                  اي بيع | www.ebey3.com | منصة المزادات العراقية
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t space-y-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">حجم الإيصال:</span>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value as LabelSize)}
              className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white"
            >
              {Object.entries(LABEL_SIZES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
