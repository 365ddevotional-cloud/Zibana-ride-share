import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Wallet, CreditCard, Plus, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface WalletData {
  balance: string;
  currencyCode: string;
}

interface Refund {
  id: string;
  amount: string;
  currencyCode: string;
  status: string;
  createdAt: string;
  reason: string;
}

export default function RiderWallet() {
  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ["/api/wallet/rider"],
  });

  const { data: refunds, isLoading: refundsLoading } = useQuery<Refund[]>({
    queryKey: ["/api/refunds/rider"],
  });

  const formatCurrency = (amount: string | null, currency: string) => {
    if (!amount) return "—";
    const symbols: Record<string, string> = { NGN: "₦", USD: "$", ZAR: "R" };
    return `${symbols[currency] || currency} ${parseFloat(amount).toLocaleString()}`;
  };

  const getRefundStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending": return <Clock className="h-4 w-4 text-yellow-600" />;
      case "rejected": return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <h1 className="text-2xl font-bold" data-testid="text-wallet-title">Wallet</h1>

          {walletLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Wallet className="h-6 w-6" />
                  <span className="text-sm opacity-90">Available Balance</span>
                </div>
                <p className="text-3xl font-bold" data-testid="text-wallet-balance">
                  {wallet ? formatCurrency(wallet.balance, wallet.currencyCode) : "₦ 0.00"}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-lg border border-dashed flex items-center justify-center gap-2 text-muted-foreground">
                <Plus className="h-5 w-5" />
                <span>Add Payment Method</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Payment methods are managed in test mode
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Refunds
            </h2>

            {refundsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !refunds || refunds.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No refunds</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Refund requests will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {refunds.map((refund) => (
                  <Card key={refund.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getRefundStatusIcon(refund.status)}
                          <div>
                            <p className="font-medium">
                              {formatCurrency(refund.amount, refund.currencyCode)}
                            </p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {refund.reason}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {refund.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
