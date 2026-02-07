import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CreditCard, 
  Wallet, 
  Plus, 
  Trash2, 
  Star,
  Building2,
  Smartphone,
  AlertCircle,
  Check,
  Loader2,
  Banknote
} from "lucide-react";
import type { RiderPaymentMethod } from "@shared/schema";

interface RiderWallet {
  id: string;
  userId: string;
  balance: string;
  lockedBalance: string;
  testerWalletBalance: string;
  currency: string;
  paymentSource: string;
  isTester: boolean;
}

interface PaymentSettings {
  currentMethod: string;
  availableMethods: { id: string; name: string; description: string; enabled: boolean }[];
  walletMode: "SIMULATED" | "REAL";
  isTestWalletAvailable: boolean;
  isCardAvailable: boolean;
}

export function RiderPaymentMethods() {
  const { toast } = useToast();
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [showFundWallet, setShowFundWallet] = useState(false);
  const [fundAmount, setFundAmount] = useState("");

  const { data: wallet, isLoading: walletLoading } = useQuery<RiderWallet>({
    queryKey: ["/api/rider/wallet"],
  });

  const { data: paymentSettings, isLoading: settingsLoading } = useQuery<PaymentSettings>({
    queryKey: ["/api/rider/payment-settings"],
  });

  const { data: paymentMethods, isLoading: methodsLoading } = useQuery<RiderPaymentMethod[]>({
    queryKey: ["/api/rider/payment-methods"],
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (methodId: string) => {
      const res = await apiRequest("PATCH", `/api/rider/payment-methods/${methodId}/default`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/payment-methods"] });
      toast({ title: "Default payment method updated" });
    },
    onError: () => {
      toast({ title: "Failed to update default", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (methodId: string) => {
      const res = await apiRequest("DELETE", `/api/rider/payment-methods/${methodId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/payment-methods"] });
      toast({ title: "Payment method removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove payment method", variant: "destructive" });
    },
  });

  const fundWalletMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/wallet/fund", { amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/wallet-info"] });
      toast({ title: "Wallet funded", description: `Your wallet has been funded successfully.` });
      setShowFundWallet(false);
      setFundAmount("");
    },
    onError: (error: Error) => {
      const message = error.message || "Failed to fund wallet";
      toast({ title: "Funding failed", description: message, variant: "destructive" });
    },
  });

  const handleFundWallet = () => {
    const amount = parseFloat(fundAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount to fund.", variant: "destructive" });
      return;
    }
    fundWalletMutation.mutate(amount);
  };

  const formatCurrency = (amount: string | number, currency: string = "NGN") => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(num);
  };

  const getCardIcon = (brand?: string | null) => {
    return <CreditCard className="h-5 w-5" />;
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case "CARD":
        return <CreditCard className="h-5 w-5" />;
      case "BANK":
        return <Building2 className="h-5 w-5" />;
      case "MOBILE_MONEY":
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const isLoading = walletLoading || settingsLoading || methodsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const walletBalance = wallet?.isTester 
    ? parseFloat(wallet.testerWalletBalance || "0") 
    : parseFloat(wallet?.balance || "0");

  const availableBalance = wallet?.isTester
    ? parseFloat(wallet.testerWalletBalance || "0")
    : parseFloat(wallet?.balance || "0") - parseFloat(wallet?.lockedBalance || "0");

  return (
    <div className="space-y-4" data-testid="rider-payment-methods">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet Balance
              </CardTitle>
              <CardDescription>
                {paymentSettings?.walletMode === "SIMULATED" ? (
                  <Badge variant="secondary" className="mt-1">Test Mode</Badge>
                ) : (
                  <Badge variant="default" className="mt-1">Live</Badge>
                )}
              </CardDescription>
            </div>
            {wallet?.isTester && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Tester Account
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold" data-testid="text-wallet-balance">
                {formatCurrency(availableBalance, wallet?.currency)}
              </span>
              {parseFloat(wallet?.lockedBalance || "0") > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({formatCurrency(wallet?.lockedBalance || "0", wallet?.currency)} locked)
                </span>
              )}
            </div>
            
            {wallet?.isTester && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>You are using a test wallet. No real money will be charged.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Fund your wallet or pay with cash</CardDescription>
            </div>
            <Button 
              size="sm" 
              onClick={() => setShowFundWallet(!showFundWallet)}
              data-testid="button-fund-wallet"
            >
              <Plus className="h-4 w-4 mr-2" />
              Fund Wallet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {showFundWallet && (
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3" data-testid="fund-wallet-form">
                <p className="text-sm font-medium">Fund Wallet with Card</p>
                <p className="text-xs text-muted-foreground">
                  Add funds to your ZIBA wallet. Cards can only be used to top up your wallet balance, not for direct trip payments.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">₦</span>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    min="100"
                    step="100"
                    data-testid="input-fund-amount"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {[500, 1000, 2000, 5000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setFundAmount(amount.toString())}
                      data-testid={`button-quick-fund-${amount}`}
                    >
                      ₦{amount.toLocaleString()}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleFundWallet}
                    disabled={fundWalletMutation.isPending || !fundAmount}
                    className="flex-1"
                    data-testid="button-confirm-fund"
                  >
                    {fundWalletMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Fund Wallet
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setShowFundWallet(false); setFundAmount(""); }}
                    data-testid="button-cancel-fund"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div 
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
              data-testid="payment-method-wallet"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">ZIBA Wallet</p>
                  <p className="text-sm text-muted-foreground">
                    Balance: {formatCurrency(availableBalance, wallet?.currency)}
                  </p>
                  {availableBalance === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Tap "Fund Wallet" above to add funds
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="secondary">
                <Check className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>

            <div 
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
              data-testid="payment-method-cash-option"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium">Cash</p>
                  <p className="text-sm text-muted-foreground">
                    Pay the driver directly
                  </p>
                </div>
              </div>
              <Badge variant="secondary">
                <Check className="h-3 w-3 mr-1" />
                Available
              </Badge>
            </div>

            {paymentMethods && paymentMethods.length > 0 && (
              <>
                <Separator className="my-4" />
                <p className="text-sm font-medium text-muted-foreground mb-2">Saved Cards (for wallet funding)</p>
                {paymentMethods.map((method) => (
                  <div 
                    key={method.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    data-testid={`payment-method-${method.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        {getPaymentMethodIcon(method.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {method.cardBrand ? method.cardBrand.toUpperCase() : method.type}
                            {method.cardLast4 && ` •••• ${method.cardLast4}`}
                            {method.bankAccountLast4 && ` •••• ${method.bankAccountLast4}`}
                          </p>
                          {method.isDefault && (
                            <Badge variant="outline" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        {method.cardExpMonth && method.cardExpYear && (
                          <p className="text-sm text-muted-foreground">
                            Expires {method.cardExpMonth}/{method.cardExpYear}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteMutation.mutate(method.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${method.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Cards can only be used to fund your ZIBA Wallet. Trip payments are made using your wallet balance or cash.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
