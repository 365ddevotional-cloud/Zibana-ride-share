import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { APP_MODE, getAppName } from "@/config/appMode";

type Role = "rider";

export default function RoleSelectionPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const selectRoleMutation = useMutation({
    mutationFn: async (role: Role) => {
      const response = await apiRequest("POST", "/api/user/role", { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/role"] });
      // Rider app only - always go to rider home
      setLocation("/rider/home");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set up your account",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (APP_MODE === "RIDER") {
      selectRoleMutation.mutate("rider");
    }
  }, []);

  if (APP_MODE === "RIDER" && selectRoleMutation.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="font-serif text-3xl font-bold mb-2">Welcome to {getAppName()}</h1>
            <p className="text-muted-foreground">
              Let's get you set up as a rider
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Rider Account</CardTitle>
              <CardDescription>
                Request rides and travel to your destination
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>Request rides instantly</li>
                <li>Track your journey in real-time</li>
                <li>Travel safely with verified drivers</li>
              </ul>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              size="lg"
              disabled={selectRoleMutation.isPending}
              onClick={() => selectRoleMutation.mutate("rider")}
              className="min-w-[200px]"
              data-testid="button-continue"
            >
              {selectRoleMutation.isPending ? "Setting up..." : "Continue as Rider"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
