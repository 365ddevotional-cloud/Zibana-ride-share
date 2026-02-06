import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, X, Lightbulb } from "lucide-react";

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
  const [dismissed, setDismissed] = useState(false);

  const { data: cancellationMetrics } = useQuery<CancellationMetrics>({
    queryKey: ["/api/driver/cancellation-metrics"],
    enabled: !!user,
  });

  const { data: behaviorData } = useQuery<BehaviorSignals>({
    queryKey: ["/api/behavior/mine"],
    enabled: !!user,
  });

  if (dismissed) return null;

  const messages: string[] = [];

  if (cancellationMetrics) {
    if (cancellationMetrics.cancellationRate > 10) {
      messages.push("We noticed a few cancelled trips lately. Completing trips builds rider trust. Every completed trip strengthens your standing. You've got this!");
    }
  }

  if (behaviorData) {
    const negativeCount = behaviorData.negativeSignalCount ?? 0;
    if (negativeCount > 3) {
      messages.push("Your recent acceptance rate has dipped. Accepting more rides helps you earn more!");
    }
  }

  if (messages.length === 0) return null;

  return (
    <Card className="border-amber-400/50 bg-amber-50 dark:bg-amber-950/30" data-testid="card-behavior-advisory">
      <CardContent className="p-4 relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-amber-600/60 dark:text-amber-400/60"
          data-testid="button-dismiss-advisory"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            {messages.map((msg, idx) => (
              <p key={idx} className="text-amber-800/80 dark:text-amber-300/80 text-sm leading-relaxed" data-testid={`text-advisory-${idx}`}>
                {msg}
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
