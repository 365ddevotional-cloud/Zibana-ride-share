import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, Bell, CheckCircle, X, Activity, Shield } from "lucide-react";
import type { PerformanceAlert } from "@shared/schema";

interface HealthAlertsPanelProps {
  viewMode: "director" | "admin";
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge variant="destructive" data-testid="badge-severity-critical">Critical</Badge>;
    case "warning":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" data-testid="badge-severity-warning">Warning</Badge>;
    default:
      return <Badge variant="default" data-testid="badge-severity-info">Info</Badge>;
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-destructive";
    case "warning":
      return "bg-orange-500";
    default:
      return "bg-primary";
  }
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <Shield className="h-4 w-4 text-destructive" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default:
      return <Activity className="h-4 w-4 text-primary" />;
  }
}

export function HealthAlertsPanel({ viewMode }: HealthAlertsPanelProps) {
  const { toast } = useToast();
  const endpoint = viewMode === "admin" ? "/api/alerts/admin" : "/api/alerts/my";

  const { data: alerts, isLoading } = useQuery<PerformanceAlert[]>({
    queryKey: [endpoint],
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/alerts/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: "Alert marked as read" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/alerts/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: "Alert dismissed" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const activeAlerts = alerts || [];
  const unreadCount = activeAlerts.filter(a => !a.isRead).length;

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="health-alerts-loading">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="health-alerts-panel">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-health-alerts-title">
            <Bell className="inline-block mr-2 h-5 w-5" />
            {viewMode === "admin" ? "System Health Alerts" : "Performance Alerts"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {viewMode === "admin" ? "Platform-wide health and abuse detection alerts" : "Alerts related to your cell performance and driver activity"}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2" data-testid="stat-active-alerts">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Active:</span>
              <span className="font-semibold">{activeAlerts.length}</span>
            </div>
            <div className="flex items-center gap-2" data-testid="stat-unread-alerts">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Unread:</span>
              <span className="font-semibold">{unreadCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeAlerts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium" data-testid="text-no-alerts">
              No active alerts
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Everything looks healthy. Alerts will appear here when attention is needed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeAlerts.map((alert) => (
            <Card key={alert.id} data-testid={`card-alert-${alert.id}`} className={alert.isRead ? "opacity-75" : ""}>
              <CardContent className="p-0">
                <div className="flex">
                  <div className={`w-1.5 rounded-l-md ${getSeverityColor(alert.severity)} shrink-0`} />
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSeverityIcon(alert.severity)}
                        <h3 className="font-medium text-foreground" data-testid={`text-alert-title-${alert.id}`}>
                          {alert.title}
                        </h3>
                        {getSeverityBadge(alert.severity)}
                        {!alert.isRead && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-unread-${alert.id}`}>New</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0" data-testid={`text-alert-time-${alert.id}`}>
                        {timeAgo(alert.createdAt as unknown as string)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2" data-testid={`text-alert-message-${alert.id}`}>
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {!alert.isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markReadMutation.mutate(alert.id)}
                          disabled={markReadMutation.isPending}
                          data-testid={`button-mark-read-${alert.id}`}
                        >
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                          Mark Read
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dismissMutation.mutate(alert.id)}
                        disabled={dismissMutation.isPending}
                        data-testid={`button-dismiss-${alert.id}`}
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
