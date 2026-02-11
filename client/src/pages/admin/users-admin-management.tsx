import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import {
  Shield,
  UserPlus,
  ArrowRight,
  Info,
} from "lucide-react";

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function UsersAdminManagementPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {user && (
        <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="current-admin-card">
          <CardHeader className="pb-3 gap-2">
            <CardTitle className="text-base text-slate-800 dark:text-slate-100">Current Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="text-sm">
                  {getInitials(user.firstName || user.email || undefined)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate" data-testid="text-admin-name">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email || "Admin User"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate" data-testid="text-admin-email">
                  {user.email || "--"}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="secondary" className="border-0 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" data-testid="badge-admin-role">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="admin-role-info-card">
        <CardContent className="pt-6 pb-6 px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1" data-testid="text-role-info-heading">
                Admin accounts are managed through Role Appointments
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                To add, modify, or revoke admin access, use the Role Appointments page. This ensures all
                role changes are tracked and auditable across the platform.
              </p>
              <Link href="/admin/users/role-appointments">
                <Button variant="default" size="sm" data-testid="button-go-role-appointments">
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Go to Role Appointments
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="admin-capabilities-card">
        <CardHeader className="pb-3 gap-2">
          <CardTitle className="text-base text-slate-800 dark:text-slate-100">Admin Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {[
              { label: "User Management", desc: "Create, suspend, and manage all platform user accounts." },
              { label: "Driver Approvals", desc: "Review and approve driver registrations and documents." },
              { label: "Director Oversight", desc: "Manage director assignments, commissions, and governance." },
              { label: "Platform Operations", desc: "Monitor rides, disputes, payments, and system health." },
              { label: "Role Assignments", desc: "Assign and revoke roles through the Role Appointments system." },
            ].map((item) => (
              <li key={item.label} className="flex items-start gap-3" data-testid={`capability-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <Shield className="h-4 w-4 mt-0.5 shrink-0 text-slate-500 dark:text-slate-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
