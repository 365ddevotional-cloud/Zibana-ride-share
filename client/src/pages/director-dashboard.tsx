import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users, Shield, Clock, AlertTriangle, Activity, UserPlus, ChevronRight,
  Calendar, Bell, X, RefreshCw, Wallet, Send, Ban, History, DollarSign,
  CheckCircle, XCircle, Eye
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

export default function DirectorDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<EligibleDriver | null>(null);

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

  const { data: acceptanceData } = useQuery<{ accepted: boolean }>({
    queryKey: ["/api/director/funding/acceptance"],
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

  const { profile, lifespan, cells, metrics, staff, coaching, actionLogs } = dashboard;
  const activeCoaching = coaching?.filter((c) => !c.isDismissed) ?? [];

  const handleFundDriver = (driver: EligibleDriver) => {
    setSelectedDriver(driver);
    setFundDialogOpen(true);
  };

  const todayFunding = fundingHistory?.filter(t => {
    const today = new Date();
    const txDate = new Date(t.createdAt);
    return txDate.toDateString() === today.toDateString() && t.status === "completed";
  }) || [];
  const todayFundingTotal = todayFunding.reduce((sum, t) => sum + parseFloat(t.amount), 0);

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1" data-testid="tabs-director">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="drivers" data-testid="tab-drivers">Drivers</TabsTrigger>
          <TabsTrigger value="funding" data-testid="tab-funding">Funding</TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff">Staff</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

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
                  disabled={generateMutation.isPending}
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
                      <Button size="icon" variant="ghost" onClick={() => dismissMutation.mutate(item.id)} disabled={dismissMutation.isPending} data-testid={`button-dismiss-coaching-${item.id}`}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
                      <div className="flex items-center gap-2">
                        <Badge variant={driver.isOnline ? "default" : "secondary"}>
                          {driver.isOnline ? "Online" : "Offline"}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleFundDriver(driver)}
                          disabled={suspensionStatus?.suspended}
                          data-testid={`button-fund-driver-${driver.userId}`}
                        >
                          <Wallet className="h-3.5 w-3.5 mr-1.5" />
                          Fund
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
                <Button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending} data-testid="button-accept-terms">
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
                      disabled={!acceptanceData?.accepted || suspensionStatus?.suspended}
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
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>Manage your staff accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {staff && staff.length > 0 ? (
                <div className="space-y-3">
                  {staff.map((member) => (
                    <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0" data-testid={`staff-row-${member.id}`}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{member.staffUserId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{member.staffRole}</Badge>
                        <Badge variant={statusVariant(member.status)}>{member.status}</Badge>
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
              {actionLogs && actionLogs.length > 0 ? (
                <div className="space-y-2">
                  {actionLogs.map((log, index) => (
                    <div key={`${log.actorId}-${log.createdAt}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-border last:border-0" data-testid={`action-log-row-${index}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Activity className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">{log.action.replace(/_/g, " ")}</span>
                        {log.targetType && <Badge variant="secondary">{log.targetType}</Badge>}
                        {log.actorRole && <Badge variant="outline">{log.actorRole}</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground" data-testid="text-no-logs">
                  <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  No activity logs yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FundDriverDialog
        driver={selectedDriver}
        open={fundDialogOpen}
        onOpenChange={setFundDialogOpen}
      />
    </div>
  );
}
