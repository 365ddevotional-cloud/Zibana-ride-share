import { API_BASE } from "./apiBase";

type TrackingCallback = (coords: GeolocationCoordinates) => void;
type ErrorCallback = (error: GeolocationPositionError | Error) => void;

interface TrackingOptions {
  onUpdate?: TrackingCallback;
  onError?: ErrorCallback;
  throttleMs?: number;
  minDistanceMeters?: number;
}

let watchId: number | null = null;
let mockIntervalId: ReturnType<typeof setInterval> | null = null;
let lastSentTime = 0;
let lastSentLat = 0;
let lastSentLng = 0;
let pendingUpdate: { lat: number; lng: number; heading: number | null; speed: number | null; accuracy: number | null; battery: number | null } | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let activeTripId: string | null = null;

export function setTripContext(tripId: string | null) {
  activeTripId = tripId;
}

export function getTripContext(): string | null {
  return activeTripId;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getBatteryLevel(): Promise<number | null> {
  try {
    const { Device } = await import("@capacitor/device");
    const info = await Device.getBatteryInfo();
    return info.batteryLevel != null ? Math.round(info.batteryLevel * 100) : null;
  } catch {
    return null;
  }
}

async function sendLocationToServer(data: {
  lat: number; lng: number;
  heading: number | null; speed: number | null;
  accuracy: number | null; battery: number | null;
}): Promise<boolean> {
  try {
    const payload: any = { ...data };
    if (activeTripId) payload.tripId = activeTripId;
    const res = await fetch(`${API_BASE}/api/driver/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function processUpdate(
  lat: number, lng: number,
  heading: number | null, speed: number | null,
  accuracy: number | null,
  throttleMs: number, minDistanceMeters: number,
): Promise<{ sent: boolean; ok: boolean }> {
  const now = Date.now();
  const distance = haversineDistance(lastSentLat, lastSentLng, lat, lng);
  const timeSinceLastSend = now - lastSentTime;

  if (timeSinceLastSend < throttleMs && distance < minDistanceMeters) {
    return { sent: false, ok: true };
  }

  const battery = await getBatteryLevel();
  const payload = { lat, lng, heading, speed, accuracy, battery };

  const ok = await sendLocationToServer(payload);
  if (ok) {
    lastSentTime = now;
    lastSentLat = lat;
    lastSentLng = lng;
    pendingUpdate = null;
  } else {
    pendingUpdate = payload;
    scheduleRetry(throttleMs, minDistanceMeters);
  }

  return { sent: true, ok };
}

function scheduleRetry(throttleMs: number, minDistanceMeters: number) {
  if (retryTimeout) return;
  retryTimeout = setTimeout(async () => {
    retryTimeout = null;
    if (pendingUpdate) {
      const { lat, lng, heading, speed, accuracy } = pendingUpdate;
      await processUpdate(lat, lng, heading, speed, accuracy, throttleMs, minDistanceMeters);
    }
  }, 5000);
}

export interface TrackingState {
  status: "idle" | "starting" | "tracking" | "error";
  lastCoords: { lat: number; lng: number } | null;
  lastSentAt: number | null;
  error: string | null;
}

let stateCallback: ((state: Partial<TrackingState>) => void) | null = null;

export function onTrackingStateChange(cb: (state: Partial<TrackingState>) => void) {
  stateCallback = cb;
}

async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.getPlatform() !== "web";
  } catch {
    return false;
  }
}

export async function startMockTracking(): Promise<void> {
  if (mockIntervalId != null) return;

  const throttleMs = 3000;
  const minDistanceMeters = 20;

  stateCallback?.({ status: "starting" });

  let mockLat = 29.4241;
  let mockLng = -98.4936;
  let step = 0;

  mockIntervalId = setInterval(async () => {
    step++;
    mockLat += 0.0003 * Math.cos(step * 0.2);
    mockLng += 0.0004 * Math.sin(step * 0.15);
    const heading = (step * 15) % 360;
    const speed = 8 + Math.random() * 4;

    stateCallback?.({
      status: "tracking",
      lastCoords: { lat: mockLat, lng: mockLng },
      error: null,
    });

    const result = await processUpdate(
      mockLat, mockLng, heading, speed, 10, throttleMs, minDistanceMeters,
    );
    if (result.sent && result.ok) {
      stateCallback?.({ lastSentAt: Date.now() });
    }
  }, 3000);

  stateCallback?.({ status: "tracking" });
}

export async function stopMockTracking(): Promise<void> {
  if (mockIntervalId != null) {
    clearInterval(mockIntervalId);
    mockIntervalId = null;
  }
  resetState();
}

export async function startTracking(options: TrackingOptions = {}): Promise<void> {
  const throttleMs = options.throttleMs ?? 3000;
  const minDistanceMeters = options.minDistanceMeters ?? 20;

  if (watchId != null || mockIntervalId != null) return;

  const native = await isNativePlatform();
  if (!native && import.meta.env.DEV) {
    await startMockTracking();
    return;
  }

  stateCallback?.({ status: "starting" });

  try {
    const { Geolocation } = await import("@capacitor/geolocation");

    const perm = await Geolocation.checkPermissions();
    if (perm.location === "denied") {
      const req = await Geolocation.requestPermissions();
      if (req.location === "denied") {
        stateCallback?.({ status: "error", error: "Location permission denied" });
        options.onError?.(new Error("Location permission denied"));
        return;
      }
    }

    watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 10000 },
      async (position, err) => {
        if (err) {
          stateCallback?.({ status: "error", error: err.message });
          options.onError?.(err);
          return;
        }
        if (!position) return;

        const { latitude, longitude, heading, speed, accuracy } = position.coords;
        stateCallback?.({
          status: "tracking",
          lastCoords: { lat: latitude, lng: longitude },
          error: null,
        });
        options.onUpdate?.(position.coords);

        const result = await processUpdate(
          latitude, longitude,
          heading, speed, accuracy,
          throttleMs, minDistanceMeters,
        );
        if (result.sent && result.ok) {
          stateCallback?.({ lastSentAt: Date.now() });
        }
      },
    ) as unknown as number;

    stateCallback?.({ status: "tracking" });
  } catch (err: any) {
    stateCallback?.({ status: "error", error: err.message || "Failed to start tracking" });
    options.onError?.(err);
  }
}

function resetState() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  pendingUpdate = null;
  lastSentTime = 0;
  lastSentLat = 0;
  lastSentLng = 0;
  stateCallback?.({ status: "idle", lastCoords: null, lastSentAt: null, error: null });
}

export async function stopTracking(): Promise<void> {
  if (mockIntervalId != null) {
    await stopMockTracking();
    return;
  }
  if (watchId != null) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      await Geolocation.clearWatch({ id: String(watchId) });
    } catch {}
    watchId = null;
  }
  resetState();
}

export function isTracking(): boolean {
  return watchId != null || mockIntervalId != null;
}

export function isMockMode(): boolean {
  return mockIntervalId != null;
}
