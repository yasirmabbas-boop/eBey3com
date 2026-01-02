import { useState } from "react";
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
import { Loader2, MapPin, Plus, Check } from "lucide-react";
import type { BuyerAddress } from "@shared/schema";

interface AddressSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (addressId: string) => void;
}

export function AddressSelectionModal({
  open,
  onOpenChange,
  onSelect,
}: AddressSelectionModalProps) {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    label: "المنزل",
    recipientName: "",
    phone: "",
    city: "",
    district: "",
    addressLine1: "",
    notes: "",
  });
  const queryClient = useQueryClient();

  const { data: addresses, isLoading } = useQuery<BuyerAddress[]>({
    queryKey: ["/api/account/addresses"],
    queryFn: async () => {
      const authToken = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch("/api/account/addresses", {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch addresses");
      return res.json();
    },
    enabled: open,
  });

  const createAddressMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const authToken = localStorage.getItem("authToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل في إضافة العنوان");
      }
      return res.json();
    },
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/addresses"] });
      setShowAddForm(false);
      setSelectedAddressId(newAddress.id);
      setFormData({
        label: "المنزل",
        recipientName: "",
        phone: "",
        city: "",
        district: "",
        addressLine1: "",
        notes: "",
      });
    },
  });

  const handleConfirm = () => {
    if (selectedAddressId) {
      onSelect(selectedAddressId);
      onOpenChange(false);
    }
  };

  const handleAddAddress = () => {
    if (!formData.recipientName || !formData.phone || !formData.city || !formData.addressLine1) {
      return;
    }
    createAddressMutation.mutate(formData);
  };

  const defaultAddress = addresses?.find((a) => a.isDefault);
  
  if (!selectedAddressId && defaultAddress) {
    setSelectedAddressId(defaultAddress.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            اختر عنوان الشحن
          </DialogTitle>
          <DialogDescription>
            حدد عنوان الشحن لاستلام المنتج في حال الفوز بالمزاد
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !showAddForm && addresses && addresses.length > 0 ? (
          <div className="space-y-4">
            <RadioGroup
              value={selectedAddressId || ""}
              onValueChange={setSelectedAddressId}
              className="space-y-3"
            >
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedAddressId === address.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedAddressId(address.id)}
                  data-testid={`address-option-${address.id}`}
                >
                  <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{address.label}</span>
                      {address.isDefault && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          افتراضي
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{address.recipientName}</p>
                    <p className="text-sm text-gray-600">{address.phone}</p>
                    <p className="text-sm text-gray-500">
                      {address.city}
                      {address.district && ` - ${address.district}`}
                    </p>
                    <p className="text-sm text-gray-500">{address.addressLine1}</p>
                  </div>
                  {selectedAddressId === address.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </RadioGroup>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAddForm(true)}
              data-testid="button-add-new-address"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة عنوان جديد
            </Button>

            <Button
              onClick={handleConfirm}
              disabled={!selectedAddressId}
              className="w-full"
              data-testid="button-confirm-address"
            >
              تأكيد واستمرار
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {!addresses || addresses.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-2">
                لا توجد عناوين محفوظة. أضف عنوانك الأول للمتابعة.
              </p>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="mb-2"
              >
                ← العودة للعناوين المحفوظة
              </Button>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="label">تسمية العنوان</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="مثل: المنزل، العمل"
                  data-testid="input-address-label"
                />
              </div>

              <div>
                <Label htmlFor="recipientName">اسم المستلم *</Label>
                <Input
                  id="recipientName"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  placeholder="الاسم الكامل"
                  data-testid="input-recipient-name"
                />
              </div>

              <div>
                <Label htmlFor="phone">رقم الهاتف *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="07XX XXX XXXX"
                  dir="ltr"
                  data-testid="input-address-phone"
                />
              </div>

              <div>
                <Label htmlFor="city">المحافظة *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="بغداد، البصرة، الخ"
                  data-testid="input-address-city"
                />
              </div>

              <div>
                <Label htmlFor="district">المنطقة / الحي</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="اختياري"
                  data-testid="input-address-district"
                />
              </div>

              <div>
                <Label htmlFor="addressLine1">العنوان التفصيلي *</Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="الشارع، رقم المنزل، علامات مميزة"
                  data-testid="input-address-line1"
                />
              </div>

              <div>
                <Label htmlFor="notes">ملاحظات للتوصيل</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="تعليمات إضافية للسائق"
                  data-testid="input-address-notes"
                />
              </div>
            </div>

            <Button
              onClick={handleAddAddress}
              disabled={
                createAddressMutation.isPending ||
                !formData.recipientName ||
                !formData.phone ||
                !formData.city ||
                !formData.addressLine1
              }
              className="w-full"
              data-testid="button-save-address"
            >
              {createAddressMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ العنوان والمتابعة"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
