import { useEffect } from "react";
import { useLocation } from "wouter";
import { APP_MODE, isRoleAllowedInAppMode, getAppName } from "@/lib/app-mode";
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

  const { data: userRole } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
    retry: false,
  });

  useEffect(() => {
    if (APP_MODE === "RIDER" && user && userRole?.role && !isRoleAllowedInAppMode(userRole.role)) {
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

export function useRiderAppModeCheck() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: userRole } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
    retry: false,
  });

  const checkAndEnforce = () => {
    if (APP_MODE === "RIDER" && userRole?.role && !isRoleAllowedInAppMode(userRole.role)) {
      toast({
        title: "Access Restricted",
        description: `This app is for riders only.`,
        variant: "destructive",
      });
      logout?.();
      setLocation("/welcome");
      return false;
    }
    return true;
  };

  return { checkAndEnforce, isAllowed: !userRole?.role || isRoleAllowedInAppMode(userRole.role) };
}
