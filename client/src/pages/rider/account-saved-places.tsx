import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Plus, ChevronRight, Home, Briefcase } from "lucide-react";
import { useLocation } from "wouter";

interface RiderProfile {
  rating: number | null;
  totalTrips: number;
  savedLocations: { name: string; address: string }[];
}

function getPlaceIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower === "home") return Home;
  if (lower === "work") return Briefcase;
  return MapPin;
}

export default function AccountSavedPlaces() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<RiderProfile>({
    queryKey: ["/api/rider/profile"],
    enabled: !!user,
  });

  const places = profile?.savedLocations || [];

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
            <h1 className="text-xl font-bold">Saved Places</h1>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : places.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">No saved places</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your frequent destinations for faster booking.
                </p>
                <Button
                  onClick={() => setLocation("/rider/saved-place-form")}
                  data-testid="button-add-first-place"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add a Place
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-0 divide-y">
                  {places.map((place, index) => {
                    const Icon = getPlaceIcon(place.name);
                    return (
                      <button
                        key={index}
                        className="w-full p-4 flex items-center gap-3 hover-elevate"
                        data-testid={`button-place-${index}`}
                      >
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium text-sm">{place.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/rider/saved-place-form")}
                data-testid="button-add-place"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Place
              </Button>
            </>
          )}
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
