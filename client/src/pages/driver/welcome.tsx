import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Shield, Wallet, Clock } from "lucide-react";
import { useTranslation } from "@/i18n";

export default function DriverWelcome() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800 text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-4xl font-bold tracking-tight">ZIBA</span>
            <span className="text-lg font-medium opacity-80">Driver</span>
          </div>
          <h1 className="text-2xl font-bold mb-3">{t("onboarding.driverWelcome")}</h1>
          <p className="text-emerald-100">
            {t("onboarding.driverSubtext")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-12">
          <FeatureCard 
            icon={Wallet} 
            title={t("onboarding.earnMore")} 
            description={t("onboarding.keepFare")}
          />
          <FeatureCard 
            icon={Clock} 
            title={t("onboarding.flexibleHours")} 
            description={t("onboarding.driveWhenYouWant")}
          />
          <FeatureCard 
            icon={Shield} 
            title={t("onboarding.safeSecure")} 
            description={t("onboarding.support247")}
          />
          <FeatureCard 
            icon={Car} 
            title={t("onboarding.easySignup")} 
            description={t("onboarding.getStartedMinutes")}
          />
        </div>

        <div className="space-y-4">
          <a href="/api/login?role=driver" className="block">
            <Button 
              size="lg" 
              className="w-full bg-white text-emerald-700 hover:bg-emerald-50"
              data-testid="button-driver-login"
            >
              {t("onboarding.signIn")}
            </Button>
          </a>
          <p className="text-center text-sm text-emerald-200">
            {t("onboarding.newToZiba")}
          </p>
        </div>

        <div className="mt-12 text-center text-xs text-emerald-200">
          <p>{t("onboarding.agreeTerms")}</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any; 
  title: string; 
  description: string;
}) {
  return (
    <Card className="bg-white/10 border-white/20">
      <CardContent className="p-4 text-center">
        <Icon className="h-8 w-8 mx-auto mb-2 text-emerald-200" />
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-emerald-200 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
