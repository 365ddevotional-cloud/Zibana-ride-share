import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  User, Mail, Phone, Star, ChevronRight, LogOut, Trash2,
  Bell, Shield, Eye, Accessibility, Sun, Moon, Monitor,
  MapPin, Lock, AlertTriangle, Users, Smartphone, Megaphone,
  Car, Wallet as WalletIcon, FileText,
} from "lucide-react";

interface RiderProfile {
  rating: number | null;
  totalTrips: number;
  savedLocations: { name: string; address: string }[];
}

interface NotificationPreferences {
  permissionGranted: boolean;
  driverAssigned: boolean;
  driverArriving: boolean;
  rideScheduledConfirmation: boolean;
  cancellationPenalties: boolean;
  walletLowBalance: boolean;
  promotions: boolean;
  systemAnnouncements: boolean;
}

export default function RiderAccount() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [, setLocation] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery<RiderProfile>({
    queryKey: ["/api/rider/profile"],
    enabled: !!user,
  });

  const { data: prefs } = useQuery<NotificationPreferences>({
    queryKey: ["/api/rider/notification-preferences"],
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      await apiRequest("PUT", "/api/rider/notification-preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/notification-preferences"] });
    },
  });

  const updateThemeMutation = useMutation({
    mutationFn: async (newTheme: string) => {
      await apiRequest("PATCH", "/api/user/theme-preference", { themePreference: newTheme });
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
      toast({ title: "Account deleted", description: "Your account has been deleted. Redirecting..." });
      setTimeout(() => { window.location.href = "/"; }, 1500);
    },
    onError: (error: Error) => {
      toast({ title: "Cannot delete account", description: error.message, variant: "destructive" });
      setDeleteDialogOpen(false);
    },
  });

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    updateThemeMutation.mutate(newTheme);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "Rider";

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (isLoading) {
    return (
      <RiderRouteGuard>
        <RiderLayout>
          <div className="p-4 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </RiderLayout>
      </RiderRouteGuard>
    );
  }

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold truncate" data-testid="text-account-name">
                    {displayName}
                  </h1>
                  <p className="text-sm text-muted-foreground truncate" data-testid="text-account-email">
                    {user?.email}
                  </p>
                  {profile?.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium" data-testid="text-account-rating">
                        {profile.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({profile.totalTrips} trips)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Account
            </p>
            <Card>
              <CardContent className="p-0 divide-y">
                <SettingsRow
                  icon={<User className="h-5 w-5" />}
                  label="Profile"
                  sublabel={displayName}
                  onClick={() => setLocation("/rider/profile")}
                  testId="button-profile"
                />
                <SettingsRow
                  icon={<Mail className="h-5 w-5" />}
                  label="Email"
                  sublabel={user?.email || "Not set"}
                  testId="text-email"
                />
                <SettingsRow
                  icon={<Phone className="h-5 w-5" />}
                  label="Phone"
                  sublabel="Not set"
                  testId="text-phone"
                />
                <SettingsRow
                  icon={<MapPin className="h-5 w-5" />}
                  label="Saved Places"
                  sublabel="Home, Work"
                  onClick={() => setLocation("/rider/home")}
                  testId="button-saved-places"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Communication
            </p>
            <Card>
              <CardContent className="p-0">
                <button
                  className="w-full p-4 flex items-center justify-between gap-3 hover-elevate"
                  onClick={() => toggleSection("notifications")}
                  data-testid="button-notifications-section"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Bell className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Notifications</p>
                      <p className="text-xs text-muted-foreground">Ride alerts, payments, safety</p>
                    </div>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSection === "notifications" ? "rotate-90" : ""}`} />
                </button>
                {expandedSection === "notifications" && prefs && (
                  <div className="px-4 pb-4 space-y-3 border-t pt-3">
                    <NotifToggle
                      label="Push notifications"
                      description="All notifications"
                      checked={prefs.permissionGranted}
                      onChange={(v) => updatePrefsMutation.mutate({ permissionGranted: v })}
                      testId="switch-push-notifications"
                    />
                    <NotifToggle
                      label="Driver assigned"
                      checked={prefs.driverAssigned}
                      onChange={(v) => updatePrefsMutation.mutate({ driverAssigned: v })}
                      testId="switch-driver-assigned"
                    />
                    <NotifToggle
                      label="Driver arriving"
                      checked={prefs.driverArriving}
                      onChange={(v) => updatePrefsMutation.mutate({ driverArriving: v })}
                      testId="switch-driver-arriving"
                    />
                    <NotifToggle
                      label="Ride confirmations"
                      checked={prefs.rideScheduledConfirmation}
                      onChange={(v) => updatePrefsMutation.mutate({ rideScheduledConfirmation: v })}
                      testId="switch-ride-confirmations"
                    />
                    <NotifToggle
                      label="Cancellation penalties"
                      checked={prefs.cancellationPenalties}
                      onChange={(v) => updatePrefsMutation.mutate({ cancellationPenalties: v })}
                      testId="switch-cancellation-penalties"
                    />
                    <NotifToggle
                      label="Wallet low balance"
                      checked={prefs.walletLowBalance}
                      onChange={(v) => updatePrefsMutation.mutate({ walletLowBalance: v })}
                      testId="switch-wallet-low-balance"
                    />
                    <NotifToggle
                      label="Safety alerts"
                      description="Cannot be disabled"
                      checked={true}
                      onChange={() => {}}
                      disabled
                      testId="switch-safety-alerts"
                    />
                  </div>
                )}
                <div className="border-t" />
                <button
                  className="w-full p-4 flex items-center justify-between gap-3 hover-elevate"
                  onClick={() => toggleSection("marketing")}
                  data-testid="button-marketing-section"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Megaphone className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Marketing</p>
                      <p className="text-xs text-muted-foreground">Promotions and offers</p>
                    </div>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSection === "marketing" ? "rotate-90" : ""}`} />
                </button>
                {expandedSection === "marketing" && prefs && (
                  <div className="px-4 pb-4 space-y-3 border-t pt-3">
                    <NotifToggle
                      label="Promotions"
                      description="Discounts and special offers"
                      checked={prefs.promotions}
                      onChange={(v) => updatePrefsMutation.mutate({ promotions: v })}
                      testId="switch-promotions"
                    />
                    <NotifToggle
                      label="Announcements"
                      description="News and updates from ZIBA"
                      checked={prefs.systemAnnouncements}
                      onChange={(v) => updatePrefsMutation.mutate({ systemAnnouncements: v })}
                      testId="switch-announcements"
                    />
                  </div>
                )}
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
              Privacy & Data
            </p>
            <Card>
              <CardContent className="p-0 divide-y">
                <SettingsRow
                  icon={<Eye className="h-5 w-5" />}
                  label="Data Usage"
                  sublabel="Manage how your data is used"
                  testId="button-data-usage"
                />
                <SettingsRow
                  icon={<FileText className="h-5 w-5" />}
                  label="Ride History"
                  sublabel="View and manage ride data"
                  onClick={() => setLocation("/rider/activity")}
                  testId="button-ride-history"
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
                <SettingsRow
                  icon={<Users className="h-5 w-5" />}
                  label="Trusted Contacts"
                  sublabel="Emergency and safety contacts"
                  onClick={() => setLocation("/rider/safety")}
                  testId="button-trusted-contacts"
                />
                <SettingsRow
                  icon={<Lock className="h-5 w-5" />}
                  label="Ride PIN"
                  sublabel="Verify your driver"
                  testId="button-ride-pin"
                />
                <SettingsRow
                  icon={<AlertTriangle className="h-5 w-5" />}
                  label="Emergency"
                  sublabel="SOS and incident reporting"
                  onClick={() => setLocation("/rider/support")}
                  testId="button-emergency"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
              Support
            </p>
            <Card>
              <CardContent className="p-0 divide-y">
                <SettingsRow
                  icon={<Smartphone className="h-5 w-5" />}
                  label="Help Center"
                  sublabel="FAQs and guides"
                  onClick={() => setLocation("/rider/help")}
                  testId="button-help-center"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0 divide-y">
              <button
                className="w-full p-4 flex items-center gap-3 hover-elevate text-destructive"
                onClick={() => logout?.()}
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium text-sm">Log Out</span>
              </button>
            </CardContent>
          </Card>

          <Card className="border-destructive/20">
            <CardContent className="p-0">
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <button
                    className="w-full p-4 flex items-center gap-3 hover-elevate text-destructive"
                    data-testid="button-delete-account"
                  >
                    <Trash2 className="h-5 w-5" />
                    <span className="font-medium text-sm">Delete Account</span>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Your account, trip history, and all associated data will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground"
                      onClick={() => deleteAccountMutation.mutate()}
                      disabled={deleteAccountMutation.isPending}
                      data-testid="button-confirm-delete"
                    >
                      {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}

function SettingsRow({
  icon, label, sublabel, onClick, testId, badge,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  testId: string;
  badge?: string;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      className={`w-full p-4 flex items-center gap-3 ${onClick ? "hover-elevate cursor-pointer" : ""}`}
      onClick={onClick}
      data-testid={testId}
    >
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="font-medium text-sm">{label}</p>
        {sublabel && (
          <p className="text-xs text-muted-foreground truncate">{sublabel}</p>
        )}
      </div>
      {badge && <Badge variant="secondary">{badge}</Badge>}
      {onClick && <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
    </Wrapper>
  );
}

function NotifToggle({
  label, description, checked, onChange, disabled, testId,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Label htmlFor={testId} className="text-sm cursor-pointer font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        id={testId}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        data-testid={testId}
      />
    </div>
  );
}
