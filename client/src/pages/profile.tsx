import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { ArrowLeft, Mail, Shield, Calendar, BookOpen, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export default function ProfilePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(getDashboardPath())} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">My Profile</h1>
        </div>
      </header>

      <main className="container py-6 max-w-2xl">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <UserAvatar user={user} size="lg" />
            <div>
              <CardTitle>{user?.firstName} {user?.lastName}</CardTitle>
              <CardDescription className="capitalize">{userRole?.role?.replace("_", " ") || "User"}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{user?.email || "No email provided"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{userRole?.role?.replace("_", " ") || "Not assigned"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4 hover-elevate cursor-pointer" onClick={() => navigate("/rider/help")} data-testid="card-help-link">
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium text-sm">Help / Q&A</p>
              <p className="text-xs text-muted-foreground">Find answers to common questions</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
