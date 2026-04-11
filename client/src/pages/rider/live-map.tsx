import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Share2, ArrowLeft, Car, Clock, User } from "lucide-react";
import { API_BASE } from "@/lib/apiBase";
import { joinTrip, joinDriver, leaveTrip, leaveDriver, onDriverLocation, type LocationUpdate } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import "leaflet/dist/leaflet.css";

export default function RiderLiveMap() {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number; speed?: number | null; updatedAt?: string } | null>(null);
  const [pathPoints, setPathPoints] = useState<[number, number][]>([]);
  const [isStale, setIsStale] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const { toast } = useToast();

  const { data: currentTrip } = useQuery<any>({
    queryKey: ["/api/rider/current-trip"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (currentTrip?.driverId) {
      setDriverId(currentTrip.driverId);
      setTripId(currentTrip.id);
    }
  }, [currentTrip]);

  const initMap = useCallback(async () => {
    if (mapRef.current || !mapContainerRef.current) return;
    const L = await import("leaflet");
    leafletRef.current = L;

    const defaultIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = defaultIcon;

    const map = L.map(mapContainerRef.current).setView([9.06, 7.49], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap', maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
  }, []);

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [initMap]);

  useEffect(() => {
    if (tripId) {
      fetch(`${API_BASE}/api/trips/${tripId}/locations?limit=500`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then((pts: any[]) => {
          if (pts.length) {
            setPathPoints(pts.map((p: any) => [parseFloat(p.lat), parseFloat(p.lng)] as [number, number]));
          }
        })
        .catch(() => {});
    }
  }, [tripId]);

  useEffect(() => {
    if (!driverId) return;
    joinDriver(driverId);
    if (tripId) joinTrip(tripId);

    const unsub = onDriverLocation((data: LocationUpdate) => {
      const loc = { lat: data.lat, lng: data.lng, speed: data.speed, updatedAt: data.updatedAt };
      setDriverLoc(loc);
      setIsStale(false);
      setPathPoints(prev => {
        const next = [...prev, [data.lat, data.lng] as [number, number]];
        return next.length > 500 ? next.slice(-500) : next;
      });
    });

    let pollingInterval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      pollingInterval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/driver/location/latest?driverId=${driverId}`, { credentials: "include" });
          if (res.ok) {
            const d = await res.json();
            setDriverLoc({ lat: parseFloat(d.lat), lng: parseFloat(d.lng), speed: d.speed ? parseFloat(d.speed) : null, updatedAt: d.updatedAt });
            const age = Date.now() - new Date(d.updatedAt).getTime();
            setIsStale(age > 10000);
          }
        } catch {}
      }, 3000);
    };
    startPolling();

    return () => {
      unsub();
      leaveDriver(driverId);
      if (tripId) leaveTrip(tripId);
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [driverId, tripId]);

  useEffect(() => {
    if (!driverLoc || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const { lat, lng } = driverLoc;

    if (markerRef.current) {
      const cur = markerRef.current.getLatLng();
      const steps = 10;
      const dLat = (lat - cur.lat) / steps;
      const dLng = (lng - cur.lng) / steps;
      let step = 0;
      const animate = () => {
        if (step >= steps) return;
        step++;
        markerRef.current.setLatLng([cur.lat + dLat * step, cur.lng + dLng * step]);
        requestAnimationFrame(animate);
      };
      animate();
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map);
      map.setView([lat, lng], 15);
    }

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(pathPoints);
    } else if (pathPoints.length > 1) {
      polylineRef.current = L.polyline(pathPoints, { color: "#2563eb", weight: 3, opacity: 0.7 }).addTo(map);
    }

    map.panTo([lat, lng], { animate: true, duration: 0.5 });
  }, [driverLoc, pathPoints]);

  const handleShareLocation = async () => {
    if (!tripId || !driverId) return;
    try {
      const res = await fetch(`${API_BASE}/api/rider/emergency-tracking-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tripId, driverId }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      if (navigator.share) {
        await navigator.share({ title: "Track my ride", url: data.url });
      } else {
        await navigator.clipboard.writeText(data.url);
        toast({ title: "Link copied!", description: "Share this link with your emergency contact" });
      }
    } catch {
      toast({ title: "Error", description: "Could not create tracking link", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" data-testid="rider-live-map-page">
      <div className="flex items-center justify-between p-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <Link href="/rider/home">
            <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <Navigation className="h-5 w-5 text-blue-600" />
          <h1 className="text-base font-semibold">Live Trip Map</h1>
        </div>
        <div className="flex items-center gap-2">
          {driverId && (
            <Badge variant={isStale ? "destructive" : "default"} className={!isStale ? "bg-emerald-600" : ""} data-testid="badge-live-status">
              {isStale ? "Stale" : "Live"}
            </Badge>
          )}
          {tripId && (
            <Button size="sm" variant="outline" onClick={handleShareLocation} data-testid="button-share-location">
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
          )}
        </div>
      </div>

      <div className="relative flex-1">
        <div ref={mapContainerRef} className="absolute inset-0" data-testid="rider-map-container" />

        {!driverId && (
          <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background/50">
            <Card data-testid="card-no-trip">
              <CardContent className="py-6 px-8 text-center">
                <MapPin className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No active trip with a driver assigned</p>
                <Link href="/rider/home">
                  <Button variant="link" className="mt-2">Back to Home</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {driverLoc && (
          <Card className="absolute bottom-4 left-4 right-4 z-[1000] shadow-lg" data-testid="card-driver-location">
            <CardContent className="py-3 px-4 space-y-2">
              {currentTrip && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" data-testid="text-driver-name-map">{currentTrip.driverName || "Your Driver"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {currentTrip.driverVehicle && (
                        <span className="flex items-center gap-1" data-testid="text-driver-vehicle-map">
                          <Car className="h-3 w-3" /> {currentTrip.driverVehicle}
                        </span>
                      )}
                      {currentTrip.driverLicensePlate && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0" data-testid="text-driver-plate-map">
                          {currentTrip.driverLicensePlate}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {driverLoc.speed != null && Number(driverLoc.speed) > 0.5 && (
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-primary font-semibold" data-testid="text-eta">
                        <Clock className="h-4 w-4" />
                        <span>{Math.max(1, Math.round((currentTrip.estimatedDistance || 2) / (Number(driverLoc.speed) * 3.6 || 30) * 60))} min</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">ETA</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>
                  {driverLoc.speed != null ? `${(Number(driverLoc.speed) * 3.6).toFixed(0)} km/h` : "Waiting..."}
                </span>
                {driverLoc.updatedAt && (
                  <span>{new Date(driverLoc.updatedAt).toLocaleTimeString()}</span>
                )}
                <Badge variant={isStale ? "destructive" : "default"} className={`text-[10px] ${!isStale ? "bg-emerald-600" : ""}`}>
                  {isStale ? "Stale" : "Live"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
