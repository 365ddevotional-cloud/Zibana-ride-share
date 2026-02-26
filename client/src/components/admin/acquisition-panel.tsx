import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  Building,
  UserPlus,
  Target,
  Clock,
  Activity,
  XCircle,
} from "lucide-react";
import { API_BASE } from "@/lib/apiBase";

type AcquisitionAnalytics = {
  totalAcquired: number;
  byChannel: Record<string, number>;
  avgTimeToFirstTrip: number;
  referralConversionRate: number;
  fleetOwnerEffectiveness: number;
  retentionD7: number;
  retentionD30: number;
  costPerActivatedDriver: number;
  activeSupplyAlerts: number;
  onboardingPipeline: Record<string, number>;
};

type PipelineStage = { stage: string; count: number };

type DriverAcquisition = {
  id: string;
  driverUserId: string;
  channel: string;
  onboardingStage: string;
  countryCode: string;
  stateCode: string | null;
  createdAt: string;
  activatedAt: string | null;
};

type FleetOwner = {
  id: string;
  userId: string;
  companyName: string | null;
  countryCode: string;
  totalDriversRecruited: number;
  activeDrivers: number;
  maxDrivers: number;
  bonusPerActivation: string;
  suspended: boolean;
  suspendedReason: string | null;
  createdAt: string;
};

type SupplyAlert = {
  id: string;
  countryCode: string;
  stateCode: string | null;
  alertType: string;
  severity: string;
  message: string;
  status: string;
  createdAt: string;
};

const STAGE_ORDER = ["SIGNUP", "DOCUMENTS", "REVIEW", "FIRST_TRIP", "ACTIVE"];
const STAGE_LABELS: Record<string, string> = {
  SIGNUP: "Signed Up",
  DOCUMENTS: "Documents",
  REVIEW: "Under Review",
  FIRST_TRIP: "First Trip",
  ACTIVE: "Active",
};

const CHANNEL_LABELS: Record<string, string> = {
  REFERRAL: "Referral",
  FLEET_OWNER: "Fleet Owner",
  PUBLIC_SIGNUP: "Public Signup",
  ADMIN_INVITED: "Admin Invited",
};

function stageBadgeVariant(stage: string): "default" | "secondary" | "outline" | "destructive" {
  switch (stage) {
    case "ACTIVE": return "default";
    case "FIRST_TRIP": return "secondary";
    case "REVIEW": return "outline";
    default: return "secondary";
  }
}

function severityBadgeVariant(severity: string): "default" | "secondary" | "outline" | "destructive" {
  switch (severity) {
    case "CRITICAL": return "destructive";
    case "HIGH": return "destructive";
    case "MEDIUM": return "outline";
    default: return "secondary";
  }
}

