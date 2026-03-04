import { Capacitor, registerPlugin } from "@capacitor/core";

interface QuickAccessPluginInterface {
  startBubble(): Promise<{ started: boolean; permissionDenied?: boolean }>;
  stopBubble(): Promise<{ stopped: boolean }>;
  isBubbleActive(): Promise<{ active: boolean }>;
  requestOverlayPermission(): Promise<{
    granted: boolean;
    alreadyGranted?: boolean;
    settingsOpened?: boolean;
  }>;
  hasOverlayPermission(): Promise<{ granted: boolean }>;
}

const isNativeAndroid =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const QuickAccessNative = isNativeAndroid
  ? registerPlugin<QuickAccessPluginInterface>("QuickAccess")
  : null;

const STORAGE_KEYS = {
  BUBBLE_ENABLED: "zibana_bubble_enabled",
  PROMPT_COUNT: "zibana_bubble_prompt_count",
  PROMPT_DISABLED: "zibana_bubble_prompt_disabled",
  LOGIN_COUNTER: "zibana_login_counter",
  LAST_ROUTE: "lastRoute",
  RIDE_STATE: "rideState",
};

export function isQuickAccessAvailable(): boolean {
  return isNativeAndroid;
}

export async function startQuickAccessBubble(): Promise<boolean> {
  if (!QuickAccessNative) return false;
  try {
    const result = await QuickAccessNative.startBubble();
    if (result.permissionDenied) {
      console.log("[QuickAccess] Overlay permission not granted");
      return false;
    }
    return result.started;
  } catch (e) {
    console.error("[QuickAccess] Failed to start bubble:", e);
    return false;
  }
}

export async function stopQuickAccessBubble(): Promise<void> {
  if (!QuickAccessNative) return;
  try {
    await QuickAccessNative.stopBubble();
  } catch (e) {
    console.error("[QuickAccess] Failed to stop bubble:", e);
  }
}

export async function isBubbleRunning(): Promise<boolean> {
  if (!QuickAccessNative) return false;
  try {
    const result = await QuickAccessNative.isBubbleActive();
    return result.active;
  } catch {
    return false;
  }
}

export async function requestBubbleOverlayPermission(): Promise<{
  granted: boolean;
  alreadyGranted?: boolean;
  settingsOpened?: boolean;
}> {
  if (!QuickAccessNative) return { granted: false };
  try {
    return await QuickAccessNative.requestOverlayPermission();
  } catch {
    return { granted: false };
  }
}

export async function hasBubbleOverlayPermission(): Promise<boolean> {
  if (!QuickAccessNative) return false;
  try {
    const result = await QuickAccessNative.hasOverlayPermission();
    return result.granted;
  } catch {
    return false;
  }
}

export function isBubbleEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.BUBBLE_ENABLED) === "true";
}

export function setBubbleEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.BUBBLE_ENABLED, String(enabled));
}

export function getLoginCounter(): number {
  return parseInt(localStorage.getItem(STORAGE_KEYS.LOGIN_COUNTER) || "0", 10);
}

export function incrementLoginCounter(): number {
  const count = getLoginCounter() + 1;
  localStorage.setItem(STORAGE_KEYS.LOGIN_COUNTER, String(count));
  return count;
}

export function getPromptCount(): number {
  return parseInt(localStorage.getItem(STORAGE_KEYS.PROMPT_COUNT) || "0", 10);
}

export function setPromptCount(count: number): void {
  localStorage.setItem(STORAGE_KEYS.PROMPT_COUNT, String(count));
}

export function isPromptDisabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.PROMPT_DISABLED) === "true";
}

export function setPromptDisabled(disabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.PROMPT_DISABLED, String(disabled));
}

export function resetPromptCycle(): void {
  localStorage.removeItem(STORAGE_KEYS.PROMPT_COUNT);
  localStorage.removeItem(STORAGE_KEYS.PROMPT_DISABLED);
  localStorage.setItem(STORAGE_KEYS.LOGIN_COUNTER, "0");
}

export function shouldShowBubblePrompt(): boolean {
  if (!isNativeAndroid) return false;
  if (isBubbleEnabled()) return false;
  if (isPromptDisabled()) return false;

  const loginCount = getLoginCounter();
  const promptCount = getPromptCount();

  if (promptCount === 0 && loginCount >= 1) return true;
  if (promptCount === 1 && loginCount >= 3) return true;
  if (promptCount === 2 && loginCount >= 13) return true;

  return false;
}

export function saveLastRoute(route: string): void {
  localStorage.setItem(STORAGE_KEYS.LAST_ROUTE, route);
}

export function getLastRoute(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LAST_ROUTE);
}

export function saveRideState(state: Record<string, unknown>): void {
  localStorage.setItem(STORAGE_KEYS.RIDE_STATE, JSON.stringify(state));
}

export function getRideState(): Record<string, unknown> | null {
  const raw = localStorage.getItem(STORAGE_KEYS.RIDE_STATE);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearRideState(): void {
  localStorage.removeItem(STORAGE_KEYS.RIDE_STATE);
}

export async function onUserLogin(): Promise<void> {
  incrementLoginCounter();
  if (isBubbleEnabled()) {
    await startQuickAccessBubble();
  }
}

export async function onUserLogout(): Promise<void> {
  await stopQuickAccessBubble();
  localStorage.removeItem(STORAGE_KEYS.LAST_ROUTE);
  localStorage.removeItem(STORAGE_KEYS.RIDE_STATE);
}
