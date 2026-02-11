import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, AlertTriangle } from "lucide-react";

interface CancellationMetrics {
  cancellationRate: number;
  recentCancellations: number;
  totalTrips: number;
  warningThreshold: number;
  shouldWarn: boolean;
}

interface BehaviorSignals {
  positiveSignalCount?: number;
  negativeSignalCount?: number;
  trustScore?: number;
}

export function BehaviorAdvisory() {
  const { user } = useAuth();
  const [dismissedTypes, setDismissedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem("ziba-driver-advisory-dismissed");
    if (stored) {
      try {
        const arr: string[] = JSON.parse(stored);
        setDismissedTypes(new Set(arr));
      } catch {}
    }
  }, []);

  const { data: cancellationMetrics } = useQuery<CancellationMetrics>({
    queryKey: ["/api/driver/cancellation-metrics"],
    enabled: !!user,
  });

  const { data: behaviorData } = useQuery<BehaviorSignals>({
    queryKey: ["/api/behavior/mine"],
    enabled: !!user,
  });

  const dismiss = (type: string) => {
    const next = new Set(dismissedTypes);
    next.add(type);
    setDismissedTypes(next);
    sessionStorage.setItem("ziba-driver-advisory-dismissed", JSON.stringify(Array.from(next)));
  };

  const showAcceptanceWarning = behaviorData && (behaviorData.negativeSignalCount ?? 0) > 3 && !dismissedTypes.has("acceptance");
  const showCancellationWarning = cancellationMetrics && cancellationMetrics.cancellationRate > 10 && !dismissedTypes.has("cancellation");

  if (!showAcceptanceWarning && !showCancellationWarning) return null;

  return (
    <div className="space-y-3">
      {showAcceptanceWarning && (
        <Card className="border-amber-400/50 bg-amber-50 dark:bg-amber-950/30" data-testid="card-acceptance-advisory">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-sm" data-testid="text-acceptance-title">
                  Your acceptance rate is trending down
                </h3>
                <p className="text-amber-800/80 dark:text-amber-300/80 text-sm leading-relaxed" data-testid="text-acceptance-body">
                  Consistently accepting trips helps you earn more and stay eligible for rewards.
                </p>
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-400 text-amber-800 dark:text-amber-300"
                    onClick={() => dismiss("acceptance")}
                    data-testid="button-dismiss-acceptance"
                  >
                    Got it
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showCancellationWarning && (
        <Card className="border-orange-400/50 bg-orange-50 dark:bg-orange-950/30" data-testid="card-cancellation-advisory">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-orange-900 dark:text-orange-200 text-sm" data-testid="text-cancellation-title">
                  Your cancellation rate needs attention
                </h3>
                <p className="text-orange-800/80 dark:text-orange-300/80 text-sm leading-relaxed" data-testid="text-cancellation-body">
                  Frequent cancellations may affect trip priority and rewards.
                </p>
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-400 text-orange-800 dark:text-orange-300"
                    onClick={() => dismiss("cancellation")}
                    data-testid="button-dismiss-cancellation"
                  >
                    Understood
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
