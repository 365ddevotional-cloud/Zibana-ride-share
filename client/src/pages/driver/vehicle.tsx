import { useState, useEffect } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Car, Info, Pencil, AlertTriangle, Palette } from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

function getStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid="badge-status-approved">Approved</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500 text-white no-default-hover-elevate" data-testid="badge-status-pending">Pending Review</Badge>;
    default:
      return <Badge className="bg-red-600 text-white no-default-hover-elevate" data-testid="badge-status-other">{status || "Unknown"}</Badge>;
  }
}

interface VehicleProfile {
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleYear: string;
  licensePlate: string;
  status: string;
}

export default function DriverVehicle() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    vehicleMake: "",
    vehicleModel: "",
    vehicleColor: "",
    vehicleYear: "",
    licensePlate: "",
  });

  const { data: profile, isLoading } = useQuery<VehicleProfile>({
    queryKey: ["/api/driver/profile"],
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setEditData({
        vehicleMake: profile.vehicleMake || "",
        vehicleModel: profile.vehicleModel || "",
        vehicleColor: (profile as any).vehicleColor || "",
        vehicleYear: (profile as any).vehicleYear || "",
        licensePlate: profile.licensePlate || "",
      });
    }
  }, [profile]);

  const updateVehicleMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      const response = await apiRequest("PATCH", "/api/driver/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/profile"] });
      toast({
        title: "Vehicle updated",
        description: "Your changes have been submitted for review.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Update failed", variant: "destructive" });
    },
  });

  const vehicleFields = [
    { key: "vehicleMake", label: "Make", value: profile?.vehicleMake },
    { key: "vehicleModel", label: "Model", value: profile?.vehicleModel },
    { key: "vehicleColor", label: "Color", value: (profile as any)?.vehicleColor },
    { key: "vehicleYear", label: "Year", value: (profile as any)?.vehicleYear },
    { key: "licensePlate", label: "License Plate", value: profile?.licensePlate },
  ];

  return (
    <DriverLayout>
      <div className="p-4 space-y-5 max-w-lg mx-auto">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/driver/account")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold" data-testid="text-page-title">Vehicle Information</h1>
          </div>
          {!isEditing && !isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              data-testid="button-edit-vehicle"
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </CardContent>
          </Card>
        ) : isEditing ? (
          <>
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="flex items-start gap-3 pt-4">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200" data-testid="text-edit-warning">
                  Changing vehicle details will require re-approval by your regional director. You may not be able to accept rides until approved.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
                  <Car className="h-5 w-5" />
                  Edit Vehicle Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Make</Label>
                  <Input
                    value={editData.vehicleMake}
                    onChange={(e) => setEditData((p) => ({ ...p, vehicleMake: e.target.value }))}
                    placeholder="e.g. Toyota"
                    className="mt-1.5"
                    data-testid="input-vehicle-make"
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input
                    value={editData.vehicleModel}
                    onChange={(e) => setEditData((p) => ({ ...p, vehicleModel: e.target.value }))}
                    placeholder="e.g. Camry"
                    className="mt-1.5"
                    data-testid="input-vehicle-model"
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="relative mt-1.5">
                    <Palette className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={editData.vehicleColor}
                      onChange={(e) => setEditData((p) => ({ ...p, vehicleColor: e.target.value }))}
                      placeholder="e.g. Silver"
                      className="pl-10"
                      data-testid="input-vehicle-color"
                    />
                  </div>
                </div>
                <div>
                  <Label>Year</Label>
                  <Input
                    value={editData.vehicleYear}
                    onChange={(e) => setEditData((p) => ({ ...p, vehicleYear: e.target.value }))}
                    placeholder="e.g. 2022"
                    className="mt-1.5"
                    data-testid="input-vehicle-year"
                  />
                </div>
                <div>
                  <Label>License Plate</Label>
                  <Input
                    value={editData.licensePlate}
                    onChange={(e) => setEditData((p) => ({ ...p, licensePlate: e.target.value }))}
                    placeholder="e.g. ABC-123-XY"
                    className="mt-1.5"
                    data-testid="input-license-plate"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsEditing(false);
                      if (profile) {
                        setEditData({
                          vehicleMake: profile.vehicleMake || "",
                          vehicleModel: profile.vehicleModel || "",
                          vehicleColor: (profile as any).vehicleColor || "",
                          vehicleYear: (profile as any).vehicleYear || "",
                          licensePlate: profile.licensePlate || "",
                        });
                      }
                    }}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600"
                    onClick={() => updateVehicleMutation.mutate(editData)}
                    disabled={updateVehicleMutation.isPending}
                    data-testid="button-save-vehicle"
                  >
                    {updateVehicleMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
                <Car className="h-5 w-5" />
                Vehicle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {vehicleFields.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-2 flex-wrap" data-testid={`field-${f.key}`}>
                  <span className="text-sm text-muted-foreground">{f.label}</span>
                  <span className="text-sm font-medium" data-testid={`text-${f.key}`}>
                    {f.value || "Not set"}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 flex-wrap" data-testid="field-status">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(profile?.status || "")}
              </div>
            </CardContent>
          </Card>
        )}

        {!isEditing && (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="flex items-start gap-3 pt-4">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground" data-testid="text-info-note">
                Vehicle changes require re-approval by your regional director. Tap Edit to update your vehicle details.
              </p>
            </CardContent>
          </Card>
        )}

        <ZibraFloatingButton />
      </div>
    </DriverLayout>
  );
}
