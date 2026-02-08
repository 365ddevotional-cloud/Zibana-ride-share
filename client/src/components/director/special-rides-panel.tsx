import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import {
  Crown, Users, PartyPopper, Route, Car, ShieldCheck,
  AlertTriangle, TrendingUp, Info, Ban
} from "lucide-react";

interface DirectorSpecialDriver {
  id: string;
  name: string;
  trustScore: number;
  vehicleType: string;
  eligibleRideTypes: string[];
  status: string;
  rideCount: number;
  lastActive: string;
}

interface DemandIndicator {
  rideType: string;
  label: string;
  demandLevel: "low" | "moderate" | "high";
  requestCount: number;
}

const rideTypeIcons: Record<string, typeof Crown> = {
  premium: Crown,
  group: Users,
  event: PartyPopper,
  longdistance: Route,
};

const rideTypeLabels: Record<string, string> = {
  premium: "Premium",
  group: "Group",
  event: "Event",
  longdistance: "Long-Distance",
};

export function DirectorSpecialRidesPanel() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");

  const { data: drivers = [], isLoading: driversLoading } = useQuery<DirectorSpecialDriver[]>({
    queryKey: ["/api/director/special-rides/drivers"],
  });

  const { data: demand = [] } = useQuery<DemandIndicator[]>({
    queryKey: ["/api/director/special-rides/demand"],
  });

  const recommendMutation = useMutation({
    mutationFn: (driverId: string) =>
      apiRequest("POST", "/api/director/special-rides/recommend", { driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/special-rides/drivers"] });
      toast({ title: "Recommendation submitted", description: "Admin will review and approve." });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const suspendMutation = useMutation({
    mutationFn: (driverId: string) =>
      apiRequest("POST", "/api/director/special-rides/suspend", { driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/special-rides/drivers"] });
      toast({ title: "Driver suspended from special rides" });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const filteredDrivers = drivers.filter((d) => {
    if (filter === "all") return true;
    return d.eligibleRideTypes.includes(filter);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Manage your cell's drivers for special ride eligibility. You can recommend drivers for approval and temporarily suspend drivers from special rides. Final approval is handled by Admin.
        </p>
      </div>

      {demand.length > 0 && (
        <Card data-testid="card-demand-indicators">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Ride Demand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {demand.map((d) => {
                const IconComp = rideTypeIcons[d.rideType] || Car;
                return (
                  <div
                    key={d.rideType}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    data-testid={`demand-${d.rideType}`}
                  >
                    <IconComp className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{d.label}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={d.demandLevel === "high" ? "default" : "secondary"}
                          className={d.demandLevel === "high" ? "bg-green-600 text-white" : ""}
                        >
                          {d.demandLevel}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{d.requestCount} requests</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-director-special-drivers">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Cell Drivers — Special Rides
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {["all", "group", "event", "premium", "longdistance"].map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                data-testid={`button-filter-${f}`}
              >
                {f === "all" ? "All" : rideTypeLabels[f] || f}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {driversLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading drivers...</div>
          ) : filteredDrivers.length === 0 ? (
            <EmptyState
              icon={Car}
              title="No drivers"
              description="No drivers in your cell are currently eligible for special rides"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-director-special-drivers">
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Trust Score</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Eligible For</TableHead>
                    <TableHead>Rides</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id} data-testid={`row-dir-driver-${driver.id}`}>
                      <TableCell className="font-medium" data-testid={`text-dir-driver-name-${driver.id}`}>
                        {driver.name}
                      </TableCell>
                      <TableCell data-testid={`text-dir-driver-trust-${driver.id}`}>
                        <Badge variant="outline">{driver.trustScore}/100</Badge>
                      </TableCell>
                      <TableCell data-testid={`text-dir-driver-vehicle-${driver.id}`}>{driver.vehicleType}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {driver.eligibleRideTypes.map((rt) => (
                            <Badge key={rt} variant="secondary" className="text-xs">
                              {rideTypeLabels[rt] || rt}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-dir-driver-rides-${driver.id}`}>{driver.rideCount}</TableCell>
                      <TableCell>
                        {driver.status === "approved" ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Approved
                          </Badge>
                        ) : driver.status === "recommended" ? (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Recommended
                          </Badge>
                        ) : driver.status === "suspended" ? (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Suspended
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{driver.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {driver.status !== "recommended" && driver.status !== "suspended" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => recommendMutation.mutate(driver.id)}
                              disabled={recommendMutation.isPending}
                              data-testid={`button-recommend-${driver.id}`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                              Recommend
                            </Button>
                          )}
                          {driver.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => suspendMutation.mutate(driver.id)}
                              disabled={suspendMutation.isPending}
                              data-testid={`button-suspend-special-${driver.id}`}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" />
                              Suspend
                            </Button>
                          )}
                          {driver.status === "recommended" && (
                            <span className="text-xs text-muted-foreground">Awaiting admin approval</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
