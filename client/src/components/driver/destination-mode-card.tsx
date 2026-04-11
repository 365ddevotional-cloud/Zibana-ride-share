import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Navigation, MapPin, X, Compass } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DestinationStatus {
  active: boolean;
  targetLat: string | null;
  targetLng: string | null;
  targetAddress: string | null;
  usesToday: number;
  usesRemaining: number;
  homeBase: { lat: string; lng: string; address: string | null } | null;
}

export function DestinationModeCard() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [destAddress, setDestAddress] = useState("");
  const [destLat, setDestLat] = useState("");
  const [destLng, setDestLng] = useState("");

  const { data: status } = useQuery<DestinationStatus>({
    queryKey: ["/api/driver/destination-status"],
    refetchInterval: 30000,
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      let lat = parseFloat(destLat);
      let lng = parseFloat(destLng);

      if (!lat || !lng) {
        throw new Error("Please enter valid coordinates for your destination");
      }

      let currentLat: number | undefined;
      let currentLng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        currentLat = pos.coords.latitude;
        currentLng = pos.coords.longitude;
      } catch {}

      return apiRequest("POST", "/api/driver/destination-mode", {
        lat, lng, address: destAddress || null,
        currentLat, currentLng,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/destination-status"] });
      setDialogOpen(false);
      setDestAddress("");
      setDestLat("");
      setDestLng("");
      toast({ title: "Destination Mode activated" });
    },
    onError: (err: any) => {
      toast({ title: "Cannot activate", description: err.message, variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/driver/destination-mode/off", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/destination-status"] });
      toast({ title: "Destination Mode deactivated" });
    },
  });

  const useCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDestLat(pos.coords.latitude.toFixed(6));
        setDestLng(pos.coords.longitude.toFixed(6));
        setDestAddress("Current Location Pin");
      },
      () => toast({ title: "Could not get location", variant: "destructive" }),
      { timeout: 5000 }
    );
  };

  if (!status) return null;

  return (
    <>
      <Card data-testid="card-destination-mode">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Navigation className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Destination Mode</p>
                {status.active ? (
                  <p className="text-xs text-muted-foreground truncate">
                    Heading to: {status.targetAddress || `${parseFloat(status.targetLat || "0").toFixed(4)}, ${parseFloat(status.targetLng || "0").toFixed(4)}`}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Only get trips heading your way</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px]" data-testid="badge-dest-uses">
                {status.usesRemaining}/4
              </Badge>
              {status.active ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deactivateMutation.mutate()}
                  disabled={deactivateMutation.isPending}
                  data-testid="button-dest-off"
                >
                  <X className="h-3 w-3 mr-1" /> Off
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                  disabled={status.usesRemaining <= 0}
                  data-testid="button-dest-on"
                >
                  <Compass className="h-3 w-3 mr-1" /> Set
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Destination</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Only trips heading toward your destination will be offered.
              {status.usesRemaining <= 1 && status.usesRemaining > 0 && (
                <span className="text-amber-600 font-medium block mt-1">
                  Last activation today — requires being 50km+ from Home Base.
                </span>
              )}
            </p>
            <Input
              placeholder="Destination address (optional)"
              value={destAddress}
              onChange={(e) => setDestAddress(e.target.value)}
              data-testid="input-dest-address"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Latitude"
                type="number"
                step="any"
                value={destLat}
                onChange={(e) => setDestLat(e.target.value)}
                data-testid="input-dest-lat"
              />
              <Input
                placeholder="Longitude"
                type="number"
                step="any"
                value={destLng}
                onChange={(e) => setDestLng(e.target.value)}
                data-testid="input-dest-lng"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={useCurrentLocation}
              className="w-full"
              data-testid="button-use-current-location"
            >
              <MapPin className="h-4 w-4 mr-2" /> Use Current Location
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-dest-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending || (!destLat || !destLng)}
              data-testid="button-dest-activate"
            >
              {activateMutation.isPending ? "Activating..." : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
