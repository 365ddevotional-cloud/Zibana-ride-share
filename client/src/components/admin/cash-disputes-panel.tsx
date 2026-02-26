import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  UserCheck,
  UserX,
  Scale
} from "lucide-react";
import { API_BASE } from "@/lib/apiBase";

interface CashDispute {
  id: string;
  tripId: string;
  riderId: string;
  driverId: string;
  disputeType: string;
  riderClaimed: boolean;
  driverClaimed: boolean;
  status: string;
  adminReviewedBy: string | null;
  adminNotes: string | null;
  resolution: string | null;
  temporaryCreditAmount: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export function CashDisputesPanel() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [selectedDispute, setSelectedDispute] = useState<CashDispute | null>(null);
  const [resolution, setResolution] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState("");
  const [reinstateRiderId, setReinstateRiderId] = useState<string | null>(null);
  const [restrictRiderId, setRestrictRiderId] = useState<string | null>(null);
  const [restrictReason, setRestrictReason] = useState("");

  const { data: disputes = [], isLoading } = useQuery<CashDispute[]>({
    queryKey: ["/api/admin/cash-disputes", statusFilter],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/cash-disputes?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (disputeId: string) =>
      apiRequest("POST", `/api/admin/cash-disputes/${disputeId}/resolve`, {
        resolution,
        adminNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cash-disputes"] });
      setSelectedDispute(null);
      setResolution("");
      setAdminNotes("");
      toast({ title: "Dispute resolved", description: "The dispute has been resolved." });
    },
    onError: () => {
      toast({ title: "Failed to resolve", description: "Please try again.", variant: "destructive" });
    },
  });

  const reinstateMutation = useMutation({
    mutationFn: (riderId: string) =>
      apiRequest("POST", `/api/admin/riders/${riderId}/reinstate-cash`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cash-disputes"] });
      setReinstateRiderId(null);
      toast({ title: "Cash access reinstated", description: "Rider can use cash payments again." });
    },
    onError: () => {
      toast({ title: "Failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const restrictMutation = useMutation({
    mutationFn: (riderId: string) =>
      apiRequest("POST", `/api/admin/riders/${riderId}/restrict-cash`, { reason: restrictReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cash-disputes"] });
      setRestrictRiderId(null);
      setRestrictReason("");
      toast({ title: "Cash access restricted", description: "Rider cash payments have been restricted." });
    },
    onError: () => {
      toast({ title: "Failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const getDisputeTypeLabel = (type: string) => {
    switch (type) {
      case "rider_paid_driver_disputes":
        return "Driver disputes payment";
      case "driver_confirmed_rider_disputes":
        return "Rider disputes confirmation";
      default:
        return type;
    }
  };

  const getResolutionBadge = (res: string | null) => {
    switch (res) {
      case "rider_at_fault":
        return <Badge variant="destructive">Rider at fault</Badge>;
      case "driver_at_fault":
        return <Badge variant="destructive">Driver at fault</Badge>;
      case "inconclusive":
        return <Badge variant="secondary">Inconclusive</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Cash Trip Disputes
            </CardTitle>
            <CardDescription>
              Review and resolve disputes between riders and drivers on cash trips
            </CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="select-dispute-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading disputes...</p>
          ) : disputes.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No disputes found"
              description={`No ${statusFilter === "all" ? "" : statusFilter} cash trip disputes.`}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rider</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Temp. Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={dispute.id} data-testid={`row-dispute-${dispute.id}`}>
                    <TableCell className="font-mono text-xs">
                      {dispute.tripId.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getDisputeTypeLabel(dispute.disputeType)}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {dispute.riderId.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {dispute.driverId.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {dispute.temporaryCreditAmount
                        ? `$${parseFloat(dispute.temporaryCreditAmount).toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {dispute.status === "open" ? (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Open
                        </Badge>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Resolved
                          </Badge>
                          {getResolutionBadge(dispute.resolution)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {dispute.status === "open" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setResolution("");
                              setAdminNotes("");
                            }}
                            data-testid={`button-resolve-${dispute.id}`}
                          >
                            <Scale className="h-3 w-3 mr-1" />
                            Resolve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReinstateRiderId(dispute.riderId)}
                          data-testid={`button-reinstate-${dispute.id}`}
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Reinstate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRestrictRiderId(dispute.riderId);
                            setRestrictReason("");
                          }}
                          data-testid={`button-restrict-${dispute.id}`}
                        >
                          <UserX className="h-3 w-3 mr-1" />
                          Restrict
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDispute} onOpenChange={(open) => { if (!open) setSelectedDispute(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Cash Dispute</DialogTitle>
            <DialogDescription>
              {selectedDispute && (
                <>
                  {getDisputeTypeLabel(selectedDispute.disputeType)} for trip {selectedDispute.tripId.slice(0, 8)}...
                  {selectedDispute.temporaryCreditAmount && (
                    <span className="block mt-1">
                      Temporary credit issued: ${parseFloat(selectedDispute.temporaryCreditAmount).toFixed(2)}
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Resolution</label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger data-testid="select-resolution">
                  <SelectValue placeholder="Choose resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rider_at_fault">Rider at fault</SelectItem>
                  <SelectItem value="driver_at_fault">Driver at fault</SelectItem>
                  <SelectItem value="inconclusive">Inconclusive</SelectItem>
                </SelectContent>
              </Select>
              {resolution === "rider_at_fault" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Rider's cash access will remain restricted.
                </p>
              )}
              {(resolution === "driver_at_fault" || resolution === "inconclusive") && (
                <p className="text-xs text-muted-foreground mt-1">
                  Rider's cash access will be reinstated.
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Admin Notes</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this resolution..."
                data-testid="input-admin-notes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedDispute && resolveMutation.mutate(selectedDispute.id)}
              disabled={!resolution || resolveMutation.isPending}
              data-testid="button-submit-resolution"
            >
              {resolveMutation.isPending ? "Resolving..." : "Resolve Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reinstateRiderId} onOpenChange={(open) => { if (!open) setReinstateRiderId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reinstate Cash Access</DialogTitle>
            <DialogDescription>
              This will allow the rider to use cash payments again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReinstateRiderId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => reinstateRiderId && reinstateMutation.mutate(reinstateRiderId)}
              disabled={reinstateMutation.isPending}
              data-testid="button-confirm-reinstate"
            >
              {reinstateMutation.isPending ? "Reinstating..." : "Reinstate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!restrictRiderId} onOpenChange={(open) => { if (!open) setRestrictRiderId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restrict Cash Access</DialogTitle>
            <DialogDescription>
              This will prevent the rider from using cash payments.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium">Reason</label>
            <Textarea
              value={restrictReason}
              onChange={(e) => setRestrictReason(e.target.value)}
              placeholder="Reason for restricting cash access..."
              data-testid="input-restrict-reason"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRestrictRiderId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => restrictRiderId && restrictMutation.mutate(restrictRiderId)}
              disabled={!restrictReason || restrictMutation.isPending}
              data-testid="button-confirm-restrict"
            >
              {restrictMutation.isPending ? "Restricting..." : "Restrict Cash Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
