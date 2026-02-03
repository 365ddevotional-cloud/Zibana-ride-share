import { useEffect } from "react";
import { useLocation } from "wouter";
import { APP_MODE, getAppName } from "@/config/appMode";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface RiderAppGuardProps {
  children: React.ReactNode;
}

export function RiderAppGuard({ children }: RiderAppGuardProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: userRole, error: roleError, isError } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
    retry: false,
  });

  useEffect(() => {
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
  }, [isError, roleError, logout, setLocation, toast]);

  useEffect(() => {
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
  }, [user, userRole, logout, setLocation, toast]);

  return <>{children}</>;
}
