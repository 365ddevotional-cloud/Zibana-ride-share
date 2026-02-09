import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useSimulation } from "@/context/SimulationContext";

interface DriverAppGuardProps {
  children: React.ReactNode;
}

export function DriverAppGuard({ children }: DriverAppGuardProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { isSimulating } = useSimulation();

  const isDriverRoute = location.startsWith("/driver");
  const isRegisterPage = location === "/driver/register";
  const isWelcomePage = location === "/driver/welcome" || location === "/driver";

  const { data: userRole } = useQuery<{ role: string; simulating?: boolean } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user && isDriverRoute && !isRegisterPage && !isWelcomePage,
    retry: false,
  });

  useEffect(() => {
    if (!isDriverRoute) return;
    if (isRegisterPage || isWelcomePage) return;
    if (isSimulating) return;
    if (userRole?.simulating) return;
    
    if (user && userRole?.role && userRole.role !== "driver") {
      console.warn(`[DRIVER APP GUARD] Non-driver on driver route: role=${userRole.role}, redirecting to /role-select`);
      setLocation("/role-select");
    }
  }, [user, userRole, setLocation, isDriverRoute, isSimulating, isRegisterPage, isWelcomePage]);

  return <>{children}</>;
}
