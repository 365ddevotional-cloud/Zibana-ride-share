import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Users,
  Car,
  Shield,
  Activity,
} from "lucide-react";

interface StabilityData {
  errorRate: number;
  rideSuccessRate: number;
  paymentSuccessRate: number;
  activeDrivers: number;
  activeRiders: number;
  paymentMismatchFlag: boolean;
  paymentMismatchCount: number;
  errorWarning: boolean;
  totalActions: number;
  qaMode: boolean;
  systemMode: string;
}

export default function SystemStabilityPanel() {
  const { data, isLoading } = useQuery<StabilityData>({
    queryKey: ["/api/admin/system-stability"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stability = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800 dark:text-slate-100" data-testid="text-stability-title">
            System Stability
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time health metrics and stability indicators (last 24 hours).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/system-stability"] })}
          data-testid="button-refresh-stability"
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {stability?.errorWarning && (
        <Card className="rounded-xl border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20" data-testid="banner-error-warning">
          <CardContent className="flex items-start gap-3 py-4 px-5">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                High Error Rate Detected: {stability.errorRate}%
              </p>
              <p className="text-sm text-red-700/80 dark:text-red-300/70 mt-0.5">
                Error rate exceeds the 5% threshold. Immediate investigation recommended.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {stability?.paymentMismatchFlag && (
        <Card className="rounded-xl border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20" data-testid="banner-payment-mismatch">
          <CardContent className="flex items-start gap-3 py-4 px-5">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Payment Mismatch Detected ({stability.paymentMismatchCount} error(s))
              </p>
              <p className="text-sm text-amber-700/80 dark:text-amber-300/70 mt-0.5">
                Manual review required. Auto-flagged for investigation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6" data-testid="stability-kpi-grid">
        <MetricCard
          label="Error Rate"
          value={`${stability?.errorRate || 0}%`}
          icon={<AlertTriangle className="h-5 w-5" />}
          status={stability?.errorWarning ? "danger" : "healthy"}
        />
        <MetricCard
          label="Ride Success Rate"
          value={`${stability?.rideSuccessRate || 0}%`}
          icon={<Activity className="h-5 w-5" />}
          status={(stability?.rideSuccessRate || 0) >= 80 ? "healthy" : (stability?.rideSuccessRate || 0) >= 50 ? "warning" : "danger"}
        />
        <MetricCard
          label="Payment Success Rate"
          value={`${stability?.paymentSuccessRate || 100}%`}
          icon={<Shield className="h-5 w-5" />}
          status={(stability?.paymentSuccessRate || 100) >= 95 ? "healthy" : (stability?.paymentSuccessRate || 100) >= 80 ? "warning" : "danger"}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        <MetricCard
          label="Active Drivers"
          value={stability?.activeDrivers || 0}
          icon={<Car className="h-5 w-5" />}
          status="neutral"
        />
        <MetricCard
          label="Active Riders"
          value={stability?.activeRiders || 0}
          icon={<Users className="h-5 w-5" />}
          status="neutral"
        />
        <MetricCard
          label="Total Actions (24h)"
          value={stability?.totalActions || 0}
          icon={<Activity className="h-5 w-5" />}
          status="neutral"
        />
      </div>

      <Card className="rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100" data-testid="text-status-summary-title">
            Status Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <StatusRow
            label="System Mode"
            value={stability?.systemMode || "development"}
            badge
            badgeColor={
              stability?.systemMode === "live" ? "bg-emerald-500 text-white" :
              stability?.systemMode === "soft_launch" ? "bg-amber-500 text-white" :
              "bg-slate-500 text-white"
            }
          />
          <StatusRow
            label="QA Mode"
            value={stability?.qaMode ? "Active" : "Inactive"}
            badge
            badgeColor={stability?.qaMode ? "bg-orange-500 text-white" : ""}
          />
          <StatusRow
            label="Error Threshold (5%)"
            value={stability?.errorWarning ? "Exceeded" : "Within Limits"}
            icon={stability?.errorWarning ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          />
          <StatusRow
            label="Payment Integrity"
            value={stability?.paymentMismatchFlag ? "Review Required" : "Healthy"}
            icon={stability?.paymentMismatchFlag ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon, status }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  status: "healthy" | "warning" | "danger" | "neutral";
}) {
  const borderColor = {
    healthy: "border-t-emerald-500",
    warning: "border-t-amber-500",
    danger: "border-t-red-500",
    neutral: "border-t-blue-500",
  }[status];

  const iconColor = {
    healthy: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
    neutral: "text-blue-500",
  }[status];

  return (
    <Card
      className={`rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 border-t-4 ${borderColor}`}
      data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-medium opacity-70 tracking-wide text-slate-500 dark:text-slate-400 uppercase">
            {label}
          </p>
          <span className={iconColor}>{icon}</span>
        </div>
        <p
          className="font-extrabold text-slate-800 dark:text-slate-100 leading-tight"
          style={{ fontSize: "clamp(18px, 2.5vw, 26px)" }}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, value, badge, badgeColor, icon }: {
  label: string;
  value: string;
  badge?: boolean;
  badgeColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        {icon}
        {badge ? (
          <Badge
            variant="secondary"
            className={`${badgeColor} no-default-hover-elevate no-default-active-elevate`}
          >
            {value}
          </Badge>
        ) : (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{value}</span>
        )}
      </div>
    </div>
  );
}
