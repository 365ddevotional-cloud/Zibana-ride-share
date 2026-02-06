import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield, RotateCcw, Scale, Unlink } from "lucide-react";

interface DriverOverridesProps {
  driverId: string;
  driverName?: string;
  currentTrustScore?: number;
}

export function DriverOverrides({ driverId, driverName, currentTrustScore }: DriverOverridesProps) {
  const { toast } = useToast();
  const [trustScore, setTrustScore] = useState(currentTrustScore?.toString() || "75");
  const [overrideReason, setOverrideReason] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [disputeId, setDisputeId] = useState("");
  const [disputeResolution, setDisputeResolution] = useState("");
  const [blockedUserId, setBlockedUserId] = useState("");
  const [unblockReason, setUnblockReason] = useState("");

  const overrideTrustMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/driver/${driverId}/override-trust-score`, {
        trustScore: parseInt(trustScore),
        reason: overrideReason,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "Trust score updated", description: `Trust score set to ${trustScore}` });
      setOverrideReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetCancellationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/driver/${driverId}/reset-cancellation-metrics`, {
        reason: resetReason,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Cancellation metrics reset", description: "Override logged successfully" });
      setResetReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/driver/${driverId}/resolve-dispute`, {
        disputeId,
        resolution: disputeResolution,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Dispute resolved", description: `Dispute ${disputeId} resolved` });
      setDisputeId("");
      setDisputeResolution("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removePairingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/driver/${driverId}/remove-pairing-block`, {
        blockedUserId,
        reason: unblockReason,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pairing block removed" });
      setBlockedUserId("");
      setUnblockReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2" data-testid="text-driver-overrides-title">
        <Shield className="h-5 w-5" />
        Admin Overrides {driverName && `- ${driverName}`}
      </h3>

      <Card data-testid="card-override-trust">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Override Trust Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Trust Score (0-100)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={trustScore}
              onChange={(e) => setTrustScore(e.target.value)}
              data-testid="input-trust-score"
            />
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Why are you overriding the trust score?"
              data-testid="input-override-reason"
            />
          </div>
          <Button
            onClick={() => overrideTrustMutation.mutate()}
            disabled={!overrideReason || overrideTrustMutation.isPending}
            className="bg-emerald-600"
            data-testid="button-override-trust"
          >
            Update Trust Score
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-reset-cancellation">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Cancellation Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Reason</Label>
            <Textarea
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              placeholder="Why are you resetting cancellation metrics?"
              data-testid="input-reset-reason"
            />
          </div>
          <Button
            onClick={() => resetCancellationMutation.mutate()}
            disabled={!resetReason || resetCancellationMutation.isPending}
            variant="outline"
            data-testid="button-reset-cancellation"
          >
            Reset Metrics
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-resolve-dispute">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Resolve Dispute
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Dispute ID</Label>
            <Input
              value={disputeId}
              onChange={(e) => setDisputeId(e.target.value)}
              placeholder="Enter dispute ID"
              data-testid="input-dispute-id"
            />
          </div>
          <div>
            <Label>Resolution</Label>
            <Textarea
              value={disputeResolution}
              onChange={(e) => setDisputeResolution(e.target.value)}
              placeholder="How was this dispute resolved?"
              data-testid="input-dispute-resolution"
            />
          </div>
          <Button
            onClick={() => resolveDisputeMutation.mutate()}
            disabled={!disputeId || !disputeResolution || resolveDisputeMutation.isPending}
            variant="outline"
            data-testid="button-resolve-dispute"
          >
            Resolve Dispute
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-remove-block">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Unlink className="h-4 w-4" />
            Remove Pairing Block
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Blocked User ID</Label>
            <Input
              value={blockedUserId}
              onChange={(e) => setBlockedUserId(e.target.value)}
              placeholder="Enter blocked user ID"
              data-testid="input-blocked-user-id"
            />
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea
              value={unblockReason}
              onChange={(e) => setUnblockReason(e.target.value)}
              placeholder="Why are you removing this block?"
              data-testid="input-unblock-reason"
            />
          </div>
          <Button
            onClick={() => removePairingMutation.mutate()}
            disabled={!blockedUserId || !unblockReason || removePairingMutation.isPending}
            variant="outline"
            data-testid="button-remove-block"
          >
            Remove Block
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
