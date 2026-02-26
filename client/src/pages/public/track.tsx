import { useEffect, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, AlertTriangle, Clock } from "lucide-react";
import { API_BASE } from "@/lib/apiBase";
import { joinPublicToken, onDriverLocation, type LocationUpdate } from "@/lib/socket";
import "leaflet/dist/leaflet.css";

interface TrackingData {
  driverId: string;
  tripId: string | null;
  expiresAt: string;
  location: { lat: string; lng: string; heading: string | null; speed: string | null; updatedAt: string } | null;
  tripSummary: { pickupLocation: string; dropoffLocation: string; status: string } | null;
}

export default function PublicTrackPage({ token }: { token: string }) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [pathPoints, setPathPoints] = useState<[number, number][]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/track/${token}`)
      .then(async r => {
        if (!r.ok) {
          const d = await r.json();
          setError(d.message);
          setErrorCode(d.code);
          return;
        }
        const d: TrackingData = await r.json();
        setData(d);
        if (d.location) {
          setDriverLoc({ lat: parseFloat(d.location.lat), lng: parseFloat(d.location.lng) });
        }
      })
      .catch(() => setError("Network error"));
  }, [token]);

  useEffect(() => {
    if (!data) return;
    fetch(`${API_BASE}/api/public/track/${token}/locations?limit=500`)
      .then(r => r.ok ? r.json() : [])
      .then((pts: any[]) => {
        if (pts.length) {
          setPathPoints(pts.map((p: any) => [parseFloat(p.lat), parseFloat(p.lng)] as [number, number]));
        }
      })
      .catch(() => {});
  }, [data, token]);

  useEffect(() => {
    if (!data) return;

    joinPublicToken(token);

    const unsub = onDriverLocation((loc: LocationUpdate) => {
      setDriverLoc({ lat: loc.lat, lng: loc.lng });
      setPathPoints(prev => {
        const next = [...prev, [loc.lat, loc.lng] as [number, number]];
        return next.length > 500 ? next.slice(-500) : next;
      });
    });

    let pollingInterval: ReturnType<typeof setInterval> | null = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/public/track/${token}`);
        if (res.ok) {
          const d: TrackingData = await res.json();
          if (d.location) {
            setDriverLoc({ lat: parseFloat(d.location.lat), lng: parseFloat(d.location.lng) });
          }
        }
      } catch {}
    }, 3000);

    return () => {
      unsub();
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [data, token]);

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
    if (!error) initMap();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [initMap, error]);

  useEffect(() => {
    if (!driverLoc || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    if (markerRef.current) {
      const cur = markerRef.current.getLatLng();
      const steps = 10;
      const dLat = (driverLoc.lat - cur.lat) / steps;
      const dLng = (driverLoc.lng - cur.lng) / steps;
      let step = 0;
      const anim = () => {
        if (step >= steps) return;
        step++;
        markerRef.current.setLatLng([cur.lat + dLat * step, cur.lng + dLng * step]);
        requestAnimationFrame(anim);
      };
      anim();
    } else {
      markerRef.current = L.marker([driverLoc.lat, driverLoc.lng]).addTo(map);
      map.setView([driverLoc.lat, driverLoc.lng], 15);
    }

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(pathPoints);
    } else if (pathPoints.length > 1) {
      polylineRef.current = L.polyline(pathPoints, { color: "#2563eb", weight: 3, opacity: 0.7 }).addTo(map);
    }

    map.panTo([driverLoc.lat, driverLoc.lng], { animate: true, duration: 0.5 });
  }, [driverLoc, pathPoints]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" data-testid="track-error-page">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            {errorCode === "EXPIRED" ? (
              <Clock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            ) : (
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            )}
            <h2 className="text-lg font-semibold mb-2">
              {errorCode === "EXPIRED" ? "Link Expired" :
               errorCode === "REVOKED" ? "Link Revoked" :
               "Link Not Found"}
            </h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" data-testid="public-track-page">
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <h1 className="text-base font-semibold">ZIBANA Live Tracking</h1>
        </div>
        <Badge variant="default" className="bg-emerald-600" data-testid="badge-public-live">Live</Badge>
      </div>

      {data?.tripSummary && (
        <div className="px-3 py-2 border-b bg-gray-50 text-xs">
          <span className="font-medium">From:</span> {data.tripSummary.pickupLocation}
          <span className="mx-2">→</span>
          <span className="font-medium">To:</span> {data.tripSummary.dropoffLocation}
        </div>
      )}

      <div className="relative flex-1">
        <div ref={mapContainerRef} className="absolute inset-0" data-testid="public-map-container" />

        {driverLoc && (
          <Card className="absolute bottom-4 left-4 z-[1000] shadow-lg" data-testid="card-public-location">
            <CardContent className="py-2 px-3 text-xs font-mono space-y-1">
              <p>Driver Location</p>
              <p>Lat: {driverLoc.lat.toFixed(6)}</p>
              <p>Lng: {driverLoc.lng.toFixed(6)}</p>
            </CardContent>
          </Card>
        )}

        {!driverLoc && !error && (
          <div className="absolute inset-0 z-[999] flex items-center justify-center bg-white/50">
            <Card>
              <CardContent className="py-6 px-8 text-center">
                <MapPin className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Waiting for driver location...</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
