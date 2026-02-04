import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { secureRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MakeOfferDialog({
  open,
  onOpenChange,
  listingId,
  defaultOfferAmount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  defaultOfferAmount?: number;
}) {
  const { toast } = useToast();
  const { language, t } = useLanguage();

  const initialAmount = useMemo(() => {
    if (!defaultOfferAmount || !Number.isFinite(defaultOfferAmount)) return "";
    return String(Math.max(1, Math.floor(defaultOfferAmount)));
  }, [defaultOfferAmount]);

  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  useEffect(() => {
    if (open) {
      setOfferAmount(initialAmount);
      setOfferMessage("");
    }
  }, [open, initialAmount]);

  const createOfferMutation = useMutation({
    mutationFn: async () => {
      const amount = parseInt(offerAmount, 10);
      const res = await secureRequest("/api/offers", {
        method: "POST",
        body: JSON.stringify({
          listingId,
          offerAmount: amount,
          message: offerMessage.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create offer");
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: t("offerSent"),
        description:
          language === "ar"
            ? "سيتم إعلامك عندما يرد البائع على عرضك"
            : language === "ku"
              ? "کاتێک فرۆشیار وەڵام بداتەوە ئاگادارت دەکرێیتەوە"
              : "You'll be notified when the seller responds.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const amountNum = parseInt(offerAmount, 10);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{t("makeOffer")}</DialogTitle>
          <DialogDescription>
            {language === "ar"
              ? "قدّم عرضك للبائع. يمكنك إضافة رسالة اختيارية."
              : language === "ku"
                ? "پێشنیارەکەت پێشکەش بکە. دەتوانیت نامەیەکیش زیاد بکەیت."
                : "Make an offer to the seller. You can add an optional message."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="offer-amount">
              {language === "ar" ? "عرضك (د.ع)" : language === "ku" ? "پێشنیارەکەت (د.ع)" : "Your offer (IQD)"}
            </Label>
            <Input
              id="offer-amount"
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              className="text-left"
              dir="ltr"
              data-testid="input-offer-amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-message">
              {language === "ar"
                ? "رسالة للبائع (اختياري)"
                : language === "ku"
                  ? "نامە بۆ فرۆشیار (هەڵبژاردەیی)"
                  : "Message (optional)"}
            </Label>
            <Textarea
              id="offer-message"
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              rows={3}
              data-testid="input-offer-message"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-offer"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={() => createOfferMutation.mutate()}
            disabled={!amountValid || createOfferMutation.isPending}
            data-testid="button-submit-offer"
          >
            {createOfferMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                {t("loading")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 ml-2" />
                {t("sendOffer")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

