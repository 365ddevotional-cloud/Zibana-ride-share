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
import { UserAvatar } from "@/components/user-avatar";
import { 
  LogOut, 
  User, 
  Settings, 
  Car, 
  DollarSign, 
  MapPin, 
  Building, 
  FileText, 
  CreditCard,
  Ticket,
  Sun,
  Moon,
  Monitor,
  Palette,
  Check
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import type { User as UserType } from "@shared/models/auth";

interface ProfileDropdownProps {
  user: UserType | null | undefined;
  role: "super_admin" | "admin" | "driver" | "rider" | "trip_coordinator" | "support_agent" | "director" | "finance";
  onLogout: () => void;
}

export function ProfileDropdown({ user, role, onLogout }: ProfileDropdownProps) {
  const [, navigate] = useLocation();
  const { theme, setTheme } = useTheme();

  const getMenuItems = () => {
    switch (role) {
      case "super_admin":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin-management">
              <Settings className="mr-2 h-4 w-4" />
              Admin Management
            </DropdownMenuItem>
          </>
        );
      case "admin":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin-settings">
              <Settings className="mr-2 h-4 w-4" />
              Admin Settings
            </DropdownMenuItem>
          </>
        );
      case "director":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-director-dashboard">
              <Settings className="mr-2 h-4 w-4" />
              Director Dashboard
            </DropdownMenuItem>
          </>
        );
      case "finance":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-finance-dashboard">
              <DollarSign className="mr-2 h-4 w-4" />
              Finance Dashboard
            </DropdownMenuItem>
          </>
        );
      case "support_agent":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/support")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/support")} data-testid="menu-assigned-tickets">
              <Ticket className="mr-2 h-4 w-4" />
              Assigned Tickets
            </DropdownMenuItem>
          </>
        );
      case "driver":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/driver/profile")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/driver/profile")} data-testid="menu-vehicle">
              <Car className="mr-2 h-4 w-4" />
              Vehicle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/driver")} data-testid="menu-earnings">
              <DollarSign className="mr-2 h-4 w-4" />
              Earnings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/driver/profile")} data-testid="menu-driver-settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </>
        );
      case "rider":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/rider")} data-testid="menu-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/rider")} data-testid="menu-my-trips">
              <MapPin className="mr-2 h-4 w-4" />
              My Trips
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/rider")} data-testid="menu-payments">
              <CreditCard className="mr-2 h-4 w-4" />
              Payments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/rider")} data-testid="menu-rider-settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </>
        );
      case "trip_coordinator":
        return (
          <>
            <DropdownMenuItem onClick={() => navigate("/coordinator")} data-testid="menu-org-profile">
              <Building className="mr-2 h-4 w-4" />
              Organization Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/coordinator")} data-testid="menu-org-trips">
              <MapPin className="mr-2 h-4 w-4" />
              Organization Trips
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/coordinator")} data-testid="menu-billing">
              <FileText className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/coordinator")} data-testid="menu-coordinator-settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </>
        );
      default:
        return (
          <DropdownMenuItem onClick={() => navigate("/")} data-testid="menu-home">
            <User className="mr-2 h-4 w-4" />
            Home
          </DropdownMenuItem>
        );
    }
  };

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
