import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  ArrowLeft, Bell, Sun, Moon, Monitor, Globe, Eye, Shield,
  Info, ChevronRight, Lock, FileText,
} from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

export default function RiderSettings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();

  const { data: notifPrefs } = useQuery<{
    rideUpdates: boolean;
    payments: boolean;
    safety: boolean;
    promotions: boolean;
  }>({
    queryKey: ["/api/rider/notification-preferences"],
  });

  const updateNotifMutation = useMutation({
    mutationFn: async (prefs: Record<string, boolean>) => {
      await apiRequest("PUT", "/api/rider/notification-preferences", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/notification-preferences"] });
      toast({ title: "Preferences saved" });
    },
    onError: () => {
      toast({ title: "Could not save preferences", variant: "destructive" });
    },
  });

  const updateThemeMutation = useMutation({
    mutationFn: async (newTheme: string) => {
      await apiRequest("POST", "/api/user/theme-preference", { themePreference: newTheme });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/theme-preference"] });
    },
  });

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    updateThemeMutation.mutate(newTheme);
  };

  const handleNotifToggle = (key: string, value: boolean) => {
    updateNotifMutation.mutate({ [key]: value });
  };

  const notifItems = [
    { key: "rideUpdates", label: "Ride Updates", desc: "Status changes, driver arrivals, trip completions" },
    { key: "payments", label: "Payments", desc: "Wallet activity, receipts, refunds" },
    { key: "safety", label: "Safety Alerts", desc: "Emergency notifications and safety tips" },
    { key: "promotions", label: "Promotions", desc: "Special offers, discounts, and campaigns" },
  ];

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-5 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/account")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Notifications
            </p>
            <Card>
              <CardContent className="p-4 space-y-4">
                {notifItems.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={(notifPrefs as any)?.[item.key] ?? true}
                      onCheckedChange={(val) => handleNotifToggle(item.key, val)}
                      data-testid={`switch-notif-${item.key}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Appearance
            </p>
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">Theme</p>
                <div className="flex gap-2">
                  {([
                    { value: "light", icon: Sun, label: "Light" },
                    { value: "dark", icon: Moon, label: "Dark" },
                    { value: "system", icon: Monitor, label: "Auto" },
                  ] as const).map(({ value, icon: Icon, label }) => (
                    <Button
                      key={value}
                      variant={theme === value ? "default" : "outline"}
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleThemeChange(value)}
                      data-testid={`button-theme-${value}`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Language
            </p>
            <Card>
              <CardContent className="p-0">
                <button
                  className="w-full p-4 flex items-center gap-3 hover-elevate cursor-pointer"
                  data-testid="button-language"
                  onClick={() => toast({ title: "Coming soon", description: "Language selection will be available in a future update." })}
                >
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm">Language</p>
                    <p className="text-xs text-muted-foreground">English</p>
                  </div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Privacy & Data
            </p>
            <Card>
              <CardContent className="p-0 divide-y">
                <SettingsNavRow
                  icon={<Eye className="h-5 w-5" />}
                  label="Data Usage"
                  sublabel="Control how your data is used"
                  onClick={() => setLocation("/rider/account-data-usage")}
                  testId="button-data-usage"
                />
                <SettingsNavRow
                  icon={<Lock className="h-5 w-5" />}
                  label="Privacy Policy"
                  sublabel="How we protect your information"
                  onClick={() => setLocation("/rider/terms-privacy")}
                  testId="button-privacy-policy"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Safety
            </p>
            <Card>
              <CardContent className="p-0 divide-y">
                <SettingsNavRow
                  icon={<Shield className="h-5 w-5" />}
                  label="Safety Hub"
                  sublabel="Emergency contacts, SOS, incident reports"
                  onClick={() => setLocation("/rider/safety")}
                  testId="button-safety-hub"
                />
                <SettingsNavRow
                  icon={<Lock className="h-5 w-5" />}
                  label="Ride PIN"
                  sublabel="Verify your driver before riding"
                  onClick={() => setLocation("/rider/account-ride-pin")}
                  testId="button-ride-pin"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              About
            </p>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">ZIBA Ride</p>
                    <p className="text-xs text-muted-foreground">Version 1.0.0</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ZIBA is a ride-hailing platform designed for emerging markets, connecting riders with safe and reliable drivers. We are committed to enhancing mobility and creating economic opportunities across Africa and beyond.
                </p>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => setLocation("/rider/terms-privacy")}
                  data-testid="button-about-terms"
                >
                  Terms of Service & Privacy Policy
                </button>
              </CardContent>
            </Card>
          </div>
          <ZibraFloatingButton />
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}

function SettingsNavRow({
  icon, label, sublabel, onClick, testId,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      className="w-full p-4 flex items-center gap-3 hover-elevate cursor-pointer"
      onClick={onClick}
      data-testid={testId}
    >
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="font-medium text-sm">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground truncate">{sublabel}</p>}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}
