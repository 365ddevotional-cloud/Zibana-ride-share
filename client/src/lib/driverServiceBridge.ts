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
  setDriverOnlineState(data: { online: boolean }): Promise<{ online: boolean }>;
  setTripActive(data: { active: boolean }): Promise<{ active: boolean }>;
  requestOverlayPermission(): Promise<{
    granted: boolean;
    alreadyGranted?: boolean;
    settingsOpened?: boolean;
  }>;
  setOverlayEnabled(data: { enabled: boolean }): Promise<{
    enabled: boolean;
    permissionDenied?: boolean;
  }>;
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

export async function setDriverOnlineState(online: boolean): Promise<void> {
  if (!DriverServiceNative) return;
  try {
    await DriverServiceNative.setDriverOnlineState({ online });
    console.log("[DriverService] Driver online state set to:", online);
  } catch (e) {
    console.error("[DriverService] Failed to set driver online state:", e);
  }
}

export async function setTripActive(active: boolean): Promise<void> {
  if (!DriverServiceNative) return;
  try {
    await DriverServiceNative.setTripActive({ active });
    console.log("[DriverService] Trip active state set to:", active);
  } catch (e) {
    console.error("[DriverService] Failed to set trip active state:", e);
  }
}

export async function requestOverlayPermission(): Promise<{
  granted: boolean;
  alreadyGranted?: boolean;
  settingsOpened?: boolean;
}> {
  if (!DriverServiceNative) {
    console.log("[DriverService] Not on Android native, skipping requestOverlayPermission");
    return { granted: false };
  }
  try {
    const result = await DriverServiceNative.requestOverlayPermission();
    console.log("[DriverService] Overlay permission result:", result);
    return result;
  } catch (e) {
    console.error("[DriverService] Failed to request overlay permission:", e);
    return { granted: false };
  }
}

export async function setOverlayEnabled(enabled: boolean): Promise<{
  enabled: boolean;
  permissionDenied?: boolean;
}> {
  if (!DriverServiceNative) {
    console.log("[DriverService] Not on Android native, skipping setOverlayEnabled");
    return { enabled: false };
  }
  try {
    const result = await DriverServiceNative.setOverlayEnabled({ enabled });
    console.log("[DriverService] Overlay enabled:", result);
    return result;
  } catch (e) {
    console.error("[DriverService] Failed to set overlay:", e);
    return { enabled: false };
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
