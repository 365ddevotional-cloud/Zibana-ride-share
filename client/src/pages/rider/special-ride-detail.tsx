import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Crown, Users, PartyPopper, Route, Shield,
  Clock, ShieldCheck, CheckCircle, Bell, Info, MessageCircle
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface RideTypeInfo {
  id: string;
  title: string;
  icon: typeof Crown;
  iconBg: string;
  iconColor: string;
  available: boolean;
  whatIs: string;
  whenAvailable: string;
  safety: string;
  eligibility: string;
}

const rideTypeData: Record<string, RideTypeInfo> = {
  group: {
    id: "group",
    title: "Group Rides",
    icon: Users,
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400",
    available: true,
    whatIs: "Group Rides let you book a larger vehicle for multiple passengers traveling together. Whether it's friends heading to a weekend outing, family going to an event, or colleagues commuting together — one booking covers everyone.",
    whenAvailable: "Group Rides are available in supported cities during regular operating hours. Vehicle availability depends on demand in your area.",
    safety: "All Group Ride drivers are vetted and rated. Vehicle capacity is never exceeded. All passengers are covered by ZIBA's safety policies, including trip tracking and emergency support.",
    eligibility: "Any verified rider can request a Group Ride. Larger groups may require advance booking to ensure vehicle availability.",
  },
  event: {
    id: "event",
    title: "Event Transportation",
    icon: PartyPopper,
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    available: true,
    whatIs: "Event Transportation coordinates multiple rides for your guests. Whether you're organizing a wedding, conference, party, or corporate gathering, you can arrange pickups and drop-offs for all attendees from one place.",
    whenAvailable: "Event Transportation is available in supported cities. We recommend booking at least 48 hours in advance for large events to ensure sufficient driver availability.",
    safety: "Event Rides follow all standard ZIBA safety protocols. Drivers assigned to events undergo additional availability confirmation. Guests receive trip details and tracking links.",
    eligibility: "Any verified rider can request Event Transportation. For large events (20+ guests), availability may need to be confirmed by our operations team.",
  },
  premium: {
    id: "premium",
    title: "Premium Rides",
    icon: Crown,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    available: false,
    whatIs: "Premium Rides offer luxury vehicles with our highest-rated, most experienced drivers. Designed for special occasions, business meetings, or when you simply want to travel in comfort and style.",
    whenAvailable: "Premium Rides are being prepared for launch. We're curating a fleet of luxury vehicles and training select drivers to deliver a premium experience. Check back for updates.",
    safety: "Premium drivers will undergo enhanced background checks and additional training. Vehicles will meet strict quality and comfort standards set by ZIBA.",
    eligibility: "Premium Rides will be available to all verified riders once launched. Pricing will reflect the enhanced service level.",
  },
  longdistance: {
    id: "longdistance",
    title: "Long-Distance / Charter",
    icon: Route,
    iconBg: "bg-sky-100 dark:bg-sky-900/30",
    iconColor: "text-sky-600 dark:text-sky-400",
    available: false,
    whatIs: "Long-Distance and Charter rides are designed for inter-city travel and extended trips. Book a vehicle for a full day, travel between cities, or arrange a dedicated driver for a multi-stop journey.",
    whenAvailable: "Long-Distance services are being developed to ensure safe, comfortable extended travel. We're working on route planning, driver rest policies, and transparent pricing for longer trips.",
    safety: "Long-Distance rides will include mandatory driver rest stops, vehicle inspection requirements, and real-time tracking throughout the journey. Passenger safety on extended trips is our priority.",
    eligibility: "Long-Distance rides will be available to all verified riders once launched. Some routes may require advance booking.",
  },
};

export default function SpecialRideDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ type: string }>();
  const { toast } = useToast();
  const [requested, setRequested] = useState(false);
  const [notified, setNotified] = useState(false);

  const rideType = rideTypeData[params.type || ""];

  if (!rideType) {
    return (
      <RiderRouteGuard>
        <RiderLayout>
          <div className="p-4 space-y-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/rider/services/special")}
                data-testid="button-back-special-notfound"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Ride Type Not Found</h1>
            </div>
            <Card>
              <CardContent className="p-6 text-center space-y-3">
                <p className="text-muted-foreground">
                  This ride type doesn't exist or isn't available yet. Please go back and choose from the available options.
                </p>
                <Button onClick={() => setLocation("/rider/services/special")} data-testid="button-goto-special-rides">
                  View Special Rides
                </Button>
              </CardContent>
            </Card>
          </div>
        </RiderLayout>
      </RiderRouteGuard>
    );
  }

  const IconComp = rideType.icon;

  const handleRequest = () => {
    setRequested(true);
    toast({
      title: "Request Submitted",
      description: "We've noted your interest. You'll be notified about availability.",
    });
  };

  const handleNotify = () => {
    setNotified(true);
    toast({
      title: "You'll Be Notified",
      description: "We'll let you know when this ride type launches in your area.",
    });
  };

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/services/special")}
              data-testid="button-back-special-detail"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold" data-testid="text-special-detail-title">
                  {rideType.title}
                </h1>
                <Badge
                  variant={rideType.available ? "default" : "secondary"}
                  className={rideType.available ? "bg-green-600 text-white" : ""}
                  data-testid="badge-special-detail-status"
                >
                  {rideType.available ? "Available" : "Learn More"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className={`h-16 w-16 rounded-full ${rideType.iconBg} flex items-center justify-center`}>
              <IconComp className={`h-8 w-8 ${rideType.iconColor}`} />
            </div>
          </div>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-medium text-sm">What is this?</p>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-special-detail-whatis">
                {rideType.whatIs}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-medium text-sm">When is it available?</p>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-special-detail-when">
                {rideType.whenAvailable}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-medium text-sm">Safety</p>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-special-detail-safety">
                {rideType.safety}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-medium text-sm">Eligibility</p>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-special-detail-eligibility">
                {rideType.eligibility}
              </p>
            </CardContent>
          </Card>

          {rideType.available ? (
            <div className="space-y-3">
              {!requested ? (
                <Button
                  className="w-full"
                  onClick={handleRequest}
                  data-testid="button-request-ride"
                >
                  <IconComp className="h-4 w-4 mr-2" />
                  Request This Ride
                </Button>
              ) : (
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">Request Noted</p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          We've recorded your interest. You'll hear back about availability and next steps.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {!notified ? (
                <Button
                  className="w-full"
                  onClick={handleNotify}
                  data-testid="button-check-availability"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notify Me When Available
                </Button>
              ) : (
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">You'll be notified</p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          We'll let you know as soon as this ride type becomes available in your area.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

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
              data-testid="button-special-detail-help"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Questions? Ask ZIBRA
            </Button>
          </div>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
