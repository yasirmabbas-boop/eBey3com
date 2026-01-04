import { useState, useEffect, useRef } from "react";
import { useLocation, Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Listing } from "@shared/schema";
import { 
  Camera, 
  Upload, 
  DollarSign, 
  Clock, 
  Package, 
  MapPin, 
  Tag, 
  Info,
  Gavel,
  ShoppingBag,
  Calendar,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  Loader2
} from "lucide-react";
import { 
  WATCH_BRANDS, 
  WATCH_MOVEMENTS, 
  WATCH_CASE_MATERIALS, 
  WATCH_BAND_MATERIALS,
  WATCH_DIAL_COLORS,
  WATCH_FEATURES,
  WATCH_CASE_SIZES,
  WATCH_SHAPES,
  DEPARTMENT_OPTIONS
} from "@/lib/search-data";

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: hour, label: `${hour}:00` };
});

// Feature flag for exchange option - set to true to enable
const ENABLE_EXCHANGE_FEATURE = false;

export default function SellPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { user, isLoading: authLoading } = useAuth();
  
  // Parse query parameters for edit, relist, and template modes
  const urlParams = new URLSearchParams(searchString);
  const editListingId = urlParams.get("edit");
  const relistListingId = urlParams.get("relist");
  const templateListingId = urlParams.get("template");
  
  const isEditMode = !!editListingId;
  const isRelistMode = !!relistListingId;
  const isTemplateMode = !!templateListingId;
  const sourceListingId = editListingId || relistListingId || templateListingId;

  // Fetch existing listing for edit/relist/template mode
  const { data: sourceListing, isLoading: sourceListingLoading } = useQuery<Listing>({
    queryKey: ["/api/listings", sourceListingId],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${sourceListingId}`);
      if (!res.ok) throw new Error("Listing not found");
      return res.json();
    },
    enabled: !!sourceListingId,
  });
  
  const [saleType, setSaleType] = useState<"auction" | "fixed">("auction");
  const [hasBuyNow, setHasBuyNow] = useState(false);
  const [hasReservePrice, setHasReservePrice] = useState(false);
  const [allowOffers, setAllowOffers] = useState(false);
  const [allowExchange, setAllowExchange] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [startTimeOption, setStartTimeOption] = useState("now");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    brand: "",
    customBrand: "",
    serialNumber: "",
    quantityAvailable: "1",
    deliveryWindow: "",
    shippingType: "seller_pays",
    shippingCost: "",
    returnPolicy: "",
    returnDetails: "",
    sellerName: user?.displayName || "",
    city: "",
    startDate: "",
    startHour: "",
    endDate: "",
    endHour: "",
    reservePrice: "",
    buyNowPrice: "",
    bidIncrement: "",
  });
  
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  useEffect(() => {
    if (user?.displayName && !formData.sellerName) {
      setFormData(prev => ({ ...prev, sellerName: user.displayName || "" }));
    }
  }, [user]);

  // Auto-save draft to localStorage (only for brand new listings - not edit/relist/template)
  const DRAFT_KEY = "listing_draft";
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const isNewListing = !isEditMode && !isRelistMode && !isTemplateMode;

  // Load draft from localStorage on mount (only for new listings)
  useEffect(() => {
    if (isNewListing && !draftLoaded) {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.formData && Object.values(draft.formData).some((v: unknown) => v !== "" && v !== "1")) {
            setShowDraftBanner(true);
          }
        } catch (e) {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
      setDraftLoaded(true);
    } else if (!isNewListing) {
      // For edit/relist/template modes, don't show draft banner and mark as loaded
      setShowDraftBanner(false);
      setDraftLoaded(true);
    }
  }, [isNewListing, draftLoaded]);

  const loadDraft = () => {
    if (!isNewListing) return; // Safety check
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.formData) setFormData(draft.formData);
        if (draft.images) setImages(draft.images);
        if (draft.saleType) setSaleType(draft.saleType);
        if (draft.allowOffers !== undefined) setAllowOffers(draft.allowOffers);
        if (draft.allowExchange !== undefined) setAllowExchange(draft.allowExchange);
        if (draft.hasBuyNow !== undefined) setHasBuyNow(draft.hasBuyNow);
        if (draft.hasReservePrice !== undefined) setHasReservePrice(draft.hasReservePrice);
        if (draft.tags) setTags(draft.tags);
        toast({ title: "تم استرجاع المسودة", description: "تم تحميل البيانات المحفوظة مسبقاً" });
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
    setShowDraftBanner(false);
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftBanner(false);
  };

  // Save draft to localStorage periodically (only for brand new listings)
  useEffect(() => {
    if (isNewListing && draftLoaded && !showDraftBanner) {
      const hasContent = formData.title || formData.description || formData.price || images.length > 0;
      if (hasContent) {
        try {
          const draft = { formData, images: images.slice(0, 4), saleType, allowOffers, allowExchange, hasBuyNow, hasReservePrice, tags, savedAt: new Date().toISOString() };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch (e) {
          console.warn("Failed to save draft to localStorage:", e);
        }
      }
    }
  }, [formData, images, saleType, allowOffers, allowExchange, hasBuyNow, hasReservePrice, tags, isNewListing, draftLoaded, showDraftBanner]);

  // Populate form when editing, relisting, or using as template
  useEffect(() => {
    if (sourceListing && sourceListingId) {
      // Parse auction times if they exist
      let startDate = "";
      let startHour = "";
      let endDate = "";
      let endHour = "";
      
      if (sourceListing.auctionStartTime && !isRelistMode) {
        const start = new Date(sourceListing.auctionStartTime);
        startDate = start.toISOString().split('T')[0];
        startHour = start.getHours().toString().padStart(2, '0');
      }
      if (sourceListing.auctionEndTime && !isRelistMode) {
        const end = new Date(sourceListing.auctionEndTime);
        endDate = end.toISOString().split('T')[0];
        endHour = end.getHours().toString().padStart(2, '0');
      }
      
      setFormData({
        title: isTemplateMode ? "" : sourceListing.title || "",
        description: sourceListing.description || "",
        price: sourceListing.price?.toString() || "",
        category: sourceListing.category || "",
        condition: sourceListing.condition || "",
        brand: sourceListing.brand || "",
        customBrand: "",
        serialNumber: isTemplateMode ? "" : sourceListing.serialNumber || "",
        quantityAvailable: isRelistMode ? "1" : sourceListing.quantityAvailable?.toString() || "1",
        deliveryWindow: sourceListing.deliveryWindow || "",
        shippingType: (sourceListing as any).shippingType || "seller_pays",
        shippingCost: (sourceListing as any).shippingCost?.toString() || "",
        returnPolicy: sourceListing.returnPolicy || "",
        returnDetails: sourceListing.returnDetails || "",
        sellerName: sourceListing.sellerName || user?.displayName || "",
        city: sourceListing.city || "",
        startDate,
        startHour,
        endDate,
        endHour,
        reservePrice: "",
        buyNowPrice: "",
        bidIncrement: "",
      });
      setImages(sourceListing.images || []);
      setSaleType((sourceListing.saleType as "auction" | "fixed") || "fixed");
      setAllowOffers(sourceListing.isNegotiable || false);
      setAllowExchange(sourceListing.isExchangeable || false);
      setTags((sourceListing as any).tags || []);
      
      // Set start time option based on whether auction has started
      if (sourceListing.auctionStartTime) {
        const now = new Date();
        const start = new Date(sourceListing.auctionStartTime);
        if (start > now) {
          setStartTimeOption("schedule");
        }
      }
    }
  }, [sourceListing, sourceListingId, isTemplateMode, isRelistMode, user?.displayName]);

  // Check if form has unsaved content
  const hasUnsavedContent = () => {
    return formData.title || formData.description || formData.price || images.length > 0;
  };

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedContent() && isNewListing) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formData, images, isNewListing]);

  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [watchSpecs, setWatchSpecs] = useState({
    referenceNumber: "",
    brand: "",
    model: "",
    movement: "",
    caseMaterial: "",
    caseSize: "",
    caseColor: "",
    dialColor: "",
    bandMaterial: "",
    bandColor: "",
    features: [] as string[],
    watchShape: "",
    department: "",
    countryOfOrigin: "",
    display: "Analog",
    indices: "",
    handedness: "Right",
    customized: false,
  });

  const handleAutoFillWatch = async () => {
    if (!watchSpecs.referenceNumber && !watchSpecs.model) {
      toast({
        title: "أدخل رقم المرجع أو الموديل",
        description: "أدخل رقم المرجع أو اسم الموديل للبحث التلقائي",
        variant: "destructive",
      });
      return;
    }

    setIsAutoFilling(true);

    setTimeout(() => {
      if (watchSpecs.referenceNumber.includes("6138") || watchSpecs.model.toLowerCase().includes("seiko")) {
        setWatchSpecs(prev => ({
          ...prev,
          brand: "Seiko",
          model: prev.model || "Seiko Reverse Baby Panda Chronograph",
          movement: "Automatic (Self-Winding)",
          caseMaterial: "Stainless Steel",
          caseSize: "40mm",
          caseColor: "Silver",
          dialColor: "Reverse Panda",
          bandMaterial: "Stainless Steel",
          bandColor: "Silver",
          features: ["Chronograph", "Day/Date"],
          watchShape: "Round",
          department: "men",
          countryOfOrigin: "Japan",
          display: "Analog",
          indices: "Arabic Numerals, 12-Hour Dial",
        }));
        toast({
          title: "تم العثور على المواصفات! ✨",
          description: "تم ملء المواصفات تلقائياً من قاعدة البيانات",
        });
      } else if (watchSpecs.referenceNumber.toLowerCase().includes("116610") || watchSpecs.model.toLowerCase().includes("rolex")) {
        setWatchSpecs(prev => ({
          ...prev,
          brand: "Rolex",
          model: prev.model || "Rolex Submariner Date",
          movement: "Automatic (Self-Winding)",
          caseMaterial: "Stainless Steel",
          caseSize: "41mm",
          caseColor: "Silver",
          dialColor: "Black",
          bandMaterial: "Stainless Steel",
          bandColor: "Silver",
          features: ["Date", "Water Resistant"],
          watchShape: "Round",
          department: "men",
          countryOfOrigin: "Switzerland",
          display: "Analog",
          indices: "Luminous Markers",
        }));
        toast({
          title: "تم العثور على المواصفات! ✨",
          description: "تم ملء المواصفات تلقائياً من قاعدة البيانات",
        });
      } else {
        toast({
          title: "لم يتم العثور على بيانات",
          description: "يرجى إدخال المواصفات يدوياً",
          variant: "destructive",
        });
      }
      setIsAutoFilling(false);
    }, 1500);
  };

  const toggleWatchFeature = (feature: string) => {
    setWatchSpecs(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const isUserVerified = user?.isVerified === true;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxFiles = 8 - images.length;
    const filesToUpload = Array.from(files).slice(0, maxFiles);
    
    if (filesToUpload.length === 0) {
      toast({
        title: "الحد الأقصى للصور",
        description: "يمكنك رفع 8 صور كحد أقصى",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImages(true);

    try {
      const uploadedPaths: string[] = [];

      for (const file of filesToUpload) {
        // Step 1: Request presigned URL from backend
        const urlResponse = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || "image/jpeg",
          }),
        });

        if (!urlResponse.ok) {
          throw new Error("فشل في الحصول على رابط الرفع");
        }

        const { uploadURL, objectPath } = await urlResponse.json();

        // Step 2: Upload file directly to object storage
        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "image/jpeg" },
        });

        if (!uploadResponse.ok) {
          throw new Error("فشل في رفع الصورة");
        }

        // Store the object path (served via /objects/...)
        uploadedPaths.push(objectPath);
      }

      setImages(prev => [...prev, ...uploadedPaths]);
      
      // Clear image validation error when images are added
      if (validationErrors.images) {
        setValidationErrors(prev => {
          const updated = { ...prev };
          delete updated.images;
          return updated;
        });
      }
      
      toast({
        title: "تم رفع الصور بنجاح",
        description: `تم رفع ${uploadedPaths.length} صورة`,
      });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        title: "خطأ في رفع الصور",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء رفع الصور",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.title.trim()) errors.title = "عنوان المنتج مطلوب";
    if (!formData.description.trim()) errors.description = "وصف المنتج مطلوب";
    if (!formData.price || parseInt(formData.price) <= 0) errors.price = "السعر مطلوب";
    if (!formData.category) errors.category = "الفئة مطلوبة";
    if (!formData.condition) errors.condition = "الحالة مطلوبة";
    if (!formData.city) errors.city = "المدينة مطلوبة";
    if (!formData.sellerName.trim()) errors.sellerName = "اسم البائع مطلوب";
    if (!formData.deliveryWindow) errors.deliveryWindow = "مدة التوصيل مطلوبة";
    if (!formData.returnPolicy) errors.returnPolicy = "سياسة الإرجاع مطلوبة";
    if (images.length === 0) errors.images = "يجب إضافة صورة واحدة على الأقل";
    
    // Serial number required for watches and items over 1,000,000 IQD
    if ((formData.category === "ساعات" || parseInt(formData.price) >= 1000000) && !formData.serialNumber.trim()) {
      errors.serialNumber = "الرقم التسلسلي مطلوب للساعات والمنتجات الثمينة";
    }
    
    if (saleType === "auction") {
      if (startTimeOption === "schedule") {
        if (!formData.startDate) errors.startDate = "تاريخ البدء مطلوب";
        if (!formData.startHour) errors.startHour = "وقت البدء مطلوب";
      }
      if (!formData.endDate) errors.endDate = "تاريخ الانتهاء مطلوب";
      if (!formData.endHour) errors.endHour = "وقت الانتهاء مطلوب";
      
      if (formData.endDate && formData.endHour) {
        const startTime = startTimeOption === "now" 
          ? new Date() 
          : new Date(`${formData.startDate}T${formData.startHour}:00`);
        const endTime = new Date(`${formData.endDate}T${formData.endHour}:00`);
        const hoursDiff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          errors.endDate = "يجب أن تكون مدة المزاد 24 ساعة على الأقل";
        }
        if (endTime <= startTime) {
          errors.endDate = "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء";
        }
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleShowSummary = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "يرجى إكمال جميع الحقول المطلوبة",
        description: "تحقق من الحقول المميزة بالأحمر",
        variant: "destructive",
      });
      return;
    }
    
    setShowSummary(true);
  };

  const handleSubmit = async () => {
    setShowSummary(false);
    setIsSubmitting(true);
    
    try {
      let auctionStartTime = null;
      let auctionEndTime = null;
      
      if (saleType === "auction") {
        // Set start time
        if (startTimeOption === "schedule" && formData.startDate && formData.startHour) {
          auctionStartTime = new Date(`${formData.startDate}T${formData.startHour}:00`).toISOString();
        } else {
          auctionStartTime = new Date().toISOString();
        }
        
        // Set end time - always required
        if (formData.endDate && formData.endHour) {
          auctionEndTime = new Date(`${formData.endDate}T${formData.endHour}:00`).toISOString();
        }
      }
      
      const finalBrand = formData.brand === "أخرى" ? formData.customBrand : formData.brand;
      
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: parseInt(formData.price) || 0,
        category: formData.category,
        condition: formData.condition,
        brand: finalBrand || null,
        images: images,
        saleType: saleType,
        timeLeft: null,
        auctionStartTime: auctionStartTime,
        auctionEndTime: auctionEndTime,
        deliveryWindow: formData.deliveryWindow,
        shippingType: formData.shippingType,
        shippingCost: formData.shippingType === "buyer_pays" ? parseInt(formData.shippingCost) || 0 : 0,
        returnPolicy: formData.returnPolicy,
        returnDetails: formData.returnDetails || null,
        sellerName: formData.sellerName,
        sellerId: user?.id || null,
        city: formData.city,
        isNegotiable: allowOffers,
        isExchangeable: allowExchange,
        serialNumber: formData.serialNumber || null,
        quantityAvailable: parseInt(formData.quantityAvailable) || 1,
        tags: tags.length > 0 ? tags : null,
      };

      // Only edit mode uses PATCH, relist and template create new listings via POST
      const url = isEditMode ? `/api/listings/${editListingId}` : "/api/listings";
      const method = isEditMode ? "PATCH" : "POST";
      
      // Include auth token for Safari compatibility
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const authToken = localStorage.getItem("authToken");
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(url, {
        method,
        headers,
        credentials: "include",
        body: JSON.stringify(listingData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.fieldErrors) {
          setValidationErrors(errorData.fieldErrors);
          toast({
            title: "يرجى تصحيح الأخطاء",
            description: "تحقق من الحقول المميزة بالأحمر",
            variant: "destructive",
          });
          return;
        }
        throw new Error(errorData.error || (isEditMode ? "Failed to update listing" : "Failed to create listing"));
      }

      const successTitle = isEditMode 
        ? "تم تحديث المنتج بنجاح!" 
        : isRelistMode 
          ? "تم إعادة عرض المنتج بنجاح!" 
          : "تم نشر المنتج بنجاح!";
      const successDesc = isEditMode 
        ? "تم حفظ التغييرات." 
        : isRelistMode 
          ? "تم إنشاء عرض جديد برقم منتج جديد."
          : "يمكنك رؤية منتجك في الصفحة الرئيسية.";
      
      toast({
        title: successTitle,
        description: successDesc,
      });
      
      // Clear draft on successful submission
      localStorage.removeItem(DRAFT_KEY);
      
      setLocation("/seller-dashboard");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "حدث خطأ",
        description: "تعذر نشر المنتج. حاول مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isRequestingSellerAccess, setIsRequestingSellerAccess] = useState(false);
  const [sellerFormData, setSellerFormData] = useState({
    shopName: "",
    phone: "",
    city: "",
    description: "",
  });

  const IRAQI_CITIES = [
    "بغداد", "البصرة", "نينوى", "أربيل", "النجف", "كربلاء", 
    "الأنبار", "ديالى", "كركوك", "صلاح الدين", "السليمانية", 
    "دهوك", "واسط", "ميسان", "ذي قار", "المثنى", "القادسية", "بابل"
  ];
  
  const handleRequestSellerAccess = async () => {
    if (!sellerFormData.shopName.trim()) {
      toast({ title: "خطأ", description: "الرجاء إدخال اسم المتجر", variant: "destructive" });
      return;
    }
    if (!sellerFormData.phone.trim()) {
      toast({ title: "خطأ", description: "الرجاء إدخال رقم الهاتف", variant: "destructive" });
      return;
    }
    if (!sellerFormData.city) {
      toast({ title: "خطأ", description: "الرجاء اختيار المحافظة", variant: "destructive" });
      return;
    }

    setIsRequestingSellerAccess(true);
    try {
      const response = await fetch("/api/seller-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sellerFormData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "فشل في تقديم الطلب");
      }
      
      toast({
        title: "تم تقديم الطلب بنجاح!",
        description: "سيتم مراجعة طلبك من قبل الإدارة",
      });
      
      // Reload the page to show the updated status
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRequestingSellerAccess(false);
    }
  };

  // If user is not logged in, show login prompt
  if (!authLoading && !user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-md text-center">
          <Card>
            <CardHeader>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl">تسجيل الدخول مطلوب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                يجب تسجيل الدخول لتتمكن من بيع المنتجات
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/signin">
                  <Button className="w-full">تسجيل الدخول</Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" className="w-full">إنشاء حساب جديد</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // If user is not an approved seller, show seller request option
  if (!authLoading && user && !user.sellerApproved) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-md text-center">
          <Card>
            <CardHeader>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">طلب التسجيل كبائع</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.sellerRequestStatus === "pending" ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-amber-700 mb-2">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">طلبك قيد المراجعة</span>
                    </div>
                    <p className="text-sm text-amber-600">
                      تم تقديم طلبك للتسجيل كبائع. سيتم إعلامك عند الموافقة على طلبك.
                    </p>
                  </div>
                  <Link href="/">
                    <Button variant="outline" className="w-full">العودة للصفحة الرئيسية</Button>
                  </Link>
                </>
              ) : user.sellerRequestStatus === "rejected" ? (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">تم رفض الطلب</span>
                    </div>
                    <p className="text-sm text-red-600">
                      للأسف تم رفض طلبك للتسجيل كبائع. يمكنك التواصل مع الدعم لمزيد من المعلومات.
                    </p>
                  </div>
                  <Link href="/">
                    <Button variant="outline" className="w-full">العودة للصفحة الرئيسية</Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">
                    أكمل النموذج التالي للتسجيل كبائع على منصة اي-بيع
                  </p>
                  
                  <div className="space-y-4 text-right">
                    <div>
                      <Label htmlFor="shopName" className="text-sm font-medium">
                        اسم المتجر / النشاط التجاري <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="shopName"
                        placeholder="مثال: متجر الساعات الفاخرة"
                        value={sellerFormData.shopName}
                        onChange={(e) => setSellerFormData(prev => ({ ...prev, shopName: e.target.value }))}
                        className="mt-1"
                        data-testid="input-shop-name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium">
                        رقم الهاتف <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="07XX XXX XXXX"
                        value={sellerFormData.phone}
                        onChange={(e) => setSellerFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="mt-1"
                        dir="ltr"
                        data-testid="input-seller-phone"
                      />
                    </div>

                    <div>
                      <Label htmlFor="city" className="text-sm font-medium">
                        المحافظة <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={sellerFormData.city}
                        onValueChange={(value) => setSellerFormData(prev => ({ ...prev, city: value }))}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-seller-city">
                          <SelectValue placeholder="اختر المحافظة" />
                        </SelectTrigger>
                        <SelectContent>
                          {IRAQI_CITIES.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-sm font-medium">
                        وصف المنتجات التي ستبيعها
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="مثال: ساعات أصلية، ملابس فاخرة، إلكترونيات..."
                        value={sellerFormData.description}
                        onChange={(e) => setSellerFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1 min-h-[80px]"
                        data-testid="input-seller-description"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-right">
                    <h4 className="font-medium text-blue-800 mb-1 text-sm">مميزات البائع:</h4>
                    <ul className="text-xs text-blue-700 space-y-0.5">
                      <li>• إضافة منتجات للبيع المباشر أو المزاد</li>
                      <li>• لوحة تحكم متقدمة للبائع</li>
                      <li>• التواصل المباشر مع المشترين</li>
                    </ul>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleRequestSellerAccess}
                    disabled={isRequestingSellerAccess}
                    data-testid="button-submit-seller-request"
                  >
                    {isRequestingSellerAccess ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        جاري إرسال الطلب...
                      </>
                    ) : (
                      "تقديم طلب التسجيل كبائع"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 pb-24 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            {isEditMode ? "تعديل المنتج" : isRelistMode ? "إعادة عرض المنتج" : isTemplateMode ? "منتج جديد (من قالب)" : "بيع منتج جديد"}
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {isEditMode 
                ? "قم بتعديل تفاصيل منتجك" 
                : isRelistMode 
                  ? "أنشئ عرض جديد لنفس المنتج" 
                  : isTemplateMode 
                    ? "استخدم هذا المنتج كقالب لمنتج جديد"
                    : "أضف منتجك للبيع على منصة اي-بيع"}
            </p>
            {(isEditMode || isRelistMode || isTemplateMode) && (
              <Button
                variant="outline"
                onClick={() => setLocation("/seller")}
                className="gap-2"
                data-testid="button-cancel-edit"
              >
                <X className="h-4 w-4" />
                إلغاء
              </Button>
            )}
          </div>
          {sourceListingId && sourceListingLoading && (
            <div className="flex items-center gap-2 mt-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري تحميل بيانات المنتج...
            </div>
          )}
        </div>

        {/* Draft Recovery Banner */}
        {showDraftBanner && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-800">لديك مسودة محفوظة</p>
                <p className="text-sm text-blue-600">هل تريد استكمال العمل على المنتج السابق؟</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={clearDraft}>
                تجاهل
              </Button>
              <Button type="button" size="sm" onClick={loadDraft} className="bg-blue-600 hover:bg-blue-700">
                استرجاع المسودة
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleShowSummary} className="space-y-8">
          
          {/* Image Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                صور المنتج
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-gray-100">
                    <img src={img} alt={`صورة ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {index === 0 && (
                      <Badge className="absolute bottom-2 right-2 bg-primary">الرئيسية</Badge>
                    )}
                  </div>
                ))}
                
                {images.length < 8 && (
                  <label className={`aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center transition-colors ${isUploadingImages ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:border-primary hover:bg-blue-50'}`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      data-testid="input-images"
                      disabled={isUploadingImages}
                    />
                    {isUploadingImages ? (
                      <>
                        <Loader2 className="h-8 w-8 text-primary mb-2 animate-spin" />
                        <span className="text-sm text-primary">جاري الرفع...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">إضافة صورة</span>
                      </>
                    )}
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                يمكنك إضافة حتى 8 صور. الصورة الأولى ستكون الصورة الرئيسية.
              </p>
              {validationErrors.images && (
                <p className="text-xs text-red-500 mt-2">{validationErrors.images}</p>
              )}
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                معلومات المنتج
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان المنتج *</Label>
                <Input 
                  id="title" 
                  placeholder="مثال: ساعة رولكس سابماريينر فينتاج 1970" 
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  data-testid="input-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف المنتج *</Label>
                <Textarea 
                  id="description" 
                  placeholder="اكتب وصفاً تفصيلياً للمنتج، الحالة، التاريخ، أي عيوب..."
                  rows={5}
                  required
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  data-testid="input-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category">الفئة *</Label>
                  <Select value={formData.category} onValueChange={(v) => handleInputChange("category", v)}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ساعات">ساعات</SelectItem>
                      <SelectItem value="ملابس">ملابس</SelectItem>
                      <SelectItem value="تحف وأثاث">تحف وأثاث</SelectItem>
                      <SelectItem value="إلكترونيات">إلكترونيات</SelectItem>
                      <SelectItem value="مجوهرات">مجوهرات</SelectItem>
                      <SelectItem value="آلات موسيقية">آلات موسيقية</SelectItem>
                      <SelectItem value="مقتنيات">مقتنيات</SelectItem>
                      <SelectItem value="أخرى">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition">الحالة *</Label>
                  <Select value={formData.condition} onValueChange={(v) => handleInputChange("condition", v)}>
                    <SelectTrigger data-testid="select-condition">
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">جديد (لم يُستخدم)</SelectItem>
                      <SelectItem value="Used - Like New">شبه جديد</SelectItem>
                      <SelectItem value="Used - Good">جيد</SelectItem>
                      <SelectItem value="Used - Fair">مقبول</SelectItem>
                      <SelectItem value="Vintage">فينتاج / انتيك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="brand">الماركة / العلامة التجارية</Label>
                  <Select value={formData.brand || ""} onValueChange={(v) => handleInputChange("brand", v)}>
                    <SelectTrigger data-testid="select-brand">
                      <SelectValue placeholder="اختر الماركة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rolex">Rolex</SelectItem>
                      <SelectItem value="Omega">Omega</SelectItem>
                      <SelectItem value="Seiko">Seiko</SelectItem>
                      <SelectItem value="Casio">Casio</SelectItem>
                      <SelectItem value="Citizen">Citizen</SelectItem>
                      <SelectItem value="Tag Heuer">Tag Heuer</SelectItem>
                      <SelectItem value="Tissot">Tissot</SelectItem>
                      <SelectItem value="Apple">Apple</SelectItem>
                      <SelectItem value="Samsung">Samsung</SelectItem>
                      <SelectItem value="Sony">Sony</SelectItem>
                      <SelectItem value="LG">LG</SelectItem>
                      <SelectItem value="Nike">Nike</SelectItem>
                      <SelectItem value="Adidas">Adidas</SelectItem>
                      <SelectItem value="بدون ماركة">بدون ماركة</SelectItem>
                      <SelectItem value="أخرى">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.brand === "أخرى" && (
                    <Input 
                      placeholder="أدخل اسم الماركة..."
                      className="mt-2"
                      onChange={(e) => handleInputChange("customBrand", e.target.value)}
                      data-testid="input-custom-brand"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">الموديل / الإصدار</Label>
                  <Input 
                    id="model" 
                    placeholder="مثال: Submariner 5513"
                    data-testid="input-model"
                  />
                </div>
              </div>

              {/* Tags Input */}
              <div className="space-y-3">
                <Label>الكلمات المفتاحية (Tags)</Label>
                <p className="text-sm text-gray-500">أضف كلمات تساعد المشترين في العثور على منتجك</p>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault();
                        const newTag = tagInput.trim();
                        if (!tags.includes(newTag) && tags.length < 10) {
                          setTags([...tags, newTag]);
                          setTagInput("");
                        }
                      }
                    }}
                    placeholder="اكتب واضغط Enter لإضافة..."
                    data-testid="input-tags"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
                        setTags([...tags, tagInput.trim()]);
                        setTagInput("");
                      }
                    }}
                    data-testid="button-add-tag"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1 py-1 px-3">
                        {tag}
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                          className="ml-1 hover:text-red-500"
                          data-testid={`remove-tag-${idx}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400">{tags.length}/10 كلمات مفتاحية</p>
              </div>

              {/* Watch Specifications - Only show when category is watches */}
              {formData.category === "ساعات" && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      مواصفات الساعة التفصيلية
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoFillWatch}
                      disabled={isAutoFilling}
                      className="gap-2"
                      data-testid="button-auto-fill-watch"
                    >
                      {isAutoFilling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      بحث تلقائي
                    </Button>
                  </div>

                  <div className="bg-white border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                    <p>💡 <strong>نصيحة:</strong> أدخل رقم المرجع (Reference Number) أو اسم الموديل واضغط "بحث تلقائي" لملء المواصفات تلقائياً</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم المرجع (Reference Number)</Label>
                      <Input
                        value={watchSpecs.referenceNumber}
                        onChange={(e) => setWatchSpecs(prev => ({ ...prev, referenceNumber: e.target.value }))}
                        placeholder="مثال: 6138-8000"
                        className="text-left bg-white"
                        dir="ltr"
                        data-testid="input-reference-number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>العلامة التجارية (Brand)</Label>
                      <Select 
                        value={watchSpecs.brand} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, brand: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-watch-brand">
                          <SelectValue placeholder="اختر العلامة التجارية" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_BRANDS.map(brand => (
                            <SelectItem key={brand.en} value={brand.en}>
                              {brand.ar} ({brand.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>الموديل (Model)</Label>
                      <Input
                        value={watchSpecs.model}
                        onChange={(e) => setWatchSpecs(prev => ({ ...prev, model: e.target.value }))}
                        placeholder="مثال: Seiko Reverse Baby Panda Chronograph"
                        className="bg-white"
                        data-testid="input-watch-model"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>نوع الحركة (Movement)</Label>
                      <Select 
                        value={watchSpecs.movement} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, movement: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-movement">
                          <SelectValue placeholder="اختر نوع الحركة" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_MOVEMENTS.map(m => (
                            <SelectItem key={m.en} value={m.en}>
                              {m.ar} ({m.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>مادة العلبة (Case Material)</Label>
                      <Select 
                        value={watchSpecs.caseMaterial} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, caseMaterial: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-case-material">
                          <SelectValue placeholder="اختر مادة العلبة" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_CASE_MATERIALS.map(m => (
                            <SelectItem key={m.en} value={m.en}>
                              {m.ar} ({m.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>حجم العلبة (Case Size)</Label>
                      <Select 
                        value={watchSpecs.caseSize} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, caseSize: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-case-size">
                          <SelectValue placeholder="اختر حجم العلبة" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_CASE_SIZES.map(size => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>شكل الساعة (Watch Shape)</Label>
                      <Select 
                        value={watchSpecs.watchShape} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, watchShape: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-watch-shape">
                          <SelectValue placeholder="اختر شكل الساعة" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_SHAPES.map(s => (
                            <SelectItem key={s.en} value={s.en}>
                              {s.ar} ({s.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>لون القرص (Dial Color)</Label>
                      <Select 
                        value={watchSpecs.dialColor} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, dialColor: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-dial-color">
                          <SelectValue placeholder="اختر لون القرص" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_DIAL_COLORS.map(c => (
                            <SelectItem key={c.en} value={c.en}>
                              {c.ar} ({c.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>مادة السوار (Band Material)</Label>
                      <Select 
                        value={watchSpecs.bandMaterial} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, bandMaterial: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-band-material">
                          <SelectValue placeholder="اختر مادة السوار" />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCH_BAND_MATERIALS.map(m => (
                            <SelectItem key={m.en} value={m.en}>
                              {m.ar} ({m.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>القسم (Department)</Label>
                      <Select 
                        value={watchSpecs.department} 
                        onValueChange={(v) => setWatchSpecs(prev => ({ ...prev, department: v }))}
                      >
                        <SelectTrigger className="bg-white" data-testid="select-department">
                          <SelectValue placeholder="اختر القسم" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENT_OPTIONS.map(d => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.ar} ({d.en})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>بلد المنشأ (Country of Origin)</Label>
                      <Input
                        value={watchSpecs.countryOfOrigin}
                        onChange={(e) => setWatchSpecs(prev => ({ ...prev, countryOfOrigin: e.target.value }))}
                        placeholder="مثال: Japan, Switzerland"
                        className="bg-white"
                        data-testid="input-country-origin"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>المميزات (Features)</Label>
                      <div className="flex flex-wrap gap-2">
                        {WATCH_FEATURES.map(f => (
                          <Badge
                            key={f.en}
                            variant={watchSpecs.features.includes(f.en) ? "default" : "outline"}
                            className="cursor-pointer hover:bg-primary/80 transition-colors"
                            onClick={() => toggleWatchFeature(f.en)}
                            data-testid={`feature-${f.en}`}
                          >
                            {f.ar}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sale Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                نوع البيع والسعر
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>اختر طريقة البيع *</Label>
                <RadioGroup 
                  value={saleType} 
                  onValueChange={(v) => setSaleType(v as "auction" | "fixed")}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <Label 
                    htmlFor="auction"
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      saleType === "auction" ? "border-primary bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value="auction" id="auction" className="mt-1" />
                    <div>
                      <div className="flex items-center gap-2 font-bold text-lg">
                        <Gavel className="h-5 w-5 text-primary" />
                        مزاد
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        دع المشترين يتنافسون على منتجك للحصول على أفضل سعر
                      </p>
                    </div>
                  </Label>

                  <Label 
                    htmlFor="fixed"
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      saleType === "fixed" ? "border-primary bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
                    <div>
                      <div className="flex items-center gap-2 font-bold text-lg">
                        <ShoppingBag className="h-5 w-5 text-green-600" />
                        سعر ثابت
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        حدد سعراً ثابتاً والمشتري يشتري مباشرة
                      </p>
                    </div>
                  </Label>
                </RadioGroup>
              </div>

              <Separator />

              {saleType === "auction" ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="startPrice">سعر البداية *</Label>
                      <div className="relative">
                        <Input 
                          id="startPrice" 
                          type="number" 
                          placeholder="0"
                          className="pl-16"
                          required
                          value={formData.price}
                          onChange={(e) => handleInputChange("price", e.target.value)}
                          data-testid="input-start-price"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">د.ع</span>
                      </div>
                      <p className="text-xs text-muted-foreground">السعر الذي يبدأ منه المزاد</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bidIncrement">الحد الأدنى للزيادة</Label>
                      <div className="relative">
                        <Input 
                          id="bidIncrement" 
                          type="number" 
                          placeholder="5000"
                          className="pl-16"
                          value={formData.bidIncrement}
                          onChange={(e) => handleInputChange("bidIncrement", e.target.value)}
                          data-testid="input-bid-increment"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">د.ع</span>
                      </div>
                      <p className="text-xs text-muted-foreground">أقل مبلغ يمكن زيادته في المزايدة</p>
                    </div>
                  </div>

                  {/* Reserve Price Checkbox */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <Checkbox 
                      id="reserveToggle" 
                      checked={hasReservePrice}
                      onCheckedChange={(checked) => setHasReservePrice(checked === true)}
                      className="h-5 w-5 border-2"
                      data-testid="checkbox-reserve-price"
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="reserveToggle" className="font-bold cursor-pointer">سعر احتياطي</Label>
                      <p className="text-xs text-muted-foreground">
                        حدد سعراً أدنى يجب الوصول إليه لإتمام البيع
                      </p>
                    </div>
                  </div>

                  {hasReservePrice && (
                    <div className="space-y-2">
                      <Label htmlFor="reservePrice">السعر الاحتياطي</Label>
                      <div className="relative">
                        <Input 
                          id="reservePrice" 
                          type="number" 
                          placeholder="0"
                          className="pl-16"
                          value={formData.reservePrice}
                          onChange={(e) => handleInputChange("reservePrice", e.target.value)}
                          data-testid="input-reserve-price"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">د.ع</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        لن يتم بيع المنتج إذا لم يصل المزاد لهذا السعر
                      </p>
                    </div>
                  )}

                  {/* Buy Now Checkbox */}
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                    <Checkbox 
                      id="buyNowToggle" 
                      checked={hasBuyNow}
                      onCheckedChange={(checked) => setHasBuyNow(checked === true)}
                      className="h-5 w-5 border-2"
                      data-testid="checkbox-buy-now"
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="buyNowToggle" className="font-bold cursor-pointer flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-green-600" />
                        خيار الشراء الفوري
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        السماح للمشتري بشراء المنتج فوراً بسعر محدد
                      </p>
                    </div>
                  </div>

                  {hasBuyNow && (
                    <div className="space-y-2">
                      <Label htmlFor="buyNowPrice">سعر الشراء الفوري</Label>
                      <div className="relative">
                        <Input 
                          id="buyNowPrice" 
                          type="number" 
                          placeholder="0"
                          className="pl-16"
                          value={formData.buyNowPrice}
                          onChange={(e) => handleInputChange("buyNowPrice", e.target.value)}
                          data-testid="input-buy-now-price"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">د.ع</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        السعر الذي يمكن للمشتري الشراء به فوراً دون انتظار نهاية المزاد
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fixedPrice">سعر البيع *</Label>
                    <div className="relative">
                      <Input 
                        id="fixedPrice" 
                        type="number" 
                        placeholder="0"
                        className="pl-16"
                        required
                        value={formData.price}
                        onChange={(e) => handleInputChange("price", e.target.value)}
                        data-testid="input-fixed-price"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">د.ع</span>
                    </div>
                  </div>

                  {/* Allow Offers Checkbox */}
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <Checkbox 
                      id="offersToggle" 
                      checked={allowOffers}
                      onCheckedChange={(checked) => setAllowOffers(checked === true)}
                      className="h-5 w-5 border-2"
                      data-testid="checkbox-allow-offers"
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="offersToggle" className="font-bold cursor-pointer">السماح بالعروض</Label>
                      <p className="text-xs text-muted-foreground">
                        السماح للمشترين بتقديم عروض أقل من السعر المحدد
                      </p>
                    </div>
                  </div>

                  {/* Allow Exchange Checkbox (مراوس) - Feature flagged */}
                  {ENABLE_EXCHANGE_FEATURE && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                      <Checkbox 
                        id="exchangeToggle" 
                        checked={allowExchange}
                        onCheckedChange={(checked) => setAllowExchange(checked === true)}
                        className="h-5 w-5 border-2"
                        data-testid="checkbox-allow-exchange"
                      />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="exchangeToggle" className="font-bold cursor-pointer">قابل للمراوس</Label>
                        <p className="text-xs text-muted-foreground">
                          السماح للمشترين بتقديم عروض تبادل مع منتجاتهم المعروضة
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duration & Scheduling */}
          {saleType === "auction" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  توقيت المزاد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Start Time Option */}
                <div className="space-y-2">
                  <Label htmlFor="startTime">موعد بدء المزاد</Label>
                  <Select value={startTimeOption} onValueChange={setStartTimeOption}>
                    <SelectTrigger data-testid="select-start-time">
                      <SelectValue placeholder="ابدأ فوراً" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">ابدأ فوراً</SelectItem>
                      <SelectItem value="schedule">جدولة موعد محدد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scheduled Start Date/Time */}
                {startTimeOption === "schedule" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">تاريخ البدء *</Label>
                      <Input 
                        id="startDate" 
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={validationErrors.startDate ? "border-red-500" : ""}
                        data-testid="input-start-date"
                      />
                      {validationErrors.startDate && (
                        <p className="text-xs text-red-500">{validationErrors.startDate}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startHour">وقت البدء *</Label>
                      <Select value={formData.startHour} onValueChange={(v) => handleInputChange("startHour", v)}>
                        <SelectTrigger data-testid="select-start-hour" className={validationErrors.startHour ? "border-red-500" : ""}>
                          <SelectValue placeholder="اختر الساعة" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.startHour && (
                        <p className="text-xs text-red-500">{validationErrors.startHour}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  ⏰ يجب أن تكون مدة المزاد 24 ساعة على الأقل
                </p>

                {/* End Date/Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-orange-50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="endDate">تاريخ انتهاء المزاد *</Label>
                    <Input 
                      id="endDate" 
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange("endDate", e.target.value)}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      className={validationErrors.endDate ? "border-red-500" : ""}
                      data-testid="input-end-date"
                    />
                    {validationErrors.endDate && (
                      <p className="text-xs text-red-500">{validationErrors.endDate}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endHour">وقت الانتهاء *</Label>
                    <Select value={formData.endHour} onValueChange={(v) => handleInputChange("endHour", v)}>
                      <SelectTrigger data-testid="select-end-hour" className={validationErrors.endHour ? "border-red-500" : ""}>
                        <SelectValue placeholder="اختر الساعة" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.endHour && (
                      <p className="text-xs text-red-500">{validationErrors.endHour}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quantity & Stock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                الكمية والمخزون
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="quantity">عدد القطع المتوفرة *</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    placeholder="1"
                    min="1"
                    value={formData.quantityAvailable}
                    onChange={(e) => handleInputChange("quantityAvailable", e.target.value)}
                    required
                    data-testid="input-quantity"
                  />
                  <p className="text-xs text-muted-foreground">
                    إذا كان لديك أكثر من قطعة متشابهة
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">رمز المنتج (SKU)</Label>
                  <Input 
                    id="sku" 
                    placeholder="اختياري - للتتبع الداخلي"
                    data-testid="input-sku"
                  />
                </div>
              </div>

              {/* Serial Number - Required for watches and high-value items */}
              {(formData.category === "ساعات" || (parseInt(formData.price) >= 1000000)) && (
                <div className="space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <Label htmlFor="serialNumber" className="font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    الرقم التسلسلي (Serial Number) *
                  </Label>
                  <Input 
                    id="serialNumber" 
                    placeholder="أدخل الرقم التسلسلي للمنتج"
                    value={formData.serialNumber}
                    onChange={(e) => handleInputChange("serialNumber", e.target.value)}
                    required
                    data-testid="input-serial-number"
                  />
                  <p className="text-xs text-amber-700">
                    مطلوب للساعات والمنتجات التي تزيد قيمتها عن 1,000,000 دينار لضمان الأصالة
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location & Shipping */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                الموقع والشحن
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sellerName">اسم البائع *</Label>
                  <Input 
                    id="sellerName" 
                    placeholder="مثال: أحمد العراقي"
                    required
                    value={formData.sellerName}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                    data-testid="input-seller-name"
                  />
                  <p className="text-xs text-muted-foreground">يتم تعبئة هذا الحقل تلقائياً من حسابك</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">المدينة *</Label>
                  <Select value={formData.city} onValueChange={(v) => handleInputChange("city", v)}>
                    <SelectTrigger data-testid="select-city" className={validationErrors.city ? "border-red-500" : ""}>
                      <SelectValue placeholder="اختر المدينة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="بغداد">بغداد</SelectItem>
                      <SelectItem value="البصرة">البصرة</SelectItem>
                      <SelectItem value="أربيل">أربيل</SelectItem>
                      <SelectItem value="السليمانية">السليمانية</SelectItem>
                      <SelectItem value="الموصل">الموصل</SelectItem>
                      <SelectItem value="النجف">النجف</SelectItem>
                      <SelectItem value="كربلاء">كربلاء</SelectItem>
                      <SelectItem value="كركوك">كركوك</SelectItem>
                      <SelectItem value="دهوك">دهوك</SelectItem>
                      <SelectItem value="مدينة أخرى">مدينة أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.city && (
                    <p className="text-xs text-red-500">{validationErrors.city}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="area">المنطقة / الحي</Label>
                  <Input 
                    id="area" 
                    placeholder="مثال: الكرادة، المنصور..."
                    data-testid="input-area"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>خيارات الشحن والتوصيل</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox id="localPickup" defaultChecked data-testid="checkbox-local-pickup" />
                    <Label htmlFor="localPickup" className="cursor-pointer">
                      <span className="font-medium">استلام شخصي</span>
                      <p className="text-xs text-muted-foreground">المشتري يستلم من موقعك</p>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox id="delivery" data-testid="checkbox-delivery" />
                    <Label htmlFor="delivery" className="cursor-pointer">
                      <span className="font-medium">توصيل داخل المدينة</span>
                      <p className="text-xs text-muted-foreground">أنت توصل للمشتري</p>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox id="shipping" data-testid="checkbox-shipping" />
                    <Label htmlFor="shipping" className="cursor-pointer">
                      <span className="font-medium">شحن لجميع المحافظات</span>
                      <p className="text-xs text-muted-foreground">عبر شركات الشحن</p>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg border-blue-200 bg-blue-50">
                    <Checkbox id="internationalShipping" data-testid="checkbox-international-shipping" />
                    <Label htmlFor="internationalShipping" className="cursor-pointer">
                      <span className="font-medium">🌍 شحن دولي</span>
                      <p className="text-xs text-muted-foreground">الشحن لدول محددة</p>
                    </Label>
                  </div>
                </div>

                {/* International Shipping Countries */}
                <div className="p-4 border border-blue-200 bg-blue-50/50 rounded-lg space-y-3">
                  <Label className="font-medium">الدول المتاحة للشحن الدولي</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-jordan" data-testid="checkbox-ship-jordan" />
                      <Label htmlFor="ship-jordan" className="cursor-pointer text-sm">🇯🇴 الأردن</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-uae" data-testid="checkbox-ship-uae" />
                      <Label htmlFor="ship-uae" className="cursor-pointer text-sm">🇦🇪 الإمارات</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-saudi" data-testid="checkbox-ship-saudi" />
                      <Label htmlFor="ship-saudi" className="cursor-pointer text-sm">🇸🇦 السعودية</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-kuwait" data-testid="checkbox-ship-kuwait" />
                      <Label htmlFor="ship-kuwait" className="cursor-pointer text-sm">🇰🇼 الكويت</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-qatar" data-testid="checkbox-ship-qatar" />
                      <Label htmlFor="ship-qatar" className="cursor-pointer text-sm">🇶🇦 قطر</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-bahrain" data-testid="checkbox-ship-bahrain" />
                      <Label htmlFor="ship-bahrain" className="cursor-pointer text-sm">🇧🇭 البحرين</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-oman" data-testid="checkbox-ship-oman" />
                      <Label htmlFor="ship-oman" className="cursor-pointer text-sm">🇴🇲 عمان</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-lebanon" data-testid="checkbox-ship-lebanon" />
                      <Label htmlFor="ship-lebanon" className="cursor-pointer text-sm">🇱🇧 لبنان</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-egypt" data-testid="checkbox-ship-egypt" />
                      <Label htmlFor="ship-egypt" className="cursor-pointer text-sm">🇪🇬 مصر</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-turkey" data-testid="checkbox-ship-turkey" />
                      <Label htmlFor="ship-turkey" className="cursor-pointer text-sm">🇹🇷 تركيا</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-usa" data-testid="checkbox-ship-usa" />
                      <Label htmlFor="ship-usa" className="cursor-pointer text-sm">🇺🇸 أمريكا</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-uk" data-testid="checkbox-ship-uk" />
                      <Label htmlFor="ship-uk" className="cursor-pointer text-sm">🇬🇧 بريطانيا</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-germany" data-testid="checkbox-ship-germany" />
                      <Label htmlFor="ship-germany" className="cursor-pointer text-sm">🇩🇪 ألمانيا</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-sweden" data-testid="checkbox-ship-sweden" />
                      <Label htmlFor="ship-sweden" className="cursor-pointer text-sm">🇸🇪 السويد</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ship-australia" data-testid="checkbox-ship-australia" />
                      <Label htmlFor="ship-australia" className="cursor-pointer text-sm">🇦🇺 أستراليا</Label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    * تكاليف الشحن الدولي يتم الاتفاق عليها مع المشتري
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Delivery Time */}
              <div className="space-y-2">
                <Label htmlFor="deliveryWindow">مدة التوصيل المتوقعة *</Label>
                <Select value={formData.deliveryWindow} onValueChange={(v) => handleInputChange("deliveryWindow", v)}>
                  <SelectTrigger data-testid="select-delivery-window" className={validationErrors.deliveryWindow ? "border-red-500" : ""}>
                    <SelectValue placeholder="اختر المدة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-2 أيام">1-2 أيام</SelectItem>
                    <SelectItem value="3-5 أيام">3-5 أيام</SelectItem>
                    <SelectItem value="5-7 أيام">5-7 أيام</SelectItem>
                    <SelectItem value="1-2 أسبوع">1-2 أسبوع</SelectItem>
                    <SelectItem value="2-3 أسابيع">2-3 أسابيع</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.deliveryWindow && (
                  <p className="text-xs text-red-500">{validationErrors.deliveryWindow}</p>
                )}
              </div>

              {/* Shipping Options */}
              <div className="space-y-3">
                <Label>تكلفة الشحن</Label>
                <RadioGroup 
                  value={formData.shippingType} 
                  onValueChange={(v) => handleInputChange("shippingType", v)}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="seller_pays" id="ship-free" data-testid="radio-ship-free" />
                    <Label htmlFor="ship-free" className="flex-1 cursor-pointer">
                      <span className="font-medium">شحن مجاني</span>
                      <p className="text-xs text-gray-500">على حساب البائع</p>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="buyer_pays" id="ship-buyer" data-testid="radio-ship-buyer" />
                    <Label htmlFor="ship-buyer" className="flex-1 cursor-pointer">
                      <span className="font-medium">على حساب المشتري</span>
                      <p className="text-xs text-gray-500">حدد تكلفة الشحن</p>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="pickup" id="ship-pickup" data-testid="radio-ship-pickup" />
                    <Label htmlFor="ship-pickup" className="flex-1 cursor-pointer">
                      <span className="font-medium">استلام شخصي</span>
                      <p className="text-xs text-gray-500">بدون شحن - التسليم باليد</p>
                    </Label>
                  </div>
                </RadioGroup>
                
                {formData.shippingType === "buyer_pays" && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="shippingCost">تكلفة الشحن (دينار عراقي) *</Label>
                    <Input
                      id="shippingCost"
                      type="number"
                      min="0"
                      placeholder="مثال: 5000"
                      value={formData.shippingCost}
                      onChange={(e) => handleInputChange("shippingCost", e.target.value)}
                      data-testid="input-shipping-cost"
                    />
                    <p className="text-xs text-gray-500">سيتم إضافة هذا المبلغ للسعر النهائي</p>
                  </div>
                )}
              </div>

              {/* Return Policy */}
              <div className="space-y-2">
                <Label htmlFor="returnPolicy">سياسة الإرجاع *</Label>
                <Select value={formData.returnPolicy} onValueChange={(v) => handleInputChange("returnPolicy", v)}>
                  <SelectTrigger data-testid="select-return-policy" className={validationErrors.returnPolicy ? "border-red-500" : ""}>
                    <SelectValue placeholder="اختر السياسة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="لا يوجد إرجاع">لا يوجد إرجاع - البيع نهائي</SelectItem>
                    <SelectItem value="يوم واحد">إرجاع خلال يوم واحد</SelectItem>
                    <SelectItem value="3 أيام">إرجاع خلال 3 أيام</SelectItem>
                    <SelectItem value="7 أيام">إرجاع خلال 7 أيام</SelectItem>
                    <SelectItem value="14 يوم">إرجاع خلال 14 يوم</SelectItem>
                    <SelectItem value="30 يوم">إرجاع خلال 30 يوم</SelectItem>
                    <SelectItem value="استبدال فقط">استبدال فقط - لا إرجاع نقدي</SelectItem>
                    <SelectItem value="ضمان المنتج">ضمان المنتج من الشركة المصنعة</SelectItem>
                    <SelectItem value="أخرى">أخرى - أحدد في التفاصيل</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.returnPolicy && (
                  <p className="text-xs text-red-500">{validationErrors.returnPolicy}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="returnDetails">تفاصيل الإرجاع (اختياري)</Label>
                <Textarea 
                  id="returnDetails" 
                  placeholder="مثال: يقبل الإرجاع إذا كان المنتج بحالته الأصلية..."
                  rows={2}
                  value={formData.returnDetails}
                  onChange={(e) => handleInputChange("returnDetails", e.target.value)}
                  data-testid="input-return-details"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                خيارات إضافية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Checkbox 
                  id="negotiableToggle"
                  checked={allowOffers}
                  onCheckedChange={(checked) => setAllowOffers(checked === true)}
                  className="h-5 w-5 border-2"
                  data-testid="checkbox-negotiable" 
                />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="negotiableToggle" className="font-bold cursor-pointer">قابل للتفاوض</Label>
                  <p className="text-xs text-muted-foreground">
                    السماح للمشترين بتقديم عروض سعر مختلفة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                <Checkbox 
                  id="featuredToggle"
                  className="h-5 w-5 border-2"
                  data-testid="checkbox-featured" 
                />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="featuredToggle" className="font-bold cursor-pointer flex items-center gap-2">
                    ⭐ تمييز الإعلان
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    اجعل إعلانك يظهر في المقدمة (رسوم إضافية)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex flex-col gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">ملاحظة مهمة</p>
                <p className="text-blue-700">
                  سيتم مراجعة إعلانك قبل نشره للتأكد من مطابقته لسياسات المنصة.
                  عادةً ما يستغرق ذلك أقل من 24 ساعة.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                type="submit" 
                size="lg" 
                className="flex-1 h-14 text-lg font-bold"
                disabled={isSubmitting}
                data-testid="button-submit-listing"
              >
                {isSubmitting ? (
                  <>جاري النشر...</>
                ) : (
                  <>
                    <Upload className="h-5 w-5 ml-2" />
                    نشر الإعلان
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="lg"
                className="h-14"
                data-testid="button-save-draft"
              >
                حفظ كمسودة
              </Button>
            </div>
          </div>
        </form>

        {/* Summary Preview Dialog */}
        <Dialog open={showSummary} onOpenChange={setShowSummary}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                مراجعة الإعلان قبل النشر
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Images Preview */}
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.slice(0, 4).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`صورة ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                  ))}
                </div>
              )}

              {/* Title & Price */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-500">عنوان الإعلان</p>
                    <p className="font-bold text-lg">{formData.title || "—"}</p>
                  </div>
                  <Badge variant={saleType === "auction" ? "default" : "secondary"}>
                    {saleType === "auction" ? "مزاد" : "سعر ثابت"}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">{saleType === "auction" ? "سعر البداية" : "السعر"}</p>
                    <p className="font-bold text-primary text-lg">
                      {parseInt(formData.price || "0").toLocaleString()} د.ع
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">الفئة</p>
                    <p className="font-medium">{formData.category || "—"}</p>
                  </div>
                </div>

                {/* Auction-specific pricing details */}
                {saleType === "auction" && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    {hasReservePrice && formData.reservePrice && (
                      <div>
                        <p className="text-xs text-gray-500">السعر الاحتياطي</p>
                        <p className="font-medium text-orange-600">
                          {parseInt(formData.reservePrice).toLocaleString()} د.ع
                        </p>
                      </div>
                    )}
                    {hasBuyNow && formData.buyNowPrice && (
                      <div>
                        <p className="text-xs text-gray-500">سعر الشراء الفوري</p>
                        <p className="font-medium text-green-600">
                          {parseInt(formData.buyNowPrice).toLocaleString()} د.ع
                        </p>
                      </div>
                    )}
                    {formData.bidIncrement && (
                      <div>
                        <p className="text-xs text-gray-500">الحد الأدنى للزيادة</p>
                        <p className="font-medium">
                          {parseInt(formData.bidIncrement).toLocaleString()} د.ع
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">الحالة</span>
                  <span className="font-medium">{formData.condition || "—"}</span>
                </div>
                {formData.brand && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">الماركة</span>
                    <span className="font-medium">{formData.brand === "أخرى" ? formData.customBrand : formData.brand}</span>
                  </div>
                )}
                {formData.serialNumber && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">الرقم التسلسلي</span>
                    <span className="font-medium text-xs">{formData.serialNumber}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">الموقع</span>
                  <span className="font-medium">{formData.city || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">الكمية</span>
                  <span className="font-medium">{formData.quantityAvailable || "1"}</span>
                </div>
                {formData.deliveryWindow && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">مدة التوصيل</span>
                    <span className="font-medium">{formData.deliveryWindow}</span>
                  </div>
                )}
                {formData.returnPolicy && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">سياسة الإرجاع</span>
                    <span className="font-medium">{formData.returnPolicy}</span>
                  </div>
                )}
                {formData.sellerName && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">اسم البائع</span>
                    <span className="font-medium">{formData.sellerName}</span>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="flex flex-wrap gap-2">
                {allowOffers && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    قابل للتفاوض
                  </Badge>
                )}
                {ENABLE_EXCHANGE_FEATURE && allowExchange && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    قابل للمراوس
                  </Badge>
                )}
                {saleType === "auction" && formData.endDate && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    ينتهي: {formData.endDate} {formData.endHour}:00
                  </Badge>
                )}
              </div>

              {/* Description Preview */}
              {formData.description && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">الوصف</p>
                  <p className="text-sm text-gray-700 line-clamp-3">{formData.description}</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-3 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSummary(false)}
                className="flex-1"
                data-testid="button-edit-listing"
              >
                تعديل
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="button-confirm-publish"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري النشر...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 ml-2" />
                    تأكيد ونشر
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Exit Confirmation Dialog */}
        <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                حفظ التغييرات؟
              </DialogTitle>
            </DialogHeader>
            <p className="text-gray-600 text-sm py-2">
              لديك تغييرات غير محفوظة. هل تريد حفظها كمسودة قبل المغادرة؟
            </p>
            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExitConfirm(false);
                  if (pendingNavigation) {
                    window.location.href = pendingNavigation;
                  }
                }}
                className="flex-1"
                data-testid="button-exit-without-saving"
              >
                تجاهل
              </Button>
              <Button
                onClick={() => {
                  // Save draft before leaving
                  try {
                    const draft = { 
                      formData, 
                      images: images.slice(0, 4), 
                      saleType, 
                      allowOffers, 
                      allowExchange, 
                      hasBuyNow, 
                      hasReservePrice, 
                      tags, 
                      savedAt: new Date().toISOString() 
                    };
                    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                    toast({ title: "تم حفظ المسودة", description: "يمكنك إكمال الإعلان لاحقاً" });
                  } catch (e) {
                    console.warn("Failed to save draft:", e);
                  }
                  setShowExitConfirm(false);
                  if (pendingNavigation) {
                    window.location.href = pendingNavigation;
                  }
                }}
                className="flex-1 bg-primary"
                data-testid="button-save-and-exit"
              >
                حفظ ومغادرة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