export function AcquisitionPanel() {
  const { toast } = useToast();
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [showFleetDialog, setShowFleetDialog] = useState(false);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [fleetForm, setFleetForm] = useState({ userId: "", companyName: "", countryCode: "NG", maxDrivers: "50", bonusPerActivation: "500.00" });
  const [zoneForm, setZoneForm] = useState({ countryCode: "NG", stateCode: "", status: "PAUSED", reason: "" });

  const countryParam = countryFilter === "all" ? "" : `?countryCode=${countryFilter}`;

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AcquisitionAnalytics>({
    queryKey: ["/api/admin/acquisition/analytics", countryFilter],
    queryFn: () => fetch(`${API_BASE}/api/admin/acquisition/analytics${countryParam}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: pipeline } = useQuery<PipelineStage[]>({
    queryKey: ["/api/admin/acquisition/pipeline", countryFilter],
    queryFn: () => fetch(`${API_BASE}/api/admin/acquisition/pipeline${countryParam}`, { credentials: "include" }).then(r => r.json()),
  });

  const driverParam = (() => {
    const params: string[] = [];
    if (countryFilter !== "all") params.push(`countryCode=${countryFilter}`);
    if (channelFilter !== "all") params.push(`channel=${channelFilter}`);
    return params.length > 0 ? `?${params.join("&")}` : "";
  })();

  const { data: drivers, isLoading: driversLoading } = useQuery<DriverAcquisition[]>({
    queryKey: ["/api/admin/acquisition/drivers", countryFilter, channelFilter],
    queryFn: () => fetch(`${API_BASE}/api/admin/acquisition/drivers${driverParam}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: fleetOwners, isLoading: fleetsLoading } = useQuery<FleetOwner[]>({
    queryKey: ["/api/admin/fleet-owners"],
  });

  const { data: supplyAlerts } = useQuery<SupplyAlert[]>({
    queryKey: ["/api/admin/supply-alerts", countryFilter],
    queryFn: () => fetch(`${API_BASE}/api/admin/supply-alerts${countryParam}`, { credentials: "include" }).then(r => r.json()),
  });

  const createFleetMutation = useMutation({
    mutationFn: (data: typeof fleetForm) => apiRequest("POST", "/api/admin/fleet-owners/create", {
      userId: data.userId,
      companyName: data.companyName || null,
      countryCode: data.countryCode,
      maxDrivers: parseInt(data.maxDrivers),
      bonusPerActivation: data.bonusPerActivation,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fleet-owners"] });
      setShowFleetDialog(false);
      setFleetForm({ userId: "", companyName: "", countryCode: "NG", maxDrivers: "50", bonusPerActivation: "500.00" });
      toast({ title: "Fleet owner created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const suspendFleetMutation = useMutation({
    mutationFn: (data: { userId: string; reason: string }) => apiRequest("POST", "/api/admin/fleet-owners/suspend", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fleet-owners"] });
      toast({ title: "Fleet owner suspended" });
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest("POST", "/api/admin/supply-alerts/resolve", { alertId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/supply-alerts"] });
      toast({ title: "Alert resolved" });
    },
  });

  const setZoneControlMutation = useMutation({
    mutationFn: (data: typeof zoneForm) => apiRequest("POST", "/api/admin/acquisition/zone-controls", {
      countryCode: data.countryCode,
      stateCode: data.stateCode || null,
      status: data.status,
      reason: data.reason,
    }),
    onSuccess: () => {
      setShowZoneDialog(false);
      toast({ title: "Zone control updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const approveDriverMutation = useMutation({
    mutationFn: (driverUserId: string) => apiRequest("POST", "/api/admin/acquisition/approve-driver", { driverUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/acquisition/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/acquisition/pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/acquisition/analytics"] });
      toast({ title: "Driver approved" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const pipelineStages = STAGE_ORDER.map(stage => ({
    stage,
    label: STAGE_LABELS[stage],
    count: pipeline?.find(p => p.stage === stage)?.count || analytics?.onboardingPipeline?.[stage] || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold" data-testid="text-acquisition-title">Driver Acquisition</h2>
          <p className="text-sm text-muted-foreground">Track driver onboarding, referrals, fleet owners, and supply</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-acquisition-country">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              <SelectItem value="NG">Nigeria</SelectItem>
              <SelectItem value="US">United States</SelectItem>
              <SelectItem value="ZA">South Africa</SelectItem>
              <SelectItem value="GH">Ghana</SelectItem>
              <SelectItem value="CA">Canada</SelectItem>
              <SelectItem value="LR">Liberia</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowFleetDialog(true)} data-testid="button-add-fleet-owner">
            <Building className="h-4 w-4 mr-2" />
            Add Fleet Owner
          </Button>
          <Button variant="outline" onClick={() => setShowZoneDialog(true)} data-testid="button-zone-control">
            <Target className="h-4 w-4 mr-2" />
            Zone Control
          </Button>
        </div>
      </div>

      {analyticsLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading analytics...</div>
      ) : analytics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Acquired</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-acquired">{analytics.totalAcquired}</div>
              <p className="text-xs text-muted-foreground">
                {Object.entries(analytics.byChannel).map(([ch, ct]) => `${CHANNEL_LABELS[ch] || ch}: ${ct}`).join(" | ")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time to First Trip</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-first-trip">{analytics.avgTimeToFirstTrip}h</div>
              <p className="text-xs text-muted-foreground">Hours from signup to first trip</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Referral Conversion</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-referral-rate">{analytics.referralConversionRate}%</div>
              <p className="text-xs text-muted-foreground">Of referred drivers earned reward</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Supply Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-supply-alerts">{analytics.activeSupplyAlerts}</div>
              <p className="text-xs text-muted-foreground">Active low-supply warnings</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {analytics && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retention</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-lg font-bold" data-testid="text-retention-d7">{analytics.retentionD7}%</div>
                  <p className="text-xs text-muted-foreground">7-Day</p>
                </div>
                <div>
                  <div className="text-lg font-bold" data-testid="text-retention-d30">{analytics.retentionD30}%</div>
                  <p className="text-xs text-muted-foreground">30-Day</p>
                </div>
                <div>
                  <div className="text-lg font-bold" data-testid="text-fleet-effectiveness">{analytics.fleetOwnerEffectiveness}%</div>
                  <p className="text-xs text-muted-foreground">Fleet Effectiveness</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Onboarding Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1">
                {pipelineStages.map((s, i) => (
                  <div key={s.stage} className="flex flex-col items-center flex-1">
                    <span className="text-sm font-bold" data-testid={`text-pipeline-${s.stage.toLowerCase()}`}>{s.count}</span>
                    <div
                      className="w-full rounded-sm bg-primary/20"
                      style={{ height: `${Math.max(8, Math.min(60, s.count * 4))}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">{s.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Driver Pipeline</CardTitle>
            <CardDescription>Onboarding progress for all acquired drivers</CardDescription>
          </div>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-channel-filter">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="REFERRAL">Referral</SelectItem>
              <SelectItem value="FLEET_OWNER">Fleet Owner</SelectItem>
              <SelectItem value="PUBLIC_SIGNUP">Public Signup</SelectItem>
              <SelectItem value="ADMIN_INVITED">Admin Invited</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {driversLoading ? (
            <div className="py-4 text-center text-muted-foreground">Loading...</div>
          ) : !drivers || drivers.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No driver acquisitions"
              description="Driver signup tracking records will appear here"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver ID</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((d) => (
                    <TableRow key={d.id} data-testid={`row-acquisition-${d.id}`}>
                      <TableCell className="font-mono text-xs">{d.driverUserId.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{CHANNEL_LABELS[d.channel] || d.channel}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={stageBadgeVariant(d.onboardingStage)}>
                          {STAGE_LABELS[d.onboardingStage] || d.onboardingStage}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.countryCode}</TableCell>
                      <TableCell>{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {d.onboardingStage === "REVIEW" && (
                          <Button
                            size="sm"
                            onClick={() => approveDriverMutation.mutate(d.driverUserId)}
                            disabled={approveDriverMutation.isPending}
                            data-testid={`button-approve-${d.id}`}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Fleet Owners</CardTitle>
              <CardDescription>Manage bulk driver recruiters</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {fleetsLoading ? (
              <div className="py-4 text-center text-muted-foreground">Loading...</div>
            ) : !fleetOwners || fleetOwners.length === 0 ? (
              <EmptyState
                icon={Building}
                title="No fleet owners"
                description="Add fleet owners to enable bulk driver recruitment"
              />
            ) : (
              <div className="space-y-3">
                {fleetOwners.map((fo) => (
                  <div key={fo.id} className="flex items-center justify-between gap-2 p-3 border rounded-md" data-testid={`card-fleet-${fo.id}`}>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{fo.companyName || fo.userId.slice(0, 12)}</div>
                      <div className="text-xs text-muted-foreground">
                        {fo.activeDrivers}/{fo.totalDriversRecruited} active | Max: {fo.maxDrivers} | {fo.countryCode}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {fo.suspended ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => suspendFleetMutation.mutate({ userId: fo.userId, reason: "Admin action" })}
                          disabled={suspendFleetMutation.isPending}
                          data-testid={`button-suspend-fleet-${fo.id}`}
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supply Alerts</CardTitle>
            <CardDescription>Zones with low driver availability</CardDescription>
          </CardHeader>
          <CardContent>
            {!supplyAlerts || supplyAlerts.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No active alerts"
                description="Supply alerts will appear when zones have low driver coverage"
              />
            ) : (
              <div className="space-y-3">
                {supplyAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between gap-2 p-3 border rounded-md" data-testid={`card-alert-${alert.id}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={severityBadgeVariant(alert.severity)}>{alert.severity}</Badge>
                        <span className="text-sm font-medium">{alert.countryCode}{alert.stateCode ? ` - ${alert.stateCode}` : ""}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveAlertMutation.mutate(alert.id)}
                      disabled={resolveAlertMutation.isPending}
                      data-testid={`button-resolve-alert-${alert.id}`}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showFleetDialog} onOpenChange={setShowFleetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fleet Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                value={fleetForm.userId}
                onChange={(e) => setFleetForm(f => ({ ...f, userId: e.target.value }))}
                placeholder="Enter user ID"
                data-testid="input-fleet-user-id"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company Name</label>
              <Input
                value={fleetForm.companyName}
                onChange={(e) => setFleetForm(f => ({ ...f, companyName: e.target.value }))}
                placeholder="Optional"
                data-testid="input-fleet-company"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Country</label>
                <Select value={fleetForm.countryCode} onValueChange={(v) => setFleetForm(f => ({ ...f, countryCode: v }))}>
                  <SelectTrigger data-testid="select-fleet-country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NG">Nigeria</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="ZA">South Africa</SelectItem>
                    <SelectItem value="GH">Ghana</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="LR">Liberia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Max Drivers</label>
                <Input
                  type="number"
                  value={fleetForm.maxDrivers}
                  onChange={(e) => setFleetForm(f => ({ ...f, maxDrivers: e.target.value }))}
                  data-testid="input-fleet-max-drivers"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Bonus Per Activation</label>
              <Input
                value={fleetForm.bonusPerActivation}
                onChange={(e) => setFleetForm(f => ({ ...f, bonusPerActivation: e.target.value }))}
                placeholder="500.00"
                data-testid="input-fleet-bonus"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFleetDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createFleetMutation.mutate(fleetForm)}
              disabled={!fleetForm.userId || createFleetMutation.isPending}
              data-testid="button-submit-fleet"
            >
              {createFleetMutation.isPending ? "Creating..." : "Create Fleet Owner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zone Acquisition Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Country</label>
              <Select value={zoneForm.countryCode} onValueChange={(v) => setZoneForm(f => ({ ...f, countryCode: v }))}>
                <SelectTrigger data-testid="select-zone-country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NG">Nigeria</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="ZA">South Africa</SelectItem>
                  <SelectItem value="GH">Ghana</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="LR">Liberia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">State/Region Code (optional)</label>
              <Input
                value={zoneForm.stateCode}
                onChange={(e) => setZoneForm(f => ({ ...f, stateCode: e.target.value }))}
                placeholder="e.g. LAG, ABJ"
                data-testid="input-zone-state"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={zoneForm.status} onValueChange={(v) => setZoneForm(f => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-zone-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active (accepting drivers)</SelectItem>
                  <SelectItem value="PAUSED">Paused (stop acquisition)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {zoneForm.status === "PAUSED" && (
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  value={zoneForm.reason}
                  onChange={(e) => setZoneForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Why is acquisition being paused?"
                  data-testid="input-zone-reason"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoneDialog(false)}>Cancel</Button>
            <Button
              onClick={() => setZoneControlMutation.mutate(zoneForm)}
              disabled={setZoneControlMutation.isPending}
              data-testid="button-submit-zone"
            >
              {zoneForm.status === "PAUSED" ? (
                <><Pause className="h-4 w-4 mr-2" /> Pause Acquisition</>
              ) : (
                <><Play className="h-4 w-4 mr-2" /> Resume Acquisition</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
