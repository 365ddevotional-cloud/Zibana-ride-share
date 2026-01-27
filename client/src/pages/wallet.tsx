import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet, Clock, Plus, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface WalletData {
  balance: string | number;
  currency: string;
  lockedBalance?: string | number;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: userRole } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
  });

  const { data: riderWallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery<WalletData | null>({
    queryKey: ["/api/rider/wallet"],
    enabled: !!user && userRole?.role === "rider",
  });

  const { data: driverWallet } = useQuery<WalletData | null>({
    queryKey: ["/api/driver/wallet"],
    enabled: !!user && userRole?.role === "driver",
  });

  const addTestCredit = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/wallet/test-credit", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets/me"] });
      refetchWallet();
      toast({
        title: "Test Credit Added",
        description: `₦5,000.00 has been added to your wallet.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add credit",
        description: error.message || "Could not add test credit. Please try again.",
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

  const formatCurrency = (amount: number | string, currency = "NGN") => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(numAmount / 100);
  };

  const isRider = userRole?.role === "rider";
  const isDriver = userRole?.role === "driver";
  const walletData = isRider ? riderWallet : driverWallet;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(getDashboardPath())} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Wallet</h1>
        </div>
      </header>

      <main className="container py-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Balance
            </CardTitle>
            <CardDescription>Your current wallet balance</CardDescription>
          </CardHeader>
          <CardContent>
            {walletLoading ? (
              <div className="h-16 animate-pulse bg-muted rounded" />
            ) : (
              <div className="text-3xl font-bold">
                {formatCurrency(walletData?.balance || 0, walletData?.currency || "NGN")}
              </div>
            )}
          </CardContent>
        </Card>

        {isRider && (
          <Card>
            <CardHeader>
              <CardTitle>Add Funds</CardTitle>
              <CardDescription>Add test credit to your wallet for testing rides</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => addTestCredit.mutate()}
                disabled={addTestCredit.isPending}
                className="w-full"
                size="lg"
                data-testid="button-add-test-credit"
              >
                {addTestCredit.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Adding Credit...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Add Test Credit (₦5,000)
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-3">
                Test mode - no real money is charged
              </p>
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
