import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Shield, Navigation } from "lucide-react";

const LOCATION_DISCLOSURE_KEY = "zibana_rider_location_disclosure_shown";

interface LocationDisclosureProps {
  onAccept: () => void;
}

export function LocationDisclosure({ onAccept }: LocationDisclosureProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Location Access</h2>
            <p className="text-muted-foreground">
              ZIBANA Rider needs your location to provide you with the best experience
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Navigation className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Match with nearby drivers</p>
                <p className="text-xs text-muted-foreground">
                  We use your location to find available drivers close to you
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Calculate accurate fares</p>
                <p className="text-xs text-muted-foreground">
                  Your location helps us determine the distance and fare for your trip
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Ensure your safety</p>
                <p className="text-xs text-muted-foreground">
                  Location is used for trip tracking and emergency assistance
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={onAccept}
              data-testid="button-accept-location"
            >
              Continue
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Your location is only used while using the app. 
              You can manage permissions in your device settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function useLocationDisclosure() {
  const [showDisclosure, setShowDisclosure] = useState(false);

  useEffect(() => {
    const hasShown = localStorage.getItem(LOCATION_DISCLOSURE_KEY);
    if (!hasShown) {
      setShowDisclosure(true);
    }
  }, []);

  const acceptDisclosure = () => {
    localStorage.setItem(LOCATION_DISCLOSURE_KEY, "true");
    setShowDisclosure(false);
  };

  return { showDisclosure, acceptDisclosure };
}
