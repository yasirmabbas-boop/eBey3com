import { useState, useEffect, useCallback } from "react";
import { useLocation, Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import type { Listing, SellerAddress } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { authFetch } from "@/lib/api";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { SellWizard, ImageUploadSection } from "@/components/sell";
import { CategorySpecificFields, validateCategorySpecifications } from "@/components/sell/CategorySpecificFields";
import { SellerAddressModal } from "@/components/seller-address-modal";
import { capturePhoto } from "@/lib/nativeCamera";
import { isNative } from "@/lib/capacitor";
import { 
  DollarSign,
  Gavel,
  ShoppingBag,
  Plus,
  X,
  CheckCircle2,
  Clock,
  Lock,
  Loader2,
  Package,
  MessageSquare,
  AlertTriangle,
  MapPin,
  Edit
} from "lucide-react";

const IRAQI_CITIES = [
  "بغداد", "البصرة", "أربيل", "السليمانية", "دهوك", "الموصل",
  "كركوك", "الأنبار", "بابل", "ديالى", "كربلاء", "النجف",
  "واسط", "ذي قار", "ميسان", "المثنى", "القادسية", "صلاح الدين"
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: hour, label: `${hour}:00` };
});

const IRAQI_PROVINCES = [
  "بغداد", "البصرة", "أربيل", "السليمانية", "دهوك", "الموصل",
  "كركوك", "الأنبار", "بابل", "ديالى", "كربلاء", "النجف",
  "واسط", "ذي قار", "ميسان", "المثنى", "القادسية", "صلاح الدين"
];

