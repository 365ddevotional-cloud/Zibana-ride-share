import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { Car, Users, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { APP_MODE, getAppName } from "@/config/appMode";
import { FullPageLoading } from "@/components/loading-spinner";

type Role = "rider" | "driver" | "admin" | "super_admin" | "director" | "trip_coordinator" | "support_agent" | "finance_admin";

interface UserRoleData {
  role: string;
  roles: string[];
  roleCount: number;
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Users; description: string; redirect: string; color: string }> = {
  rider: {
    label: "Rider",
    icon: Users,
    description: "Request rides and travel to your destination",
    redirect: "/rider/home",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  driver: {
    label: "Driver",
    icon: Car,
    description: "Accept ride requests and earn money",
    redirect: "/driver/dashboard",
    color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    description: "Manage the platform and users",
    redirect: "/admin",
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  },
  super_admin: {
    label: "Super Admin",
    icon: Shield,
    description: "Full platform control",
    redirect: "/admin",
    color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  },
  director: {
    label: "Director",
    icon: Shield,
    description: "Manage drivers and operations",
    redirect: "/director/dashboard",
    color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  },
  trip_coordinator: {
    label: "Trip Coordinator",
    icon: Shield,
    description: "Coordinate and manage trips",
    redirect: "/admin",
    color: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
  },
  support_agent: {
    label: "Support Agent",
    icon: Shield,
    description: "Handle support requests",
    redirect: "/admin",
    color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
  },
  finance_admin: {
    label: "Finance Admin",
    icon: Shield,
    description: "Manage financial operations",
    redirect: "/admin",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  },
};

export default function RoleSelectionPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [switching, setSwitching] = useState<string | null>(null);

  const { data: userRoleData, isLoading: rolesLoading } = useQuery<UserRoleData | null>({
    queryKey: ["/api/user/role"],
    retry: false,
  });

  const selectActiveRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      setSwitching(role);
      const response = await apiRequest("POST", "/api/user/active-role", { role });
      return response.json();
    },
    onSuccess: (_data, role) => {
      sessionStorage.setItem("ziba-active-role", role);
      queryClient.invalidateQueries({ queryKey: ["/api/user/role"] });
      const config = ROLE_CONFIG[role];
      if (config) {
        setLocation(config.redirect);
      } else {
        setLocation("/");
      }
    },
    onError: (error: Error) => {
      setSwitching(null);
      toast({
        title: "Error",
        description: error.message || "Failed to switch role",
        variant: "destructive",
      });
    },
  });

  const registerRiderMutation = useMutation({
    mutationFn: async () => {
      setSwitching("rider");
      const response = await apiRequest("POST", "/api/user/role", { role: "rider" });
      return response.json();
    },
    onSuccess: () => {
      sessionStorage.setItem("ziba-active-role", "rider");
      queryClient.invalidateQueries({ queryKey: ["/api/user/role"] });
      setLocation("/rider/home");
    },
    onError: (error: Error) => {
      setSwitching(null);
      toast({
        title: "Error",
        description: error.message || "Failed to set up your account",
        variant: "destructive",
      });
    },
  });

  const autoRegistered = useRef(false);

  useEffect(() => {
    if (rolesLoading || autoRegistered.current) return;

    if (APP_MODE === "RIDER") {
      if (
        !userRoleData?.roles?.length &&
        !registerRiderMutation.isPending &&
        !registerRiderMutation.isSuccess
      ) {
        autoRegistered.current = true;
        registerRiderMutation.mutate();
      } else if (
        userRoleData?.roles?.length === 1 &&
        userRoleData.roles.includes("rider")
      ) {
        autoRegistered.current = true;
        sessionStorage.setItem("ziba-active-role", "rider");
        setLocation("/rider/home");
      }
    }
  }, [rolesLoading, userRoleData, registerRiderMutation.isPending, registerRiderMutation.isSuccess]);

  if (rolesLoading) {
    return <FullPageLoading text="Loading your roles..." />;
  }

  if (APP_MODE === "RIDER" && (registerRiderMutation.isPending || (!userRoleData?.roles?.length && !registerRiderMutation.isError))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground" data-testid="text-setting-up">Setting up your account...</p>
        </div>
      </div>
    );
  }

  const existingRoles = userRoleData?.roles || [];
  const hasRoles = existingRoles.length > 0;
  const canAddRider = !existingRoles.includes("rider");
  const canAddDriver = !existingRoles.includes("driver");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-center px-4">
          <Logo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold mb-2" data-testid="text-welcome-title">
              Welcome to {getAppName()}
            </h1>
            <p className="text-muted-foreground" data-testid="text-welcome-subtitle">
              {hasRoles
                ? "Choose how you'd like to continue"
                : "Get started by choosing your account type"}
            </p>
          </div>

          <div className="space-y-4">
            {existingRoles.map((role) => {
              const config = ROLE_CONFIG[role];
              if (!config) return null;
              const Icon = config.icon;
              const isLoading = switching === role;

              return (
                <Card key={role} data-testid={`card-role-${role}`}>
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{config.label}</CardTitle>
                        <Badge variant="secondary" className="text-xs">{role}</Badge>
                      </div>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      className="w-full"
                      disabled={selectActiveRoleMutation.isPending}
                      onClick={() => selectActiveRoleMutation.mutate(role)}
                      data-testid={`button-continue-${role}`}
                    >
                      {isLoading ? "Switching..." : `Continue as ${config.label}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            {(canAddRider || canAddDriver) && hasRoles && (
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or add another role</span>
                </div>
              </div>
            )}

            {canAddRider && (
              <Card data-testid="card-register-rider">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle>Rider Account</CardTitle>
                  <CardDescription>
                    Request rides and travel to your destination
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                    <li>Request rides instantly</li>
                    <li>Track your journey in real-time</li>
                    <li>Travel safely with verified drivers</li>
                  </ul>
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={registerRiderMutation.isPending}
                    onClick={() => registerRiderMutation.mutate()}
                    data-testid="button-register-rider"
                  >
                    {switching === "rider" ? "Setting up..." : "Get Started as Rider"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {canAddDriver && (
              <Card data-testid="card-register-driver">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Car className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle>Driver Account</CardTitle>
                  <CardDescription>
                    Accept ride requests and earn money
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                    <li>Set your own schedule</li>
                    <li>Earn competitive fares</li>
                    <li>Join a trusted driver network</li>
                  </ul>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    onClick={() => setLocation("/driver/register")}
                    data-testid="button-register-driver"
                  >
                    Register as Driver
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
