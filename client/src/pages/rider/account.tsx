import { useState, useRef } from "react";
import { useTranslation } from "@/i18n";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
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
import { useTheme } from "@/components/theme-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  User, Star, ChevronRight, LogOut, Trash2,
  Camera, MapPin, Wallet, Settings, HelpCircle,
  FileText, Mail as MailIcon, Clock, X,
  Bell, Megaphone, Database, Shield, Lock, Phone, Users,
} from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

interface RiderProfile {
  rating: number | null;
  totalTrips: number;
  profilePhoto: string | null;
  phone: string | null;
  savedLocations: { name: string; address: string }[];
}

export default function RiderAccount() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery<RiderProfile>({
    queryKey: ["/api/rider/profile"],
    enabled: !!user,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/rider/inbox/unread-count"],
    enabled: !!user,
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (photoData: string) => {
      await apiRequest("POST", "/api/profile/photo", { photoData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
      toast({ title: "Photo updated" });
      setAvatarDialogOpen(false);
      setAvatarPreview(null);
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const removePhotoMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/profile/photo", { photoData: "" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
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
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please select a JPG, PNG, or WebP image.", variant: "destructive" });
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

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "Rider";

  const avatarSrc = profile?.profilePhoto || user?.profileImageUrl || undefined;
  const unreadCount = unreadData?.count ?? 0;

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
                    accept="image/jpeg,image/png,image/webp"
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
              {t("account.title")}
            </p>
            <Card>
              <CardContent className="p-0 divide-y">
                <AccountRow
                  icon={<User className="h-5 w-5" />}
                  label={t("account.profile")}
                  sublabel="Name, email, phone"
                  onClick={() => setLocation("/rider/profile")}
                  testId="button-profile"
                />
                <AccountRow
                  icon={<Wallet className="h-5 w-5" />}
                  label={t("account.paymentMethods")}
                  sublabel="Wallet and payment options"
                  onClick={() => setLocation("/rider/wallet")}
                  testId="button-payment-methods"
                />
                <AccountRow
                  icon={<MapPin className="h-5 w-5" />}
                  label={t("account.savedPlaces")}
                  sublabel={profile?.savedLocations?.length ? `${profile.savedLocations.length} saved` : "Add home, work, and more"}
                  onClick={() => setLocation("/rider/account-saved-places")}
                  testId="button-saved-places"
                />
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
                  icon={<Clock className="h-5 w-5" />}
                  label={t("account.trips")}
                  sublabel="View your ride history"
                  onClick={() => setLocation("/rider/trips")}
                  testId="button-trips"
                />
                <AccountRow
                  icon={<MailIcon className="h-5 w-5" />}
                  label="Inbox"
                  sublabel="Messages and notifications"
                  onClick={() => setLocation("/rider/inbox")}
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
                  icon={<Settings className="h-5 w-5" />}
                  label={t("account.settings")}
                  sublabel="Notifications, theme, privacy, safety"
                  onClick={() => setLocation("/rider/settings")}
                  testId="button-settings"
                />
                <AccountRow
                  icon={<Bell className="h-5 w-5" />}
                  label="Notifications"
                  sublabel="Manage notification preferences"
                  onClick={() => setLocation("/rider/account-notifications")}
                  testId="button-notifications"
                />
                <AccountRow
                  icon={<Megaphone className="h-5 w-5" />}
                  label="Marketing"
                  sublabel="Promotions and offers"
                  onClick={() => setLocation("/rider/account-marketing")}
                  testId="button-marketing"
                />
                <AccountRow
                  icon={<Database className="h-5 w-5" />}
                  label="Data Usage"
                  sublabel="Your data and privacy controls"
                  onClick={() => setLocation("/rider/account-data-usage")}
                  testId="button-data-usage"
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
                <AccountRow
                  icon={<Users className="h-5 w-5" />}
                  label="Trusted Contacts"
                  sublabel="People who can track your rides"
                  onClick={() => setLocation("/rider/trusted-contacts")}
                  testId="button-trusted-contacts"
                />
                <AccountRow
                  icon={<Lock className="h-5 w-5" />}
                  label="Ride PIN"
                  sublabel="Verify your driver before riding"
                  onClick={() => setLocation("/rider/account-ride-pin")}
                  testId="button-ride-pin"
                />
                <AccountRow
                  icon={<Shield className="h-5 w-5" />}
                  label="Emergency"
                  sublabel="Emergency contacts and SOS settings"
                  onClick={() => setLocation("/rider/account-emergency")}
                  testId="button-emergency"
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
                  label={t("account.helpCenter")}
                  sublabel="FAQs, contact us, ZIBRA assistant"
                  onClick={() => setLocation("/rider/support")}
                  testId="button-help-support"
                />
                <AccountRow
                  icon={<FileText className="h-5 w-5" />}
                  label={t("account.termsPrivacy")}
                  sublabel="Terms of service, privacy policy"
                  onClick={() => setLocation("/rider/terms-privacy")}
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
                <span className="font-medium text-sm">{t("account.logout")}</span>
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
        <ZibraFloatingButton />
      </RiderLayout>
    </RiderRouteGuard>
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