export default function SellWizardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { user, isLoading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  
  // Parse query parameters for edit, relist, and template modes
  const urlParams = new URLSearchParams(searchString);
  const editListingId = urlParams.get("edit");
  const relistListingId = urlParams.get("relist");
  const templateListingId = urlParams.get("template");
  
  const isEditMode = !!editListingId;
  const isRelistMode = !!relistListingId;
  const isTemplateMode = !!templateListingId;
  const sourceListingId = editListingId || relistListingId || templateListingId;
  
  const { data: sourceListing, isLoading: sourceListingLoading } = useQuery<Listing>({
    queryKey: ["/api/listings", sourceListingId],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${sourceListingId}`);
      if (!res.ok) throw new Error("Listing not found");
      return res.json();
    },
    enabled: !!sourceListingId,
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [wasAIFilled, setWasAIFilled] = useState(false);
  const [cleaningIndex, setCleaningIndex] = useState<number | null>(null);
  const [cleanErrorByIndex, setCleanErrorByIndex] = useState<Record<number, string>>({});
  
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saleType, setSaleType] = useState<"auction" | "fixed">("auction");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [hasReservePrice, setHasReservePrice] = useState(false);
  const [startTimeOption, setStartTimeOption] = useState<"now" | "schedule">("now");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    condition: "",
    brand: "",
    price: "",
    buyNowPrice: "",
    reservePrice: "",
    endDate: "",
    endHour: "23",
    city: "",
    area: "",
    deliveryWindow: "3-5 أيام",
    shippingType: "seller_pays",
    shippingCost: "",
    returnPolicy: "",
    startDate: "",
    startHour: "00",
    quantityAvailable: "1",
    sellerName: "",
    allowedBidderType: "verified_only",
  });
  
  // Category-specific specifications (e.g., size, gender for clothing)
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  const [specificationErrors, setSpecificationErrors] = useState<Record<string, string>>({});

  // Draft persistence state — mode-specific keys so drafts don't collide across modes
  const WIZARD_DRAFT_KEY = isEditMode 
    ? `wizard_listing_draft_edit_${editListingId}` 
    : isRelistMode 
      ? `wizard_listing_draft_relist_${relistListingId}` 
      : isTemplateMode 
        ? `wizard_listing_draft_template_${templateListingId}` 
        : "wizard_listing_draft";
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Check if form has content worth saving
  const hasFormContent = useCallback(() => {
    return formData.title || formData.description || formData.price || images.length > 0;
  }, [formData.title, formData.description, formData.price, images.length]);

  // Load draft from localStorage on mount (works for both new and edit modes)
  useEffect(() => {
    if (!draftLoaded) {
      const savedDraft = localStorage.getItem(WIZARD_DRAFT_KEY);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          const values = Object.values(draft.formData || {});
          const hasNonDefault = values.some((v: unknown) => v !== "" && v !== "1" && v !== "23" && v !== "00" && v !== "3-5 أيام" && v !== "seller_pays" && v !== "verified_only");
          if (hasNonDefault) {
            setShowDraftBanner(true);
          }
        } catch (e) {
          localStorage.removeItem(WIZARD_DRAFT_KEY);
        }
      }
      setDraftLoaded(true);
    }
  }, [draftLoaded, WIZARD_DRAFT_KEY]);

  const loadDraft = () => {
    const savedDraft = localStorage.getItem(WIZARD_DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.formData) setFormData(draft.formData);
        if (draft.images) setImages(draft.images);
        if (draft.saleType) setSaleType(draft.saleType);
        if (draft.isNegotiable !== undefined) setIsNegotiable(draft.isNegotiable);
        if (draft.hasReservePrice !== undefined) setHasReservePrice(draft.hasReservePrice);
        if (draft.startTimeOption) setStartTimeOption(draft.startTimeOption);
        if (draft.tags) setTags(draft.tags);
        if (draft.specifications) setSpecifications(draft.specifications);
        if (draft.currentStep) setCurrentStep(draft.currentStep);
        toast({ 
          title: language === "ar" ? "تم استرجاع المسودة" : language === "ku" ? "ڕەشنووس گەڕایەوە" : "تم استرجاع المسودة", 
          description: language === "ar" ? "تم تحميل البيانات المحفوظة مسبقاً" : language === "ku" ? "داتا پاشەکەوتکراوەکان بارکرا" : "تم تحميل البيانات المحفوظة مسبقاً" 
        });
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
    setShowDraftBanner(false);
  };

  const clearDraft = () => {
    localStorage.removeItem(WIZARD_DRAFT_KEY);
    setShowDraftBanner(false);
  };

  const saveDraftToStorage = useCallback(() => {
    try {
      const draft = {
        formData,
        images,
        tags,
        specifications,
        saleType,
        isNegotiable,
        hasReservePrice,
        startTimeOption,
        currentStep,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn("Failed to save draft to localStorage:", e);
    }
  }, [formData, images, tags, specifications, saleType, isNegotiable, hasReservePrice, startTimeOption, currentStep]);

  // Auto-save draft to localStorage with debounce (works for both new and edit modes)
  useEffect(() => {
    if (!draftLoaded || showDraftBanner) return;

    const hasContent = formData.title || formData.description || formData.price || images.length > 0;
    if (!hasContent) return;

    const timeoutId = setTimeout(() => {
      saveDraftToStorage();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [formData, images, tags, specifications, saleType, isNegotiable, hasReservePrice, startTimeOption, currentStep, draftLoaded, showDraftBanner, saveDraftToStorage]);

  // Warn before leaving page with unsaved changes (browser close/refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasFormContent()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasFormContent]);

  // Seller address/location state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SellerAddress | null>(null);

  // Fetch seller's saved addresses
  const { data: sellerAddresses, isLoading: isLoadingAddresses } = useQuery<SellerAddress[]>({
    queryKey: ["/api/seller/addresses"],
    queryFn: async () => {
      const res = await authFetch("/api/seller/addresses");
      if (!res.ok) throw new Error("Failed to fetch addresses");
      return res.json();
    },
    enabled: !!user,
  });

  // Auto-select default address when addresses load
  useEffect(() => {
    if (sellerAddresses && sellerAddresses.length > 0 && !selectedAddress && !sourceListingId) {
      const defaultAddr = sellerAddresses.find(a => a.isDefault) || sellerAddresses[0];
      setSelectedAddress(defaultAddr);
      // Also set the city/area from the address
      setFormData(prev => ({
        ...prev,
        city: defaultAddr.city,
        area: defaultAddr.district || "",
      }));
    }
  }, [sellerAddresses, selectedAddress, sourceListingId]);

  const [isRequestingSellerAccess, setIsRequestingSellerAccess] = useState(false);
  const [sellerFormData, setSellerFormData] = useState({
    shopName: "",
    phone: "",
    city: "",
    description: "",
  });

  const handleRequestSellerAccess = async () => {
    if (!sellerFormData.shopName || !sellerFormData.phone || !sellerFormData.city) {
      toast({
        title: t("error"),
        description: language === "ar" ? "يرجى ملء جميع الحقول المطلوبة" : language === "ku" ? "تکایە هەموو خانەکان پڕ بکەوە" : "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
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
        title: language === "ar" ? "تم تقديم الطلب بنجاح!" : language === "ku" ? "داواکە بە سەرکەوتوویی پێشکەشکرا!" : "تم تقديم الطلب بنجاح!",
        description: language === "ar" ? "سيتم مراجعة طلبك من قبل الإدارة" : language === "ku" ? "داواکەت لەلایەن بەڕێوەبەرایەتی پێداچوونەوەی بۆ دەکرێت" : "سيتم مراجعة طلبك من قبل الإدارة",
      });
      
      window.location.reload();
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRequestingSellerAccess(false);
    }
  };

  useEffect(() => {
    if (user?.displayName && !formData.sellerName && !isEditMode) {
      setFormData(prev => ({ ...prev, sellerName: user.displayName || "" }));
    }
  }, [user, isEditMode]);

  // Populate form when editing, relisting, or using as template
  useEffect(() => {
    if (sourceListing && sourceListingId) {
      // Parse auction times (skip for relist — they need new times)
      let startDate = "";
      let startHour = "00";
      let endDate = "";
      let endHour = "23";
      
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
        title: isTemplateMode ? "" : sourceListing.title ?? "",
        description: sourceListing.description ?? "",
        category: sourceListing.category ?? "",
        condition: sourceListing.condition ?? "",
        brand: sourceListing.brand ?? "",
        price: sourceListing.price?.toString() ?? "",
        buyNowPrice: (sourceListing as any).buyNowPrice?.toString() ?? "",
        reservePrice: (sourceListing as any).reservePrice?.toString() ?? "",
        endDate,
        endHour,
        city: sourceListing.city ?? "",
        area: sourceListing.area ?? "",
        deliveryWindow: sourceListing.deliveryWindow ?? "3-5 أيام",
        shippingType: sourceListing.shippingType ?? "seller_pays",
        shippingCost: sourceListing.shippingCost?.toString() ?? "",
        returnPolicy: sourceListing.returnPolicy ?? "",
        startDate,
        startHour,
        quantityAvailable: isRelistMode ? "1" : sourceListing.quantityAvailable?.toString() ?? "1",
        sellerName: sourceListing.sellerName ?? user?.displayName ?? "",
        allowedBidderType: sourceListing.allowedBidderType ?? "verified_only",
      });
      setImages(sourceListing.images ?? []);
      setSaleType((sourceListing.saleType as "auction" | "fixed") ?? "fixed");
      setIsNegotiable(sourceListing.isNegotiable ?? false);
      setHasReservePrice(!!(sourceListing as any).reservePrice);
      setTags(sourceListing.tags ?? []);
      
      // Set start time option based on whether auction has a scheduled start
      if (sourceListing.auctionStartTime && !isRelistMode) {
        const now = new Date();
        const start = new Date(sourceListing.auctionStartTime);
        if (start > now) {
          setStartTimeOption("schedule");
        }
      }
      
      // Load category-specific specifications
      if ((sourceListing as any).specifications) {
        setSpecifications((sourceListing as any).specifications);
      }
    }
  }, [sourceListing, sourceListingId, isEditMode, isRelistMode, isTemplateMode, user?.displayName]);

  const convertArabicNumerals = (input: string): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let result = input;
    arabicNumerals.forEach((arabic, index) => {
      result = result.replace(new RegExp(arabic, 'g'), index.toString());
    });
    return result;
  };

  const numericFields = ['price', 'buyNowPrice', 'reservePrice', 'shippingCost', 'quantityAvailable'];

  const handleInputChange = useCallback((field: string, value: string) => {
    let processedValue = value;
    if (numericFields.includes(field)) {
      processedValue = convertArabicNumerals(value);
    }
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Clear specifications when category changes (different categories have different fields)
    if (field === "category") {
      setSpecifications({});
      setSpecificationErrors({});
    }
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxFiles = 8 - images.length;
    const filesToUpload = Array.from(files).slice(0, maxFiles);
    
    if (filesToUpload.length === 0) {
      toast({
        title: language === "ar" ? "الحد الأقصى للصور" : language === "ku" ? "زۆرترین ژمارەی وێنە" : "الحد الأقصى للصور",
        description: language === "ar" ? "يمكنك رفع 8 صور كحد أقصى" : language === "ku" ? "دەتوانیت ٨ وێنە زۆرترین بارکەیت" : "يمكنك رفع 8 صور كحد أقصى",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImages(true);
    
    try {
      const compressionOptions = {
        maxSizeMB: 4,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.92,
      };

      const compressedFiles = await Promise.all(
        filesToUpload.map(async (file) => {
          if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
            return file;
          }
          try {
            return await imageCompression(file, compressionOptions);
          } catch {
            return file;
          }
        })
      );

      const formData = new FormData();
      compressedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch("/api/uploads/optimized", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || (language === "ar" ? "فشل في رفع الصور" : language === "ku" ? "شکست لە بارکردنی وێنەکان" : "فشل في رفع الصور"));
      }

      const result = await response.json();
      const uploadedPaths = result.images.map((img: { main: string }) => img.main);
      setImages(prev => [...prev, ...uploadedPaths]);
      
      toast({
        title: language === "ar" ? "تم رفع الصور بنجاح" : language === "ku" ? "وێنەکان بە سەرکەوتوویی بارکران" : "تم رفع الصور بنجاح",
        description: `${language === "ar" ? "تم رفع" : language === "ku" ? "بارکرا" : "تم رفع"} ${uploadedPaths.length} ${language === "ar" ? "صورة (محسّنة)" : language === "ku" ? "وێنە (باشتر کراو)" : "صورة (محسّنة)"}`,
      });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        title: language === "ar" ? "خطأ في رفع الصور" : language === "ku" ? "هەڵە لە بارکردنی وێنەکان" : "خطأ في رفع الصور",
        description: error instanceof Error ? error.message : (language === "ar" ? "حدث خطأ أثناء رفع الصور" : language === "ku" ? "هەڵەیەک ڕوویدا لە کاتی بارکردنی وێنەکان" : "حدث خطأ أثناء رفع الصور"),
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleNativeCamera = async () => {
    if (!isNative) return;

    const maxFiles = 8 - images.length;
    if (maxFiles <= 0) {
      toast({
        title: language === "ar" ? "الحد الأقصى للصور" : language === "ku" ? "زۆرترین ژمارەی وێنە" : "الحد الأقصى للصور",
        description: language === "ar" ? "يمكنك رفع 8 صور كحد أقصى" : language === "ku" ? "دەتوانیت ٨ وێنە زۆرترین بارکەیت" : "يمكنك رفع 8 صور كحد أقصى",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImages(true);

    try {
      const file = await capturePhoto({ source: 'prompt' });
      
      if (!file) {
        setIsUploadingImages(false);
        return;
      }

      let fileToUpload = file;
      if (!(file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic"))) {
        try {
          fileToUpload = await imageCompression(file, {
            maxSizeMB: 4,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            initialQuality: 0.92,
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || (language === "ar" ? "فشل في رفع الصورة" : language === "ku" ? "شکست لە بارکردنی وێنە" : "فشل في رفع الصورة"));
      }

      const result = await response.json();
      const uploadedPaths = result.images.map((img: { main: string }) => img.main);
      setImages(prev => [...prev, ...uploadedPaths]);
      
      toast({
        title: language === "ar" ? "تم رفع الصورة بنجاح" : language === "ku" ? "وێنە بە سەرکەوتوویی بارکرا" : "تم رفع الصورة بنجاح",
        description: language === "ar" ? "تم رفع الصورة (محسّنة)" : language === "ku" ? "وێنە بارکرا (باشتر کراو)" : "تم رفع الصورة (محسّنة)",
      });
    } catch (error) {
      console.error("Camera upload error:", error);
      toast({
        title: language === "ar" ? "خطأ في رفع الصورة" : language === "ku" ? "هەڵە لە بارکردنی وێنە" : "خطأ في رفع الصورة",
        description: error instanceof Error ? error.message : (language === "ar" ? "حدث خطأ أثناء رفع الصورة" : language === "ku" ? "هەڵەیەک ڕوویدا لە کاتی بارکردنی وێنە" : "حدث خطأ أثناء رفع الصورة"),
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const analyzeImageWithAI = async () => {
    if (images.length === 0) {
      toast({
        title: language === "ar" ? "لا توجد صورة" : language === "ku" ? "وێنە نییە" : "لا توجد صورة",
        description: language === "ar" ? "الرجاء رفع صورة أولاً" : language === "ku" ? "تکایە یەکەم جار وێنە بارکە" : "الرجاء رفع صورة أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingImage(true);

    try {
      // Send image URL to server - server fetches (avoids CORS when image is on GCS)
      const imageUrl = images[0];
      const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl}`;

      const aiResponse = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: fullImageUrl, language }),
      });
      
      if (!aiResponse.ok) {
        throw new Error('فشل تحليل الصورة');
      }
      
      const analysis = await aiResponse.json();
      
      // Map AI category to Arabic
      const categoryMap: Record<string, string> = {
        'Clothing': 'ملابس',
        'Electronics': 'إلكترونيات',
        'Home': 'تحف وأثاث',
        'Other': 'أخرى'
      };
      
      // Auto-fill form fields (excluding price - seller sets manually)
      setFormData(prev => ({
        ...prev,
        title: analysis.title,
        description: analysis.description,
        category: categoryMap[analysis.category] || 'أخرى',
      }));
      
      // Set tags (remove # prefix for display)
      setTags(analysis.tags.map((tag: string) => tag.replace('#', '')));
      setWasAIFilled(true);
      
      toast({
        title: language === "ar" ? "تم التعبئة التلقائية! ✨" : language === "ku" ? "پڕکرایەوە بە شێوەی خۆکار! ✨" : "تم التعبئة التلقائية! ✨",
        description: language === "ar" ? "تم ملء الحقول بواسطة الذكاء الاصطناعي. يمكنك التعديل عليها." : language === "ku" ? "خانەکان پڕکرانەوە بە هۆکاری زیرەکی دەستکرد. دەتوانیت دەستکاریان بکەیت." : "تم ملء الحقول بواسطة الذكاء الاصطناعي. يمكنك التعديل عليها.",
      });
    } catch (error) {
      console.error('AI analysis error:', error);
      toast({
        title: language === "ar" ? "فشل التحليل" : language === "ku" ? "شکستی شیکاری" : "فشل التحليل",
        description: language === "ar" ? "حدث خطأ أثناء تحليل الصورة. حاول مرة أخرى." : language === "ku" ? "هەڵەیەک ڕوویدا لە کاتی شیکردنەوەی وێنە. دووبارە هەوڵ بدەوە." : "حدث خطأ أثناء تحليل الصورة. حاول مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const cleanBackground = async (index: number) => {
    const imageUrl = images[index];
    if (!imageUrl) return;

    setCleanErrorByIndex(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setCleaningIndex(index);

    try {
      const res = await apiRequest("POST", "/api/enhance-image", { imageUrl });
      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : (language === "ar" ? "فشل تنظيف الصورة. حاول مرة أخرى." : language === "ku" ? "شکست لە پاککردنەوەی وێنە. دووبارە هەوڵ بدە." : "فشل تنظيف الصورة. حاول مرة أخرى.");

        setCleanErrorByIndex(prev => ({ ...prev, [index]: message }));
        return;
      }

      const newUrl = data?.imageUrl;
      if (typeof newUrl === "string" && newUrl.length > 0) {
        setImages(prev => prev.map((u, i) => (i === index ? newUrl : u)));
        toast({
          title: language === "ar" ? "تم تنظيف الصورة" : language === "ku" ? "وێنە پاککرایەوە" : "تم تنظيف الصورة",
          description: language === "ar" ? "الذكاء الاصطناعي قد يخطئ أحياناً. يرجى التحقق من دقة النتيجة." : language === "ku" ? "زیرەکی دەستکرد هەندێک جار هەڵە دەکات. تکایە دڵنیابە لە راستی ئەنجامەکە." : "الذكاء الاصطناعي قد يخطئ أحياناً. يرجى التحقق من دقة النتيجة.",
          variant: "default",
        });
      } else {
        setCleanErrorByIndex(prev => ({
          ...prev,
          [index]: language === "ar" ? "استجابة غير متوقعة من الخادم" : language === "ku" ? "وەڵامی نەزانراو لە سێرڤەر" : "استجابة غير متوقعة من الخادم",
        }));
      }
    } catch (error) {
      console.error("[clean-background] Error:", error);
      setCleanErrorByIndex(prev => ({
        ...prev,
        [index]: language === "ar" ? "فشل تنظيف الصورة. حاول مرة أخرى." : language === "ku" ? "شکست لە پاککردنەوەی وێنە. دووبارە هەوڵ بدە." : "فشل تنظيف الصورة. حاول مرة أخرى.",
      }));
    } finally {
      setCleaningIndex(null);
    }
  };

  // Validate category-specific fields for step 2
  const specErrors = formData.category ? validateCategorySpecifications(formData.category, specifications, language) : {};
  const hasNoSpecErrors = Object.keys(specErrors).length === 0;
  
  const stepValidation = [
    images.length >= 2,
    formData.title.trim().length >= 5 && formData.description.trim().length >= 10 && !!formData.category && !!formData.condition && hasNoSpecErrors,
    !!formData.price && parseInt(formData.price) >= 1000 && (saleType === "fixed" || (startTimeOption === "now" || (!!formData.startDate && !!formData.startHour)) && !!formData.endDate && !!formData.endHour),
    !!selectedAddress && !!formData.deliveryWindow && !!formData.returnPolicy,
    true,
  ];

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: language === "ar" ? "خطأ" : language === "ku" ? "هەڵە" : "خطأ",
        description: language === "ar" ? "يجب تسجيل الدخول أولاً" : language === "ku" ? "پێویستە یەکەم جار بچیتە ژوورەوە" : "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const authToken = localStorage.getItem("authToken");
      
      let auctionStartTime: string | null = null;
      let auctionEndTime: string | null = null;
      if (saleType === "auction") {
        if (startTimeOption === "now") {
          auctionStartTime = new Date().toISOString();
        } else if (formData.startDate) {
          const startDateTime = new Date(`${formData.startDate}T${formData.startHour}:00:00`);
          auctionStartTime = startDateTime.toISOString();
        }
        if (formData.endDate) {
          const endDateTime = new Date(`${formData.endDate}T${formData.endHour}:00:00`);
          auctionEndTime = endDateTime.toISOString();
        }
      }
      
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: parseInt(formData.price),
        category: formData.category,
        condition: formData.condition,
        brand: formData.brand || "بدون ماركة",
        images,
        saleType,
        auctionStartTime,
        auctionEndTime,
        buyNowPrice: formData.buyNowPrice ? parseInt(formData.buyNowPrice) : null,
        reservePrice: (saleType === "auction" && hasReservePrice && formData.reservePrice) 
          ? parseInt(formData.reservePrice) 
          : null,
        city: selectedAddress?.city || formData.city,
        area: selectedAddress?.district || formData.area || null,
        sellerAddressId: selectedAddress?.id || null,
        locationLat: selectedAddress?.latitude || null,
        locationLng: selectedAddress?.longitude || null,
        deliveryWindow: formData.deliveryWindow,
        shippingType: formData.shippingType,
        shippingCost: formData.shippingType === "buyer_pays" ? parseInt(formData.shippingCost) || 0 : 0,
        internationalShipping: false,
        internationalCountries: [],
        returnPolicy: formData.returnPolicy,
        tags,
        quantityAvailable: parseInt(formData.quantityAvailable) || 1,
        isNegotiable,
        sellerName: formData.sellerName || user?.displayName || "بائع",
        allowedBidderType: formData.allowedBidderType,
        specifications: Object.keys(specifications).length > 0 ? specifications : null,
      };
      
      // Edit mode updates the existing listing; template/relist/new all create a new listing
      const url = isEditMode ? `/api/listings/${editListingId}` : "/api/listings";
      const method = isEditMode ? "PATCH" : "POST";
      
      const res = await apiRequest(method, url, listingData);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || (isEditMode ? "Failed to update listing" : "Failed to create listing"));
      }
      
      const resultListing = await res.json();
      
      // Clear draft on successful submission
      localStorage.removeItem(WIZARD_DRAFT_KEY);
      
      toast({
        title: language === "ar" ? "تم بنجاح!" : language === "ku" ? "سەرکەوتوو بوو!" : "تم بنجاح!",
        description: isEditMode 
          ? (language === "ar" ? "تم تحديث منتجك بنجاح" : language === "ku" ? "بەرهەمەکەت بە سەرکەوتوویی نوێکرایەوە" : "تم تحديث منتجك بنجاح")
          : isRelistMode
            ? (language === "ar" ? "تم إعادة عرض المنتج بنجاح" : language === "ku" ? "بەرهەمەکە بە سەرکەوتوویی دووبارە بڵاوکرایەوە" : "تم إعادة عرض المنتج بنجاح")
            : (language === "ar" ? "تم نشر منتجك بنجاح" : language === "ku" ? "بەرهەمەکەت بە سەرکەوتوویی بڵاوکرایەوە" : "تم نشر منتجك بنجاح"),
      });
      
      window.history.replaceState(null, "", `/product/${resultListing.id}`);
      setLocation(`/product/${resultListing.id}`);
    } catch (error: any) {
      toast({
        title: language === "ar" ? "خطأ" : language === "ku" ? "هەڵە" : "خطأ",
        description: error.message || (language === "ar" ? "فشل نشر المنتج" : language === "ku" ? "بڵاوکردنەوەی بەرهەم سەرکەوتوو نەبوو" : "فشل نشر المنتج"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (sourceListingId && sourceListingLoading)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <Lock className="h-12 w-12 mx-auto text-gray-400" />
              <h2 className="text-xl font-bold">
                {language === "ar" ? "تسجيل الدخول مطلوب" : language === "ku" ? "پێویستە بچیتە ژوورەوە" : "تسجيل الدخول مطلوب"}
              </h2>
              <p className="text-muted-foreground">
                {language === "ar" ? "يجب تسجيل الدخول لإضافة منتج" : language === "ku" ? "پێویستە بچیتە ژوورەوە بۆ زیادکردنی بەرهەم" : "يجب تسجيل الدخول لإضافة منتج"}
              </p>
              <Link href="/signin">
                <Button className="w-full">{t("signIn")}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!user.phoneVerified) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 max-w-md">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Package className="h-12 w-12 mx-auto text-blue-600" />
              <h2 className="text-xl font-bold">
                {language === "ar" ? "تحقق من رقم هاتفك للبيع" : language === "ku" ? "ژمارەی تەلەفۆنت پشتڕاست بکە بۆ فرۆشتن" : "تحقق من رقم هاتفك للبيع"}
              </h2>
              
              <p className="text-muted-foreground text-sm">
                {language === "ar" ? "يجب التحقق من رقم هاتفك عبر واتساب لتتمكن من البيع على منصتنا" : language === "ku" ? "دەبێت ژمارەی تەلەفۆنت بە واتسئاپ پشتڕاست بکەیت بۆ ئەوەی بتوانیت شتەکان بفرۆشیت" : "يجب التحقق من رقم هاتفك عبر واتساب لتتمكن من البيع على منصتنا"}
              </p>
              <Link href="/settings">
                <Button className="w-full">
                  {language === "ar" ? "التحقق من الهاتف" : language === "ku" ? "پشتڕاستکردنی ژمارەی تەلەفۆن" : "التحقق من الهاتف"}
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">{language === "ar" ? "العودة للصفحة الرئيسية" : language === "ku" ? "گەڕانەوە بۆ سەرەکی" : "العودة للصفحة الرئيسية"}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const handleCancel = () => {
    if (hasFormContent()) {
      setShowExitConfirm(true);
    } else {
      localStorage.removeItem(WIZARD_DRAFT_KEY);
      setLocation("/");
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Draft Recovery Banner */}
        {showDraftBanner && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-800">{language === "ar" ? "لديك مسودة محفوظة" : language === "ku" ? "ڕەشنووسێکی پاشەکەوتکراوت هەیە" : "لديك مسودة محفوظة"}</p>
                <p className="text-sm text-blue-600">{language === "ar" ? "هل تريد استكمال العمل على المنتج السابق؟" : language === "ku" ? "دەتەوێت کارەکەت لەسەر بەرهەمی پێشوو تەواو بکەیت؟" : "هل تريد استكمال العمل على المنتج السابق؟"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={clearDraft}>
                {language === "ar" ? "تجاهل" : language === "ku" ? "پشتگوێ بخە" : "تجاهل"}
              </Button>
              <Button type="button" size="sm" onClick={loadDraft} className="bg-blue-600 hover:bg-blue-700">
                {language === "ar" ? "استرجاع المسودة" : language === "ku" ? "ڕەشنووس بگەڕێنەوە" : "استرجاع المسودة"}
              </Button>
            </div>
          </div>
        )}

        <SellWizard
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          stepValidation={stepValidation}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        >
          {/* Step 1: Photos */}
          <div className="space-y-4">
            <ImageUploadSection
              images={images}
              isUploadingImages={isUploadingImages}
              isAnalyzingImage={isAnalyzingImage}
              validationErrors={{}}
              language={language}
              onImageUpload={handleImageUpload}
              onRemoveImage={removeImage}
              onCameraClick={isNative ? handleNativeCamera : undefined}
              onAIAnalyze={analyzeImageWithAI}
              onCleanBackground={cleanBackground}
              cleaningIndex={cleaningIndex}
              cleanErrorByIndex={cleanErrorByIndex}
            />
            {images.length < 2 && (
              <p className="text-center text-amber-600 text-sm">
                {language === "ar" ? "أضف صورتين على الأقل للمتابعة" : language === "ku" ? "لانیکەم دوو وێنە زیاد بکە بۆ بەردەوامبوون" : "أضف صورتين على الأقل للمتابعة"}
              </p>
            )}
          </div>

          {/* Step 2: Product Info */}
          <div className="space-y-6">
            {wasAIFilled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <span>✨</span>
                  {language === "ar" ? "تم ملؤه بالذكاء الاصطناعي" : language === "ku" ? "پڕکرایەوە بە AI" : "تم ملؤه بالذكاء الاصطناعي"}
                </Badge>
                <p className="text-sm text-blue-700">
                  {language === "ar" ? "يمكنك تعديل الحقول أدناه" : language === "ku" ? "دەتوانیت خانەکان دەستکاری بکەیت" : "يمكنك تعديل الحقول أدناه"}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("productTitle")} *</Label>
              <Input 
                placeholder={language === "ar" ? "مثال: ساعة رولكس فينتاج 1970" : language === "ku" ? "نموونە: کاتژمێری ڕۆلێکس ١٩٧٠" : "مثال: ساعة رولكس فينتاج 1970"}
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                data-testid="input-title"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t("productDescription")} *</Label>
              <Textarea 
                placeholder={language === "ar" ? "اكتب وصفاً تفصيلياً للمنتج..." : language === "ku" ? "وەسفی ورد بۆ بەرهەم بنووسە..." : "اكتب وصفاً تفصيلياً للمنتج..."}
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                data-testid="input-description"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("category")} *</Label>
                <Select value={formData.category} onValueChange={(v) => handleInputChange("category", v)}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ساعات">{t("watches")}</SelectItem>
                    <SelectItem value="إلكترونيات">{t("electronics")}</SelectItem>
                    <SelectItem value="ملابس">{t("clothing")}</SelectItem>
                    <SelectItem value="أحذية">{t("shoes")}</SelectItem>
                    <SelectItem value="سيارات">{t("vehicles")}</SelectItem>
                    <SelectItem value="مجوهرات">{t("jewelry")}</SelectItem>
                    <SelectItem value="مكياج">{t("makeup")}</SelectItem>
                    <SelectItem value="تحف وأثاث">{t("furniture")}</SelectItem>
                    <SelectItem value="مقتنيات">{t("collectibles")}</SelectItem>
                    <SelectItem value="أخرى">{t("other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>{t("condition")} *</Label>
                <Select value={formData.condition} onValueChange={(v) => handleInputChange("condition", v)}>
                  <SelectTrigger data-testid="select-condition">
                    <SelectValue placeholder={t("selectCondition")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">{t("new")}</SelectItem>
                    <SelectItem value="Used - Like New">{t("likeNew")}</SelectItem>
                    <SelectItem value="Used - Good">{t("usedGood")}</SelectItem>
                    <SelectItem value="Used - Fair">{t("usedFair")}</SelectItem>
                    <SelectItem value="Vintage">{t("vintage")}</SelectItem>
                    <SelectItem value="For Parts or Not Working">{t("forPartsOrNotWorking")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{language === "ar" ? "الماركة" : language === "ku" ? "براند" : "الماركة"}</Label>
              <Input
                placeholder={language === "ar" ? "اكتب اسم الماركة (اختياري)" : language === "ku" ? "ناوی براند بنووسە (ئارەزوومەندانە)" : "اكتب اسم الماركة (اختياري)"}
                value={formData.brand}
                onChange={(e) => handleInputChange("brand", e.target.value)}
                data-testid="input-brand"
              />
            </div>
            
            {/* Category-Specific Specifications */}
            {formData.category && (
              <CategorySpecificFields
                category={formData.category}
                specifications={specifications}
                language={language}
                errors={specificationErrors}
                onChange={setSpecifications}
              />
            )}

            <div className="space-y-3">
              <Label>{language === "ar" ? "الكلمات المفتاحية" : language === "ku" ? "وشەی سەرەکییەکان" : "الكلمات المفتاحية"}</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim() && tags.length < 5) {
                      e.preventDefault();
                      setTags([...tags, tagInput.trim()]);
                      setTagInput("");
                    }
                  }}
                  placeholder={language === "ar" ? "اكتب واضغط Enter" : language === "ku" ? "بنووسە و Enter دابگرە" : "اكتب واضغط Enter"}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (tagInput.trim() && tags.length < 5) {
                      setTags([...tags, tagInput.trim()]);
                      setTagInput("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => setTags(tags.filter((_, i) => i !== idx))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Pricing */}
          <div className="space-y-6">
            <RadioGroup 
              value={saleType} 
              onValueChange={(v) => setSaleType(v as "auction" | "fixed")}
              className="grid grid-cols-2 gap-4"
            >
              <Label 
                htmlFor="auction"
                className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer ${
                  saleType === "auction" ? "border-primary bg-primary/5" : "border-gray-200"
                }`}
              >
                <RadioGroupItem value="auction" id="auction" />
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    <Gavel className="h-4 w-4" />
                    {t("auction")}
                  </div>
                </div>
              </Label>
              
              <Label 
                htmlFor="fixed"
                className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer ${
                  saleType === "fixed" ? "border-primary bg-primary/5" : "border-gray-200"
                }`}
              >
                <RadioGroupItem value="fixed" id="fixed" />
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    <ShoppingBag className="h-4 w-4" />
                    {t("fixedPrice")}
                  </div>
                </div>
              </Label>
            </RadioGroup>
            
            <div className="space-y-2">
              <Label>
                {saleType === "auction" 
                  ? (language === "ar" ? "سعر البداية" : language === "ku" ? "نرخی دەستپێک" : "سعر البداية") 
                  : (language === "ar" ? "السعر" : language === "ku" ? "نرخ" : "السعر")} ({t("iqd")}) *
              </Label>
              <Input 
                type="text"
                inputMode="numeric"
                pattern="[0-9٠-٩]*"
                placeholder="50000"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                data-testid="input-price"
              />
              <div className="space-y-2">
                <Label htmlFor="quantityAvailable">{language === "ar" ? "الكمية المتوفرة" : language === "ku" ? "بڕی بەردەست" : "الكمية المتوفرة"} *</Label>
                <Input id="quantityAvailable" type="text" inputMode="numeric" pattern="[0-9٠-٩]*" placeholder="1" value={formData.quantityAvailable ?? "1"} onChange={(e) => handleInputChange("quantityAvailable", e.target.value)} data-testid="input-quantity" />
                <p className="text-xs text-muted-foreground">{language === "ar" ? "عدد القطع المتوفرة للبيع" : language === "ku" ? "ژمارەی پارچەکان بۆ فرۆشتن" : "عدد القطع المتوفرة للبيع"}</p>
              </div>
              <Input
              />
              <p className="text-xs text-muted-foreground">
                {language === "ar" ? "الحد الأدنى: 1,000 دينار" : language === "ku" ? "کەمترین: ١,٠٠٠ دینار" : "الحد الأدنى: 1,000 دينار"}
              </p>
            </div>
            
            {saleType === "auction" && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    {language === "ar" ? "موعد بدء المزاد" : language === "ku" ? "کاتی دەستپێکردنی مزایدە" : "موعد بدء المزاد"}
                  </Label>
                  <RadioGroup 
                    value={startTimeOption} 
                    onValueChange={(v) => setStartTimeOption(v as "now" | "schedule")}
                    className="grid grid-cols-2 gap-3"
                  >
                    <Label 
                      htmlFor="start-now"
                      className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        startTimeOption === "now" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <RadioGroupItem value="now" id="start-now" />
                      <div>
                        <div className="font-bold text-green-700">
                          {language === "ar" ? "ابدأ فوراً" : language === "ku" ? "ئێستا دەستپێبکە" : "ابدأ فوراً"}
                        </div>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "يبدأ المزاد عند النشر" : language === "ku" ? "مزایدە دەستپێدەکات کاتی بڵاوکردنەوە" : "يبدأ المزاد عند النشر"}
                        </p>
                      </div>
                    </Label>
                    
                    <Label 
                      htmlFor="start-schedule"
                      className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        startTimeOption === "schedule" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <RadioGroupItem value="schedule" id="start-schedule" />
                      <div>
                        <div className="font-bold text-blue-700">
                          {language === "ar" ? "جدولة موعد" : language === "ku" ? "کاتی دیاریکراو" : "جدولة موعد"}
                        </div>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "اختر تاريخ ووقت محدد" : language === "ku" ? "ڕێکەوت و کات هەڵبژێرە" : "اختر تاريخ ووقت محدد"}
                        </p>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                {startTimeOption === "schedule" && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="space-y-2">
                      <Label>{language === "ar" ? "تاريخ البداية" : language === "ku" ? "ڕێکەوتی دەستپێک" : "تاريخ البداية"} *</Label>
                      <Input 
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{language === "ar" ? "ساعة البداية" : language === "ku" ? "کاتژمێری دەستپێک" : "ساعة البداية"} *</Label>
                      <Select value={formData.startHour} onValueChange={(v) => handleInputChange("startHour", v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg">
                  <div className="space-y-2">
                    <Label>{language === "ar" ? "تاريخ الانتهاء" : language === "ku" ? "ڕێکەوتی کۆتایی" : "تاريخ الانتهاء"} *</Label>
                    <Input 
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange("endDate", e.target.value)}
                      min={startTimeOption === "now" ? new Date().toISOString().split('T')[0] : (formData.startDate || new Date().toISOString().split('T')[0])}
                      data-testid="input-end-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "ar" ? "ساعة الانتهاء" : language === "ku" ? "کاتژمێری کۆتایی" : "ساعة الانتهاء"} *</Label>
                    <Select value={formData.endHour} onValueChange={(v) => handleInputChange("endHour", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>{language === "ar" ? "سعر الشراء الفوري (اختياري)" : language === "ku" ? "نرخی کڕینی ڕاستەوخۆ" : "سعر الشراء الفوري (اختياري)"}</Label>
                  <Input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9٠-٩]*"
                    placeholder={language === "ar" ? "اتركه فارغاً إذا لم ترغب" : language === "ku" ? "بەتاڵی جێبهێڵە ئەگەر نەتەوێت" : "اتركه فارغاً إذا لم ترغب"}
                    value={formData.buyNowPrice}
                    onChange={(e) => handleInputChange("buyNowPrice", e.target.value)}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <Checkbox
                      id="hasReservePrice"
                      checked={hasReservePrice}
                      onCheckedChange={(checked) => {
                        setHasReservePrice(!!checked);
                        if (!checked) {
                          handleInputChange("reservePrice", "");
                        }
                      }}
                      className="h-5 w-5"
                    />
                    <div className="flex-1">
                      <Label htmlFor="hasReservePrice" className="cursor-pointer font-bold">
                        {language === "ar" ? "سعر احتياطي (اختياري)" : language === "ku" ? "نرخی پاراستن (ئارەزوومەندانە)" : "سعر احتياطي (اختياري)"}
                      </Label>
                      <p className="text-xs text-amber-700 mt-1">
                        {language === "ar" ? "حدد سعراً أدنى يجب الوصول إليه لإتمام البيع" : language === "ku" ? "کەمترین نرخێک دیاری بکە کە دەبێت بگاتە بۆ تەواوکردنی فرۆشتن" : "حدد سعراً أدنى يجب الوصول إليه لإتمام البيع"}
                      </p>
                    </div>
                  </div>
                  
                  {hasReservePrice && (
                    <div className="space-y-2">
                      <Label>{language === "ar" ? "السعر الاحتياطي" : language === "ku" ? "نرخی پاراستن" : "السعر الاحتياطي"}</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9٠-٩]*"
                        placeholder={language === "ar" ? "أدخل السعر الاحتياطي" : language === "ku" ? "نرخی پاراستن بنووسە" : "أدخل السعر الاحتياطي"}
                        value={formData.reservePrice}
                        onChange={(e) => handleInputChange("reservePrice", e.target.value)}
                        data-testid="input-reserve-price"
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === "ar" ? "لن يتم بيع المنتج إذا لم يصل المزاد لهذا السعر" : language === "ku" ? "بەرهەمەکە نافرۆشرێت ئەگەر مزایدە نەگاتە ئەم نرخە" : "لن يتم بيع المنتج إذا لم يصل المزاد لهذا السعر"}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {saleType === "auction" && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    {language === "ar" ? "من يمكنه المزايدة؟" : language === "ku" ? "کێ دەتوانێت مزایدە بکات؟" : "من يمكنه المزايدة؟"}
                  </Label>
                  <RadioGroup 
                    value={formData.allowedBidderType} 
                    onValueChange={(val) => handleInputChange("allowedBidderType", val)}
                    className="grid grid-cols-1 gap-3"
                  >
                    <Label 
                      htmlFor="bidder-all"
                      className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        formData.allowedBidderType === "all_users" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <RadioGroupItem value="all_users" id="bidder-all" className="mt-1" />
                      <div>
                        <div className="font-bold">
                          {language === "ar" ? "جميع المستخدمين" : language === "ku" ? "هەموو بەکارهێنەران" : "جميع المستخدمين"}
                        </div>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "يسمح لأي مستخدم مسجل بالمزايدة." : language === "ku" ? "ڕێگە بە هەر بەکارهێنەرێکی تۆمارکراو دەدرێت مزایدە بکات." : "يسمح لأي مستخدم مسجل بالمزايدة."}
                        </p>
                      </div>
                    </Label>
                    
                    <Label 
                      htmlFor="bidder-verified"
                      className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        formData.allowedBidderType === "verified_only" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <RadioGroupItem value="verified_only" id="bidder-verified" className="mt-1" />
                      <div>
                        <div className="font-bold">
                          {language === "ar" ? "الموثقون فقط" : language === "ku" ? "تەنها متمانەپێکراوەکان" : "الموثقون فقط"}
                        </div>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "يسمح فقط لمن لديهم حسابات موثقة (أكثر أماناً)." : language === "ku" ? "تەنها ڕێگە بەوانە دەدرێت کە هەژماری متمانەپێکراویان هەیە (پارێزراوترە)." : "يسمح فقط لمن لديهم حسابات موثقة (أكثر أماناً)."}
                        </p>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>
              </>
            )}

            {saleType === "fixed" && (
              <>
                <Separator />
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <div>
                      <Label className="font-medium">
                        {language === "ar" ? "قابل للتفاوض" : language === "ku" ? "دەکرێت گفتوگۆ بکرێت" : "قابل للتفاوض"}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {language === "ar" ? "السماح للمشترين بتقديم عروض أسعار" : language === "ku" ? "ڕێگە بدە بە کڕیاران پێشنیاری نرخ بکەن" : "السماح للمشترين بتقديم عروض أسعار"}
                      </p>
                    </div>
                  </div>
                  <Checkbox 
                    checked={isNegotiable}
                    onCheckedChange={(checked) => setIsNegotiable(!!checked)}
                    data-testid="checkbox-negotiable"
                  />
                </div>
              </>
            )}
          </div>

          {/* Step 4: Shipping */}
          <div className="space-y-6">
            {/* Pickup Location Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {language === "ar" ? "موقع الاستلام" : language === "ku" ? "شوێنی وەرگرتنەوە" : "موقع الاستلام"} *
              </Label>
              
              {isLoadingAddresses ? (
                <div className="flex items-center justify-center p-4 border rounded-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : selectedAddress ? (
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{selectedAddress.label}</span>
                          {selectedAddress.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              {language === "ar" ? "افتراضي" : language === "ku" ? "بنەڕەتی" : "افتراضي"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedAddress.contactName}</p>
                        <p className="text-sm text-muted-foreground" dir="ltr">{selectedAddress.phone}</p>
                        <p className="text-sm">
                          {selectedAddress.city}
                          {selectedAddress.district && ` - ${selectedAddress.district}`}
                        </p>
                        <p className="text-sm text-muted-foreground">{selectedAddress.addressLine1}</p>
                        {selectedAddress.latitude && selectedAddress.longitude && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {language === "ar" ? "الموقع محدد على الخريطة" : language === "ku" ? "شوێن لەسەر نەخشە دیاریکراوە" : "الموقع محدد على الخريطة"}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddressModal(true)}
                      >
                        <Edit className="h-4 w-4 ml-1" />
                        {language === "ar" ? "تغيير" : language === "ku" ? "گۆڕین" : "تغيير"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === "ar" ? "لم يتم تحديد موقع الاستلام بعد" : language === "ku" ? "هێشتا شوێنی وەرگرتنەوە دیاری نەکراوە" : "لم يتم تحديد موقع الاستلام بعد"}
                    </p>
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => setShowAddressModal(true)}
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      {language === "ar" ? "إضافة موقع الاستلام" : language === "ku" ? "شوێنی وەرگرتنەوە زیاد بکە" : "إضافة موقع الاستلام"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {sellerAddresses && sellerAddresses.length > 1 && selectedAddress && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAddressModal(true)}
                >
                  {language === "ar" 
                    ? `لديك ${sellerAddresses.length} مواقع محفوظة` 
                    : `${sellerAddresses.length} شوێنی پاشەکەوتکراوت هەیە`}
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>{language === "ar" ? "مدة التوصيل" : language === "ku" ? "ماوەی گەیاندن" : "مدة التوصيل"} *</Label>
              <Select value={formData.deliveryWindow} onValueChange={(v) => handleInputChange("deliveryWindow", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2 أيام">1-2 {language === "ar" ? "أيام" : language === "ku" ? "ڕۆژ" : "أيام"}</SelectItem>
                  <SelectItem value="3-5 أيام">3-5 {language === "ar" ? "أيام" : language === "ku" ? "ڕۆژ" : "أيام"}</SelectItem>
                  <SelectItem value="5-7 أيام">5-7 {language === "ar" ? "أيام" : language === "ku" ? "ڕۆژ" : "أيام"}</SelectItem>
                  <SelectItem value="1-2 أسبوع">1-2 {language === "ar" ? "أسبوع" : language === "ku" ? "هەفتە" : "أسبوع"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label>{language === "ar" ? "تكلفة الشحن" : language === "ku" ? "تێچووی گواستنەوە" : "تكلفة الشحن"}</Label>
              <RadioGroup 
                value={formData.shippingType} 
                onValueChange={(v) => handleInputChange("shippingType", v)}
                className="space-y-2"
              >
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="seller_pays" id="ship-free" />
                  <Label htmlFor="ship-free" className="flex-1 cursor-pointer">
                    {language === "ar" ? "شحن مجاني" : language === "ku" ? "گواستنەوەی بەخۆڕایی" : "شحن مجاني"}
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="buyer_pays" id="ship-buyer" />
                  <Label htmlFor="ship-buyer" className="flex-1 cursor-pointer">
                    {language === "ar" ? "على حساب المشتري" : language === "ku" ? "بە تێچووی کڕیار" : "على حساب المشتري"}
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="pickup" id="ship-pickup" />
                  <Label htmlFor="ship-pickup" className="flex-1 cursor-pointer">
                    {language === "ar" ? "استلام شخصي" : language === "ku" ? "وەرگرتنی کەسی" : "استلام شخصي"}
                  </Label>
                </div>
              </RadioGroup>
              
              {formData.shippingType === "buyer_pays" && (
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9٠-٩]*"
                  placeholder={language === "ar" ? "تكلفة الشحن بالدينار" : language === "ku" ? "تێچووی گواستنەوە بە دینار" : "تكلفة الشحن بالدينار"}
                  value={formData.shippingCost}
                  onChange={(e) => handleInputChange("shippingCost", e.target.value)}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>{language === "ar" ? "سياسة الإرجاع" : language === "ku" ? "سیاسەتی گەڕانەوە" : "سياسة الإرجاع"} *</Label>
              <Select value={formData.returnPolicy} onValueChange={(v) => handleInputChange("returnPolicy", v)}>
                <SelectTrigger data-testid="select-return-policy">
                  <SelectValue placeholder={language === "ar" ? "اختر سياسة الإرجاع" : language === "ku" ? "سیاسەتی گەڕانەوە هەڵبژێرە" : "اختر سياسة الإرجاع"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="لا يوجد إرجاع">{language === "ar" ? "لا يوجد إرجاع" : language === "ku" ? "گەڕانەوە نییە" : "لا يوجد إرجاع"}</SelectItem>
                  <SelectItem value="3 أيام">{language === "ar" ? "إرجاع خلال 3 أيام" : language === "ku" ? "گەڕانەوە لە ماوەی ٣ ڕۆژ" : "إرجاع خلال 3 أيام"}</SelectItem>
                  <SelectItem value="7 أيام">{language === "ar" ? "إرجاع خلال 7 أيام" : language === "ku" ? "گەڕانەوە لە ماوەی ٧ ڕۆژ" : "إرجاع خلال 7 أيام"}</SelectItem>
                  <SelectItem value="14 يوم">{language === "ar" ? "إرجاع خلال 14 يوم" : language === "ku" ? "گەڕانەوە لە ماوەی ١٤ ڕۆژ" : "إرجاع خلال 14 يوم"}</SelectItem>
                  <SelectItem value="30 يوم">{language === "ar" ? "إرجاع خلال 30 يوم" : language === "ku" ? "گەڕانەوە لە ماوەی ٣٠ ڕۆژ" : "إرجاع خلال 30 يوم"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Step 5: Review */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt={`Preview ${idx + 1}`} 
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  ))}
                </div>
              )}
              
              <div>
                <h3 className="font-bold text-lg">{formData.title}</h3>
                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{formData.description}</p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {saleType === "auction" ? (
                    <Gavel className="h-4 w-4 text-primary" />
                  ) : (
                    <ShoppingBag className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm">
                    {saleType === "auction" ? t("auction") : t("fixedPrice")}
                  </span>
                </div>
                <span className="font-bold text-lg text-primary">
                  {parseInt(formData.price || "0").toLocaleString()} {t("iqd")}
                </span>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("category")}:</span>
                  <span className="mr-2 font-medium">{formData.category}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("condition")}:</span>
                  <span className="mr-2 font-medium">{formData.condition}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{language === "ar" ? "المدينة" : language === "ku" ? "شار" : "المدينة"}:</span>
                  <span className="mr-2 font-medium">{formData.city}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{language === "ar" ? "الشحن" : language === "ku" ? "گواستنەوە" : "الشحن"}:</span>
                  <span className="mr-2 font-medium">
                    {formData.shippingType === "seller_pays" 
                      ? (language === "ar" ? "مجاني" : language === "ku" ? "بەخۆڕایی" : "مجاني")
                      : formData.shippingType === "pickup"
                        ? (language === "ar" ? "استلام شخصي" : language === "ku" ? "وەرگرتنی کەسی" : "استلام شخصي")
                        : `${parseInt(formData.shippingCost || "0").toLocaleString()} ${t("iqd")}`
                    }
                  </span>
                </div>
              </div>
              
              {isNegotiable && (
                <Badge variant="secondary" className="w-fit">
                  {language === "ar" ? "قابل للتفاوض" : language === "ku" ? "دەکرێت گفتوگۆ بکرێت" : "قابل للتفاوض"}
                </Badge>
              )}
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">
                    {language === "ar" ? "جاهز للنشر!" : language === "ku" ? "ئامادەیە بۆ بڵاوکردنەوە!" : "جاهز للنشر!"}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {language === "ar" ? "راجع البيانات أعلاه ثم اضغط على زر النشر" : language === "ku" ? "زانیاریەکان لە سەرەوە بپشکنە پاشان دوگمەی بڵاوکردنەوە دابگرە" : "راجع البيانات أعلاه ثم اضغط على زر النشر"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SellWizard>

        {/* Seller Address Modal */}
        <SellerAddressModal
          open={showAddressModal}
          onOpenChange={setShowAddressModal}
          onSelect={(address) => {
            setSelectedAddress(address);
            setFormData(prev => ({
              ...prev,
              city: address.city,
              area: address.district || "",
            }));
          }}
          forceAddNew={!sellerAddresses || sellerAddresses.length === 0}
        />

        {/* Exit Confirmation Dialog */}
        <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {language === "ar" ? "حفظ التغييرات؟" : language === "ku" ? "گۆڕانکاریەکان پاشەکەوت بکەیت؟" : "حفظ التغييرات؟"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-gray-600 text-sm py-2">
              {language === "ar" ? "لديك تغييرات غير محفوظة. هل تريد حفظها كمسودة قبل المغادرة؟" : language === "ku" ? "گۆڕانکاریی پاشەکەوت نەکراوت هەیە. دەتەوێت وەک ڕەشنووس پاشەکەوتی بکەیت پێش ئەوەی بڕۆیت؟" : "لديك تغييرات غير محفوظة. هل تريد حفظها كمسودة قبل المغادرة؟"}
            </p>
            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem(WIZARD_DRAFT_KEY);
                  setShowExitConfirm(false);
                  setLocation("/");
                }}
                className="flex-1"
              >
                {language === "ar" ? "تجاهل" : language === "ku" ? "پشتگوێ بخە" : "تجاهل"}
              </Button>
              <Button
                onClick={() => {
                  saveDraftToStorage();
                  toast({ 
                    title: language === "ar" ? "تم حفظ المسودة" : language === "ku" ? "ڕەشنووس پاشەکەوت کرا" : "تم حفظ المسودة", 
                    description: language === "ar" ? "يمكنك إكمال الإعلان لاحقاً" : language === "ku" ? "دەتوانیت دواتر ڕیکلامەکە تەواو بکەیت" : "يمكنك إكمال الإعلان لاحقاً" 
                  });
                  setShowExitConfirm(false);
                  setLocation("/");
                }}
                className="flex-1 bg-primary"
              >
                {language === "ar" ? "حفظ ومغادرة" : language === "ku" ? "پاشەکەوت و بڕۆ" : "حفظ ومغادرة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
