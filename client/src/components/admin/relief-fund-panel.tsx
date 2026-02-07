import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, Heart, FileText, Plus } from "lucide-react";

interface FundConfig {
  totalPool: string;
  cancellationFeePercent: string;
  lostItemFeePercent: string;
  minTrustScoreRequired: number;
  maxPayoutPerClaim: string;
}

interface ReliefClaim {
  id: string;
  driverId: string;
  accidentReportId?: string;
  requestedAmount: string;
  approvedAmount?: string;
  status: string;
  faultDetermination?: string;
  reviewNotes?: string;
  expectedPayoutDate?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Contribution {
  id: string;
  amount: string;
  notes?: string;
  contributedBy?: string;
  createdAt: string;
}

function claimStatusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "approved":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "paid":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    case "denied":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default:
      return "";
  }
}

function faultBadgeClass(fault: string): string {
  switch (fault) {
    case "not_at_fault":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    case "shared_fault":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "at_fault":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default:
      return "";
  }
}

export function ReliefFundPanel() {
  const { toast } = useToast();
  const [editConfigOpen, setEditConfigOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [reviewClaimOpen, setReviewClaimOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ReliefClaim | null>(null);

  const [configCancellationFeePercent, setConfigCancellationFeePercent] = useState("");
  const [configLostItemFeePercent, setConfigLostItemFeePercent] = useState("");
  const [configMinTrustScore, setConfigMinTrustScore] = useState("");
  const [configMaxPayout, setConfigMaxPayout] = useState("");

  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNotes, setTopUpNotes] = useState("");

  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewApprovedAmount, setReviewApprovedAmount] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewFault, setReviewFault] = useState("");
  const [reviewPayoutDate, setReviewPayoutDate] = useState("");

  const { data: config, isLoading: configLoading } = useQuery<FundConfig>({
    queryKey: ["/api/admin/relief-fund/config"],
  });

  const { data: claims, isLoading: claimsLoading } = useQuery<ReliefClaim[]>({
    queryKey: ["/api/admin/relief-fund/claims"],
  });

  const { data: contributions, isLoading: contributionsLoading } = useQuery<Contribution[]>({
    queryKey: ["/api/admin/relief-fund/contributions"],
  });

  const updateConfigMutation = useMutation({
    mutationFn: (body: Partial<FundConfig>) =>
      apiRequest("POST", "/api/admin/relief-fund/config", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/relief-fund/config"] });
      setEditConfigOpen(false);
      toast({ title: "Fund configuration updated" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const contributeMutation = useMutation({
    mutationFn: (body: { amount: string; notes?: string }) =>
      apiRequest("POST", "/api/admin/relief-fund/contribute", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/relief-fund/contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/relief-fund/config"] });
      setTopUpOpen(false);
      setTopUpAmount("");
      setTopUpNotes("");
      toast({ title: "Fund topped up successfully" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const reviewClaimMutation = useMutation({
    mutationFn: ({ id, ...body }: {
      id: string;
      status: string;
      approvedAmount?: string;
      reviewNotes?: string;
      faultDetermination?: string;
      expectedPayoutDate?: string;
    }) => apiRequest("PATCH", `/api/admin/relief-fund/claims/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/relief-fund/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/relief-fund/config"] });
      setReviewClaimOpen(false);
      setSelectedClaim(null);
      toast({ title: "Claim reviewed successfully" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openEditConfig = () => {
    if (config) {
      setConfigCancellationFeePercent(config.cancellationFeePercent);
      setConfigLostItemFeePercent(config.lostItemFeePercent);
      setConfigMinTrustScore(String(config.minTrustScoreRequired));
      setConfigMaxPayout(config.maxPayoutPerClaim);
    }
    setEditConfigOpen(true);
  };

  const handleSaveConfig = () => {
    updateConfigMutation.mutate({
      cancellationFeePercent: configCancellationFeePercent || undefined,
      lostItemFeePercent: configLostItemFeePercent || undefined,
      minTrustScoreRequired: configMinTrustScore ? Number(configMinTrustScore) : undefined,
      maxPayoutPerClaim: configMaxPayout || undefined,
    });
  };

  const handleTopUp = () => {
    if (!topUpAmount) {
      toast({ title: "Amount is required", variant: "destructive" });
      return;
    }
    contributeMutation.mutate({
      amount: topUpAmount,
      notes: topUpNotes || undefined,
    });
  };

  const openReviewClaim = (claim: ReliefClaim) => {
    setSelectedClaim(claim);
    setReviewStatus(claim.status);
    setReviewApprovedAmount(claim.approvedAmount || "");
    setReviewNotes(claim.reviewNotes || "");
    setReviewFault(claim.faultDetermination || "");
    setReviewPayoutDate(claim.expectedPayoutDate || "");
    setReviewClaimOpen(true);
  };

  const handleReviewSubmit = () => {
    if (!selectedClaim || !reviewStatus) return;
    reviewClaimMutation.mutate({
      id: selectedClaim.id,
      status: reviewStatus,
      approvedAmount: reviewApprovedAmount || undefined,
      reviewNotes: reviewNotes || undefined,
      faultDetermination: reviewFault || undefined,
      expectedPayoutDate: reviewPayoutDate || undefined,
    });
  };

  return (
    <div className="space-y-6" data-testid="relief-fund-panel">
      <div>
        <h2 className="text-xl font-semibold text-foreground" data-testid="text-relief-fund-title">
          Driver Accident Relief Fund
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage the relief fund pool, claims, and contributions
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg" data-testid="text-fund-config-title">
            <Heart className="inline h-5 w-5 mr-2 text-red-500" />
            Fund Configuration
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setTopUpOpen(true)} data-testid="button-top-up-fund">
              <Plus className="h-4 w-4 mr-2" />
              Top Up Fund
            </Button>
            <Button variant="outline" onClick={openEditConfig} data-testid="button-edit-config">
              <FileText className="h-4 w-4 mr-2" />
              Edit Config
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {configLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : config ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Pool</p>
                <p className="text-lg font-semibold" data-testid="text-total-pool">
                  <DollarSign className="inline h-4 w-4" />{config.totalPool}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Cancellation Fee %</p>
                <p className="text-lg font-semibold" data-testid="text-cancellation-fee-percent">
                  {config.cancellationFeePercent}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Lost Item Fee %</p>
                <p className="text-lg font-semibold" data-testid="text-lost-item-fee-percent">
                  {config.lostItemFeePercent}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Min Trust Score</p>
                <p className="text-lg font-semibold" data-testid="text-min-trust-score">
                  {config.minTrustScoreRequired}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Max Payout/Claim</p>
                <p className="text-lg font-semibold" data-testid="text-max-payout">
                  <DollarSign className="inline h-4 w-4" />{config.maxPayoutPerClaim}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4" data-testid="text-no-config">
              No fund configuration found
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg" data-testid="text-claims-title">
            Relief Claims
          </CardTitle>
        </CardHeader>
        <CardContent>
          {claimsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !claims?.length ? (
            <div className="text-center py-8" data-testid="text-no-claims">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No relief claims found</p>
            </div>
          ) : (
            <Table data-testid="table-relief-claims">
              <TableHeader>
                <TableRow>
                  <TableHead>Driver ID</TableHead>
                  <TableHead>Accident Report</TableHead>
                  <TableHead>Requested Amount</TableHead>
                  <TableHead>Approved Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fault</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id} data-testid={`claim-row-${claim.id}`}>
                    <TableCell data-testid={`text-claim-driver-${claim.id}`}>
                      {claim.driverId?.slice(0, 8) || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`text-claim-report-${claim.id}`}>
                      {claim.accidentReportId?.slice(0, 8) || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`text-claim-requested-${claim.id}`}>
                      {claim.requestedAmount}
                    </TableCell>
                    <TableCell data-testid={`text-claim-approved-${claim.id}`}>
                      {claim.approvedAmount || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={claimStatusBadgeClass(claim.status)}
                        data-testid={`badge-claim-status-${claim.id}`}
                      >
                        {claim.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {claim.faultDetermination ? (
                        <Badge
                          variant="secondary"
                          className={faultBadgeClass(claim.faultDetermination)}
                          data-testid={`badge-claim-fault-${claim.id}`}
                        >
                          {claim.faultDetermination.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewClaim(claim)}
                        data-testid={`button-review-claim-${claim.id}`}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg" data-testid="text-contributions-title">
            Contributions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contributionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !contributions?.length ? (
            <div className="text-center py-8" data-testid="text-no-contributions">
              <DollarSign className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No contributions yet</p>
            </div>
          ) : (
            <Table data-testid="table-contributions">
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Contributed By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((c) => (
                  <TableRow key={c.id} data-testid={`contribution-row-${c.id}`}>
                    <TableCell data-testid={`text-contribution-amount-${c.id}`}>
                      {c.amount}
                    </TableCell>
                    <TableCell data-testid={`text-contribution-notes-${c.id}`}>
                      {c.notes || "—"}
                    </TableCell>
                    <TableCell data-testid={`text-contribution-by-${c.id}`}>
                      {c.contributedBy || "—"}
                    </TableCell>
                    <TableCell data-testid={`text-contribution-date-${c.id}`}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editConfigOpen} onOpenChange={setEditConfigOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-config">
          <DialogHeader>
            <DialogTitle>Edit Fund Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Cancellation Fee %</label>
              <Input
                value={configCancellationFeePercent}
                onChange={(e) => setConfigCancellationFeePercent(e.target.value)}
                placeholder="e.g. 5"
                data-testid="input-config-cancellation-fee"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Lost Item Fee %</label>
              <Input
                value={configLostItemFeePercent}
                onChange={(e) => setConfigLostItemFeePercent(e.target.value)}
                placeholder="e.g. 10"
                data-testid="input-config-lost-item-fee"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Min Trust Score Required</label>
              <Input
                value={configMinTrustScore}
                onChange={(e) => setConfigMinTrustScore(e.target.value)}
                placeholder="e.g. 70"
                data-testid="input-config-min-trust-score"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Payout Per Claim</label>
              <Input
                value={configMaxPayout}
                onChange={(e) => setConfigMaxPayout(e.target.value)}
                placeholder="e.g. 50000"
                data-testid="input-config-max-payout"
              />
            </div>
            <Button
              onClick={handleSaveConfig}
              disabled={updateConfigMutation.isPending}
              className="w-full"
              data-testid="button-save-config"
            >
              {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-top-up">
          <DialogHeader>
            <DialogTitle>Top Up Relief Fund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Enter amount"
                data-testid="input-top-up-amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={topUpNotes}
                onChange={(e) => setTopUpNotes(e.target.value)}
                placeholder="Optional notes..."
                data-testid="input-top-up-notes"
              />
            </div>
            <Button
              onClick={handleTopUp}
              disabled={contributeMutation.isPending}
              className="w-full"
              data-testid="button-submit-top-up"
            >
              {contributeMutation.isPending ? "Processing..." : "Contribute"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewClaimOpen} onOpenChange={setReviewClaimOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-review-claim">
          <DialogHeader>
            <DialogTitle>Review Claim</DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Driver ID</p>
                  <p className="font-medium" data-testid="text-review-driver-id">
                    {selectedClaim.driverId}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Requested Amount</p>
                  <p className="font-medium" data-testid="text-review-requested">
                    {selectedClaim.requestedAmount}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger data-testid="select-review-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Approved Amount</label>
                <Input
                  value={reviewApprovedAmount}
                  onChange={(e) => setReviewApprovedAmount(e.target.value)}
                  placeholder="Enter approved amount"
                  data-testid="input-review-approved-amount"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fault Determination</label>
                <Select value={reviewFault} onValueChange={setReviewFault}>
                  <SelectTrigger data-testid="select-review-fault">
                    <SelectValue placeholder="Select fault" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_at_fault">Not At Fault</SelectItem>
                    <SelectItem value="shared_fault">Shared Fault</SelectItem>
                    <SelectItem value="at_fault">At Fault</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Expected Payout Date</label>
                <Input
                  type="date"
                  value={reviewPayoutDate}
                  onChange={(e) => setReviewPayoutDate(e.target.value)}
                  data-testid="input-review-payout-date"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter review notes..."
                  data-testid="input-review-notes"
                />
              </div>
              <Button
                onClick={handleReviewSubmit}
                disabled={reviewClaimMutation.isPending}
                className="w-full"
                data-testid="button-submit-review"
              >
                {reviewClaimMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
