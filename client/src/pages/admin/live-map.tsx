import { useEffect, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Wifi, WifiOff } from "lucide-react";
import { API_BASE } from "@/lib/apiBase";
import { joinDriver, leaveDriver, onDriverLocation, type LocationUpdate } from "@/lib/socket";
import "leaflet/dist/leaflet.css";

interface DriverLocationData {
  id: number;
  driverId: string;
  lat: string;
  lng: string;
  heading: string | null;
  speed: string | null;
  accuracy: string | null;
  battery: string | null;
  isMoving: boolean | null;
  updatedAt: string;
}

export default function LiveDriverMap() {
  const [driverId, setDriverId] = useState("");
  const [activeDriverId, setActiveDriverId] = useState("");
  const [location, setLocation] = useState<DriverLocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [pathPoints, setPathPoints] = useState<[number, number][]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

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

    const map = L.map(mapContainerRef.current).setView([29.4241, -98.4936], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
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
    if (!activeDriverId) return;

    let cancelled = false;

    joinDriver(activeDriverId);

    const unsub = onDriverLocation((data: LocationUpdate) => {
      if (data.driverId !== activeDriverId) return;
      const locData: DriverLocationData = {
        id: 0,
        driverId: data.driverId,
        lat: String(data.lat),
        lng: String(data.lng),
        heading: data.heading != null ? String(data.heading) : null,
        speed: data.speed != null ? String(data.speed) : null,
        accuracy: data.accuracy != null ? String(data.accuracy) : null,
        battery: data.battery != null ? String(data.battery) : null,
        isMoving: data.isMoving,
        updatedAt: data.updatedAt,
      };
      setLocation(locData);
      setError(null);
      setIsStale(false);

      setPathPoints(prev => {
        const next = [...prev, [data.lat, data.lng] as [number, number]];
        return next.length > 500 ? next.slice(-500) : next;
      });
    });

    const fetchLocation = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/driver/location/latest?driverId=${encodeURIComponent(activeDriverId)}`,
          { credentials: "include" }
        );
        if (cancelled) return;

        if (res.status === 404) {
          setLocation(null);
          setError("Driver offline or no data yet");
          return;
        }
        if (!res.ok) {
          setError(`Error: ${res.status}`);
          return;
        }

        const data: DriverLocationData = await res.json();
        setLocation(data);
        setError(null);
        const updatedAt = new Date(data.updatedAt).getTime();
        setIsStale(Date.now() - updatedAt > 10000);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Network error");
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 3000);

    return () => {
      cancelled = true;
      unsub();
      leaveDriver(activeDriverId);
      clearInterval(interval);
      if (markerRef.current && mapRef.current) {
        mapRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (polylineRef.current && mapRef.current) {
        mapRef.current.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }
      setPathPoints([]);
    };
  }, [activeDriverId]);

  useEffect(() => {
    if (!location || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lng);

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

    const speed = location.speed ? `${parseFloat(location.speed).toFixed(1)} m/s` : "—";
    const battery = location.battery ? `${location.battery}%` : "—";
    const time = new Date(location.updatedAt).toLocaleTimeString();

    markerRef.current.bindPopup(
      `<div style="font-size:12px;line-height:1.6">
        <b>Driver: ${location.driverId.slice(0, 8)}...</b><br/>
        Lat: ${lat.toFixed(6)}<br/>Lng: ${lng.toFixed(6)}<br/>
        Speed: ${speed}<br/>Battery: ${battery}<br/>Updated: ${time}
      </div>`
    );
  }, [location, pathPoints]);

  const handleTrack = () => {
    if (driverId.trim()) {
      setActiveDriverId(driverId.trim());
      setLocation(null);
      setError(null);
      setPathPoints([]);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="live-map-page">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-semibold">Live Driver Map</h1>
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Enter Driver ID"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTrack()}
            className="w-64 h-9 text-sm"
            data-testid="input-driver-id"
          />
          <Button size="sm" onClick={handleTrack} data-testid="button-track-driver">
            <Search className="h-4 w-4 mr-1" />
            Track
          </Button>
        </div>

        {activeDriverId && (
          <Badge
            variant={error ? "destructive" : isStale ? "destructive" : "default"}
            className={!error && !isStale ? "bg-emerald-600" : ""}
            data-testid="badge-tracking-status"
          >
            {error ? (
              <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
            ) : isStale ? (
              <><WifiOff className="h-3 w-3 mr-1" /> Stale</>
            ) : (
              <><Wifi className="h-3 w-3 mr-1" /> Live</>
            )}
          </Badge>
        )}
      </div>

      <div className="relative flex-1">
        <div ref={mapContainerRef} className="absolute inset-0" data-testid="map-container" />

        {error && (
          <Card className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] shadow-lg" data-testid="card-error">
            <CardContent className="py-3 px-4 text-sm text-muted-foreground flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              {error}
            </CardContent>
          </Card>
        )}

        {location && (
          <Card className="absolute bottom-4 left-4 z-[1000] shadow-lg" data-testid="card-location-info">
            <CardContent className="py-3 px-4 text-xs font-mono space-y-1">
              <p>Lat: {parseFloat(location.lat).toFixed(6)}</p>
              <p>Lng: {parseFloat(location.lng).toFixed(6)}</p>
              <p>Speed: {location.speed ? `${parseFloat(location.speed).toFixed(1)} m/s` : "—"}</p>
              <p>Battery: {location.battery ? `${location.battery}%` : "—"}</p>
              <p>Updated: {new Date(location.updatedAt).toLocaleTimeString()}</p>
            </CardContent>
          </Card>
        )}

        {!activeDriverId && (
          <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background/50">
            <Card data-testid="card-prompt">
              <CardContent className="py-6 px-8 text-center">
                <MapPin className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Enter a Driver ID above to start tracking</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
