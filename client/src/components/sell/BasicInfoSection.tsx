import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, Plus, X } from "lucide-react";

interface FormData {
  title: string;
  description: string;
  category: string;
  condition: string;
  brand: string;
  customBrand?: string;
  model?: string;
}

interface BasicInfoSectionProps {
  formData: FormData;
  tags: string[];
  tagInput: string;
  language: string;
  t: (key: string) => string;
  onInputChange: (field: string, value: string) => void;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (index: number) => void;
}

export function BasicInfoSection({
  formData,
  tags,
  tagInput,
  language,
  t,
  onInputChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
}: BasicInfoSectionProps) {
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      onAddTag();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          {language === "ar" ? "معلومات المنتج" : "زانیاری بەرهەم"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">{t("productTitle")} *</Label>
          <Input 
            id="title" 
            placeholder="مثال: ساعة رولكس سابماريينر فينتاج 1970" 
            required
            value={formData.title}
            onChange={(e) => onInputChange("title", e.target.value)}
            data-testid="input-title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t("productDescription")} *</Label>
          <Textarea 
            id="description" 
            placeholder="اكتب وصفاً تفصيلياً للمنتج، الحالة، التاريخ، أي عيوب..."
            rows={5}
            required
            value={formData.description}
            onChange={(e) => onInputChange("description", e.target.value)}
            data-testid="input-description"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="category">{t("category")} *</Label>
            <Select value={formData.category} onValueChange={(v) => onInputChange("category", v)}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder={t("selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ساعات">{t("watches")}</SelectItem>
                <SelectItem value="ملابس">{t("clothing")}</SelectItem>
                <SelectItem value="تحف وأثاث">{t("furniture")}</SelectItem>
                <SelectItem value="إلكترونيات">{t("electronics")}</SelectItem>
                <SelectItem value="مجوهرات">{t("jewelry")}</SelectItem>
                <SelectItem value="آلات موسيقية">{t("music")}</SelectItem>
                <SelectItem value="مقتنيات">{t("collectibles")}</SelectItem>
                <SelectItem value="أخرى">{t("other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">{t("condition")} *</Label>
            <Select value={formData.condition} onValueChange={(v) => onInputChange("condition", v)}>
              <SelectTrigger data-testid="select-condition">
                <SelectValue placeholder={t("selectCondition")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="New">{t("new")} {language === "ar" ? "(لم يُستخدم)" : "(بەکارنەهاتوو)"}</SelectItem>
                <SelectItem value="Used - Like New">{t("likeNew")}</SelectItem>
                <SelectItem value="Used - Good">{t("usedGood")}</SelectItem>
                <SelectItem value="Used - Fair">{t("usedFair")}</SelectItem>
                <SelectItem value="Vintage">{t("vintage")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="brand">{language === "ar" ? "الماركة / العلامة التجارية" : "براند / نیشانی بازرگانی"}</Label>
            <Select value={formData.brand || ""} onValueChange={(v) => onInputChange("brand", v)}>
              <SelectTrigger data-testid="select-brand">
                <SelectValue placeholder={language === "ar" ? "اختر الماركة" : "براند هەڵبژێرە"} />
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
                <SelectItem value="بدون ماركة">{language === "ar" ? "بدون ماركة" : "بێ براند"}</SelectItem>
                <SelectItem value="أخرى">{t("other")}</SelectItem>
              </SelectContent>
            </Select>
            {formData.brand === "أخرى" && (
              <Input 
                placeholder="أدخل اسم الماركة..."
                className="mt-2"
                onChange={(e) => onInputChange("customBrand", e.target.value)}
                data-testid="input-custom-brand"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">{language === "ar" ? "الموديل / الإصدار" : "مۆدێل / وەشان"}</Label>
            <Input 
              id="model" 
              placeholder="مثال: Submariner 5513"
              data-testid="input-model"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>{language === "ar" ? "الكلمات المفتاحية (Tags)" : "وشەی سەرەکییەکان"}</Label>
          <p className="text-sm text-gray-500">
            {language === "ar" ? "أضف كلمات تساعد المشترين في العثور على منتجك" : "وشە زیاد بکە بۆ یارمەتیدانی کڕیاران لە دۆزینەوەی بەرهەمەکەت"}
          </p>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => onTagInputChange(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={language === "ar" ? "اكتب واضغط Enter لإضافة..." : "بنووسە و Enter دابگرە بۆ زیادکردن..."}
              data-testid="input-tags"
            />
            <Button
              type="button"
              variant="outline"
              onClick={onAddTag}
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
                    onClick={() => onRemoveTag(idx)}
                    className="ml-1 hover:text-red-500"
                    data-testid={`remove-tag-${idx}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400">{tags.length}/10 {language === "ar" ? "كلمات مفتاحية" : "وشەی سەرەکی"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
