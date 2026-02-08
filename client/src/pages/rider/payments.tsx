import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Wallet, CheckCircle, ArrowLeft, AlertCircle, Beaker, Banknote, 
  HandCoins, ChevronRight, HelpCircle, Users, Send, MessageCircle
} from "lucide-react";
import { useLocation } from "wouter";

interface WalletData {
  mainBalance: string;
  testBalance: string;
  currencyCode: string;
  isTester: boolean;
  defaultPaymentMethod: string;
}

type PaymentMethod = "MAIN_WALLET" | "TEST_WALLET" | "CASH" | "SPONSORED_WALLET";

export default function RiderPayments() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("MAIN_WALLET");

  const { data: walletData, isLoading } = useQuery<WalletData>({
    queryKey: ["/api/rider/wallet-info"],
  });

  const { data: onboardingStatus } = useQuery<{ seen: boolean; cashAccessRestricted: boolean }>({
    queryKey: ["/api/rider/payment-onboarding"],
  });

  const { data: sponsoredBalances = [] } = useQuery<any[]>({
    queryKey: ["/api/funding/sponsored-balance"],
  });

  const totalSponsoredBalance = sponsoredBalances.reduce(
    (sum: number, sb: any) => sum + parseFloat(sb.balance || "0"), 0
  );
  const hasSponsoredFunds = totalSponsoredBalance > 0;

  const cashRestricted = onboardingStatus?.cashAccessRestricted || false;

  useEffect(() => {
    if (walletData?.defaultPaymentMethod) {
      setSelectedMethod(walletData.defaultPaymentMethod as PaymentMethod);
    }
  }, [walletData]);

  const mapMethodToBackend = (method: PaymentMethod): string => {
    switch (method) {
      case "MAIN_WALLET": return "WALLET";
      case "TEST_WALLET": return "TEST_WALLET";
      case "CASH": return "CASH";
      default: return "WALLET";
    }
  };

  const updateDefaultMethod = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      const paymentMethod = mapMethodToBackend(method);
      return apiRequest("PATCH", "/api/rider/payment-method", { paymentMethod });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/wallet-info"] });
      toast({ 
        title: selectedMethod === "CASH" ? "Cash payment selected" : "Wallet payment selected",
        description: selectedMethod === "CASH" 
          ? "You'll pay the driver the full trip amount in cash at the end of the ride."
          : "Your payment will be handled securely in the app."
      });
    },
    onError: () => {
      toast({ 
        title: "Update failed", 
        description: "Could not update payment method. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const handleSelectMethod = (method: PaymentMethod) => {
    const backendMethod = method === "SPONSORED_WALLET" ? "MAIN_WALLET" : method;
    setSelectedMethod(method);
    updateDefaultMethod.mutate(backendMethod as PaymentMethod);
  };

  const formatCurrency = (amount: string | null | undefined, currency: string) => {
    if (!amount) return `${getCurrencySymbol(currency)} 0.00`;
    const symbols: Record<string, string> = { NGN: "\u20A6", USD: "$", ZAR: "R" };
    return `${symbols[currency] || currency} ${parseFloat(amount).toLocaleString()}`;
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = { NGN: "\u20A6", USD: "$", ZAR: "R" };
    return symbols[currency] || currency;
  };

  const currency = walletData?.currencyCode || "NGN";
  const isTester = walletData?.isTester || false;

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/rider/home")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-payments-title">
                {t("payments.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("payments.subtitle")}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    <Wallet className="h-4 w-4" />
                    {t("payments.walletBalance")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-main-balance">
                        {formatCurrency(walletData?.mainBalance, currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("payments.zibaWallet")}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation("/rider/wallet")}
                      data-testid="button-manage-wallet"
                    >
                      {t("payments.manageWallet")}
                    </Button>
                  </div>

                  {hasSponsoredFunds && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <HandCoins className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        <div>
                          <p className="font-medium text-sm" data-testid="text-sponsored-balance">
                            {formatCurrency(totalSponsoredBalance.toFixed(2), currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Sponsored by {sponsoredBalances.length === 1 
                              ? (sponsoredBalances[0].funderName || "a supporter")
                              : `${sponsoredBalances.length} supporters`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isTester && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Beaker className="h-4 w-4 text-amber-500" />
                        <div>
                          <p className="font-medium text-sm" data-testid="text-test-balance">
                            {formatCurrency(walletData?.testBalance, currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">Test credits</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        {t("payments.testMode")}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("payments.currentMethod")}
                </h2>

                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedMethod === "MAIN_WALLET" 
                      ? "ring-2 ring-primary border-primary" 
                      : "hover-elevate"
                  }`}
                  onClick={() => handleSelectMethod("MAIN_WALLET")}
                  data-testid="payment-method-main"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t("payments.zibaWallet")}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("payments.paySecurely")}
                          </p>
                        </div>
                      </div>
                      {selectedMethod === "MAIN_WALLET" && (
                        <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`transition-all ${
                    cashRestricted 
                      ? "opacity-50 cursor-not-allowed" 
                      : `cursor-pointer ${selectedMethod === "CASH" 
                        ? "ring-2 ring-emerald-500 border-emerald-500" 
                        : "hover-elevate"}`
                  }`}
                  onClick={() => !cashRestricted && handleSelectMethod("CASH")}
                  data-testid="payment-method-cash"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                          <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t("payments.cash")}</p>
                          <p className="text-xs text-muted-foreground">
                            {cashRestricted ? t("payments.cashUnavailable") : t("payments.cashPayDriver")}
                          </p>
                        </div>
                      </div>
                      {selectedMethod === "CASH" && !cashRestricted && (
                        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {hasSponsoredFunds && (
                  <Card 
                    className={`cursor-pointer transition-all ${
                      selectedMethod === "SPONSORED_WALLET" 
                        ? "ring-2 ring-violet-500 border-violet-500" 
                        : "hover-elevate"
                    }`}
                    onClick={() => handleSelectMethod("SPONSORED_WALLET")}
                    data-testid="payment-method-sponsored"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                            <HandCoins className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{t("payments.sponsoredWallet")}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("payments.sponsoredFunds")}
                            </p>
                          </div>
                        </div>
                        {selectedMethod === "SPONSORED_WALLET" && (
                          <CheckCircle className="h-5 w-5 text-violet-500 shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isTester && (
                  <Card 
                    className={`cursor-pointer transition-all ${
                      selectedMethod === "TEST_WALLET" 
                        ? "ring-2 ring-amber-500 border-amber-500" 
                        : "hover-elevate"
                    }`}
                    onClick={() => handleSelectMethod("TEST_WALLET")}
                    data-testid="payment-method-test"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                            <Beaker className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{t("payments.testWallet")}</p>
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                Test
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {t("payments.testNoCharge")}
                            </p>
                          </div>
                        </div>
                        {selectedMethod === "TEST_WALLET" && (
                          <CheckCircle className="h-5 w-5 text-amber-500 shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("payments.moreOptions")}
                </h2>

                <Card
                  className="hover-elevate cursor-pointer"
                  onClick={() => setLocation("/rider/payments/fund-user")}
                  data-testid="card-fund-another-user"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Send className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t("payments.fundAnotherUser")}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("payments.fundDesc")}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="hover-elevate cursor-pointer"
                  onClick={() => setLocation("/rider/wallet")}
                  data-testid="card-wallet-management"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t("payments.walletManagement")}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("payments.walletManageDesc")}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {parseFloat(walletData?.mainBalance || "0") === 0 && selectedMethod === "MAIN_WALLET" && (
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm text-amber-800 dark:text-amber-200">
                          Wallet Empty
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          Your wallet has no funds. Add funds before requesting a ride, or switch to cash.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setLocation("/rider/support")}
              data-testid="button-payment-help"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              {t("payments.needHelp")}
            </Button>
          </div>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
