import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ShieldAlert,
  AlertTriangle,
  Ban,
  CheckCircle,
  Eye,
  Clock,
  FileText,
} from "lucide-react";

interface Incident {
  id: string;
  reporterRole: string;
  incidentType: string;
  severity: string;
  status: string;
  description?: string;
  reporterId?: string;
  reportedUserId?: string;
  tripId?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Suspension {
  id: string;
  userId: string;
  suspensionType: string;
  reason: string;
  expiresAt: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  targetUserId?: string;
  incidentId?: string;
  details?: string;
  createdAt: string;
}

function severityVariant(severity: string): "default" | "secondary" | "outline" | "destructive" {
  switch (severity) {
    case "CRITICAL":
      return "destructive";
    default:
      return "secondary";
  }
}

function severityClassName(severity: string): string {
  switch (severity) {
    case "LOW":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "HIGH":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
    case "CRITICAL":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default:
      return "";
  }
}

function statusClassName(status: string): string {
  switch (status) {
    case "OPEN":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "UNDER_REVIEW":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "RESOLVED":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    case "DISMISSED":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    default:
      return "";
  }
}

export function SafetyPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"incidents" | "suspensions" | "audit">("incidents");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [actionDialog, setActionDialog] = useState<{ type: string; incidentId: string } | null>(null);
  const [liftDialog, setLiftDialog] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState("");

  const { data: incidents, isLoading: incidentsLoading } = useQuery<Incident[]>({
    queryKey: ["/api/admin/safety/incidents"],
  });

  const { data: suspensions, isLoading: suspensionsLoading } = useQuery<Suspension[]>({
    queryKey: ["/api/admin/safety/suspensions"],
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/safety/audit-logs"],
  });

