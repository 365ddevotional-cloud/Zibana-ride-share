import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Clock, AlertCircle } from "lucide-react";
import { RideClassIcon } from "@/components/ride-class-icon";
import type { RideClassId, RideClassDefinition } from "@shared/ride-classes";

interface RideClassSelectorProps {
  selectedClass: RideClassId;
  onClassChange: (classId: RideClassId, multiplier: number) => void;
}

interface ClassAvailability {
  rideClassId: string;
  available: boolean | null;
  driverCount: number | null;
  estimatedWaitMinutes: number | null;
}

export function RideClassSelector({ selectedClass, onClassChange }: RideClassSelectorProps) {

  const { data: rideClasses, isLoading, isError, refetch } = useQuery<RideClassDefinition[]>({
    queryKey: ["/api/ride-classes"],
  });

  const { data: availability } = useQuery<ClassAvailability[]>({
    queryKey: ["/api/ride-classes/availability"],
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Choose your ride</h3>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-[72px] w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (isError) return <div role="alert" className="rounded-xl border p-4 text-sm">Ride options could not load. <button className="font-medium text-primary underline" onClick={() => refetch()}>Try again</button></div>;
  if (!rideClasses?.length) return <p className="text-sm text-muted-foreground">No ride classes are configured yet.</p>;

  const getAvailability = (classId: string): ClassAvailability | undefined => {
    return availability?.find(a => a.rideClassId === classId);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide" data-testid="text-ride-class-heading">
        Choose your ride
      </h3>
      <p className="text-xs text-muted-foreground" data-testid="text-availability-not-confirmed">
        Driver availability and pickup times are not yet confirmed.
      </p>
      <div className="space-y-1.5">
        {rideClasses.map((rc) => {
          const isSelected = selectedClass === rc.id;
          const classAvail = getAvailability(rc.id);
          const isAvailable = rc.isActive && classAvail?.available !== false;

          return (
            <button
              key={rc.id}
              onClick={() => isAvailable && onClassChange(rc.id as RideClassId, rc.fareMultiplier)}
              disabled={!isAvailable}
              aria-pressed={isSelected}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
                !isAvailable
                  ? "opacity-50 cursor-not-allowed"
                  : isSelected
                  ? "ring-2 shadow-md scale-[1.01]"
                  : "hover-elevate border border-transparent"
              }`}
              style={isSelected && isAvailable ? {
                boxShadow: `0 0 0 2px ${rc.color}50, 0 4px 12px ${rc.color}15`,
                backgroundColor: `${rc.color}0C`,
                borderColor: `${rc.color}30`,
              } : undefined}
              data-testid={`button-ride-class-${rc.id}`}
            >
              <RideClassIcon
                rideClass={rc.id}
                size="md"
                color={rc.color}
                bgLight={rc.bgLight}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm" data-testid={`text-ride-class-name-${rc.id}`}>
                    {rc.name}
                  </span>
                  {rc.fareMultiplier > 1.0 && (
                    <Badge variant="secondary" className="text-xs">
                      {rc.fareMultiplier}x
                    </Badge>
                  )}
                  {isSelected && isAvailable && (
                    <span
                      className="inline-flex items-center justify-center h-4 w-4 rounded-full"
                      style={{ backgroundColor: rc.color }}
                    >
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                </div>
                {!isAvailable ? (
                  <p className="text-xs text-destructive flex items-center gap-1" data-testid={`text-unavailable-${rc.id}`}>
                    <AlertCircle className="h-3 w-3" />
                    {rc.id === "keke" ? "Keke launch pending local approval" : "Ride class unavailable"}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-xs leading-5 text-muted-foreground" data-testid={`text-ride-class-desc-${rc.id}`}>
                      {rc.description}
                    </p>
                    {classAvail?.estimatedWaitMinutes != null && classAvail.estimatedWaitMinutes > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
                        <Clock className="h-3 w-3" />
                        ~{classAvail.estimatedWaitMinutes} min
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="hidden sm:block text-right shrink-0">
                {!isAvailable ? (
                  <span className="text-xs text-muted-foreground">{rc.id === "keke" ? "Launch pending" : "Unavailable"}</span>
                ) : (
                  <span className="text-xs text-muted-foreground" data-testid={`text-ride-class-quote-${rc.id}`}>
                    Fare not yet quoted
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
