import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bell, Shield, Globe, Palette, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation, LANGUAGES } from "@/i18n";

export default function SettingsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { t, language } = useTranslation();
  const currentLang = LANGUAGES.find((l) => l.code === language);

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
          <h1 className="font-semibold">Settings</h1>
        </div>
      </header>

      <main className="container py-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <Switch id="push-notifications" defaultChecked data-testid="switch-push-notifications" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">Email Updates</Label>
              <Switch id="email-notifications" defaultChecked data-testid="switch-email-notifications" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-notifications">SMS Alerts</Label>
              <Switch id="sms-notifications" data-testid="switch-sms-notifications" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>Control your data and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="share-location">Share Live Location</Label>
              <Switch id="share-location" defaultChecked data-testid="switch-share-location" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="two-factor">Two-Factor Authentication</Label>
              <Switch id="two-factor" data-testid="switch-two-factor" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover-elevate" onClick={() => navigate("/settings/appearance")} data-testid="card-appearance-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of the app</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover-elevate" onClick={() => {
          const role = userRole?.role;
          if (role === "admin" || role === "super_admin" || role === "director" || role === "finance") {
            navigate("/admin/settings/language");
          } else if (role === "driver") {
            navigate("/driver/settings/language");
          } else {
            navigate("/rider/settings/language");
          }
        }} data-testid="card-language-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Language & Region
            </CardTitle>
            <CardDescription>Set your preferred language and region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{currentLang ? `${currentLang.nativeName} (${currentLang.name})` : "English"}</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
