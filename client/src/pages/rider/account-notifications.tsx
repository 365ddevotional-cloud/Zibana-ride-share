import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bell } from "lucide-react";
import { useLocation } from "wouter";

interface NotificationPreferences {
  permissionGranted: boolean;
  driverAssigned: boolean;
  driverArriving: boolean;
  rideScheduledConfirmation: boolean;
  cancellationPenalties: boolean;
  walletLowBalance: boolean;
  promotions: boolean;
  systemAnnouncements: boolean;
}

export default function AccountNotifications() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: prefs, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ["/api/rider/notification-preferences"],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      await apiRequest("PUT", "/api/rider/notification-preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/notification-preferences"] });
      toast({ title: "Preferences updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/account")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Notifications</h1>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : prefs ? (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">Master toggle for all notifications</p>
                    </div>
                    <div className="ml-auto">
                      <Switch
                        checked={prefs.permissionGranted}
                        onCheckedChange={(v) => updateMutation.mutate({ permissionGranted: v })}
                        data-testid="switch-push-notifications"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Ride Alerts</p>

                  <NotifToggle
                    label="Driver assigned"
                    description="When a driver accepts your ride"
                    checked={prefs.driverAssigned}
                    onChange={(v) => updateMutation.mutate({ driverAssigned: v })}
                    testId="switch-driver-assigned"
                  />
                  <NotifToggle
                    label="Driver arriving"
                    description="When your driver is nearby"
                    checked={prefs.driverArriving}
                    onChange={(v) => updateMutation.mutate({ driverArriving: v })}
                    testId="switch-driver-arriving"
                  />
                  <NotifToggle
                    label="Ride confirmations"
                    description="Scheduled ride reminders"
                    checked={prefs.rideScheduledConfirmation}
                    onChange={(v) => updateMutation.mutate({ rideScheduledConfirmation: v })}
                    testId="switch-ride-confirmations"
                  />
                  <NotifToggle
                    label="Cancellation penalties"
                    description="Fee and penalty notifications"
                    checked={prefs.cancellationPenalties}
                    onChange={(v) => updateMutation.mutate({ cancellationPenalties: v })}
                    testId="switch-cancellation-penalties"
                  />
                  <NotifToggle
                    label="Wallet low balance"
                    description="When your wallet balance is low"
                    checked={prefs.walletLowBalance}
                    onChange={(v) => updateMutation.mutate({ walletLowBalance: v })}
                    testId="switch-wallet-low-balance"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <NotifToggle
                    label="Safety alerts"
                    description="Cannot be disabled for your safety"
                    checked={true}
                    onChange={() => {}}
                    disabled
                    testId="switch-safety-alerts"
                  />
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}

function NotifToggle({
  label, description, checked, onChange, disabled, testId,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Label htmlFor={testId} className="text-sm cursor-pointer font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        id={testId}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        data-testid={testId}
      />
    </div>
  );
}
