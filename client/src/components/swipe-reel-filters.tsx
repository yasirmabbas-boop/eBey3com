import { useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/i18n";

export interface SwipeFilters {
  categories: string[];
  saleType: 'all' | 'auction' | 'fixed';
  conditions: string[];
}

interface SwipeReelFiltersProps {
  filters: SwipeFilters;
  onFiltersChange: (filters: SwipeFilters) => void;
  hidden?: boolean;
}

const CATEGORIES = [
  { id: "ساعات", nameAr: "ساعات", nameKu: "کاتژمێر" },
  { id: "إلكترونيات", nameAr: "إلكترونيات", nameKu: "ئەلیکترۆنیات" },
  { id: "ملابس", nameAr: "ملابس", nameKu: "جلوبەرگ" },
  { id: "تحف وأثاث", nameAr: "تحف وأثاث", nameKu: "کەلوپەل" },
  { id: "مجوهرات", nameAr: "مجوهرات", nameKu: "زێوەر" },
  { id: "مكياج", nameAr: "مكياج", nameKu: "مەیکئەپ" },
  { id: "آلات موسيقية", nameAr: "آلات موسيقية", nameKu: "ئامێری میوزیک" },
  { id: "مقتنيات", nameAr: "مقتنيات", nameKu: "کۆکراوەکان" },
  { id: "أخرى", nameAr: "أخرى", nameKu: "تر" },
];

const CONDITIONS = [
  { id: "New", labelAr: "جديد", labelKu: "نوێ" },
  { id: "Used", labelAr: "مستعمل", labelKu: "بەکارهاتوو" },
  { id: "Vintage", labelAr: "فينتاج", labelKu: "ڤینتەیج" },
];

export function SwipeReelFilters({ filters, onFiltersChange, hidden = false }: SwipeReelFiltersProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = 
    filters.categories.length + 
    (filters.saleType !== 'all' ? 1 : 0) + 
    filters.conditions.length;

  const toggleCategory = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter((c) => c !== categoryId)
      : [...filters.categories, categoryId];
    
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const toggleCondition = (conditionId: string) => {
    const newConditions = filters.conditions.includes(conditionId)
      ? filters.conditions.filter((c) => c !== conditionId)
      : [...filters.conditions, conditionId];
    
    onFiltersChange({ ...filters, conditions: newConditions });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      saleType: 'all',
      conditions: [],
    });
  };

  const selectCategory = (categoryId: string) => {
    const isSelected = filters.categories.includes(categoryId);
    onFiltersChange({ 
      ...filters, 
      categories: isSelected ? [] : [categoryId]
    });
  };

  const selectSaleType = (type: 'auction' | 'fixed') => {
    const isSelected = filters.saleType === type;
    onFiltersChange({ 
      ...filters, 
      saleType: isSelected ? 'all' : type
    });
  };

  return (
    <div 
      className={`absolute top-0 left-0 right-0 z-30 transition-opacity duration-300 ${hidden ? 'opacity-0 pointer-events-none' : ''}`}
      style={{ paddingTop: 'max(var(--safe-area-top, env(safe-area-inset-top, 8px)), 8px)' }}
    >
      <div className="px-2 py-2">
        <div className="flex items-center gap-2">
          {/* Quick Filter Pills - Horizontal Scroll */}
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 px-1">
              {/* Sale Type Pills */}
              <button
                onClick={() => selectSaleType('auction')}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all whitespace-nowrap backdrop-blur-sm
                  ${filters.saleType === 'auction'
                    ? 'bg-orange-500 text-white'
                    : 'bg-black/30 text-white hover:bg-black/40'
                  }
                `}
              >
                {language === "ar" ? "مزاد" : "مزایدە"}
              </button>
              <button
                onClick={() => selectSaleType('fixed')}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all whitespace-nowrap backdrop-blur-sm
                  ${filters.saleType === 'fixed'
                    ? 'bg-green-500 text-white'
                    : 'bg-black/30 text-white hover:bg-black/40'
                  }
                `}
              >
                {language === "ar" ? "شراء فوري" : "کڕینی خێرا"}
              </button>
              
              {/* Divider */}
              <div className="w-px h-6 bg-white/30 flex-shrink-0" />
              
              {/* Category Pills */}
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat.id)}
                  className={`
                    flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                    transition-all whitespace-nowrap backdrop-blur-sm
                    ${filters.categories.includes(cat.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-black/30 text-white hover:bg-black/40'
                    }
                  `}
                >
                  {language === "ar" ? cat.nameAr : cat.nameKu}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Sheet Trigger */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="relative bg-black/30 backdrop-blur-sm border-0 text-white hover:bg-black/40"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle className="text-right">
                  {language === "ar" ? "الفلاتر" : "فلتەرەکان"}
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="h-full mt-6 pb-20">
                <div className="space-y-6">
                  {/* Categories */}
                  <div>
                    <h3 className="font-semibold mb-3 text-right">
                      {language === "ar" ? "الفئات" : "جۆرەکان"}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => toggleCategory(cat.id)}
                          className={`
                            px-4 py-2 rounded-lg text-sm font-medium
                            transition-colors
                            ${filters.categories.includes(cat.id)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }
                          `}
                        >
                          {language === "ar" ? cat.nameAr : cat.nameKu}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sale Type */}
                  <div>
                    <h3 className="font-semibold mb-3 text-right">
                      {language === "ar" ? "نوع البيع" : "جۆری فرۆشتن"}
                    </h3>
                    <ToggleGroup 
                      type="single" 
                      value={filters.saleType}
                      onValueChange={(value) => {
                        if (value) {
                          onFiltersChange({ 
                            ...filters, 
                            saleType: value as 'all' | 'auction' | 'fixed' 
                          });
                        }
                      }}
                      className="justify-start gap-2"
                    >
                      <ToggleGroupItem value="all" className="flex-1">
                        {language === "ar" ? "الكل" : "هەموو"}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="auction" className="flex-1">
                        {language === "ar" ? "مزادات" : "مزایدەکان"}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="fixed" className="flex-1">
                        {language === "ar" ? "شراء فوري" : "کڕینی خێرا"}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Conditions */}
                  <div>
                    <h3 className="font-semibold mb-3 text-right">
                      {language === "ar" ? "الحالة" : "دۆخ"}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {CONDITIONS.map((cond) => (
                        <button
                          key={cond.id}
                          onClick={() => toggleCondition(cond.id)}
                          className={`
                            px-4 py-2 rounded-lg text-sm font-medium
                            transition-colors
                            ${filters.conditions.includes(cond.id)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }
                          `}
                        >
                          {language === "ar" ? cond.labelAr : cond.labelKu}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Footer Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={clearAllFilters}
                  disabled={activeFilterCount === 0}
                >
                  <X className="h-4 w-4 ml-2" />
                  {language === "ar" ? "مسح الكل" : "سڕینەوەی هەموو"}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setIsOpen(false)}
                >
                  {language === "ar" ? "تطبيق" : "جێبەجێکردن"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
