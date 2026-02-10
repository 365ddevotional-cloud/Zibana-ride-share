import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sidebarSections } from "./admin-sidebar";

export default function AdminControlCenter() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-control-center-title">Admin Control Center</h1>
        <p className="text-muted-foreground">Navigate to any section of the admin dashboard</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sidebarSections.map((section) => (
          <Card key={section.label} data-testid={`card-section-${section.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{section.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-1">
                {section.items.map((item) => (
                  <Link
                    key={item.value}
                    href={item.route}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover-elevate transition-colors"
                    data-testid={`link-${item.value}`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
