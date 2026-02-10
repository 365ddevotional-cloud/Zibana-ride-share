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

const sectionMeta: Record<string, { icon: LucideIcon; accent: string; accentBg: string; description: string }> = {
  "Control Center": {
    icon: Activity,
    accent: "text-orange-600 dark:text-orange-400",
    accentBg: "bg-orange-100 dark:bg-orange-900/30",
    description: "Monitoring, health alerts, and launch readiness",
  },
  "Users & People": {
    icon: Users,
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-100 dark:bg-blue-900/30",
    description: "Drivers, riders, directors, and team management",
  },
  "Trips & Operations": {
    icon: MapPin,
    accent: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-100 dark:bg-emerald-900/30",
    description: "Active trips, reservations, ride classes, and fees",
  },
  "Finance & Wallets": {
    icon: Wallet,
    accent: "text-amber-600 dark:text-amber-400",
    accentBg: "bg-amber-100 dark:bg-amber-900/30",
    description: "Payouts, wallets, settlements, and tax documents",
  },
  "Ratings & Support": {
    icon: BarChart3,
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-100 dark:bg-violet-900/30",
    description: "Ratings, disputes, inbox, and help center",
  },
  "Safety & Compliance": {
    icon: Shield,
    accent: "text-red-600 dark:text-red-400",
    accentBg: "bg-red-100 dark:bg-red-900/30",
    description: "Fraud detection, incidents, insurance, and compliance",
  },
  "Growth & Intelligence": {
    icon: TrendingUp,
    accent: "text-teal-600 dark:text-teal-400",
    accentBg: "bg-teal-100 dark:bg-teal-900/30",
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

export default function AdminControlCenter() {
  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const metricCards = [
    {
      label: "Total Riders",
      value: stats?.totalRiders ?? 0,
      icon: Users,
      accent: "text-violet-600 dark:text-violet-400",
      route: "/admin/riders",
    },
    {
      label: "Total Drivers",
      value: stats?.totalDrivers ?? 0,
      icon: Car,
      accent: "text-blue-600 dark:text-blue-400",
      route: "/admin/drivers",
    },
    {
      label: "Active Trips",
      value: stats?.activeTrips ?? 0,
      icon: MapPin,
      accent: "text-emerald-600 dark:text-emerald-400",
      route: "/admin/trips",
    },
    {
      label: "Pending Approvals",
      value: stats?.pendingDrivers ?? 0,
      icon: Clock,
      accent: "text-orange-600 dark:text-orange-400",
      route: "/admin/drivers",
    },
    {
      label: "Revenue",
      value: stats ? formatCurrency(stats.totalFares) : "\u20A60",
      icon: Banknote,
      accent: "text-amber-600 dark:text-amber-400",
      route: "/admin/wallets",
    },
    {
      label: "Completed Trips",
      value: stats?.completedTrips ?? 0,
      icon: UserCheck,
      accent: "text-teal-600 dark:text-teal-400",
      route: "/admin/trips",
    },
  ];

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

      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4" data-testid="overview-context-header">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-control-center-title">Admin Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">System-wide operational snapshot</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground" data-testid="text-current-date">{formatDate()}</span>
          <Badge variant="outline" className="text-xs" data-testid="badge-environment">
            {import.meta.env.MODE === "production" ? "Production" : "Development"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="metrics-row">
        {metricCards.map((metric) => (
          <Link key={metric.label} href={metric.route} data-testid={`metric-${metric.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <Card className="hover-elevate">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center gap-2 mb-3">
                  <metric.icon className={`h-4 w-4 shrink-0 ${metric.accent}`} />
                  <span className="text-xs text-muted-foreground truncate">{metric.label}</span>
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : isError ? (
                  <p className="text-lg font-semibold text-muted-foreground">--</p>
                ) : (
                  <p className="text-xl font-bold" data-testid={`value-${metric.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {metric.value}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Action Zones</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="action-zones">
          {sidebarSections.map((section) => {
            const meta = sectionMeta[section.label];
            const SectionIcon = meta?.icon || Activity;
            const firstRoute = section.items[0]?.route || "/admin/overview";

            return (
              <Card key={section.label} className="hover-elevate" data-testid={`zone-${section.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardHeader className="pb-2 gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta?.accentBg || "bg-muted"}`}>
                      <SectionIcon className={`h-4 w-4 ${meta?.accent || "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm">{section.label}</CardTitle>
                      {meta?.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta.description}</p>
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
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover-elevate transition-colors"
                        data-testid={`link-${item.value}`}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                    {section.items.length > 5 && (
                      <Link
                        href={firstRoute}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover-elevate transition-colors"
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
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Attention Required</h2>
        {isLoading ? (
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <Skeleton className="h-5 w-48" />
            </CardContent>
          </Card>
        ) : attentionItems.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {attentionItems.map((item) => (
              <Link key={item.label} href={item.route} data-testid={`attention-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <Card className="hover-elevate border-orange-200 dark:border-orange-800/40">
                  <CardContent className="flex items-center gap-3 pt-4 pb-4 px-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <item.icon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <Badge variant="secondary" className="text-xs mt-0.5">
                        {item.count}
                      </Badge>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card data-testid="no-attention-needed">
            <CardContent className="flex items-center gap-3 pt-4 pb-4 px-4">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              <p className="text-sm text-muted-foreground">No pending issues. All systems operational.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
