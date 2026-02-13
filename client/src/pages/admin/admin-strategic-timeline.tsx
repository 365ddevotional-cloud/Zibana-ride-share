import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Landmark,
  X,
  ScrollText,
} from "lucide-react";

interface FounderReminder {
  id: number;
  launchDate: string | null;
  firstRevenueDate: string | null;
  reminderMonthsAfterRevenue: number;
  reminderTriggered: boolean;
  reminderLog: string | null;
  founderModeEnabled: boolean;
  checklistState: string | null;
  lastBannerShown: string | null;
  updatedAt: string | null;
}

const CHECKLIST_ITEMS = [
  { key: "revocable_trust", label: "Create Revocable Living Trust" },
  { key: "transfer_shares", label: "Transfer Zibana Global Inc shares into trust" },
  { key: "estate_documents", label: "Review estate documents" },
  { key: "beneficiary_structure", label: "Confirm beneficiary structure" },
  { key: "corporate_compliance", label: "Review corporate compliance" },
  { key: "nigeria_profit_flow", label: "Review Nigeria subsidiary profit flow" },
  { key: "share_amendment", label: "Consider share increase amendment (if scaling)" },
];

export default function AdminStrategicTimeline() {
  const { toast } = useToast();
  const [showFullAlert, setShowFullAlert] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const { data: reminder, isLoading } = useQuery<FounderReminder>({
    queryKey: ["/api/admin/founder/strategic-reminder"],
    refetchInterval: 60000,
  });

  const checklist: Record<string, boolean> = reminder?.checklistState
    ? (() => { try { return JSON.parse(reminder.checklistState); } catch { return {}; } })()
    : {};

  const allComplete = CHECKLIST_ITEMS.every(item => checklist[item.key]);
  const completedCount = CHECKLIST_ITEMS.filter(item => checklist[item.key]).length;

  useEffect(() => {
    if (!reminder) return;
    if (reminder.reminderTriggered && reminder.founderModeEnabled) {
      const dismissed = localStorage.getItem("zibana-founder-alert-dismissed");
      if (!dismissed) {
        setShowFullAlert(true);
      }
      if (!allComplete) {
        const lastShown = reminder.lastBannerShown ? new Date(reminder.lastBannerShown) : null;
        const now = new Date();
        if (!lastShown || (now.getTime() - lastShown.getTime()) > 30 * 24 * 60 * 60 * 1000) {
          setShowBanner(true);
        }
      }
    }
  }, [reminder, allComplete]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<FounderReminder>) => {
      const res = await apiRequest("PATCH", "/api/admin/founder/strategic-reminder", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/founder/strategic-reminder"] });
      toast({ title: "Settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/founder/strategic-reminder/reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/founder/strategic-reminder"] });
      localStorage.removeItem("zibana-founder-alert-dismissed");
      toast({ title: "Reminder reset successfully" });
    },
    onError: () => {
      toast({ title: "Failed to reset", variant: "destructive" });
    },
  });

  const dismissBannerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/founder/strategic-reminder/dismiss-banner");
      return res.json();
    },
    onSuccess: () => {
      setShowBanner(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/founder/strategic-reminder"] });
    },
  });

  const toggleCheckItem = (key: string) => {
    const updated = { ...checklist, [key]: !checklist[key] };
    updateMutation.mutate({ checklistState: JSON.stringify(updated) });
  };

  const dismissFullAlert = () => {
    setShowFullAlert(false);
    localStorage.setItem("zibana-founder-alert-dismissed", "true");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <>
      {showFullAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" data-testid="founder-alert-overlay">
          <div className="bg-card rounded-xl shadow-2xl max-w-lg w-full mx-4 p-8 space-y-6 border border-amber-500/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Landmark className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground" data-testid="text-founder-alert-title">
                  Founder Strategic Reminder Activated
                </h2>
              </div>
              <Button size="icon" variant="ghost" onClick={dismissFullAlert} data-testid="button-dismiss-alert">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              It has been {reminder?.reminderMonthsAfterRevenue || 4} months since your first revenue milestone.
              Please review the following strategic items:
            </p>
            <div className="space-y-2.5">
              {CHECKLIST_ITEMS.map(item => (
                <div key={item.key} className="flex items-center gap-2.5 text-sm" data-testid={`alert-check-${item.key}`}>
                  {checklist[item.key]
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                  }
                  <span className={checklist[item.key] ? "line-through opacity-60" : "text-foreground"}>{item.label}</span>
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={dismissFullAlert} data-testid="button-acknowledge-alert">
              Acknowledge and Continue
            </Button>
          </div>
        </div>
      )}

      {showBanner && !showFullAlert && (
        <div className="mb-6 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex flex-wrap items-center justify-between gap-4" data-testid="founder-banner">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Founder Strategic Checklist: {completedCount}/{CHECKLIST_ITEMS.length} items completed
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5">
                Review pending strategic items in the timeline below.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => dismissBannerMutation.mutate()} data-testid="button-dismiss-banner">
            Dismiss for 30 days
          </Button>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-slate-800 dark:text-slate-100" data-testid="text-strategic-title">
              Strategic Timeline
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Founder-level strategic reminders and compliance tracking.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Founder Strategic Mode</span>
              <Switch
                checked={reminder?.founderModeEnabled || false}
                onCheckedChange={(checked) => updateMutation.mutate({ founderModeEnabled: checked })}
                disabled={updateMutation.isPending}
                data-testid="switch-founder-mode"
              />
            </div>
            <Badge
              variant="secondary"
              className={reminder?.founderModeEnabled
                ? "bg-amber-500 text-white dark:bg-amber-600 dark:text-white no-default-hover-elevate no-default-active-elevate"
                : "no-default-hover-elevate no-default-active-elevate"
              }
              data-testid="badge-founder-mode"
            >
              {reminder?.founderModeEnabled ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 border-t-4 border-t-blue-500">
            <CardHeader className="gap-2">
              <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2" data-testid="text-dates-title">
                <Calendar className="h-5 w-5 text-blue-500" />
                Key Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Launch Date</label>
                <Input
                  type="date"
                  value={reminder?.launchDate ? new Date(reminder.launchDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => updateMutation.mutate({ launchDate: e.target.value ? new Date(e.target.value).toISOString() : null } as any)}
                  data-testid="input-launch-date"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">First Revenue Date</label>
                <Input
                  type="date"
                  value={reminder?.firstRevenueDate ? new Date(reminder.firstRevenueDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => updateMutation.mutate({ firstRevenueDate: e.target.value ? new Date(e.target.value).toISOString() : null } as any)}
                  data-testid="input-revenue-date"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Reminder Trigger (months after revenue)</label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={reminder?.reminderMonthsAfterRevenue || 4}
                  onChange={(e) => updateMutation.mutate({ reminderMonthsAfterRevenue: parseInt(e.target.value) || 4 })}
                  data-testid="input-reminder-months"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 border-t-4 border-t-emerald-500">
            <CardHeader className="gap-2">
              <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2" data-testid="text-status-title">
                <Shield className="h-5 w-5 text-emerald-500" />
                Reminder Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Reminder Triggered</span>
                <Badge
                  variant="secondary"
                  className={reminder?.reminderTriggered
                    ? "bg-amber-500 text-white dark:bg-amber-600 dark:text-white no-default-hover-elevate no-default-active-elevate"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 no-default-hover-elevate no-default-active-elevate"
                  }
                  data-testid="badge-reminder-status"
                >
                  {reminder?.reminderTriggered ? "Triggered" : "Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Checklist Progress</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100" data-testid="text-checklist-progress">
                  {completedCount}/{CHECKLIST_ITEMS.length}
                </span>
              </div>
              {reminder?.reminderTriggered && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  data-testid="button-reset-reminder"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reset Reminder
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 border-t-4 border-t-amber-500">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2" data-testid="text-checklist-title">
              <Landmark className="h-5 w-5 text-amber-500" />
              Strategic Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CHECKLIST_ITEMS.map(item => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover-elevate"
                  data-testid={`check-strategic-${item.key}`}
                >
                  <input
                    type="checkbox"
                    checked={!!checklist[item.key]}
                    onChange={() => toggleCheckItem(item.key)}
                    className="rounded border-slate-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500 h-4.5 w-4.5"
                  />
                  <span className={`text-sm ${checklist[item.key] ? "line-through opacity-60 text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
            {allComplete && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2" data-testid="banner-checklist-complete">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  All strategic items completed.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2" data-testid="text-reminder-log-title">
              <ScrollText className="h-5 w-5 text-slate-500" />
              Reminder Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reminder?.reminderLog ? (
              <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 max-h-60 overflow-y-auto" data-testid="text-reminder-log">
                {reminder.reminderLog}
              </pre>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No audit entries yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
