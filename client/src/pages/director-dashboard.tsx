import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DirectorSpecialRidesPanel } from "@/components/director/special-rides-panel";
import { DirectorCorporateRidesPanel } from "@/components/director/corporate-rides-panel";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Users, Shield, Clock, AlertTriangle, Activity, UserPlus, ChevronRight,
  Calendar, Bell, X, RefreshCw, Wallet, Send, Ban, History, DollarSign,
  CheckCircle, XCircle, Eye, Trash2, Lightbulb, MessageCircle,
  TrendingUp, BarChart3, Building2, Star, Crown
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type DashboardData = {
  profile: {
    directorType: string;
    status: string;
    lifecycleStatus: string;
    fullName: string;
    [key: string]: any;
  };
  lifespan: {
    lifespanStartDate: string | null;
    lifespanEndDate: string | null;
    daysRemaining: number | null;
  };
  cells: Array<{
    cellNumber: number;
    cellName: string;
    driverCount: number;
    maxDrivers: number;
  }>;
  metrics: {
    totalDrivers: number;
    activeDriversToday: number;
    commissionableDrivers: number;
    suspendedDrivers: number;
  };
  staff: Array<{
    id: string;
    staffUserId: string;
    staffRole: string;
    status: string;
    permissions: string;
    [key: string]: any;
  }>;
  coaching: Array<{
    id: string;
    coachingType: string;
    message: string;
    severity: string;
    isDismissed: boolean;
  }>;
  actionLogs: Array<{
    actorId: string;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: string;
    afterState: string;
    [key: string]: any;
  }>;
  trustScoreSummary?: {
    averageScore: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalDrivers: number;
  };
};

type EligibleDriver = {
  userId: string;
  fullName: string;
  phone: string;
  status: string;
  isOnline: boolean;
  walletBalance: string;
  cellNumber: number;
};

type FundingLimits = {
  perTransactionMin: string;
  perTransactionMax: string;
  daily: { limit: string; used: string; remaining: string };
  weekly: { limit: string; used: string; remaining: string };
  monthly: { limit: string; used: string; remaining: string };
};

type FundingTransaction = {
  id: string;
  directorUserId: string;
  driverUserId: string;
  driverName: string;
  amount: string;
  purposeTag: string;
  status: string;
  flagged: boolean;
  flagReason: string | null;
  createdAt: string;
};

function severityVariant(severity: string): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "critical":
    case "error":
      return "destructive";
    case "warning":
      return "outline";
    default:
      return "secondary";
  }
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
    case "approved":
    case "completed":
      return "default";
    case "suspended":
    case "rejected":
    case "flagged":
    case "reversed":
      return "destructive";
    default:
      return "secondary";
  }
}

const PAYOUT_STATE_LABELS: Record<string, string> = {
  calculating: "Calculating",
  pending_review: "Under Review",
  approved: "Approved",
  scheduled: "Scheduled",
  released: "Released",
  held: "On Hold",
  reversed: "Reversed",
};

function payoutStateVariant(state: string): "default" | "secondary" | "destructive" | "outline" {
  switch (state) {
    case "released":
      return "default";
    case "held":
    case "reversed":
      return "destructive";
    case "approved":
    case "scheduled":
      return "outline";
    default:
      return "secondary";
  }
}

function driverStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status?.toLowerCase()) {
    case "active":
      return "default";
    case "suspended":
      return "destructive";
    case "pending":
      return "outline";
    default:
      return "secondary";
  }
}

function tierVariant(tier: string): "default" | "secondary" | "destructive" | "outline" {
  switch (tier) {
    case "gold": return "default";
    case "silver": return "secondary";
    case "bronze": return "outline";
    case "at_risk": return "destructive";
    default: return "secondary";
  }
}

function tierLabel(tier: string): string {
  switch (tier) {
    case "gold": return "Gold";
    case "silver": return "Silver";
    case "bronze": return "Bronze";
    case "at_risk": return "At Risk";
    default: return tier;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}

const PURPOSE_LABELS: Record<string, string> = {
  ride_fuel_support: "Ride Fuel Support",
  network_availability_boost: "Network Availability Boost",
  emergency_assistance: "Emergency Assistance",
  temporary_balance_topup: "Temporary Balance Top-up",
};

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="director-dashboard-loading">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-48" />
    </div>
  );
}

