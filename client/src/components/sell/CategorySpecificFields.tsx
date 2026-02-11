import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import { 
  SPECIFICATION_OPTIONS, 
  CATEGORY_FIELD_CONFIG, 
  SPECIFICATION_LABELS 
} from "@/lib/search-data";

interface CategorySpecificFieldsProps {
  category: string;
  specifications: Record<string, string>;
  language: string;
  errors?: Record<string, string>;
  onChange: (specs: Record<string, string>) => void;
}

export function CategorySpecificFields({
  category,
  specifications,
  language,
  errors = {},
  onChange,
}: CategorySpecificFieldsProps) {
  const config = CATEGORY_FIELD_CONFIG[category];
  
  // If no config for this category, don't render anything
  if (!config) return null;
  
  const allFields = [...config.required, ...config.optional];
  
  // If no fields at all, don't render
  if (allFields.length === 0) return null;

  const handleFieldChange = (field: string, value: string) => {
    onChange({
      ...specifications,
      [field]: value,
    });
  };

  const getLabel = (field: string): string => {
    const labels = SPECIFICATION_LABELS[field];
    if (!labels) return field;
    return language === "ar" ? labels.ar : labels.ku;
  };

  const getOptionLabel = (option: { value: string; labelAr: string; labelKu: string }): string => {
    return language === "ar" ? option.labelAr : option.labelKu;
  };

  const isRequired = (field: string): boolean => {
    return config.required.includes(field);
  };

  const renderField = (field: string) => {
    const options = SPECIFICATION_OPTIONS[field as keyof typeof SPECIFICATION_OPTIONS];
    const required = isRequired(field);
    const label = getLabel(field);
    const error = errors[field];
    const value = specifications[field] || "";

    // Special handling for year (cars) - render as number input
    if (field === "year") {
      const currentYear = new Date().getFullYear();
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={`spec-${field}`}>
            {label} {required && "*"}
          </Label>
          <Input
            id={`spec-${field}`}
            type="number"
            min="1990"
            max={currentYear + 1}
            placeholder={language === "ar" ? `مثال: ${currentYear}` : `نموونە: ${currentYear}`}
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            className={error ? "border-red-500" : ""}
            data-testid={`spec-${field}`}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      );
    }

    // Special handling for mileage (cars) - render as number input
    if (field === "mileage") {
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={`spec-${field}`}>
            {label} {required && "*"}
          </Label>
          <Input
            id={`spec-${field}`}
            type="number"
            min="0"
            max="9999999"
            placeholder={language === "ar" ? "مثال: 50000" : "نموونە: 50000"}
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            className={error ? "border-red-500" : ""}
            data-testid={`spec-${field}`}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      );
    }

    // If we have options, render a select dropdown
    if (options && Array.isArray(options)) {
      return (
        <div key={field} className="space-y-2">
          <Label htmlFor={`spec-${field}`}>
            {label} {required && "*"}
          </Label>
          <Select
            value={value}
            onValueChange={(val) => handleFieldChange(field, val)}
          >
            <SelectTrigger 
              id={`spec-${field}`}
              className={error ? "border-red-500" : ""}
              data-testid={`spec-${field}`}
            >
              <SelectValue placeholder={language === "ar" ? "اختر..." : "هەڵبژێرە..."} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {getOptionLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      );
    }

    // Fallback: text input for fields without predefined options
    return (
      <div key={field} className="space-y-2">
        <Label htmlFor={`spec-${field}`}>
          {label} {required && "*"}
        </Label>
        <Input
          id={`spec-${field}`}
          type="text"
          value={value}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          className={error ? "border-red-500" : ""}
          data-testid={`spec-${field}`}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          {language === "ar" ? "مواصفات إضافية" : "تایبەتمەندییەکانی زیادە"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Render required fields first */}
          {config.required.map((field) => renderField(field))}
          
          {/* Then render optional fields */}
          {config.optional.map((field) => renderField(field))}
        </div>
        
        {config.required.length > 0 && (
          <p className="text-sm text-muted-foreground mt-4">
            {language === "ar" 
              ? "* الحقول المطلوبة لهذه الفئة" 
              : "* خانە پێویستەکان بۆ ئەم پۆلە"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Validation helper function to check required category-specific fields
export function validateCategorySpecifications(
  category: string,
  specifications: Record<string, string>,
  language: string
): Record<string, string> {
  const errors: Record<string, string> = {};
  const config = CATEGORY_FIELD_CONFIG[category];
  
  if (!config) return errors;
  
  for (const field of config.required) {
    if (!specifications[field] || specifications[field].trim() === "") {
      const labels = SPECIFICATION_LABELS[field];
      const fieldLabel = labels ? (language === "ar" ? labels.ar : labels.ku) : field;
      errors[field] = language === "ar" 
        ? `${fieldLabel} مطلوب` 
        : `${fieldLabel} پێویستە`;
    }
  }
  
  // Additional validation for specific fields
  if (specifications.year) {
    const year = parseInt(specifications.year);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1900 || year > currentYear + 1) {
      errors.year = language === "ar" 
        ? "سنة الصنع غير صحيحة" 
        : "ساڵی دروستکردن هەڵەیە";
    }
  }
  
  if (specifications.mileage) {
    const mileage = parseInt(specifications.mileage);
    if (isNaN(mileage) || mileage < 0) {
      errors.mileage = language === "ar" 
        ? "عداد الكيلومترات غير صحيح" 
        : "کیلۆمەتر هەڵەیە";
    }
  }
  
  return errors;
}
