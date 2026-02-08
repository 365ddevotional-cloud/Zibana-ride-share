import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Crown, Users, PartyPopper, Route, ChevronRight,
  MessageCircle, Bell, CheckCircle, Star, Info,
  Car, CarFront, Armchair, PawPrint, ShieldCheck
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";
import type { RideClassDefinition } from "@shared/ride-classes";

const ICON_MAP: Record<string, typeof Car> = {
  "car": Car,
  "car-front": CarFront,
  "armchair": Armchair,
  "crown": Crown,
  "paw-print": PawPrint,
  "shield-check": ShieldCheck,
};

interface RideType {
  id: string;
  title: string;
  description: string;
  icon: typeof Crown;
  iconBg: string;
  iconColor: string;
  available: boolean;
  badge: string;
  detail: string;
}

const rideTypes: RideType[] = [
  {
    id: "premium",
    title: "Premium Rides",
    description: "Luxury vehicles with top-rated drivers",
    icon: Crown,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    available: true,
    badge: "Available",
    detail: "Experience ZIBA in style with our premium fleet. Luxury vehicles, professional drivers, and priority service for those moments that matter most.",
  },
  {
    id: "group",
    title: "Group Rides",
    description: "Share a ride with multiple passengers",
    icon: Users,
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400",
    available: true,
    badge: "Available",
    detail: "Traveling with friends, family, or colleagues? Book a group ride with a larger vehicle to accommodate everyone comfortably in one trip.",
  },
  {
    id: "event",
    title: "Event Transportation",
    description: "Coordinated rides for events and gatherings",
    icon: PartyPopper,
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    available: true,
    badge: "Available",
    detail: "Planning a wedding, conference, or celebration? Coordinate multiple rides for your guests with centralized booking, tracking, and billing all in one place.",
  },
  {
    id: "longdistance",
    title: "Long-Distance / Charter",
    description: "Inter-city and extended trip services",
    icon: Route,
    iconBg: "bg-sky-100 dark:bg-sky-900/30",
    iconColor: "text-sky-600 dark:text-sky-400",
    available: true,
    badge: "Available",
    detail: "Need to travel between cities or book a vehicle for a full day? Our long-distance charter service is designed for extended trips with transparent pricing.",
  },
];

export default function SpecialRides() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [notifiedTypes, setNotifiedTypes] = useState<Set<string>>(new Set());
  const [interestedTypes, setInterestedTypes] = useState<Set<string>>(new Set());

  const { data: rideClasses = [] } = useQuery<RideClassDefinition[]>({
    queryKey: ["/api/ride-classes"],
  });

  const handleNotifyMe = (typeId: string) => {
    setNotifiedTypes((prev) => new Set(prev).add(typeId));
    toast({
      title: "You'll be notified",
      description: "We'll let you know as soon as this service launches in your area.",
    });
  };

  const handleRequestInterest = (typeId: string) => {
    setInterestedTypes((prev) => new Set(prev).add(typeId));
    toast({
      title: "Interest registered",
      description: "Thank you for your interest. This helps us plan our rollout.",
    });
  };

  const handleBookRide = (typeId: string) => {
    const rideType = rideTypes.find((r) => r.id === typeId);
    setLocation("/rider/home");
    toast({
      title: `${rideType?.title} Selected`,
      description: "Set your pickup and destination to continue booking.",
    });
  };

  const toggleExpanded = (typeId: string) => {
    setExpandedType(expandedType === typeId ? null : typeId);
  };

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

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                <h3 className="font-semibold" data-testid="text-ride-classes-section">ZIBA Ride Classes</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose the ride that fits your needs. Select your class when requesting a ride from the home screen.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {rideClasses.map((rc) => {
                  const IconComp = ICON_MAP[rc.icon] || Car;
                  return (
                    <button
                      key={rc.id}
                      className="flex items-center gap-2 p-2 rounded-md hover-elevate text-left"
                      onClick={() => {
                        setLocation("/rider/home");
                        toast({ title: `${rc.name} selected`, description: rc.description });
                      }}
                      data-testid={`button-class-info-${rc.id}`}
                    >
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${rc.color}20` }}
                      >
                        <IconComp className="h-4 w-4" style={{ color: rc.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{rc.name}</p>
                        <p className="text-xs text-muted-foreground">{rc.fareMultiplier}x fare</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button
                variant="default"
                className="w-full"
                onClick={() => setLocation("/rider/home")}
                data-testid="button-book-ride-class"
              >
                Book a Ride Now
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                  <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100" data-testid="text-special-intro-title">
                    Additional Ride Options
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
              const isExpanded = expandedType === rideType.id;
              const isNotified = notifiedTypes.has(rideType.id);
              const isInterested = interestedTypes.has(rideType.id);

              return (
                <Card
                  key={rideType.id}
                  className="hover-elevate cursor-pointer transition-all"
                  onClick={() => toggleExpanded(rideType.id)}
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
                              variant={rideType.available ? "default" : "secondary"}
                              className={rideType.available ? "bg-green-600 text-white" : ""}
                              data-testid={`badge-special-${rideType.id}`}
                            >
                              {rideType.badge}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground" data-testid={`text-special-${rideType.id}-desc`}>
                            {rideType.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground" data-testid={`text-special-${rideType.id}-detail`}>
                            {rideType.detail}
                          </p>
                        </div>

                        {rideType.available ? (
                          <div className="space-y-2">
                            <Button
                              className="w-full"
                              onClick={() => handleBookRide(rideType.id)}
                              data-testid={`button-book-${rideType.id}`}
                            >
                              <IconComp className="h-4 w-4 mr-2" />
                              Book {rideType.title}
                            </Button>
                            {!isInterested && (
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => handleRequestInterest(rideType.id)}
                                data-testid={`button-interest-${rideType.id}`}
                              >
                                Share Feedback
                              </Button>
                            )}
                            {isInterested && (
                              <div className="flex items-center gap-2 justify-center text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span>Feedback shared — thank you</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {!isNotified ? (
                              <Button
                                className="w-full"
                                onClick={() => handleNotifyMe(rideType.id)}
                                data-testid={`button-notify-${rideType.id}`}
                              >
                                <Bell className="h-4 w-4 mr-2" />
                                Notify Me When Available
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2 justify-center text-sm text-green-600 py-2">
                                <CheckCircle className="h-4 w-4" />
                                <span>You'll be notified when this launches</span>
                              </div>
                            )}
                            {!isInterested ? (
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => handleRequestInterest(rideType.id)}
                                data-testid={`button-interest-${rideType.id}`}
                              >
                                Register Interest
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2 justify-center text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span>Interest registered — thank you</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground" data-testid="text-special-disclaimer">
              ZIBA facilitates ride access. Availability and eligibility may vary.
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
        <ZibraFloatingButton />
      </RiderLayout>
    </RiderRouteGuard>
  );
}
