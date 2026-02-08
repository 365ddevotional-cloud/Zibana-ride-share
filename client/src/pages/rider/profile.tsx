import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Mail, Phone, Star, MapPin, ChevronRight, ArrowLeft } from "lucide-react";

interface RiderProfile {
  rating: number | null;
  totalTrips: number;
  phone: string | null;
  profilePhoto: string | null;
  savedLocations: { name: string; address: string }[];
}

export default function RiderProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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

  const avatarSrc = profile?.profilePhoto || user?.profileImageUrl || undefined;

  if (isLoading) {
    return (
      <RiderRouteGuard>
        <RiderLayout>
          <div className="p-4 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </RiderLayout>
      </RiderRouteGuard>
    );
  }

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/account")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Profile</h1>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <button
                  className="cursor-pointer"
                  onClick={() => setLocation("/rider/account")}
                  data-testid="button-avatar-link"
                >
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback className="text-lg bg-primary/10">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
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
                    {user?.email || "\u2014"}
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
                    {profile?.phone || "Not set"}
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
              {!profile?.savedLocations || profile.savedLocations.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No saved locations</p>
                  <p className="text-sm mt-1">Add home and work for faster booking</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {profile.savedLocations.map((loc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-md border">
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
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
