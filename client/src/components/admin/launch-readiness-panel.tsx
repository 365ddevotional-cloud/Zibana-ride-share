import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  Shield,
  ShieldAlert,
  ShieldOff,
  Activity,
  AlertTriangle,
  Power,
  Zap,
  Car,
  Bike,
  Clock,
  MapPin,
  Users,
  Wallet,
  Gift,
  UserPlus,
  Save,
} from "lucide-react";

type KillSwitchStatus = {
  id: string;
  switchName: string;
  isActive: boolean;
  activatedAt?: string;
  activatedBy?: string;
  reason?: string;
};

type StateConfig = {
  id: string;
  stateCode: string;
  stateName: string;
  stateEnabled: boolean;
  countryCode: string;
  minOnlineDriversCar: number;
  minOnlineDriversBike: number;
  maxPickupWaitMinutes: number;
  avgPickupTimeMinutes: string;
  currentOnlineDriversCar: number;
  currentOnlineDriversBike: number;
  autoDisableOnWaitExceed: boolean;
};

type ReadinessData = {
  countryEnabled: boolean;
  systemMode: string;
  systemModeReason: string | null;
  killSwitches: KillSwitchStatus[];
  activeKillSwitchCount: number;
  states: StateConfig[];
};

const KILL_SWITCH_META: Record<string, { label: string; description: string; icon: typeof Shield }> = {
  KILL_TRIP_REQUESTS: { label: "Trip Requests", description: "Blocks all new trip requests from riders", icon: MapPin },
  KILL_TRIP_ACCEPTANCE: { label: "Trip Acceptance", description: "Prevents drivers from accepting trips", icon: Car },
  KILL_INCENTIVES: { label: "Incentives", description: "Disables all driver incentive programs", icon: Gift },
  KILL_WALLET_PAYOUTS: { label: "Wallet Payouts", description: "Halts all wallet payout processing", icon: Wallet },
  KILL_DRIVER_ONBOARDING: { label: "Driver Onboarding", description: "Stops new driver registrations", icon: UserPlus },
  KILL_RIDER_ONBOARDING: { label: "Rider Onboarding", description: "Stops new rider sign-ups", icon: Users },
};

const MODE_META: Record<string, { label: string; description: string; variant: "default" | "secondary" | "destructive" }> = {
  NORMAL: { label: "Normal", description: "All systems operational", variant: "default" },
  LIMITED: { label: "Limited", description: "Restricted operations - some features disabled", variant: "secondary" },
  EMERGENCY: { label: "Emergency", description: "Critical safety mode - minimal operations only", variant: "destructive" },
};

