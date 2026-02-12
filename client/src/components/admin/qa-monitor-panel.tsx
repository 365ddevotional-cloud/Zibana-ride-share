import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";

interface QaSummary {
  totalActions: number;
  errorCount: number;
  errorRate: number;
  rideRequests: number;
  rideAccepts: number;
  rideCancels: number;
  tripCompletes: number;
  rideSuccessRate: number;
  walletDebits: number;
  walletCredits: number;
  paymentErrors: number;
  ratingSubmissions: number;
  ratingErrors: number;
  messagesSent: number;
  messageErrors: number;
  qaMode: boolean;
  systemMode: string;
  recentErrors: Array<{
    id: number;
    actionType: string;
    endpoint: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

interface QaMonitorPanelProps {
  isSuperAdmin: boolean;
}

export default function QaMonitorPanel({ isSuperAdmin }: QaMonitorPanelProps) {
  const { data: summary, isLoading } = useQuery<QaSummary>({
    queryKey: ["/api/admin/qa-monitor/summary"],
    refetchInterval: 15000,
  });

  const toggleQaMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/admin/qa-mode/toggle", { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/qa-monitor/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const qaMode = summary?.qaMode || false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800 dark:text-slate-100" data-testid="text-qa-monitor-title">
            QA Monitor
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time quality assurance monitoring and error tracking (last 24 hours).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">QA Mode</span>
              <Switch
                checked={qaMode}
                onCheckedChange={(checked) => toggleQaMutation.mutate(checked)}
                disabled={toggleQaMutation.isPending}
                data-testid="switch-qa-mode"
              />
            </div>
          )}
          <Badge
            variant="secondary"
            className={qaMode
              ? "bg-orange-500 text-white dark:bg-orange-600 dark:text-white no-default-hover-elevate no-default-active-elevate"
              : "no-default-hover-elevate no-default-active-elevate"
            }
            data-testid="badge-qa-status"
          >
            {qaMode ? "QA Active" : "QA Inactive"}
          </Badge>
        </div>
      </div>

      {qaMode && summary && summary.errorCount > 0 && (
        <Card className="rounded-xl border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20" data-testid="banner-qa-alert">
          <CardContent className="flex items-start gap-3 py-4 px-5">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                QA Alert: {summary.errorCount} error(s) detected in the last 24 hours
              </p>
              <p className="text-sm text-red-700/80 dark:text-red-300/70 mt-0.5">
                Error rate: {summary.errorRate}% — All errors are flagged for review.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6" data-testid="qa-kpi-grid">
        <KpiCard label="Total Actions" value={summary?.totalActions || 0} color="border-t-blue-500" />
        <KpiCard label="Ride Requests" value={summary?.rideRequests || 0} color="border-t-violet-500" />
        <KpiCard label="Trip Completions" value={summary?.tripCompletes || 0} color="border-t-emerald-500" />
        <KpiCard
          label="Failed / Errors"
          value={summary?.errorCount || 0}
          color="border-t-red-500"
          alert={!!summary && summary.errorCount > 0}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <KpiCard label="Payment Mismatches" value={summary?.paymentErrors || 0} color="border-t-amber-500" alert={!!summary && summary.paymentErrors > 0} />
        <KpiCard label="Rating Errors" value={summary?.ratingErrors || 0} color="border-t-orange-500" alert={!!summary && summary.ratingErrors > 0} />
        <KpiCard label="Message Failures" value={summary?.messageErrors || 0} color="border-t-pink-500" alert={!!summary && summary.messageErrors > 0} />
        <KpiCard label="Ride Success Rate" value={`${summary?.rideSuccessRate || 0}%`} color="border-t-emerald-500" />
      </div>

      <Card className="rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100" data-testid="text-recent-errors-title">
              Recent Errors
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/qa-monitor/summary"] })}
              data-testid="button-refresh-qa"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Endpoint</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Error</th>
                </tr>
              </thead>
              <tbody>
                {(!summary?.recentErrors || summary.recentErrors.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                        <span>No errors detected in the last 24 hours</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  summary.recentErrors.map((err) => (
                    <tr key={err.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(err.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                          {err.actionType}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {err.endpoint}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-red-600 dark:text-red-400">
                        {err.errorMessage || "Unknown error"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, color, alert }: { label: string; value: string | number; color: string; alert?: boolean }) {
  return (
    <Card
      className={`rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 border-t-4 ${color}`}
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardContent className="pt-5 pb-4 px-4">
        <p className="text-[13px] font-medium opacity-70 tracking-wide text-slate-500 dark:text-slate-400 uppercase mb-2">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <p
            className={`font-extrabold leading-tight ${alert ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-100"}`}
            style={{ fontSize: "clamp(18px, 2.5vw, 26px)" }}
          >
            {value}
          </p>
          {alert && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
        </div>
      </CardContent>
    </Card>
  );
}
