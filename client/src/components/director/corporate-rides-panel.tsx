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
  Building2, Car, Users, AlertTriangle, ShieldCheck, Info, Activity
} from "lucide-react";

interface DirectorCorporateDriver {
  id: string;
  name: string;
  organizationName: string;
  rideCount: number;
  status: string;
  lastActive: string;
}

interface CorporateActivity {
  totalDrivers: number;
  activeDrivers: number;
  totalRides: number;
  monthlyRides: number;
  flaggedDrivers: number;
}

export function DirectorCorporateRidesPanel() {
  const { toast } = useToast();

  const { data: drivers = [], isLoading } = useQuery<DirectorCorporateDriver[]>({
    queryKey: ["/api/director/corporate-rides/drivers"],
  });

  const { data: activitySummary } = useQuery<CorporateActivity>({
    queryKey: ["/api/director/corporate-rides/activity"],
  });

  const flagMutation = useMutation({
    mutationFn: (driverId: string) =>
      apiRequest("POST", "/api/director/corporate-rides/flag-driver", { driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/corporate-rides/drivers"] });
      toast({ title: "Driver flagged", description: "Admin has been notified for review." });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const recommendMutation = useMutation({
    mutationFn: (driverId: string) =>
      apiRequest("POST", "/api/director/corporate-rides/recommend", { driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/corporate-rides/drivers"] });
      toast({ title: "Recommendation submitted", description: "Admin will review eligibility." });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Monitor your cell's corporate ride drivers. You can view activity counts, flag driver issues, and recommend drivers for corporate eligibility. Account creation and billing settings are managed by Admin.
        </p>
      </div>

      {activitySummary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="stat-total-drivers">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activitySummary.totalDrivers}</p>
                  <p className="text-xs text-muted-foreground">Total Drivers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-active-drivers">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activitySummary.activeDrivers}</p>
                  <p className="text-xs text-muted-foreground">Active Drivers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-total-rides">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activitySummary.totalRides}</p>
                  <p className="text-xs text-muted-foreground">Total Rides</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-flagged">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activitySummary.flaggedDrivers}</p>
                  <p className="text-xs text-muted-foreground">Flagged</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card data-testid="card-director-corporate-drivers">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Corporate Drivers in Your Cell
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading drivers...</div>
          ) : drivers.length === 0 ? (
            <EmptyState
              icon={Car}
              title="No corporate drivers"
              description="No drivers in your cell are currently assigned to corporate accounts"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-director-corporate-drivers">
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Ride Count</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id} data-testid={`row-corp-driver-${driver.id}`}>
                      <TableCell className="font-medium" data-testid={`text-corp-driver-name-${driver.id}`}>
                        {driver.name}
                      </TableCell>
                      <TableCell data-testid={`text-corp-driver-org-${driver.id}`}>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {driver.organizationName}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-corp-driver-rides-${driver.id}`}>{driver.rideCount}</TableCell>
                      <TableCell>
                        {driver.status === "active" ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </Badge>
                        ) : driver.status === "flagged" ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            Flagged
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{driver.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-corp-driver-active-${driver.id}`}>
                        {driver.lastActive ? new Date(driver.lastActive).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {driver.status !== "flagged" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => flagMutation.mutate(driver.id)}
                              disabled={flagMutation.isPending}
                              data-testid={`button-flag-corp-${driver.id}`}
                            >
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                              Flag
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => recommendMutation.mutate(driver.id)}
                            disabled={recommendMutation.isPending}
                            data-testid={`button-recommend-corp-${driver.id}`}
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                            Recommend
                          </Button>
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
