import { useEffect } from "react";
import { useLocation } from "wouter";
import { APP_MODE } from "@/config/appMode";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useSimulation } from "@/context/SimulationContext";

interface RiderAppGuardProps {
  children: React.ReactNode;
}

export function RiderAppGuard({ children }: RiderAppGuardProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { isSimulating } = useSimulation();

  const isRoleSelectRoute = location === "/role-select";
  const isDriverRoute = location.startsWith("/driver");
  const isAdminRoute = location.startsWith("/admin") || location.startsWith("/director");
  const isPublicRoute = location === "/welcome" || location === "/" || location === "/about" || location === "/how-it-works" || location === "/safety" || location.startsWith("/legal") || location.startsWith("/terms") || location.startsWith("/privacy") || location.startsWith("/features");
  const shouldSkipGuard = isAdminRoute || isDriverRoute || isRoleSelectRoute || isPublicRoute;

  const { data: userRole } = useQuery<{ role: string; simulating?: boolean } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user && !shouldSkipGuard,
    retry: false,
  });

  useEffect(() => {
    if (shouldSkipGuard) return;
    if (isSimulating) return;
    if (userRole?.simulating) return;
    
    if (APP_MODE === "RIDER" && user && userRole?.role && userRole.role !== "rider") {
      console.warn(`[RIDER APP GUARD] Non-rider on rider route: role=${userRole.role}, redirecting to /role-select`);
      setLocation("/role-select");
    }
  }, [user, userRole, setLocation, shouldSkipGuard, isSimulating]);

  return <>{children}</>;
}
