import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

interface SupportContext {
  appType: "RIDER" | "DRIVER" | "ADMIN" | "DIRECTOR" | "SUPPORT";
  userId: string;
  role: string;
  country: string;
  appVersion: string;
  deviceType: "mobile" | "desktop";
  os: "Android" | "iOS" | "Web";
  language: string;
  networkStatus: "online" | "offline";
  timestamp: string;
  currentScreen: string;
}

function detectDeviceType(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth <= 768 ? "mobile" : "desktop";
}

function detectOS(): "Android" | "iOS" | "Web" {
  if (typeof navigator === "undefined") return "Web";
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/android/i.test(userAgent)) {
    return "Android";
  }
  
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "iOS";
  }
  
  return "Web";
}

function getAppType(pathname: string): "RIDER" | "DRIVER" | "ADMIN" | "DIRECTOR" | "SUPPORT" {
  if (pathname.startsWith("/admin")) return "ADMIN";
  if (pathname.startsWith("/director")) return "DIRECTOR";
  if (pathname.startsWith("/driver")) return "DRIVER";
  if (pathname.startsWith("/support")) return "SUPPORT";
  if (pathname.startsWith("/rider")) return "RIDER";
  return "RIDER";
}

export function useSupportContext() {
  const { user } = useAuth();
  const [pathname] = useLocation();
  
  const { data: roleData } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
    retry: false,
  });

  const getSupportContext = useCallback((): SupportContext => {
    return {
      appType: getAppType(pathname),
      userId: user?.id || "unknown",
      role: roleData?.role || "unknown",
      country: "NG",
      appVersion: "1.0.0",
      deviceType: detectDeviceType(),
      os: detectOS(),
      language: typeof navigator !== "undefined" ? navigator.language : "en",
      networkStatus: typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
      timestamp: new Date().toISOString(),
      currentScreen: pathname,
    };
  }, [pathname, user?.id, roleData?.role]);

  return { getSupportContext };
}
