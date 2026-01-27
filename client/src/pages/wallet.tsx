import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wallet, Clock, CreditCard, TestTube, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface PaymentSettings {
  currentMethod: string;
  availableMethods: PaymentMethod[];
  walletMode: "SIMULATED" | "REAL";
  isTestWalletAvailable: boolean;
  isCardAvailable: boolean;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: userRole } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
  });

  const { data: walletData, isLoading: walletLoading } = useQuery<{ balance: number; currency: string }>({
    queryKey: ["/api/wallet"],
    enabled: !!user,
  });

  const { data: paymentSettings, isLoading: settingsLoading } = useQuery<PaymentSettings>({
    queryKey: ["/api/rider/payment-settings"],
    enabled: !!user && userRole?.role === "rider",
  });

  const updatePaymentMethod = useMutation({
    mutationFn: async (paymentMethod: string) => {
      const response = await apiRequest("PATCH", "/api/rider/payment-method", { paymentMethod });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/payment-settings"] });
      toast({
        title: "Payment method updated",
        description: "Your payment preference has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update",
        description: error.message || "Could not update payment method",
        variant: "destructive",
      });
    },
  });

  const getDashboardPath = () => {
    switch (userRole?.role) {
      case "driver": return "/driver";
      case "admin": 
      case "super_admin":
      case "director":
      case "finance": return "/admin";
      case "support_agent": return "/support";
      case "trip_coordinator": return "/coordinator";
      default: return "/rider";
    }
  };

  const formatCurrency = (amount: number, currency = "NGN") => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const getMethodIcon = (methodId: string) => {
    switch (methodId) {
      case "WALLET": return <Wallet className="h-5 w-5" />;
      case "TEST_WALLET": return <TestTube className="h-5 w-5" />;
      case "CARD": return <CreditCard className="h-5 w-5" />;
      default: return <Wallet className="h-5 w-5" />;
    }
  };

  const isRider = userRole?.role === "rider";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(getDashboardPath())} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Payments & Wallet</h1>
        </div>
      </header>

      <main className="container py-6 max-w-2xl space-y-6">
        {paymentSettings?.walletMode === "SIMULATED" && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <TestTube className="h-5 w-5" />
              <span className="font-medium">Testing Mode Active</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              All payments are simulated. No real charges will be made.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Balance
            </CardTitle>
            <CardDescription>Your current balance</CardDescription>
          </CardHeader>
          <CardContent>
            {walletLoading ? (
              <div className="h-16 animate-pulse bg-muted rounded" />
            ) : (
              <div className="text-3xl font-bold">
                {formatCurrency(walletData?.balance || 0, walletData?.currency)}
              </div>
            )}
          </CardContent>
        </Card>

        {isRider && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Choose how you want to pay for rides</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {settingsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 animate-pulse bg-muted rounded-lg" />
                  ))}
                </div>
              ) : (
                paymentSettings?.availableMethods.map((method) => {
                  const isSelected = paymentSettings.currentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => updatePaymentMethod.mutate(method.id)}
                      disabled={updatePaymentMethod.isPending || !method.enabled}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover-elevate",
                        !method.enabled && "opacity-50 cursor-not-allowed"
                      )}
                      data-testid={`button-payment-method-${method.id.toLowerCase()}`}
                    >
                      <div className={cn(
                        "p-2 rounded-full",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {getMethodIcon(method.id)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{method.name}</p>
                          {method.id === "TEST_WALLET" && (
                            <Badge variant="outline" className="text-xs">Testing</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent transactions</p>
            <p className="text-sm mt-1">Your transaction history will appear here</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
