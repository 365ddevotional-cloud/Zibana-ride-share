import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Gift,
  AlertTriangle,
  Users,
  TrendingUp,
  Pause,
  X,
  Check,
  RefreshCw,
} from "lucide-react";

type IncentiveProgram = {
  id: string;
  name: string;
  type: string;
  criteria: string | null;
  rewardAmount: number;
  currency: string;
  status: string;
  startAt: string;
  endAt: string | null;
  createdAt: string;
};

type IncentiveEarning = {
  id: string;
  driverName: string;
  programName: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

type IncentiveStats = {
  activePrograms: number;
  totalEarnings: number;
  pending: number;
  paid: number;
};

type RiderPromo = {
  id: string;
  code: string;
  riderId: string;
  type: string;
  discountPercent: number | null;
  discountAmount: number | null;
  currency: string;
  status: string;
  expiresAt: string | null;
  usedCount: number;
  maxUses: number;
};

type BehaviorStat = {
  id: string;
  userId: string;
  role: string;
  totalAccepted: number;
  totalOffered: number;
  totalCancelled: number;
  totalCompleted: number;
  warningLevel: string;
  matchingPriority: number;
  incentiveEligible: boolean;
  promoEligible: boolean;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString();
}

function truncateId(id: string): string {
  if (!id) return "N/A";
  return id.length > 12 ? `${id.slice(0, 12)}...` : id;
}

function getProgramStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid={`badge-program-status-${status}`}>Active</Badge>;
    case "paused":
      return <Badge className="bg-yellow-600 text-white no-default-hover-elevate" data-testid={`badge-program-status-${status}`}>Paused</Badge>;
    case "ended":
      return <Badge variant="secondary" data-testid={`badge-program-status-${status}`}>Ended</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getEarningStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-600 text-white no-default-hover-elevate" data-testid={`badge-earning-status-${status}`}>Pending</Badge>;
    case "approved":
      return <Badge className="bg-blue-600 text-white no-default-hover-elevate" data-testid={`badge-earning-status-${status}`}>Approved</Badge>;
    case "paid":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid={`badge-earning-status-${status}`}>Paid</Badge>;
    case "revoked":
      return <Badge variant="destructive" data-testid={`badge-earning-status-${status}`}>Revoked</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getWarningLevelBadge(level: string) {
  switch (level) {
    case "none":
      return <Badge variant="secondary" data-testid={`badge-warning-${level}`}>None</Badge>;
    case "caution":
      return <Badge className="bg-yellow-600 text-white no-default-hover-elevate" data-testid={`badge-warning-${level}`}>Caution</Badge>;
    case "warning":
      return <Badge className="bg-orange-600 text-white no-default-hover-elevate" data-testid={`badge-warning-${level}`}>Warning</Badge>;
    case "restricted":
      return <Badge variant="destructive" data-testid={`badge-warning-${level}`}>Restricted</Badge>;
    default:
      return <Badge variant="secondary">{level}</Badge>;
  }
}

function ProgramsTab() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("");
  const [formCriteria, setFormCriteria] = useState("");
  const [formRewardAmount, setFormRewardAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("");
  const [formStartAt, setFormStartAt] = useState("");
  const [formEndAt, setFormEndAt] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<IncentiveStats>({
    queryKey: ["/api/incentives/stats"],
  });

  const { data: programs = [], isLoading: programsLoading } = useQuery<IncentiveProgram[]>({
    queryKey: ["/api/incentives/programs"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; criteria: string; rewardAmount: number; currency: string; startAt: string; endAt: string }) => {
      const response = await apiRequest("POST", "/api/incentives/create", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Program Created", description: "Incentive program has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (programId: string) => {
      const response = await apiRequest("POST", `/api/incentives/pause/${programId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Program Paused", description: "The program has been paused." });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Pause Failed", description: error.message, variant: "destructive" });
    },
  });

  const endMutation = useMutation({
    mutationFn: async (programId: string) => {
      const response = await apiRequest("POST", `/api/incentives/end/${programId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Program Ended", description: "The program has been ended." });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "End Failed", description: error.message, variant: "destructive" });
    },
  });

  const pauseAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/incentives/pause-all");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "All Programs Paused", description: "All active programs have been paused." });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Pause All Failed", description: error.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setShowCreateDialog(false);
    setFormName("");
    setFormType("");
    setFormCriteria("");
    setFormRewardAmount("");
    setFormCurrency("");
    setFormStartAt("");
    setFormEndAt("");
  }

  function handleCreate() {
    if (!formName || !formType || !formRewardAmount || !formCurrency || !formStartAt || !formEndAt) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: formName,
      type: formType,
      criteria: formCriteria,
      rewardAmount: parseFloat(formRewardAmount),
      currency: formCurrency,
      startAt: formStartAt,
      endAt: formEndAt,
    });
  }

  if (programsLoading || statsLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading programs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-programs">{stats?.activePrograms ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-earnings">{stats?.totalEarnings ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-earnings">{stats?.pending ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-paid-earnings">{stats?.paid ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-program">
              <Trophy className="h-4 w-4 mr-2" />
              Create Program
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Incentive Program</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="program-name">Name</Label>
                <Input
                  id="program-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Program name"
                  data-testid="input-program-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-type">Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger data-testid="select-program-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trip">Trip</SelectItem>
                    <SelectItem value="streak">Streak</SelectItem>
                    <SelectItem value="peak">Peak</SelectItem>
                    <SelectItem value="quality">Quality</SelectItem>
                    <SelectItem value="promo">Promo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-criteria">Criteria (JSON)</Label>
                <Textarea
                  id="program-criteria"
                  value={formCriteria}
                  onChange={(e) => setFormCriteria(e.target.value)}
                  placeholder='{"minTrips": 10}'
                  data-testid="input-program-criteria"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-reward">Reward Amount</Label>
                <Input
                  id="program-reward"
                  type="number"
                  value={formRewardAmount}
                  onChange={(e) => setFormRewardAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-program-reward"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-currency">Currency</Label>
                <Select value={formCurrency} onValueChange={setFormCurrency}>
                  <SelectTrigger data-testid="select-program-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="NGN">NGN</SelectItem>
                    <SelectItem value="ZAR">ZAR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-start">Start Date</Label>
                <Input
                  id="program-start"
                  type="date"
                  value={formStartAt}
                  onChange={(e) => setFormStartAt(e.target.value)}
                  data-testid="input-program-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-end">End Date</Label>
                <Input
                  id="program-end"
                  type="date"
                  value={formEndAt}
                  onChange={(e) => setFormEndAt(e.target.value)}
                  data-testid="input-program-end"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full"
                data-testid="button-submit-create-program"
              >
                {createMutation.isPending ? "Creating..." : "Create Program"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button
          variant="outline"
          onClick={() => pauseAllMutation.mutate()}
          disabled={pauseAllMutation.isPending}
          data-testid="button-pause-all-programs"
        >
          <Pause className="h-4 w-4 mr-2" />
          {pauseAllMutation.isPending ? "Pausing..." : "Pause All Programs"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reward Amount</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No incentive programs found.
              </TableCell>
            </TableRow>
          ) : (
            programs.map((program) => (
              <TableRow key={program.id} data-testid={`row-program-${program.id}`}>
                <TableCell className="font-medium" data-testid={`text-program-name-${program.id}`}>{program.name}</TableCell>
                <TableCell><Badge variant="outline" data-testid={`badge-program-type-${program.id}`}>{program.type}</Badge></TableCell>
                <TableCell data-testid={`text-program-reward-${program.id}`}>{program.rewardAmount}</TableCell>
                <TableCell>{program.currency}</TableCell>
                <TableCell>{getProgramStatusBadge(program.status)}</TableCell>
                <TableCell>{formatDate(program.startAt)}</TableCell>
                <TableCell>{formatDate(program.endAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 flex-wrap">
                    {program.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pauseMutation.mutate(program.id)}
                        disabled={pauseMutation.isPending}
                        data-testid={`button-pause-program-${program.id}`}
                      >
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </Button>
                    )}
                    {(program.status === "active" || program.status === "paused") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => endMutation.mutate(program.id)}
                        disabled={endMutation.isPending}
                        data-testid={`button-end-program-${program.id}`}
                      >
                        <X className="h-3 w-3 mr-1" />
                        End
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function EarningsTab() {
  const { toast } = useToast();
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  const { data: earnings = [], isLoading } = useQuery<IncentiveEarning[]>({
    queryKey: ["/api/incentives/earnings"],
  });

  const approveMutation = useMutation({
    mutationFn: async (earningId: string) => {
      const response = await apiRequest("POST", `/api/incentives/approve/${earningId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Earning Approved", description: "The earning has been approved." });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Approval Failed", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ earningId, reason }: { earningId: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/incentives/revoke/${earningId}`, { reason });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Earning Revoked", description: "The earning has been revoked." });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
      setShowRevokeDialog(false);
      setRevokeId(null);
      setRevokeReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Revoke Failed", description: error.message, variant: "destructive" });
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/incentives/evaluate");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Evaluation Complete", description: "All drivers have been evaluated." });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Evaluation Failed", description: error.message, variant: "destructive" });
    },
  });

  function handleRevoke(earningId: string) {
    setRevokeId(earningId);
    setRevokeReason("");
    setShowRevokeDialog(true);
  }

  function confirmRevoke() {
    if (!revokeId || !revokeReason) {
      toast({ title: "Missing Reason", description: "Please provide a reason for revoking.", variant: "destructive" });
      return;
    }
    revokeMutation.mutate({ earningId: revokeId, reason: revokeReason });
  }

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading earnings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => evaluateMutation.mutate()}
          disabled={evaluateMutation.isPending}
          data-testid="button-evaluate-all-drivers"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {evaluateMutation.isPending ? "Evaluating..." : "Evaluate All Drivers"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Driver Name</TableHead>
            <TableHead>Program Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {earnings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No earnings found.
              </TableCell>
            </TableRow>
          ) : (
            earnings.map((earning) => (
              <TableRow key={earning.id} data-testid={`row-earning-${earning.id}`}>
                <TableCell className="font-medium" data-testid={`text-earning-driver-${earning.id}`}>{earning.driverName}</TableCell>
                <TableCell data-testid={`text-earning-program-${earning.id}`}>{earning.programName}</TableCell>
                <TableCell><Badge variant="outline" data-testid={`badge-earning-type-${earning.id}`}>{earning.type}</Badge></TableCell>
                <TableCell data-testid={`text-earning-amount-${earning.id}`}>{earning.amount} {earning.currency}</TableCell>
                <TableCell>{getEarningStatusBadge(earning.status)}</TableCell>
                <TableCell>{formatDate(earning.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 flex-wrap">
                    {earning.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveMutation.mutate(earning.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-earning-${earning.id}`}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                    )}
                    {(earning.status === "pending" || earning.status === "approved") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevoke(earning.id)}
                        data-testid={`button-revoke-earning-${earning.id}`}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Earning</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="revoke-reason">Reason</Label>
              <Textarea
                id="revoke-reason"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Provide a reason for revoking this earning"
                data-testid="input-revoke-reason"
              />
            </div>
            <Button
              onClick={confirmRevoke}
              disabled={revokeMutation.isPending}
              variant="destructive"
              className="w-full"
              data-testid="button-confirm-revoke"
            >
              {revokeMutation.isPending ? "Revoking..." : "Confirm Revoke"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RiderPromosTab() {
  const { toast } = useToast();

  const { data: promos = [], isLoading } = useQuery<RiderPromo[]>({
    queryKey: ["/api/promos/all"],
  });

  const voidMutation = useMutation({
    mutationFn: async (promoId: string) => {
      const response = await apiRequest("POST", `/api/promos/void/${promoId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Promo Voided", description: "The promo has been voided." });
      queryClient.invalidateQueries({ queryKey: ["/api/promos/all"] });
    },
    onError: (error: Error) => {
      toast({ title: "Void Failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading promos...</div>;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Rider ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Discount %</TableHead>
            <TableHead>Discount Amount</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Used / Max</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                No rider promos found.
              </TableCell>
            </TableRow>
          ) : (
            promos.map((promo) => (
              <TableRow key={promo.id} data-testid={`row-promo-${promo.id}`}>
                <TableCell className="font-medium" data-testid={`text-promo-code-${promo.id}`}>{promo.code}</TableCell>
                <TableCell data-testid={`text-promo-rider-${promo.id}`}>{truncateId(promo.riderId)}</TableCell>
                <TableCell><Badge variant="outline" data-testid={`badge-promo-type-${promo.id}`}>{promo.type}</Badge></TableCell>
                <TableCell>{promo.discountPercent ?? "N/A"}</TableCell>
                <TableCell>{promo.discountAmount ?? "N/A"}</TableCell>
                <TableCell>{promo.currency}</TableCell>
                <TableCell>
                  <Badge variant={promo.status === "active" ? "default" : "secondary"} data-testid={`badge-promo-status-${promo.id}`}>
                    {promo.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(promo.expiresAt)}</TableCell>
                <TableCell data-testid={`text-promo-usage-${promo.id}`}>{promo.usedCount} / {promo.maxUses}</TableCell>
                <TableCell>
                  {promo.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => voidMutation.mutate(promo.id)}
                      disabled={voidMutation.isPending}
                      data-testid={`button-void-promo-${promo.id}`}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Void
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function BehaviorTab() {
  const { toast } = useToast();

  const { data: behaviors = [], isLoading } = useQuery<BehaviorStat[]>({
    queryKey: ["/api/behavior/all"],
  });

  const evaluateMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest("POST", "/api/behavior/evaluate", { userId, role });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Evaluation Complete", description: "User behavior has been evaluated." });
      queryClient.invalidateQueries({ queryKey: ["/api/behavior/all"] });
    },
    onError: (error: Error) => {
      toast({ title: "Evaluation Failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading behavior data...</div>;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User ID</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Acceptance Rate</TableHead>
            <TableHead>Cancellation Rate</TableHead>
            <TableHead>Warning Level</TableHead>
            <TableHead>Matching Priority</TableHead>
            <TableHead>Incentive Eligible</TableHead>
            <TableHead>Promo Eligible</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {behaviors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No behavior data found.
              </TableCell>
            </TableRow>
          ) : (
            behaviors.map((behavior) => {
              const acceptanceRate = behavior.totalOffered > 0
                ? ((behavior.totalAccepted / behavior.totalOffered) * 100).toFixed(1)
                : "0.0";
              const cancellationRate = behavior.totalCompleted + behavior.totalCancelled > 0
                ? ((behavior.totalCancelled / (behavior.totalCompleted + behavior.totalCancelled)) * 100).toFixed(1)
                : "0.0";

              return (
                <TableRow key={behavior.id} data-testid={`row-behavior-${behavior.id}`}>
                  <TableCell className="font-medium" data-testid={`text-behavior-user-${behavior.id}`}>{truncateId(behavior.userId)}</TableCell>
                  <TableCell><Badge variant="outline" data-testid={`badge-behavior-role-${behavior.id}`}>{behavior.role}</Badge></TableCell>
                  <TableCell data-testid={`text-acceptance-rate-${behavior.id}`}>{acceptanceRate}%</TableCell>
                  <TableCell data-testid={`text-cancellation-rate-${behavior.id}`}>{cancellationRate}%</TableCell>
                  <TableCell>{getWarningLevelBadge(behavior.warningLevel)}</TableCell>
                  <TableCell data-testid={`text-matching-priority-${behavior.id}`}>{behavior.matchingPriority}</TableCell>
                  <TableCell data-testid={`text-incentive-eligible-${behavior.id}`}>
                    {behavior.incentiveEligible ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell data-testid={`text-promo-eligible-${behavior.id}`}>
                    {behavior.promoEligible ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => evaluateMutation.mutate({ userId: behavior.userId, role: behavior.role })}
                      disabled={evaluateMutation.isPending}
                      data-testid={`button-evaluate-behavior-${behavior.id}`}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Evaluate
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function IncentivesPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Incentives Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="programs">
          <TabsList data-testid="tabs-incentives">
            <TabsTrigger value="programs" data-testid="tab-programs">
              <Trophy className="h-4 w-4 mr-1" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="earnings" data-testid="tab-earnings">
              <TrendingUp className="h-4 w-4 mr-1" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="promos" data-testid="tab-promos">
              <Gift className="h-4 w-4 mr-1" />
              Rider Promos
            </TabsTrigger>
            <TabsTrigger value="behavior" data-testid="tab-behavior">
              <Users className="h-4 w-4 mr-1" />
              Behavior
            </TabsTrigger>
          </TabsList>
          <TabsContent value="programs">
            <ProgramsTab />
          </TabsContent>
          <TabsContent value="earnings">
            <EarningsTab />
          </TabsContent>
          <TabsContent value="promos">
            <RiderPromosTab />
          </TabsContent>
          <TabsContent value="behavior">
            <BehaviorTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
