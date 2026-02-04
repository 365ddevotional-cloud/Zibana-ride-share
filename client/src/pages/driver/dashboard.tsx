import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Power, MapPin, TrendingUp, Clock } from "lucide-react";
import { useState } from "react";

export default function DriverDashboard() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["/api/driver/stats"],
    enabled: !!user,
  });

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
  };

  return (
    <DriverLayout>
      <div className="p-4 space-y-6">
        <div className="text-center py-6">
          <h1 className="text-2xl font-bold" data-testid="text-driver-greeting">
            Hello, {user?.firstName || "Driver"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isOnline ? "You're online and ready to accept rides" : "Go online to start accepting rides"}
          </p>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            className={cn(
              "w-32 h-32 rounded-full text-lg font-semibold transition-all",
              isOnline 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                : "bg-muted hover:bg-muted/80 text-foreground"
            )}
            onClick={toggleOnlineStatus}
            data-testid="button-toggle-online"
          >
            <div className="flex flex-col items-center gap-2">
              <Power className="h-8 w-8" />
              <span>{isOnline ? "Online" : "Offline"}</span>
            </div>
          </Button>
        </div>

        <div className="flex justify-center">
          <Badge 
            variant={isOnline ? "default" : "secondary"}
            className={isOnline ? "bg-emerald-600" : ""}
            data-testid="badge-online-status"
          >
            {isOnline ? "Accepting Rides" : "Not Accepting Rides"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card data-testid="card-today-earnings">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Today's Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">₦0.00</p>
            </CardContent>
          </Card>

          <Card data-testid="card-today-trips">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Today's Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-current-location">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Current Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Location services required</p>
          </CardContent>
        </Card>
      </div>
    </DriverLayout>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
