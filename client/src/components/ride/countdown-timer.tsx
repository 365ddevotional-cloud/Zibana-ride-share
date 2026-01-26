import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

interface CountdownTimerProps {
  durationSeconds: number;
  onExpire: () => void;
  label?: string;
  showProgress?: boolean;
}

export function CountdownTimer({ 
  durationSeconds, 
  onExpire, 
  label = "Time remaining",
  showProgress = true 
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (expired) return;
    
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setExpired(true);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [expired, onExpire]);

  const progress = (remaining / durationSeconds) * 100;
  
  const getColor = () => {
    if (progress > 50) return "bg-green-500";
    if (progress > 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-2" data-testid="countdown-timer">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-bold tabular-nums ${remaining <= 3 ? "text-red-500 animate-pulse" : ""}`}>
          {remaining}s
        </span>
      </div>
      {showProgress && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${getColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
