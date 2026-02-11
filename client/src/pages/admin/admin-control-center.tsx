import { Link, useLocation } from "wouter";
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

const sectionRoutes: Record<string, string> = {
  "Control Center": "/admin/control/overview",
  "Users & People": "/admin/users/drivers",
  "Trips & Operations": "/admin/trips",
  "Finance & Wallets": "/admin/finance/payouts",
  "Ratings & Support": "/admin/support/ratings",
  "Safety & Compliance": "/admin/safety/fraud",
  "Growth & Intelligence": "/admin/growth/reports",
};

const sectionMeta: Record<string, { icon: LucideIcon; accent: string; accentBg: string; borderColor: string; hoverGlow: string; description: string }> = {
  "Control Center": {
    icon: Activity,
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-l-blue-500",
    hoverGlow: "hover:shadow-blue-200/40 dark:hover:shadow-blue-900/30",
    description: "Monitoring, health alerts, and launch readiness",
  },
  "Users & People": {
    icon: Users,
    accent: "text-indigo-600 dark:text-indigo-400",
    accentBg: "bg-indigo-50 dark:bg-indigo-900/20",
    borderColor: "border-l-indigo-500",
    hoverGlow: "hover:shadow-indigo-200/40 dark:hover:shadow-indigo-900/30",
    description: "Drivers, riders, directors, and team management",
  },
  "Trips & Operations": {
    icon: MapPin,
    accent: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-l-emerald-500",
    hoverGlow: "hover:shadow-emerald-200/40 dark:hover:shadow-emerald-900/30",
    description: "Active trips, reservations, ride classes, and fees",
  },
  "Finance & Wallets": {
    icon: Wallet,
    accent: "text-amber-600 dark:text-amber-400",
    accentBg: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-l-amber-500",
    hoverGlow: "hover:shadow-amber-200/40 dark:hover:shadow-amber-900/30",
    description: "Payouts, wallets, settlements, and tax documents",
  },
  "Ratings & Support": {
    icon: BarChart3,
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-50 dark:bg-violet-900/20",
    borderColor: "border-l-violet-500",
    hoverGlow: "hover:shadow-violet-200/40 dark:hover:shadow-violet-900/30",
    description: "Ratings, disputes, inbox, and help center",
  },
  "Safety & Compliance": {
    icon: Shield,
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-l-red-500",
    hoverGlow: "hover:shadow-red-200/40 dark:hover:shadow-red-900/30",
    description: "Fraud detection, incidents, insurance, and compliance",
  },
  "Growth & Intelligence": {
    icon: TrendingUp,
    accent: "text-teal-600 dark:text-teal-400",
    accentBg: "bg-teal-50 dark:bg-teal-900/20",
    borderColor: "border-l-teal-500",
    hoverGlow: "hover:shadow-teal-200/40 dark:hover:shadow-teal-900/30",
    description: "Reports, analytics, incentives, and ZIBRA insights",
  },
};

function formatCurrency(value: string): string {
  const num = parseFloat(value || "0");
  return "\u20A6" + new Intl.NumberFormat("en-NG").format(num);
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
    format: (v: number) => new Intl.NumberFormat("en-NG").format(v),
  },
  {
    label: "TOTAL DRIVERS",
    key: "totalDrivers" as const,
    icon: Car,
    borderColor: "border-t-emerald-500",
    iconBg: "text-emerald-500/15",
    format: (v: number) => new Intl.NumberFormat("en-NG").format(v),
  },
  {
    label: "ACTIVE TRIPS",
    key: "activeTrips" as const,
    icon: MapPin,
    borderColor: "border-t-amber-500",
    iconBg: "text-amber-500/15",
    format: (v: number) => new Intl.NumberFormat("en-NG").format(v),
  },
  {
    label: "PENDING APPROVALS",
    key: "pendingDrivers" as const,
    icon: Clock,
    borderColor: "border-t-red-500",
    iconBg: "text-red-500/15",
    format: (v: number) => new Intl.NumberFormat("en-NG").format(v),
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
    format: (v: number) => new Intl.NumberFormat("en-NG").format(v),
  },
];

