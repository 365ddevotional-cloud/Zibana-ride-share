import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Briefcase,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Ban,
  DollarSign,
  Shield,
  RefreshCw
} from "lucide-react";
import type { CashSettlementLedger } from "@shared/schema";

interface AbuseFlag {
  driverId: string;
  flagged: boolean;
  consecutiveCashTrips: number;
  totalDeferredBalance: number;
  deferredBalanceCap: number;
  reasons: string[];
}

export function CashSettlementPanel() {
  const { toast } = useToast();
  const [selectedLedger, setSelectedLedger] = useState<CashSettlementLedger | null>(null);
  const [actionType, setActionType] = useState<"defer" | "waive" | "settle" | null>(null);
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const { data: pendingLedgers = [], isLoading: ledgersLoading } = useQuery<CashSettlementLedger[]>({
    queryKey: ["/api/admin/cash-settlements"],
  });

  const { data: abuseFlags = [], isLoading: flagsLoading } = useQuery<AbuseFlag[]>({
    queryKey: ["/api/admin/cash-abuse-flags"],
  });

  const deferMutation = useMutation({
    mutationFn: async ({ ledgerId, notes }: { ledgerId: string; notes: string }) => {
      return apiRequest("POST", `/api/admin/cash-settlements/${ledgerId}/defer`, { adminNotes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cash-settlements"] });
      toast({ title: "Ledger entry deferred" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to defer", variant: "destructive" });
    },
  });

  const waiveMutation = useMutation({
    mutationFn: async ({ ledgerId, reason }: { ledgerId: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/cash-settlements/${ledgerId}/waive`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cash-settlements"] });
      toast({ title: "Ledger entry waived" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to waive", variant: "destructive" });
    },
  });

  const settleMutation = useMutation({
    mutationFn: async ({ ledgerId }: { ledgerId: string }) => {
      return apiRequest("POST", `/api/admin/cash-settlements/${ledgerId}/settle`, { method: "admin_manual" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cash-settlements"] });
      toast({ title: "Settlement executed" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to settle", variant: "destructive" });
    },
  });

  function closeDialog() {
    setSelectedLedger(null);
    setActionType(null);
    setReason("");
    setAdminNotes("");
  }

  function handleAction() {
    if (!selectedLedger || !actionType) return;
    if (actionType === "defer") {
      deferMutation.mutate({ ledgerId: selectedLedger.id, notes: adminNotes });
    } else if (actionType === "waive") {
      if (!reason.trim()) {
        toast({ title: "Please provide a reason for waiving", variant: "destructive" });
        return;
      }
      waiveMutation.mutate({ ledgerId: selectedLedger.id, reason });
    } else if (actionType === "settle") {
      settleMutation.mutate({ ledgerId: selectedLedger.id });
    }
  }

  const isPending = deferMutation.isPending || waiveMutation.isPending || settleMutation.isPending;

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>;
      case "settled":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Settled</Badge>;
      case "deferred":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Deferred</Badge>;
      case "waived":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Waived</Badge>;
      case "partially_settled":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Partial</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  function formatDate(d: string | Date | null | undefined) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function formatCurrency(amount: string | number | null | undefined, currency = "NGN") {
    const val = parseFloat(String(amount || "0"));
    return `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }

  return (
    <div className="space-y-6">
      {abuseFlags.length > 0 && (
        <Card data-testid="card-abuse-flags">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Flagged Drivers ({abuseFlags.length})
            </CardTitle>
            <CardDescription>
              Drivers flagged for high cash-trip concentration or deferred balances
            </CardDescription>
          </CardHeader>
          <CardContent>
            {flagsLoading ? (
              <div className="py-4 text-center text-muted-foreground">Loading flags...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver ID</TableHead>
                      <TableHead>Consecutive Cash Trips</TableHead>
                      <TableHead>Deferred Balance</TableHead>
                      <TableHead>Balance Cap</TableHead>
                      <TableHead>Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abuseFlags.map((flag) => (
                      <TableRow key={flag.driverId} data-testid={`row-abuse-${flag.driverId}`}>
                        <TableCell className="font-mono text-sm">{flag.driverId.slice(0, 8)}...</TableCell>
                        <TableCell>{flag.consecutiveCashTrips}</TableCell>
                        <TableCell>{formatCurrency(flag.totalDeferredBalance)}</TableCell>
                        <TableCell>{formatCurrency(flag.deferredBalanceCap)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {flag.reasons.map((r, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-settlement-ledger">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Cash Settlement Ledger
          </CardTitle>
          <CardDescription>
            Period-based cash trip settlement management. Review, defer, waive, or manually settle driver ledger entries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ledgersLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading settlement ledger...</div>
          ) : pendingLedgers.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No pending settlements"
              description="All cash trip settlements are up to date"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Cash Collected</TableHead>
                    <TableHead>Platform Share</TableHead>
                    <TableHead>Settled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLedgers.map((ledger) => {
                    const remaining = parseFloat(String(ledger.totalPlatformShareDue || "0")) - parseFloat(String(ledger.totalSettled || "0"));
                    return (
                      <TableRow key={ledger.id} data-testid={`row-ledger-${ledger.id}`}>
                        <TableCell className="font-mono text-sm">{ledger.driverId.slice(0, 8)}...</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(ledger.periodStart)} - {formatDate(ledger.periodEnd)}
                        </TableCell>
                        <TableCell>{formatCurrency(ledger.totalCashCollected, ledger.currencyCode)}</TableCell>
                        <TableCell>{formatCurrency(ledger.totalPlatformShareDue, ledger.currencyCode)}</TableCell>
                        <TableCell>{formatCurrency(ledger.totalSettled, ledger.currencyCode)}</TableCell>
                        <TableCell>{getStatusBadge(ledger.settlementStatus)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {ledger.settlementStatus === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setSelectedLedger(ledger); setActionType("settle"); }}
                                  data-testid={`button-settle-${ledger.id}`}
                                >
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Settle
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setSelectedLedger(ledger); setActionType("defer"); }}
                                  data-testid={`button-defer-${ledger.id}`}
                                >
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  Defer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setSelectedLedger(ledger); setActionType("waive"); }}
                                  data-testid={`button-waive-${ledger.id}`}
                                >
                                  <Ban className="h-3 w-3 mr-1" />
                                  Waive
                                </Button>
                              </>
                            )}
                            {ledger.settlementStatus === "deferred" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setSelectedLedger(ledger); setActionType("settle"); }}
                                data-testid={`button-settle-deferred-${ledger.id}`}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Settle Now
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!actionType && !!selectedLedger} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "defer" && "Defer Settlement"}
              {actionType === "waive" && "Waive Settlement"}
              {actionType === "settle" && "Execute Settlement"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "defer" && "Defer this settlement period to the next cycle. The balance will carry forward."}
              {actionType === "waive" && "Waive the platform share for this period. This action is logged and cannot be undone."}
              {actionType === "settle" && "Manually settle the outstanding platform share for this period."}
            </DialogDescription>
          </DialogHeader>
          {selectedLedger && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Period</span>
                  <p className="font-medium">{formatDate(selectedLedger.periodStart)} - {formatDate(selectedLedger.periodEnd)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Platform Share Due</span>
                  <p className="font-medium">{formatCurrency(selectedLedger.totalPlatformShareDue, selectedLedger.currencyCode)}</p>
                </div>
              </div>
              {actionType === "waive" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason (required)</label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this settlement is being waived..."
                    data-testid="input-waive-reason"
                  />
                </div>
              )}
              {actionType === "defer" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Notes (optional)</label>
                  <Input
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Optional notes..."
                    data-testid="input-defer-notes"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={isPending} data-testid="button-confirm-action">
              {isPending ? "Processing..." : actionType === "defer" ? "Defer" : actionType === "waive" ? "Waive" : "Settle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
