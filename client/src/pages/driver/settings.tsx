import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { 
  Bell, 
  MapPin, 
  Moon, 
  Shield, 
  HelpCircle, 
  FileText, 
  LogOut,
  ChevronRight,
  CreditCard
} from "lucide-react";

export default function DriverSettings() {
  const { logout } = useAuth();

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
          variant="destructive" 
          className="w-full"
          onClick={() => logout?.()}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
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
