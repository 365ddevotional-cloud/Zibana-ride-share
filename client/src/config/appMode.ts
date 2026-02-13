export const APP_MODE = "RIDER" as const;
export type AppMode = typeof APP_MODE;

export function isRoleAllowedInAppMode(role: string | null | undefined): boolean {
  if (APP_MODE === "RIDER") return role === "rider";
  return false;
}

export function getAppName(): string {
  return "ZIBANA Ride";
}

export function getAppPackageName(): string {
  return "com.zibana.rider";
}
