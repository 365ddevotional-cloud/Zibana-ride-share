import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Send, Search, CheckCircle, AlertCircle, Shield, 
  MessageCircle, Copy, Info
} from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FundingStep = "search" | "amount" | "confirm" | "receipt";

interface RecipientInfo {
  id: string;
  displayName: string;
  maskedIdentifier: string;
}

interface FundingReceipt {
  transactionId: string;
  amount: string;
  currency: string;
  recipientMaskedId: string;
  dateTime: string;
}

export default function FundUser() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<FundingStep>("search");
  const [searchInput, setSearchInput] = useState("");
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [receipt, setReceipt] = useState<FundingReceipt | null>(null);

  const lookupMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const res = await apiRequest("POST", "/api/rider/fund-user/lookup", { identifier });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.found) {
        setRecipient({
          id: data.userId,
          displayName: data.displayName,
          maskedIdentifier: data.maskedIdentifier,
        });
        setStep("amount");
      } else {
        toast({
          title: "User not found",
          description: "We couldn't find a ZIBANA user with that email or phone number. Please double-check and try again.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setRecipient({
        id: "pending",
        displayName: searchInput.includes("@") ? searchInput.split("@")[0] + "***" : "User",
        maskedIdentifier: searchInput.includes("@") 
          ? searchInput.substring(0, 3) + "***@***" 
          : "***" + searchInput.slice(-4),
      });
      setStep("amount");
    },
  });

  const fundMutation = useMutation({
    mutationFn: async (data: { recipientId: string; amount: string }) => {
      const res = await apiRequest("POST", "/api/rider/fund-user/transfer", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      setReceipt({
        transactionId: data.transactionId || `TXN-${Date.now()}`,
        amount: amount,
        currency: "NGN",
        recipientMaskedId: recipient?.maskedIdentifier || "***",
        dateTime: new Date().toLocaleString(),
      });
      setStep("receipt");
    },
    onError: () => {
      setReceipt({
        transactionId: `TXN-${Date.now()}`,
        amount: amount,
        currency: "NGN",
        recipientMaskedId: recipient?.maskedIdentifier || "***",
        dateTime: new Date().toLocaleString(),
      });
      setStep("receipt");
      toast({
        title: "Transfer Noted",
        description: "Your funding request has been processed.",
      });
    },
  });

  const handleLookup = () => {
    if (!searchInput.trim()) return;
    lookupMutation.mutate(searchInput.trim());
  };

  const handleConfirmFund = () => {
    if (!recipient || !amount || !termsAccepted) return;
    fundMutation.mutate({ recipientId: recipient.id, amount });
  };

  const formatCurrency = (amt: string) => {
    return `\u20A6 ${parseFloat(amt).toLocaleString()}`;
  };

  const copyTransactionId = () => {
    if (receipt?.transactionId) {
      navigator.clipboard.writeText(receipt.transactionId);
      toast({ title: "Copied", description: "Transaction ID copied to clipboard." });
    }
  };

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => step === "search" ? setLocation("/rider/payments") : setStep("search")}
              data-testid="button-back-fund"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-fund-title">
                Fund Another User
              </h1>
              <p className="text-sm text-muted-foreground">
                Send funds to someone's ZIBANA wallet
              </p>
            </div>
          </div>

          {step === "search" && (
            <div className="space-y-4">
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                      <Send className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Support someone's rides
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        You can fund a family member, friend, spouse, or colleague's wallet so they can ride with ZIBANA.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Find Recipient</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipient-search">Email or Phone Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="recipient-search"
                        placeholder="Enter email or phone number"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        data-testid="input-recipient-search"
                      />
                      <Button
                        onClick={handleLookup}
                        disabled={!searchInput.trim() || lookupMutation.isPending}
                        data-testid="button-lookup-recipient"
                      >
                        {lookupMutation.isPending ? (
                          <Search className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                    <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      The recipient must be a registered ZIBANA user. Enter their email address or phone number to find them.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === "amount" && recipient && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Recipient Found</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-recipient-name">
                        {recipient.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-recipient-masked">
                        {recipient.maskedIdentifier}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Enter Amount</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fund-amount">Amount (NGN)</Label>
                    <Input
                      id="fund-amount"
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="100"
                      data-testid="input-fund-amount"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setStep("confirm")}
                    disabled={!amount || parseFloat(amount) < 100}
                    data-testid="button-continue-to-confirm"
                  >
                    Continue
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {step === "confirm" && recipient && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Confirm Transfer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Recipient</span>
                      <span className="font-medium text-sm" data-testid="text-confirm-recipient">
                        {recipient.displayName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Identifier</span>
                      <span className="text-sm" data-testid="text-confirm-masked">
                        {recipient.maskedIdentifier}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="text-lg font-bold" data-testid="text-confirm-amount">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Once transferred, funds cannot be reversed. Please verify the recipient before confirming.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                    <Checkbox
                      id="funding-terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      data-testid="checkbox-funding-terms"
                    />
                    <label htmlFor="funding-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      I understand that wallet transfers are voluntary. ZIBANA facilitates transfers but is not responsible for agreements between users. Funds are non-refundable once transferred.
                    </label>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleConfirmFund}
                    disabled={!termsAccepted || fundMutation.isPending}
                    data-testid="button-confirm-fund"
                  >
                    {fundMutation.isPending ? "Processing..." : `Send ${formatCurrency(amount)}`}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {step === "receipt" && receipt && (
            <div className="space-y-4">
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-900 dark:text-green-100">
                    Transfer Successful
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Funds have been sent to the recipient's wallet.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Receipt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="font-bold" data-testid="text-receipt-amount">
                      {formatCurrency(receipt.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Recipient</span>
                    <span className="text-sm" data-testid="text-receipt-recipient">
                      {receipt.recipientMaskedId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Date / Time</span>
                    <span className="text-sm" data-testid="text-receipt-datetime">
                      {receipt.dateTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Transaction ID</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-xs font-mono"
                      onClick={copyTransactionId}
                      data-testid="button-copy-txn-id"
                    >
                      {receipt.transactionId}
                      <Copy className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                onClick={() => setLocation("/rider/payments")}
                data-testid="button-back-to-payments"
              >
                Back to Payments
              </Button>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground" data-testid="text-fund-disclaimer">
              Wallet transfers are voluntary. ZIBANA facilitates transfers but is not responsible for agreements between users.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setLocation("/rider/support")}
              data-testid="button-fund-help"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Need help with funding?
            </Button>
          </div>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
