import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { 
  Camera, 
  Tag, 
  DollarSign, 
  MapPin, 
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Check,
  X
} from "lucide-react";

interface Step {
  id: number;
  titleAr: string;
  titleKu: string;
  icon: React.ReactNode;
  isComplete: boolean;
}

interface SellWizardProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  stepValidation: boolean[];
  children: React.ReactNode[];
  onSubmit: () => void;
  isSubmitting: boolean;
  onCancel?: () => void;
}

export function SellWizard({
  currentStep,
  onStepChange,
  stepValidation,
  children,
  onSubmit,
  isSubmitting,
  onCancel,
}: SellWizardProps) {
  const { language } = useLanguage();
  
  const steps: Step[] = [
    { 
      id: 1, 
      titleAr: "الصور", 
      titleKu: "وێنەکان",
      icon: <Camera className="h-5 w-5" />,
      isComplete: stepValidation[0] || false
    },
    { 
      id: 2, 
      titleAr: "المعلومات", 
      titleKu: "زانیاری",
      icon: <Tag className="h-5 w-5" />,
      isComplete: stepValidation[1] || false
    },
    { 
      id: 3, 
      titleAr: "السعر", 
      titleKu: "نرخ",
      icon: <DollarSign className="h-5 w-5" />,
      isComplete: stepValidation[2] || false
    },
    { 
      id: 4, 
      titleAr: "الشحن", 
      titleKu: "گواستنەوە",
      icon: <MapPin className="h-5 w-5" />,
      isComplete: stepValidation[3] || false
    },
    { 
      id: 5, 
      titleAr: "المراجعة", 
      titleKu: "پێداچوونەوە",
      icon: <CheckCircle2 className="h-5 w-5" />,
      isComplete: stepValidation[4] || false
    },
  ];

  const progress = (currentStep / steps.length) * 100;
  const isLastStep = currentStep === steps.length;
  const isFirstStep = currentStep === 1;

  const handleNext = () => {
    if (currentStep < steps.length) {
      // Extra guard: never advance if current step is invalid.
      if (!stepValidation[currentStep - 1]) return;
      onStepChange(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      onStepChange(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    if (stepId <= currentStep || stepValidation[stepId - 2]) {
      onStepChange(stepId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">
            {language === "ar" ? "إضافة منتج" : language === "ku" ? "بەرهەم زیادکردن" : "إضافة منتج"}
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {currentStep} / {steps.length}
            </Badge>
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="h-8 w-8 text-gray-500 hover:text-red-500"
                data-testid="wizard-cancel"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
        
        <Progress value={progress} className="h-2 mb-4" />
        
        <div className="flex justify-between">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              disabled={step.id > currentStep && !stepValidation[step.id - 2]}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                step.id === currentStep 
                  ? "bg-primary/10 text-primary" 
                  : step.id < currentStep || step.isComplete
                    ? "text-green-600 cursor-pointer hover:bg-green-50"
                    : "text-gray-400 cursor-not-allowed"
              }`}
              data-testid={`wizard-step-${step.id}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step.id === currentStep 
                  ? "border-primary bg-primary/10" 
                  : step.id < currentStep || step.isComplete
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300"
              }`}>
                {step.id < currentStep || step.isComplete ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  step.icon
                )}
              </div>
              <span className="text-xs font-medium hidden md:block">
                {language === "ar" ? step.titleAr : step.titleKu}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              {steps[currentStep - 1].icon}
              {language === "ar" 
                ? steps[currentStep - 1].titleAr 
                : steps[currentStep - 1].titleKu}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              {currentStep === 1 && (language === "ar" ? "أضف صوراً واضحة لمنتجك (حتى 8 صور)" : language === "ku" ? "وێنەی ڕوون زیاد بکە بۆ بەرهەمەکەت (هەتا ٨ وێنە)" : "أضف صوراً واضحة لمنتجك (حتى 8 صور)")}
              {currentStep === 2 && (language === "ar" ? "أدخل معلومات المنتج الأساسية" : language === "ku" ? "زانیاری سەرەکی بەرهەم بنووسە" : "أدخل معلومات المنتج الأساسية")}
              {currentStep === 3 && (language === "ar" ? "حدد طريقة البيع والسعر" : language === "ku" ? "شێوازی فرۆشتن و نرخ دیاری بکە" : "حدد طريقة البيع والسعر")}
              {currentStep === 4 && (language === "ar" ? "حدد موقعك وخيارات الشحن" : language === "ku" ? "شوێنەکەت و هەڵبژاردنەکانی گواستنەوە دیاری بکە" : "حدد موقعك وخيارات الشحن")}
              {currentStep === 5 && (language === "ar" ? "راجع بياناتك قبل النشر" : language === "ku" ? "زانیاریەکانت پێش بڵاوکردنەوە بپشکنە" : "راجع بياناتك قبل النشر")}
            </p>
          </div>

          {children[currentStep - 1]}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-4 sticky bottom-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstStep}
          className="flex-1 h-12"
          data-testid="wizard-prev"
        >
          <ChevronRight className="h-5 w-5 ml-2" />
          {language === "ar" ? "السابق" : language === "ku" ? "پێشوو" : "السابق"}
        </Button>
        
        {isLastStep ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !stepValidation.every(v => v)}
            className="flex-1 h-12 bg-green-600 hover:bg-green-700"
            data-testid="wizard-submit"
          >
            {isSubmitting ? (
              <span className="animate-pulse">
                {language === "ar" ? "جاري النشر..." : language === "ku" ? "بڵاوکردنەوە..." : "جاري النشر..."}
              </span>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 ml-2" />
                {language === "ar" ? "نشر المنتج" : language === "ku" ? "بەرهەم بڵاو بکەرەوە" : "نشر المنتج"}
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!stepValidation[currentStep - 1]}
            className="flex-1 h-12"
            data-testid="wizard-next"
          >
            {language === "ar" ? "التالي" : language === "ku" ? "دواتر" : "التالي"}
            <ChevronLeft className="h-5 w-5 mr-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
