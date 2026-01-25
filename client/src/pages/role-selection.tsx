import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { Car, Users, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Role = "driver" | "rider" | "admin";

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: adminExists } = useQuery<{ exists: boolean }>({
    queryKey: ["/api/admin/exists"],
  });

  const selectRoleMutation = useMutation({
    mutationFn: async (role: Role) => {
      if (role === "admin") {
        const response = await apiRequest("POST", "/api/admin/seed", {});
        return response.json();
      }
      const response = await apiRequest("POST", "/api/user/role", { role });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/role"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exists"] });
      if (data.role === "driver") {
        setLocation("/driver");
      } else if (data.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/rider");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to select role",
        variant: "destructive",
      });
    },
  });

  const handleContinue = () => {
    if (selectedRole) {
      selectRoleMutation.mutate(selectedRole);
    }
  };

  const showAdminOption = adminExists?.exists === false;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-center px-4">
          <Logo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold mb-2">Welcome to ZIBA</h1>
            <p className="text-muted-foreground">
              How would you like to use ZIBA?
            </p>
          </div>

          <div className={`grid gap-4 mb-8 ${showAdminOption ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <Card 
              className={`cursor-pointer transition-all hover-elevate ${
                selectedRole === "rider" 
                  ? "ring-2 ring-primary" 
                  : ""
              }`}
              onClick={() => setSelectedRole("rider")}
              data-testid="card-role-rider"
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>I'm a Rider</CardTitle>
                <CardDescription>
                  Request rides and travel to your destination
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>Request rides instantly</li>
                  <li>Track your journey</li>
                  <li>Travel safely</li>
                </ul>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover-elevate ${
                selectedRole === "driver" 
                  ? "ring-2 ring-primary" 
                  : ""
              }`}
              onClick={() => setSelectedRole("driver")}
              data-testid="card-role-driver"
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Car className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>I'm a Driver</CardTitle>
                <CardDescription>
                  Accept ride requests and earn money
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>Set your own schedule</li>
                  <li>Accept rides you want</li>
                  <li>Manage your profile</li>
                </ul>
              </CardContent>
            </Card>

            {showAdminOption && (
              <Card 
                className={`cursor-pointer transition-all hover-elevate ${
                  selectedRole === "admin" 
                    ? "ring-2 ring-primary" 
                    : ""
                }`}
                onClick={() => setSelectedRole("admin")}
                data-testid="card-role-admin"
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Shield className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle>I'm an Admin</CardTitle>
                  <CardDescription>
                    Manage drivers and oversee the platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    <li>Approve new drivers</li>
                    <li>View all trips</li>
                    <li>Manage the platform</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="text-center">
            <Button
              size="lg"
              disabled={!selectedRole || selectRoleMutation.isPending}
              onClick={handleContinue}
              className="min-w-[200px]"
              data-testid="button-continue"
            >
              {selectRoleMutation.isPending ? "Setting up..." : "Continue"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
