import { useState } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ChevronLeft, Heart, Banknote, Calendar, FileText } from "lucide-react";

interface ReliefFundClaim {
  id: number;
  accidentReportId: number;
  requestedAmount: number;
  approvedAmount?: number;
  expectedPayoutDate?: string;
  status: string;
  createdAt: string;
}

const CLAIM_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  approved: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  paid: "bg-green-500/15 text-green-700 dark:text-green-400",
  denied: "bg-red-500/15 text-red-700 dark:text-red-400",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DriverReliefFundPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({
    accidentReportId: "",
    requestedAmount: "",
  });

  const { data: claims, isLoading } = useQuery<ReliefFundClaim[]>({
    queryKey: ["/api/relief-fund/my-claims"],
  });

  const submitClaimMutation = useMutation({
    mutationFn: async (data: { accidentReportId: string; requestedAmount: string }) => {
      const res = await apiRequest("POST", "/api/relief-fund/claims", {
        accidentReportId: data.accidentReportId,
        requestedAmount: parseFloat(data.requestedAmount),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relief-fund/my-claims"] });
      toast({ title: "Claim submitted", description: "Your relief fund claim has been submitted for review." });
      setSubmitDialogOpen(false);
      setClaimForm({ accidentReportId: "", requestedAmount: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit claim", description: error.message, variant: "destructive" });
    },
  });

  function handleSubmitClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!claimForm.accidentReportId || !claimForm.requestedAmount) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    submitClaimMutation.mutate(claimForm);
  }

  return (
    <DriverLayout>
      <div className="p-4 space-y-4" data-testid="relief-fund-page">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/driver/dashboard")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            <h1 className="text-xl font-bold" data-testid="text-relief-fund-title">Accident Relief Fund</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground" data-testid="text-relief-fund-description">
          The relief fund supports drivers who have been involved in verified accidents. Claims are reviewed by our admin team.
        </p>

        <Button
          onClick={() => setSubmitDialogOpen(true)}
          data-testid="button-submit-claim"
        >
          Submit Claim
        </Button>

        {isLoading ? (
          <div className="space-y-4" data-testid="loading-skeleton">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !claims || claims.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No relief fund claims"
            description="You haven't submitted any relief fund claims yet. Submit a claim if you were involved in a verified accident."
          />
        ) : (
          <div className="space-y-3" data-testid="claims-list">
            {claims.map((claim) => (
              <Card key={claim.id} data-testid={`card-claim-${claim.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="font-medium text-sm" data-testid={`text-claim-report-${claim.id}`}>
                        Accident Report #{claim.accidentReportId}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-claim-amount-${claim.id}`}>
                        <Banknote className="h-3 w-3" />
                        Requested: {"\u20A6"}{Number(claim.requestedAmount).toFixed(2)}
                      </p>
                      {claim.approvedAmount != null && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-claim-approved-${claim.id}`}>
                          <Banknote className="h-3 w-3" />
                          Approved: {"\u20A6"}{Number(claim.approvedAmount).toFixed(2)}
                        </p>
                      )}
                      {claim.expectedPayoutDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-claim-payout-date-${claim.id}`}>
                          <Calendar className="h-3 w-3" />
                          Expected Payout: {new Date(claim.expectedPayoutDate).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-claim-date-${claim.id}`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(claim.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className={CLAIM_STATUS_COLORS[claim.status] || CLAIM_STATUS_COLORS.pending}
                      data-testid={`badge-claim-status-${claim.id}`}
                    >
                      {formatStatus(claim.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent data-testid="dialog-submit-claim">
          <DialogHeader>
            <DialogTitle data-testid="text-submit-claim-title">Submit Relief Fund Claim</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitClaim} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accident-report-id">Accident Report ID</Label>
              <Input
                id="accident-report-id"
                placeholder="Enter accident report ID"
                value={claimForm.accidentReportId}
                onChange={(e) => setClaimForm({ ...claimForm, accidentReportId: e.target.value })}
                data-testid="input-accident-report-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requested-amount">Requested Amount ($)</Label>
              <Input
                id="requested-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={claimForm.requestedAmount}
                onChange={(e) => setClaimForm({ ...claimForm, requestedAmount: e.target.value })}
                data-testid="input-requested-amount"
              />
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmitDialogOpen(false)}
                data-testid="button-cancel-claim"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitClaimMutation.isPending}
                data-testid="button-confirm-submit-claim"
              >
                {submitClaimMutation.isPending ? "Submitting..." : "Submit Claim"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DriverLayout>
  );
}
