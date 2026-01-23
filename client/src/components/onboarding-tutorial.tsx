import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Home, Search, ShoppingCart, MessageCircle, User, Gavel, Tag, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "مرحباً بك في E-بيع! 🎉",
    description: "أول منصة مزادات إلكترونية في العراق. دعنا نُعرّفك على أهم المميزات في دقيقة واحدة فقط.",
    icon: <Home className="h-8 w-8 text-blue-500" />,
  },
  {
    id: "search",
    title: "ابحث عن ما تريد",
    description: "استخدم شريط البحث للعثور على المنتجات. يمكنك البحث بالاسم، الفئة، أو حتى بالصورة!",
    icon: <Search className="h-8 w-8 text-green-500" />,
    highlight: "search",
  },
  {
    id: "auctions",
    title: "المزادات الحية",
    description: "شارك في المزادات واحصل على أفضل الأسعار. إذا زايدت في آخر دقيقتين، يتمدد الوقت تلقائياً!",
    icon: <Gavel className="h-8 w-8 text-red-500" />,
  },
  {
    id: "fixed",
    title: "شراء الآن",
    description: "لا تريد الانتظار؟ اشترِ فوراً بالسعر الثابت. أضف للسلة وأكمل الطلب بسهولة.",
    icon: <Tag className="h-8 w-8 text-purple-500" />,
  },
  {
    id: "cart",
    title: "سلة التسوق",
    description: "أضف المنتجات إلى السلة واشترِ عدة منتجات في طلب واحد.",
    icon: <ShoppingCart className="h-8 w-8 text-orange-500" />,
    highlight: "cart",
  },
  {
    id: "messages",
    title: "تواصل مع البائعين",
    description: "لديك سؤال؟ راسل البائع مباشرة من صفحة المنتج للاستفسار قبل الشراء.",
    icon: <MessageCircle className="h-8 w-8 text-cyan-500" />,
    highlight: "messages",
  },
  {
    id: "profile",
    title: "ملفك الشخصي",
    description: "تابع مشترياتك، مبيعاتك، ومزاداتك من حسابك الشخصي.",
    icon: <User className="h-8 w-8 text-indigo-500" />,
    highlight: "profile",
  },
  {
    id: "security",
    title: "أمان وخصوصية",
    description: "جميع البائعين موثقين. بياناتك ومعاملاتك محمية بأعلى معايير الأمان.",
    icon: <Shield className="h-8 w-8 text-emerald-500" />,
  },
  {
    id: "complete",
    title: "أنت جاهز! ✨",
    description: "ابدأ رحلتك الآن واكتشف آلاف المنتجات. مزادات يومية وعروض حصرية بانتظارك!",
    icon: <CheckCircle2 className="h-8 w-8 text-green-500" />,
  },
];

const STORAGE_KEY = "ebey3_tutorial_seen";

export function OnboardingTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setHasSeenTutorial(false);
      const timer = setTimeout(() => {
        setIsOpen(true);
        setTimeout(() => setIsVisible(true), 50);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setHasSeenTutorial(true);
    setIsVisible(false);
    setTimeout(() => setIsOpen(false), 300);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setHasSeenTutorial(true);
    setIsVisible(false);
    setTimeout(() => setIsOpen(false), 300);
  };

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  if (hasSeenTutorial && !isOpen) {
    return null;
  }

  return (
    <>
      {isOpen && (
        <>
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleSkip}
          />
          <div
            className={`fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card rounded-2xl shadow-[var(--shadow-3)] z-[101] overflow-hidden soft-border transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            dir="rtl"
          >
            <div className="h-1 bg-muted/60">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <button
              onClick={handleSkip}
              className="absolute top-3 left-3 p-2 rounded-full hover:bg-muted/60 transition-colors"
              data-testid="button-skip-tutorial"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="p-6 pt-8">
              <div className="flex justify-center mb-4">
                <div
                  key={step.id}
                  className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center transition-transform duration-300"
                >
                  {step.icon}
                </div>
              </div>

              <div
                key={step.id + "-content"}
                className="transition-opacity duration-200"
              >
                <h3 className="text-xl font-bold text-center text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-center leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              <div className="flex justify-center gap-1.5 mb-6">
                {TUTORIAL_STEPS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentStep
                        ? "bg-primary w-4"
                        : index < currentStep
                        ? "bg-primary/40"
                        : "bg-muted-foreground/30"
                    }`}
                    data-testid={`button-step-${index}`}
                  />
                ))}
              </div>

              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    className="flex-1"
                    data-testid="button-prev-step"
                  >
                    <ChevronRight className="h-4 w-4 ml-1" />
                    السابق
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={`flex-1 ${currentStep === 0 ? "w-full" : ""}`}
                  data-testid="button-next-step"
                >
                  {currentStep === TUTORIAL_STEPS.length - 1 ? (
                    "ابدأ التسوق"
                  ) : (
                    <>
                      التالي
                      <ChevronLeft className="h-4 w-4 mr-1" />
                    </>
                  )}
                </Button>
              </div>

              {currentStep === 0 && (
                <button
                  onClick={handleSkip}
                  className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-skip-intro"
                >
                  تخطي الدليل
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function TutorialTrigger() {
  const handleRestart = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return (
    <button
      onClick={handleRestart}
      className="text-xs text-primary hover:text-foreground underline"
      data-testid="button-restart-tutorial"
    >
      عرض الدليل الإرشادي
    </button>
  );
}
