import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Plus,
  X,
  Loader2,
} from "lucide-react";

type KillSwitchStatus = {
  id: string;
  switchName: string;
  scope: string;
  scopeCountryCode?: string | null;
  scopeSubregionCode?: string | null;
  isActive: boolean;
  activatedAt?: string;
  activatedBy?: string;
  reason?: string;
};

type StateConfig = {
  id: string;
  stateCode: string;
  stateName: string;
  subregionType: string;
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

type CountryData = {
  id: string;
  isoCode: string;
  name: string;
  currency: string;
  countryEnabled: boolean;
  defaultSystemMode: string;
  systemModeReason?: string | null;
};

type ReadinessData = {
  country: CountryData | null;
  countryEnabled: boolean;
  systemMode: string;
  systemModeReason: string | null;
  globalSystemMode: string;
  globalSystemModeReason: string | null;
  killSwitches: {
    global: KillSwitchStatus[];
    country: KillSwitchStatus[];
    subregion: KillSwitchStatus[];
    all: KillSwitchStatus[];
  };
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

const SUBREGION_LABELS: Record<string, string> = {
  state: "State",
  province: "Province",
  region: "Region",
};

export function LaunchReadinessPanel() {
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState("NG");
  const [confirmAction, setConfirmAction] = useState<{ type: string; payload: Record<string, unknown> } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [editingState, setEditingState] = useState<Record<string, { minCar: string; minBike: string; maxWait: string }>>({});
  const [killSwitchScope, setKillSwitchScope] = useState<"GLOBAL" | "COUNTRY">("GLOBAL");
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [newCountry, setNewCountry] = useState({ name: "", isoCode: "", currency: "", timezone: "", subregionType: "state" });
  const [newSubregions, setNewSubregions] = useState<{ code: string; name: string }[]>([]);
  const [newSubInput, setNewSubInput] = useState({ code: "", name: "" });
  const [showAddSubregion, setShowAddSubregion] = useState(false);
  const [addSubregionInput, setAddSubregionInput] = useState({ stateCode: "", stateName: "", subregionType: "state" });

  const { data: countries } = useQuery<CountryData[]>({
    queryKey: ["/api/admin/launch/countries"],
    queryFn: async () => {
      const res = await fetch("/api/admin/launch/countries", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch countries");
      return res.json();
    },
  });

  const { data: readiness, isLoading } = useQuery<ReadinessData>({
    queryKey: ["/api/admin/launch/readiness", selectedCountry],
    queryFn: async () => {
      const res = await fetch(`/api/admin/launch/readiness?countryCode=${selectedCountry}`, { credentials: "include" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/countries"] });
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
      toast({ title: "Global System Mode Changed", description: "Global system mode has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/readiness"] });
      setConfirmAction(null);
      setActionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Mode Change Failed", description: error.message, variant: "destructive" });
    },
  });

  const countryModeMutation = useMutation({
    mutationFn: async (data: { countryCode: string; mode: string; reason: string }) => {
      const res = await apiRequest("POST", "/api/admin/launch/country/system-mode", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Country Mode Changed", description: "Country system mode has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/readiness"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/countries"] });
      setConfirmAction(null);
      setActionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Mode Change Failed", description: error.message, variant: "destructive" });
    },
  });

  const killSwitchMutation = useMutation({
    mutationFn: async (data: { switchName: string; activate: boolean; reason: string; scope: string; countryCode?: string }) => {
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
      toast({ title: "Subregion Updated", description: "Subregion launch status has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/readiness"] });
    },
    onError: (error: Error) => {
      toast({ title: "Toggle Failed", description: error.message, variant: "destructive" });
    },
  });

  const stateConfigMutation = useMutation({
    mutationFn: async (data: { stateCode: string; countryCode: string; minOnlineDriversCar: number; minOnlineDriversBike: number; maxPickupWaitMinutes: number }) => {
      const { stateCode, ...body } = data;
      const res = await apiRequest("PATCH", `/api/admin/launch/state/${stateCode}`, body);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      toast({ title: "Config Saved", description: "Threshold settings have been saved." });
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

  const createCountryMutation = useMutation({
    mutationFn: async (data: { name: string; isoCode: string; currency: string; timezone: string; subregionType: string; subregions: { code: string; name: string }[] }) => {
      const res = await apiRequest("POST", "/api/admin/launch/country/create", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Country Created", description: `${newCountry.name} (${newCountry.isoCode.toUpperCase()}) has been added.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/countries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/readiness"] });
      setShowAddCountry(false);
      setNewCountry({ name: "", isoCode: "", currency: "", timezone: "", subregionType: "state" });
      setNewSubregions([]);
      setNewSubInput({ code: "", name: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Create Country", description: error.message, variant: "destructive" });
    },
  });

  const addSubregionMutation = useMutation({
    mutationFn: async (data: { countryCode: string; stateCode: string; stateName: string; subregionType: string }) => {
      const res = await apiRequest("POST", "/api/admin/launch/country/add-subregion", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Subregion Added", description: `${addSubregionInput.stateName} has been added to ${selectedCountry}.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/launch/readiness"] });
      setShowAddSubregion(false);
      setAddSubregionInput({ stateCode: "", stateName: "", subregionType: "state" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Add Subregion", description: error.message, variant: "destructive" });
    },
  });

  function handleCreateCountry() {
    if (!newCountry.name || !newCountry.isoCode || !newCountry.currency || !newCountry.timezone) return;
    createCountryMutation.mutate({
      ...newCountry,
      subregions: newSubregions,
    });
  }

  function handleAddSubregionToList() {
    if (!newSubInput.code || !newSubInput.name) return;
    setNewSubregions(prev => [...prev, { code: newSubInput.code, name: newSubInput.name }]);
    setNewSubInput({ code: "", name: "" });
  }

  function handleRemoveSubregionFromList(idx: number) {
    setNewSubregions(prev => prev.filter((_, i) => i !== idx));
  }

  function handleAddSubregionToCountry() {
    if (!addSubregionInput.stateCode || !addSubregionInput.stateName) return;
    addSubregionMutation.mutate({
      countryCode: selectedCountry,
      stateCode: addSubregionInput.stateCode,
      stateName: addSubregionInput.stateName,
      subregionType: addSubregionInput.subregionType,
    });
  }

  function handleGlobalModeChange(mode: string) {
    if (mode === "EMERGENCY") {
      setConfirmAction({ type: "globalMode", payload: { mode } });
    } else {
      systemModeMutation.mutate({ mode, reason: "" });
    }
  }

  function handleCountryModeChange(mode: string) {
    if (mode === "EMERGENCY") {
      setConfirmAction({ type: "countryMode", payload: { mode, countryCode: selectedCountry } });
    } else {
      countryModeMutation.mutate({ countryCode: selectedCountry, mode, reason: "" });
    }
  }

  function handleKillSwitchToggle(switchName: string, currentActive: boolean, scope: string, countryCode?: string) {
    if (!currentActive) {
      setConfirmAction({ type: "killswitch", payload: { switchName, activate: true, scope, countryCode } });
    } else {
      killSwitchMutation.mutate({ switchName, activate: false, reason: "", scope, countryCode });
    }
  }

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction.type === "globalMode") {
      systemModeMutation.mutate({ mode: confirmAction.payload.mode as string, reason: actionReason });
    } else if (confirmAction.type === "countryMode") {
      countryModeMutation.mutate({
        countryCode: confirmAction.payload.countryCode as string,
        mode: confirmAction.payload.mode as string,
        reason: actionReason,
      });
    } else if (confirmAction.type === "killswitch") {
      killSwitchMutation.mutate({
        switchName: confirmAction.payload.switchName as string,
        activate: confirmAction.payload.activate as boolean,
        reason: actionReason,
        scope: confirmAction.payload.scope as string,
        countryCode: confirmAction.payload.countryCode as string | undefined,
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
      countryCode: selectedCountry,
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

  const globalSwitches = readiness.killSwitches?.global || [];
  const countrySwitches = readiness.killSwitches?.country || [];
  const activeGlobal = globalSwitches.filter(s => s.isActive).length;
  const activeCountry = countrySwitches.filter(s => s.isActive).length;
  const globalMode = readiness.globalSystemMode || "NORMAL";
  const countryMode = readiness.systemMode || "NORMAL";
  const globalModeInfo = MODE_META[globalMode] || MODE_META.NORMAL;
  const countryModeInfo = MODE_META[countryMode] || MODE_META.NORMAL;
  const subregionType = readiness.states?.[0]?.subregionType || "state";
  const subregionLabel = SUBREGION_LABELS[subregionType] || "Subregion";
  const selectedCountryName = countries?.find(c => c.isoCode === selectedCountry)?.name || selectedCountry;

  return (
    <div className="space-y-6" data-testid="launch-readiness-panel">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[200px]" data-testid="select-country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {(countries || []).map((c) => (
                    <SelectItem key={c.isoCode} value={c.isoCode} data-testid={`option-country-${c.isoCode}`}>
                      {c.name} ({c.isoCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Global:</span>
                <Badge variant={globalModeInfo.variant} data-testid="badge-global-mode">{globalModeInfo.label}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Country:</span>
                <Badge variant={countryModeInfo.variant} data-testid="badge-country-mode">{countryModeInfo.label}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Active KS:</span>
                <Badge variant={readiness.activeKillSwitchCount > 0 ? "destructive" : "secondary"} data-testid="badge-active-kill-switches">
                  {readiness.activeKillSwitchCount}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Badge variant={readiness.countryEnabled ? "default" : "secondary"} data-testid="badge-country-status">
                  {readiness.countryEnabled ? "Active" : "Disabled"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="countries" className="space-y-4">
        <TabsList data-testid="tabs-launch-control">
          <TabsTrigger value="countries" data-testid="tab-countries">Countries</TabsTrigger>
          <TabsTrigger value="modes" data-testid="tab-modes">System Modes</TabsTrigger>
          <TabsTrigger value="killswitches" data-testid="tab-killswitches">Kill Switches</TabsTrigger>
          <TabsTrigger value="subregions" data-testid="tab-subregions">{subregionLabel}s</TabsTrigger>
        </TabsList>

        <TabsContent value="countries">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Country Launch Control
                  </CardTitle>
                  <CardDescription>Enable or disable operations by country</CardDescription>
                </div>
                <Dialog open={showAddCountry} onOpenChange={setShowAddCountry}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-country">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Country
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add New Country</DialogTitle>
                      <DialogDescription>Add a new country to the launch control system. You can also define its subregions.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="country-name">Country Name</Label>
                          <Input
                            id="country-name"
                            placeholder="e.g. Kenya"
                            value={newCountry.name}
                            onChange={(e) => setNewCountry(p => ({ ...p, name: e.target.value }))}
                            data-testid="input-new-country-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country-iso">ISO Code (2-3 chars)</Label>
                          <Input
                            id="country-iso"
                            placeholder="e.g. KE"
                            maxLength={3}
                            value={newCountry.isoCode}
                            onChange={(e) => setNewCountry(p => ({ ...p, isoCode: e.target.value.toUpperCase() }))}
                            data-testid="input-new-country-iso"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="country-currency">Currency Code</Label>
                          <Input
                            id="country-currency"
                            placeholder="e.g. KES"
                            maxLength={3}
                            value={newCountry.currency}
                            onChange={(e) => setNewCountry(p => ({ ...p, currency: e.target.value.toUpperCase() }))}
                            data-testid="input-new-country-currency"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country-timezone">Timezone</Label>
                          <Input
                            id="country-timezone"
                            placeholder="e.g. Africa/Nairobi"
                            value={newCountry.timezone}
                            onChange={(e) => setNewCountry(p => ({ ...p, timezone: e.target.value }))}
                            data-testid="input-new-country-timezone"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Subregion Type</Label>
                        <Select value={newCountry.subregionType} onValueChange={(v) => setNewCountry(p => ({ ...p, subregionType: v }))}>
                          <SelectTrigger data-testid="select-new-subregion-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="state">State</SelectItem>
                            <SelectItem value="province">Province</SelectItem>
                            <SelectItem value="region">Region</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Subregions (optional)</Label>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Input
                              placeholder="Code (e.g. NBO)"
                              value={newSubInput.code}
                              onChange={(e) => setNewSubInput(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                              data-testid="input-new-sub-code"
                            />
                          </div>
                          <div className="flex-1">
                            <Input
                              placeholder="Name (e.g. Nairobi)"
                              value={newSubInput.name}
                              onChange={(e) => setNewSubInput(p => ({ ...p, name: e.target.value }))}
                              data-testid="input-new-sub-name"
                            />
                          </div>
                          <Button size="sm" variant="outline" onClick={handleAddSubregionToList} data-testid="button-add-sub-to-list">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {newSubregions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {newSubregions.map((sub, idx) => (
                              <Badge key={idx} variant="secondary" className="gap-1">
                                {sub.code} - {sub.name}
                                <button onClick={() => handleRemoveSubregionFromList(idx)} className="ml-1">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddCountry(false)} data-testid="button-cancel-add-country">Cancel</Button>
                      <Button
                        onClick={handleCreateCountry}
                        disabled={!newCountry.name || !newCountry.isoCode || !newCountry.currency || !newCountry.timezone || createCountryMutation.isPending}
                        data-testid="button-submit-add-country"
                      >
                        {createCountryMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Create Country
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>System Mode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(countries || []).map((c) => (
                    <TableRow key={c.isoCode} data-testid={`row-country-${c.isoCode}`}>
                      <TableCell className="font-medium" data-testid={`text-country-name-${c.isoCode}`}>{c.name}</TableCell>
                      <TableCell>{c.isoCode}</TableCell>
                      <TableCell>{c.currency}</TableCell>
                      <TableCell>
                        <Badge variant={MODE_META[c.defaultSystemMode || "NORMAL"]?.variant || "default"}>
                          {c.defaultSystemMode || "NORMAL"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={c.countryEnabled || false}
                            onCheckedChange={(checked) => countryToggleMutation.mutate({ countryCode: c.isoCode, enabled: checked })}
                            disabled={countryToggleMutation.isPending}
                            data-testid={`switch-country-${c.isoCode}`}
                          />
                          <span className="text-sm text-muted-foreground">{c.countryEnabled ? "Enabled" : "Disabled"}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modes">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Global System Mode
                </CardTitle>
                <CardDescription>Controls the entire platform across all countries</CardDescription>
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
                        variant={globalMode === mode ? "default" : "outline"}
                        onClick={() => handleGlobalModeChange(mode)}
                        disabled={globalMode === mode || systemModeMutation.isPending}
                        data-testid={`button-global-mode-${mode.toLowerCase()}`}
                      >
                        {mode === "NORMAL" && <Shield className="h-4 w-4 mr-1" />}
                        {mode === "LIMITED" && <ShieldAlert className="h-4 w-4 mr-1" />}
                        {mode === "EMERGENCY" && <ShieldOff className="h-4 w-4 mr-1" />}
                        {globalMode === mode ? "Current" : "Activate"}
                      </Button>
                    </div>
                  ))}
                  {readiness.globalSystemModeReason && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Reason: {readiness.globalSystemModeReason}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {selectedCountryName} Mode
                </CardTitle>
                <CardDescription>Country-specific mode for {selectedCountryName} ({selectedCountry})</CardDescription>
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
                        variant={countryMode === mode ? "default" : "outline"}
                        onClick={() => handleCountryModeChange(mode)}
                        disabled={countryMode === mode || countryModeMutation.isPending}
                        data-testid={`button-country-mode-${mode.toLowerCase()}`}
                      >
                        {mode === "NORMAL" && <Shield className="h-4 w-4 mr-1" />}
                        {mode === "LIMITED" && <ShieldAlert className="h-4 w-4 mr-1" />}
                        {mode === "EMERGENCY" && <ShieldOff className="h-4 w-4 mr-1" />}
                        {countryMode === mode ? "Current" : "Activate"}
                      </Button>
                    </div>
                  ))}
                  {readiness.systemModeReason && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Reason: {readiness.systemModeReason}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="killswitches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Kill Switches
              </CardTitle>
              <CardDescription>
                Emergency controls scoped by level. Global switches affect all countries; Country switches affect only {selectedCountryName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={killSwitchScope} onValueChange={(v) => setKillSwitchScope(v as "GLOBAL" | "COUNTRY")}>
                  <SelectTrigger className="w-[240px]" data-testid="select-killswitch-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBAL">Global Scope</SelectItem>
                    <SelectItem value="COUNTRY">Country: {selectedCountryName}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {killSwitchScope === "GLOBAL" && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(KILL_SWITCH_META).map(([switchName, meta]) => {
                    const ks = globalSwitches.find(s => s.switchName === switchName);
                    const isActive = ks?.isActive || false;
                    const IconComp = meta.icon;
                    return (
                      <Card key={switchName}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-md ${isActive ? "bg-destructive/10" : "bg-muted"}`}>
                                <IconComp className={`h-4 w-4 ${isActive ? "text-destructive" : "text-muted-foreground"}`} />
                              </div>
                              <div>
                                <div className="font-medium text-sm" data-testid={`text-killswitch-global-${switchName}`}>{meta.label}</div>
                                <div className="text-xs text-muted-foreground">{meta.description}</div>
                                {isActive && ks?.reason && (
                                  <div className="text-xs text-destructive mt-1">Reason: {ks.reason}</div>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={isActive}
                              onCheckedChange={() => handleKillSwitchToggle(switchName, isActive, "GLOBAL")}
                              disabled={killSwitchMutation.isPending}
                              data-testid={`switch-killswitch-global-${switchName}`}
                            />
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline">Global</Badge>
                            <Badge variant={isActive ? "destructive" : "secondary"}>
                              {isActive ? "ACTIVE" : "Inactive"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {killSwitchScope === "COUNTRY" && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(KILL_SWITCH_META).map(([switchName, meta]) => {
                    const ks = countrySwitches.find(s => s.switchName === switchName);
                    const isActive = ks?.isActive || false;
                    const globalKs = globalSwitches.find(s => s.switchName === switchName);
                    const globalActive = globalKs?.isActive || false;
                    const IconComp = meta.icon;
                    return (
                      <Card key={switchName}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-md ${isActive || globalActive ? "bg-destructive/10" : "bg-muted"}`}>
                                <IconComp className={`h-4 w-4 ${isActive || globalActive ? "text-destructive" : "text-muted-foreground"}`} />
                              </div>
                              <div>
                                <div className="font-medium text-sm" data-testid={`text-killswitch-country-${switchName}`}>{meta.label}</div>
                                <div className="text-xs text-muted-foreground">{meta.description}</div>
                                {globalActive && (
                                  <div className="text-xs text-destructive mt-1">Overridden by Global kill switch</div>
                                )}
                                {isActive && ks?.reason && (
                                  <div className="text-xs text-destructive mt-1">Reason: {ks.reason}</div>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={isActive}
                              onCheckedChange={() => handleKillSwitchToggle(switchName, isActive, "COUNTRY", selectedCountry)}
                              disabled={killSwitchMutation.isPending}
                              data-testid={`switch-killswitch-country-${switchName}`}
                            />
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline">{selectedCountry}</Badge>
                            <Badge variant={isActive ? "destructive" : "secondary"}>
                              {isActive ? "ACTIVE" : "Inactive"}
                            </Badge>
                            {globalActive && <Badge variant="destructive">Global Override</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subregions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {subregionLabel} Launch Control - {selectedCountryName}
                  </CardTitle>
                  <CardDescription>Manage which {subregionLabel.toLowerCase()}s are active and configure thresholds for {selectedCountryName}</CardDescription>
                </div>
                <Dialog open={showAddSubregion} onOpenChange={setShowAddSubregion}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-subregion">
                      <Plus className="h-4 w-4 mr-1" />
                      Add {subregionLabel}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add {subregionLabel} to {selectedCountryName}</DialogTitle>
                      <DialogDescription>Add a new {subregionLabel.toLowerCase()} for {selectedCountryName} ({selectedCountry})</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="sub-code">{subregionLabel} Code</Label>
                        <Input
                          id="sub-code"
                          placeholder="e.g. LAG"
                          value={addSubregionInput.stateCode}
                          onChange={(e) => setAddSubregionInput(p => ({ ...p, stateCode: e.target.value.toUpperCase() }))}
                          data-testid="input-add-subregion-code"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sub-name">{subregionLabel} Name</Label>
                        <Input
                          id="sub-name"
                          placeholder="e.g. Lagos"
                          value={addSubregionInput.stateName}
                          onChange={(e) => setAddSubregionInput(p => ({ ...p, stateName: e.target.value }))}
                          data-testid="input-add-subregion-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={addSubregionInput.subregionType} onValueChange={(v) => setAddSubregionInput(p => ({ ...p, subregionType: v }))}>
                          <SelectTrigger data-testid="select-add-subregion-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="state">State</SelectItem>
                            <SelectItem value="province">Province</SelectItem>
                            <SelectItem value="region">Region</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddSubregion(false)} data-testid="button-cancel-add-subregion">Cancel</Button>
                      <Button
                        onClick={handleAddSubregionToCountry}
                        disabled={!addSubregionInput.stateCode || !addSubregionInput.stateName || addSubregionMutation.isPending}
                        data-testid="button-submit-add-subregion"
                      >
                        {addSubregionMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Add {subregionLabel}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {(readiness.states || []).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No {subregionLabel.toLowerCase()}s configured for {selectedCountryName}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{subregionLabel}</TableHead>
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
                                  stateToggleMutation.mutate({ stateCode: state.stateCode, countryCode: selectedCountry, enabled: checked })
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
                              {hasChanges ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveState(state.stateCode, state)}
                                  disabled={stateConfigMutation.isPending}
                                  data-testid={`button-save-state-${state.stateCode}`}
                                >
                                  {stateConfigMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                                  Save
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground" data-testid={`text-no-changes-${state.stateCode}`}>
                                  Edit to save
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setActionReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {confirmAction?.type === "globalMode" || confirmAction?.type === "countryMode"
                ? "Confirm Mode Change"
                : "Confirm Kill Switch Activation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "globalMode"
                ? "You are about to switch to EMERGENCY mode globally. This will severely restrict platform operations across all countries."
                : confirmAction?.type === "countryMode"
                  ? `You are about to switch ${selectedCountryName} to EMERGENCY mode. This will severely restrict operations in this country.`
                  : `You are about to activate the ${KILL_SWITCH_META[(confirmAction?.payload?.switchName as string) || ""]?.label || confirmAction?.payload?.switchName} kill switch at ${confirmAction?.payload?.scope || "GLOBAL"} scope.`}
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
              disabled={!actionReason.trim() || systemModeMutation.isPending || killSwitchMutation.isPending || countryModeMutation.isPending}
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
