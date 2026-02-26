import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: hour, label: `${hour}:00` };
});

interface SchedulingSectionProps {
  startTimeOption: string;
  startDate: string;
  startHour: string;
  endDate: string;
  endHour: string;
  validationErrors: Record<string, string>;
  language: string;
  onStartTimeOptionChange: (value: string) => void;
  onInputChange: (field: string, value: string) => void;
}

export function SchedulingSection({
  startTimeOption,
  startDate,
  startHour,
  endDate,
  endHour,
  validationErrors,
  language,
  onStartTimeOptionChange,
  onInputChange,
}: SchedulingSectionProps) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          {language === "ar" ? "توقيت المزاد" : language === "ku" ? "کاتی مزایدە" : "توقيت المزاد"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="startTime">
            {language === "ar" ? "موعد بدء المزاد" : language === "ku" ? "کاتی دەستپێکردنی مزایدە" : "موعد بدء المزاد"}
          </Label>
          <Select value={startTimeOption} onValueChange={onStartTimeOptionChange}>
            <SelectTrigger data-testid="select-start-time">
              <SelectValue placeholder={language === "ar" ? "ابدأ فوراً" : language === "ku" ? "ئێستا دەستپێبکە" : "ابدأ فوراً"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="now">{language === "ar" ? "ابدأ فوراً" : language === "ku" ? "ئێستا دەستپێبکە" : "ابدأ فوراً"}</SelectItem>
              <SelectItem value="schedule">{language === "ar" ? "جدولة موعد محدد" : language === "ku" ? "کاتی دیاریکراو" : "جدولة موعد محدد"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {startTimeOption === "schedule" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="startDate">{language === "ar" ? "تاريخ البدء" : language === "ku" ? "ڕێکەوتی دەستپێک" : "تاريخ البدء"} *</Label>
              <Input 
                id="startDate" 
                type="date"
                value={startDate}
                onChange={(e) => onInputChange("startDate", e.target.value)}
                min={today}
                className={validationErrors.startDate ? "border-red-500" : ""}
                data-testid="input-start-date"
              />
              {validationErrors.startDate && (
                <p className="text-xs text-red-500">{validationErrors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startHour">{language === "ar" ? "وقت البدء" : language === "ku" ? "کاتی دەستپێک" : "وقت البدء"} *</Label>
              <Select value={startHour} onValueChange={(v) => onInputChange("startHour", v)}>
                <SelectTrigger data-testid="select-start-hour" className={validationErrors.startHour ? "border-red-500" : ""}>
                  <SelectValue placeholder={language === "ar" ? "اختر الساعة" : language === "ku" ? "کاتژمێر هەڵبژێرە" : "اختر الساعة"} />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.startHour && (
                <p className="text-xs text-red-500">{validationErrors.startHour}</p>
              )}
            </div>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          ⏰ {language === "ar" ? "يجب أن تكون مدة المزاد 24 ساعة على الأقل" : language === "ku" ? "ماوەی مزایدە دەبێت لانیکەم ٢٤ کاتژمێر بێت" : "يجب أن تكون مدة المزاد 24 ساعة على الأقل"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-orange-50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="endDate">
              {language === "ar" ? "تاريخ انتهاء المزاد" : language === "ku" ? "ڕێکەوتی کۆتاییی مزایدە" : "تاريخ انتهاء المزاد"} *
            </Label>
            <Input 
              id="endDate" 
              type="date"
              value={endDate}
              onChange={(e) => onInputChange("endDate", e.target.value)}
              min={startDate || today}
              className={validationErrors.endDate ? "border-red-500" : ""}
              data-testid="input-end-date"
            />
            {validationErrors.endDate && (
              <p className="text-xs text-red-500">{validationErrors.endDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endHour">{language === "ar" ? "وقت الانتهاء" : language === "ku" ? "کاتی کۆتایی" : "وقت الانتهاء"} *</Label>
            <Select value={endHour} onValueChange={(v) => onInputChange("endHour", v)}>
              <SelectTrigger data-testid="select-end-hour" className={validationErrors.endHour ? "border-red-500" : ""}>
                <SelectValue placeholder={language === "ar" ? "اختر الساعة" : language === "ku" ? "کاتژمێر هەڵبژێرە" : "اختر الساعة"} />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.endHour && (
              <p className="text-xs text-red-500">{validationErrors.endHour}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
