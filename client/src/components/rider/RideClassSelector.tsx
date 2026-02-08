import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { RideClassIcon } from "@/components/ride-class-icon";
import type { RideClassId, RideClassDefinition } from "@shared/ride-classes";

interface RideClassSelectorProps {
  selectedClass: RideClassId;
  onClassChange: (classId: RideClassId, multiplier: number) => void;
  currencySymbol?: string;
}

interface FareEstimate {
  rideClass: string;
  fareMultiplier: number;
  estimatedFare: number;
  fareRange: { min: number; max: number };
  currencyCode: string;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
}

export function RideClassSelector({ selectedClass, onClassChange, currencySymbol = "\u20A6" }: RideClassSelectorProps) {
  const [estimates, setEstimates] = useState<Record<string, FareEstimate>>({});

  const { data: rideClasses, isLoading } = useQuery<RideClassDefinition[]>({
    queryKey: ["/api/ride-classes"],
  });

  const fareEstimateMutation = useMutation({
    mutationFn: async (rideClassId: string) => {
      const res = await apiRequest("POST", "/api/rider/fare-estimate", { rideClassId });
      return res.json();
    },
    onSuccess: (data: FareEstimate) => {
      setEstimates(prev => ({ ...prev, [data.rideClass]: data }));
    },
  });

  useEffect(() => {
    if (rideClasses) {
      rideClasses.forEach(rc => {
        if (!estimates[rc.id]) {
          fareEstimateMutation.mutate(rc.id);
        }
      });
    }
  }, [rideClasses]);

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

  if (!rideClasses?.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide" data-testid="text-ride-class-heading">
        Choose your ride
      </h3>
      <div className="space-y-1.5">
        {rideClasses.map((rc) => {
          const isSelected = selectedClass === rc.id;
          const estimate = estimates[rc.id];

          return (
            <button
              key={rc.id}
              onClick={() => onClassChange(rc.id as RideClassId, rc.fareMultiplier)}
              className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-all duration-150 ${
                isSelected
                  ? "ring-2 shadow-sm"
                  : "hover-elevate"
              }`}
              style={isSelected ? {
                boxShadow: `0 0 0 2px ${rc.color}40`,
                backgroundColor: `${rc.color}08`,
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
                  {isSelected && (
                    <span
                      className="inline-flex items-center justify-center h-4 w-4 rounded-full"
                      style={{ backgroundColor: rc.color }}
                    >
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate" data-testid={`text-ride-class-desc-${rc.id}`}>
                  {rc.description}
                </p>
              </div>

              <div className="text-right shrink-0">
                {estimate ? (
                  <div>
                    <span
                      className="font-semibold text-sm"
                      style={isSelected ? { color: rc.color } : undefined}
                      data-testid={`text-ride-class-fare-${rc.id}`}
                    >
                      {currencySymbol}{estimate.estimatedFare.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      ~{estimate.estimatedDurationMin} min
                    </p>
                  </div>
                ) : (
                  <Skeleton className="h-8 w-12" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
