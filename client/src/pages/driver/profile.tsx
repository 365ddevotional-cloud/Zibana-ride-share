import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";
import { FullPageLoading } from "@/components/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { ArrowLeft, Camera, Car, Phone, User } from "lucide-react";
import type { DriverProfile } from "@shared/schema";

const driverProfileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  vehicleMake: z.string().min(2, "Vehicle make is required"),
  vehicleModel: z.string().min(1, "Vehicle model is required"),
  licensePlate: z.string().min(2, "License plate is required"),
});

type DriverProfileForm = z.infer<typeof driverProfileSchema>;

export default function DriverProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery<DriverProfile>({
    queryKey: ["/api/driver/profile"],
    enabled: !!user,
  });

  const form = useForm<DriverProfileForm>({
    resolver: zodResolver(driverProfileSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      vehicleMake: "",
      vehicleModel: "",
      licensePlate: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: profile.fullName,
        phone: profile.phone,
        vehicleMake: profile.vehicleMake,
        vehicleModel: profile.vehicleModel,
        licensePlate: profile.licensePlate,
      });
    }
  }, [profile, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: DriverProfileForm) => {
      const response = await apiRequest("PATCH", "/api/driver/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/profile"] });
      toast({
        title: "Profile updated!",
        description: "Your changes have been saved.",
      });
      setLocation("/driver/account");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
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
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
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

  const onSubmit = (data: DriverProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const displayName = profile?.fullName || user?.firstName
    ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
    : "Driver";

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const avatarSrc = (profile as any)?.profilePhoto || user?.profileImageUrl || undefined;

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

  if (authLoading || profileLoading) {
    return <FullPageLoading text="Loading profile..." />;
  }

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
          <h1 className="text-xl font-bold">Edit Profile</h1>
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
                  <AvatarFallback className="text-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
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
                <AvatarFallback className="text-3xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
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
          <CardHeader>
            <CardTitle className="text-lg">Personal & Vehicle Info</CardTitle>
            <CardDescription>
              Update your personal and vehicle information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input 
                            placeholder="John Doe" 
                            className="pl-10" 
                            data-testid="input-full-name"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input 
                            placeholder="+1 234 567 8900" 
                            className="pl-10" 
                            data-testid="input-phone"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="vehicleMake"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Make</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Toyota" 
                            data-testid="input-vehicle-make"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vehicleModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Model</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Camry" 
                            data-testid="input-vehicle-model"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ABC-1234" 
                          data-testid="input-license-plate"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setLocation("/driver/account")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-emerald-600" 
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        <ZibraFloatingButton />
      </div>
    </DriverLayout>
  );
}
