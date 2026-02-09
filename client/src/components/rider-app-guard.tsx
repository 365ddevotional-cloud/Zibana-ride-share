import { useEffect } from "react";
import { useLocation } from "wouter";
import { APP_MODE, getAppName } from "@/config/appMode";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSimulation } from "@/context/SimulationContext";

interface RiderAppGuardProps {
  children: React.ReactNode;
}

export function RiderAppGuard({ children }: RiderAppGuardProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { isSimulating } = useSimulation();

  const isAdminRoute = location.startsWith("/admin");
  const isRoleSelectRoute = location === "/role-select";
  const isPublicRoute = location === "/welcome" || location === "/" || location === "/about" || location === "/how-it-works" || location === "/safety" || location.startsWith("/legal") || location.startsWith("/terms") || location.startsWith("/privacy") || location.startsWith("/features");
  const shouldSkipGuard = isAdminRoute || isRoleSelectRoute || isPublicRoute;

  const { data: userRole, error: roleError, isError } = useQuery<{ role: string; simulating?: boolean } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user && !shouldSkipGuard,
    retry: false,
  });

  useEffect(() => {
    if (shouldSkipGuard) return;
    if (isSimulating) return;
    if (userRole?.simulating) return;
    
    if (isError && roleError) {
      const errorMessage = (roleError as any)?.message || "";
      if (errorMessage.includes("ROLE_NOT_ALLOWED") || errorMessage.includes("for your role")) {
        toast({
          title: "Access Restricted",
          description: `${getAppName()} is for riders only. Please use the appropriate app for your account type.`,
          variant: "destructive",
        });
        
        logout?.();
        setLocation("/welcome");
      }
    }
  }, [isError, roleError, logout, setLocation, toast, shouldSkipGuard, isSimulating, userRole]);

  useEffect(() => {
    if (shouldSkipGuard) return;
    if (isSimulating) return;
    if (userRole?.simulating) return;
    
    if (APP_MODE === "RIDER" && user && userRole?.role && userRole.role !== "rider") {
      console.warn(`[RIDER APP GUARD] Non-rider blocked: role=${userRole.role}`);
      toast({
        title: "Access Restricted",
        description: `${getAppName()} is for riders only. Please use the appropriate app for your account type.`,
        variant: "destructive",
      });
      
      logout?.();
      setLocation("/welcome");
    }
  }, [user, userRole, logout, setLocation, toast, shouldSkipGuard, isSimulating]);

  return <>{children}</>;
}
