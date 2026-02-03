import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, Calendar, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export default function RiderHome() {
  const [, setLocation] = useLocation();
  const [destination, setDestination] = useState("");
  const [pickup, setPickup] = useState("");

  const handleRequestRide = () => {
    if (destination.trim()) {
      setLocation(`/rider/trips?action=request&destination=${encodeURIComponent(destination)}&pickup=${encodeURIComponent(pickup)}`);
    }
  };

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="pt-4 pb-2">
            <h1 className="text-2xl font-bold" data-testid="text-greeting">
              Where are you going?
            </h1>
            <p className="text-muted-foreground mt-1">
              Request a safe and reliable ride
            </p>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <Input
                  placeholder="Enter pickup location"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="pl-10 h-12"
                  data-testid="input-pickup"
                />
              </div>

              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Where to?"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="pl-10 h-12"
                  data-testid="input-destination"
                />
              </div>

              <Button 
                className="w-full h-12 text-base font-medium"
                onClick={handleRequestRide}
                disabled={!destination.trim()}
                data-testid="button-request-ride"
              >
                Request Ride
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover-elevate cursor-pointer" onClick={() => setLocation("/rider/trips?action=schedule")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium" data-testid="text-schedule-ride">Schedule a Ride</p>
                    <p className="text-sm text-muted-foreground">Book in advance</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Saved Places
            </h2>
            <Card className="shadow-sm">
              <CardContent className="p-0 divide-y">
                <button 
                  className="w-full p-4 flex items-center gap-3 hover-elevate text-left"
                  onClick={() => setPickup("Home")}
                  data-testid="button-saved-home"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Home</p>
                    <p className="text-sm text-muted-foreground">Add home address</p>
                  </div>
                </button>
                <button 
                  className="w-full p-4 flex items-center gap-3 hover-elevate text-left"
                  onClick={() => setDestination("Work")}
                  data-testid="button-saved-work"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Work</p>
                    <p className="text-sm text-muted-foreground">Add work address</p>
                  </div>
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
