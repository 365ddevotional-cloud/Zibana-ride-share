import { lazy, Suspense } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { sidebarSections } from "./admin-sidebar";
import { AlertTriangle } from "lucide-react";
import AdminSectionContent from "./admin-section-content";

const AdminDriversOverview = lazy(() => import("./admin-drivers-overview"));
const AdminRidersOverview = lazy(() => import("./admin-riders-overview"));

const dedicatedPages: Record<string, React.ComponentType> = {
  drivers: AdminDriversOverview,
  riders: AdminRidersOverview,
};

const sectionDescriptions: Record<string, string> = {
  "Control Center": "System health, monitoring, and launch readiness at a glance.",
  "Users & People": "Manage drivers, riders, directors, and admin team members.",
  "Trips & Operations": "Oversee trips, reservations, ride classes, and operational settings.",
  "Finance & Wallets": "Payouts, wallets, refunds, settlements, and financial records.",
  "Ratings & Support": "Ratings, disputes, inbox, and customer support tools.",
  "Safety & Compliance": "Fraud detection, safety incidents, insurance, and compliance logs.",
  "Growth & Intelligence": "Reports, analytics, growth metrics, and ZIBRA insights.",
};

const sectionAccents: Record<string, string> = {
  "Control Center": "bg-blue-500",
  "Users & People": "bg-indigo-500",
  "Trips & Operations": "bg-emerald-500",
  "Finance & Wallets": "bg-amber-500",
  "Ratings & Support": "bg-violet-500",
  "Safety & Compliance": "bg-red-500",
  "Growth & Intelligence": "bg-teal-500",
};

interface AdminSectionLandingProps {
  section: string;
}

export default function AdminSectionLanding({ section }: AdminSectionLandingProps) {
  const DedicatedPage = dedicatedPages[section];
  if (DedicatedPage) {
    return (
      <Suspense fallback={<div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading...</div>}>
        <DedicatedPage />
      </Suspense>
    );
  }

  const matchedItem = sidebarSections.flatMap(g => g.items.map(item => ({ ...item, groupLabel: g.label, groupRoute: g.items[0]?.route || "/admin" }))).find(item => item.value === section);

  if (matchedItem) {
    return (
      <AdminSectionContent
        section={section}
        parentGroup={matchedItem.groupLabel}
        parentRoute={matchedItem.groupRoute}
      />
    );
  }

  const matchedGroup = sidebarSections.find((group) =>
    group.items.some((item) => item.value === section)
  );

  if (!matchedGroup) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 admin-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-section-not-found">Section Not Found</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
          The section you're looking for doesn't exist or may have been moved.
        </p>
        <Link
          href="/admin/control/overview"
          className="text-sm text-primary underline"
          data-testid="link-back-overview"
        >
          Return to Overview
        </Link>
      </div>
    );
  }

  const description = sectionDescriptions[matchedGroup.label] || "";
  const accentDot = sectionAccents[matchedGroup.label] || "bg-slate-500";

  return (
    <div className="space-y-8 admin-fade-in">
      <Breadcrumb data-testid="breadcrumb-nav">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/control/overview" data-testid="breadcrumb-admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="breadcrumb-current">{matchedGroup.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="border-b border-slate-200 dark:border-slate-700 pb-5" data-testid="section-context-header">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-7 rounded-full ${accentDot}`} />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100" data-testid="text-section-title">{matchedGroup.label}</h1>
        </div>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 ml-[1.125rem]">{description}</p>
        )}
      </div>

      {matchedGroup.items.length === 0 ? (
        <div className="py-12 text-center" data-testid="empty-section">
          <p className="text-sm text-slate-500 dark:text-slate-400">No items available in this section yet.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {matchedGroup.items.map((item) => (
            <Link key={item.value} href={item.route} data-testid={`card-${item.value}`}>
              <Card className={`hover-elevate rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 hover:scale-[1.01] hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 ease-out cursor-pointer ${item.value === section ? "border-primary" : ""}`}>
                <CardContent className="flex items-center gap-4 py-5 px-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <item.icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