  const reviewMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/admin/safety/incident/${id}/review`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/safety/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/safety/audit-logs"] });
      toast({ title: "Incident marked as under review" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest("POST", `/api/admin/safety/incident/${id}/approve`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/safety/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/safety/audit-logs"] });
      setActionDialog(null);
      setActionReason("");
      toast({ title: "Incident approved" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const dismissMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest("POST", `/api/admin/safety/incident/${id}/dismiss`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/safety/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/safety/audit-logs"] });
      setActionDialog(null);
      setActionReason("");
      toast({ title: "Incident dismissed" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const escalateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest("POST", `/api/admin/safety/incident/${id}/escalate`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/safety/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/safety/audit-logs"] });
      setActionDialog(null);
      setActionReason("");
      toast({ title: "Incident escalated" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const liftSuspensionMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest("POST", `/api/admin/safety/suspension/${id}/lift`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/safety/suspensions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/safety/audit-logs"] });
      setLiftDialog(null);
      setActionReason("");
      toast({ title: "Suspension lifted" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleActionSubmit = () => {
    if (!actionDialog || !actionReason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    const { type, incidentId } = actionDialog;
    if (type === "approve") {
      approveMutation.mutate({ id: incidentId, reason: actionReason });
    } else if (type === "dismiss") {
      dismissMutation.mutate({ id: incidentId, reason: actionReason });
    } else if (type === "escalate") {
      escalateMutation.mutate({ id: incidentId, reason: actionReason });
    }
  };

  const handleLiftSubmit = () => {
    if (!liftDialog || !actionReason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    liftSuspensionMutation.mutate({ id: liftDialog, reason: actionReason });
  };

  const filteredIncidents = (incidents || []).filter((incident) => {
    if (statusFilter !== "ALL" && incident.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6" data-testid="safety-panel">
      <div>
        <h2 className="text-xl font-semibold text-foreground" data-testid="text-safety-title">
          Safety Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage safety incidents, suspensions, and audit trail
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={activeTab === "incidents" ? "default" : "outline"}
          onClick={() => setActiveTab("incidents")}
          data-testid="tab-incidents"
        >
          <ShieldAlert className="mr-1.5 h-4 w-4" />
          Incidents
        </Button>
        <Button
          variant={activeTab === "suspensions" ? "default" : "outline"}
          onClick={() => setActiveTab("suspensions")}
          data-testid="tab-suspensions"
        >
          <Ban className="mr-1.5 h-4 w-4" />
          Suspensions
        </Button>
        <Button
          variant={activeTab === "audit" ? "default" : "outline"}
          onClick={() => setActiveTab("audit")}
          data-testid="tab-audit-log"
        >
          <FileText className="mr-1.5 h-4 w-4" />
          Audit Log
        </Button>
      </div>

      {activeTab === "incidents" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg" data-testid="text-incidents-title">
              Safety Incidents
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {incidentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !filteredIncidents.length ? (
              <div className="text-center py-8" data-testid="text-no-incidents">
                <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No incidents found</p>
              </div>
            ) : (
              <Table data-testid="table-incidents">
                <TableHeader>
                  <TableRow>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.map((incident) => (
                    <TableRow key={incident.id} data-testid={`incident-row-${incident.id}`}>
                      <TableCell data-testid={`text-reporter-${incident.id}`}>
                        {incident.reporterRole}
                      </TableCell>
                      <TableCell data-testid={`text-type-${incident.id}`}>
                        {incident.incidentType}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={severityClassName(incident.severity)}
                          data-testid={`badge-severity-${incident.id}`}
                        >
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusClassName(incident.status)}
                          data-testid={`badge-status-${incident.id}`}
                        >
                          {incident.status}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-created-${incident.id}`}>
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedIncident(incident)}
                            data-testid={`button-view-${incident.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => reviewMutation.mutate(incident.id)}
                            disabled={reviewMutation.isPending}
                            data-testid={`button-review-${incident.id}`}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setActionDialog({ type: "approve", incidentId: incident.id });
                              setActionReason("");
                            }}
                            data-testid={`button-approve-${incident.id}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setActionDialog({ type: "dismiss", incidentId: incident.id });
                              setActionReason("");
                            }}
                            data-testid={`button-dismiss-${incident.id}`}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setActionDialog({ type: "escalate", incidentId: incident.id });
                              setActionReason("");
                            }}
                            data-testid={`button-escalate-${incident.id}`}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "suspensions" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg" data-testid="text-suspensions-title">
              Active Suspensions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suspensionsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !suspensions?.length ? (
              <div className="text-center py-8" data-testid="text-no-suspensions">
                <Ban className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active suspensions</p>
              </div>
            ) : (
              <Table data-testid="table-suspensions">
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Expires At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspensions.map((suspension) => (
                    <TableRow key={suspension.id} data-testid={`suspension-row-${suspension.id}`}>
                      <TableCell data-testid={`text-user-${suspension.id}`}>
                        {suspension.userId}
                      </TableCell>
                      <TableCell data-testid={`text-suspension-type-${suspension.id}`}>
                        <Badge variant="secondary">
                          {suspension.suspensionType}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-suspension-reason-${suspension.id}`}>
                        {suspension.reason}
                      </TableCell>
                      <TableCell data-testid={`text-expires-${suspension.id}`}>
                        {suspension.expiresAt
                          ? new Date(suspension.expiresAt).toLocaleString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLiftDialog(suspension.id);
                            setActionReason("");
                          }}
                          data-testid={`button-lift-${suspension.id}`}
                        >
                          Lift
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg" data-testid="text-audit-title">
              Safety Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !auditLogs?.length ? (
              <div className="text-center py-8" data-testid="text-no-audit-logs">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No audit logs found</p>
              </div>
            ) : (
              <Table data-testid="table-audit-logs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Target User</TableHead>
                    <TableHead>Incident</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} data-testid={`audit-row-${log.id}`}>
                      <TableCell data-testid={`text-audit-action-${log.id}`}>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell data-testid={`text-audit-performer-${log.id}`}>
                        {log.performedBy}
                      </TableCell>
                      <TableCell data-testid={`text-audit-target-${log.id}`}>
                        {log.targetUserId || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-audit-incident-${log.id}`}>
                        {log.incidentId || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-audit-details-${log.id}`}>
                        {log.details || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-audit-date-${log.id}`}>
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-incident-details">
          <DialogHeader>
            <DialogTitle data-testid="text-incident-detail-title">
              Incident Details
            </DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-medium" data-testid="text-detail-id">{selectedIncident.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reporter Role</p>
                  <p className="font-medium" data-testid="text-detail-reporter">{selectedIncident.reporterRole}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium" data-testid="text-detail-type">{selectedIncident.incidentType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <Badge
                    variant="secondary"
                    className={severityClassName(selectedIncident.severity)}
                    data-testid="badge-detail-severity"
                  >
                    {selectedIncident.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant="secondary"
                    className={statusClassName(selectedIncident.status)}
                    data-testid="badge-detail-status"
                  >
                    {selectedIncident.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium" data-testid="text-detail-created">
                    {new Date(selectedIncident.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedIncident.reporterId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reporter ID</p>
                    <p className="font-medium" data-testid="text-detail-reporter-id">{selectedIncident.reporterId}</p>
                  </div>
                )}
                {selectedIncident.reportedUserId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reported User ID</p>
                    <p className="font-medium" data-testid="text-detail-reported-user">{selectedIncident.reportedUserId}</p>
                  </div>
                )}
                {selectedIncident.tripId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Trip ID</p>
                    <p className="font-medium" data-testid="text-detail-trip">{selectedIncident.tripId}</p>
                  </div>
                )}
              </div>
              {selectedIncident.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium" data-testid="text-detail-description">{selectedIncident.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent data-testid="dialog-action-reason">
          <DialogHeader>
            <DialogTitle data-testid="text-action-dialog-title">
              {actionDialog?.type === "approve" && "Approve Incident"}
              {actionDialog?.type === "dismiss" && "Dismiss Incident"}
              {actionDialog?.type === "escalate" && "Escalate Incident"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter reason..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              data-testid="textarea-action-reason"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setActionDialog(null)}
                data-testid="button-cancel-action"
              >
                Cancel
              </Button>
              <Button
                onClick={handleActionSubmit}
                disabled={
                  approveMutation.isPending ||
                  dismissMutation.isPending ||
                  escalateMutation.isPending
                }
                data-testid="button-submit-action"
              >
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!liftDialog} onOpenChange={(open) => !open && setLiftDialog(null)}>
        <DialogContent data-testid="dialog-lift-suspension">
          <DialogHeader>
            <DialogTitle data-testid="text-lift-dialog-title">Lift Suspension</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter reason for lifting suspension..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              data-testid="textarea-lift-reason"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setLiftDialog(null)}
                data-testid="button-cancel-lift"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLiftSubmit}
                disabled={liftSuspensionMutation.isPending}
                data-testid="button-submit-lift"
              >
                Lift Suspension
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
