import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Loader2
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

  const addCardMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/rider/payment-methods/add-card/initialize");
      return res.json() as Promise<{ authorizationUrl?: string }>;
    },
    onSuccess: (data: { authorizationUrl?: string }) => {
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        toast({ title: "Card authorization initiated", description: "Please complete the payment to add your card." });
      }
    },
    onError: (error: Error) => {
      const message = error.message || "Failed to add card";
      if (message.includes("not available in test mode")) {
        toast({ 
          title: "Card payments not available", 
          description: "Cards can only be added when real payments are enabled.",
          variant: "destructive" 
        });
      } else {
        toast({ title: "Failed to add card", variant: "destructive" });
      }
    },
  });

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
              <CardDescription>Manage your saved cards and payment options</CardDescription>
            </div>
            {paymentSettings?.isCardAvailable && (
              <Button 
                size="sm" 
                onClick={() => addCardMutation.mutate()}
                disabled={addCardMutation.isPending}
                data-testid="button-add-card"
              >
                {addCardMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Card
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
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
                </div>
              </div>
              <Badge variant="secondary">
                <Check className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>

            {paymentMethods && paymentMethods.length > 0 ? (
              <>
                <Separator className="my-4" />
                <p className="text-sm font-medium text-muted-foreground mb-2">Saved Cards</p>
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
                        {method.nickname && (
                          <p className="text-sm text-muted-foreground">{method.nickname}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(method.id)}
                          disabled={setDefaultMutation.isPending}
                          data-testid={`button-set-default-${method.id}`}
                        >
                          Set Default
                        </Button>
                      )}
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
            ) : (
              <>
                {!paymentSettings?.isCardAvailable && (
                  <div className="text-center py-6 text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Card payments are not available in test mode.</p>
                    <p className="text-xs mt-1">Cards can be added when real payments are enabled.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
