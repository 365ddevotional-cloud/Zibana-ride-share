import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CancellationMetrics {
  cancellationRate: number;
  recentCancellations: number;
  totalTrips: number;
  warningThreshold: number;
  shouldWarn: boolean;
}

function DriverWarningCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card className="border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 mx-4 mt-4" data-testid="card-cancellation-warning">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-sm" data-testid="text-warning-title">
              Your cancellation rate needs attention
            </h3>
            <p className="text-amber-800/80 dark:text-amber-300/80 text-sm leading-relaxed" data-testid="text-warning-body">
              Frequent cancellations may affect trip priority and rewards.
            </p>
            <div className="pt-1">
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-800 dark:text-amber-300"
                onClick={onDismiss}
                data-testid="button-dismiss-warning"
              >
                Understood
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiderWarningCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card className="border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 mx-4 mt-4" data-testid="card-cancellation-warning">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-sm" data-testid="text-warning-title">
              Your recent cancellations are higher than usual
            </h3>
            <p className="text-amber-800/80 dark:text-amber-300/80 text-sm leading-relaxed" data-testid="text-warning-body">
              Frequent cancellations can delay pickups for everyone.
            </p>
            <div className="pt-1">
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-800 dark:text-amber-300"
                onClick={onDismiss}
                data-testid="button-dismiss-warning"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CancellationWarning({ role }: { role: "rider" | "driver" }) {
  const [dismissed, setDismissed] = useState(false);
  const [shownThisSession, setShownThisSession] = useState(false);

  useEffect(() => {
    const key = `ziba-${role}-warning-shown`;
    if (sessionStorage.getItem(key) === "true") {
      setShownThisSession(true);
    }
  }, [role]);

  const { data: metrics } = useQuery<CancellationMetrics>({
    queryKey: [`/api/${role}/cancellation-metrics`],
    enabled: !shownThisSession && !dismissed,
    retry: false,
  });

  if (dismissed || shownThisSession || !metrics?.shouldWarn) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(`ziba-${role}-warning-shown`, "true");
  };

  return role === "driver"
    ? <DriverWarningCard onDismiss={handleDismiss} />
    : <RiderWarningCard onDismiss={handleDismiss} />;
}
