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
          title: language === "ar" ? "تم استرجاع المسودة" : "ڕەشنووس گەڕایەوە", 
          description: language === "ar" ? "تم تحميل البيانات المحفوظة مسبقاً" : "داتا پاشەکەوتکراوەکان بارکرا" 
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
        description: language === "ar" ? "يرجى ملء جميع الحقول المطلوبة" : "تکایە هەموو خانەکان پڕ بکەوە",
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
        title: language === "ar" ? "تم تقديم الطلب بنجاح!" : "داواکە بە سەرکەوتوویی پێشکەشکرا!",
        description: language === "ar" ? "سيتم مراجعة طلبك من قبل الإدارة" : "داواکەت لەلایەن بەڕێوەبەرایەتی پێداچوونەوەی بۆ دەکرێت",
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
        title: language === "ar" ? "الحد الأقصى للصور" : "زۆرترین ژمارەی وێنە",
        description: language === "ar" ? "يمكنك رفع 8 صور كحد أقصى" : "دەتوانیت ٨ وێنە زۆرترین بارکەیت",
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
        throw new Error(errorData.error || (language === "ar" ? "فشل في رفع الصور" : "شکست لە بارکردنی وێنەکان"));
      }

      const result = await response.json();
      const uploadedPaths = result.images.map((img: { main: string }) => img.main);
      setImages(prev => [...prev, ...uploadedPaths]);
      
      toast({
        title: language === "ar" ? "تم رفع الصور بنجاح" : "وێنەکان بە سەرکەوتوویی بارکران",
        description: `${language === "ar" ? "تم رفع" : "بارکرا"} ${uploadedPaths.length} ${language === "ar" ? "صورة (محسّنة)" : "وێنە (باشتر کراو)"}`,
      });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        title: language === "ar" ? "خطأ في رفع الصور" : "هەڵە لە بارکردنی وێنەکان",
        description: error instanceof Error ? error.message : (language === "ar" ? "حدث خطأ أثناء رفع الصور" : "هەڵەیەک ڕوویدا لە کاتی بارکردنی وێنەکان"),
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
        title: language === "ar" ? "الحد الأقصى للصور" : "زۆرترین ژمارەی وێنە",
        description: language === "ar" ? "يمكنك رفع 8 صور كحد أقصى" : "دەتوانیت ٨ وێنە زۆرترین بارکەیت",
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
        throw new Error(errorData.error || (language === "ar" ? "فشل في رفع الصورة" : "شکست لە بارکردنی وێنە"));
      }

      const result = await response.json();
      const uploadedPaths = result.images.map((img: { main: string }) => img.main);
      setImages(prev => [...prev, ...uploadedPaths]);
      
      toast({
        title: language === "ar" ? "تم رفع الصورة بنجاح" : "وێنە بە سەرکەوتوویی بارکرا",
        description: language === "ar" ? "تم رفع الصورة (محسّنة)" : "وێنە بارکرا (باشتر کراو)",
      });
    } catch (error) {
      console.error("Camera upload error:", error);
      toast({
        title: language === "ar" ? "خطأ في رفع الصورة" : "هەڵە لە بارکردنی وێنە",
        description: error instanceof Error ? error.message : (language === "ar" ? "حدث خطأ أثناء رفع الصورة" : "هەڵەیەک ڕوویدا لە کاتی بارکردنی وێنە"),
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const analyzeImageWithAI = async () => {
    if (images.length === 0) {
      toast({
        title: language === "ar" ? "لا توجد صورة" : "وێنە نییە",
        description: language === "ar" 
          ? "الرجاء رفع صورة أولاً" 
          : "تکایە یەکەم جار وێنە بارکە",
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
        title: language === "ar" ? "تم التعبئة التلقائية! ✨" : "پڕکرایەوە بە شێوەی خۆکار! ✨",
        description: language === "ar"
          ? "تم ملء الحقول بواسطة الذكاء الاصطناعي. يمكنك التعديل عليها."
          : "خانەکان پڕکرانەوە بە هۆکاری زیرەکی دەستکرد. دەتوانیت دەستکاریان بکەیت.",
      });
    } catch (error) {
      console.error('AI analysis error:', error);
      toast({
        title: language === "ar" ? "فشل التحليل" : "شکستی شیکاری",
        description: language === "ar"
          ? "حدث خطأ أثناء تحليل الصورة. حاول مرة أخرى."
          : "هەڵەیەک ڕوویدا لە کاتی شیکردنەوەی وێنە. دووبارە هەوڵ بدەوە.",
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
            : (language === "ar" ? "فشل تنظيف الصورة. حاول مرة أخرى." : "شکست لە پاککردنەوەی وێنە. دووبارە هەوڵ بدە.");

        setCleanErrorByIndex(prev => ({ ...prev, [index]: message }));
        return;
      }

      const newUrl = data?.imageUrl;
      if (typeof newUrl === "string" && newUrl.length > 0) {
        setImages(prev => prev.map((u, i) => (i === index ? newUrl : u)));
        toast({
          title: language === "ar" ? "تم تنظيف الصورة" : "وێنە پاککرایەوە",
          description: language === "ar" 
            ? "الذكاء الاصطناعي قد يخطئ أحياناً. يرجى التحقق من دقة النتيجة." 
            : "زیرەکی دەستکرد هەندێک جار هەڵە دەکات. تکایە دڵنیابە لە راستی ئەنجامەکە.",
          variant: "default",
        });
      } else {
        setCleanErrorByIndex(prev => ({
          ...prev,
          [index]: language === "ar" ? "استجابة غير متوقعة من الخادم" : "وەڵامی نەزانراو لە سێرڤەر",
        }));
      }
    } catch (error) {
      console.error("[clean-background] Error:", error);
      setCleanErrorByIndex(prev => ({
        ...prev,
        [index]: language === "ar" ? "فشل تنظيف الصورة. حاول مرة أخرى." : "شکست لە پاککردنەوەی وێنە. دووبارە هەوڵ بدە.",
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
        title: language === "ar" ? "خطأ" : "هەڵە",
        description: language === "ar" ? "يجب تسجيل الدخول أولاً" : "پێویستە یەکەم جار بچیتە ژوورەوە",
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
        title: language === "ar" ? "تم بنجاح!" : "سەرکەوتوو بوو!",
        description: isEditMode 
          ? (language === "ar" ? "تم تحديث منتجك بنجاح" : "بەرهەمەکەت بە سەرکەوتوویی نوێکرایەوە")
          : isRelistMode
            ? (language === "ar" ? "تم إعادة عرض المنتج بنجاح" : "بەرهەمەکە بە سەرکەوتوویی دووبارە بڵاوکرایەوە")
            : (language === "ar" ? "تم نشر منتجك بنجاح" : "بەرهەمەکەت بە سەرکەوتوویی بڵاوکرایەوە"),
      });
      
      window.history.replaceState(null, "", `/product/${resultListing.id}`);
      setLocation(`/product/${resultListing.id}`);
    } catch (error: any) {
      toast({
        title: language === "ar" ? "خطأ" : "هەڵە",
        description: error.message || (language === "ar" ? "فشل نشر المنتج" : "بڵاوکردنەوەی بەرهەم سەرکەوتوو نەبوو"),
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
                {language === "ar" ? "تسجيل الدخول مطلوب" : "پێویستە بچیتە ژوورەوە"}
              </h2>
              <p className="text-muted-foreground">
                {language === "ar" ? "يجب تسجيل الدخول لإضافة منتج" : "پێویستە بچیتە ژوورەوە بۆ زیادکردنی بەرهەم"}
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
                {language === "ar" ? "تحقق من رقم هاتفك للبيع" : "ژمارەی تەلەفۆنت پشتڕاست بکە بۆ فرۆشتن"}
              </h2>
              
              <p className="text-muted-foreground text-sm">
                {language === "ar" ? "يجب التحقق من رقم هاتفك عبر واتساب لتتمكن من البيع على منصتنا" : "دەبێت ژمارەی تەلەفۆنت بە واتسئاپ پشتڕاست بکەیت بۆ ئەوەی بتوانیت شتەکان بفرۆشیت"}
              </p>
              <Link href="/settings">
                <Button className="w-full">
                  {language === "ar" ? "التحقق من الهاتف" : "پشتڕاستکردنی ژمارەی تەلەفۆن"}
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">{language === "ar" ? "العودة للصفحة الرئيسية" : "گەڕانەوە بۆ سەرەکی"}</Button>
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
                <p className="font-medium text-blue-800">{language === "ar" ? "لديك مسودة محفوظة" : "ڕەشنووسێکی پاشەکەوتکراوت هەیە"}</p>
                <p className="text-sm text-blue-600">{language === "ar" ? "هل تريد استكمال العمل على المنتج السابق؟" : "دەتەوێت کارەکەت لەسەر بەرهەمی پێشوو تەواو بکەیت؟"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={clearDraft}>
                {language === "ar" ? "تجاهل" : "پشتگوێ بخە"}
              </Button>
              <Button type="button" size="sm" onClick={loadDraft} className="bg-blue-600 hover:bg-blue-700">
                {language === "ar" ? "استرجاع المسودة" : "ڕەشنووس بگەڕێنەوە"}
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
                {language === "ar" ? "أضف صورتين على الأقل للمتابعة" : "لانیکەم دوو وێنە زیاد بکە بۆ بەردەوامبوون"}
              </p>
            )}
          </div>

          {/* Step 2: Product Info */}
          <div className="space-y-6">
            {wasAIFilled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <span>✨</span>
                  {language === "ar" ? "تم ملؤه بالذكاء الاصطناعي" : "پڕکرایەوە بە AI"}
                </Badge>
                <p className="text-sm text-blue-700">
                  {language === "ar" ? "يمكنك تعديل الحقول أدناه" : "دەتوانیت خانەکان دەستکاری بکەیت"}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("productTitle")} *</Label>
              <Input 
                placeholder={language === "ar" ? "مثال: ساعة رولكس فينتاج 1970" : "نموونە: کاتژمێری ڕۆلێکس ١٩٧٠"}
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                data-testid="input-title"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t("productDescription")} *</Label>
              <Textarea 
                placeholder={language === "ar" ? "اكتب وصفاً تفصيلياً للمنتج..." : "وەسفی ورد بۆ بەرهەم بنووسە..."}
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
              <Label>{language === "ar" ? "الماركة" : "براند"}</Label>
              <Input
                placeholder={language === "ar" ? "اكتب اسم الماركة (اختياري)" : "ناوی براند بنووسە (ئارەزوومەندانە)"}
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
              <Label>{language === "ar" ? "الكلمات المفتاحية" : "وشەی سەرەکییەکان"}</Label>
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
                  placeholder={language === "ar" ? "اكتب واضغط Enter" : "بنووسە و Enter دابگرە"}
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
                  ? (language === "ar" ? "سعر البداية" : "نرخی دەستپێک") 
                  : (language === "ar" ? "السعر" : "نرخ")} ({t("iqd")}) *
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
                <Label htmlFor="quantityAvailable">{language === "ar" ? "الكمية المتوفرة" : "بڕی بەردەست"} *</Label>
                <Input id="quantityAvailable" type="text" inputMode="numeric" pattern="[0-9٠-٩]*" placeholder="1" value={formData.quantityAvailable ?? "1"} onChange={(e) => handleInputChange("quantityAvailable", e.target.value)} data-testid="input-quantity" />
                <p className="text-xs text-muted-foreground">{language === "ar" ? "عدد القطع المتوفرة للبيع" : "ژمارەی پارچەکان بۆ فرۆشتن"}</p>
              </div>
              <Input
              />
              <p className="text-xs text-muted-foreground">
                {language === "ar" ? "الحد الأدنى: 1,000 دينار" : "کەمترین: ١,٠٠٠ دینار"}
              </p>
            </div>
            
            {saleType === "auction" && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    {language === "ar" ? "موعد بدء المزاد" : "کاتی دەستپێکردنی مزایدە"}
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
                          {language === "ar" ? "ابدأ فوراً" : "ئێستا دەستپێبکە"}
                        </div>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "يبدأ المزاد عند النشر" : "مزایدە دەستپێدەکات کاتی بڵاوکردنەوە"}
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
                          {language === "ar" ? "جدولة موعد" : "کاتی دیاریکراو"}
                        </div>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "اختر تاريخ ووقت محدد" : "ڕێکەوت و کات هەڵبژێرە"}
                        </p>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                {startTimeOption === "schedule" && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="space-y-2">
                      <Label>{language === "ar" ? "تاريخ البداية" : "ڕێکەوتی دەستپێک"} *</Label>
                      <Input 
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{language === "ar" ? "ساعة البداية" : "کاتژمێری دەستپێک"} *</Label>
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
                    <Label>{language === "ar" ? "تاريخ الانتهاء" : "ڕێکەوتی کۆتایی"} *</Label>
                    <Input 
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange("endDate", e.target.value)}
                      min={startTimeOption === "now" ? new Date().toISOString().split('T')[0] : (formData.startDate || new Date().toISOString().split('T')[0])}
                      data-testid="input-end-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "ar" ? "ساعة الانتهاء" : "کاتژمێری کۆتایی"} *</Label>
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
                  <Label>{language === "ar" ? "سعر الشراء الفوري (اختياري)" : "نرخی کڕینی ڕاستەوخۆ"}</Label>
                  <Input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9٠-٩]*"
                    placeholder={language === "ar" ? "اتركه فارغاً إذا لم ترغب" : "بەتاڵی جێبهێڵە ئەگەر نەتەوێت"}
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
                        {language === "ar" ? "سعر احتياطي (اختياري)" : "نرخی پاراستن (ئارەزوومەندانە)"}
                      </Label>
                      <p className="text-xs text-amber-700 mt-1">
                        {language === "ar" 
                          ? "حدد سعراً أدنى يجب الوصول إليه لإتمام البيع" 
                          : "کەمترین نرخێک دیاری بکە کە دەبێت بگاتە بۆ تەواوکردنی فرۆشتن"}
                      </p>
                    </div>
                  </div>
                  
                  {hasReservePrice && (
                    <div className="space-y-2">
                      <Label>{language === "ar" ? "السعر الاحتياطي" : "نرخی پاراستن"}</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9٠-٩]*"
                        placeholder={language === "ar" ? "أدخل السعر الاحتياطي" : "نرخی پاراستن بنووسە"}
                        value={formData.reservePrice}
                        onChange={(e) => handleInputChange("reservePrice", e.target.value)}
                        data-testid="input-reserve-price"
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === "ar" 
                          ? "لن يتم بيع المنتج إذا لم يصل المزاد لهذا السعر" 
                          : "بەرهەمەکە نافرۆشرێت ئەگەر مزایدە نەگاتە ئەم نرخە"}
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
                    {language === "ar" ? "من يمكنه المزايدة؟" : "کێ دەتوانێت مزایدە بکات؟"}
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
                          {language === "ar" ? "جميع المستخدمين" : "هەموو بەکارهێنەران"}
                        </div>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "يسمح لأي مستخدم مسجل بالمزايدة." : "ڕێگە بە هەر بەکارهێنەرێکی تۆمارکراو دەدرێت مزایدە بکات."}
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
                          {language === "ar" ? "الموثقون فقط" : "تەنها متمانەپێکراوەکان"}
                        </div>
                        <p className="text-xs text-gray-500">
                          {language === "ar" ? "يسمح فقط لمن لديهم حسابات موثقة (أكثر أماناً)." : "تەنها ڕێگە بەوانە دەدرێت کە هەژماری متمانەپێکراویان هەیە (پارێزراوترە)."}
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
                        {language === "ar" ? "قابل للتفاوض" : "دەکرێت گفتوگۆ بکرێت"}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {language === "ar" ? "السماح للمشترين بتقديم عروض أسعار" : "ڕێگە بدە بە کڕیاران پێشنیاری نرخ بکەن"}
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
                {language === "ar" ? "موقع الاستلام" : "شوێنی وەرگرتنەوە"} *
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
                              {language === "ar" ? "افتراضي" : "بنەڕەتی"}
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
                            {language === "ar" ? "الموقع محدد على الخريطة" : "شوێن لەسەر نەخشە دیاریکراوە"}
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
                        {language === "ar" ? "تغيير" : "گۆڕین"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === "ar" 
                        ? "لم يتم تحديد موقع الاستلام بعد" 
                        : "هێشتا شوێنی وەرگرتنەوە دیاری نەکراوە"}
                    </p>
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => setShowAddressModal(true)}
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      {language === "ar" ? "إضافة موقع الاستلام" : "شوێنی وەرگرتنەوە زیاد بکە"}
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
              <Label>{language === "ar" ? "مدة التوصيل" : "ماوەی گەیاندن"} *</Label>
              <Select value={formData.deliveryWindow} onValueChange={(v) => handleInputChange("deliveryWindow", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2 أيام">1-2 {language === "ar" ? "أيام" : "ڕۆژ"}</SelectItem>
                  <SelectItem value="3-5 أيام">3-5 {language === "ar" ? "أيام" : "ڕۆژ"}</SelectItem>
                  <SelectItem value="5-7 أيام">5-7 {language === "ar" ? "أيام" : "ڕۆژ"}</SelectItem>
                  <SelectItem value="1-2 أسبوع">1-2 {language === "ar" ? "أسبوع" : "هەفتە"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label>{language === "ar" ? "تكلفة الشحن" : "تێچووی گواستنەوە"}</Label>
              <RadioGroup 
                value={formData.shippingType} 
                onValueChange={(v) => handleInputChange("shippingType", v)}
                className="space-y-2"
              >
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="seller_pays" id="ship-free" />
                  <Label htmlFor="ship-free" className="flex-1 cursor-pointer">
                    {language === "ar" ? "شحن مجاني" : "گواستنەوەی بەخۆڕایی"}
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="buyer_pays" id="ship-buyer" />
                  <Label htmlFor="ship-buyer" className="flex-1 cursor-pointer">
                    {language === "ar" ? "على حساب المشتري" : "بە تێچووی کڕیار"}
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="pickup" id="ship-pickup" />
                  <Label htmlFor="ship-pickup" className="flex-1 cursor-pointer">
                    {language === "ar" ? "استلام شخصي" : "وەرگرتنی کەسی"}
                  </Label>
                </div>
              </RadioGroup>
              
              {formData.shippingType === "buyer_pays" && (
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9٠-٩]*"
                  placeholder={language === "ar" ? "تكلفة الشحن بالدينار" : "تێچووی گواستنەوە بە دینار"}
                  value={formData.shippingCost}
                  onChange={(e) => handleInputChange("shippingCost", e.target.value)}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>{language === "ar" ? "سياسة الإرجاع" : "سیاسەتی گەڕانەوە"} *</Label>
              <Select value={formData.returnPolicy} onValueChange={(v) => handleInputChange("returnPolicy", v)}>
                <SelectTrigger data-testid="select-return-policy">
                  <SelectValue placeholder={language === "ar" ? "اختر سياسة الإرجاع" : "سیاسەتی گەڕانەوە هەڵبژێرە"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="لا يوجد إرجاع">{language === "ar" ? "لا يوجد إرجاع" : "گەڕانەوە نییە"}</SelectItem>
                  <SelectItem value="3 أيام">{language === "ar" ? "إرجاع خلال 3 أيام" : "گەڕانەوە لە ماوەی ٣ ڕۆژ"}</SelectItem>
                  <SelectItem value="7 أيام">{language === "ar" ? "إرجاع خلال 7 أيام" : "گەڕانەوە لە ماوەی ٧ ڕۆژ"}</SelectItem>
                  <SelectItem value="14 يوم">{language === "ar" ? "إرجاع خلال 14 يوم" : "گەڕانەوە لە ماوەی ١٤ ڕۆژ"}</SelectItem>
                  <SelectItem value="30 يوم">{language === "ar" ? "إرجاع خلال 30 يوم" : "گەڕانەوە لە ماوەی ٣٠ ڕۆژ"}</SelectItem>
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
                  <span className="text-muted-foreground">{language === "ar" ? "المدينة" : "شار"}:</span>
                  <span className="mr-2 font-medium">{formData.city}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{language === "ar" ? "الشحن" : "گواستنەوە"}:</span>
                  <span className="mr-2 font-medium">
                    {formData.shippingType === "seller_pays" 
                      ? (language === "ar" ? "مجاني" : "بەخۆڕایی")
                      : formData.shippingType === "pickup"
                        ? (language === "ar" ? "استلام شخصي" : "وەرگرتنی کەسی")
                        : `${parseInt(formData.shippingCost || "0").toLocaleString()} ${t("iqd")}`
                    }
                  </span>
                </div>
              </div>
              
              {isNegotiable && (
                <Badge variant="secondary" className="w-fit">
                  {language === "ar" ? "قابل للتفاوض" : "دەکرێت گفتوگۆ بکرێت"}
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
                    {language === "ar" ? "جاهز للنشر!" : "ئامادەیە بۆ بڵاوکردنەوە!"}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {language === "ar" 
                      ? "راجع البيانات أعلاه ثم اضغط على زر النشر"
                      : "زانیاریەکان لە سەرەوە بپشکنە پاشان دوگمەی بڵاوکردنەوە دابگرە"}
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
                {language === "ar" ? "حفظ التغييرات؟" : "گۆڕانکاریەکان پاشەکەوت بکەیت؟"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-gray-600 text-sm py-2">
              {language === "ar" 
                ? "لديك تغييرات غير محفوظة. هل تريد حفظها كمسودة قبل المغادرة؟" 
                : "گۆڕانکاریی پاشەکەوت نەکراوت هەیە. دەتەوێت وەک ڕەشنووس پاشەکەوتی بکەیت پێش ئەوەی بڕۆیت؟"}
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
                {language === "ar" ? "تجاهل" : "پشتگوێ بخە"}
              </Button>
              <Button
                onClick={() => {
                  saveDraftToStorage();
                  toast({ 
                    title: language === "ar" ? "تم حفظ المسودة" : "ڕەشنووس پاشەکەوت کرا", 
                    description: language === "ar" ? "يمكنك إكمال الإعلان لاحقاً" : "دەتوانیت دواتر ڕیکلامەکە تەواو بکەیت" 
                  });
                  setShowExitConfirm(false);
                  setLocation("/");
                }}
                className="flex-1 bg-primary"
              >
                {language === "ar" ? "حفظ ومغادرة" : "پاشەکەوت و بڕۆ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
