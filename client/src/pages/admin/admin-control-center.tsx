import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useQuery } from "@tanstack/react-query";
import { sidebarSections } from "./admin-sidebar";
import {
  Car,
  MapPin,
  Wallet,
  ShieldAlert,
  BarChart3,
  Shield,
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  Banknote,
  UserCheck,
  ArrowRight,
  CheckCircle,
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

const sectionMeta: Record<string, { icon: LucideIcon; accent: string; accentBg: string; borderColor: string; description: string }> = {
  "Control Center": {
    icon: Activity,
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-l-blue-500",
    description: "Monitoring, health alerts, and launch readiness",
  },
  "Users & People": {
    icon: Users,
    accent: "text-indigo-600 dark:text-indigo-400",
    accentBg: "bg-indigo-50 dark:bg-indigo-900/20",
    borderColor: "border-l-indigo-500",
    description: "Drivers, riders, directors, and team management",
  },
  "Trips & Operations": {
    icon: MapPin,
    accent: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-l-emerald-500",
    description: "Active trips, reservations, ride classes, and fees",
  },
  "Finance & Wallets": {
    icon: Wallet,
    accent: "text-amber-600 dark:text-amber-400",
    accentBg: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-l-amber-500",
    description: "Payouts, wallets, settlements, and tax documents",
  },
  "Ratings & Support": {
    icon: BarChart3,
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-50 dark:bg-violet-900/20",
    borderColor: "border-l-violet-500",
    description: "Ratings, disputes, inbox, and help center",
  },
  "Safety & Compliance": {
    icon: Shield,
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-l-red-500",
    description: "Fraud detection, incidents, insurance, and compliance",
  },
  "Growth & Intelligence": {
    icon: TrendingUp,
    accent: "text-teal-600 dark:text-teal-400",
    accentBg: "bg-teal-50 dark:bg-teal-900/20",
    borderColor: "border-l-teal-500",
    description: "Reports, analytics, incentives, and ZIBRA insights",
  },
};

function formatCurrency(value: string): string {
  const num = parseFloat(value || "0");
  if (num >= 1_000_000) return `\u20A6${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `\u20A6${(num / 1_000).toFixed(1)}K`;
  return `\u20A6${num.toFixed(0)}`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const kpiCards = [
  {
    label: "TOTAL RIDERS",
    key: "totalRiders" as const,
    icon: Users,
    borderColor: "border-t-blue-500",
    iconBg: "text-blue-500/15",
    format: (v: number) => String(v),
  },
  {
    label: "TOTAL DRIVERS",
    key: "totalDrivers" as const,
    icon: Car,
    borderColor: "border-t-emerald-500",
    iconBg: "text-emerald-500/15",
    format: (v: number) => String(v),
  },
  {
    label: "ACTIVE TRIPS",
    key: "activeTrips" as const,
    icon: MapPin,
    borderColor: "border-t-amber-500",
    iconBg: "text-amber-500/15",
    format: (v: number) => String(v),
  },
  {
    label: "PENDING APPROVALS",
    key: "pendingDrivers" as const,
    icon: Clock,
    borderColor: "border-t-red-500",
    iconBg: "text-red-500/15",
    format: (v: number) => String(v),
  },
  {
    label: "REVENUE",
    key: "totalFares" as const,
    icon: Banknote,
    borderColor: "border-t-violet-500",
    iconBg: "text-violet-500/15",
    format: null,
  },
  {
    label: "COMPLETED TRIPS",
    key: "completedTrips" as const,
    icon: UserCheck,
    borderColor: "border-t-blue-700 dark:border-t-blue-400",
    iconBg: "text-blue-700/15 dark:text-blue-400/15",
    format: (v: number) => String(v),
  },
];

export default function AdminControlCenter() {
  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const attentionItems = [
    {
      label: "Pending Driver Approvals",
      count: stats?.pendingDrivers ?? 0,
      icon: Clock,
      route: "/admin/drivers",
    },
    {
      label: "Active Trips Requiring Monitor",
      count: stats?.activeTrips ?? 0,
      icon: MapPin,
      route: "/admin/trips",
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-8">
      <Breadcrumb data-testid="breadcrumb-nav">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="breadcrumb-current">Admin</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5" data-testid="overview-context-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100" data-testid="text-control-center-title">
            Admin Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">System-wide operational snapshot</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400" data-testid="text-current-date">{formatDate()}</span>
          <Badge variant="outline" className="text-xs" data-testid="badge-environment">
            {import.meta.env.MODE === "production" ? "Production" : "Development"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6" data-testid="metrics-row">
        {kpiCards.map((kpi) => {
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

          return (
            <Card
              key={kpi.label}
              className={`rounded-xl shadow-lg border-t-4 ${kpi.borderColor} relative overflow-visible`}
              data-testid={`metric-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <CardContent className="pt-5 pb-4 px-4">
                <div className="relative">
                  <KpiIcon className={`absolute -top-1 right-0 h-10 w-10 ${kpi.iconBg}`} />
                  <p className="text-[0.65rem] font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase mb-2" data-testid={`label-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {kpi.label}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100" data-testid={`value-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
                      {displayValue}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100 mb-4">Action Zones</h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="action-zones">
          {sidebarSections.map((section) => {
            const meta = sectionMeta[section.label];
            const SectionIcon = meta?.icon || Activity;
            const firstRoute = section.items[0]?.route || "/admin/overview";

            return (
              <Card
                key={section.label}
                className={`hover-elevate rounded-xl shadow-lg border-l-2 ${meta?.borderColor || ""} transition-all duration-200`}
                data-testid={`zone-${section.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardHeader className="pb-3 gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta?.accentBg || "bg-muted"}`}>
                      <SectionIcon className={`h-5 w-5 ${meta?.accent || "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">{section.label}</CardTitle>
                      {meta?.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{meta.description}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-0.5">
                    {section.items.slice(0, 5).map((item) => (
                      <Link
                        key={item.value}
                        href={item.route}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover-elevate transition-colors"
                        data-testid={`link-${item.value}`}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                    {section.items.length > 5 && (
                      <Link
                        href={firstRoute}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover-elevate transition-colors"
                        data-testid={`link-more-${section.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span>+{section.items.length - 5} more</span>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div data-testid="attention-section">
        <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100 mb-4">Attention Required</h2>
        {isLoading ? (
          <Card className="rounded-xl shadow-lg">
            <CardContent className="pt-4 pb-4 px-4">
              <Skeleton className="h-5 w-48" />
            </CardContent>
          </Card>
        ) : attentionItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {attentionItems.map((item) => (
              <Link key={item.label} href={item.route} data-testid={`attention-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <Card className="hover-elevate rounded-xl shadow-lg border-l-2 border-l-orange-400">
                  <CardContent className="flex items-center gap-3 pt-4 pb-4 px-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <item.icon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{item.label}</p>
                      <Badge variant="secondary" className="text-xs mt-0.5">
                        {item.count}
                      </Badge>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="rounded-xl shadow-lg" data-testid="no-attention-needed">
            <CardContent className="flex items-center gap-3 pt-4 pb-4 px-4">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No pending issues. All systems operational.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
