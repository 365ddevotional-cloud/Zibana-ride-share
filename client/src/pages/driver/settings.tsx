import { useState } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, 
  MapPin, 
  Moon, 
  Shield, 
  HelpCircle, 
  FileText, 
  LogOut,
  ChevronRight,
  CreditCard,
  Trash2
} from "lucide-react";

export default function DriverSettings() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/user/account");
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

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold" data-testid="text-settings-title">Settings</h1>

        <Card>
          <CardContent className="p-0 divide-y">
            <SettingsItem 
              icon={Bell} 
              label="Notifications" 
              hasToggle 
              testId="setting-notifications"
            />
            <SettingsItem 
              icon={MapPin} 
              label="Location Services" 
              hasToggle 
              defaultChecked
              testId="setting-location"
            />
            <SettingsItem 
              icon={Moon} 
              label="Dark Mode" 
              hasToggle 
              testId="setting-dark-mode"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 divide-y">
            <SettingsItem 
              icon={CreditCard} 
              label="Payment Methods" 
              hasArrow
              testId="setting-payment"
            />
            <SettingsItem 
              icon={Shield} 
              label="Privacy & Security" 
              hasArrow
              testId="setting-privacy"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 divide-y">
            <SettingsItem 
              icon={HelpCircle} 
              label="Help & Support" 
              hasArrow
              testId="setting-help"
            />
            <SettingsItem 
              icon={FileText} 
              label="Terms & Conditions" 
              hasArrow
              testId="setting-terms"
            />
          </CardContent>
        </Card>

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
      </div>
    </DriverLayout>
  );
}

function SettingsItem({ 
  icon: Icon, 
  label, 
  hasToggle, 
  hasArrow,
  defaultChecked,
  testId
}: { 
  icon: any; 
  label: string; 
  hasToggle?: boolean;
  hasArrow?: boolean;
  defaultChecked?: boolean;
  testId?: string;
}) {
  return (
    <div 
      className="flex items-center justify-between p-4 hover-elevate cursor-pointer"
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span>{label}</span>
      </div>
      {hasToggle && <Switch defaultChecked={defaultChecked} />}
      {hasArrow && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </div>
  );
}
