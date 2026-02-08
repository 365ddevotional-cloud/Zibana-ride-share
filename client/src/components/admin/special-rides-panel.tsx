import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import {
  Crown, Users, PartyPopper, Route, Shield, Settings, Save,
  Globe, Car, CheckCircle, XCircle, Info
} from "lucide-react";

interface SpecialRideConfig {
  id: string;
  rideType: string;
  enabled: boolean;
  minDriverTrustScore: number;
  vehicleRequirements: string;
  availableCountries: string[];
  availableCities: string[];
  assignedDirectorIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface EligibleDriver {
  id: string;
  name: string;
  trustScore: number;
  vehicleType: string;
  rideType: string;
  status: string;
  country: string;
}

const rideTypeConfig = [
  { id: "group", label: "Group Rides", icon: Users, color: "teal" },
  { id: "event", label: "Event Transportation", icon: PartyPopper, color: "violet" },
  { id: "premium", label: "Premium Rides", icon: Crown, color: "amber" },
  { id: "longdistance", label: "Long-Distance / Charter", icon: Route, color: "sky" },
];

export function SpecialRidesPanel() {
  const { toast } = useToast();
  const [editingType, setEditingType] = useState<string | null>(null);
  const [minTrustScore, setMinTrustScore] = useState("70");
  const [vehicleReqs, setVehicleReqs] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");

  const { data: configs = [], isLoading } = useQuery<SpecialRideConfig[]>({
    queryKey: ["/api/admin/special-rides/config"],
  });

  const { data: eligibleDrivers = [] } = useQuery<EligibleDriver[]>({
    queryKey: ["/api/admin/special-rides/eligible-drivers"],
  });

  const toggleMutation = useMutation({
    mutationFn: (data: { rideType: string; enabled: boolean }) =>
      apiRequest("POST", "/api/admin/special-rides/toggle", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/special-rides/config"] });
      toast({ title: "Ride type updated" });
    },
    onError: (err: Error) =>
      toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: { rideType: string; minDriverTrustScore: number; vehicleRequirements: string }) =>
      apiRequest("POST", "/api/admin/special-rides/update-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/special-rides/config"] });
      setEditingType(null);
      toast({ title: "Configuration saved" });
    },
    onError: (err: Error) =>
      toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const getConfigForType = (rideType: string) =>
    configs.find((c) => c.rideType === rideType);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Special Rides Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Enable or disable special ride types, set driver eligibility requirements, and manage availability by country. Directors can be assigned to manage special ride pools for their cells.
            </p>
          </div>

          <div className="space-y-4">
            {rideTypeConfig.map((rt) => {
              const IconComp = rt.icon;
              const config = getConfigForType(rt.id);
              const isEnabled = config?.enabled ?? false;
              const isEditing = editingType === rt.id;

              return (
                <Card key={rt.id} data-testid={`card-special-config-${rt.id}`}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full bg-${rt.color}-100 dark:bg-${rt.color}-900/30 flex items-center justify-center`}>
                          <IconComp className={`h-5 w-5 text-${rt.color}-600 dark:text-${rt.color}-400`} />
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`text-special-config-name-${rt.id}`}>{rt.label}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {isEnabled ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-special-status-${rt.id}`}>
                                Enabled
                              </Badge>
                            ) : (
                              <Badge variant="secondary" data-testid={`badge-special-status-${rt.id}`}>
                                Disabled
                              </Badge>
                            )}
                            {config && (
                              <span className="text-xs text-muted-foreground">
                                Min trust: {config.minDriverTrustScore}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ rideType: rt.id, enabled: checked })
                          }
                          data-testid={`switch-special-${rt.id}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (isEditing) {
                              setEditingType(null);
                            } else {
                              setEditingType(rt.id);
                              setMinTrustScore(String(config?.minDriverTrustScore ?? 70));
                              setVehicleReqs(config?.vehicleRequirements ?? "");
                            }
                          }}
                          data-testid={`button-edit-special-${rt.id}`}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          {isEditing ? "Cancel" : "Configure"}
                        </Button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="border-t pt-4 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Minimum Driver Trust Score</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={minTrustScore}
                              onChange={(e) => setMinTrustScore(e.target.value)}
                              data-testid={`input-min-trust-${rt.id}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Vehicle Requirements</Label>
                            <Input
                              placeholder="e.g., SUV, Sedan, Luxury"
                              value={vehicleReqs}
                              onChange={(e) => setVehicleReqs(e.target.value)}
                              data-testid={`input-vehicle-reqs-${rt.id}`}
                            />
                          </div>
                        </div>
                        <Button
                          onClick={() =>
                            updateConfigMutation.mutate({
                              rideType: rt.id,
                              minDriverTrustScore: parseInt(minTrustScore) || 70,
                              vehicleRequirements: vehicleReqs,
                            })
                          }
                          disabled={updateConfigMutation.isPending}
                          data-testid={`button-save-config-${rt.id}`}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-eligible-drivers">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Eligible Drivers
          </CardTitle>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-[180px]" data-testid="select-country-filter">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              <SelectItem value="NG">Nigeria</SelectItem>
              <SelectItem value="ZA">South Africa</SelectItem>
              <SelectItem value="GH">Ghana</SelectItem>
              <SelectItem value="KE">Kenya</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {eligibleDrivers.length === 0 ? (
            <EmptyState
              icon={Car}
              title="No eligible drivers"
              description="No drivers currently meet the special ride eligibility criteria"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-eligible-drivers">
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Trust Score</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Ride Type</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleDrivers
                    .filter((d) => selectedCountry === "all" || d.country === selectedCountry)
                    .map((driver) => (
                      <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                        <TableCell className="font-medium" data-testid={`text-driver-name-${driver.id}`}>
                          {driver.name}
                        </TableCell>
                        <TableCell data-testid={`text-driver-trust-${driver.id}`}>
                          <Badge variant="outline">{driver.trustScore}/100</Badge>
                        </TableCell>
                        <TableCell data-testid={`text-driver-vehicle-${driver.id}`}>{driver.vehicleType}</TableCell>
                        <TableCell data-testid={`text-driver-ridetype-${driver.id}`}>
                          <Badge variant="secondary">{driver.rideType}</Badge>
                        </TableCell>
                        <TableCell data-testid={`text-driver-country-${driver.id}`}>
                          <div className="flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            {driver.country}
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver.status === "approved" ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-driver-status-${driver.id}`}>
                              Approved
                            </Badge>
                          ) : driver.status === "pending" ? (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" data-testid={`badge-driver-status-${driver.id}`}>
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="secondary" data-testid={`badge-driver-status-${driver.id}`}>
                              {driver.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {driver.status === "pending" ? (
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" data-testid={`button-approve-driver-${driver.id}`}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" data-testid={`button-reject-driver-${driver.id}`}>
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" data-testid={`button-revoke-driver-${driver.id}`}>
                              Revoke
                            </Button>
                          )}
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
