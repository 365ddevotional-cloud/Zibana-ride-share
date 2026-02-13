import { useState } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTranslation, LANGUAGES } from "@/i18n";
import {
  ArrowLeft, Bell, Sun, Moon, Monitor, Globe, Eye, Shield,
  Info, ChevronRight, Lock, FileText, LogOut, Trash2, AlertTriangle, Phone,
} from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

export default function DriverSettings() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { t, language } = useTranslation();
  const currentLang = LANGUAGES.find((l) => l.code === language);

  const { data: notifPrefs } = useQuery<{
    rideUpdates: boolean;
    payments: boolean;
    safety: boolean;
    promotions: boolean;
  }>({
    queryKey: ["/api/driver/notification-preferences"],
  });

  const updateNotifMutation = useMutation({
    mutationFn: async (prefs: Record<string, boolean>) => {
      await apiRequest("PUT", "/api/driver/notification-preferences", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/notification-preferences"] });
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

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/account");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete account");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been deleted. Redirecting...",
      });
      setTimeout(() => {
        window.location.href = "/driver";
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot delete account",
        description: error.message,
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
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
    { key: "rideUpdates", label: "Ride Requests", desc: "New ride offers, trip updates, cancellations" },
    { key: "payments", label: "Earnings & Payouts", desc: "Payout confirmations, earnings summaries" },
    { key: "safety", label: "Safety Alerts", desc: "Emergency notifications and safety tips" },
    { key: "promotions", label: "Promotions", desc: "Incentives, bonuses, and campaigns" },
  ];

  return (
    <DriverLayout>
      <div className="p-4 space-y-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/driver/account")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold" data-testid="text-settings-title">Settings</h1>
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
            {t("settings.language")}
          </p>
          <Card>
            <CardContent className="p-0">
              <button
                className="w-full p-4 flex items-center gap-3 hover-elevate cursor-pointer"
                data-testid="button-language"
                onClick={() => setLocation("/driver/settings/language")}
              >
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-sm">{t("settings.language")}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentLang ? `${currentLang.nativeName} (${currentLang.name})` : "English"}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
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
                onClick={() => setLocation("/driver/data-usage")}
                testId="button-data-usage"
              />
              <SettingsNavRow
                icon={<Lock className="h-5 w-5" />}
                label="Privacy Policy"
                sublabel="How we protect your information"
                onClick={() => setLocation("/driver/terms-privacy")}
                testId="button-privacy-policy"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Safety & Emergency
          </p>
          <Card>
            <CardContent className="p-0 divide-y">
              <SettingsNavRow
                icon={<Shield className="h-5 w-5" />}
                label="Safety Hub"
                sublabel="Safety resources and incident reports"
                onClick={() => setLocation("/driver/help")}
                testId="button-safety-hub"
              />
              <SettingsNavRow
                icon={<Phone className="h-5 w-5" />}
                label="Emergency Contacts"
                sublabel="Manage your emergency contacts"
                onClick={() => setLocation("/driver/emergency-contacts")}
                testId="button-emergency-contacts"
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
                  <p className="text-sm font-medium">ZIBANA Ride</p>
                  <p className="text-xs text-muted-foreground">Version 1.0.0</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ZIBANA is a ride-hailing platform designed for emerging markets, connecting riders with safe and reliable drivers. We are committed to enhancing mobility and creating economic opportunities across Africa and beyond.
              </p>
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setLocation("/driver/terms-privacy")}
                data-testid="button-about-terms"
              >
                Terms of Service & Privacy Policy
              </button>
            </CardContent>
          </Card>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => logout?.()}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full"
              data-testid="button-delete-account"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your driver account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Your driver account, trip history, earnings records, and all associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteAccountMutation.mutate()}
                disabled={deleteAccountMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ZibraFloatingButton />
      </div>
    </DriverLayout>
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
