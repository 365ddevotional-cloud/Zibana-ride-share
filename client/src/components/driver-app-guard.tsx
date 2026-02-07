import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSimulation } from "@/context/SimulationContext";

interface DriverAppGuardProps {
  children: React.ReactNode;
}

export function DriverAppGuard({ children }: DriverAppGuardProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { isSimulating } = useSimulation();

  const isDriverRoute = location.startsWith("/driver");

  const { data: userRole, error: roleError, isError } = useQuery<{ role: string; simulating?: boolean } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user && isDriverRoute,
    retry: false,
  });

  useEffect(() => {
    if (!isDriverRoute) return;
    if (isSimulating) return;
    if (userRole?.simulating) return;
    
    if (isError && roleError) {
      const errorMessage = (roleError as any)?.message || "";
      if (errorMessage.includes("ROLE_NOT_ALLOWED") || errorMessage.includes("for your role")) {
        toast({
          title: "Access Restricted",
          description: "ZIBA Driver is for drivers only. Please use the appropriate app for your account type.",
          variant: "destructive",
        });
        
        logout?.();
        setLocation("/driver/welcome");
      }
    }
  }, [isError, roleError, logout, setLocation, toast, isDriverRoute, isSimulating, userRole]);

  useEffect(() => {
    if (!isDriverRoute) return;
    if (isSimulating) return;
    if (userRole?.simulating) return;
    
    if (user && userRole?.role && userRole.role !== "driver") {
      console.warn(`[DRIVER APP GUARD] Non-driver blocked: role=${userRole.role}`);
      toast({
        title: "Access Restricted",
        description: "ZIBA Driver is for drivers only. Please use the appropriate app for your account type.",
        variant: "destructive",
      });
      
      logout?.();
      setLocation("/driver/welcome");
    }
  }, [user, userRole, logout, setLocation, toast, isDriverRoute, isSimulating]);

  return <>{children}</>;
}
