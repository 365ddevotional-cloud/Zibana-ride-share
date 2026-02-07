import { useState, useEffect } from "react";
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
  Wallet, CheckCircle, ArrowLeft, AlertCircle, Beaker, Banknote
} from "lucide-react";
import { useLocation } from "wouter";

interface WalletData {
  mainBalance: string;
  testBalance: string;
  currencyCode: string;
  isTester: boolean;
  defaultPaymentMethod: string;
}

type PaymentMethod = "MAIN_WALLET" | "TEST_WALLET" | "CASH";

export default function RiderPayments() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("MAIN_WALLET");

  const { data: walletData, isLoading } = useQuery<WalletData>({
    queryKey: ["/api/rider/wallet-info"],
  });

  const { data: onboardingStatus } = useQuery<{ seen: boolean; cashAccessRestricted: boolean }>({
    queryKey: ["/api/rider/payment-onboarding"],
  });

  const cashRestricted = onboardingStatus?.cashAccessRestricted || false;

  useEffect(() => {
    if (walletData?.defaultPaymentMethod) {
      setSelectedMethod(walletData.defaultPaymentMethod as PaymentMethod);
    }
  }, [walletData]);

  const updateDefaultMethod = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      return apiRequest("PATCH", "/api/rider/payment-method", { defaultPaymentMethod: method });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/wallet-info"] });
      toast({ 
        title: selectedMethod === "CASH" ? "Cash payment selected" : "Card payment selected",
        description: selectedMethod === "CASH" 
          ? "You'll pay the driver the full trip amount in cash at the end of the ride."
          : "Your payment will be handled securely in the app."
      });
    },
    onError: () => {
      toast({ 
        title: "Update failed", 
        description: "Could not update payment method", 
        variant: "destructive" 
      });
    },
  });

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    if (method === "CASH") {
      toast({
        title: "Cash payment selected",
        description: "You'll pay the driver the full trip amount in cash at the end of the ride.",
      });
      return;
    }
    updateDefaultMethod.mutate(method);
  };

  const formatCurrency = (amount: string | null | undefined, currency: string) => {
    if (!amount) return `${getCurrencySymbol(currency)} 0.00`;
    const symbols: Record<string, string> = { NGN: "₦", USD: "$", ZAR: "R" };
    return `${symbols[currency] || currency} ${parseFloat(amount).toLocaleString()}`;
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = { NGN: "₦", USD: "$", ZAR: "R" };
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
              onClick={() => setLocation("/rider/wallet")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold" data-testid="text-payments-title">
              Choose how you want to pay
            </h1>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">How payments work</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You can change your payment method before the trip starts.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Payment Options
            </h2>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
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
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wallet className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">Main Wallet</p>
                            <Badge variant="outline" className="text-xs">
                              {currency}
                            </Badge>
                          </div>
                          <p className="text-lg font-bold mt-1" data-testid="text-main-balance">
                            {formatCurrency(walletData?.mainBalance, currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pay securely in the app
                          </p>
                        </div>
                      </div>
                      {selectedMethod === "MAIN_WALLET" && (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary text-primary-foreground">
                            Default
                          </Badge>
                          <CheckCircle className="h-6 w-6 text-primary" />
                        </div>
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
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                          <Banknote className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold">Cash</p>
                          {cashRestricted ? (
                            <p className="text-sm text-muted-foreground mt-1">
                              Cash payments are temporarily unavailable
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              Pay the driver directly in cash
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedMethod === "CASH" && !cashRestricted && (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-500 text-white">
                            Default
                          </Badge>
                          <CheckCircle className="h-6 w-6 text-emerald-500" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

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
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                            <Beaker className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">Test Wallet</p>
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                Test Mode
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {currency}
                              </Badge>
                            </div>
                            <p className="text-lg font-bold mt-1" data-testid="text-test-balance">
                              {formatCurrency(walletData?.testBalance, currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Test credits — no real charge
                            </p>
                          </div>
                        </div>
                        {selectedMethod === "TEST_WALLET" && (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-500 text-white">
                              Default
                            </Badge>
                            <CheckCircle className="h-6 w-6 text-amber-500" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Current Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  {selectedMethod === "MAIN_WALLET" ? (
                    <Wallet className="h-5 w-5 text-primary" />
                  ) : selectedMethod === "CASH" ? (
                    <Banknote className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Beaker className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {selectedMethod === "MAIN_WALLET" ? "Main Wallet" : selectedMethod === "CASH" ? "Cash" : "Test Wallet"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedMethod === "CASH" ? "Pay the driver directly in cash" : "Pay securely in the app"}
                    </p>
                  </div>
                </div>
                {selectedMethod !== "CASH" && (
                  <p className="font-bold">
                    {formatCurrency(
                      selectedMethod === "MAIN_WALLET" 
                        ? walletData?.mainBalance 
                        : walletData?.testBalance, 
                      currency
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-amber-800 dark:text-amber-200">
                    Insufficient Balance?
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    If your selected wallet doesn't have enough funds for a ride, 
                    you'll see a clear error message. You can then:
                  </p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                    <li>Add funds to your wallet</li>
                    <li>Switch to a different payment method</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center px-4">
            You can change your payment method before the trip starts.
          </p>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
