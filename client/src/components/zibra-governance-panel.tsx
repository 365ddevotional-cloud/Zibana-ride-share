import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Settings2, Shield, AlertTriangle, Clock, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ZibraConfigItem {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

interface ZibraAuditLog {
  id: string;
  configKey: string;
  oldValue: string | null;
  newValue: string;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

const CONFIG_KEYS = [
  { key: "zibra_enabled", label: "ZIBRA Enabled (Global)", description: "Enable or disable ZIBRA globally", type: "boolean" as const },
  { key: "zibra_role_rider_enabled", label: "Rider Support", description: "Enable ZIBRA for riders", type: "boolean" as const },
  { key: "zibra_role_driver_enabled", label: "Driver Support", description: "Enable ZIBRA for drivers", type: "boolean" as const },
  { key: "zibra_role_admin_enabled", label: "Admin Support (Z-Assist)", description: "Enable ZIBRA for admins", type: "boolean" as const },
  { key: "zibra_role_super_admin_enabled", label: "Super Admin Support", description: "Enable ZIBRA for super admins", type: "boolean" as const },
  { key: "zibra_role_director_enabled", label: "Director Support", description: "Enable ZIBRA for directors", type: "boolean" as const },
  { key: "zibra_safe_mode", label: "Safe Mode", description: "Only allow FAQ responses, no contextual or advisory responses", type: "boolean" as const },
  { key: "zibra_escalation_threshold", label: "Escalation Threshold", description: "Number of messages before suggesting escalation (0 = disabled)", type: "number" as const },
];

export function ZibraGovernancePanel() {
  const { toast } = useToast();
  const [blacklistInput, setBlacklistInput] = useState("");
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [confirmValue, setConfirmValue] = useState<string>("");
  const [reason, setReason] = useState("");

  const { data: configs, isLoading } = useQuery<ZibraConfigItem[]>({
    queryKey: ["/api/admin/zibra/config"],
  });

  const { data: auditLogs } = useQuery<ZibraAuditLog[]>({
    queryKey: ["/api/admin/zibra/config/audit"],
  });

  const updateConfig = useMutation({
    mutationFn: async ({ key, value, description, reason: r }: { key: string; value: string; description?: string; reason?: string }) => {
      await apiRequest("POST", "/api/admin/zibra/config", { key, value, description, reason: r });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/zibra/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/zibra/config/audit"] });
      toast({ title: "Configuration updated", description: "The change has been saved and logged." });
      setConfirmKey(null);
      setConfirmValue("");
      setReason("");
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not save the configuration change.", variant: "destructive" });
    },
  });

  const getConfigValue = (key: string): string => {
    const config = configs?.find(c => c.key === key);
    return config?.value || "";
  };

  const isBoolTrue = (key: string): boolean => {
    const val = getConfigValue(key);
    return val === "" || val === "true";
  };

  const handleToggle = (key: string, currentVal: boolean) => {
    const newVal = (!currentVal).toString();
    setConfirmKey(key);
    setConfirmValue(newVal);
  };

  const handleConfirm = () => {
    if (!confirmKey) return;
    const configDef = CONFIG_KEYS.find(c => c.key === confirmKey);
    updateConfig.mutate({
      key: confirmKey,
      value: confirmValue,
      description: configDef?.description,
      reason: reason || undefined,
    });
  };

  const handleBlacklistSave = () => {
    updateConfig.mutate({
      key: "zibra_blacklist_phrases",
      value: blacklistInput,
      description: "Comma-separated phrases ZIBRA must never say",
      reason: "Blacklist updated",
    });
  };

  const currentBlacklist = getConfigValue("zibra_blacklist_phrases");

  return (
    <div className="space-y-6" data-testid="container-zibra-governance">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">ZIBRA Governance</h2>
        <Badge variant="secondary" className="text-[10px]">Super Admin</Badge>
      </div>

      {confirmKey && (
        <Card className="border-yellow-500/50" data-testid="card-confirm-change">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-sm">Confirm Change</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You are about to change <span className="font-mono text-xs">{confirmKey}</span> to <span className="font-mono text-xs">{confirmValue}</span>
            </p>
            <Input
              placeholder="Reason for change (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="input-change-reason"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleConfirm} disabled={updateConfig.isPending} data-testid="button-confirm-change">
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setConfirmKey(null); setReason(""); }} data-testid="button-cancel-change">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <Card key={i}><CardContent className="p-4"><div className="h-8 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          <Card data-testid="card-global-controls">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Global Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CONFIG_KEYS.filter(c => c.type === "boolean").map(config => (
                <div key={config.key} className="flex items-center justify-between gap-4" data-testid={`toggle-${config.key}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                  <Switch
                    checked={isBoolTrue(config.key)}
                    onCheckedChange={() => handleToggle(config.key, isBoolTrue(config.key))}
                    data-testid={`switch-${config.key}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card data-testid="card-escalation-threshold">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Escalation Threshold
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  value={getConfigValue("zibra_escalation_threshold") || "0"}
                  onChange={(e) => {
                    setConfirmKey("zibra_escalation_threshold");
                    setConfirmValue(e.target.value);
                  }}
                  className="w-24"
                  data-testid="input-escalation-threshold"
                />
                <span className="text-sm text-muted-foreground">messages before suggesting escalation (0 = disabled)</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-phrase-blacklist">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Ban className="h-4 w-4" />
                Phrase Blacklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Comma-separated phrases that ZIBRA must never include in responses. These will be redacted.</p>
              <Textarea
                value={blacklistInput || currentBlacklist}
                onChange={(e) => setBlacklistInput(e.target.value)}
                placeholder="e.g., guarantee, promise, definitely, certainly"
                rows={3}
                data-testid="textarea-blacklist"
              />
              <Button size="sm" onClick={handleBlacklistSave} disabled={updateConfig.isPending} data-testid="button-save-blacklist">
                Save Blacklist
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-audit-log">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Configuration Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {auditLogs && auditLogs.length > 0 ? auditLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 text-sm border-b border-border/50 pb-2" data-testid={`row-audit-${log.id}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-mono">{log.configKey}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.oldValue ? `${log.oldValue} -> ` : ""}{log.newValue}
                        </span>
                      </div>
                      {log.reason && <p className="text-xs text-muted-foreground mt-0.5">{log.reason}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No configuration changes recorded yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}