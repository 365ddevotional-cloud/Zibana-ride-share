export type ThemePreference = "light" | "dark" | "system";
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}
// Storage can be unavailable in private browsing or restricted webviews.
export function readPreference(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function savePreference(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* Keep the in-memory choice. */ }
}
export function readTheme(key: string, fallback: ThemePreference): ThemePreference {
  const value = readPreference(key);
  return isThemePreference(value) ? value : fallback;
}
