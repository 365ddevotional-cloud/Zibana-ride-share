import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { FullPageLoading } from "@/components/loading-spinner";
import { MapPin, Clock, Shield, AlertTriangle } from "lucide-react";
import { API_BASE } from "@/lib/apiBase";

type SharedTripData = {
  trip: {
    id: string;
    status: string;
    pickupLocation: string;
    dropoffLocation: string;
    createdAt: string;
  };
  sharedAt: string;
  expiresAt: string;
};

export default function TripSharePage() {
  const [, params] = useRoute("/trip-share/:token");
  const [tripData, setTripData] = useState<SharedTripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.token) return;
    
    fetch(`${API_BASE}/api/trip-share/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to load shared trip");
        }
        return res.json();
      })
      .then((data) => {
        setTripData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [params?.token]);

  if (loading) return <FullPageLoading />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold" data-testid="text-share-error">
              {error}
            </h2>
            <p className="text-sm text-muted-foreground">
              This share link may have expired or been deactivated.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tripData) return null;

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-shared-trip-title">
            <Shield className="h-5 w-5 text-primary" />
            Shared Trip
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={tripData.trip.status as any} />
            <Badge variant="outline" data-testid="badge-trip-status">
              Live
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="font-medium" data-testid="text-pickup-location">
                  {tripData.trip.pickupLocation}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Dropoff</p>
                <p className="font-medium" data-testid="text-dropoff-location">
                  {tripData.trip.dropoffLocation}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span data-testid="text-trip-time">
              Shared {new Date(tripData.sharedAt).toLocaleString()}
            </span>
          </div>

          <p className="text-xs text-muted-foreground" data-testid="text-expire-time">
            Link expires {new Date(tripData.expiresAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
