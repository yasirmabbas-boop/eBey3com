import { Layout } from "@/components/layout";
import { useLanguage } from "@/lib/i18n";
import { Play } from "lucide-react";

export default function SwipePage() {
  const { language } = useLanguage();

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Play className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-3">
          {language === "ar" ? "قريباً" : "بەم زووانە"}
        </h1>
        <p className="text-muted-foreground max-w-sm">
          {language === "ar" 
            ? "نعمل على تجربة تصفح جديدة ومميزة. ترقبوا التحديث القادم!"
            : "کار لەسەر ئەزموونێکی نوێی گەڕان دەکەین. چاوەڕێی نوێکردنەوەی داهاتوو بن!"}
        </p>
      </div>
    </Layout>
  );
}
