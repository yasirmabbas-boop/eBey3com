import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Facebook, MessageCircle, Send, Twitter, Link as LinkIcon } from "lucide-react";
import { shareToFacebook, shareToWhatsApp, shareToTelegram, shareToTwitter, copyToClipboard } from "@/lib/share-utils";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

interface ShareMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  text?: string;
}

export function ShareMenuDialog({ open, onOpenChange, url, title, text }: ShareMenuDialogProps) {
  const { language } = useLanguage();
  const { toast } = useToast();

  const shareText = text || `${title} - ${url}`;

  const handleShare = (platform: string, shareFn: () => void) => {
    shareFn();
    onOpenChange(false);
    toast({
      title: language === "ar" ? "تمت المشاركة" : "Shared",
      description: language === "ar" ? `تمت المشاركة على ${platform}` : `Shared on ${platform}`,
    });
  };

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(url);
      onOpenChange(false);
      toast({
        title: language === "ar" ? "تم النسخ" : "Copied",
        description: language === "ar" ? "تم نسخ الرابط" : "Link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "فشل نسخ الرابط" : "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={language === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="text-right">
            {language === "ar" ? "مشاركة" : "Share"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => handleShare("Facebook", () => shareToFacebook(url))}
          >
            <Facebook className="h-6 w-6 text-blue-600" />
            <span className="text-sm">Facebook</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => handleShare("WhatsApp", () => shareToWhatsApp(url, shareText))}
          >
            <MessageCircle className="h-6 w-6 text-green-600" />
            <span className="text-sm">WhatsApp</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => handleShare("Telegram", () => shareToTelegram(url, shareText))}
          >
            <Send className="h-6 w-6 text-blue-500" />
            <span className="text-sm">Telegram</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => handleShare("Twitter", () => shareToTwitter(url, shareText))}
          >
            <Twitter className="h-6 w-6 text-blue-400" />
            <span className="text-sm">Twitter</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 col-span-2"
            onClick={handleCopyLink}
          >
            <LinkIcon className="h-6 w-6" />
            <span className="text-sm">{language === "ar" ? "نسخ الرابط" : "Copy Link"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
