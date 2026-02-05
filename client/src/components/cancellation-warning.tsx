import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CancellationMetrics {
  cancellationRate: number;
  recentCancellations: number;
  totalTrips: number;
  warningThreshold: number;
  shouldWarn: boolean;
}

function DriverWarningCard({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <Card className="border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 shadow-lg mx-4 mt-4" data-testid="card-cancellation-warning">
      <CardContent className="p-4 relative">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-amber-600/60 dark:text-amber-400/60"
          data-testid="button-dismiss-warning"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm" data-testid="text-warning-title">
              Your cancellation rate is increasing
            </h3>
            <p className="text-amber-800/80 dark:text-amber-300/80 text-sm leading-relaxed" data-testid="text-warning-body">
              You've been canceling more trips recently. This can affect rider trust and your access to rewards.
            </p>
            <p className="text-amber-700/70 dark:text-amber-400/70 text-xs pt-1" data-testid="text-warning-footer">
              Staying consistent helps you earn more.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiderWarningCard({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <Card className="border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 shadow-lg mx-4 mt-4" data-testid="card-cancellation-warning">
      <CardContent className="p-4 relative">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-amber-600/60 dark:text-amber-400/60"
          data-testid="button-dismiss-warning"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm" data-testid="text-warning-title">
              Your cancellations are increasing
            </h3>
            <p className="text-amber-800/80 dark:text-amber-300/80 text-sm leading-relaxed" data-testid="text-warning-body">
              Canceling after a driver accepts delays pickups for others.
            </p>
            <p className="text-amber-700/70 dark:text-amber-400/70 text-xs pt-1" data-testid="text-warning-footer">
              Request rides only when ready to go.
            </p>
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
