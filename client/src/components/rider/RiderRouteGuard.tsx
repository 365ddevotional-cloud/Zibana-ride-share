import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface RiderRouteGuardProps {
  children: React.ReactNode;
}

export function RiderRouteGuard({ children }: RiderRouteGuardProps) {
  const { user, isLoading: authLoading } = useAuth();

  const { data: roleData, isLoading: roleLoading } = useQuery<{ role: string }>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
  });

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  const role = roleData?.role?.toLowerCase();

  if (role === "driver") {
    return <Redirect to="/driver" />;
  }

  if (role === "super_admin" || role === "admin" || role === "finance_admin" || 
      role === "support_agent" || role === "trip_coordinator") {
    return <Redirect to="/admin" />;
  }

  return <>{children}</>;
}
