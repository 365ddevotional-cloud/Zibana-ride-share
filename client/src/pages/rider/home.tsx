import { useState } from "react";
import { useTranslation } from "@/i18n";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { LocationDisclosure, useLocationDisclosure } from "@/components/rider/LocationDisclosure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Calendar, ChevronRight, Wallet, Beaker, AlertCircle, BookOpen, Banknote, Home as HomeIcon, Briefcase } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CancellationWarning } from "@/components/cancellation-warning";
import { ContextualHelpSuggestion } from "@/components/contextual-help";
import { PaymentOnboardingModal } from "@/components/payment-onboarding-modal";
import { RiderSimulationControls } from "@/components/simulation-ride-controls";
import { MarketingTipBanner } from "@/components/rider/marketing-tip";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

interface WalletInfo {
  mainBalance: string;
  testBalance: string;
  currencyCode: string;
  isTester: boolean;
  defaultPaymentMethod: string;
}

export default function RiderHome() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [destination, setDestination] = useState("");
  const [pickup, setPickup] = useState("");
  const { toast } = useToast();
  const { showDisclosure, acceptDisclosure } = useLocationDisclosure();

  const { data: walletInfo } = useQuery<WalletInfo>({
    queryKey: ["/api/rider/wallet-info"],
  });

  interface SavedPlace {
    id: string;
    riderId: string;
    type: string;
    address: string;
    notes: string | null;
    lat: string | null;
    lng: string | null;
  }

  const { data: savedPlaces } = useQuery<SavedPlace[]>({
    queryKey: ["/api/rider/saved-places"],
  });

  const homePlace = savedPlaces?.find(p => p.type === "home");
  const workPlace = savedPlaces?.find(p => p.type === "work");

  const formatCurrency = (amount: string | null | undefined, currency: string) => {
    if (!amount) return `${getCurrencySymbol(currency)} 0.00`;
    const symbols: Record<string, string> = { NGN: "₦", USD: "$", ZAR: "R" };
    return `${symbols[currency] || currency} ${parseFloat(amount).toLocaleString()}`;
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = { NGN: "₦", USD: "$", ZAR: "R" };
    return symbols[currency] || currency;
  };

  const paymentMethod = walletInfo?.defaultPaymentMethod || "MAIN_WALLET";
  const currency = walletInfo?.currencyCode || "NGN";
  const currentBalance = paymentMethod === "TEST_WALLET" 
    ? walletInfo?.testBalance 
    : walletInfo?.mainBalance;
  const hasLowBalance = parseFloat(currentBalance || "0") < 500;

  const handleRequestRide = () => {
    if (!destination.trim()) return;

    if (hasLowBalance) {
      toast({
        title: "Low Balance Warning",
        description: `Your ${paymentMethod === "MAIN_WALLET" ? "Main Wallet" : "Test Wallet"} has ${formatCurrency(currentBalance, currency)}. Consider adding funds or changing payment method.`,
        variant: "destructive",
      });
    }
    
    setLocation(`/rider/trips?action=request&destination=${encodeURIComponent(destination)}&pickup=${encodeURIComponent(pickup)}&paymentMethod=${paymentMethod}`);
  };

  return (
    <RiderRouteGuard>
      {showDisclosure && <LocationDisclosure onAccept={acceptDisclosure} />}
      <PaymentOnboardingModal />
      <RiderLayout>
        <CancellationWarning role="rider" />
        <div className="p-4 space-y-6">
          <RiderSimulationControls />
          <MarketingTipBanner />
          <div className="pt-4 pb-2">
            <h1 className="text-2xl font-bold" data-testid="text-greeting">
              {t("home.greeting")}
            </h1>
            <p className="text-muted-foreground mt-1">
              Request a safe and reliable ride
            </p>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <Input
                  placeholder={t("home.pickupPlaceholder")}
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="pl-10 h-12"
                  data-testid="input-pickup"
                />
              </div>

              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t("home.destinationPlaceholder")}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="pl-10 h-12"
                  data-testid="input-destination"
                />
              </div>

              <Button
                variant="outline"
                className="w-full p-3 h-auto rounded-lg flex items-center justify-between gap-2"
                onClick={() => setLocation("/rider/payments")}
                data-testid="button-payment-method"
              >
                <div className="flex items-center gap-3">
                  {paymentMethod === "TEST_WALLET" ? (
                    <Beaker className="h-5 w-5 text-amber-500" />
                  ) : paymentMethod === "CASH" ? (
                    <Banknote className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Wallet className="h-5 w-5 text-primary" />
                  )}
                  <div className="text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {paymentMethod === "TEST_WALLET" ? "Test Wallet" : paymentMethod === "CASH" ? "Cash" : "Wallet"}
                      </span>
                      {paymentMethod === "TEST_WALLET" && (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          Test
                        </Badge>
                      )}
                      {paymentMethod !== "CASH" && (
                        <span className="text-xs font-semibold">
                          {formatCurrency(currentBalance, currency)}
                        </span>
                      )}
                    </div>
                    {paymentMethod === "CASH" ? (
                      <span className="text-xs text-muted-foreground">
                        Pay the driver directly in cash
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Tap to change payment method
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </Button>

              {hasLowBalance && paymentMethod !== "CASH" && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-xs">
                    Low balance. Tap to add funds or change payment method.
                  </span>
                </div>
              )}

              <ContextualHelpSuggestion
                category="payments"
                audience="RIDER"
                title="Payment help"
                maxArticles={2}
                show={hasLowBalance}
              />

              <Button 
                className="w-full h-12 text-base font-medium"
                onClick={handleRequestRide}
                disabled={!destination.trim()}
                data-testid="button-request-ride"
              >
                {t("home.requestRide")}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover-elevate cursor-pointer" onClick={() => setLocation("/rider/schedule")} data-testid="card-schedule-ride">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium" data-testid="text-schedule-ride">{t("home.scheduleRide")}</p>
                    <p className="text-sm text-muted-foreground">Book in advance</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("home.savedPlaces")}
            </h2>
            <Card className="shadow-sm">
              <CardContent className="p-0 divide-y">
                <div className="flex items-center">
                  <button 
                    className="flex-1 p-4 flex items-center gap-3 hover-elevate text-left"
                    onClick={() => setLocation("/rider/saved-places/home")}
                    data-testid="button-saved-home"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <HomeIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium" data-testid="text-home-label">Home</p>
                      <p className="text-sm text-muted-foreground truncate" data-testid="text-home-address">
                        {homePlace?.address || t("home.addHome")}
                      </p>
                    </div>
                  </button>
                  {homePlace?.address && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mr-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDestination(homePlace.address);
                        toast({ title: "Home address set as destination" });
                      }}
                      data-testid="button-use-home"
                    >
                      Use
                    </Button>
                  )}
                </div>
                <div className="flex items-center">
                  <button 
                    className="flex-1 p-4 flex items-center gap-3 hover-elevate text-left"
                    onClick={() => setLocation("/rider/saved-places/work")}
                    data-testid="button-saved-work"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium" data-testid="text-work-label">Work</p>
                      <p className="text-sm text-muted-foreground truncate" data-testid="text-work-address">
                        {workPlace?.address || t("home.addWork")}
                      </p>
                    </div>
                  </button>
                  {workPlace?.address && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mr-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDestination(workPlace.address);
                        toast({ title: "Work address set as destination" });
                      }}
                      data-testid="button-use-work"
                    >
                      Use
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <ZibraFloatingButton />
      </RiderLayout>
    </RiderRouteGuard>
  );
}
