import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lock, Info } from "lucide-react";
import { useLocation } from "wouter";

export default function AccountRidePin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pinEnabled, setPinEnabled] = useState(false);

  const handleToggle = (enabled: boolean) => {
    setPinEnabled(enabled);
    toast({
      title: enabled ? "Ride PIN enabled" : "Ride PIN disabled",
      description: enabled
        ? "You will need to verify a PIN before starting each ride."
        : "Ride PIN verification has been turned off.",
    });
  };

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
            <h1 className="text-xl font-bold">Ride PIN</h1>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Ride PIN Verification</p>
                  <p className="text-xs text-muted-foreground">
                    Add an extra layer of security to your rides
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="switch-ride-pin" className="text-sm cursor-pointer font-medium">
                  Enable Ride PIN
                </Label>
                <Switch
                  id="switch-ride-pin"
                  checked={pinEnabled}
                  onCheckedChange={handleToggle}
                  data-testid="switch-ride-pin"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    When enabled, a unique 4-digit PIN will be generated for each ride. Share this PIN with your driver to confirm your identity before the trip begins.
                  </p>
                  <p>
                    This helps ensure you get into the correct vehicle and adds an extra layer of safety to every ride.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
