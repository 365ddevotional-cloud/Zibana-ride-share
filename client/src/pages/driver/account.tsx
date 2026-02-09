import { useState, useRef } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTranslation } from "@/i18n";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";
import { Switch } from "@/components/ui/switch";
import {
  User, Star, ChevronRight, LogOut, Trash2,
  Camera, Car, Settings, HelpCircle,
  FileText, Mail, Clock, TrendingUp, Layers,
} from "lucide-react";
import { RideClassIcon } from "@/components/ride-class-icon";
import type { RideClassDefinition } from "@shared/ride-classes";

interface DriverProfile {
  fullName: string | null;
  phone: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  licensePlate: string | null;
  status: string | null;
  averageRating: number | null;
  totalRatings: number | null;
  profilePhoto: string | null;
  verificationStatus: string | null;
}

export default function DriverAccount() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery<DriverProfile>({
    queryKey: ["/api/driver/profile"],
    enabled: !!user,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/driver/inbox/unread-count"],
    enabled: !!user,
  });

  const { data: rideClassPrefs, isLoading: prefsLoading } = useQuery<{
    acceptedClasses: string[];
    eligibleClasses: RideClassDefinition[];
  }>({
    queryKey: ["/api/driver/ride-class-preferences"],
    enabled: !!user,
  });

  const toggleClassMutation = useMutation({
    mutationFn: async (newAccepted: string[]) => {
      await apiRequest("POST", "/api/driver/ride-class-preferences", { acceptedClasses: newAccepted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/ride-class-preferences"] });
    },
    onError: () => {
      toast({ title: "Failed to update preferences", variant: "destructive" });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (photoData: string) => {
      await apiRequest("POST", "/api/profile/photo", { photoData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/profile"] });
      toast({ title: "Photo updated" });
      setAvatarDialogOpen(false);
      setAvatarPreview(null);
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message || "Please try again with a smaller image.", variant: "destructive" });
    },
  });

  const removePhotoMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/profile/photo", { photoData: "" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/profile"] });
      toast({ title: "Photo removed" });
      setAvatarDialogOpen(false);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please select a JPG, PNG, WebP, or HEIC image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
      setAvatarDialogOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const displayName = profile?.fullName
    || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null)
    || user?.email
    || "Driver";

  const avatarSrc = profile?.profilePhoto || user?.profileImageUrl || undefined;
  const unreadCount = unreadData?.count ?? 0;

  const statusLabel = profile?.status
    ? profile.status.charAt(0).toUpperCase() + profile.status.slice(1)
    : null;

  if (isLoading) {
    return (
      <DriverLayout>
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      <div className="p-4 space-y-5 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  className="relative group cursor-pointer"
                  onClick={() => {
                    if (avatarSrc) {
                      setAvatarDialogOpen(true);
                      setAvatarPreview(null);
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  data-testid="button-avatar"
                >
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback className="text-lg bg-primary/10">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-avatar-file"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold truncate" data-testid="text-account-name">
                  {displayName}
                </h1>
                <p className="text-sm text-muted-foreground truncate" data-testid="text-account-email">
                  {user?.email}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {profile?.averageRating != null && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium" data-testid="text-account-rating">
                        {Number(profile.averageRating).toFixed(1)}
                      </span>
                      {profile.totalRatings != null && (
                        <span className="text-xs text-muted-foreground">
                          ({profile.totalRatings} ratings)
                        </span>
                      )}
                    </div>
                  )}
                  {statusLabel && (
                    <Badge variant="secondary" data-testid="text-account-status">
                      {statusLabel}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Profile Picture</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={avatarPreview || avatarSrc} />
                <AvatarFallback className="text-3xl bg-primary/10">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              {avatarPreview ? (
                <>
                  <Button
                    onClick={() => uploadPhotoMutation.mutate(avatarPreview)}
                    disabled={uploadPhotoMutation.isPending}
                    data-testid="button-save-avatar"
                  >
                    {uploadPhotoMutation.isPending ? "Saving..." : "Save Photo"}
                  </Button>
                  <Button variant="outline" onClick={() => { setAvatarPreview(null); setAvatarDialogOpen(false); }} data-testid="button-cancel-avatar">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => fileInputRef.current?.click()} data-testid="button-change-avatar">
                    {avatarSrc ? "Change Photo" : "Upload Photo"}
                  </Button>
                  {avatarSrc && (
                    <Button
                      variant="outline"
                      className="text-destructive"
                      onClick={() => removePhotoMutation.mutate()}
                      disabled={removePhotoMutation.isPending}
                      data-testid="button-remove-avatar"
                    >
                      {removePhotoMutation.isPending ? "Removing..." : "Remove Photo"}
                    </Button>
                  )}
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
            {t("driver.account")}
          </p>
          <Card>
            <CardContent className="p-0 divide-y">
              <AccountRow
                icon={<User className="h-5 w-5" />}
                label={t("driver.profile")}
                sublabel="Name, email, phone"
                onClick={() => setLocation("/driver/profile")}
                testId="button-profile"
              />
              <AccountRow
                icon={<Car className="h-5 w-5" />}
                label={t("driver.vehicle")}
                sublabel={profile?.vehicleMake && profile?.vehicleModel
                  ? `${profile.vehicleMake} ${profile.vehicleModel}`
                  : "Add vehicle details"}
                onClick={() => setLocation("/driver/vehicle")}
                testId="button-vehicle"
              />
              <AccountRow
                icon={<FileText className="h-5 w-5" />}
                label={t("driver.documents")}
                sublabel="License, insurance, registration"
                onClick={() => setLocation("/driver/documents")}
                testId="button-documents"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Ride Class Preferences
          </p>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Choose Which Classes to Accept</span>
              </div>
              {prefsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : rideClassPrefs && rideClassPrefs.eligibleClasses.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {rideClassPrefs.eligibleClasses.map((rc) => {
                      const isAccepted = rideClassPrefs.acceptedClasses.includes(rc.id);
                      const isGoClass = rc.id === "go";
                      return (
                        <div
                          key={rc.id}
                          className="flex items-center gap-3 p-3 rounded-md border"
                          data-testid={`driver-class-pref-${rc.id}`}
                        >
                          <RideClassIcon rideClass={rc.id} size="sm" color={rc.color} bgLight={rc.bgLight} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{rc.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{rc.description}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {isAccepted ? "Enabled" : "Disabled"}
                            </span>
                            <Switch
                              checked={isAccepted}
                              disabled={isGoClass || toggleClassMutation.isPending}
                              onCheckedChange={(checked) => {
                                const newAccepted = checked
                                  ? [...rideClassPrefs.acceptedClasses, rc.id]
                                  : rideClassPrefs.acceptedClasses.filter((c) => c !== rc.id);
                                toggleClassMutation.mutate(newAccepted);
                              }}
                              data-testid={`switch-class-${rc.id}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Toggle classes on or off to control which ride requests you receive. Go is always enabled.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You are currently eligible for ZIBA Go. Improve your rating, upgrade your vehicle, or complete additional approvals to qualify for more ride classes.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Activity
          </p>
          <Card>
            <CardContent className="p-0 divide-y">
              <AccountRow
                icon={<TrendingUp className="h-5 w-5" />}
                label={t("driver.earnings")}
                sublabel="View your earnings summary"
                onClick={() => setLocation("/driver/earnings")}
                testId="button-earnings"
              />
              <AccountRow
                icon={<Clock className="h-5 w-5" />}
                label={t("driver.trips")}
                sublabel="View your trip history"
                onClick={() => setLocation("/driver/trips")}
                testId="button-trips"
              />
              <AccountRow
                icon={<Mail className="h-5 w-5" />}
                label={t("inbox.title")}
                sublabel="Messages and notifications"
                onClick={() => setLocation("/driver/inbox")}
                testId="button-inbox"
                badge={unreadCount > 0 ? String(unreadCount) : undefined}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Preferences
          </p>
          <Card>
            <CardContent className="p-0 divide-y">
              <AccountRow
                icon={<Layers className="h-5 w-5" />}
                label="Driver Preferences"
                sublabel="Distance, payment, areas, ride classes"
                onClick={() => setLocation("/driver/preferences")}
                testId="button-driver-preferences"
              />
              <AccountRow
                icon={<Settings className="h-5 w-5" />}
                label={t("driver.settings")}
                sublabel="Notifications, theme, privacy"
                onClick={() => setLocation("/driver/settings")}
                testId="button-settings"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Support & Legal
          </p>
          <Card>
            <CardContent className="p-0 divide-y">
              <AccountRow
                icon={<HelpCircle className="h-5 w-5" />}
                label="Help & Support"
                sublabel="FAQs, contact us, ZIBRA assistant"
                onClick={() => setLocation("/driver/help")}
                testId="button-help-support"
              />
              <AccountRow
                icon={<FileText className="h-5 w-5" />}
                label="Terms & Privacy"
                sublabel="Terms of service, privacy policy"
                onClick={() => setLocation("/driver/terms-privacy")}
                testId="button-terms-privacy"
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
              <span className="font-medium text-sm">{t("driver.signOut")}</span>
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
                  <span className="font-medium text-sm">{t("driver.deleteAccount")}</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Your account, trip history, earnings data, and all associated information will be permanently removed.
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

      <ZibraFloatingButton />
    </DriverLayout>
  );
}

function AccountRow({
  icon, label, sublabel, onClick, testId, badge,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  testId: string;
  badge?: string;
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
        {sublabel && (
          <p className="text-xs text-muted-foreground truncate">{sublabel}</p>
        )}
      </div>
      {badge && <Badge variant="secondary">{badge}</Badge>}
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}