function DisciplineDialog({
  driver,
  actionType,
  open,
  onOpenChange,
}: {
  driver: EligibleDriver | null;
  actionType: "warn" | "suspend";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");

  const isWarning = actionType === "warn";
  const title = isWarning ? "Issue Warning" : "Request Suspension";
  const endpoint = isWarning
    ? `/api/director/drivers/${driver?.userId}/warn`
    : `/api/director/drivers/${driver?.userId}/suspend`;

  const disciplineMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", endpoint, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/funding/eligible-drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard/full"] });
      toast({
        title: isWarning ? "Warning Issued" : "Suspension Requested",
        description: isWarning
          ? `Warning issued to ${driver?.fullName}.`
          : `Suspension request submitted for ${driver?.fullName}.`,
      });
      handleClose();
    },
    onError: (err: Error) => {
      toast({
        title: isWarning ? "Warning Failed" : "Suspension Request Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-discipline-title">{title}</DialogTitle>
          <DialogDescription>
            {isWarning
              ? `Issue a warning to ${driver.fullName}`
              : `Request suspension for ${driver.fullName}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Driver</Label>
            <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-muted">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium" data-testid="text-discipline-driver-name">{driver.fullName}</span>
            </div>
          </div>
          <div>
            <Label htmlFor="discipline-reason">Reason</Label>
            <Textarea
              id="discipline-reason"
              placeholder={isWarning ? "Enter warning reason..." : "Enter suspension reason..."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              data-testid="textarea-discipline-reason"
            />
            {reason.length > 0 && reason.length < 5 && (
              <p className="text-xs text-destructive mt-1">Reason must be at least 5 characters.</p>
            )}
          </div>
          {!isWarning && (
            <div className="p-3 rounded-md border border-destructive/30 bg-destructive/5 text-xs text-muted-foreground">
              Requires Admin confirmation.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-discipline-cancel">Cancel</Button>
          <Button
            variant={isWarning ? "outline" : "destructive"}
            onClick={() => disciplineMutation.mutate()}
            disabled={reason.length < 5 || disciplineMutation.isPending}
            data-testid="button-discipline-submit"
          >
            {disciplineMutation.isPending ? "Submitting..." : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateStaffDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [staffUserId, setStaffUserId] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const permissionOptions = [
    { key: "view_drivers", label: "View Drivers" },
    { key: "view_funding", label: "View Funding History" },
    { key: "manage_drivers", label: "Manage Drivers" },
    { key: "view_reports", label: "View Reports" },
  ];

  const createStaffMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/director/staff", {
        staffUserId,
        staffRole,
        permissions: JSON.stringify(selectedPermissions),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard/full"] });
      toast({ title: "Staff Created", description: "Staff member has been created successfully." });
      handleClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to Create Staff", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setStaffUserId("");
    setStaffRole("");
    setSelectedPermissions([]);
    onOpenChange(false);
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-create-staff-title">Create Staff</DialogTitle>
          <DialogDescription>Add a new staff member to your team</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="staff-user-id">Staff User ID</Label>
            <Input
              id="staff-user-id"
              placeholder="Enter user ID"
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
              data-testid="input-staff-user-id"
            />
          </div>
          <div>
            <Label>Staff Role</Label>
            <Select value={staffRole} onValueChange={setStaffRole}>
              <SelectTrigger data-testid="select-staff-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="coordinator">Coordinator</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Permissions</Label>
            <div className="space-y-2 mt-2">
              {permissionOptions.map((perm) => (
                <div key={perm.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`perm-${perm.key}`}
                    checked={selectedPermissions.includes(perm.key)}
                    onCheckedChange={() => togglePermission(perm.key)}
                    data-testid={`checkbox-perm-${perm.key}`}
                  />
                  <label htmlFor={`perm-${perm.key}`} className="text-sm cursor-pointer">
                    {perm.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-md border bg-muted/50 text-xs text-muted-foreground">
            Staff accounts require Admin approval before activation.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-create-staff-cancel">Cancel</Button>
          <Button
            onClick={() => createStaffMutation.mutate()}
            disabled={!staffUserId || !staffRole || createStaffMutation.isPending}
            data-testid="button-create-staff-submit"
          >
            {createStaffMutation.isPending ? "Creating..." : "Create Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveStaffDialog({
  staffId,
  open,
  onOpenChange,
}: {
  staffId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const removeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/director/staff/${staffId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard/full"] });
      toast({ title: "Staff Removed", description: "Staff member has been removed." });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to Remove Staff", description: err.message, variant: "destructive" });
    },
  });

  if (!staffId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle data-testid="text-remove-staff-title">Remove Staff Member</DialogTitle>
          <DialogDescription>Are you sure you want to remove this staff member? This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-remove-staff-cancel">Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
            data-testid="button-remove-staff-confirm"
          >
            {removeMutation.isPending ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FundDriverDialog({
  driver,
  open,
  onOpenChange,
}: {
  driver: EligibleDriver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [purposeTag, setPurposeTag] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");

  const { data: driverLimits } = useQuery<{
    daily: { limit: string; used: string; remaining: string };
    weekly: { limit: string; used: string; remaining: string };
    monthly: { limit: string; used: string; remaining: string };
  }>({
    queryKey: ["/api/director/funding/driver-limits", driver?.userId],
    enabled: !!driver?.userId && open,
  });

  const { data: directorLimits } = useQuery<FundingLimits>({
    queryKey: ["/api/director/funding/limits"],
    enabled: open,
  });

  const fundMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/director/funding/send", {
        driverUserId: driver!.userId,
        amount: parseFloat(amount),
        purposeTag,
        disclaimerAccepted: true,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/funding/limits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/director/funding/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/director/funding/eligible-drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard/full"] });
      if (data.flagged) {
        toast({
          title: "Funding Sent (Flagged)",
          description: "Funds were sent but the transaction was flagged for review.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Funding Sent", description: `Successfully sent to ${driver?.fullName}.` });
      }
      setStep("success");
    },
    onError: (err: Error) => {
      toast({ title: "Funding Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setAmount("");
    setPurposeTag("");
    setDisclaimerAccepted(false);
    setStep("form");
    onOpenChange(false);
  };

  if (!driver) return null;

  const parsedAmount = parseFloat(amount) || 0;
  const minAmount = parseFloat(directorLimits?.perTransactionMin || "500");
  const maxAmount = parseFloat(directorLimits?.perTransactionMax || "50000");
  const dailyRemaining = parseFloat(directorLimits?.daily?.remaining || "0");
  const effectiveMax = Math.min(maxAmount, dailyRemaining);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Fund Driver Wallet</DialogTitle>
              <DialogDescription>
                Send voluntary support to {driver.fullName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Driver</Label>
                <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium" data-testid="text-fund-driver-name">{driver.fullName}</span>
                  <Badge variant={driver.isOnline ? "default" : "secondary"} className="ml-auto">
                    {driver.isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label htmlFor="fund-amount">Amount</Label>
                <Input
                  id="fund-amount"
                  type="number"
                  placeholder={`Min: ${minAmount} / Max: ${effectiveMax}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="input-fund-amount"
                />
                {directorLimits && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>Daily: {parseFloat(directorLimits.daily.remaining).toLocaleString()} left</div>
                    <div>Weekly: {parseFloat(directorLimits.weekly.remaining).toLocaleString()} left</div>
                    <div>Monthly: {parseFloat(directorLimits.monthly.remaining).toLocaleString()} left</div>
                  </div>
                )}
                {driverLimits && (
                  <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>Driver daily: {parseFloat(driverLimits.daily.remaining).toLocaleString()} left</div>
                    <div>Driver weekly: {parseFloat(driverLimits.weekly.remaining).toLocaleString()} left</div>
                    <div>Driver monthly: {parseFloat(driverLimits.monthly.remaining).toLocaleString()} left</div>
                  </div>
                )}
              </div>

              <div>
                <Label>Purpose</Label>
                <Select value={purposeTag} onValueChange={setPurposeTag}>
                  <SelectTrigger data-testid="select-fund-purpose">
                    <SelectValue placeholder="Select a purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ride_fuel_support">Ride Fuel Support</SelectItem>
                    <SelectItem value="network_availability_boost">Network Availability Boost</SelectItem>
                    <SelectItem value="emergency_assistance">Emergency Assistance</SelectItem>
                    <SelectItem value="temporary_balance_topup">Temporary Balance Top-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md border bg-muted/50">
                <Checkbox
                  id="disclaimer"
                  checked={disclaimerAccepted}
                  onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
                  data-testid="checkbox-disclaimer"
                />
                <label htmlFor="disclaimer" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                  This is voluntary support, not a loan or obligation. I will not require, imply, or enforce performance, repayment, or compliance as a condition for this funding.
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} data-testid="button-fund-cancel">Cancel</Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={!amount || parsedAmount < minAmount || parsedAmount > effectiveMax || !purposeTag || !disclaimerAccepted}
                data-testid="button-fund-continue"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Funding</DialogTitle>
              <DialogDescription>Review the details below before sending</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex justify-between py-1.5">
                <span className="text-sm text-muted-foreground">Driver</span>
                <span className="text-sm font-medium">{driver.fullName}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-bold">{parsedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-sm text-muted-foreground">Purpose</span>
                <span className="text-sm">{PURPOSE_LABELS[purposeTag]}</span>
              </div>
              <div className="p-3 rounded-md border border-destructive/30 bg-destructive/5 text-xs text-muted-foreground">
                This is a non-refundable, voluntary support transfer. It does not create any obligation for the driver.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("form")} data-testid="button-fund-back">Back</Button>
              <Button
                onClick={() => fundMutation.mutate()}
                disabled={fundMutation.isPending}
                data-testid="button-fund-confirm"
              >
                {fundMutation.isPending ? "Sending..." : "Send Funds"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle>Funding Sent</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-6 space-y-3">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm text-center" data-testid="text-fund-success">
                {parsedAmount.toLocaleString()} sent to {driver.fullName} as {PURPOSE_LABELS[purposeTag]}.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} data-testid="button-fund-done">Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DisputeSection({ disputeablePayouts }: { disputeablePayouts: Array<{ id: string; periodDate: string; payoutState: string; estimatedEarnings: string }> }) {
  const { toast } = useToast();
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const disputeMutation = useMutation({
    mutationFn: async ({ payoutId, explanation }: { payoutId: string; explanation: string }) => {
      setSubmittingId(payoutId);
      await apiRequest("POST", `/api/director/payout/${payoutId}/dispute`, { explanation });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/earnings"] });
      toast({ title: "Explanation Submitted", description: "Your explanation has been submitted for review." });
      setSubmittingId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
      setSubmittingId(null);
    },
  });

  return (
    <Card data-testid="card-dispute-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Submit Explanation
        </CardTitle>
        <CardDescription>Provide context for payouts under review</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {disputeablePayouts.map((payout) => (
          <div key={payout.id} className="space-y-2 p-3 rounded-md border" data-testid={`dispute-payout-${payout.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" data-testid={`text-dispute-period-${payout.id}`}>
                  {formatDate(payout.periodDate)}
                </span>
                <Badge variant={payoutStateVariant(payout.payoutState)} data-testid={`badge-dispute-state-${payout.id}`}>
                  {PAYOUT_STATE_LABELS[payout.payoutState] || payout.payoutState}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground" data-testid={`text-dispute-amount-${payout.id}`}>
                Est. {parseFloat(payout.estimatedEarnings) > 0 ? parseFloat(payout.estimatedEarnings).toFixed(0) : "---"}
              </span>
            </div>
            <Textarea
              placeholder="Provide your explanation..."
              value={explanations[payout.id] || ""}
              onChange={(e) => setExplanations((prev) => ({ ...prev, [payout.id]: e.target.value }))}
              data-testid={`textarea-dispute-${payout.id}`}
            />
            <Button
              variant="outline"
              onClick={() => disputeMutation.mutate({ payoutId: payout.id, explanation: explanations[payout.id] || "" })}
              disabled={(explanations[payout.id] || "").length < 5 || (submittingId === payout.id && disputeMutation.isPending)}
              data-testid={`button-dispute-submit-${payout.id}`}
            >
              {submittingId === payout.id && disputeMutation.isPending ? "Submitting..." : "Submit Explanation"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function DirectorDashboard() {
  const { toast } = useToast();
  const [location] = useLocation();
  const getInitialTab = () => {
    if (location === "/director/drivers") return "drivers";
    if (location === "/director/funding") return "funding";
    if (location === "/director/staff") return "staff";
    if (location === "/director/activity") return "activity";
    if (location === "/director/earnings") return "earnings";
    if (location === "/director/performance") return "performance";
    if (location === "/director/disputes") return "disputes";
    return "overview";
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<EligibleDriver | null>(null);
  const [disciplineDialogOpen, setDisciplineDialogOpen] = useState(false);
  const [disciplineDriver, setDisciplineDriver] = useState<EligibleDriver | null>(null);
  const [disciplineAction, setDisciplineAction] = useState<"warn" | "suspend">("warn");
  const [createStaffOpen, setCreateStaffOpen] = useState(false);
  const [removeStaffOpen, setRemoveStaffOpen] = useState(false);
  const [removeStaffId, setRemoveStaffId] = useState<string | null>(null);
  const [logDateFilter, setLogDateFilter] = useState("");
  const [logActionFilter, setLogActionFilter] = useState("all");
  const [logUserFilter, setLogUserFilter] = useState("");
  const [disputeType, setDisputeType] = useState("");
  const [disputeSubject, setDisputeSubject] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeEvidenceNotes, setDisputeEvidenceNotes] = useState("");
  const [expandedDisputeId, setExpandedDisputeId] = useState<string | null>(null);
  const [disputeReplyText, setDisputeReplyText] = useState<Record<string, string>>({});

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/director/dashboard/full"],
  });

  const { data: eligibleDrivers, isLoading: driversLoading } = useQuery<EligibleDriver[]>({
    queryKey: ["/api/director/funding/eligible-drivers"],
    enabled: activeTab === "drivers" || activeTab === "funding",
  });

  const { data: fundingLimits } = useQuery<FundingLimits>({
    queryKey: ["/api/director/funding/limits"],
    enabled: activeTab === "funding",
  });

  const { data: fundingHistory, isLoading: historyLoading } = useQuery<FundingTransaction[]>({
    queryKey: ["/api/director/funding/history"],
    enabled: activeTab === "funding",
  });

  const { data: suspensionStatus } = useQuery<{ suspended: boolean; suspension: any }>({
    queryKey: ["/api/director/funding/suspension-status"],
    enabled: activeTab === "funding",
  });

  const { data: analytics } = useQuery<{
    totalDrivers: number;
    activeDriversToday: number;
    commissionableToday: number;
    driversByStatus: Record<string, number>;
    weeklyGrowth: Array<{ week: string; count: number }>;
    fundingCount: number;
    fundingThisMonth: number;
    avgTrustScore: number;
    lowTrustCount: number;
    cellHealthBadge: "healthy" | "at_risk" | "under_review";
    activityRatio: number;
  }>({
    queryKey: ["/api/director/analytics"],
    enabled: activeTab === "overview",
  });

  const { data: oversightSignals } = useQuery<{
    signals: Array<{ type: string; severity: "info" | "warning" | "critical"; message: string; triggeredAt: string }>;
  }>({
    queryKey: ["/api/director/oversight-signals"],
    enabled: activeTab === "overview",
  });

  const { data: earningsData, isLoading: earningsLoading } = useQuery<{
    activeDriversToday: number;
    commissionableDriversToday: number;
    eligibleDrivers: number;
    estimatedEarnings: string;
    payoutStatus: string;
    payoutState: string;
    lastPayoutDate: string | null;
    heldCount: number;
    holdNotice: string | null;
    commissionFrozen: boolean;
    lifecycleStatus: string;
    history: Array<{ date: string; activeDrivers: number; commissionableDrivers: number; payoutStatus: string }>;
    disputeablePayouts: Array<{ id: string; periodDate: string; payoutState: string; estimatedEarnings: string }>;
    payouts: Array<{ id: string; periodDate: string; payoutState: string; payoutStatus: string; estimatedEarnings: string; partialReleaseAmount: string | null; releasedAt: string | null; disputeSubmitted: boolean }>;
    legalDisclaimer: string;
  }>({
    queryKey: ["/api/director/earnings"],
    enabled: activeTab === "earnings" || activeTab === "overview",
  });

  const { data: performanceData, isLoading: perfLoading } = useQuery<any>({
    queryKey: ["/api/director/performance"],
    enabled: activeTab === "performance",
  });

  const calcPerformanceMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/director/performance/calculate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/performance"] });
      toast({ title: "Score recalculated", description: "Your performance score has been updated" });
    },
  });

  const { data: acceptanceData } = useQuery<{ accepted: boolean }>({
    queryKey: ["/api/director/funding/acceptance"],
  });

  const { data: disputesData, isLoading: disputesLoading } = useQuery<{
    disputes: Array<{
      id: string;
      disputeType: string;
      subject: string;
      description: string;
      status: string;
      evidenceNotes: string | null;
      createdAt: string;
    }>;
  }>({
    queryKey: ["/api/director/disputes"],
    enabled: activeTab === "disputes",
  });

  const { data: disputeDetail } = useQuery<{
    dispute: any;
    messages: Array<{
      id: string;
      senderRole: string;
      content: string;
      createdAt: string;
    }>;
  }>({
    queryKey: ["/api/director/disputes", expandedDisputeId],
    enabled: !!expandedDisputeId,
  });

  const submitDisputeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/director/disputes", {
        disputeType,
        subject: disputeSubject,
        description: disputeDescription,
        evidenceNotes: disputeEvidenceNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/disputes"] });
      toast({ title: "Dispute Submitted", description: "Your dispute has been submitted for review." });
      setDisputeType("");
      setDisputeSubject("");
      setDisputeDescription("");
      setDisputeEvidenceNotes("");
    },
    onError: (err: Error) => {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    },
  });

  const replyDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, content }: { disputeId: string; content: string }) => {
      await apiRequest("POST", `/api/director/disputes/${disputeId}/message`, { content });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/disputes", variables.disputeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/director/disputes"] });
      setDisputeReplyText((prev) => ({ ...prev, [variables.disputeId]: "" }));
      toast({ title: "Message Sent", description: "Your reply has been sent." });
    },
    onError: (err: Error) => {
      toast({ title: "Reply Failed", description: err.message, variant: "destructive" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/director/funding/acceptance");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/funding/acceptance"] });
      toast({ title: "Terms Accepted", description: "You have accepted the director funding terms." });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (coachingId: string) => {
      await apiRequest("POST", `/api/director/coaching/${coachingId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard/full"] });
      toast({ title: "Dismissed", description: "Coaching alert dismissed." });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/director/coaching/generate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard/full"] });
      toast({ title: "Coaching Generated", description: "New coaching insights have been generated." });
    },
  });

  if (isLoading) return <LoadingSkeleton />;

  if (!dashboard) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto" data-testid="director-dashboard-empty">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2" data-testid="text-no-data">No Dashboard Data</h2>
            <p className="text-muted-foreground text-sm">Unable to load director dashboard data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSuspended = dashboard.profile?.lifecycleStatus === "suspended" || dashboard.profile?.status === "suspended";
  const isExpired = dashboard.profile?.lifecycleStatus === "expired";
  const isTerminated = dashboard.profile?.lifecycleStatus === "terminated";
  const isDashboardLocked = isSuspended || isTerminated;
  const isReadOnly = ["suspended", "terminated", "expired"].includes(dashboard.profile?.lifecycleStatus);

  const { profile, lifespan, cells, metrics, staff, coaching, actionLogs, trustScoreSummary } = dashboard;
  const activeCoaching = coaching?.filter((c) => !c.isDismissed) ?? [];

  const filteredLogs = (actionLogs || []).filter(log => {
    if (logDateFilter) {
      const logDate = new Date(log.createdAt).toISOString().split("T")[0];
      if (logDate !== logDateFilter) return false;
    }
    if (logActionFilter !== "all") {
      if (log.action !== logActionFilter) return false;
    }
    if (logUserFilter) {
      const searchLower = logUserFilter.toLowerCase();
      const matchesActor = log.actorId?.toLowerCase().includes(searchLower);
      const matchesRole = log.actorRole?.toLowerCase().includes(searchLower);
      if (!matchesActor && !matchesRole) return false;
    }
    return true;
  });

  const uniqueActions = Array.from(new Set((actionLogs || []).map(l => l.action)));

  const handleFundDriver = (driver: EligibleDriver) => {
    setSelectedDriver(driver);
    setFundDialogOpen(true);
  };

  const handleDiscipline = (driver: EligibleDriver, action: "warn" | "suspend") => {
    setDisciplineDriver(driver);
    setDisciplineAction(action);
    setDisciplineDialogOpen(true);
  };

  const handleRemoveStaff = (id: string) => {
    setRemoveStaffId(id);
    setRemoveStaffOpen(true);
  };

  const todayFunding = fundingHistory?.filter(t => {
    const today = new Date();
    const txDate = new Date(t.createdAt);
    return txDate.toDateString() === today.toDateString() && t.status === "completed";
  }) || [];
  const todayFundingTotal = todayFunding.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const monthlyFunding = fundingHistory?.filter(t => {
    const now = new Date();
    const txDate = new Date(t.createdAt);
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear() && t.status === "completed";
  }) || [];
  const monthlyFundingTotal = monthlyFunding.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="director-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Director Dashboard</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-director-name">
            {profile?.fullName || "Director"} &middot; <span className="capitalize">{profile?.directorType}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(profile?.status)} data-testid="badge-status">
            {profile?.status || "N/A"}
          </Badge>
          <Badge variant={statusVariant(profile?.lifecycleStatus)} data-testid="badge-lifecycle-status">
            {profile?.lifecycleStatus || "N/A"}
          </Badge>
        </div>
      </div>

      {isSuspended && (
        <div
          className="flex items-center gap-3 p-4 rounded-md border border-yellow-500/50 bg-yellow-500/5"
          data-testid="banner-readonly-suspended"
        >
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-300" data-testid="text-readonly-title-suspended">
              Read-Only Mode
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-readonly-message-suspended">
              Your dashboard is in read-only mode while under review. You can view your information but cannot take actions.
            </p>
          </div>
        </div>
      )}

      {isTerminated && (
        <div
          className="flex items-center gap-3 p-4 rounded-md border border-destructive/50 bg-destructive/5"
          data-testid="banner-readonly-terminated"
        >
          <Ban className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive" data-testid="text-readonly-title-terminated">
              Read-Only Mode
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-readonly-message-terminated">
              Your director appointment has been concluded. Your dashboard is in read-only mode. Contact support for questions.
            </p>
          </div>
        </div>
      )}

      {isExpired && (
        <div
          className="flex items-center gap-3 p-4 rounded-md border border-muted bg-muted/30"
          data-testid="banner-readonly-expired"
        >
          <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium" data-testid="text-readonly-title-expired">
              Read-Only Mode
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-readonly-message-expired">
              Your contract has expired. Your dashboard is in read-only mode. Contact your administrator for renewal.
            </p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1" data-testid="tabs-director">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="drivers" data-testid="tab-drivers">Drivers</TabsTrigger>
          <TabsTrigger value="funding" data-testid="tab-funding">Funding</TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff">Staff</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity Log</TabsTrigger>
          <TabsTrigger value="earnings" data-testid="tab-earnings">Earnings</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <TrendingUp className="h-4 w-4 mr-1" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="disputes" data-testid="tab-disputes">
            <Shield className="h-4 w-4 mr-1" />
            Disputes
          </TabsTrigger>
          <TabsTrigger value="corporate-rides" data-testid="tab-corporate-rides">
            <Building2 className="h-4 w-4 mr-1" />
            Corporate
          </TabsTrigger>
          <TabsTrigger value="special-rides" data-testid="tab-special-rides">
            <Crown className="h-4 w-4 mr-1" />
            Special Rides
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card data-testid="card-total-drivers">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-drivers">{metrics?.totalDrivers ?? 0}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-active-drivers">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-drivers">{metrics?.activeDriversToday ?? 0}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-commissionable-drivers">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commissionable</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-commissionable-drivers">{metrics?.commissionableDrivers ?? 0}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-funding-today">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Funding Today</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-funding-today">{todayFundingTotal.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{todayFunding.length} transaction{todayFunding.length !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
            <Card data-testid="card-funding-month">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Funding Given (Month)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-funding-month">{monthlyFundingTotal.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{monthlyFunding.length} transaction{monthlyFunding.length !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
            <Card data-testid="card-trust-score">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-trust-score-avg">
                  {trustScoreSummary?.averageScore != null ? trustScoreSummary.averageScore.toFixed(1) : "N/A"}
                </div>
                {trustScoreSummary && (
                  <p className="text-xs text-muted-foreground" data-testid="text-trust-score-breakdown">
                    High: {trustScoreSummary.highCount} / Med: {trustScoreSummary.mediumCount} / Low: {trustScoreSummary.lowCount}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card data-testid="card-overview-earnings-status">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Earnings Status</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    earningsData?.payoutStatus === "released" ? "default"
                    : earningsData?.payoutStatus === "on_hold" ? "destructive"
                    : "secondary"
                  }
                  data-testid="badge-overview-earnings-status"
                >
                  {earningsData?.payoutStatus === "released" ? "Released"
                   : earningsData?.payoutStatus === "on_hold" ? "On Hold"
                   : earningsData?.commissionFrozen ? "Frozen"
                   : "Pending"}
                </Badge>
                {earningsData?.estimatedEarnings && parseFloat(earningsData.estimatedEarnings) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-overview-estimated">
                    Est. {parseFloat(earningsData.estimatedEarnings).toFixed(0)}
                  </p>
                )}
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => setActiveTab("earnings")} data-testid="button-view-earnings">
                  View Earnings
                </Button>
              </CardContent>
            </Card>
            <Card data-testid="card-overview-director-status">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Director Status</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    profile?.lifecycleStatus === "active" ? "default"
                    : profile?.lifecycleStatus === "terminated" ? "destructive"
                    : "secondary"
                  }
                  data-testid="badge-overview-director-status"
                >
                  {profile?.lifecycleStatus === "active" ? "Active"
                   : profile?.lifecycleStatus === "suspended" ? "Under Review"
                   : profile?.lifecycleStatus === "expired" ? "Expired"
                   : profile?.lifecycleStatus === "terminated" ? "Terminated"
                   : profile?.lifecycleStatus === "pending" ? "Pending Activation"
                   : profile?.lifecycleStatus || "Unknown"}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1 capitalize" data-testid="text-overview-director-type">
                  {profile?.directorType} Director
                </p>
              </CardContent>
            </Card>
          </div>

          {metrics && metrics.totalDrivers < 10 && (
            <Card data-testid="card-empty-state-drivers">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground text-center" data-testid="text-empty-state-drivers">
                  You need at least 10 drivers to activate your director cell.
                </p>
              </CardContent>
            </Card>
          )}

          {lifespan && (
            <Card data-testid="card-lifespan">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contract Lifespan</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Start Date</p>
                    <p className="text-sm font-semibold" data-testid="text-lifespan-start">{formatDate(lifespan.lifespanStartDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="text-sm font-semibold" data-testid="text-lifespan-end">{formatDate(lifespan.lifespanEndDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Days Remaining</p>
                    <p className={`text-2xl font-bold ${lifespan.daysRemaining !== null && lifespan.daysRemaining <= 30 ? "text-destructive" : lifespan.daysRemaining !== null && lifespan.daysRemaining <= 90 ? "text-yellow-600 dark:text-yellow-400" : ""}`} data-testid="text-days-remaining">
                      {lifespan.daysRemaining !== null ? lifespan.daysRemaining : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {cells && cells.length > 0 && (
            <Card data-testid="card-cells">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cell Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {cells.map((cell) => (
                    <div key={cell.cellNumber} className="p-3 rounded-md border">
                      <p className="text-sm font-medium mb-2">{cell.cellName}</p>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{cell.driverCount} / {cell.maxDrivers} drivers</span>
                        <span>{Math.round((cell.driverCount / cell.maxDrivers) * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                        <div
                          className="h-1.5 bg-primary rounded-full"
                          style={{ width: `${Math.min((cell.driverCount / cell.maxDrivers) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-ziba-insight">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                ZIBA Support Insight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm" data-testid="text-insight-performance">
                {metrics && metrics.totalDrivers > 0 && (metrics.activeDriversToday / metrics.totalDrivers) > 0.77
                  ? "Your cell activity is strong today."
                  : "Your active driver ratio is below the target threshold."}
              </p>
              {cells && cells.some(cell => cell.maxDrivers > 0 && (cell.driverCount / cell.maxDrivers) > 0.9) && (
                <p className="text-sm text-destructive" data-testid="text-insight-capacity-warning">
                  One or more cells are nearing capacity.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("drivers")}
                  data-testid="button-insight-view-drivers"
                >
                  View Drivers
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("funding")}
                  data-testid="button-insight-funding-center"
                >
                  Funding Center
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-coaching">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Coaching Alerts
              </CardTitle>
              <div className="flex items-center gap-2">
                {activeCoaching.length > 0 && (
                  <Badge variant="outline" data-testid="badge-coaching-count">{activeCoaching.length}</Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateMutation.mutate()}
                  disabled={isReadOnly || generateMutation.isPending}
                  data-testid="button-generate-coaching"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generateMutation.isPending ? "animate-spin" : ""}`} />
                  Generate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeCoaching.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-coaching">No active coaching alerts.</p>
              ) : (
                <div className="space-y-3">
                  {activeCoaching.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0" data-testid={`coaching-row-${item.id}`}>
                      <div className="flex items-start gap-2 min-w-0">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                            <span className="text-xs text-muted-foreground capitalize">{item.coachingType.replace(/_/g, " ")}</span>
                          </div>
                          <p className="text-sm">{item.message}</p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => dismissMutation.mutate(item.id)} disabled={isReadOnly || dismissMutation.isPending} data-testid={`button-dismiss-coaching-${item.id}`}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => { window.location.href = "/admin"; }}
                  data-testid="button-director-contact-support"
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                  Contact Human Support
                </Button>
              </div>
            </CardContent>
          </Card>

          {analytics && (
            <Card data-testid="card-performance-overview">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Performance Overview
                </CardTitle>
                <Badge
                  variant={analytics.cellHealthBadge === "healthy" ? "default" : analytics.cellHealthBadge === "at_risk" ? "secondary" : "destructive"}
                  data-testid="badge-cell-health"
                >
                  {analytics.cellHealthBadge === "healthy" ? "Healthy Cell" : analytics.cellHealthBadge === "at_risk" ? "At Risk" : "Under Review"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-md border">
                    <p className="text-xs text-muted-foreground">Activity Ratio</p>
                    <p className="text-xl font-bold" data-testid="text-activity-ratio">{analytics.activityRatio}%</p>
                  </div>
                  <div className="p-3 rounded-md border">
                    <p className="text-xs text-muted-foreground">Commissionable</p>
                    <p className="text-xl font-bold" data-testid="text-analytics-commissionable">{analytics.commissionableToday}</p>
                  </div>
                  <div className="p-3 rounded-md border">
                    <p className="text-xs text-muted-foreground">Avg Trust Score</p>
                    <p className="text-xl font-bold" data-testid="text-analytics-trust">{analytics.avgTrustScore}</p>
                  </div>
                  <div className="p-3 rounded-md border">
                    <p className="text-xs text-muted-foreground">Funding This Month</p>
                    <p className="text-xl font-bold" data-testid="text-analytics-funding-count">{analytics.fundingThisMonth}</p>
                    <p className="text-xs text-muted-foreground">{analytics.fundingCount} total</p>
                  </div>
                </div>

                {analytics.weeklyGrowth && analytics.weeklyGrowth.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Driver Growth (4 Weeks)</p>
                    <div className="flex items-end gap-2 h-24">
                      {analytics.weeklyGrowth.map((week, i) => {
                        const maxCount = Math.max(...analytics.weeklyGrowth.map(w => w.count), 1);
                        const height = (week.count / maxCount) * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs font-medium" data-testid={`text-growth-count-${i}`}>{week.count}</span>
                            <div
                              className="w-full bg-primary/20 rounded-t-sm relative"
                              style={{ height: `${Math.max(height, 5)}%` }}
                            >
                              <div className="absolute inset-0 bg-primary rounded-t-sm" style={{ opacity: 0.7 }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate max-w-full">{week.week}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {Object.keys(analytics.driversByStatus || {}).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Driver Status Breakdown</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(analytics.driversByStatus).map(([status, count]) => (
                        <Badge key={status} variant="outline" data-testid={`badge-status-${status}`}>
                          {status}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analytics.lowTrustCount > 0 && (
                  <div className="p-3 rounded-md border border-yellow-500/30 bg-yellow-500/5">
                    <p className="text-sm flex items-center gap-2" data-testid="text-low-trust-warning">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      {analytics.lowTrustCount} driver{analytics.lowTrustCount !== 1 ? "s" : ""} with low trust scores
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {oversightSignals && oversightSignals.signals.length > 0 && (
            <Card data-testid="card-oversight-signals">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  ZIBA Oversight
                </CardTitle>
                <Badge variant="outline" data-testid="badge-signal-count">{oversightSignals.signals.length}</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {oversightSignals.signals.map((signal, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0" data-testid={`oversight-signal-${i}`}>
                      <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${signal.severity === "critical" ? "text-destructive" : signal.severity === "warning" ? "text-yellow-500" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <Badge variant={signal.severity === "critical" ? "destructive" : signal.severity === "warning" ? "secondary" : "outline"}>
                            {signal.severity}
                          </Badge>
                        </div>
                        <p className="text-sm">{signal.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-compliance-notices">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Compliance & Notices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground italic" data-testid="text-compliance-disclaimer">
                Director earnings are facilitation-based estimates subject to eligibility rules, daily caps, compliance reviews, and platform policies. ZIBA does not guarantee earnings, driver activity, or payout timelines.
              </p>
              <div className="text-xs text-muted-foreground space-y-1" data-testid="text-compliance-acknowledgements">
                <p>By operating as a director, you acknowledge:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>The platform acts as a facilitator between drivers and riders</li>
                  <li>Drivers are not employees of directors unless separately contracted</li>
                  <li>Abuse or fraud leads to suspension or termination</li>
                  <li>All actions are logged and auditable by platform administrators</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DRIVERS TAB */}
        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Drivers</CardTitle>
              <CardDescription>Manage and fund drivers in your cell</CardDescription>
            </CardHeader>
            <CardContent>
              {driversLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading drivers...</div>
              ) : !eligibleDrivers || eligibleDrivers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground" data-testid="text-no-drivers">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  No eligible drivers found in your cell.
                </div>
              ) : (
                <div className="space-y-2">
                  {eligibleDrivers.map((driver) => (
                    <div key={driver.userId} className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border last:border-0" data-testid={`driver-row-${driver.userId}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${driver.isOnline ? "bg-green-500" : "bg-muted-foreground"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-driver-name-${driver.userId}`}>{driver.fullName}</p>
                          <p className="text-xs text-muted-foreground">Cell {driver.cellNumber} &middot; {driver.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={driver.isOnline ? "default" : "secondary"} data-testid={`badge-driver-online-${driver.userId}`}>
                          {driver.isOnline ? "Online" : "Offline"}
                        </Badge>
                        <Badge variant={driverStatusVariant(driver.status)} data-testid={`badge-driver-status-${driver.userId}`}>
                          {driver.status ? driver.status.charAt(0).toUpperCase() + driver.status.slice(1) : "Unknown"}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleFundDriver(driver)}
                          disabled={isReadOnly || suspensionStatus?.suspended}
                          data-testid={`button-fund-driver-${driver.userId}`}
                        >
                          <Wallet className="h-3.5 w-3.5 mr-1.5" />
                          Fund
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
                          onClick={() => handleDiscipline(driver, "warn")}
                          disabled={isReadOnly}
                          data-testid={`button-warn-driver-${driver.userId}`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                          Warn
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDiscipline(driver, "suspend")}
                          disabled={isReadOnly}
                          data-testid={`button-suspend-driver-${driver.userId}`}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1.5" />
                          Suspend
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FUNDING TAB */}
        <TabsContent value="funding" className="space-y-4">
          {!acceptanceData?.accepted && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Director Funding Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Before using the funding feature, you must accept the following terms:</p>
                <div className="space-y-2 text-xs text-muted-foreground p-3 rounded-md border">
                  <p><strong>Voluntary Support:</strong> Any wallet funding provided to a Driver is voluntary support and does not constitute a loan, wage, salary, advance, or repayment obligation.</p>
                  <p><strong>No Coercion:</strong> Directors may not require, imply, or enforce performance, repayment, or compliance as a condition for wallet funding.</p>
                  <p><strong>Limitation of Liability:</strong> ZIBA facilitates wallet transfers and does not assume responsibility for agreements, expectations, or disputes arising from voluntary support.</p>
                  <p><strong>Platform Role:</strong> ZIBA is not an employer, lender, or guarantor. Directors act independently within platform rules.</p>
                </div>
                <Button onClick={() => acceptMutation.mutate()} disabled={isReadOnly || acceptMutation.isPending} data-testid="button-accept-terms">
                  {acceptMutation.isPending ? "Accepting..." : "I Accept These Terms"}
                </Button>
              </CardContent>
            </Card>
          )}

          {suspensionStatus?.suspended && (
            <Card className="border-destructive/30">
              <CardContent className="flex items-center gap-3 py-4">
                <Ban className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Funding Suspended</p>
                  <p className="text-xs text-muted-foreground">{suspensionStatus.suspension?.reason || "Your funding has been temporarily suspended pending admin review."}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {fundingLimits && (
            <Card data-testid="card-funding-limits">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Your Funding Limits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-md border">
                    <p className="text-xs text-muted-foreground mb-1">Daily</p>
                    <p className="text-lg font-bold">{parseFloat(fundingLimits.daily.remaining).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">of {parseFloat(fundingLimits.daily.limit).toLocaleString()} remaining</p>
                    <div className="w-full h-1.5 bg-muted rounded-full mt-2">
                      <div className="h-1.5 bg-primary rounded-full" style={{ width: `${Math.min((parseFloat(fundingLimits.daily.used) / parseFloat(fundingLimits.daily.limit)) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="p-3 rounded-md border">
                    <p className="text-xs text-muted-foreground mb-1">Weekly</p>
                    <p className="text-lg font-bold">{parseFloat(fundingLimits.weekly.remaining).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">of {parseFloat(fundingLimits.weekly.limit).toLocaleString()} remaining</p>
                    <div className="w-full h-1.5 bg-muted rounded-full mt-2">
                      <div className="h-1.5 bg-primary rounded-full" style={{ width: `${Math.min((parseFloat(fundingLimits.weekly.used) / parseFloat(fundingLimits.weekly.limit)) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="p-3 rounded-md border">
                    <p className="text-xs text-muted-foreground mb-1">Monthly</p>
                    <p className="text-lg font-bold">{parseFloat(fundingLimits.monthly.remaining).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">of {parseFloat(fundingLimits.monthly.limit).toLocaleString()} remaining</p>
                    <div className="w-full h-1.5 bg-muted rounded-full mt-2">
                      <div className="h-1.5 bg-primary rounded-full" style={{ width: `${Math.min((parseFloat(fundingLimits.monthly.used) / parseFloat(fundingLimits.monthly.limit)) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-select-driver-fund">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Fund a Driver</CardTitle>
              <CardDescription>Select an eligible driver from your cell</CardDescription>
            </CardHeader>
            <CardContent>
              {driversLoading ? (
                <div className="py-4 text-center text-muted-foreground">Loading drivers...</div>
              ) : !eligibleDrivers || eligibleDrivers.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">No eligible drivers</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {eligibleDrivers.map((driver) => (
                    <Button
                      key={driver.userId}
                      variant="outline"
                      className="justify-start gap-2 h-auto py-2"
                      onClick={() => handleFundDriver(driver)}
                      disabled={isReadOnly || !acceptanceData?.accepted || suspensionStatus?.suspended}
                      data-testid={`button-select-fund-${driver.userId}`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${driver.isOnline ? "bg-green-500" : "bg-muted-foreground"}`} />
                      <span className="truncate">{driver.fullName}</span>
                      <Send className="h-3.5 w-3.5 ml-auto shrink-0" />
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-funding-history">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Funding History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="py-4 text-center text-muted-foreground">Loading history...</div>
              ) : !fundingHistory || fundingHistory.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground" data-testid="text-no-funding-history">No funding transactions yet.</div>
              ) : (
                <div className="space-y-2">
                  {fundingHistory.map((txn) => (
                    <div key={txn.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0" data-testid={`funding-txn-${txn.id}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{txn.driverName}</p>
                          <p className="text-xs text-muted-foreground">{PURPOSE_LABELS[txn.purposeTag] || txn.purposeTag}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{parseFloat(txn.amount).toLocaleString()}</span>
                        <Badge variant={statusVariant(txn.status)}>{txn.status}</Badge>
                        {txn.flagged && <Badge variant="destructive">Flagged</Badge>}
                        <span className="text-xs text-muted-foreground">{formatDateTime(txn.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STAFF TAB */}
        <TabsContent value="staff" className="space-y-4">
          <Card data-testid="card-staff">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle>Staff Members</CardTitle>
                <CardDescription>Manage your staff accounts and permissions</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setCreateStaffOpen(true)}
                disabled={isReadOnly}
                data-testid="button-open-create-staff"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Create Staff
              </Button>
            </CardHeader>
            <CardContent>
              {staff && staff.length > 0 ? (
                <div className="space-y-3">
                  {staff.map((member) => (
                    <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0" data-testid={`staff-row-${member.id}`}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium" data-testid={`text-staff-userid-${member.id}`}>{member.staffUserId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" data-testid={`badge-staff-role-${member.id}`}>{member.staffRole}</Badge>
                        <Badge variant={statusVariant(member.status)} data-testid={`badge-staff-status-${member.id}`}>{member.status}</Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveStaff(member.id)}
                          disabled={isReadOnly}
                          data-testid={`button-remove-staff-${member.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground" data-testid="text-no-staff">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  No staff members yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACTIVITY LOG TAB */}
        <TabsContent value="activity" className="space-y-4">
          <Card data-testid="card-action-logs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                Activity Log
              </CardTitle>
              <CardDescription>Immutable record of all director actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4" data-testid="div-log-filters">
                <Input
                  type="date"
                  value={logDateFilter}
                  onChange={(e) => setLogDateFilter(e.target.value)}
                  className="w-auto"
                  data-testid="input-log-date-filter"
                />
                <Select value={logActionFilter} onValueChange={setLogActionFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-log-action-filter">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action}>{action.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Filter by user..."
                  value={logUserFilter}
                  onChange={(e) => setLogUserFilter(e.target.value)}
                  className="w-[180px]"
                  data-testid="input-log-user-filter"
                />
                {(logDateFilter || logActionFilter !== "all" || logUserFilter) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setLogDateFilter(""); setLogActionFilter("all"); setLogUserFilter(""); }}
                    data-testid="button-clear-log-filters"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {filteredLogs.length > 0 ? (
                <div className="space-y-2">
                  {filteredLogs.map((log, index) => (
                    <div key={`${log.actorId}-${log.createdAt}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-border last:border-0" data-testid={`action-log-row-${index}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Activity className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate" data-testid={`text-log-action-${index}`}>{log.action.replace(/_/g, " ")}</span>
                        {log.targetType && <Badge variant="secondary">{log.targetType}</Badge>}
                        {log.actorRole && <Badge variant="outline">{log.actorRole}</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0" data-testid={`text-log-date-${index}`}>{formatDateTime(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground" data-testid="text-no-logs">
                  <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  {(logDateFilter || logActionFilter !== "all" || logUserFilter)
                    ? "No matching activity logs found."
                    : "No activity logs yet."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EARNINGS TAB */}
        <TabsContent value="earnings" className="space-y-4">
          {earningsLoading ? (
            <div className="py-8 text-center text-muted-foreground" data-testid="text-earnings-loading">Loading earnings data...</div>
          ) : earningsData ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card data-testid="card-active-drivers-today">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Drivers Today</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-earnings-active-drivers">{earningsData.activeDriversToday}</div>
                  </CardContent>
                </Card>
                <Card data-testid="card-commissionable-drivers">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Commissionable Drivers</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-earnings-commissionable">{earningsData.commissionableDriversToday}</div>
                  </CardContent>
                </Card>
                <Card data-testid="card-eligible-drivers">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Eligible Drivers</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-earnings-eligible">{earningsData.eligibleDrivers}</div>
                    <p className="text-xs text-muted-foreground">77% rule applied</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-estimated-earnings">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Estimated Earnings</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-estimated-earnings">
                      {parseFloat(earningsData.estimatedEarnings) > 0 ? `${parseFloat(earningsData.estimatedEarnings).toFixed(0)}` : "---"}
                    </div>
                    <p className="text-xs text-muted-foreground">Rounded estimate</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-payout-status">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Payout Status</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <Badge
                      variant={payoutStateVariant(earningsData.payoutState || earningsData.payoutStatus)}
                      data-testid="badge-payout-status"
                    >
                      {PAYOUT_STATE_LABELS[earningsData.payoutState] || earningsData.payoutState || earningsData.payoutStatus || "Pending"}
                    </Badge>
                    {earningsData.commissionFrozen && (
                      <p className="text-xs text-destructive mt-1">Commissions frozen</p>
                    )}
                  </CardContent>
                </Card>
                <Card data-testid="card-last-payout">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Last Payout</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-last-payout-date">
                      {earningsData.lastPayoutDate ? formatDate(earningsData.lastPayoutDate) : "---"}
                    </div>
                    <p className="text-xs text-muted-foreground" data-testid="text-last-payout-label">
                      {earningsData.lastPayoutDate ? "Most recent payout" : "No payouts yet"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {earningsData.holdNotice && (
                <Card className="border-yellow-500/50" data-testid="card-hold-notice">
                  <CardContent className="flex items-start gap-3 p-4">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium" data-testid="text-hold-notice">{earningsData.holdNotice}</p>
                      {earningsData.heldCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-1" data-testid="text-held-count">
                          {earningsData.heldCount} payout{earningsData.heldCount !== 1 ? "s" : ""} currently held
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {earningsData.history && earningsData.history.length > 0 && (
                <Card data-testid="card-earnings-history">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Earnings History
                    </CardTitle>
                    <CardDescription>Recent daily activity and payout status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Active Drivers</TableHead>
                            <TableHead>Commissionable Drivers</TableHead>
                            <TableHead>Payout Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {earningsData.history.map((row, i) => (
                            <TableRow key={row.date} data-testid={`row-earnings-${i}`}>
                              <TableCell data-testid={`text-earnings-date-${i}`}>{row.date}</TableCell>
                              <TableCell data-testid={`text-earnings-active-${i}`}>{row.activeDrivers}</TableCell>
                              <TableCell data-testid={`text-earnings-comm-${i}`}>{row.commissionableDrivers}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={payoutStateVariant(row.payoutStatus)}
                                  data-testid={`badge-earnings-status-${i}`}
                                >
                                  {PAYOUT_STATE_LABELS[row.payoutStatus] || row.payoutStatus || "Pending"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {earningsData.payouts && earningsData.payouts.length > 0 && (
                <Card data-testid="card-payout-history">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Payout History
                    </CardTitle>
                    <CardDescription>Detailed payout records</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>State</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Partial</TableHead>
                            <TableHead>Released Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {earningsData.payouts.map((payout, i) => (
                            <TableRow key={payout.id} data-testid={`row-payout-${i}`}>
                              <TableCell data-testid={`text-payout-period-${i}`}>{formatDate(payout.periodDate)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={payoutStateVariant(payout.payoutState)}
                                  data-testid={`badge-payout-state-${i}`}
                                >
                                  {PAYOUT_STATE_LABELS[payout.payoutState] || payout.payoutState}
                                </Badge>
                              </TableCell>
                              <TableCell data-testid={`text-payout-amount-${i}`}>
                                {parseFloat(payout.estimatedEarnings) > 0 ? parseFloat(payout.estimatedEarnings).toFixed(0) : "---"}
                              </TableCell>
                              <TableCell data-testid={`text-payout-partial-${i}`}>
                                {payout.partialReleaseAmount ? parseFloat(payout.partialReleaseAmount).toFixed(0) : "---"}
                              </TableCell>
                              <TableCell data-testid={`text-payout-released-${i}`}>
                                {payout.releasedAt ? formatDate(payout.releasedAt) : "---"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {earningsData.disputeablePayouts && earningsData.disputeablePayouts.length > 0 && (
                <DisputeSection disputeablePayouts={earningsData.disputeablePayouts} />
              )}

              {earningsData.history?.length === 0 && (!earningsData.payouts || earningsData.payouts.length === 0) && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p data-testid="text-no-earnings">No earnings data available yet.</p>
                  </CardContent>
                </Card>
              )}

              <Card data-testid="card-legal-disclaimer">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground italic" data-testid="text-legal-disclaimer">
                    {earningsData.legalDisclaimer}
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p>Unable to load earnings data.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="space-y-4">
          {perfLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-48" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card data-testid="card-perf-score">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {performanceData?.current ? (
                      <div className="flex items-center gap-4">
                        <div className="text-4xl font-bold" data-testid="text-perf-score">
                          {performanceData.current.score}
                        </div>
                        <div className="space-y-1">
                          <Badge variant={tierVariant(performanceData.current.tier)} data-testid="badge-perf-tier">
                            {tierLabel(performanceData.current.tier)}
                          </Badge>
                          <p className="text-xs text-muted-foreground" data-testid="text-perf-calculated">
                            Calculated {formatDate(performanceData.current.calculatedAt)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground" data-testid="text-perf-not-calculated">Not yet calculated</p>
                    )}
                  </CardContent>
                </Card>

                <Card data-testid="card-perf-thresholds">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tier Thresholds</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {performanceData?.thresholds ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="default">Gold</Badge>
                          <span className="text-muted-foreground">{performanceData.thresholds.gold}+</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary">Silver</Badge>
                          <span className="text-muted-foreground">{performanceData.thresholds.silver}+</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">Bronze</Badge>
                          <span className="text-muted-foreground">{performanceData.thresholds.bronze}+</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No threshold data</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {performanceData?.current && (
                <Card data-testid="card-perf-breakdown">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Component Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <Card data-testid="card-perf-activity">
                        <CardContent className="pt-4 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Driver Activity</p>
                          <div className="text-lg font-bold" data-testid="text-perf-activity-score">{performanceData.current.driverActivityScore}</div>
                          <Progress value={performanceData.current.driverActivityScore} className="h-2" />
                        </CardContent>
                      </Card>
                      <Card data-testid="card-perf-quality">
                        <CardContent className="pt-4 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Driver Quality</p>
                          <div className="text-lg font-bold" data-testid="text-perf-quality-score">{performanceData.current.driverQualityScore}</div>
                          <Progress value={performanceData.current.driverQualityScore} className="h-2" />
                        </CardContent>
                      </Card>
                      <Card data-testid="card-perf-retention">
                        <CardContent className="pt-4 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Driver Retention</p>
                          <div className="text-lg font-bold" data-testid="text-perf-retention-score">{performanceData.current.driverRetentionScore}</div>
                          <Progress value={performanceData.current.driverRetentionScore} className="h-2" />
                        </CardContent>
                      </Card>
                      <Card data-testid="card-perf-compliance">
                        <CardContent className="pt-4 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Compliance & Safety</p>
                          <div className="text-lg font-bold" data-testid="text-perf-compliance-score">{performanceData.current.complianceSafetyScore}</div>
                          <Progress value={performanceData.current.complianceSafetyScore} className="h-2" />
                        </CardContent>
                      </Card>
                      <Card data-testid="card-perf-feedback">
                        <CardContent className="pt-4 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Admin Feedback</p>
                          <div className="text-lg font-bold" data-testid="text-perf-feedback-score">{performanceData.current.adminFeedbackScore}</div>
                          <Progress value={performanceData.current.adminFeedbackScore} className="h-2" />
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              )}

              {performanceData?.history && performanceData.history.length > 0 && (
                <Card data-testid="card-perf-history">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Score History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Tier</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {performanceData.history.slice(0, 10).map((entry: any, idx: number) => (
                          <TableRow key={idx} data-testid={`row-perf-history-${idx}`}>
                            <TableCell data-testid={`text-perf-history-date-${idx}`}>{formatDate(entry.calculatedAt)}</TableCell>
                            <TableCell data-testid={`text-perf-history-score-${idx}`}>{entry.score}</TableCell>
                            <TableCell>
                              <Badge variant={tierVariant(entry.tier)} data-testid={`badge-perf-history-tier-${idx}`}>
                                {tierLabel(entry.tier)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <Card data-testid="card-perf-incentives">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Active Incentives</CardTitle>
                </CardHeader>
                <CardContent>
                  {performanceData?.incentives && performanceData.incentives.filter((i: any) => i.isActive).length > 0 ? (
                    <div className="space-y-3">
                      {performanceData.incentives.filter((i: any) => i.isActive).map((incentive: any) => (
                        <div key={incentive.id} className="flex flex-wrap items-start justify-between gap-2 p-3 rounded-md border" data-testid={`card-perf-incentive-${incentive.id}`}>
                          <div className="space-y-1">
                            <Badge variant="secondary" data-testid={`badge-incentive-type-${incentive.id}`}>{incentive.incentiveType}</Badge>
                            <p className="text-sm" data-testid={`text-incentive-desc-${incentive.id}`}>{incentive.description}</p>
                          </div>
                          <div className="text-xs text-muted-foreground text-right space-y-0.5">
                            <div data-testid={`text-incentive-applied-${incentive.id}`}>Applied: {formatDate(incentive.appliedAt)}</div>
                            {incentive.expiresAt && <div data-testid={`text-incentive-expires-${incentive.id}`}>Expires: {formatDate(incentive.expiresAt)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-incentives">No active incentives</p>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-perf-restrictions">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Active Restrictions</CardTitle>
                </CardHeader>
                <CardContent>
                  {performanceData?.restrictions && performanceData.restrictions.filter((r: any) => r.isActive).length > 0 ? (
                    <div className="space-y-3">
                      {performanceData.restrictions.filter((r: any) => r.isActive).map((restriction: any) => (
                        <div key={restriction.id} className="flex flex-wrap items-start justify-between gap-2 p-3 rounded-md border border-destructive/30" data-testid={`card-perf-restriction-${restriction.id}`}>
                          <div className="space-y-1">
                            <Badge variant="destructive" data-testid={`badge-restriction-type-${restriction.id}`}>{restriction.restrictionType}</Badge>
                            <p className="text-sm" data-testid={`text-restriction-desc-${restriction.id}`}>{restriction.description}</p>
                          </div>
                          <div className="text-xs text-muted-foreground" data-testid={`text-restriction-applied-${restriction.id}`}>
                            Applied: {formatDate(restriction.appliedAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-restrictions">No active restrictions</p>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={() => calcPerformanceMutation.mutate()}
                  disabled={isReadOnly || calcPerformanceMutation.isPending}
                  data-testid="button-recalculate-score"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${calcPerformanceMutation.isPending ? "animate-spin" : ""}`} />
                  {calcPerformanceMutation.isPending ? "Recalculating..." : "Recalculate Score"}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* DISPUTES TAB */}
        <TabsContent value="disputes" className="space-y-4">
          <Card data-testid="card-dispute-form">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Submit New Dispute
              </CardTitle>
              <CardDescription>Raise a concern or dispute for administrator review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Dispute Type</Label>
                <Select value={disputeType} onValueChange={setDisputeType}>
                  <SelectTrigger data-testid="select-dispute-type">
                    <SelectValue placeholder="Select dispute type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payout_hold">Payout Hold</SelectItem>
                    <SelectItem value="suspension">Suspension</SelectItem>
                    <SelectItem value="driver_reassignment">Driver Reassignment</SelectItem>
                    <SelectItem value="staff_restriction">Staff Restriction</SelectItem>
                    <SelectItem value="commission_adjustment">Commission Adjustment</SelectItem>
                    <SelectItem value="cell_limit">Cell Limit</SelectItem>
                    <SelectItem value="termination">Termination</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dispute-subject">Subject</Label>
                <Input
                  id="dispute-subject"
                  placeholder="Brief summary of the dispute"
                  value={disputeSubject}
                  onChange={(e) => setDisputeSubject(e.target.value.slice(0, 200))}
                  maxLength={200}
                  data-testid="input-dispute-subject"
                />
                <p className="text-xs text-muted-foreground mt-1">{disputeSubject.length}/200</p>
              </div>
              <div>
                <Label htmlFor="dispute-description">Description</Label>
                <Textarea
                  id="dispute-description"
                  placeholder="Describe the issue in detail (minimum 20 characters)"
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  data-testid="textarea-dispute-description"
                />
                {disputeDescription.length > 0 && disputeDescription.length < 20 && (
                  <p className="text-xs text-destructive mt-1">Description must be at least 20 characters.</p>
                )}
              </div>
              <div>
                <Label htmlFor="dispute-evidence">Evidence Notes (optional)</Label>
                <Textarea
                  id="dispute-evidence"
                  placeholder="Any supporting information or references"
                  value={disputeEvidenceNotes}
                  onChange={(e) => setDisputeEvidenceNotes(e.target.value)}
                  data-testid="textarea-dispute-evidence"
                />
              </div>
              <Button
                onClick={() => submitDisputeMutation.mutate()}
                disabled={
                  isReadOnly ||
                  !disputeType ||
                  !disputeSubject ||
                  disputeDescription.length < 20 ||
                  submitDisputeMutation.isPending
                }
                data-testid="button-submit-dispute"
              >
                {submitDisputeMutation.isPending ? "Submitting..." : "Submit Dispute"}
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-disputes-list">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Your Disputes
              </CardTitle>
              <CardDescription>Track the status of your submitted disputes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {disputesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : !disputesData?.disputes?.length ? (
                <div className="py-8 text-center text-muted-foreground" data-testid="text-no-disputes">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p>No disputes submitted yet.</p>
                </div>
              ) : (
                disputesData.disputes.map((dispute) => {
                  const isExpanded = expandedDisputeId === dispute.id;
                  const isClosed = dispute.status === "resolved" || dispute.status === "closed";
                  const statusBadgeVariant = (() => {
                    switch (dispute.status) {
                      case "submitted": return "secondary" as const;
                      case "under_review": return "outline" as const;
                      case "admin_reviewed": return "outline" as const;
                      case "escalated": return "destructive" as const;
                      case "resolved": return "default" as const;
                      case "closed": return "secondary" as const;
                      default: return "secondary" as const;
                    }
                  })();

                  return (
                    <div
                      key={dispute.id}
                      className="border rounded-md p-3 space-y-2"
                      data-testid={`card-dispute-${dispute.id}`}
                    >
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                        onClick={() => setExpandedDisputeId(isExpanded ? null : dispute.id)}
                        data-testid={`button-expand-dispute-${dispute.id}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium" data-testid={`text-dispute-subject-${dispute.id}`}>
                            {dispute.subject}
                          </span>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-dispute-type-${dispute.id}`}>
                            {dispute.disputeType.replace(/_/g, " ")}
                          </Badge>
                          <Badge variant={statusBadgeVariant} data-testid={`badge-dispute-status-${dispute.id}`}>
                            {dispute.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground" data-testid={`text-dispute-date-${dispute.id}`}>
                          {formatDate(dispute.createdAt)}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="pt-2 border-t space-y-3">
                          <p className="text-sm text-muted-foreground" data-testid={`text-dispute-desc-${dispute.id}`}>
                            {dispute.description}
                          </p>

                          {disputeDetail?.messages && disputeDetail.messages.length > 0 && (
                            <div className="space-y-2" data-testid={`list-dispute-messages-${dispute.id}`}>
                              <p className="text-xs font-medium text-muted-foreground">Messages</p>
                              {disputeDetail.messages.map((msg) => (
                                <div key={msg.id} className="flex flex-wrap items-start gap-2 p-2 rounded-md bg-muted" data-testid={`message-${msg.id}`}>
                                  <Badge variant="outline" className="text-xs" data-testid={`badge-sender-${msg.id}`}>
                                    {msg.senderRole}
                                  </Badge>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm" data-testid={`text-message-content-${msg.id}`}>{msg.content}</p>
                                    <p className="text-xs text-muted-foreground mt-1" data-testid={`text-message-date-${msg.id}`}>
                                      {formatDateTime(msg.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {isClosed ? (
                            <div className="p-3 rounded-md border bg-muted/50 text-sm text-muted-foreground" data-testid={`text-dispute-closed-${dispute.id}`}>
                              This dispute is closed and read-only.
                            </div>
                          ) : (
                            <div className="flex gap-2" data-testid={`form-dispute-reply-${dispute.id}`}>
                              <Textarea
                                placeholder="Type your reply..."
                                value={disputeReplyText[dispute.id] || ""}
                                onChange={(e) =>
                                  setDisputeReplyText((prev) => ({ ...prev, [dispute.id]: e.target.value }))
                                }
                                className="flex-1"
                                data-testid={`textarea-dispute-reply-${dispute.id}`}
                              />
                              <Button
                                onClick={() =>
                                  replyDisputeMutation.mutate({
                                    disputeId: dispute.id,
                                    content: disputeReplyText[dispute.id] || "",
                                  })
                                }
                                disabled={
                                  isReadOnly ||
                                  !(disputeReplyText[dispute.id] || "").trim() ||
                                  replyDisputeMutation.isPending
                                }
                                data-testid={`button-reply-dispute-${dispute.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <div className="p-3 rounded-md border bg-muted/50 text-xs text-muted-foreground" data-testid="text-disputes-disclaimer">
            Director disputes are reviewed by administrators. Submissions are tracked and form part of your account record. ZIBA aims to resolve disputes fairly and promptly.
          </div>
        </TabsContent>

        {/* CORPORATE RIDES TAB */}
        <TabsContent value="corporate-rides" className="space-y-4">
          <DirectorCorporateRidesPanel />
        </TabsContent>

        {/* SPECIAL RIDES TAB */}
        <TabsContent value="special-rides" className="space-y-4">
          <DirectorSpecialRidesPanel />
        </TabsContent>
      </Tabs>

      <FundDriverDialog
        driver={selectedDriver}
        open={fundDialogOpen}
        onOpenChange={setFundDialogOpen}
      />

      <DisciplineDialog
        driver={disciplineDriver}
        actionType={disciplineAction}
        open={disciplineDialogOpen}
        onOpenChange={setDisciplineDialogOpen}
      />

      <CreateStaffDialog
        open={createStaffOpen}
        onOpenChange={setCreateStaffOpen}
      />

      <RemoveStaffDialog
        staffId={removeStaffId}
        open={removeStaffOpen}
        onOpenChange={setRemoveStaffOpen}
      />
    </div>
  );
}
