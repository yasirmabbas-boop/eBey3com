import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Smartphone, MapPin, Key, User, Save, Plus, Trash2, Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  phone?: string;
  avatar?: string;
  city?: string;
  district?: string;
  addressLine1?: string;
  addressLine2?: string;
  accountType: string;
  accountCode: string;
  isVerified?: boolean;
  verificationStatus?: string;
  rating?: number;
  ratingCount?: number;
  totalSales?: number;
  createdAt?: string;
  ageBracket?: string;
  interests?: string[];
  surveyCompleted?: boolean;
}

const AGE_BRACKETS = [
  { value: "18-24", label: "18-24 سنة" },
  { value: "25-34", label: "25-34 سنة" },
  { value: "35-44", label: "35-44 سنة" },
  { value: "45-54", label: "45-54 سنة" },
  { value: "55+", label: "55 سنة فأكثر" },
];

const INTEREST_OPTIONS = [
  { value: "electronics", label: "إلكترونيات" },
  { value: "phones", label: "هواتف ذكية" },
  { value: "cars", label: "سيارات" },
  { value: "clothing", label: "ملابس" },
  { value: "furniture", label: "أثاث" },
  { value: "antiques", label: "تحف وأنتيكات" },
  { value: "sports", label: "رياضة" },
  { value: "books", label: "كتب" },
  { value: "jewelry", label: "مجوهرات" },
  { value: "home", label: "منزل وحديقة" },
];

interface BuyerAddress {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  city: string;
  district?: string;
  addressLine1: string;
  addressLine2?: string;
  notes?: string;
  isDefault: boolean;
}

const IRAQI_CITIES = [
  "بغداد", "البصرة", "أربيل", "الموصل", "كركوك", "النجف", "كربلاء", 
  "الحلة", "الناصرية", "العمارة", "الديوانية", "السماوة", "الكوت", 
  "الرمادي", "بعقوبة", "تكريت", "السليمانية", "دهوك", "زاخو"
];

