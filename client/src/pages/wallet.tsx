import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wallet, Clock, TestTube } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface WalletData {
  balance: string | number;
  currency: string;
  lockedBalance?: string | number;
  testerWalletBalance?: string | number;
}

interface TesterStatus {
  isTester: boolean;
  testerType: string | null;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: userRole } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
  });

  const { data: testerStatus } = useQuery<TesterStatus>({
    queryKey: ["/api/user/tester-status"],
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
  const isTester = testerStatus?.isTester || false;

  const mainBalance = walletData?.balance || 0;
  const testerBalance = walletData?.testerWalletBalance || 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(getDashboardPath())} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Wallet</h1>
          {isTester && (
            <Badge variant="outline" className="ml-auto">
              <TestTube className="h-3 w-3 mr-1" />
              Test Mode
            </Badge>
          )}
        </div>
      </header>

      <main className="container py-6 max-w-2xl space-y-6">
        {isTester && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <TestTube className="h-5 w-5" />
              <span className="font-medium">Test Wallet Active</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              You are using a test wallet. Test credits are separate from your main wallet. No real money is involved in test transactions.
            </p>
          </div>
        )}

        {isTester && (
          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <TestTube className="h-5 w-5" />
                Test Credits
              </CardTitle>
              <CardDescription className="text-green-600 dark:text-green-500">
                Credits for testing rides (not real money)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {walletLoading ? (
                <div className="h-16 animate-pulse bg-muted rounded" />
              ) : (
                <div className="text-3xl font-bold text-green-700 dark:text-green-400" data-testid="text-tester-wallet-balance">
                  {formatCurrency(testerBalance, walletData?.currency || "NGN")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {isTester ? "Main Wallet" : "Wallet Balance"}
            </CardTitle>
            <CardDescription>
              {isTester ? "Your real wallet balance (₦0.00 for testers)" : "Your current wallet balance"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {walletLoading ? (
              <div className="h-16 animate-pulse bg-muted rounded" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-main-wallet-balance">
                {formatCurrency(mainBalance, walletData?.currency || "NGN")}
              </div>
            )}
          </CardContent>
        </Card>

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
