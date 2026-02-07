import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { Banknote, CheckCircle, AlertTriangle, Clock, Search } from "lucide-react";

interface BankTransferItem {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole: string;
  amount: string;
  currency: string;
  referenceCode: string;
  bankName: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  completedAt: string | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>;
    case "processing":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Processing</Badge>;
    case "completed":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "flagged":
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Flagged</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: string | number, currency = "NGN") {
  const val = parseFloat(String(amount || "0"));
  return `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export function BankTransfersPanel() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagTransferId, setFlagTransferId] = useState<string | null>(null);
  const [flagNotes, setFlagNotes] = useState("");

  const queryUrl = statusFilter === "all"
    ? "/api/admin/bank-transfers"
    : `/api/admin/bank-transfers?status=${statusFilter}`;

  const { data: transfers = [], isLoading } = useQuery<BankTransferItem[]>({
    queryKey: ["/api/admin/bank-transfers", statusFilter],
    queryFn: async () => {
      const res = await apiRequest("GET", queryUrl);
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/bank-transfers/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bank-transfers"] });
      toast({ title: "Transfer approved successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to approve transfer", description: err.message, variant: "destructive" });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes: string }) => {
      return apiRequest("POST", `/api/admin/bank-transfers/${id}/flag`, { adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bank-transfers"] });
      toast({ title: "Transfer flagged for review" });
      closeFlagDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to flag transfer", description: err.message, variant: "destructive" });
    },
  });

  function openFlagDialog(transferId: string) {
    setFlagTransferId(transferId);
    setFlagNotes("");
    setFlagDialogOpen(true);
  }

  function closeFlagDialog() {
    setFlagDialogOpen(false);
    setFlagTransferId(null);
    setFlagNotes("");
  }

  function handleFlagSubmit() {
    if (!flagTransferId) return;
    if (!flagNotes.trim()) {
      toast({ title: "Please provide admin notes", variant: "destructive" });
      return;
    }
    flagMutation.mutate({ id: flagTransferId, adminNotes: flagNotes });
  }

  const pendingTransfers = transfers.filter((t) => t.status === "pending");
  const totalPendingAmount = pendingTransfers.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);
  const today = new Date().toDateString();
  const completedToday = transfers.filter(
    (t) => t.status === "completed" && t.completedAt && new Date(t.completedAt).toDateString() === today
  );

  const canActOn = (status: string) => status === "pending" || status === "processing";

  return (
    <div className="space-y-6" data-testid="bank-transfers-panel">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card data-testid="card-pending-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Transfers</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-count">{pendingTransfers.length}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-pending-amount">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Amount</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-amount">
              {formatCurrency(totalPendingAmount)}
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-completed-today">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-today">{completedToday.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-transfers-table">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Bank Transfers
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading transfers...</div>
          ) : transfers.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No transfers found"
              description={statusFilter === "all" ? "No bank transfers have been submitted yet" : `No ${statusFilter} transfers found`}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-bank-transfers">
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference Code</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id} data-testid={`row-transfer-${transfer.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`text-ref-${transfer.id}`}>
                        {transfer.referenceCode}
                      </TableCell>
                      <TableCell data-testid={`text-user-${transfer.id}`}>
                        <div>
                          <div className="font-medium">{transfer.userName || "Unknown"}</div>
                          {transfer.userEmail && (
                            <div className="text-xs text-muted-foreground">{transfer.userEmail}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-amount-${transfer.id}`}>
                        {formatCurrency(transfer.amount, transfer.currency)}
                      </TableCell>
                      <TableCell data-testid={`text-currency-${transfer.id}`}>
                        {transfer.currency}
                      </TableCell>
                      <TableCell data-testid={`badge-status-${transfer.id}`}>
                        {getStatusBadge(transfer.status)}
                      </TableCell>
                      <TableCell data-testid={`text-date-${transfer.id}`}>
                        {formatDate(transfer.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canActOn(transfer.status) && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveMutation.mutate(transfer.id)}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${transfer.id}`}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openFlagDialog(transfer.id)}
                                disabled={flagMutation.isPending}
                                data-testid={`button-flag-${transfer.id}`}
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Flag
                              </Button>
                            </>
                          )}
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

      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent data-testid="dialog-flag-transfer">
          <DialogHeader>
            <DialogTitle>Flag Transfer for Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter admin notes explaining why this transfer is being flagged..."
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
              rows={4}
              data-testid="textarea-flag-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeFlagDialog} data-testid="button-cancel-flag">
              Cancel
            </Button>
            <Button
              onClick={handleFlagSubmit}
              disabled={flagMutation.isPending}
              data-testid="button-submit-flag"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Flag Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
