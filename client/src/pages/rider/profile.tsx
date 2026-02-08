import { useState, useRef } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, Save, X } from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

interface RiderProfile {
  rating: number | null;
  totalTrips: number;
  phone: string | null;
  profilePhoto: string | null;
  savedLocations: { name: string; address: string }[];
}

export default function RiderProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery<RiderProfile>({
    queryKey: ["/api/rider/profile"],
    enabled: !!user,
  });

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "Rider";

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const startEditing = () => {
    setFormName(displayName);
    setFormEmail(user?.email || "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const avatarSrc = profile?.profilePhoto || user?.profileImageUrl || undefined;

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

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

  const saveProfileMutation = useMutation({
    mutationFn: async (data: { fullName: string; email: string }) => {
      await apiRequest("PATCH", "/api/rider/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile saved" });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Could not save profile", variant: "destructive" });
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

  if (isLoading) {
    return (
      <RiderRouteGuard>
        <RiderLayout>
          <div className="p-4 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </RiderLayout>
      </RiderRouteGuard>
    );
  }

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
            <h1 className="text-xl font-bold">Profile</h1>
          </div>

          <Card>
            <CardContent className="p-6 flex flex-col items-center gap-4">
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
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback className="text-2xl bg-primary/10">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
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
              <p className="text-sm text-muted-foreground">Tap to change photo</p>
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

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg">Personal Information</CardTitle>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-profile">
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      data-testid="input-full-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile?.phone || "Not set"}
                      disabled
                      className="opacity-60"
                      data-testid="input-phone"
                    />
                    <p className="text-xs text-muted-foreground">Phone number cannot be changed here. Contact support for assistance.</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => saveProfileMutation.mutate({ fullName: formName, email: formEmail })}
                      disabled={saveProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      <Save className="h-4 w-4" />
                      {saveProfileMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2" onClick={cancelEditing} data-testid="button-cancel-profile">
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <InfoRow label="Full Name" value={displayName} testId="text-profile-name" />
                  <InfoRow label="Email" value={user?.email || "Not set"} testId="text-profile-email" />
                  <InfoRow label="Phone" value={profile?.phone || "Not set"} testId="text-profile-phone" />
                  <InfoRow label="Total Trips" value={String(profile?.totalTrips ?? 0)} testId="text-profile-trips" />
                  {profile?.rating && (
                    <InfoRow label="Rating" value={profile.rating.toFixed(1)} testId="text-profile-rating" />
                  )}
                </>
              )}
            </CardContent>
          </Card>
          <ZibraFloatingButton />
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}

function InfoRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium" data-testid={testId}>{value}</span>
    </div>
  );
}
