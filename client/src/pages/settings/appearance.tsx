import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sun, Moon, Monitor, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export default function AppearancePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { theme, setTheme } = useTheme();

  const { data: userRole } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
  });

  const getDashboardPath = () => {
    switch (userRole?.role) {
      case "driver": return "/driver";
      case "admin": 
      case "super_admin":
      case "director":
      case "finance": return "/admin";
      case "support_agent": return "/support";
      case "trip_coordinator": return "/coordinator";
      default: return "/rider";
    }
  };

  const themes = [
    { id: "light", name: "Light", icon: Sun, description: "Light mode for daytime use" },
    { id: "dark", name: "Dark", icon: Moon, description: "Dark mode for nighttime use" },
    { id: "system", name: "System", icon: Monitor, description: "Follow your device settings" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Appearance</h1>
        </div>
      </header>

      <main className="container py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Choose how ZIBANA looks on your device</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {themes.map(({ id, name, icon: Icon, description }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-lg border transition-colors",
                  theme === id 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover-elevate"
                )}
                data-testid={`button-theme-${id}`}
              >
                <div className={cn(
                  "p-2 rounded-full",
                  theme === id ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {theme === id && <Check className="h-5 w-5 text-primary" />}
              </button>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
