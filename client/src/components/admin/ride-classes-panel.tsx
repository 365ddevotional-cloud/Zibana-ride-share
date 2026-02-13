import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Users, CheckCircle, XCircle, Pencil, Save, X } from "lucide-react";
import { RideClassIcon } from "@/components/ride-class-icon";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { RideClassDefinition, RideClassPricing } from "@shared/ride-classes";

export function RideClassesPanel() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPricing, setEditPricing] = useState<RideClassPricing>({
    baseFare: 0,
    perKmRate: 0,
    perMinuteRate: 0,
    minimumFare: 0,
    surcharge: 0,
  });

  const { data: rideClasses = [], isLoading } = useQuery<RideClassDefinition[]>({
    queryKey: ["/api/ride-classes"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ classId, isActive }: { classId: string; isActive: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/ride-classes/${classId}/toggle`, { isActive });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Status Updated", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/ride-classes"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to toggle ride class status", variant: "destructive" });
    },
  });

  const pricingMutation = useMutation({
    mutationFn: async ({ classId, pricing }: { classId: string; pricing: RideClassPricing }) => {
      const res = await apiRequest("POST", `/api/admin/ride-classes/${classId}/pricing`, pricing);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Pricing Updated", description: data.message });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/ride-classes"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update pricing", variant: "destructive" });
    },
  });

  const startEditing = (rc: RideClassDefinition) => {
    setEditingId(rc.id);
    setEditPricing({ ...rc.pricing });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const savePricing = (classId: string) => {
    pricingMutation.mutate({ classId, pricing: editPricing });
  };

  const activeCount = rideClasses.filter((rc) => rc.isActive).length;

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading ride classes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-ride-classes-title">Ride Classification Management</h2>
          <p className="text-sm text-muted-foreground">
            View and manage ZIBANA ride classes, fare multipliers, and driver eligibility rules.
          </p>
        </div>
        <Badge variant="outline" data-testid="badge-active-count">
          Total active classes: {activeCount}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rideClasses.map((rc) => {
          const isEditing = editingId === rc.id;

          return (
            <Card key={rc.id} data-testid={`card-admin-ride-class-${rc.id}`}>
              <CardHeader className="pb-3 flex flex-row items-center gap-3">
                <RideClassIcon rideClass={rc.id} size="lg" color={rc.color} bgLight={rc.bgLight} />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base" data-testid={`text-admin-class-name-${rc.id}`}>
                    {rc.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{rc.description}</p>
                </div>
                {!isEditing && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startEditing(rc)}
                    data-testid={`button-edit-${rc.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Active Status</span>
                  <Switch
                    checked={rc.isActive}
                    onCheckedChange={(checked) => toggleMutation.mutate({ classId: rc.id, isActive: checked })}
                    disabled={toggleMutation.isPending}
                    data-testid={`switch-active-${rc.id}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fare Multiplier</span>
                    <p className="font-semibold" style={{ color: rc.color }} data-testid={`text-admin-multiplier-${rc.id}`}>{rc.fareMultiplier}x</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Passengers</span>
                    <p className="font-semibold flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {rc.maxPassengers}
                    </p>
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

                {isEditing ? (
                  <div className="space-y-3 border-t pt-3">
                    <p className="text-sm font-medium">Edit Pricing</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Base Fare</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editPricing.baseFare}
                          onChange={(e) => setEditPricing({ ...editPricing, baseFare: parseFloat(e.target.value) || 0 })}
                          data-testid={`input-baseFare-${rc.id}`}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Per KM Rate</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editPricing.perKmRate}
                          onChange={(e) => setEditPricing({ ...editPricing, perKmRate: parseFloat(e.target.value) || 0 })}
                          data-testid={`input-perKmRate-${rc.id}`}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Per Min Rate</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editPricing.perMinuteRate}
                          onChange={(e) => setEditPricing({ ...editPricing, perMinuteRate: parseFloat(e.target.value) || 0 })}
                          data-testid={`input-perMinuteRate-${rc.id}`}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Minimum Fare</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editPricing.minimumFare}
                          onChange={(e) => setEditPricing({ ...editPricing, minimumFare: parseFloat(e.target.value) || 0 })}
                          data-testid={`input-minimumFare-${rc.id}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Surcharge</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editPricing.surcharge}
                          onChange={(e) => setEditPricing({ ...editPricing, surcharge: parseFloat(e.target.value) || 0 })}
                          data-testid={`input-surcharge-${rc.id}`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        onClick={() => savePricing(rc.id)}
                        disabled={pricingMutation.isPending}
                        data-testid={`button-save-${rc.id}`}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={pricingMutation.isPending}
                        data-testid={`button-cancel-${rc.id}`}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 border-t pt-3">
                    <p className="text-sm font-medium">Pricing</p>
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <span className="text-muted-foreground">Base Fare:</span>
                      <span className="font-medium" data-testid={`text-baseFare-${rc.id}`}>${rc.pricing.baseFare.toFixed(2)}</span>
                      <span className="text-muted-foreground">Per KM:</span>
                      <span className="font-medium" data-testid={`text-perKmRate-${rc.id}`}>${rc.pricing.perKmRate.toFixed(2)}</span>
                      <span className="text-muted-foreground">Per Min:</span>
                      <span className="font-medium" data-testid={`text-perMinRate-${rc.id}`}>${rc.pricing.perMinuteRate.toFixed(2)}</span>
                      <span className="text-muted-foreground">Minimum:</span>
                      <span className="font-medium" data-testid={`text-minFare-${rc.id}`}>${rc.pricing.minimumFare.toFixed(2)}</span>
                      <span className="text-muted-foreground">Surcharge:</span>
                      <span className="font-medium" data-testid={`text-surcharge-${rc.id}`}>${rc.pricing.surcharge.toFixed(2)}</span>
                    </div>
                  </div>
                )}

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
          <p>ZIBANA Elite and SafeTeen require additional approval flags on the driver profile before they can be matched to those ride classes.</p>
        </CardContent>
      </Card>
    </div>
  );
}
