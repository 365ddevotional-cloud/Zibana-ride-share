import { useState, useEffect } from "react";
import { Clock, AlertTriangle, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WaitingTimerProps {
  arrivedAt: string | Date;
  waitingStartedAt?: string | Date | null;
  gracePeriodMinutes?: number;
  paidWaitMinutes?: number;
  bonusWaitMinutes?: number;
}

export function WaitingTimer({ 
  arrivedAt,
  waitingStartedAt,
  gracePeriodMinutes = 2,
  paidWaitMinutes = 5,
  bonusWaitMinutes = 4
}: WaitingTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startTime = waitingStartedAt 
      ? new Date(waitingStartedAt).getTime() 
      : new Date(arrivedAt).getTime();
    
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [arrivedAt, waitingStartedAt]);

  const graceSeconds = gracePeriodMinutes * 60;
  const paidSeconds = paidWaitMinutes * 60;
  const bonusSeconds = bonusWaitMinutes * 60;
  const totalSeconds = graceSeconds + paidSeconds + bonusSeconds;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCurrentPhase = () => {
    if (elapsedSeconds < graceSeconds) {
      return { phase: "grace", remaining: graceSeconds - elapsedSeconds };
    }
    if (elapsedSeconds < graceSeconds + paidSeconds) {
      return { phase: "paid", remaining: graceSeconds + paidSeconds - elapsedSeconds };
    }
    if (elapsedSeconds < totalSeconds) {
      return { phase: "bonus", remaining: totalSeconds - elapsedSeconds };
    }
    return { phase: "expired", remaining: 0 };
  };

  const { phase, remaining } = getCurrentPhase();

  const getPhaseInfo = () => {
    switch (phase) {
      case "grace":
        return {
          label: "Grace Period",
          description: "Free waiting time",
          color: "bg-green-500/10 text-green-600 dark:text-green-400",
          icon: Clock
        };
      case "paid":
        return {
          label: "Paid Wait",
          description: "Earning wait compensation",
          color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
          icon: DollarSign
        };
      case "bonus":
        return {
          label: "Bonus Time",
          description: "Extra waiting time",
          color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
          icon: AlertTriangle
        };
      default:
        return {
          label: "Time Expired",
          description: "Consider cancelling",
          color: "bg-red-500/10 text-red-600 dark:text-red-400",
          icon: AlertTriangle
        };
    }
  };

  const phaseInfo = getPhaseInfo();
  const PhaseIcon = phaseInfo.icon;

  return (
    <div className="space-y-3 p-4 rounded-lg bg-muted/50" data-testid="waiting-timer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhaseIcon className="h-5 w-5" />
          <span className="font-medium">{phaseInfo.label}</span>
        </div>
        <Badge className={phaseInfo.color}>
          {remaining > 0 ? formatTime(remaining) : "Expired"}
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground">{phaseInfo.description}</p>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Total wait time</span>
          <span className="font-mono">{formatTime(elapsedSeconds)}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
          <div 
            className={`transition-all ${phase === "grace" ? "bg-green-500" : "bg-green-500/50"}`}
            style={{ width: `${(Math.min(elapsedSeconds, graceSeconds) / totalSeconds) * 100}%` }}
          />
          <div 
            className={`transition-all ${phase === "paid" ? "bg-yellow-500" : elapsedSeconds > graceSeconds ? "bg-yellow-500/50" : ""}`}
            style={{ width: `${(Math.max(0, Math.min(elapsedSeconds - graceSeconds, paidSeconds)) / totalSeconds) * 100}%` }}
          />
          <div 
            className={`transition-all ${phase === "bonus" ? "bg-orange-500" : elapsedSeconds > graceSeconds + paidSeconds ? "bg-orange-500/50" : ""}`}
            style={{ width: `${(Math.max(0, Math.min(elapsedSeconds - graceSeconds - paidSeconds, bonusSeconds)) / totalSeconds) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>{formatTime(totalSeconds)}</span>
        </div>
      </div>
    </div>
  );
}
