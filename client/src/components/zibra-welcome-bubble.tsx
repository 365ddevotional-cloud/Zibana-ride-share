import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Headphones, X, ArrowRight } from "lucide-react";

interface ZibraWelcomeBubbleProps {
  visible: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}

export function ZibraWelcomeBubble({ visible, onOpen, onDismiss }: ZibraWelcomeBubbleProps) {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setAnimateIn(true), 100);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-all duration-500 ease-out ${
        animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      data-testid="zibra-welcome-bubble"
    >
      <Card className="max-w-xs shadow-lg border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1" data-testid="text-zibra-greeting">
                Need help choosing how ZIBANA works for you?
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                I can guide you.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onOpen}
                  className="text-xs"
                  data-testid="button-zibra-get-guidance"
                >
                  Get guidance
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="text-xs"
                  data-testid="button-zibra-dismiss"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
