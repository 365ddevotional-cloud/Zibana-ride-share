import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign, AlertTriangle, Shield, Ban, CheckCircle, History,
  Settings, Users, Flag, Eye
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const PURPOSE_LABELS: Record<string, string> = {
  ride_fuel_support: "Ride Fuel Support",
  network_availability_boost: "Network Availability Boost",
  emergency_assistance: "Emergency Assistance",
  temporary_balance_topup: "Temporary Balance Top-up",
};

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return "N/A"; }
}

export function DirectorFundingPanel() {
  const { toast } = useToast();
  const [tab, setTab] = useState("transactions");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const { data: transactions, isLoading: txnLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/director-funding/transactions", showFlaggedOnly ? "flagged=true" : ""],
  });

  const { data: suspensions, isLoading: suspLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/director-funding/suspensions"],
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<any>({
    queryKey: ["/api/director/funding/settings"],
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ directorUserId, reason }: { directorUserId: string; reason: string }) => {
      await apiRequest("POST", `/api/admin/director-funding/suspend/${directorUserId}`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/director-funding/suspensions"] });
      toast({ title: "Funding Suspended", description: "Director funding has been suspended." });
      setSuspendDialogOpen(false);
      setSuspendTarget(null);
      setSuspendReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const liftMutation = useMutation({
    mutationFn: async (directorUserId: string) => {
      await apiRequest("POST", `/api/admin/director-funding/lift-suspension/${directorUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/director-funding/suspensions"] });
      toast({ title: "Suspension Lifted", description: "Director can now fund drivers again." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      await apiRequest("PUT", "/api/admin/director-funding/settings", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/funding/settings"] });
      toast({ title: "Settings Updated", description: "Director funding settings saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredTxns = showFlaggedOnly
    ? (transactions || []).filter((t: any) => t.flagged)
    : (transactions || []);

  const activeSuspensions = (suspensions || []).filter((s: any) => s.isActive);

  return (
    <div className="space-y-6" data-testid="director-funding-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-director-funding-title">Director Funding Management</h3>
          <p className="text-sm text-muted-foreground">Monitor and control director-to-driver funding</p>
        </div>
        <div className="flex items-center gap-2">
          {activeSuspensions.length > 0 && (
            <Badge variant="destructive">{activeSuspensions.length} Active Suspension{activeSuspensions.length !== 1 ? "s" : ""}</Badge>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="transactions" data-testid="tab-dfunding-transactions">Transactions</TabsTrigger>
          <TabsTrigger value="suspensions" data-testid="tab-dfunding-suspensions">Suspensions</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-dfunding-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showFlaggedOnly ? "default" : "outline"}
              onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
              data-testid="button-toggle-flagged"
            >
              <Flag className="h-3.5 w-3.5 mr-1.5" />
              {showFlaggedOnly ? "Showing Flagged" : "Show Flagged Only"}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              {txnLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading transactions...</div>
              ) : filteredTxns.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground" data-testid="text-no-dfunding-txns">
                  <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  No {showFlaggedOnly ? "flagged " : ""}transactions found.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTxns.map((txn: any) => (
                    <div key={txn.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0" data-testid={`dfunding-txn-${txn.id}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {txn.directorName} <span className="text-muted-foreground">→</span> {txn.driverName}
                          </p>
                          <p className="text-xs text-muted-foreground">{PURPOSE_LABELS[txn.purposeTag] || txn.purposeTag}</p>
                          {txn.flagReason && (
                            <p className="text-xs text-destructive mt-0.5">{txn.flagReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{parseFloat(txn.amount).toLocaleString()}</span>
                        <Badge variant={txn.status === "completed" ? "default" : "destructive"}>{txn.status}</Badge>
                        {txn.flagged && <Badge variant="destructive">Flagged</Badge>}
                        <span className="text-xs text-muted-foreground">{formatDateTime(txn.createdAt)}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSuspendTarget(txn.directorUserId);
                            setSuspendDialogOpen(true);
                          }}
                          data-testid={`button-suspend-director-${txn.directorUserId}`}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspensions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Funding Suspensions</CardTitle>
              <CardDescription>Manage director funding suspension status</CardDescription>
            </CardHeader>
            <CardContent>
              {suspLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : !suspensions || suspensions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground" data-testid="text-no-suspensions">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  No suspensions recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {suspensions.map((s: any) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0" data-testid={`suspension-${s.id}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{s.directorName}</p>
                        <p className="text-xs text-muted-foreground">{s.reason}</p>
                        <p className="text-xs text-muted-foreground">Suspended: {formatDateTime(s.suspendedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={s.isActive ? "destructive" : "secondary"}>
                          {s.isActive ? "Active" : "Lifted"}
                        </Badge>
                        {s.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => liftMutation.mutate(s.directorUserId)}
                            disabled={liftMutation.isPending}
                            data-testid={`button-lift-suspension-${s.id}`}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                            Lift
                          </Button>
                        )}
                        {!s.isActive && s.liftedAt && (
                          <span className="text-xs text-muted-foreground">Lifted: {formatDateTime(s.liftedAt)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {settingsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading settings...</div>
          ) : settings ? (
            <SettingsForm settings={settings} onSave={(updates) => updateSettingsMutation.mutate(updates)} isSaving={updateSettingsMutation.isPending} />
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Director Funding</DialogTitle>
            <DialogDescription>This will prevent the director from sending funds until you lift the suspension.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reason</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason for suspension..."
                data-testid="input-suspend-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => suspendTarget && suspendMutation.mutate({ directorUserId: suspendTarget, reason: suspendReason })}
              disabled={!suspendReason || suspendMutation.isPending}
              data-testid="button-confirm-suspend"
            >
              {suspendMutation.isPending ? "Suspending..." : "Suspend Funding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsForm({ settings, onSave, isSaving }: { settings: any; onSave: (u: any) => void; isSaving: boolean }) {
  const [form, setForm] = useState({
    isEnabled: settings.isEnabled,
    perTransactionMin: settings.perTransactionMin,
    perTransactionMax: settings.perTransactionMax,
    perDriverDailyLimit: settings.perDriverDailyLimit,
    perDriverWeeklyLimit: settings.perDriverWeeklyLimit,
    perDriverMonthlyLimit: settings.perDriverMonthlyLimit,
    perDirectorDailyLimit: settings.perDirectorDailyLimit,
    perDirectorWeeklyLimit: settings.perDirectorWeeklyLimit,
    perDirectorMonthlyLimit: settings.perDirectorMonthlyLimit,
    minDriversRequired: settings.minDriversRequired,
    repeatFundingThreshold: settings.repeatFundingThreshold,
    repeatFundingWindowHours: settings.repeatFundingWindowHours,
    fundingSuspensionEnabled: settings.fundingSuspensionEnabled,
  });

  const updateField = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Director Funding Enabled</Label>
              <p className="text-xs text-muted-foreground">Toggle to enable/disable all director funding</p>
            </div>
            <Switch
              checked={form.isEnabled}
              onCheckedChange={(checked) => updateField("isEnabled", checked)}
              data-testid="switch-dfunding-enabled"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Suspend on Flag</Label>
              <p className="text-xs text-muted-foreground">Automatically suspend funding when flagged</p>
            </div>
            <Switch
              checked={form.fundingSuspensionEnabled}
              onCheckedChange={(checked) => updateField("fundingSuspensionEnabled", checked)}
              data-testid="switch-auto-suspend"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Drivers Required</Label>
              <Input type="number" value={form.minDriversRequired} onChange={(e) => updateField("minDriversRequired", parseInt(e.target.value))} data-testid="input-min-drivers" />
            </div>
            <div>
              <Label>Repeat Funding Threshold</Label>
              <Input type="number" value={form.repeatFundingThreshold} onChange={(e) => updateField("repeatFundingThreshold", parseInt(e.target.value))} data-testid="input-repeat-threshold" />
            </div>
            <div>
              <Label>Repeat Window (hours)</Label>
              <Input type="number" value={form.repeatFundingWindowHours} onChange={(e) => updateField("repeatFundingWindowHours", parseInt(e.target.value))} data-testid="input-repeat-window" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Per Transaction</Label>
              <Input type="number" value={form.perTransactionMin} onChange={(e) => updateField("perTransactionMin", e.target.value)} data-testid="input-txn-min" />
            </div>
            <div>
              <Label>Max Per Transaction</Label>
              <Input type="number" value={form.perTransactionMax} onChange={(e) => updateField("perTransactionMax", e.target.value)} data-testid="input-txn-max" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-Driver Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Daily</Label>
              <Input type="number" value={form.perDriverDailyLimit} onChange={(e) => updateField("perDriverDailyLimit", e.target.value)} data-testid="input-driver-daily" />
            </div>
            <div>
              <Label>Weekly</Label>
              <Input type="number" value={form.perDriverWeeklyLimit} onChange={(e) => updateField("perDriverWeeklyLimit", e.target.value)} data-testid="input-driver-weekly" />
            </div>
            <div>
              <Label>Monthly</Label>
              <Input type="number" value={form.perDriverMonthlyLimit} onChange={(e) => updateField("perDriverMonthlyLimit", e.target.value)} data-testid="input-driver-monthly" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-Director Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Daily</Label>
              <Input type="number" value={form.perDirectorDailyLimit} onChange={(e) => updateField("perDirectorDailyLimit", e.target.value)} data-testid="input-director-daily" />
            </div>
            <div>
              <Label>Weekly</Label>
              <Input type="number" value={form.perDirectorWeeklyLimit} onChange={(e) => updateField("perDirectorWeeklyLimit", e.target.value)} data-testid="input-director-weekly" />
            </div>
            <div>
              <Label>Monthly</Label>
              <Input type="number" value={form.perDirectorMonthlyLimit} onChange={(e) => updateField("perDirectorMonthlyLimit", e.target.value)} data-testid="input-director-monthly" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => onSave(form)} disabled={isSaving} data-testid="button-save-dfunding-settings">
        {isSaving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
