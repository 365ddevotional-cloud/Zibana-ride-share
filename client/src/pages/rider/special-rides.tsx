import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Crown, Users, PartyPopper, Route, ChevronRight,
  MessageCircle, Star, Shield
} from "lucide-react";
import { useLocation } from "wouter";

const rideTypes = [
  {
    id: "group",
    title: "Group Rides",
    description: "Share a ride with multiple passengers",
    icon: Users,
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400",
    available: true,
  },
  {
    id: "event",
    title: "Event Transportation",
    description: "Coordinated rides for events and gatherings",
    icon: PartyPopper,
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    available: true,
  },
  {
    id: "premium",
    title: "Premium Rides",
    description: "Luxury vehicles with top-rated drivers",
    icon: Crown,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    available: true,
  },
  {
    id: "longdistance",
    title: "Long-Distance / Charter",
    description: "Inter-city and extended trip services",
    icon: Route,
    iconBg: "bg-sky-100 dark:bg-sky-900/30",
    iconColor: "text-sky-600 dark:text-sky-400",
    available: true,
  },
];

export default function SpecialRides() {
  const [, setLocation] = useLocation();

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/services")}
              data-testid="button-back-special"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-special-title">
                Special Rides
              </h1>
              <p className="text-sm text-muted-foreground">
                Beyond the everyday commute
              </p>
            </div>
          </div>

          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                  <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100" data-testid="text-special-intro-title">
                    Explore Special Ride Options
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1" data-testid="text-special-intro-description">
                    From group trips to event coordination, ZIBA offers ride types tailored to your unique travel needs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {rideTypes.map((rideType) => {
              const IconComp = rideType.icon;
              return (
                <Card
                  key={rideType.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setLocation(`/rider/services/special/${rideType.id}`)}
                  data-testid={`card-special-${rideType.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-full ${rideType.iconBg} flex items-center justify-center shrink-0`}>
                          <IconComp className={`h-6 w-6 ${rideType.iconColor}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium" data-testid={`text-special-${rideType.id}-title`}>
                              {rideType.title}
                            </p>
                            <Badge
                              variant="default"
                              className="bg-green-600 text-white"
                              data-testid={`badge-special-${rideType.id}`}
                            >
                              Available
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground" data-testid={`text-special-${rideType.id}-desc`}>
                            {rideType.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground" data-testid="text-special-disclaimer">
              Availability and pricing may vary. ZIBA does not guarantee service availability.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setLocation("/rider/support")}
              data-testid="button-special-help"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Need help with Special Rides?
            </Button>
          </div>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
