import { useState, useRef } from "react";
import { useAuth, AUTH_QUERY_KEY } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Phone, Plus, Pencil, Trash2, CheckCircle, Star, Camera, User } from "lucide-react";
import { apiRequest, authFetch } from "@/lib/queryClient";
import { getUserAvatarSrc } from "@/lib/avatar";
import { Layout } from "@/components/layout";
import type { BuyerAddress } from "@shared/schema";

const IRAQI_PROVINCES = [
  "بغداد", "البصرة", "أربيل", "السليمانية", "دهوك", "الموصل",
  "كركوك", "الأنبار", "بابل", "ديالى", "كربلاء", "النجف",
  "واسط", "ذي قار", "ميسان", "المثنى", "القادسية", "صلاح الدين"
];

interface ProfileData {
  id: string;
  phone: string;
  phoneVerified: boolean;
}

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile editing state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Address dialog state
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<BuyerAddress | null>(null);
  
  const [label, setLabel] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [city, setCity] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ["/api/account/profile"],
    enabled: !!user,
  });

  const { data: addresses = [], isLoading: addressesLoading } = useQuery<BuyerAddress[]>({
    queryKey: ["/api/account/addresses"],
    enabled: !!user,
  });

  const createAddressMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/account/addresses", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/addresses"] });
      setShowAddressDialog(false);
      resetForm();
      toast({ title: "تم إضافة العنوان بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في إضافة العنوان", variant: "destructive" });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/account/addresses/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/addresses"] });
      setShowAddressDialog(false);
      setEditingAddress(null);
      resetForm();
      toast({ title: "تم تحديث العنوان بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تحديث العنوان", variant: "destructive" });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/account/addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/addresses"] });
      toast({ title: "تم حذف العنوان" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في حذف العنوان", variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/account/addresses/${id}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/addresses"] });
      toast({ title: "تم تعيين العنوان الافتراضي" });
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً", description: "الحد الأقصى 5 ميغابايت", variant: "destructive" });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      let fileToUpload = file;
      if (!(file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic"))) {
        try {
          fileToUpload = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 800,
            useWebWorker: true,
            fileType: "image/webp" as const,
          });
        } catch {
          fileToUpload = file;
        }
      }

      const uploadFormData = new FormData();
      uploadFormData.append("images", fileToUpload);

      const response = await fetch("/api/uploads/optimized", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const result = await response.json();
      const avatarUrl = result.images[0].main;

      const res = await authFetch("/api/account/profile", {
        method: "PUT",
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      if (res.ok) {
        toast({ title: "تم تحديث الصورة بنجاح" });
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      } else {
        toast({ title: "خطأ", description: "فشل في حفظ الصورة", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في رفع أو حفظ الصورة", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) {
      toast({ title: "الاسم مطلوب", variant: "destructive" });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await authFetch("/api/account/profile", {
        method: "PUT",
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      if (res.ok) {
        toast({ title: "تم تحديث الاسم بنجاح" });
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      } else {
        toast({ title: "خطأ", description: "فشل في تحديث الاسم", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في تحديث الاسم", variant: "destructive" });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const resetForm = () => {
    setLabel("");
    setRecipientName("");
    setAddressPhone("");
    setCity("");
    setAddressLine1("");
    setAddressLine2("");
    setNotes("");
    setLatitude(null);
    setLongitude(null);
  };

  const openAddDialog = () => {
    resetForm();
    setEditingAddress(null);
    if (profile?.phone) {
      setAddressPhone(profile.phone);
    }
    setShowAddressDialog(true);
  };

  const openEditDialog = (address: BuyerAddress) => {
    setEditingAddress(address);
    setLabel(address.label);
    setRecipientName(address.recipientName);
    setAddressPhone(address.phone);
    setCity(address.city);
    setAddressLine1(address.addressLine1);
    setAddressLine2(address.addressLine2 || "");
    setNotes(address.notes || "");
    setLatitude(address.latitude);
    setLongitude(address.longitude);
    setShowAddressDialog(true);
  };

  const handleSaveAddress = () => {
    if (!label || !recipientName || !addressPhone || !city || !addressLine1) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const data = {
      label,
      recipientName,
      phone: addressPhone,
      city,
      addressLine1,
      addressLine2: addressLine2 || null,
      notes: notes || null,
      latitude,
      longitude,
      isDefault: addresses.length === 0,
    };

    if (editingAddress) {
      updateAddressMutation.mutate({ id: editingAddress.id, data });
    } else {
      createAddressMutation.mutate(data);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "غير مدعوم", description: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        toast({ title: "تم تحديد الموقع" });
      },
      () => {
        toast({ title: "خطأ", description: "فشل في الحصول على الموقع", variant: "destructive" });
      }
    );
  };

  if (authLoading || profileLoading || addressesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">يجب تسجيل الدخول للوصول إلى العناوين</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="container mx-auto px-4 py-6 pb-24 max-w-2xl" dir="rtl">
      <div className="space-y-6">
        
        {/* Profile Section */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            ملفي الشخصي
          </h2>
          <Card>
            <CardContent className="py-6">
              <div className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    data-testid="input-avatar-upload"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group"
                    disabled={isUploadingAvatar}
                    data-testid="button-change-avatar"
                  >
                    {getUserAvatarSrc(user) ? (
                      <img 
                        src={getUserAvatarSrc(user) || ''} 
                        alt={user?.displayName || "صورة الملف الشخصي"} 
                        className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {user?.displayName?.charAt(0) || "م"}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUploadingAvatar ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 bg-primary rounded-full p-1.5">
                      <Camera className="h-3.5 w-3.5 text-white" />
                    </div>
                  </button>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">اضغط على الصورة لتغييرها</p>
                    <p className="text-xs text-muted-foreground mt-1">الحد الأقصى: 5 ميغابايت</p>
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">اسم العرض</Label>
                  <div className="flex gap-2">
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="أدخل اسم العرض"
                      className="flex-1"
                      data-testid="input-display-name"
                    />
                    <Button
                      onClick={handleUpdateDisplayName}
                      disabled={isUpdatingProfile || !displayName.trim() || displayName === user?.displayName}
                      data-testid="button-save-display-name"
                    >
                      {isUpdatingProfile ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      ) : null}
                      حفظ
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Phone Section */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Phone className="h-5 w-5" />
            رقم الهاتف
          </h2>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{profile?.phone}</p>
                    <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                  </div>
                </div>
                {profile?.phoneVerified && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    موثق
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Addresses Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              العناوين
            </h2>
            <Button size="sm" onClick={openAddDialog} data-testid="button-add-address">
              <Plus className="h-4 w-4 ml-1" />
              إضافة عنوان
            </Button>
          </div>

          {addresses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد عناوين محفوظة</p>
                <Button className="mt-4" onClick={openAddDialog}>
                  <Plus className="h-4 w-4 ml-1" />
                  أضف عنوانك الأول
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <Card key={address.id} className={address.isDefault ? "border-primary" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">{address.label}</span>
                          {address.isDefault && (
                            <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              <Star className="h-3 w-3 fill-primary" />
                              افتراضي
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{address.recipientName}</p>
                        <p className="text-sm">{address.city} - {address.addressLine1}</p>
                        {address.addressLine2 && (
                          <p className="text-sm text-muted-foreground">{address.addressLine2}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">{address.phone}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!address.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDefaultMutation.mutate(address.id)}
                            className="text-xs"
                          >
                            تعيين افتراضي
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(address)}
                          data-testid={`button-edit-address-${address.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAddressMutation.mutate(address.id)}
                          className="text-red-500 hover:text-red-600"
                          data-testid={`button-delete-address-${address.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingAddress ? "تعديل العنوان" : "إضافة عنوان جديد"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="label">اسم العنوان *</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="مثال: المنزل، العمل"
                data-testid="input-address-label"
              />
            </div>

            <div>
              <Label htmlFor="recipientName">اسم المستلم *</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="الاسم الكامل للمستلم"
                data-testid="input-recipient-name"
              />
            </div>

            <div>
              <Label htmlFor="addressPhone">رقم الهاتف *</Label>
              <Input
                id="addressPhone"
                value={addressPhone}
                onChange={(e) => setAddressPhone(e.target.value)}
                placeholder="07xxxxxxxxx"
                data-testid="input-address-phone"
              />
            </div>

            <div>
              <Label htmlFor="city">المحافظة *</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger id="city" data-testid="select-city">
                  <SelectValue placeholder="اختر المحافظة" />
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

            <div>
              <Label htmlFor="addressLine1">العنوان التفصيلي *</Label>
              <Input
                id="addressLine1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="الحي، الشارع، رقم المبنى، أقرب معلم"
                data-testid="input-address-line1"
              />
            </div>

            <div>
              <Label htmlFor="addressLine2">تفاصيل إضافية</Label>
              <Input
                id="addressLine2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="رقم الشقة، توجيهات للسائق"
                data-testid="input-address-line2"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGetLocation}
              className="w-full"
              data-testid="button-get-location"
            >
              <MapPin className="h-4 w-4 ml-2" />
              تحديد موقعي
            </Button>
            {latitude && longitude && (
              <p className="text-xs text-green-600 text-center">تم تحديد الموقع بنجاح</p>
            )}

            <Button
              onClick={handleSaveAddress}
              className="w-full"
              disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
              data-testid="button-save-address"
            >
              {(createAddressMutation.isPending || updateAddressMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : null}
              {editingAddress ? "حفظ التغييرات" : "إضافة العنوان"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </Layout>
  );
}
