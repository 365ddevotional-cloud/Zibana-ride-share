import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    if (process.env.NODE_ENV === "production") {
      console.error("Application error:", error.message);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                We encountered an unexpected error. Please try again or return to the home page.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={this.handleRetry} className="w-full" data-testid="button-retry">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} className="w-full" data-testid="button-go-home">
                <Home className="h-4 w-4 mr-2" />
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ComponentErrorFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export function ComponentErrorFallback({ 
  onRetry, 
  title = "Failed to load",
  description = "This section couldn't be loaded. Please try again."
}: ComponentErrorFallbackProps) {
  return (
    <Card className="border-destructive/20">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
        <h3 className="font-medium text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} data-testid="button-component-retry">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
