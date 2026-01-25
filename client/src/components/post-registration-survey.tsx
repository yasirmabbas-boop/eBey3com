import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface UserProfile {
  ageBracket?: string;
  interests?: string[];
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

interface PostRegistrationSurveyProps {
  open: boolean;
  onClose: () => void;
}

export function PostRegistrationSurvey({ open, onClose }: PostRegistrationSurveyProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ageBracket, setAgeBracket] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/account/profile"],
    enabled: open,
  });

  useEffect(() => {
    if (profile) {
      setAgeBracket(profile.ageBracket || "");
      setInterests(profile.interests || []);
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { ageBracket?: string; interests?: string[]; surveyCompleted: boolean }) => {
      const response = await apiRequest("PUT", "/api/account/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "شكراً لك!",
        description: "تم حفظ معلوماتك بنجاح",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    updateProfileMutation.mutate({
      ageBracket,
      interests,
      surveyCompleted: true,
    });
  };

  const handleSkip = () => {
    updateProfileMutation.mutate({
      surveyCompleted: true,
    });
  };

  const toggleInterest = (value: string) => {
    setInterests(prev => 
      prev.includes(value) 
        ? prev.filter(i => i !== value) 
        : [...prev, value]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            ساعدنا نعرفك أكثر
          </DialogTitle>
          <DialogDescription>
            أجب على هذه الأسئلة لنقدم لك تجربة أفضل وعروض مخصصة لاهتماماتك
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-base font-semibold">الفئة العمرية</Label>
            <Select value={ageBracket} onValueChange={setAgeBracket}>
              <SelectTrigger data-testid="survey-select-age">
                <SelectValue placeholder="اختر الفئة العمرية" />
              </SelectTrigger>
              <SelectContent>
                {AGE_BRACKETS.map(bracket => (
                  <SelectItem key={bracket.value} value={bracket.value}>
                    {bracket.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">ما هي اهتماماتك؟</Label>
            <p className="text-sm text-muted-foreground">اختر ما يناسبك لنعرض لك منتجات تهمك</p>
            <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-gray-50 mt-2">
              {INTEREST_OPTIONS.map((interest) => (
                <div key={interest.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`survey-interest-${interest.value}`}
                    checked={interests.includes(interest.value)}
                    onCheckedChange={() => toggleInterest(interest.value)}
                    data-testid={`survey-checkbox-${interest.value}`}
                  />
                  <label 
                    htmlFor={`survey-interest-${interest.value}`} 
                    className="text-sm cursor-pointer"
                  >
                    {interest.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={updateProfileMutation.isPending}
            data-testid="survey-button-skip"
          >
            تخطي
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateProfileMutation.isPending}
            data-testid="survey-button-submit"
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري الحفظ...
              </>
            ) : (
              "حفظ"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
