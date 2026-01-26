import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Unknown error";
      const errorStack = this.state.error?.stack || "";
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">حدث خطأ غير متوقع</h1>
            <p className="text-muted-foreground mb-4">
              عذراً، حدث خطأ في التطبيق. يرجى المحاولة مرة أخرى.
            </p>
            
            {/* Debug info - visible for troubleshooting */}
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left text-xs text-red-700 max-h-40 overflow-auto" dir="ltr">
              <p className="font-bold mb-1">Error: {errorMessage}</p>
              <pre className="whitespace-pre-wrap break-all text-[10px] text-red-500">
                {errorStack.split('\n').slice(0, 5).join('\n')}
              </pre>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReload} variant="outline">
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة تحميل
              </Button>
              <Button onClick={this.handleGoHome}>
                <Home className="h-4 w-4 ml-2" />
                الصفحة الرئيسية
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
