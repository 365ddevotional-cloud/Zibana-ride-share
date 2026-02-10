import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { sidebarSections } from "./admin-sidebar";

interface AdminSectionLandingProps {
  section: string;
}

export default function AdminSectionLanding({ section }: AdminSectionLandingProps) {
  const matchedGroup = sidebarSections.find((group) =>
    group.items.some((item) => item.value === section)
  );

  if (!matchedGroup) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold" data-testid="text-section-not-found">Section Not Found</h1>
        <p className="text-muted-foreground">
          The section you're looking for doesn't exist.{" "}
          <Link href="/admin/overview" className="text-primary underline" data-testid="link-back-overview">
            Return to Overview
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-section-title">{matchedGroup.label}</h1>
        <p className="text-muted-foreground">{matchedGroup.items.length} sections available</p>
      </div>

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
    </div>
  );
}
