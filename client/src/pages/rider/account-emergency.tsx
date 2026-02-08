import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Phone, Users, ChevronRight, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function AccountEmergency() {
  const [, setLocation] = useLocation();

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
            <h1 className="text-xl font-bold">Emergency</h1>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">SOS Emergency</p>
                  <p className="text-xs text-muted-foreground">Get help during a ride</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                In an emergency during a ride, use the SOS button on your ride screen to alert ZIBA support and your trusted contacts immediately. Your live location will be shared automatically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 divide-y">
              <button
                className="w-full p-4 flex items-center gap-3 hover-elevate"
                onClick={() => setLocation("/rider/support")}
                data-testid="button-incident-reporting"
              >
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-sm">Report an Incident</p>
                  <p className="text-xs text-muted-foreground">Report safety concerns or issues</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </button>

              <button
                className="w-full p-4 flex items-center gap-3 hover-elevate"
                onClick={() => setLocation("/rider/trusted-contacts")}
                data-testid="button-trusted-contacts"
              >
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-sm">Trusted Contacts</p>
                  <p className="text-xs text-muted-foreground">Manage your emergency contacts</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Emergency Services</p>
                  <p>
                    For immediate life-threatening emergencies, always call your local emergency number (e.g., 911, 112, 999) directly.
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
