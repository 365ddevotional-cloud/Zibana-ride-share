import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Car } from "lucide-react";
import { useTranslation } from "@/i18n";

export default function RiderWelcomeBack() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const shown = sessionStorage.getItem("ziba-rider-welcome-shown");
    if (shown === "true") {
      setLocation("/rider/home");
    }
  }, [setLocation]);

  const handleContinue = () => {
    sessionStorage.setItem("ziba-rider-welcome-shown", "true");
    setVisible(false);
    setLocation("/rider/home");
  };

  if (!visible) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Car className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-welcome-title">
            {t("onboarding.welcomeBack")}
          </h1>
          <p className="text-muted-foreground text-lg" data-testid="text-welcome-body">
            {t("onboarding.driversAvailable")}
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold rounded-full"
            onClick={handleContinue}
            data-testid="button-request-ride"
          >
            {t("onboarding.requestRide")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("onboarding.ctaSubtext")}
          </p>
        </div>
      </div>
    </div>
  );
}
