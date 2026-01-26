import { Clock, Car, MapPin, Timer, Navigation, CheckCircle, XCircle } from "lucide-react";
import type { RideStatus } from "@/hooks/use-ride-lifecycle";

interface RideStatusTimelineProps {
  currentStatus: RideStatus;
  showCancelled?: boolean;
}

const statuses: { key: RideStatus; label: string; icon: typeof Clock }[] = [
  { key: "requested", label: "Requested", icon: Clock },
  { key: "matching", label: "Matching", icon: Clock },
  { key: "accepted", label: "Accepted", icon: CheckCircle },
  { key: "driver_en_route", label: "En Route", icon: Car },
  { key: "arrived", label: "Arrived", icon: MapPin },
  { key: "waiting", label: "Waiting", icon: Timer },
  { key: "in_progress", label: "In Progress", icon: Navigation },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

const statusOrder: RideStatus[] = [
  "requested",
  "matching", 
  "accepted",
  "driver_en_route",
  "arrived",
  "waiting",
  "in_progress",
  "completed",
];

export function RideStatusTimeline({ currentStatus, showCancelled }: RideStatusTimelineProps) {
  if (currentStatus === "cancelled") {
    return (
      <div className="flex items-center justify-center py-4" data-testid="ride-timeline-cancelled">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <span className="text-sm font-medium text-red-500">Cancelled</span>
        </div>
      </div>
    );
  }

  const currentIndex = statusOrder.indexOf(currentStatus);
  
  const relevantStatuses = statuses.filter(s => {
    const index = statusOrder.indexOf(s.key);
    if (s.key === "matching" && currentStatus !== "matching" && currentIndex > 1) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex items-center justify-between py-2 overflow-x-auto" data-testid="ride-timeline">
      {relevantStatuses.map((status, index) => {
        const statusIndex = statusOrder.indexOf(status.key);
        const isActive = statusIndex <= currentIndex;
        const isCurrent = status.key === currentStatus;
        const Icon = status.icon;
        
        const showConnector = index < relevantStatuses.length - 1;
        const nextStatus = relevantStatuses[index + 1];
        const nextStatusIndex = nextStatus ? statusOrder.indexOf(nextStatus.key) : -1;
        const isConnectorActive = nextStatusIndex <= currentIndex;

        return (
          <div key={status.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <div className={`
                flex h-8 w-8 items-center justify-center rounded-full transition-all
                ${isCurrent 
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" 
                  : isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }
              `}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-xs text-center whitespace-nowrap ${
                isCurrent ? "font-medium text-primary" : "text-muted-foreground"
              }`}>
                {status.label}
              </span>
            </div>
            {showConnector && (
              <div className={`h-0.5 flex-1 mx-1 min-w-[20px] ${
                isConnectorActive ? "bg-primary" : "bg-muted"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
