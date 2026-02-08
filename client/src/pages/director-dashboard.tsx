import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield, Clock, AlertTriangle, Activity, UserPlus, ChevronRight, Calendar, Bell, X, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type DashboardData = {
  profile: {
    directorType: string;
    status: string;
    lifecycleStatus: string;
    fullName: string;
    [key: string]: any;
  };
  lifespan: {
    lifespanStartDate: string | null;
    lifespanEndDate: string | null;
    daysRemaining: number | null;
  };
  cells: Array<{
    cellNumber: number;
    cellName: string;
    driverCount: number;
    maxDrivers: number;
  }>;
  metrics: {
    totalDrivers: number;
    activeDriversToday: number;
    commissionableDrivers: number;
    suspendedDrivers: number;
  };
  staff: Array<{
    id: string;
    staffUserId: string;
    staffRole: string;
    status: string;
    [key: string]: any;
  }>;
  coaching: Array<{
    id: string;
    coachingType: string;
    message: string;
    severity: string;
    isDismissed: boolean;
  }>;
  actionLogs: Array<{
    actorId: string;
    action: string;
    targetType: string;
    createdAt: string;
    [key: string]: any;
  }>;
};

function severityVariant(severity: string): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "critical":
    case "error":
      return "destructive";
    case "warning":
      return "outline";
    default:
      return "secondary";
  }
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
    case "approved":
      return "default";
    case "suspended":
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="director-dashboard-loading">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
    </div>
  );
}

export default function DirectorDashboard() {
  const { toast } = useToast();

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/director/dashboard/full"],
  });

  const dismissMutation = useMutation({
    mutationFn: async (coachingId: string) => {
      await apiRequest("POST", `/api/director/coaching/${coachingId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard/full"] });
      toast({ title: "Dismissed", description: "Coaching alert dismissed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/director/coaching/generate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard/full"] });
      toast({ title: "Coaching Generated", description: "New coaching insights have been generated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!dashboard) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto" data-testid="director-dashboard-empty">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2" data-testid="text-no-data">No Dashboard Data</h2>
            <p className="text-muted-foreground text-sm">Unable to load director dashboard data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, lifespan, cells, metrics, staff, coaching, actionLogs } = dashboard;
  const activeCoaching = coaching?.filter((c) => !c.isDismissed) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="director-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Director Dashboard</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-director-name">
            {profile?.fullName || "Director"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-coaching"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
          Generate Coaching
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card data-testid="card-profile-type">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Director Type</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold capitalize" data-testid="text-director-type">
              {profile?.directorType || "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-profile-status">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={statusVariant(profile?.status)} data-testid="badge-status">
              {profile?.status || "N/A"}
            </Badge>
          </CardContent>
        </Card>

        <Card data-testid="card-lifecycle-status">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifecycle Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={statusVariant(profile?.lifecycleStatus)} data-testid="badge-lifecycle-status">
              {profile?.lifecycleStatus || "N/A"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {lifespan && (
        <Card data-testid="card-lifespan">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contract Lifespan</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="text-sm font-semibold" data-testid="text-lifespan-start">
                  {formatDate(lifespan.lifespanStartDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="text-sm font-semibold" data-testid="text-lifespan-end">
                  {formatDate(lifespan.lifespanEndDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Days Remaining</p>
                <p
                  className={`text-2xl font-bold ${
                    lifespan.daysRemaining !== null && lifespan.daysRemaining <= 30
                      ? "text-destructive"
                      : lifespan.daysRemaining !== null && lifespan.daysRemaining <= 90
                        ? "text-yellow-600 dark:text-yellow-400"
                        : ""
                  }`}
                  data-testid="text-days-remaining"
                >
                  {lifespan.daysRemaining !== null ? lifespan.daysRemaining : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-drivers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-drivers">
              {metrics?.totalDrivers ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-active-drivers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-drivers">
              {metrics?.activeDriversToday ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-commissionable-drivers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissionable</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-commissionable-drivers">
              {metrics?.commissionableDrivers ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-suspended-drivers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-suspended-drivers">
              {metrics?.suspendedDrivers ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {cells && cells.length > 0 && (
        <Card data-testid="card-cells">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cell Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={String(cells[0]?.cellNumber ?? 1)} data-testid="tabs-cells">
              <TabsList data-testid="tabs-list-cells">
                {cells.map((cell) => (
                  <TabsTrigger
                    key={cell.cellNumber}
                    value={String(cell.cellNumber)}
                    data-testid={`tab-cell-${cell.cellNumber}`}
                  >
                    {cell.cellName}
                  </TabsTrigger>
                ))}
              </TabsList>
              {cells.map((cell) => (
                <TabsContent key={cell.cellNumber} value={String(cell.cellNumber)}>
                  <div className="flex flex-wrap items-center gap-6 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Drivers</p>
                      <p className="text-2xl font-bold" data-testid={`text-cell-${cell.cellNumber}-drivers`}>
                        {cell.driverCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Max Capacity</p>
                      <p className="text-2xl font-bold text-muted-foreground" data-testid={`text-cell-${cell.cellNumber}-max`}>
                        {cell.maxDrivers}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Utilization</p>
                      <div className="w-32 h-2 bg-muted rounded-full mt-1">
                        <div
                          className="h-2 bg-primary rounded-full"
                          style={{ width: `${Math.min((cell.driverCount / cell.maxDrivers) * 100, 100)}%` }}
                          data-testid={`bar-cell-${cell.cellNumber}-utilization`}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {staff && staff.length > 0 && (
        <Card data-testid="card-staff">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0"
                  data-testid={`staff-row-${member.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium" data-testid={`text-staff-id-${member.id}`}>
                      {member.staffUserId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" data-testid={`badge-staff-role-${member.id}`}>
                      {member.staffRole}
                    </Badge>
                    <Badge variant={statusVariant(member.status)} data-testid={`badge-staff-status-${member.id}`}>
                      {member.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-coaching">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Coaching Alerts
          </CardTitle>
          {activeCoaching.length > 0 && (
            <Badge variant="outline" data-testid="badge-coaching-count">{activeCoaching.length}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {activeCoaching.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-coaching">
              No active coaching alerts.
            </p>
          ) : (
            <div className="space-y-3">
              {activeCoaching.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0"
                  data-testid={`coaching-row-${item.id}`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={severityVariant(item.severity)} data-testid={`badge-coaching-severity-${item.id}`}>
                          {item.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize" data-testid={`text-coaching-type-${item.id}`}>
                          {item.coachingType.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm" data-testid={`text-coaching-message-${item.id}`}>
                        {item.message}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => dismissMutation.mutate(item.id)}
                    disabled={dismissMutation.isPending}
                    data-testid={`button-dismiss-coaching-${item.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {actionLogs && actionLogs.length > 0 && (
        <Card data-testid="card-action-logs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ChevronRight className="h-4 w-4" />
              Recent Action Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {actionLogs.map((log, index) => (
                <div
                  key={`${log.actorId}-${log.createdAt}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-border last:border-0"
                  data-testid={`action-log-row-${index}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate" data-testid={`text-log-action-${index}`}>
                      {log.action}
                    </span>
                    {log.targetType && (
                      <Badge variant="secondary" data-testid={`badge-log-target-${index}`}>
                        {log.targetType}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0" data-testid={`text-log-date-${index}`}>
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
