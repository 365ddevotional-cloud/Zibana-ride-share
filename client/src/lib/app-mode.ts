export type AppMode = "RIDER" | "DRIVER" | "UNIFIED";

export const APP_MODE: AppMode = "RIDER";

export const RIDER_ALLOWED_ROLES = ["rider"] as const;

export function isRoleAllowedInAppMode(role: string | null | undefined): boolean {
  if (APP_MODE === "UNIFIED") return true;
  if (APP_MODE === "RIDER") return role === "rider";
  if (APP_MODE === "DRIVER") return role === "driver";
  return false;
}

export function getAppName(): string {
  if (APP_MODE === "RIDER") return "ZIBA Ride";
  if (APP_MODE === "DRIVER") return "ZIBA Driver";
  return "ZIBA";
}

export function getAppPackageName(): string {
  if (APP_MODE === "RIDER") return "com.ziba.rider";
  if (APP_MODE === "DRIVER") return "com.ziba.driver";
  return "com.ziba.app";
}
