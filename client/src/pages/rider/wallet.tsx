import { useState } from "react";
import { createPortal } from "react-dom";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Wallet, CreditCard, Plus, Clock, CheckCircle, XCircle, AlertCircle, X, RefreshCw, Settings } from "lucide-react";

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

interface AutoTopUpSettings {
  enabled: boolean;
  threshold: string;
  amount: string;
  paymentMethodId: string | null;
  failureCount: number;
}

export default function RiderWallet() {
  const { toast } = useToast();
  const [showCardModal, setShowCardModal] = useState(false);
  const [showAutoTopUp, setShowAutoTopUp] = useState(false);
  const [topUpThreshold, setTopUpThreshold] = useState("500");
  const [topUpAmount, setTopUpAmount] = useState("1000");

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ["/api/wallet/rider"],
  });

  const { data: refunds, isLoading: refundsLoading } = useQuery<Refund[]>({
    queryKey: ["/api/refunds/rider"],
  });

  const { data: autoTopUp, isLoading: autoTopUpLoading } = useQuery<AutoTopUpSettings>({
    queryKey: ["/api/rider/auto-topup"],
  });

  const autoTopUpMutation = useMutation({
    mutationFn: async (settings: { enabled: boolean; threshold?: number; amount?: number }) => {
      const res = await apiRequest("POST", "/api/rider/auto-topup", settings);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/auto-topup"] });
      toast({ title: "Auto top-up settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update auto top-up", variant: "destructive" });
    },
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
              <button
                className="w-full p-4 rounded-lg border border-dashed flex items-center justify-center gap-2 text-muted-foreground cursor-pointer hover-elevate"
                onClick={() => setShowCardModal(true)}
                data-testid="button-add-payment-method"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <Plus className="h-5 w-5" />
                <span>Add Payment Method</span>
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Payment methods are managed in test mode
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Auto Top-Up
                </div>
                {autoTopUpLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <Switch
                    checked={autoTopUp?.enabled ?? false}
                    onCheckedChange={(checked) => {
                      autoTopUpMutation.mutate({
                        enabled: checked,
                        threshold: parseFloat(topUpThreshold) || 500,
                        amount: parseFloat(topUpAmount) || 1000,
                      });
                    }}
                    disabled={autoTopUpMutation.isPending}
                    data-testid="switch-auto-topup"
                  />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Automatically add funds to your wallet when your balance drops below a set amount.
              </p>

              {autoTopUp?.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topup-threshold" className="text-sm">
                      Top up when balance falls below
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {wallet?.currencyCode === "NGN" ? "₦" : wallet?.currencyCode || "₦"}
                      </span>
                      <Input
                        id="topup-threshold"
                        type="number"
                        min="100"
                        value={topUpThreshold}
                        onChange={(e) => setTopUpThreshold(e.target.value)}
                        data-testid="input-topup-threshold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topup-amount" className="text-sm">
                      Amount to add each time
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {wallet?.currencyCode === "NGN" ? "₦" : wallet?.currencyCode || "₦"}
                      </span>
                      <Input
                        id="topup-amount"
                        type="number"
                        min="200"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        data-testid="input-topup-amount"
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const threshold = parseFloat(topUpThreshold);
                      const amount = parseFloat(topUpAmount);
                      if (threshold < 100) {
                        toast({ title: "Minimum threshold is 100", variant: "destructive" });
                        return;
                      }
                      if (amount < 200) {
                        toast({ title: "Minimum top-up amount is 200", variant: "destructive" });
                        return;
                      }
                      autoTopUpMutation.mutate({
                        enabled: true,
                        threshold,
                        amount,
                      });
                    }}
                    disabled={autoTopUpMutation.isPending}
                    data-testid="button-save-auto-topup"
                  >
                    {autoTopUpMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>

                  {autoTopUp.failureCount > 0 && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                      Auto top-up paused due to payment issues. Please check your payment method and try again.
                    </div>
                  )}
                </div>
              )}

              {!autoTopUp?.enabled && (
                <p className="text-xs text-muted-foreground">
                  Turn on auto top-up so you never run out of wallet balance during a trip.
                </p>
              )}
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
      {showCardModal && createPortal(
        <div
          data-testid="overlay-card-unavailable"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            isolation: "isolate",
          }}
        >
          <div
            onClick={() => setShowCardModal(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              zIndex: 0,
            }}
          />
          <div
            data-testid="dialog-card-unavailable"
            className="border bg-background"
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              maxWidth: "22rem",
              padding: "1.5rem",
              borderRadius: "0.5rem",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <button
              type="button"
              onClick={() => setShowCardModal(false)}
              data-testid="button-close-card-modal"
              style={{
                position: "absolute",
                right: "1rem",
                top: "1rem",
                background: "none",
                border: "none",
                padding: "8px",
                margin: "-4px",
                cursor: "pointer",
                opacity: 0.7,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <X className="h-4 w-4" />
            </button>
            <div style={{ textAlign: "center" }}>
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto" style={{ marginBottom: "1rem" }}>
                <CreditCard className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold" data-testid="text-card-unavailable-title">
                Card Payments Unavailable
              </h2>
              <p className="text-sm text-muted-foreground" style={{ marginTop: "0.5rem" }}>
                Card payments are disabled in test mode. You can continue using cash for trips. Card payments will be available in production.
              </p>
            </div>
            <div style={{ marginTop: "1.25rem" }}>
              <Button
                className="w-full"
                onClick={() => setShowCardModal(false)}
                data-testid="button-ok-card-modal"
              >
                OK
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </RiderRouteGuard>
  );
}
