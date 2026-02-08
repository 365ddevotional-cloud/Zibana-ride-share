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
import { ArrowLeft, Megaphone } from "lucide-react";
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

export default function AccountMarketing() {
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
            <h1 className="text-xl font-bold">Marketing Preferences</h1>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : prefs ? (
            <Card>
              <CardContent className="p-4 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Megaphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Marketing Communications</p>
                    <p className="text-xs text-muted-foreground">Control promotional messages</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label htmlFor="switch-promotions" className="text-sm cursor-pointer font-medium">
                      Promotions
                    </Label>
                    <p className="text-xs text-muted-foreground">Discounts and special offers</p>
                  </div>
                  <Switch
                    id="switch-promotions"
                    checked={prefs.promotions}
                    onCheckedChange={(v) => updateMutation.mutate({ promotions: v })}
                    data-testid="switch-promotions"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label htmlFor="switch-announcements" className="text-sm cursor-pointer font-medium">
                      Announcements
                    </Label>
                    <p className="text-xs text-muted-foreground">News and updates from ZIBA</p>
                  </div>
                  <Switch
                    id="switch-announcements"
                    checked={prefs.systemAnnouncements}
                    onCheckedChange={(v) => updateMutation.mutate({ systemAnnouncements: v })}
                    data-testid="switch-announcements"
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
