import { useState } from "react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { 
  LogOut, 
  User, 
  Settings, 
  MapPin, 
  CreditCard,
  Ticket,
  Sun,
  Moon,
  Monitor,
  Palette,
  Check,
  Trash2
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/models/auth";

interface ProfileDropdownProps {
  user: UserType | null | undefined;
  role: "super_admin" | "admin" | "driver" | "rider" | "trip_coordinator" | "support_agent" | "director" | "finance";
  onLogout: () => void;
}

export function ProfileDropdown({ user, role, onLogout }: ProfileDropdownProps) {
  const [, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
        description: "Your account has been permanently deleted.",
      });
      const redirectUrl = role === "driver" ? "/driver" : role === "rider" ? "/" : "/admin/login";
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
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

  const showDeleteOption = role === "rider" || role === "driver";

  const getMenuItems = () => {
    switch (role) {
      case "super_admin":
      case "admin":
      case "director":
      case "finance":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/trips")} data-testid="menu-my-trips">
              <MapPin className="mr-2 h-4 w-4" />
              My Trips
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/wallet")} data-testid="menu-payments">
              <CreditCard className="mr-2 h-4 w-4" />
              Payments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </>
        );
      case "support_agent":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/support")} data-testid="menu-assigned-tickets">
              <Ticket className="mr-2 h-4 w-4" />
              Assigned Tickets
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/wallet")} data-testid="menu-payments">
              <CreditCard className="mr-2 h-4 w-4" />
              Payments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </>
        );
      case "driver":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/trips")} data-testid="menu-my-trips">
              <MapPin className="mr-2 h-4 w-4" />
              My Trips
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/wallet")} data-testid="menu-payments">
              <CreditCard className="mr-2 h-4 w-4" />
              Payments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </>
        );
      case "rider":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/trips")} data-testid="menu-my-trips">
              <MapPin className="mr-2 h-4 w-4" />
              My Trips
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/wallet")} data-testid="menu-payments">
              <CreditCard className="mr-2 h-4 w-4" />
              Payments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </>
        );
      case "trip_coordinator":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/coordinator")} data-testid="menu-org-trips">
              <MapPin className="mr-2 h-4 w-4" />
              Organization Trips
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/wallet")} data-testid="menu-payments">
              <CreditCard className="mr-2 h-4 w-4" />
              Payments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </>
        );
      default:
        return (
          <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
        );
    }
  };

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" data-testid="profile-dropdown-trigger">
          <UserAvatar user={user} size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {getMenuItems()}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger data-testid="menu-appearance">
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => setTheme("light")} data-testid="menu-theme-light">
              <Sun className="mr-2 h-4 w-4" />
              Light
              {theme === "light" && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} data-testid="menu-theme-dark">
              <Moon className="mr-2 h-4 w-4" />
              Dark
              {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} data-testid="menu-theme-system">
              <Monitor className="mr-2 h-4 w-4" />
              System (Auto)
              {theme === "system" && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-destructive" data-testid="menu-logout">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
        {showDeleteOption && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setDeleteDialogOpen(true)} 
              className="text-destructive"
              data-testid="menu-delete-account"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Unsubscribe / Delete Account
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your account and cannot be undone. Your trip history, wallet, and all data will be removed. You can re-register with the same email afterward.
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
    </>
  );
}
