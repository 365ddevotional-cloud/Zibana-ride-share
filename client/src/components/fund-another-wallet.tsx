import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Search, CheckCircle, AlertTriangle, ArrowLeft, History, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface Recipient {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

interface FundingSettings {
  minAmount: string;
  maxAmount: string;
  dailyLimit: string;
  monthlyLimit: string;
  isEnabled: boolean;
}

interface FundingTx {
  id: string;
  amount: string;
  status: string;
  createdAt: string;
  recipientName?: string;
  senderName?: string;
  receiverUserId?: string;
  senderUserId?: string;
  purpose?: string;
  acceptedAt?: string;
  declinedAt?: string;
}

type Step = "form" | "confirm" | "success" | "history";

export function FundAnotherWalletDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [identifier, setIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [purpose, setPurpose] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const { data: settings } = useQuery<FundingSettings>({
    queryKey: ["/api/wallet-funding/settings"],
    enabled: open,
  });

  const { data: history } = useQuery<{ sent: FundingTx[]; received: FundingTx[] }>({
    queryKey: ["/api/wallet-funding/history"],
    enabled: open && step === "history",
  });

  const { data: pendingFunding } = useQuery<Array<FundingTx & { senderName: string }>>({
    queryKey: ["/api/wallet-funding/pending"],
    enabled: open,
  });

  const acceptFundingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/wallet-funding/${id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-funding/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-funding/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/wallet-info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets/me"] });
      toast({ title: "Funding Accepted", description: "Funds have been added to your wallet." });
    },
  });

  const declineFundingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/wallet-funding/${id}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-funding/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-funding/history"] });
      toast({ title: "Funding Declined" });
    },
  });

  const lookupMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", "/api/wallet-funding/lookup", { identifier: id });
      return res.json();
    },
    onSuccess: (data: Recipient) => {
      setRecipient(data);
    },
    onError: (error: Error) => {
      toast({ title: "Recipient not found", description: error.message, variant: "destructive" });
      setRecipient(null);
    },
  });

  const fundMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wallet-funding/send", {
        receiverUserId: recipient?.userId,
        amount: parseFloat(amount),
        disclaimerAccepted,
        purpose: purpose || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-funding/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/wallet-info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets/me"] });
      setStep("success");
    },
    onError: (error: Error) => {
      toast({ title: "Funding failed", description: error.message, variant: "destructive" });
    },
  });

  const handleLookup = () => {
    if (!identifier.trim()) return;
    lookupMutation.mutate(identifier.trim());
  };

  const handleProceed = () => {
    const val = parseFloat(amount);
    if (!recipient) return;
    if (isNaN(val) || val <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    const min = parseFloat(settings?.minAmount || "100");
    const max = parseFloat(settings?.maxAmount || "50000");
    if (val < min) {
      toast({ title: `Minimum amount is \u20A6${min.toLocaleString()}`, variant: "destructive" });
      return;
    }
    if (val > max) {
      toast({ title: `Maximum amount is \u20A6${max.toLocaleString()}`, variant: "destructive" });
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!disclaimerAccepted) {
      toast({ title: "Please accept the disclaimer to proceed", variant: "destructive" });
      return;
    }
    fundMutation.mutate();
  };

  const resetAndClose = () => {
    setStep("form");
    setIdentifier("");
    setAmount("");
    setPurpose("");
    setRecipient(null);
    setDisclaimerAccepted(false);
    onClose();
  };

  const resetToForm = () => {
    setStep("form");
    setIdentifier("");
    setAmount("");
    setPurpose("");
    setRecipient(null);
    setDisclaimerAccepted(false);
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
      <DialogContent className="max-w-md">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Fund Another Wallet
              </DialogTitle>
              <DialogDescription>
                Send funds to another ZIBA user. Funds can only be used within ZIBA.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {pendingFunding && pendingFunding.length > 0 && (
                <Card className="border-yellow-500/30 bg-yellow-500/5">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-sm font-medium flex items-center flex-wrap gap-2" data-testid="text-pending-funding-header">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Pending Funding ({pendingFunding.length})
                    </p>
                    {pendingFunding.map((pf) => (
                      <div key={pf.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0" data-testid={`pending-funding-${pf.id}`}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-pending-sender-${pf.id}`}>{pf.senderName}</p>
                          <p className="text-xs text-muted-foreground">
                            {"\u20A6"}{parseFloat(pf.amount).toLocaleString()}
                            {pf.purpose ? ` \u00B7 ${pf.purpose}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={() => acceptFundingMutation.mutate(pf.id)}
                            disabled={acceptFundingMutation.isPending}
                            data-testid={`button-accept-funding-${pf.id}`}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => declineFundingMutation.mutate(pf.id)}
                            disabled={declineFundingMutation.isPending}
                            data-testid={`button-decline-funding-${pf.id}`}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Recipient (email, phone, or ZIBA ID)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email, phone, or ID"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setRecipient(null); }}
                    data-testid="input-funding-recipient"
                  />
                  <Button
                    variant="outline"
                    onClick={handleLookup}
                    disabled={lookupMutation.isPending || !identifier.trim()}
                    data-testid="button-lookup-recipient"
                  >
                    {lookupMutation.isPending ? "..." : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {lookupMutation.isPending && <Skeleton className="h-16 w-full" />}

              {recipient && (
                <Card>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={recipient.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10">{getInitials(recipient.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" data-testid="text-recipient-name">{recipient.displayName}</p>
                      <Badge variant="secondary" className="text-xs capitalize">{recipient.role}</Badge>
                    </div>
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Amount (\u20A6)</Label>
                <Input
                  type="number"
                  placeholder={`Min \u20A6${parseFloat(settings?.minAmount || "100").toLocaleString()}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!recipient}
                  data-testid="input-funding-amount"
                />
                {settings && (
                  <p className="text-xs text-muted-foreground">
                    Min: \u20A6{parseFloat(settings.minAmount).toLocaleString()} | Max: \u20A6{parseFloat(settings.maxAmount).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Purpose (optional)</Label>
                <Input
                  placeholder="e.g. Fuel support, trip assistance"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  data-testid="input-funding-purpose"
                />
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleProceed} disabled={!recipient || !amount} data-testid="button-proceed-funding">
                  Continue
                </Button>
                <Button variant="outline" onClick={() => setStep("history")} data-testid="button-funding-history">
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "confirm" && recipient && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Funding</DialogTitle>
              <DialogDescription>Review and confirm your wallet funding</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={recipient.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10">{getInitials(recipient.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium" data-testid="text-confirm-name">{recipient.displayName}</p>
                      <Badge variant="secondary" className="text-xs capitalize">{recipient.role}</Badge>
                    </div>
                  </div>
                  <div className="text-center py-3">
                    <p className="text-3xl font-bold" data-testid="text-confirm-amount">
                      {"\u20A6"}{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {purpose && (
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-muted-foreground">Purpose</span>
                      <span className="text-sm" data-testid="text-confirm-purpose">{purpose}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 flex gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Funds added cannot be reversed and can only be used within ZIBA. ZIBA facilitates wallet funding between users. Funds are non-refundable and ZIBA does not guarantee services or outcomes.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="disclaimer"
                  checked={disclaimerAccepted}
                  onCheckedChange={(v) => setDisclaimerAccepted(v === true)}
                  data-testid="checkbox-disclaimer"
                />
                <label htmlFor="disclaimer" className="text-sm text-muted-foreground cursor-pointer leading-tight">
                  I understand that this funding is voluntary, non-refundable, and can only be used within ZIBA. ZIBA is not a bank and bears no responsibility for disputes.
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("form")} data-testid="button-back-to-form">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirm}
                  disabled={!disclaimerAccepted || fundMutation.isPending}
                  data-testid="button-confirm-funding"
                >
                  {fundMutation.isPending ? "Processing..." : "Confirm & Send"}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle>Funding Successful</DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4 py-6">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-success-amount">
                  {"\u20A6"}{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-muted-foreground mt-1" data-testid="text-success-recipient">
                  sent to {recipient?.displayName}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                The recipient has been notified. Funds will be credited once they accept.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => { resetToForm(); }} data-testid="button-fund-again">
                  Fund Another
                </Button>
                <Button onClick={resetAndClose} data-testid="button-done-funding">
                  Done
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "history" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Funding History
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto">
              <Button variant="ghost" size="sm" onClick={() => setStep("form")} data-testid="button-back-from-history">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>

              {!history && <Skeleton className="h-20 w-full" />}

              {history && history.sent.length === 0 && history.received.length === 0 && (
                <p className="text-center text-muted-foreground py-6 text-sm">No funding transactions yet</p>
              )}

              {history && history.sent.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Sent</p>
                  {history.sent.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 p-2 rounded-md border">
                      <ArrowUpRight className="h-4 w-4 text-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">To {tx.recipientName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                      </div>
                      <p className="font-medium text-sm text-red-500">-{"\u20A6"}{parseFloat(tx.amount).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {history && history.received.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Received</p>
                  {history.received.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 p-2 rounded-md border">
                      <ArrowDownLeft className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">From {tx.senderName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                      </div>
                      <p className="font-medium text-sm text-emerald-500">+{"\u20A6"}{parseFloat(tx.amount).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
