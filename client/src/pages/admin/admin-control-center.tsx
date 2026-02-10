import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
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
} from "lucide-react";

const quickAccessItems = [
  { label: "Drivers", icon: Car, route: "/admin/drivers", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { label: "Riders", icon: Users, route: "/admin/riders", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-900/30" },
  { label: "Trips", icon: MapPin, route: "/admin/trips", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  { label: "Wallets", icon: Wallet, route: "/admin/wallets", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { label: "Fraud", icon: ShieldAlert, route: "/admin/fraud", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
  { label: "Safety", icon: Shield, route: "/admin/safety", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  { label: "Reports", icon: BarChart3, route: "/admin/reports", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-100 dark:bg-teal-900/30" },
  { label: "Monitoring", icon: Activity, route: "/admin/monitoring", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-100 dark:bg-pink-900/30" },
];

export default function AdminControlCenter() {
  return (
    <div className="space-y-8">
      <Breadcrumb data-testid="breadcrumb-nav">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="breadcrumb-current">Admin</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="border-b pb-4" data-testid="overview-context-header">
        <h1 className="text-2xl font-bold" data-testid="text-control-center-title">Admin Control Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Central hub for managing all ZIBA operations, teams, and platform health.</p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {quickAccessItems.map((item) => (
            <Link
              key={item.label}
              href={item.route}
              className="flex flex-col items-center gap-2 rounded-md p-3 hover-elevate transition-colors"
              data-testid={`quick-${item.label.toLowerCase()}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
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
