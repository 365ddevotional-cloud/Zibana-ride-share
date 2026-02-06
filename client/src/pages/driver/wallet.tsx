import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Wallet, ArrowUpRight, ArrowDownLeft, CreditCard, Clock, Star, Info, DollarSign, FileText, Banknote, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { DriverBankAccountSection } from "@/components/driver-bank-account-section";
import type { Wallet as WalletType, WalletTransaction } from "@shared/schema";

interface WalletWithTransactions extends WalletType {
  transactions?: WalletTransaction[];
}

export default function DriverWalletPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: walletData, isLoading } = useQuery<WalletWithTransactions>({
    queryKey: ["/api/wallets/me"],
    enabled: !!user,
  });

  const [settlementExpanded, setSettlementExpanded] = useState(false);

  const { data: settlementSummary } = useQuery<{ totalOwed: number; totalPaid: number; pendingCount: number }>({
    queryKey: ["/api/driver/settlement/summary"],
    enabled: !!user,
  });

  const balance = walletData ? parseFloat(walletData.balance || "0") : 0;
  const lockedBalance = walletData ? parseFloat(walletData.lockedBalance || "0") : 0;
  const availableBalance = balance - lockedBalance;
  const transactions = walletData?.transactions || [];

  const getTransactionIcon = (type: string, source: string) => {
    if (type === "debit") return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    if (source === "incentive") return <Star className="h-4 w-4 text-yellow-500" />;
    return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />;
  };

  const getTransactionLabel = (source: string) => {
    switch (source) {
      case "trip": return "Trip Earning";
      case "payout": return "Withdrawal";
      case "adjustment": return "Adjustment";
      case "incentive": return "Incentive Bonus";
      case "refund": return "Refund";
      case "chargeback": return "Chargeback";
      default: return source.replace(/_/g, " ");
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold" data-testid="text-wallet-title">Wallet</h1>

        <Card className="bg-emerald-600 text-white" data-testid="card-available-balance">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-available-balance">
              {"\u20A6"}{availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            {lockedBalance > 0 && (
              <div className="flex items-center gap-1 mt-2 opacity-80">
                <Clock className="h-3 w-3" />
                <span className="text-xs" data-testid="text-pending-balance">
                  {"\u20A6"}{lockedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} pending
                </span>
              </div>
            )}
            <Button 
              variant="secondary" 
              size="sm" 
              className="mt-4"
              onClick={() => setLocation("/driver/settings")}
              data-testid="button-withdraw"
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card data-testid="card-total-balance">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Total Balance</p>
              <p className="text-lg font-bold mt-1">
                {"\u20A6"}{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="card-locked-balance">
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Locked/Pending</p>
              <p className="text-lg font-bold mt-1">
                {"\u20A6"}{lockedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20" data-testid="card-earnings-info">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Your earnings are deposited to your wallet after each trip.</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Tips are 100% yours. Detailed fee statements are available monthly.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400"
                  onClick={() => setLocation("/driver/statements")}
                  data-testid="button-view-statements"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  View Statements
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {settlementSummary && settlementSummary.totalOwed > 0 && (
          <Card data-testid="card-settlement-summary">
            <CardContent className="pt-4">
              <button 
                className="w-full flex items-center justify-between"
                onClick={() => setSettlementExpanded(!settlementExpanded)}
                data-testid="button-toggle-settlement"
              >
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Platform Balance</span>
                  <Badge variant="secondary" className="text-xs">
                    {settlementSummary.pendingCount} pending
                  </Badge>
                </div>
                {settlementExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {settlementExpanded && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Outstanding balance</span>
                    <span className="font-medium text-sm" data-testid="text-settlement-owed">
                      {"\u20A6"}{settlementSummary.totalOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From cash trips. Settled automatically from future card/wallet trips.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <DriverBankAccountSection />

        <div className="space-y-3">
          <h2 className="text-lg font-semibold" data-testid="text-transactions-title">Transaction History</h2>

          {transactions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium">No transactions yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your transaction history will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            transactions.slice(0, 30).map((tx: WalletTransaction) => {
              const amount = parseFloat(tx.amount || "0");
              const isCredit = tx.type === "credit";
              
              return (
                <Card key={tx.id} data-testid={`card-transaction-${tx.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {getTransactionIcon(tx.type, tx.source)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {getTransactionLabel(tx.source)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.description || formatDate(tx.createdAt)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-bold text-sm ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
                          {isCredit ? "+" : "-"}{"\u20A6"}{Math.abs(amount).toLocaleString()}
                        </p>
                        {tx.source === "incentive" && (
                          <Badge variant="secondary" className="text-[10px] mt-1">
                            Bonus
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DriverLayout>
  );
}
