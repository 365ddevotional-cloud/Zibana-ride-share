import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, CarFront, Armchair, Crown, PawPrint, ShieldCheck, Users, Star, CheckCircle, XCircle } from "lucide-react";
import type { RideClassDefinition } from "@shared/ride-classes";

const ICON_MAP: Record<string, typeof Car> = {
  "car": Car,
  "car-front": CarFront,
  "armchair": Armchair,
  "crown": Crown,
  "paw-print": PawPrint,
  "shield-check": ShieldCheck,
};

export function RideClassesPanel() {
  const { data: rideClasses = [], isLoading } = useQuery<RideClassDefinition[]>({
    queryKey: ["/api/ride-classes"],
  });

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading ride classes...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-ride-classes-title">Ride Classification Management</h2>
        <p className="text-sm text-muted-foreground">
          View and manage ZIBA ride classes, fare multipliers, and driver eligibility rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rideClasses.map((rc) => {
          const IconComponent = ICON_MAP[rc.icon] || Car;

          return (
            <Card key={rc.id} data-testid={`card-admin-ride-class-${rc.id}`}>
              <CardHeader className="pb-3 flex flex-row items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${rc.color}20` }}
                >
                  <IconComponent className="h-5 w-5" style={{ color: rc.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base" data-testid={`text-admin-class-name-${rc.id}`}>
                    {rc.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{rc.description}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fare Multiplier</span>
                    <p className="font-semibold" data-testid={`text-admin-multiplier-${rc.id}`}>{rc.fareMultiplier}x</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Passengers</span>
                    <p className="font-semibold">{rc.maxPassengers}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Min Driver Rating</span>
                    <p className="font-semibold">{rc.minDriverRating > 0 ? `${rc.minDriverRating}+` : "Any"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Min Vehicle Year</span>
                    <p className="font-semibold">{rc.minVehicleYear || "Any"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {rc.isActive ? (
                    <Badge variant="default" className="bg-green-600 text-white" data-testid={`badge-status-${rc.id}`}>
                      <CheckCircle className="h-3 w-3 mr-1" />Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" data-testid={`badge-status-${rc.id}`}>
                      <XCircle className="h-3 w-3 mr-1" />Disabled
                    </Badge>
                  )}
                  {rc.requiresPetApproval && (
                    <Badge variant="secondary">Pet Approval Required</Badge>
                  )}
                  {rc.requiresBackgroundCheck && (
                    <Badge variant="secondary">Background Check</Badge>
                  )}
                  {rc.requiresEliteApproval && (
                    <Badge variant="secondary">Elite Approval</Badge>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Features</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rc.features.map((f, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Ride class definitions and fare multipliers apply globally. Country-specific pricing adjustments are handled through the Countries tab.</p>
          <p>Driver eligibility for each class is determined by their rating, vehicle year, and approval flags. Directors can recommend drivers for higher classes, but approval is required from admin.</p>
          <p>ZIBA Elite and SafeTeen require additional approval flags on the driver profile before they can be matched to those ride classes.</p>
        </CardContent>
      </Card>
    </div>
  );
}
