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

const sectionDescriptions: Record<string, string> = {
  "Control Center": "System health, monitoring, and launch readiness at a glance.",
  "Users & People": "Manage drivers, riders, directors, and admin team members.",
  "Trips & Operations": "Oversee trips, reservations, ride classes, and operational settings.",
  "Finance & Wallets": "Payouts, wallets, refunds, settlements, and financial records.",
  "Ratings & Support": "Ratings, disputes, inbox, and customer support tools.",
  "Safety & Compliance": "Fraud detection, safety incidents, insurance, and compliance logs.",
  "Growth & Intelligence": "Reports, analytics, growth metrics, and ZIBRA insights.",
};

interface AdminSectionLandingProps {
  section: string;
}

export default function AdminSectionLanding({ section }: AdminSectionLandingProps) {
  const matchedGroup = sidebarSections.find((group) =>
    group.items.some((item) => item.value === section)
  );

  if (!matchedGroup) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold" data-testid="text-section-not-found">Section Not Found</h1>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          The section you're looking for doesn't exist or may have been moved.
        </p>
        <Link
          href="/admin/overview"
          className="text-sm text-primary underline"
          data-testid="link-back-overview"
        >
          Return to Overview
        </Link>
      </div>
    );
  }

  const description = sectionDescriptions[matchedGroup.label] || "";

  return (
    <div className="space-y-6">
      <Breadcrumb data-testid="breadcrumb-nav">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/overview" data-testid="breadcrumb-admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="breadcrumb-current">{matchedGroup.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="border-b pb-4" data-testid="section-context-header">
        <h1 className="text-2xl font-bold" data-testid="text-section-title">{matchedGroup.label}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {matchedGroup.items.length === 0 ? (
        <div className="py-12 text-center" data-testid="empty-section">
          <p className="text-sm text-muted-foreground">No items available in this section yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matchedGroup.items.map((item) => (
            <Link key={item.value} href={item.route} data-testid={`card-${item.value}`}>
              <Card className={`hover-elevate transition-colors ${item.value === section ? "border-primary" : ""}`}>
                <CardContent className="flex items-center gap-3 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
