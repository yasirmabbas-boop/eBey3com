import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Instagram, Download, Share2, Loader2 } from "lucide-react";

interface InstagramShareCardProps {
  product: {
    id: string;
    title: string;
    price: number;
    currentBid?: number;
    saleType?: string;
    images: string[];
  };
}

export function InstagramShareCard({ product }: InstagramShareCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { language } = useLanguage();

  const displayPrice = product.currentBid || product.price;
  const isAuction = product.saleType === "auction";
  const shortUrl = `ebey3.com/p/${product.id.slice(0, 8)}`;

  const generateCard = async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    setIsGenerating(true);

    try {
      const width = 1080;
      const height = 1350;
      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      if (product.images?.[0]) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = product.images[0];
        });

        const imgSize = Math.min(width, height - 300);
        const imgX = (width - imgSize) / 2;
        const imgY = 40;
        
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgSize, imgSize, 20);
        ctx.clip();
        
        const scale = Math.max(imgSize / img.width, imgSize / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = imgX + (imgSize - scaledWidth) / 2;
        const offsetY = imgY + (imgSize - scaledHeight) / 2;
        
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        ctx.restore();
      }

      const saleTypeY = 1080;
      const saleTypeText = isAuction ? "🔨 مزاد" : "🛒 شراء الآن";
      ctx.fillStyle = isAuction ? "#dc2626" : "#16a34a";
      ctx.beginPath();
      ctx.roundRect(40, saleTypeY - 45, width - 80, 70, 15);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 42px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(saleTypeText, width / 2, saleTypeY);

      const priceY = 1160;
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.roundRect(40, priceY - 35, width - 80, 60, 15);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const priceText = `${displayPrice.toLocaleString()} د.ع`;
      ctx.fillText(priceText, width / 2, priceY);

      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 48px Arial, sans-serif";
      ctx.textAlign = "center";
      const title = product.title.length > 35 ? product.title.slice(0, 35) + "..." : product.title;
      ctx.fillText(title, width / 2, 1240);

      ctx.fillStyle = "#6b7280";
      ctx.font = "32px Arial, sans-serif";
      ctx.fillText(shortUrl, width / 2, 1290);

      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 36px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("E-بيع", width / 2, 1330);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png", 1);
      });
    } catch (error) {
      console.error("Error generating card:", error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const blob = await generateCard();
    if (!blob) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "فشل في إنشاء الصورة" : "Failed to generate image",
        variant: "destructive",
      });
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ebey3-${product.id.slice(0, 8)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: language === "ar" ? "تم التحميل!" : "Downloaded!",
      description: language === "ar" ? "يمكنك الآن مشاركة الصورة على Instagram" : "You can now share the image on Instagram",
    });
  };

  const handleShare = async () => {
    const blob = await generateCard();
    if (!blob) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "فشل في إنشاء الصورة" : "Failed to generate image",
        variant: "destructive",
      });
      return;
    }

    const file = new File([blob], `ebey3-${product.id.slice(0, 8)}.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: product.title,
          text: `${product.title} - ${displayPrice.toLocaleString()} د.ع`,
          files: [file],
        });
        toast({
          title: language === "ar" ? "تمت المشاركة!" : "Shared!",
        });
      } catch (error: any) {
        if (error.name !== "AbortError") {
          handleDownload();
        }
      }
    } else {
      handleDownload();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
        onClick={() => setIsOpen(true)}
        data-testid="button-instagram-share"
      >
        <Instagram className="h-4 w-4 ml-1" />
        {language === "ar" ? "شارك على Instagram" : "Share to Instagram"}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {language === "ar" ? "مشاركة على Instagram" : "Share to Instagram"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <div className="relative aspect-[4/5] bg-white rounded-lg overflow-hidden shadow-lg mx-auto max-w-[200px]">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-3/4 object-cover"
                  />
                ) : (
                  <div className="w-full h-3/4 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
                <div className="absolute bottom-16 left-2 right-2">
                  <div className={`${isAuction ? "bg-red-600" : "bg-primary"} text-white text-xs py-1 px-2 rounded font-bold text-center`}>
                    {displayPrice.toLocaleString()} د.ع
                  </div>
                </div>
                <div className="h-1/4 flex flex-col items-center justify-center p-2">
                  <p className="text-xs font-medium line-clamp-1">{product.title}</p>
                  <p className="text-[10px] text-gray-500">{shortUrl}</p>
                  <p className="text-xs font-bold text-primary mt-1">E-بيع</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {language === "ar" ? "معاينة الصورة" : "Image preview"}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={handleShare}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Share2 className="h-4 w-4 ml-2" />
                )}
                {language === "ar" ? "مشاركة مباشرة" : "Share Directly"}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              {language === "ar" 
                ? "الصورة تتضمن رابط المنتج للوصول السريع" 
                : "Image includes product link for quick access"}
            </p>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
}
