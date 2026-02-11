import { Link } from "wouter";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { AlertTriangle } from "lucide-react";
import AdminSectionContent from "./admin-section-content";

interface AdminGroupLayoutProps {
  section: string;
  groupLabel: string;
  groupRoute: string;
  items: { value: string; label: string; icon: React.ComponentType<any>; route: string }[];
}

const activeClass =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap bg-blue-600 text-white";
const inactiveClass =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";

export default function AdminGroupLayout({ section, groupLabel, groupRoute, items }: AdminGroupLayoutProps) {
  const currentItem = items.find((item) => item.value === section || item.route.split("/").pop() === section);

  if (!currentItem) {
    return (
      <div className="space-y-6 admin-fade-in">
        <Breadcrumb data-testid="breadcrumb-group">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/admin/control/overview" data-testid="breadcrumb-admin">Admin</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={groupRoute} data-testid="breadcrumb-group-link">{groupLabel}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="section-not-found">
          <AlertTriangle className="h-7 w-7 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-section-not-found">Section Not Found</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">This section doesn't exist or may have been moved.</p>
          <Link href={groupRoute} className="text-sm text-primary underline" data-testid="link-return-group">Return to {groupLabel}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 admin-fade-in">
      <Breadcrumb data-testid="breadcrumb-group">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/control/overview" data-testid="breadcrumb-admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={groupRoute} data-testid="breadcrumb-group-link">{groupLabel}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="breadcrumb-current">{currentItem.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div
        className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700 pb-3 mb-6"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        data-testid="tab-bar"
      >
        <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
        {items.map((item) => {
          const isActive = item.value === section || item.route.split("/").pop() === section;
          return (
            <Link href={item.route} key={item.value}>
              <span className={isActive ? activeClass : inactiveClass} data-testid={`tab-${item.value}`}>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div data-testid={`group-section-${currentItem.value}`}>
        <AdminSectionContent
          section={currentItem.value}
          parentGroup={groupLabel}
          parentRoute={groupRoute}
        />
      </div>
    </div>
  );
}
