import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

interface DriverServicePluginInterface {
  startService(): Promise<{ started: boolean }>;
  stopService(): Promise<{ stopped: boolean }>;
  triggerIncomingRide(data: {
    rideId: string;
    pickup: string;
    dropoff: string;
    fare: string;
    currency: string;
    riderName: string;
    riderRating: string;
    distance: string;
    duration: string;
  }): Promise<{ triggered: boolean }>;
  addListener(
    eventName: "rideActionResponse",
    listener: (data: { rideId: string; accepted: boolean }) => void
  ): Promise<PluginListenerHandle>;
}

const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const DriverServiceNative = isNativeAndroid
  ? registerPlugin<DriverServicePluginInterface>("DriverService")
  : null;

export async function startDriverService(): Promise<void> {
  if (!DriverServiceNative) {
    console.log("[DriverService] Not on Android native, skipping startService");
    return;
  }
  try {
    await DriverServiceNative.startService();
    console.log("[DriverService] Foreground service started");
  } catch (e) {
    console.error("[DriverService] Failed to start service:", e);
  }
}

export async function stopDriverService(): Promise<void> {
  if (!DriverServiceNative) {
    console.log("[DriverService] Not on Android native, skipping stopService");
    return;
  }
  try {
    await DriverServiceNative.stopService();
    console.log("[DriverService] Foreground service stopped");
  } catch (e) {
    console.error("[DriverService] Failed to stop service:", e);
  }
}

export async function triggerIncomingRide(data: {
  rideId: string;
  pickup: string;
  dropoff: string;
  fare: string;
  currency: string;
  riderName: string;
  riderRating: string;
  distance: string;
  duration: string;
}): Promise<void> {
  if (!DriverServiceNative) {
    console.log("[DriverService] Not on Android native, skipping triggerIncomingRide");
    return;
  }
  try {
    await DriverServiceNative.triggerIncomingRide(data);
    console.log("[DriverService] Incoming ride triggered:", data.rideId);
  } catch (e) {
    console.error("[DriverService] Failed to trigger incoming ride:", e);
  }
}

export function onRideActionResponse(
  callback: (data: { rideId: string; accepted: boolean }) => void
): (() => void) | null {
  if (!DriverServiceNative) return null;
  let handle: PluginListenerHandle | null = null;
  DriverServiceNative.addListener("rideActionResponse", callback).then((h) => {
    handle = h;
  });
  return () => {
    handle?.remove();
  };
}

export function isAndroidNative(): boolean {
  return isNativeAndroid;
}
