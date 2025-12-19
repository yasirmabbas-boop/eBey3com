import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Camera, Upload, X, Image as ImageIcon, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PRODUCTS } from "@/lib/mock-data";

interface ImageSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageSearchModal({ open, onOpenChange }: ImageSearchModalProps) {
  const [, setLocation] = useLocation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof PRODUCTS | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setSearchResults(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setSearchResults(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const performSearch = useCallback(async () => {
    if (!selectedImage) return;
    
    setIsSearching(true);
    
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const shuffled = [...PRODUCTS].sort(() => Math.random() - 0.5);
    const results = shuffled.slice(0, Math.min(6, shuffled.length));
    
    setSearchResults(results);
    setIsSearching(false);
  }, [selectedImage]);

  const handleViewResult = (productId: string) => {
    onOpenChange(false);
    setLocation(`/product/${productId}`);
  };

  const handleClear = () => {
    setSelectedImage(null);
    setSearchResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ar-IQ").format(price) + " د.ع";
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClear();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Camera className="h-6 w-6 text-blue-600" />
            البحث بالصورة
          </DialogTitle>
          <DialogDescription>
            ارفع صورة للمنتج الذي تبحث عنه وسنجد لك منتجات مشابهة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!selectedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all group"
              data-testid="image-dropzone"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Upload className="h-10 w-10 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-700">اسحب الصورة هنا</p>
                  <p className="text-sm text-gray-500 mt-1">أو اضغط لاختيار صورة من جهازك</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <ImageIcon className="h-4 w-4" />
                  <span>JPG, PNG, WEBP - حتى 10 ميجابايت</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="image-input"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={selectedImage}
                  alt="الصورة المحددة"
                  className="w-full h-64 object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-3 left-3 rounded-full"
                  onClick={handleClear}
                  data-testid="button-clear-image"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {!searchResults && (
                <Button
                  onClick={performSearch}
                  disabled={isSearching}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-bold"
                  data-testid="button-search-image"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin ml-2" />
                      جاري البحث عن منتجات مشابهة...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5 ml-2" />
                      البحث عن منتجات مشابهة
                    </>
                  )}
                </Button>
              )}

              {searchResults && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">نتائج البحث ({searchResults.length})</h3>
                    <Button variant="outline" size="sm" onClick={handleClear} data-testid="button-new-search">
                      بحث جديد
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {searchResults.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleViewResult(product.id)}
                        className="bg-white rounded-lg border overflow-hidden cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all group"
                        data-testid={`search-result-${product.id}`}
                      >
                        <div className="aspect-square overflow-hidden bg-gray-100">
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-sm line-clamp-2 mb-2">{product.title}</p>
                          <p className="text-blue-600 font-bold text-sm">
                            {formatPrice(product.currentBid || product.price)}
                          </p>
                          {product.saleType === "auction" && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              مزاد
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {searchResults.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>لم نجد منتجات مشابهة</p>
                      <p className="text-sm">جرب صورة مختلفة</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
