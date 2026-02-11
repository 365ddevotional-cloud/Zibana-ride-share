import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Car,
  MapPin,
  Clock,
  Banknote,
  UserCheck,
  Activity,
  HeartPulse,
  Rocket,
  CheckSquare,
  ArrowRight,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

interface AdminStats {
  totalDrivers: number;
  pendingDrivers: number;
  totalTrips: number;
  activeTrips: number;
  totalRiders: number;
  completedTrips: number;
  totalFares: string;
  totalCommission: string;
  totalDriverPayouts: string;
}

function formatCurrency(value: string): string {
  const num = parseFloat(value || "0");
  if (num >= 1_000_000) return `\u20A6${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `\u20A6${(num / 1_000).toFixed(1)}K`;
  return `\u20A6${num.toFixed(0)}`;
}

function getKpiTextSize(value: string | number): string {
  const str = String(value);
  if (str.length > 6) return "text-2xl md:text-3xl";
  return "text-3xl md:text-4xl";
}

const kpiCards = [
  { label: "TOTAL RIDERS", key: "totalRiders" as const, icon: Users, borderColor: "border-t-blue-500", iconBg: "text-blue-500/15", format: (v: number) => String(v) },
  { label: "TOTAL DRIVERS", key: "totalDrivers" as const, icon: Car, borderColor: "border-t-emerald-500", iconBg: "text-emerald-500/15", format: (v: number) => String(v) },
  { label: "ACTIVE TRIPS", key: "activeTrips" as const, icon: MapPin, borderColor: "border-t-amber-500", iconBg: "text-amber-500/15", format: (v: number) => String(v) },
  { label: "PENDING APPROVALS", key: "pendingDrivers" as const, icon: Clock, borderColor: "border-t-red-500", iconBg: "text-red-500/15", format: (v: number) => String(v) },
  { label: "REVENUE", key: "totalFares" as const, icon: Banknote, borderColor: "border-t-violet-500", iconBg: "text-violet-500/15", format: null },
  { label: "COMPLETED TRIPS", key: "completedTrips" as const, icon: UserCheck, borderColor: "border-t-blue-700 dark:border-t-blue-400", iconBg: "text-blue-700/15 dark:text-blue-400/15", format: (v: number) => String(v) },
];

interface SystemStatusItem {
  label: string;
  value: number | string;
  icon: LucideIcon;
  route: string;
  color: string;
}

interface QuickNavItem {
  label: string;
  description: string;
  icon: LucideIcon;
  route: string;
  accent: string;
  accentBg: string;
}

const quickNavItems: QuickNavItem[] = [
  { label: "Monitoring", description: "Active trips and driver status", icon: Activity, route: "/admin/control/monitoring", accent: "text-blue-600 dark:text-blue-400", accentBg: "bg-blue-50 dark:bg-blue-900/20" },
  { label: "Health Alerts", description: "System alerts and warnings", icon: HeartPulse, route: "/admin/control/alerts", accent: "text-rose-600 dark:text-rose-400", accentBg: "bg-rose-50 dark:bg-rose-900/20" },
  { label: "Launch Readiness", description: "Checklists and kill switches", icon: Rocket, route: "/admin/control/launch", accent: "text-amber-600 dark:text-amber-400", accentBg: "bg-amber-50 dark:bg-amber-900/20" },
  { label: "Ops Readiness", description: "Playbooks and escalation", icon: CheckSquare, route: "/admin/control/ops", accent: "text-emerald-600 dark:text-emerald-400", accentBg: "bg-emerald-50 dark:bg-emerald-900/20" },
];

export default function ControlOverviewPage() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const systemStatus: SystemStatusItem[] = [
    { label: "Drivers Online", value: stats?.totalDrivers ?? 0, icon: Car, route: "/admin/control/monitoring", color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Active Trips", value: stats?.activeTrips ?? 0, icon: MapPin, route: "/admin/control/monitoring", color: "text-blue-600 dark:text-blue-400" },
    { label: "Pending Approvals", value: stats?.pendingDrivers ?? 0, icon: Clock, route: "/admin/drivers", color: "text-amber-600 dark:text-amber-400" },
    { label: "Critical Alerts", value: 0, icon: AlertTriangle, route: "/admin/control/alerts", color: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6" data-testid="control-kpi-row">
        {kpiCards.map((kpi, index) => {
          const KpiIcon = kpi.icon;
          let displayValue: string | number = "--";
          if (!isLoading && !isError && stats) {
            if (kpi.key === "totalFares") {
              displayValue = formatCurrency(stats.totalFares);
            } else {
              const raw = stats[kpi.key];
              displayValue = kpi.format ? kpi.format(raw as number) : String(raw);
            }
          }
          const textSize = getKpiTextSize(displayValue);

          return (
            <Card
              key={kpi.label}
              className={`rounded-xl shadow-lg shadow-slate-200/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 border-t-4 ${kpi.borderColor} relative overflow-visible`}
              data-testid={`control-kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <CardContent className="pt-5 pb-4 px-4">
                <div className="relative">
                  <KpiIcon className={`absolute -top-1 right-0 h-10 w-10 ${kpi.iconBg}`} />
                  <p className="text-[0.65rem] font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase mb-2">
                    {kpi.label}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-10 w-20" />
                  ) : (
                    <p
                      className={`${textSize} font-extrabold text-slate-800 dark:text-slate-100 leading-tight truncate overflow-hidden whitespace-nowrap admin-kpi-number`}
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      {displayValue}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div data-testid="system-status-bar">
        <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100 mb-4">System Status</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {systemStatus.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.route}>
                <Card className="hover-elevate rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer" data-testid={`status-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardContent className="flex items-center gap-3 py-4 px-4">
                    <Icon className={`h-5 w-5 shrink-0 ${item.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                      {isLoading ? (
                        <Skeleton className="h-6 w-12 mt-1" />
                      ) : (
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{item.value}</p>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div data-testid="quick-navigation">
        <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100 mb-4">Control Center Sections</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.route} data-testid={`nav-control-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <Card className="hover-elevate rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:scale-[1.01] transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="flex items-center gap-4 py-5 px-5">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.accentBg}`}>
                      <Icon className={`h-5 w-5 ${item.accent}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div data-testid="attention-items">
        <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100 mb-4">Attention Required</h2>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (stats?.pendingDrivers ?? 0) > 0 || (stats?.activeTrips ?? 0) > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {(stats?.pendingDrivers ?? 0) > 0 && (
              <Link href="/admin/drivers" data-testid="attention-pending-drivers">
                <Card className="hover-elevate rounded-xl border border-slate-200 dark:border-slate-700 border-l-[3px] border-l-orange-400 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer">
                  <CardContent className="flex items-center gap-3 py-4 px-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Pending Driver Approvals</p>
                      <Badge variant="secondary" className="text-xs mt-0.5">{stats?.pendingDrivers}</Badge>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </CardContent>
                </Card>
              </Link>
            )}
            {(stats?.activeTrips ?? 0) > 0 && (
              <Link href="/admin/control/monitoring" data-testid="attention-active-trips">
                <Card className="hover-elevate rounded-xl border border-slate-200 dark:border-slate-700 border-l-[3px] border-l-blue-400 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer">
                  <CardContent className="flex items-center gap-3 py-4 px-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Active Trips Requiring Monitor</p>
                      <Badge variant="secondary" className="text-xs mt-0.5">{stats?.activeTrips}</Badge>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        ) : (
          <Card className="rounded-xl border border-slate-200 dark:border-slate-700" data-testid="no-attention-needed">
            <CardContent className="flex items-center gap-3 py-4 px-4">
              <UserCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No pending issues. All systems operational.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
