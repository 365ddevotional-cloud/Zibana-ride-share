import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Car, Info } from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

function getStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid="badge-status-approved">Approved</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500 text-white no-default-hover-elevate" data-testid="badge-status-pending">Pending</Badge>;
    default:
      return <Badge className="bg-red-600 text-white no-default-hover-elevate" data-testid="badge-status-other">{status || "Unknown"}</Badge>;
  }
}

export default function DriverVehicle() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<{
    vehicleMake: string;
    vehicleModel: string;
    licensePlate: string;
    status: string;
  }>({
    queryKey: ["/api/driver/profile"],
    enabled: !!user,
  });

  return (
    <DriverLayout>
      <div className="p-4 space-y-5 max-w-lg mx-auto">
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
                <Car className="h-5 w-5" />
                Vehicle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap" data-testid="field-vehicle-make-model">
                <span className="text-sm text-muted-foreground">Vehicle Make & Model</span>
                <span className="text-sm font-medium" data-testid="text-vehicle-make-model">
                  {profile?.vehicleMake && profile?.vehicleModel
                    ? `${profile.vehicleMake} ${profile.vehicleModel}`
                    : "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap" data-testid="field-license-plate">
                <span className="text-sm text-muted-foreground">License Plate</span>
                <span className="text-sm font-medium" data-testid="text-license-plate">
                  {profile?.licensePlate || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap" data-testid="field-status">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(profile?.status || "")}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="flex items-start gap-3 pt-4">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground" data-testid="text-info-note">
              Vehicle changes require re-approval by your regional director.
            </p>
          </CardContent>
        </Card>

        <ZibraFloatingButton />
      </div>
    </DriverLayout>
  );
}
