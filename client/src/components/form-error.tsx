import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface FormErrorProps {
  message?: string;
  className?: string;
}

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;
  
  return (
    <div className={cn("flex items-center gap-1.5 text-destructive text-xs mt-1.5", className)}>
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface FormFieldProps {
  children: React.ReactNode;
  error?: string;
  className?: string;
}

export function FormField({ children, error, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {children}
      <FormError message={error} />
    </div>
  );
}