export default function Settings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    phone: "",
    city: "",
    district: "",
    addressLine1: "",
    addressLine2: "",
    ageBracket: "",
    interests: [] as string[],
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [addressForm, setAddressForm] = useState({
    label: "",
    recipientName: "",
    phone: "",
    city: "",
    district: "",
    addressLine1: "",
    addressLine2: "",
    notes: "",
    isDefault: false,
  });

  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/account/profile"],
    enabled: isAuthenticated,
  });

  const { data: addresses = [], isLoading: addressesLoading } = useQuery<BuyerAddress[]>({
    queryKey: ["/api/account/addresses"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        displayName: profile.displayName || "",
        phone: profile.phone || "",
        city: profile.city || "",
        district: profile.district || "",
        addressLine1: profile.addressLine1 || "",
        addressLine2: profile.addressLine2 || "",
        ageBracket: profile.ageBracket || "",
        interests: profile.interests || [],
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "فشل في تحديث الملف الشخصي");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "تم التحديث",
        description: "تم حفظ بياناتك الشخصية بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "فشل في تغيير كلمة المرور");
      }
      return response.json();
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: "تم التغيير",
        description: "تم تغيير كلمة المرور بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAddressMutation = useMutation({
    mutationFn: async (data: typeof addressForm) => {
      const response = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "فشل في إضافة العنوان");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/addresses"] });
      setAddressDialogOpen(false);
      resetAddressForm();
      toast({
        title: "تم الإضافة",
        description: "تم إضافة العنوان بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof addressForm }) => {
      const response = await fetch(`/api/account/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "فشل في تحديث العنوان");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/addresses"] });
      setAddressDialogOpen(false);
      setEditingAddressId(null);
      resetAddressForm();
      toast({
        title: "تم التحديث",
        description: "تم تحديث العنوان بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/account/addresses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "فشل في حذف العنوان");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/addresses"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف العنوان بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/account/addresses/${id}/default`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "فشل في تعيين العنوان الافتراضي");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/addresses"] });
      toast({
        title: "تم التعيين",
        description: "تم تعيين العنوان الافتراضي",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetAddressForm = () => {
    setAddressForm({
      label: "",
      recipientName: "",
      phone: "",
      city: "",
      district: "",
      addressLine1: "",
      addressLine2: "",
      notes: "",
      isDefault: false,
    });
  };

  const handleEditAddress = (address: BuyerAddress) => {
    setEditingAddressId(address.id);
    setAddressForm({
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      city: address.city,
      district: address.district || "",
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || "",
      notes: address.notes || "",
      isDefault: address.isDefault,
    });
    setAddressDialogOpen(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمة المرور الجديدة غير متطابقة",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleSaveAddress = () => {
    if (editingAddressId) {
      updateAddressMutation.mutate({ id: editingAddressId, data: addressForm });
    } else {
      createAddressMutation.mutate(addressForm);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">يجب تسجيل الدخول</h1>
          <p className="text-gray-600 mb-4">قم بتسجيل الدخول للوصول إلى إعدادات حسابك</p>
          <Button onClick={() => window.location.href = "/signin"}>تسجيل الدخول</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-primary" data-testid="text-settings-title">إعدادات الحساب</h1>
          <div className="text-sm text-gray-500">
            رمز الحساب: <span className="font-mono text-primary" data-testid="text-account-code">{profile?.accountCode}</span>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full md:w-[600px] grid-cols-3 mb-8">
            <TabsTrigger value="profile" data-testid="tab-profile">الملف الشخصي</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">الأمان</TabsTrigger>
            <TabsTrigger value="addresses" data-testid="tab-addresses">العناوين</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                المعلومات الشخصية
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>اسم المستخدم</Label>
                  <Input value={profile?.username || ""} disabled className="bg-gray-50" data-testid="input-username" />
                </div>
                <div className="space-y-2">
                  <Label>الاسم المعروض</Label>
                  <Input 
                    value={profileForm.displayName} 
                    onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="أدخل اسمك"
                    data-testid="input-display-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input 
                    value={profileForm.phone} 
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="07xxxxxxxxx"
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>المدينة</Label>
                  <Select 
                    value={profileForm.city} 
                    onValueChange={(value) => setProfileForm(prev => ({ ...prev, city: value }))}
                  >
                    <SelectTrigger data-testid="select-city">
                      <SelectValue placeholder="اختر المدينة" />
                    </SelectTrigger>
                    <SelectContent>
                      {IRAQI_CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المنطقة/الحي</Label>
                  <Input 
                    value={profileForm.district} 
                    onChange={(e) => setProfileForm(prev => ({ ...prev, district: e.target.value }))}
                    placeholder="أدخل اسم المنطقة"
                    data-testid="input-district"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>العنوان التفصيلي</Label>
                  <Input 
                    value={profileForm.addressLine1} 
                    onChange={(e) => setProfileForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                    placeholder="الشارع، رقم المنزل، معلم قريب"
                    data-testid="input-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الفئة العمرية</Label>
                  <Select 
                    value={profileForm.ageBracket} 
                    onValueChange={(value) => setProfileForm(prev => ({ ...prev, ageBracket: value }))}
                  >
                    <SelectTrigger data-testid="select-age-bracket">
                      <SelectValue placeholder="اختر الفئة العمرية" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_BRACKETS.map(bracket => (
                        <SelectItem key={bracket.value} value={bracket.value}>{bracket.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>الاهتمامات</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded-lg bg-gray-50">
                    {INTEREST_OPTIONS.map((interest) => (
                      <div key={interest.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`settings-interest-${interest.value}`}
                          checked={profileForm.interests.includes(interest.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setProfileForm(prev => ({ ...prev, interests: [...prev.interests, interest.value] }));
                            } else {
                              setProfileForm(prev => ({ ...prev, interests: prev.interests.filter(i => i !== interest.value) }));
                            }
                          }}
                          data-testid={`checkbox-settings-interest-${interest.value}`}
                        />
                        <label htmlFor={`settings-interest-${interest.value}`} className="text-sm cursor-pointer">
                          {interest.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {profile?.accountType === "seller" && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {profile.isVerified ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      )}
                      <span className="font-semibold">
                        {profile.isVerified ? "بائع موثق" : "بائع غير موثق"}
                      </span>
                    </div>
                    {profile.rating !== undefined && profile.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span>{profile.rating.toFixed(1)}</span>
                        <span className="text-gray-500">({profile.ratingCount} تقييم)</span>
                      </div>
                    )}
                    {profile.totalSales !== undefined && profile.totalSales > 0 && (
                      <span className="text-gray-600">{profile.totalSales} عملية بيع</span>
                    )}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSaveProfile} 
                className="mt-6 w-full md:w-auto" 
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    حفظ التغييرات
                  </>
                )}
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                تغيير كلمة المرور
              </h2>
              
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>كلمة المرور الحالية</Label>
                  <Input 
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="أدخل كلمة المرور الحالية"
                    data-testid="input-current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور الجديدة</Label>
                  <Input 
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="أدخل كلمة المرور الجديدة"
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>تأكيد كلمة المرور الجديدة</Label>
                  <Input 
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    data-testid="input-confirm-password"
                  />
                </div>
                <Button 
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      جاري التغيير...
                    </>
                  ) : "تغيير كلمة المرور"}
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                حماية الحساب
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">المصادقة الثنائية (2FA)</Label>
                    <p className="text-sm text-gray-500">
                      طلب رمز تحقق عند تسجيل الدخول من جهاز جديد
                    </p>
                  </div>
                  <Switch disabled />
                  <span className="text-xs text-gray-400">قريباً</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">تنبيهات تسجيل الدخول</Label>
                    <p className="text-sm text-gray-500">
                      إشعار عند الدخول للحساب من جهاز جديد
                    </p>
                  </div>
                  <Switch disabled />
                  <span className="text-xs text-gray-400">قريباً</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                الأجهزة المتصلة
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">الجهاز الحالي</p>
                      <p className="text-xs text-green-600">نشط الآن</p>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">نشط</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="addresses" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  عناوين التوصيل
                </h2>
                <Dialog open={addressDialogOpen} onOpenChange={(open) => {
                  setAddressDialogOpen(open);
                  if (!open) {
                    setEditingAddressId(null);
                    resetAddressForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-address">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة عنوان
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingAddressId ? "تعديل العنوان" : "إضافة عنوان جديد"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>تسمية العنوان</Label>
                        <Input 
                          value={addressForm.label}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, label: e.target.value }))}
                          placeholder="مثال: المنزل، العمل"
                          data-testid="input-address-label"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>اسم المستلم</Label>
                        <Input 
                          value={addressForm.recipientName}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, recipientName: e.target.value }))}
                          placeholder="الاسم الكامل للمستلم"
                          data-testid="input-recipient-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>رقم الهاتف</Label>
                        <Input 
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="07xxxxxxxxx"
                          data-testid="input-address-phone"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>المدينة</Label>
                          <Select 
                            value={addressForm.city} 
                            onValueChange={(value) => setAddressForm(prev => ({ ...prev, city: value }))}
                          >
                            <SelectTrigger data-testid="select-address-city">
                              <SelectValue placeholder="اختر" />
                            </SelectTrigger>
                            <SelectContent>
                              {IRAQI_CITIES.map(city => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>المنطقة</Label>
                          <Input 
                            value={addressForm.district}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, district: e.target.value }))}
                            placeholder="الحي/المنطقة"
                            data-testid="input-address-district"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>العنوان التفصيلي</Label>
                        <Input 
                          value={addressForm.addressLine1}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                          placeholder="الشارع، رقم المنزل، معلم قريب"
                          data-testid="input-address-line1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ملاحظات إضافية (اختياري)</Label>
                        <Input 
                          value={addressForm.notes}
                          onChange={(e) => setAddressForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="تعليمات للتوصيل"
                          data-testid="input-address-notes"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={addressForm.isDefault}
                          onCheckedChange={(checked) => setAddressForm(prev => ({ ...prev, isDefault: checked }))}
                          data-testid="switch-default-address"
                        />
                        <Label>تعيين كعنوان افتراضي</Label>
                      </div>
                      <Button 
                        onClick={handleSaveAddress} 
                        className="w-full"
                        disabled={createAddressMutation.isPending || updateAddressMutation.isPending || !addressForm.label || !addressForm.recipientName || !addressForm.phone || !addressForm.city || !addressForm.addressLine1}
                        data-testid="button-save-address"
                      >
                        {(createAddressMutation.isPending || updateAddressMutation.isPending) ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                            جاري الحفظ...
                          </>
                        ) : editingAddressId ? "حفظ التعديلات" : "إضافة العنوان"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {addressesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد عناوين محفوظة</p>
                  <p className="text-sm">أضف عنوان توصيل لتسهيل عمليات الشراء</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {addresses.map((address) => (
                    <div 
                      key={address.id} 
                      className={`p-4 rounded-lg border ${address.isDefault ? "border-primary bg-blue-50" : "border-gray-200"}`}
                      data-testid={`address-card-${address.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold">{address.label}</span>
                            {address.isDefault && (
                              <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">افتراضي</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{address.recipientName}</p>
                          <p className="text-sm text-gray-600">{address.phone}</p>
                          <p className="text-sm text-gray-600">{address.city}{address.district ? ` - ${address.district}` : ""}</p>
                          <p className="text-sm text-gray-500">{address.addressLine1}</p>
                          {address.notes && (
                            <p className="text-xs text-gray-400 mt-1">{address.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!address.isDefault && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDefaultAddressMutation.mutate(address.id)}
                              disabled={setDefaultAddressMutation.isPending}
                              data-testid={`button-set-default-${address.id}`}
                            >
                              تعيين افتراضي
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditAddress(address)}
                            data-testid={`button-edit-address-${address.id}`}
                          >
                            تعديل
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteAddressMutation.mutate(address.id)}
                            disabled={deleteAddressMutation.isPending}
                            data-testid={`button-delete-address-${address.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
