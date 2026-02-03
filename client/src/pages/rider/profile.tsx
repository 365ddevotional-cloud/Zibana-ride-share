import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { User, Mail, Phone, Star, MapPin, Settings, LogOut, ChevronRight } from "lucide-react";

interface RiderProfile {
  rating: number | null;
  totalTrips: number;
  savedLocations: { name: string; address: string }[];
}

export default function RiderProfile() {
  const { user, logout } = useAuth();

  const { data: profile, isLoading } = useQuery<RiderProfile>({
    queryKey: ["/api/rider/profile"],
    enabled: !!user,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.email || "Rider";

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold truncate" data-testid="text-profile-name">
                    {displayName}
                  </h2>
                  {profile?.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium" data-testid="text-profile-rating">
                        {profile.rating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        ({profile.totalTrips || 0} trips)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium truncate" data-testid="text-profile-email">
                    {user?.email || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium" data-testid="text-profile-phone">
                    Not set
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Saved Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !profile?.savedLocations || profile.savedLocations.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No saved locations</p>
                  <p className="text-sm mt-1">Add home and work for faster booking</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {profile.savedLocations.map((loc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{loc.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{loc.address}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <button 
                className="w-full p-4 flex items-center gap-3 hover-elevate"
                data-testid="button-settings"
              >
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Settings & Preferences</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
              </button>
              <div className="border-t" />
              <button 
                className="w-full p-4 flex items-center gap-3 hover-elevate text-destructive"
                onClick={() => logout?.()}
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Log Out</span>
              </button>
            </CardContent>
          </Card>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
