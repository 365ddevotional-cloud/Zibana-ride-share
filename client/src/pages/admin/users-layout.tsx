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
  Car,
  Users,
  Briefcase,
  UserCheck,
  Shield,
  UserPlus,
  TestTube,
  BookOpen,
  Award,
  Ban,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";

const DriversPage = lazy(() => import("./admin-drivers-overview"));
const RidersPage = lazy(() => import("./admin-riders-overview"));
const DirectorsPage = lazy(() => import("./users-directors"));
const MyDriversPage = lazy(() => import("./users-my-drivers"));
const AdminManagementPage = lazy(() => import("./users-admin-management"));
const RoleAppointmentsPage = lazy(() => import("./users-role-appointments"));
const TrainingModePage = lazy(() => import("./users-training-mode"));
const TrainingCenterPage = lazy(() => import("./users-training-center"));
const RiderTrustPage = lazy(() => import("./users-rider-trust"));
const PairingBlocksPage = lazy(() => import("./users-pairing-blocks"));

interface SectionConfig {
  label: string;
  icon: LucideIcon;
  description: string;
}

const sectionConfig: Record<string, SectionConfig> = {
  drivers: {
    label: "Drivers",
    icon: Car,
    description: "Manage driver accounts, approvals, and compliance.",
  },
  riders: {
    label: "Riders",
    icon: Users,
    description: "View and manage all registered riders on the platform.",
  },
  directors: {
    label: "Directors",
    icon: Briefcase,
    description: "Director management, commissions, and governance.",
  },
  "my-drivers": {
    label: "My Drivers",
    icon: UserCheck,
    description: "Drivers assigned to your oversight and management.",
  },
  "admin-management": {
    label: "Admin Management",
    icon: Shield,
    description: "Admin user accounts, permissions, and access control.",
  },
  "role-appointments": {
    label: "Role Appointments",
    icon: UserPlus,
    description: "Assign and manage user roles across the platform.",
  },
  "training-mode": {
    label: "Training Mode",
    icon: TestTube,
    description: "Configure and monitor training mode for new users.",
  },
  "training-center": {
    label: "Training Center",
    icon: BookOpen,
    description: "Training materials, courses, and certification tracking.",
  },
  "rider-trust": {
    label: "Rider Trust",
    icon: Award,
    description: "Rider trust scores, loyalty tiers, and reputation management.",
  },
  "pairing-blocks": {
    label: "Pairing Blocks",
    icon: Ban,
    description: "Manage blocked pairings between riders and drivers.",
  },
};

const validSections = Object.keys(sectionConfig);

interface UsersLayoutProps {
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
    case "drivers":
      return (
        <Suspense fallback={<SectionFallback />}>
          <DriversPage />
        </Suspense>
      );
    case "riders":
      return (
        <Suspense fallback={<SectionFallback />}>
          <RidersPage />
        </Suspense>
      );
    case "directors":
      return (
        <Suspense fallback={<SectionFallback />}>
          <DirectorsPage />
        </Suspense>
      );
    case "my-drivers":
      return (
        <Suspense fallback={<SectionFallback />}>
          <MyDriversPage />
        </Suspense>
      );
    case "admin-management":
      return (
        <Suspense fallback={<SectionFallback />}>
          <AdminManagementPage />
        </Suspense>
      );
    case "role-appointments":
      return (
        <Suspense fallback={<SectionFallback />}>
          <RoleAppointmentsPage />
        </Suspense>
      );
    case "training-mode":
      return (
        <Suspense fallback={<SectionFallback />}>
          <TrainingModePage />
        </Suspense>
      );
    case "training-center":
      return (
        <Suspense fallback={<SectionFallback />}>
          <TrainingCenterPage />
        </Suspense>
      );
    case "rider-trust":
      return (
        <Suspense fallback={<SectionFallback />}>
          <RiderTrustPage />
        </Suspense>
      );
    case "pairing-blocks":
      return (
        <Suspense fallback={<SectionFallback />}>
          <PairingBlocksPage />
        </Suspense>
      );
    default:
      return (
        <Suspense fallback={<SectionFallback />}>
          <DriversPage />
        </Suspense>
      );
  }
}

export default function UsersLayout({ section }: UsersLayoutProps) {
  const [, navigate] = useLocation();
  const resolvedSection = validSections.includes(section) ? section : "drivers";
  const config = sectionConfig[resolvedSection];
  const SectionIcon = config.icon;

  return (
    <div className="space-y-6 admin-fade-in">
      <Breadcrumb data-testid="breadcrumb-users">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin" data-testid="breadcrumb-admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/users/drivers" data-testid="breadcrumb-users-link">Users & People</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {resolvedSection !== "drivers" && (
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
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100" data-testid="text-users-section-title">
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
                onClick={() => navigate(`/admin/users/${key}`)}
                data-testid={`tab-users-${key}`}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {cfg.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div data-testid={`users-section-${resolvedSection}`}>
        {renderSection(resolvedSection)}
      </div>
    </div>
  );
}
