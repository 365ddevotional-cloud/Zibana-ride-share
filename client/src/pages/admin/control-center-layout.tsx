import { lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  LayoutDashboard,
  Activity,
  HeartPulse,
  Rocket,
  CheckSquare,
  TestTube,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";

const ControlOverviewPage = lazy(() => import("./control-overview"));
const ControlMonitoringPage = lazy(() => import("./control-monitoring"));
const QaMonitorPanel = lazy(() => import("@/components/admin/qa-monitor-panel"));
const SystemStabilityPanel = lazy(() => import("@/components/admin/system-stability-panel"));

import { HealthAlertsPanel } from "@/components/admin/health-alerts-panel";
import { LaunchReadinessPanel } from "@/components/admin/launch-readiness-panel";
import { OperationalReadinessPanel } from "@/components/admin/operational-readiness-panel";

interface SectionConfig {
  label: string;
  icon: LucideIcon;
  description: string;
}

const sectionConfig: Record<string, SectionConfig> = {
  overview: {
    label: "Overview",
    icon: LayoutDashboard,
    description: "System health, monitoring, and launch readiness at a glance.",
  },
  monitoring: {
    label: "Monitoring",
    icon: Activity,
    description: "Active trips, driver status, and real-time operational data.",
  },
  alerts: {
    label: "Health Alerts",
    icon: HeartPulse,
    description: "System alerts, performance warnings, and critical notifications.",
  },
  launch: {
    label: "Launch Readiness",
    icon: Rocket,
    description: "Pre-launch checklists, country readiness, and kill switches.",
  },
  ops: {
    label: "Ops Readiness",
    icon: CheckSquare,
    description: "Operational playbooks, readiness checks, and escalation procedures.",
  },
  "qa-monitor": {
    label: "QA Monitor",
    icon: TestTube,
    description: "Quality assurance monitoring, error tracking, and session logging.",
  },
  stability: {
    label: "System Stability",
    icon: HeartPulse,
    description: "Real-time system health, error rates, and stability indicators.",
  },
};

const validSections = Object.keys(sectionConfig);

interface ControlCenterLayoutProps {
  section: string;
}

function SectionFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function renderSection(section: string) {
  switch (section) {
    case "overview":
      return (
        <Suspense fallback={<SectionFallback />}>
          <ControlOverviewPage />
        </Suspense>
      );
    case "monitoring":
      return (
        <Suspense fallback={<SectionFallback />}>
          <ControlMonitoringPage />
        </Suspense>
      );
    case "alerts":
      return <HealthAlertsPanel viewMode="admin" />;
    case "launch":
      return <LaunchReadinessPanel />;
    case "ops":
      return <OperationalReadinessPanel />;
    case "qa-monitor":
      return (
        <Suspense fallback={<SectionFallback />}>
          <QaMonitorPanel isSuperAdmin={true} />
        </Suspense>
      );
    case "stability":
      return (
        <Suspense fallback={<SectionFallback />}>
          <SystemStabilityPanel />
        </Suspense>
      );
    default:
      return (
        <Suspense fallback={<SectionFallback />}>
          <ControlOverviewPage />
        </Suspense>
      );
  }
}

export default function ControlCenterLayout({ section }: ControlCenterLayoutProps) {
  const [, navigate] = useLocation();
  const resolvedSection = validSections.includes(section) ? section : "overview";
  const config = sectionConfig[resolvedSection];
  const SectionIcon = config.icon;

  return (
    <div className="space-y-6 admin-fade-in">
      <Breadcrumb data-testid="breadcrumb-control-center">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin" data-testid="breadcrumb-admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/control/overview" data-testid="breadcrumb-control-center-link">Control Center</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {resolvedSection !== "overview" && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage data-testid="breadcrumb-section">{config.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            data-testid="button-back-admin"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <SectionIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100" data-testid="text-control-section-title">
              {config.label}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{config.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {validSections.map((key) => {
            const cfg = sectionConfig[key];
            const Icon = cfg.icon;
            const isActive = key === resolvedSection;
            return (
              <Button
                key={key}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(`/admin/control/${key}`)}
                data-testid={`tab-control-${key}`}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {cfg.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div data-testid={`control-section-${resolvedSection}`}>
        {renderSection(resolvedSection)}
      </div>
    </div>
  );
}