export function LaunchReadinessPanel() {
  const { toast } = useToast();
  const [confirmAction, setConfirmAction] = useState<{ type: string; payload: Record<string, unknown> } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [editingState, setEditingState] = useState<Record<string, { minCar: string; minBike: string; maxWait: string }>>({});

  const { data: readiness, isLoading } = useQuery<ReadinessData>({
    queryKey: ["/api/admin/launch/readiness", "NG"],
    queryFn: async () => {
      const res = await fetch("/api/admin/launch/readiness?countryCode=NG", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch readiness data");
      return res.json();
    },
  });

  const countryToggleMutation = useMutation({
    mutationFn: async (data: { countryCode: string; enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/launch/country/toggle", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Country Updated", description: "Country status has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/readiness"] });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const systemModeMutation = useMutation({
    mutationFn: async (data: { mode: string; reason: string }) => {
      const res = await apiRequest("POST", "/api/admin/launch/system-mode", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "System Mode Changed", description: "System mode has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/readiness"] });
      setConfirmAction(null);
      setActionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Mode Change Failed", description: error.message, variant: "destructive" });
    },
  });

  const killSwitchMutation = useMutation({
    mutationFn: async (data: { switchName: string; activate: boolean; reason: string }) => {
      const res = await apiRequest("POST", "/api/admin/launch/kill-switch/toggle", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Kill Switch Updated", description: "Kill switch status has been changed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/readiness"] });
      setConfirmAction(null);
      setActionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Kill Switch Failed", description: error.message, variant: "destructive" });
    },
  });

  const stateToggleMutation = useMutation({
    mutationFn: async (data: { stateCode: string; countryCode: string; enabled: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/launch/state/toggle", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "State Updated", description: "State launch status has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/readiness"] });
    },
    onError: (error: Error) => {
      toast({ title: "State Toggle Failed", description: error.message, variant: "destructive" });
    },
  });

  const stateConfigMutation = useMutation({
    mutationFn: async (data: { stateCode: string; countryCode: string; minOnlineDriversCar: number; minOnlineDriversBike: number; maxPickupWaitMinutes: number }) => {
      const { stateCode, ...body } = data;
      const res = await apiRequest("PATCH", `/api/admin/launch/state/${stateCode}`, body);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      toast({ title: "State Config Saved", description: "Threshold settings have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/readiness"] });
      setEditingState((prev) => {
        const next = { ...prev };
        delete next[variables.stateCode];
        return next;
      });
    },
    onError: (error: Error) => {
      toast({ title: "Config Save Failed", description: error.message, variant: "destructive" });
    },
  });

  function handleModeChange(mode: string) {
    if (mode === "EMERGENCY") {
      setConfirmAction({ type: "mode", payload: { mode } });
    } else {
      systemModeMutation.mutate({ mode, reason: "" });
    }
  }

  function handleKillSwitchToggle(switchName: string, currentActive: boolean) {
    if (!currentActive) {
      setConfirmAction({ type: "killswitch", payload: { switchName, activate: true } });
    } else {
      killSwitchMutation.mutate({ switchName, activate: false, reason: "" });
    }
  }

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction.type === "mode") {
      systemModeMutation.mutate({ mode: confirmAction.payload.mode as string, reason: actionReason });
    } else if (confirmAction.type === "killswitch") {
      killSwitchMutation.mutate({
        switchName: confirmAction.payload.switchName as string,
        activate: confirmAction.payload.activate as boolean,
        reason: actionReason,
      });
    }
  }

  function getStateEditing(stateCode: string, state: StateConfig) {
    return editingState[stateCode] || {
      minCar: String(state.minOnlineDriversCar),
      minBike: String(state.minOnlineDriversBike),
      maxWait: String(state.maxPickupWaitMinutes),
    };
  }

  function setStateField(stateCode: string, field: string, value: string, state: StateConfig) {
    const current = getStateEditing(stateCode, state);
    setEditingState((prev) => ({
      ...prev,
      [stateCode]: { ...current, [field]: value },
    }));
  }

  function handleSaveState(stateCode: string, state: StateConfig) {
    const editing = getStateEditing(stateCode, state);
    stateConfigMutation.mutate({
      stateCode,
      countryCode: "NG",
      minOnlineDriversCar: parseInt(editing.minCar) || 0,
      minOnlineDriversBike: parseInt(editing.minBike) || 0,
      maxPickupWaitMinutes: parseInt(editing.maxWait) || 15,
    });
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground" data-testid="loading-launch-readiness">
        Loading launch readiness data...
      </div>
    );
  }

  if (!readiness) {
    return (
      <div className="py-12 text-center text-muted-foreground" data-testid="error-launch-readiness">
        Failed to load launch readiness data
      </div>
    );
  }

  const activeKillSwitches = readiness.killSwitches?.filter((ks) => ks.isActive).length || 0;
  const currentMode = readiness.systemMode || "NORMAL";
  const modeInfo = MODE_META[currentMode] || MODE_META.NORMAL;

  return (
    <div className="space-y-6" data-testid="launch-readiness-panel">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">System Mode</div>
                <Badge variant={modeInfo.variant} data-testid="badge-system-mode">
                  {modeInfo.label}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Active Kill Switches</div>
                <Badge variant={activeKillSwitches > 0 ? "destructive" : "secondary"} data-testid="badge-active-kill-switches">
                  {activeKillSwitches} / {readiness.killSwitches?.length || 6}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Country Status</div>
                <Badge variant={readiness.countryEnabled ? "default" : "secondary"} data-testid="badge-country-status">
                  {readiness.countryEnabled ? "Active" : "Disabled"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Country Control
            </CardTitle>
            <CardDescription>Enable or disable Nigeria (NG) operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium" data-testid="text-country-name">Nigeria</div>
                <div className="text-sm text-muted-foreground">Country Code: NG</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={readiness.countryEnabled ? "default" : "secondary"}>
                  {readiness.countryEnabled ? "Enabled" : "Disabled"}
                </Badge>
                <Switch
                  checked={readiness.countryEnabled || false}
                  onCheckedChange={(checked) => countryToggleMutation.mutate({ countryCode: "NG", enabled: checked })}
                  disabled={countryToggleMutation.isPending}
                  data-testid="switch-country-toggle"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Mode
            </CardTitle>
            <CardDescription>Control the operational mode of the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {Object.entries(MODE_META).map(([mode, meta]) => (
                <div key={mode} className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-sm">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">{meta.description}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={currentMode === mode ? "default" : "outline"}
                    onClick={() => handleModeChange(mode)}
                    disabled={currentMode === mode || systemModeMutation.isPending}
                    data-testid={`button-mode-${mode.toLowerCase()}`}
                  >
                    {mode === "NORMAL" && <Shield className="h-4 w-4 mr-1" />}
                    {mode === "LIMITED" && <ShieldAlert className="h-4 w-4 mr-1" />}
                    {mode === "EMERGENCY" && <ShieldOff className="h-4 w-4 mr-1" />}
                    {currentMode === mode ? "Current" : "Activate"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            Kill Switches
          </CardTitle>
          <CardDescription>Emergency controls to disable specific platform features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(readiness.killSwitches || []).map((ks) => {
              const meta = KILL_SWITCH_META[ks.switchName] || { label: ks.switchName, description: "", icon: Zap };
              const IconComp = meta.icon;
              return (
                <Card key={ks.switchName}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-md ${ks.isActive ? "bg-destructive/10" : "bg-muted"}`}>
                          <IconComp className={`h-4 w-4 ${ks.isActive ? "text-destructive" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <div className="font-medium text-sm" data-testid={`text-killswitch-${ks.switchName}`}>{meta.label}</div>
                          <div className="text-xs text-muted-foreground">{meta.description}</div>
                          {ks.isActive && ks.reason && (
                            <div className="text-xs text-destructive mt-1">Reason: {ks.reason}</div>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={ks.isActive}
                        onCheckedChange={() => handleKillSwitchToggle(ks.switchName, ks.isActive)}
                        disabled={killSwitchMutation.isPending}
                        data-testid={`switch-killswitch-${ks.switchName}`}
                      />
                    </div>
                    <div className="mt-2">
                      <Badge
                        variant={ks.isActive ? "destructive" : "secondary"}
                        data-testid={`badge-killswitch-status-${ks.switchName}`}
                      >
                        {ks.isActive ? "ACTIVE" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            State Launch Control
          </CardTitle>
          <CardDescription>Manage which Nigerian states are active and configure thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      Min Car Drivers
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Bike className="h-3 w-3" />
                      Min Bike Drivers
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Max Wait (min)
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(readiness.states || []).map((state) => {
                  const editing = getStateEditing(state.stateCode, state);
                  const hasChanges = editingState[state.stateCode] !== undefined;
                  return (
                    <TableRow key={state.stateCode} data-testid={`row-state-${state.stateCode}`}>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-state-name-${state.stateCode}`}>{state.stateName}</div>
                        <div className="text-xs text-muted-foreground">{state.stateCode}</div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={state.stateEnabled}
                          onCheckedChange={(checked) =>
                            stateToggleMutation.mutate({ stateCode: state.stateCode, countryCode: "NG", enabled: checked })
                          }
                          disabled={stateToggleMutation.isPending}
                          data-testid={`switch-state-${state.stateCode}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editing.minCar}
                          onChange={(e) => setStateField(state.stateCode, "minCar", e.target.value, state)}
                          className="w-20"
                          min={0}
                          data-testid={`input-min-car-${state.stateCode}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editing.minBike}
                          onChange={(e) => setStateField(state.stateCode, "minBike", e.target.value, state)}
                          className="w-20"
                          min={0}
                          data-testid={`input-min-bike-${state.stateCode}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editing.maxWait}
                          onChange={(e) => setStateField(state.stateCode, "maxWait", e.target.value, state)}
                          className="w-20"
                          min={1}
                          data-testid={`input-max-wait-${state.stateCode}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={hasChanges ? "default" : "outline"}
                          onClick={() => handleSaveState(state.stateCode, state)}
                          disabled={!hasChanges || stateConfigMutation.isPending}
                          data-testid={`button-save-state-${state.stateCode}`}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setActionReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {confirmAction?.type === "mode" ? "Confirm Mode Change" : "Confirm Kill Switch Activation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "mode"
                ? "You are about to switch to EMERGENCY mode. This will severely restrict platform operations. Are you sure?"
                : `You are about to activate the ${KILL_SWITCH_META[(confirmAction?.payload?.switchName as string) || ""]?.label || confirmAction?.payload?.switchName} kill switch. This will immediately disable this feature.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Provide a reason for this action..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              data-testid="input-action-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-action">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!actionReason.trim() || systemModeMutation.isPending || killSwitchMutation.isPending}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-action"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
