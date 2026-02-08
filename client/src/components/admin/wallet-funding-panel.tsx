import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, AlertTriangle, Settings, Filter } from "lucide-react";

interface FundingTx {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  amount: string;
  currency: string;
  status: string;
  senderRole: string;
  receiverRole: string;
  flagged: boolean;
  flagReason: string | null;
  createdAt: string;
  senderName: string;
  receiverName: string;
}

interface FundingSettings {
  id: string;
  dailyLimit: string;
  monthlyLimit: string;
  minAmount: string;
  maxAmount: string;
  selfFundingAllowed: boolean;
  repeatFundingThreshold: number;
  isEnabled: boolean;
}

export function WalletFundingPanel() {
  const { toast } = useToast();
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { data: transactions, isLoading: txLoading } = useQuery<FundingTx[]>({
    queryKey: ["/api/admin/wallet-funding/transactions", showFlaggedOnly ? "flagged" : "all"],
    queryFn: async () => {
      const url = showFlaggedOnly
        ? "/api/admin/wallet-funding/transactions?flagged=true"
        : "/api/admin/wallet-funding/transactions";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<FundingSettings>({
    queryKey: ["/api/admin/wallet-funding/settings"],
  });

  const settingsMutation = useMutation({
    mutationFn: async (updates: Partial<FundingSettings>) => {
      const res = await apiRequest("PUT", "/api/admin/wallet-funding/settings", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-funding/settings"] });
      toast({ title: "Settings updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    },
  });

  const flaggedCount = transactions?.filter(t => t.flagged).length || 0;

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Send className="h-5 w-5" />
            Wallet Funding Transactions
          </h2>
          <p className="text-sm text-muted-foreground">View all peer-to-peer wallet funding activity</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFlaggedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
            data-testid="button-filter-flagged"
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Flagged {flaggedCount > 0 && `(${flaggedCount})`}
          </Button>
          <Button
            variant={showSettings ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            data-testid="button-toggle-settings"
          >
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {showSettings && settings && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Funding Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Feature Enabled</Label>
              <Switch
                checked={settings.isEnabled}
                onCheckedChange={(v) => settingsMutation.mutate({ isEnabled: v })}
                data-testid="switch-funding-enabled"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Daily Limit</Label>
                <Input
                  type="number"
                  defaultValue={settings.dailyLimit}
                  onBlur={(e) => settingsMutation.mutate({ dailyLimit: e.target.value })}
                  data-testid="input-daily-limit"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Monthly Limit</Label>
                <Input
                  type="number"
                  defaultValue={settings.monthlyLimit}
                  onBlur={(e) => settingsMutation.mutate({ monthlyLimit: e.target.value })}
                  data-testid="input-monthly-limit"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Min Amount</Label>
                <Input
                  type="number"
                  defaultValue={settings.minAmount}
                  onBlur={(e) => settingsMutation.mutate({ minAmount: e.target.value })}
                  data-testid="input-min-amount"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Amount</Label>
                <Input
                  type="number"
                  defaultValue={settings.maxAmount}
                  onBlur={(e) => settingsMutation.mutate({ maxAmount: e.target.value })}
                  data-testid="input-max-amount"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Allow Self-Funding</Label>
              <Switch
                checked={settings.selfFundingAllowed}
                onCheckedChange={(v) => settingsMutation.mutate({ selfFundingAllowed: v })}
                data-testid="switch-self-funding"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Repeat Funding Flag Threshold</Label>
              <Input
                type="number"
                defaultValue={settings.repeatFundingThreshold}
                onBlur={(e) => settingsMutation.mutate({ repeatFundingThreshold: parseInt(e.target.value) || 5 })}
                data-testid="input-repeat-threshold"
              />
              <p className="text-xs text-muted-foreground">Flag transactions when a user funds the same recipient more than this many times</p>
            </div>
          </CardContent>
        </Card>
      )}

      {txLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !transactions || transactions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Send className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No funding transactions{showFlaggedOnly ? " flagged" : ""} yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-funding-${tx.id}`}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[120px]">{tx.senderName}</p>
                          <Badge variant="secondary" className="text-xs capitalize">{tx.senderRole}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[120px]">{tx.receiverName}</p>
                          <Badge variant="secondary" className="text-xs capitalize">{tx.receiverRole}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{"\u20A6"}{parseFloat(tx.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === "completed" ? "default" : "destructive"} className="text-xs">
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tx.flagged ? (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={tx.flagReason || ""}>
                              {tx.flagReason || "Flagged"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
