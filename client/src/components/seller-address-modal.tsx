import { useState, useEffect, Suspense, lazy } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Plus, Check, Home, Warehouse, Store } from "lucide-react";
import type { SellerAddress } from "@shared/schema";
import { authFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Lazy load the map picker to avoid SSR issues
const LeafletMapPicker = lazy(() => 
  import("@/components/leaflet-map-picker").then(mod => ({ default: mod.LeafletMapPicker }))
);

const IRAQI_PROVINCES = [
  "بغداد", "البصرة", "أربيل", "السليمانية", "دهوك", "الموصل",
  "كركوك", "الأنبار", "بابل", "ديالى", "كربلاء", "النجف",
  "واسط", "ذي قار", "ميسان", "المثنى", "القادسية", "صلاح الدين"
];

const LABEL_OPTIONS = [
  { value: "المنزل", icon: Home, labelAr: "المنزل", labelKu: "ماڵ" },
  { value: "المستودع", icon: Warehouse, labelAr: "المستودع", labelKu: "کۆگا" },
  { value: "المحل", icon: Store, labelAr: "المحل", labelKu: "دوکان" },
];

interface SellerAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (address: SellerAddress) => void;
  forceAddNew?: boolean; // Force showing add form (for first-time sellers)
}

export function SellerAddressModal({
  open,
  onOpenChange,
  onSelect,
  forceAddNew = false,
}: SellerAddressModalProps) {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(forceAddNew);
  const [hasPrePopulated, setHasPrePopulated] = useState(false);
  const [formData, setFormData] = useState({
    label: "المنزل",
    contactName: "",
    phone: "",
    city: "",
    district: "",
    addressLine1: "",
    notes: "",
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const queryClient = useQueryClient();

  // Pre-populate form from user profile when opening for first time with no saved addresses
  useEffect(() => {
    if (open && forceAddNew && user && !hasPrePopulated) {
      setFormData(prev => ({
        ...prev,
        contactName: user.displayName || prev.contactName,
        phone: user.phone || prev.phone,
        city: user.city || prev.city,
        district: user.district || prev.district,
        addressLine1: user.addressLine1 || prev.addressLine1,
        latitude: user.locationLat || prev.latitude,
        longitude: user.locationLng || prev.longitude,
      }));
      setHasPrePopulated(true);
    }
  }, [open, forceAddNew, user, hasPrePopulated]);

  const { data: addresses, isLoading } = useQuery<SellerAddress[]>({
    queryKey: ["/api/seller/addresses"],
    queryFn: async () => {
      const res = await authFetch("/api/seller/addresses");
      if (!res.ok) throw new Error("Failed to fetch addresses");
      return res.json();
    },
    enabled: open,
  });

  const createAddressMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await authFetch("/api/seller/addresses", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل في إضافة العنوان");
      }
      return res.json();
    },
    onSuccess: (newAddress: SellerAddress) => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/addresses"] });
      setShowAddForm(false);
      setSelectedAddressId(newAddress.id);
      // Reset form
      setFormData({
        label: "المنزل",
        contactName: "",
        phone: "",
        city: "",
        district: "",
        addressLine1: "",
        notes: "",
        latitude: undefined,
        longitude: undefined,
      });
      // If this was a forced add (first time), automatically select it
      if (forceAddNew) {
        onSelect(newAddress);
        onOpenChange(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: language === "ar" ? "خطأ في حفظ العنوان" : "هەڵە لە پاشەکەوتکردنی ناونیشان",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    if (selectedAddressId && addresses) {
      const selectedAddress = addresses.find(a => a.id === selectedAddressId);
      if (selectedAddress) {
        onSelect(selectedAddress);
        onOpenChange(false);
      }
    }
  };

  const handleAddAddress = () => {
    if (!formData.contactName || !formData.phone || !formData.city || !formData.addressLine1) {
      return;
    }
    createAddressMutation.mutate(formData);
  };

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      // Optionally auto-fill address if not already filled
      addressLine1: prev.addressLine1 || address?.split(",")[0] || prev.addressLine1,
    }));
  };

  const defaultAddress = addresses?.find((a) => a.isDefault);
  
  // Auto-select default address when data loads
  if (!selectedAddressId && defaultAddress && !showAddForm) {
    setSelectedAddressId(defaultAddress.id);
  }

  // If forceAddNew and no addresses, show add form automatically
  const shouldShowAddForm = showAddForm || (forceAddNew && (!addresses || addresses.length === 0));

  const getLabelIcon = (label: string) => {
    const option = LABEL_OPTIONS.find(o => o.value === label);
    return option?.icon || MapPin;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {language === "ar" ? "موقع الاستلام" : "شوێنی وەرگرتنەوە"}
          </DialogTitle>
          <DialogDescription>
            {language === "ar" 
              ? "حدد موقع استلام المنتج للمشترين" 
              : "شوێنی وەرگرتنەوەی بەرهەم بۆ کڕیاران دیاری بکە"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !shouldShowAddForm && addresses && addresses.length > 0 ? (
          <div className="space-y-4">
            <RadioGroup
              value={selectedAddressId || ""}
              onValueChange={setSelectedAddressId}
              className="space-y-3"
            >
              {addresses.map((address) => {
                const LabelIcon = getLabelIcon(address.label);
                return (
                  <div
                    key={address.id}
                    className={`relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedAddressId === address.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedAddressId(address.id)}
                  >
                    <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <LabelIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{address.label}</span>
                        {address.isDefault && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {language === "ar" ? "افتراضي" : "بنەڕەتی"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{address.contactName}</p>
                      <p className="text-sm text-gray-600" dir="ltr">{address.phone}</p>
                      <p className="text-sm text-gray-500">
                        {address.city}
                        {address.district && ` - ${address.district}`}
                      </p>
                      <p className="text-sm text-gray-500">{address.addressLine1}</p>
                      {address.latitude && address.longitude && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {language === "ar" ? "الموقع محدد على الخريطة" : "شوێن لەسەر نەخشە دیاریکراوە"}
                        </p>
                      )}
                    </div>
                    {selectedAddressId === address.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                );
              })}
            </RadioGroup>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 ml-2" />
              {language === "ar" ? "إضافة موقع جديد" : "شوێنی نوێ زیاد بکە"}
            </Button>

            <Button
              onClick={handleConfirm}
              disabled={!selectedAddressId}
              className="w-full"
            >
              {language === "ar" ? "تأكيد واستمرار" : "دڵنیاکردنەوە و بەردەوامبوون"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses && addresses.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="mb-2"
              >
                {language === "ar" ? "← العودة للمواقع المحفوظة" : "← گەڕانەوە بۆ شوێنە پاشەکەوتکراوەکان"}
              </Button>
            )}

            {(!addresses || addresses.length === 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  {language === "ar" 
                    ? "أضف موقع الاستلام الأول الخاص بك. سيتم حفظه لاستخدامه في المنتجات المستقبلية."
                    : "یەکەم شوێنی وەرگرتنەوەت زیاد بکە. پاشەکەوت دەکرێت بۆ بەکارهێنانی داهاتوو."}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Label Selection */}
              <div>
                <Label>{language === "ar" ? "نوع الموقع" : "جۆری شوێن"}</Label>
                <div className="flex gap-2 mt-2">
                  {LABEL_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant={formData.label === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, label: option.value })}
                        className="flex-1"
                      >
                        <Icon className="h-4 w-4 ml-1" />
                        {language === "ar" ? option.labelAr : option.labelKu}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Contact Name */}
              <div>
                <Label htmlFor="contactName">
                  {language === "ar" ? "اسم جهة الاتصال" : "ناوی پەیوەندی"} *
                </Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder={language === "ar" ? "الاسم الكامل" : "ناوی تەواو"}
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone">
                  {language === "ar" ? "رقم الهاتف" : "ژمارەی مۆبایل"} *
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="07XX XXX XXXX"
                  dir="ltr"
                />
              </div>

              {/* City */}
              <div>
                <Label htmlFor="city">
                  {language === "ar" ? "المحافظة" : "پارێزگا"} *
                </Label>
                <Select
                  value={formData.city}
                  onValueChange={(v) => setFormData({ ...formData, city: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === "ar" ? "اختر المحافظة" : "پارێزگا هەڵبژێرە"} />
                  </SelectTrigger>
                  <SelectContent>
                    {IRAQI_PROVINCES.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* District */}
              <div>
                <Label htmlFor="district">
                  {language === "ar" ? "المنطقة / الحي" : "ناوچە / گەڕەک"}
                </Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder={language === "ar" ? "اختياري" : "ئارەزوومەندانە"}
                />
              </div>

              {/* Address Line */}
              <div>
                <Label htmlFor="addressLine1">
                  {language === "ar" ? "العنوان التفصيلي" : "ناونیشانی ورد"} *
                </Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder={language === "ar" ? "الشارع، رقم المبنى، علامات مميزة" : "شەقام، ژمارەی بینا، نیشانەکان"}
                />
              </div>

              {/* Map Picker */}
              <Suspense fallback={
                <div className="h-[300px] rounded-lg border flex items-center justify-center bg-gray-50">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              }>
                <LeafletMapPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLocationSelect={handleLocationSelect}
                  language={language}
                />
              </Suspense>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">
                  {language === "ar" ? "ملاحظات إضافية" : "تێبینی زیادە"}
                </Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={language === "ar" ? "تعليمات لمندوب التوصيل" : "ڕێنمایی بۆ کڕیار"}
                />
              </div>
            </div>

            <Button
              onClick={handleAddAddress}
              disabled={
                createAddressMutation.isPending ||
                !formData.contactName ||
                !formData.phone ||
                !formData.city ||
                !formData.addressLine1
              }
              className="w-full"
            >
              {createAddressMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  {language === "ar" ? "جاري الحفظ..." : "پاشەکەوتکردن..."}
                </>
              ) : (
                language === "ar" ? "حفظ الموقع والمتابعة" : "شوێن پاشەکەوت بکە و بەردەوام بە"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