const kpiRoutes: Record<string, string> = {
  "TOTAL RIDERS": "/admin/users/riders",
  "TOTAL DRIVERS": "/admin/users/drivers",
  "ACTIVE TRIPS": "/admin/trips",
  "PENDING APPROVALS": "/admin/control/monitoring",
  "REVENUE": "/admin/finance/wallets",
  "COMPLETED TRIPS": "/admin/trips",
};

function getKpiTextSize(_value: string | number): string {
  return "";
}

export default function AdminControlCenter() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const attentionItems = [
    {
      label: "Pending Driver Approvals",
      count: stats?.pendingDrivers ?? 0,
      icon: Clock,
      route: "/admin/users/drivers",
    },
    {
      label: "Active Trips Requiring Monitor",
      count: stats?.activeTrips ?? 0,
      icon: MapPin,
      route: "/admin/trips",
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-10 admin-fade-in">
      <Breadcrumb data-testid="breadcrumb-nav">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="breadcrumb-current">Admin</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5" data-testid="overview-context-header">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800 dark:text-slate-100" data-testid="text-control-center-title">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8" data-testid="metrics-row">
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
            <Link key={kpi.label} href={kpiRoutes[kpi.label] || "/admin"}>
              <Card
                className={`rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 border-t-4 ${kpi.borderColor} relative overflow-visible hover:scale-[1.01] transition-all duration-200 ease-out cursor-pointer`}
                data-testid={`metric-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="pt-5 pb-4 px-4 min-w-0">
                  <div className="relative">
                    <KpiIcon className={`absolute -top-1 right-0 h-10 w-10 ${kpi.iconBg}`} />
                    <p className="text-[13px] font-medium opacity-70 tracking-wide text-slate-500 dark:text-slate-400 uppercase mb-2" data-testid={`label-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
                      {kpi.label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-10 w-20" />
                    ) : (
                      <p
                        className="font-extrabold text-slate-800 dark:text-slate-100 leading-tight truncate overflow-hidden whitespace-nowrap admin-kpi-number"
                        style={{ fontSize: "clamp(18px, 2.5vw, 26px)", animationDelay: `${index * 80}ms` }}
                        data-testid={`value-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {displayValue}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-8">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 mb-5">Action Zones</h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="action-zones">
          {sidebarSections.map((section) => {
            const meta = sectionMeta[section.label];
            const SectionIcon = meta?.icon || Activity;
            const sectionRoute = sectionRoutes[section.label] || section.items[0]?.route || "/admin/overview";

            return (
              <Link
                key={section.label}
                href={sectionRoute}
                className="block cursor-pointer"
                data-testid={`zone-link-${section.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Card
                  className={`hover-elevate rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 border-l-[3px] ${meta?.borderColor || ""} ${meta?.hoverGlow || ""} hover:scale-[1.01] hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 ease-out`}
                  data-testid={`zone-${section.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <CardHeader className="pb-3 gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta?.accentBg || "bg-muted"}`}>
                        <SectionIcon className={`h-5 w-5 ${meta?.accent || "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">{section.label}</CardTitle>
                        {meta?.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{meta.description}</p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-0.5">
                      {section.items.slice(0, 5).map((item) => (
                        <span
                          key={item.value}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                          data-testid={`link-${item.value}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(item.route);
                          }}
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </span>
                      ))}
                      {section.items.length > 5 && (
                        <span
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                          data-testid={`link-more-${section.label.toLowerCase().replace(/\s+/g, "-")}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(sectionRoute);
                          }}
                        >
                          <ArrowRight className="h-3 w-3 shrink-0" />
                          <span>+{section.items.length - 5} more</span>
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-8" data-testid="attention-section">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 mb-5">Attention Required</h2>
        {isLoading ? (
          <Card className="rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700">
            <CardContent className="pt-4 pb-4 px-4">
              <Skeleton className="h-5 w-48" />
            </CardContent>
          </Card>
        ) : attentionItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {attentionItems.map((item) => (
              <Link key={item.label} href={item.route} data-testid={`attention-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <Card className="hover-elevate rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 border-l-[3px] border-l-orange-400 hover:scale-[1.01] hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 ease-out cursor-pointer">
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
          <Card className="rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700" data-testid="no-attention-needed">
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
