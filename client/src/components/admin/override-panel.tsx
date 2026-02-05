import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/empty-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Power,
  PowerOff,
  LogOut,
  RefreshCw,
  UserCheck,
  Ban,
} from "lucide-react";

type AdminOverride = {
  id: string;
  targetUserId: string;
  adminActorId: string;
  actionType: string;
  overrideReason: string;
  status: string;
  overrideExpiresAt: string | null;
  previousState: string | null;
  newState: string | null;
  revertedAt: string | null;
  revertedBy: string | null;
  revertReason: string | null;
  createdAt: string;
};

type AuditLogEntry = {
  id: string;
  overrideId: string | null;
  adminActorId: string;
  affectedUserId: string;
  actionType: string;
  overrideReason: string;
  previousState: string | null;
  newState: string | null;
  metadata: string | null;
  createdAt: string;
};

const ACTION_TYPES = [
  { value: "FORCE_LOGOUT", label: "Force Logout", icon: LogOut, description: "End all active sessions for this user" },
  { value: "RESET_SESSION", label: "Reset Session", icon: RefreshCw, description: "Reset a stuck or corrupted session" },
  { value: "RESTORE_AUTO_LOGIN", label: "Restore Auto-Login", icon: UserCheck, description: "Restore auto-login eligibility" },
  { value: "ENABLE_DRIVER_ONLINE", label: "Enable Driver Online", icon: Power, description: "Temporarily enable driver online status" },
  { value: "DISABLE_DRIVER_ONLINE", label: "Disable Driver Online", icon: PowerOff, description: "Temporarily disable driver online status" },
  { value: "CLEAR_CANCELLATION_FLAGS", label: "Clear Cancellation Flags", icon: XCircle, description: "Clear incorrect cancellation or acceptance flags" },
  { value: "RESTORE_DRIVER_ACCESS", label: "Restore Driver Access", icon: UserCheck, description: "Restore access after dispute resolution" },
  { value: "CLEAR_RIDER_CANCELLATION_WARNING", label: "Clear Rider Cancel Warning", icon: AlertTriangle, description: "Remove false cancellation warnings" },
  { value: "RESTORE_RIDE_ACCESS", label: "Restore Ride Access", icon: CheckCircle, description: "Restore ride access after dispute review" },
];

function getActionLabel(actionType: string): string {
  return ACTION_TYPES.find(a => a.value === actionType)?.label || actionType.replace(/_/g, " ");
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="default" data-testid={`badge-status-${status}`}>Active</Badge>;
    case "expired":
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Expired</Badge>;
    case "reverted":
      return <Badge variant="outline" data-testid={`badge-status-${status}`}>Reverted</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString();
}

export function AdminOverridePanel() {
  const { toast } = useToast();
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [revertOverrideId, setRevertOverrideId] = useState("");
  const [revertReason, setRevertReason] = useState("");
  const [userSearchId, setUserSearchId] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "user-history" | "audit-log">("active");

  const { data: activeOverrides = [], isLoading: activeLoading } = useQuery<AdminOverride[]>({
    queryKey: ["/api/admin/overrides/active"],
    enabled: viewMode === "active",
  });

  const { data: userOverrides = [], isLoading: userLoading } = useQuery<AdminOverride[]>({
    queryKey: ["/api/admin/overrides/user", userSearchId],
    queryFn: async () => {
      if (!userSearchId) return [];
      const res = await fetch(`/api/admin/overrides/user/${userSearchId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user overrides");
      return res.json();
    },
    enabled: viewMode === "user-history" && !!userSearchId,
  });

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/admin/overrides/audit-log"],
    enabled: viewMode === "audit-log",
  });

  const applyOverrideMutation = useMutation({
    mutationFn: async (data: { targetUserId: string; actionType: string; overrideReason: string; overrideExpiresAt?: string }) => {
      const response = await apiRequest("POST", "/api/admin/override/apply", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Override Applied", description: "The admin override has been applied successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overrides/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overrides/audit-log"] });
      resetApplyForm();
    },
    onError: (error: Error) => {
      toast({ title: "Override Failed", description: error.message, variant: "destructive" });
    },
  });

  const revertOverrideMutation = useMutation({
    mutationFn: async (data: { overrideId: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/admin/override/${data.overrideId}/revert`, { reason: data.reason });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Override Reverted", description: "The override has been successfully reverted." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overrides/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overrides/audit-log"] });
      setShowRevertDialog(false);
      setRevertOverrideId("");
      setRevertReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Revert Failed", description: error.message, variant: "destructive" });
    },
  });

  function resetApplyForm() {
    setShowApplyDialog(false);
    setSelectedAction("");
    setTargetUserId("");
    setOverrideReason("");
    setExpiresInHours("");
    setShowConfirm(false);
  }

  function handleApplySubmit() {
    if (!targetUserId || !selectedAction || !overrideReason) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setShowConfirm(true);
  }

  function confirmApply() {
    const data: { targetUserId: string; actionType: string; overrideReason: string; overrideExpiresAt?: string } = {
      targetUserId,
      actionType: selectedAction,
      overrideReason,
    };
    if (expiresInHours && parseFloat(expiresInHours) > 0) {
      const expiresAt = new Date(Date.now() + parseFloat(expiresInHours) * 60 * 60 * 1000);
      data.overrideExpiresAt = expiresAt.toISOString();
    }
    applyOverrideMutation.mutate(data);
    setShowConfirm(false);
  }

  const selectedActionInfo = ACTION_TYPES.find(a => a.value === selectedAction);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Admin Override Control
          </CardTitle>
          <CardDescription>
            Apply temporary overrides to fix user issues. All actions are logged and auditable.
          </CardDescription>
        </div>
        <Button onClick={() => setShowApplyDialog(true)} data-testid="button-apply-override">
          <Shield className="h-4 w-4 mr-2" />
          Apply Override
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={viewMode === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("active")}
            data-testid="button-view-active-overrides"
          >
            <Clock className="h-4 w-4 mr-1" />
            Active Overrides
          </Button>
          <Button
            variant={viewMode === "user-history" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("user-history")}
            data-testid="button-view-user-history"
          >
            <Search className="h-4 w-4 mr-1" />
            User History
          </Button>
          <Button
            variant={viewMode === "audit-log" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("audit-log")}
            data-testid="button-view-audit-log"
          >
            <Shield className="h-4 w-4 mr-1" />
            Audit Log
          </Button>
        </div>

        {viewMode === "user-history" && (
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Enter User ID to search..."
              value={userSearchId}
              onChange={(e) => setUserSearchId(e.target.value)}
              className="max-w-md"
              data-testid="input-user-search"
            />
          </div>
        )}

        {viewMode === "active" && (
          activeLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading active overrides...</div>
          ) : activeOverrides.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No active overrides"
              description="There are currently no active admin overrides"
            />
          ) : (
            <OverrideTable
              overrides={activeOverrides}
              onRevert={(id) => { setRevertOverrideId(id); setShowRevertDialog(true); }}
              showRevert
            />
          )
        )}

        {viewMode === "user-history" && (
          !userSearchId ? (
            <EmptyState icon={Search} title="Search for a user" description="Enter a User ID to view their override history" />
          ) : userLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading user history...</div>
          ) : userOverrides.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No override history" description="No overrides found for this user" />
          ) : (
            <OverrideTable overrides={userOverrides} onRevert={(id) => { setRevertOverrideId(id); setShowRevertDialog(true); }} showRevert={false} />
          )
        )}

        {viewMode === "audit-log" && (
          auditLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading audit logs...</div>
          ) : auditLogs.length === 0 ? (
            <EmptyState icon={Shield} title="No audit logs" description="No admin override audit entries yet" />
          ) : (
            <AuditLogTable logs={auditLogs} />
          )
        )}
      </CardContent>

      <Dialog open={showApplyDialog} onOpenChange={(open) => { if (!open) resetApplyForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Apply Admin Override
            </DialogTitle>
            <DialogDescription>
              This action will be logged. All overrides are temporary and auditable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Target User ID</label>
              <Input
                placeholder="Enter the user ID to apply override to..."
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                data-testid="input-override-target-user"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Action Type</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger data-testid="select-override-action">
                  <SelectValue placeholder="Select an override action..." />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(action => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedActionInfo && (
                <p className="text-xs text-muted-foreground mt-1">{selectedActionInfo.description}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reason (Required)</label>
              <Textarea
                placeholder="Explain why this override is needed..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                data-testid="input-override-reason"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Expiration (Optional)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Hours until expiration..."
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value)}
                  min="0"
                  step="0.5"
                  data-testid="input-override-expires"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">hours</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for no automatic expiration. Temporary overrides auto-revert when expired.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-300">Temporary Override Warning</p>
                  <p className="text-muted-foreground mt-1">
                    This action will be permanently logged in the audit trail. Ensure you have a valid reason before applying.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetApplyForm}>Cancel</Button>
            <Button
              onClick={handleApplySubmit}
              disabled={!targetUserId || !selectedAction || !overrideReason || applyOverrideMutation.isPending}
              data-testid="button-submit-override"
            >
              {applyOverrideMutation.isPending ? "Applying..." : "Apply Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Override Action</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to apply <strong>{getActionLabel(selectedAction)}</strong> to user <strong>{targetUserId.slice(0, 12)}...</strong>
              {expiresInHours ? ` (expires in ${expiresInHours} hours)` : " (no expiration)"}. This action will be permanently logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApply} data-testid="button-confirm-override">
              Confirm Override
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showRevertDialog} onOpenChange={(open) => { if (!open) { setShowRevertDialog(false); setRevertOverrideId(""); setRevertReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Revert Override
            </DialogTitle>
            <DialogDescription>
              This will reverse the override and restore the previous state where possible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-1 block">Reason for Reverting</label>
            <Textarea
              placeholder="Why is this override being reverted..."
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
              data-testid="input-revert-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRevertDialog(false); setRevertReason(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => revertOverrideMutation.mutate({ overrideId: revertOverrideId, reason: revertReason })}
              disabled={!revertReason || revertOverrideMutation.isPending}
              data-testid="button-confirm-revert"
            >
              {revertOverrideMutation.isPending ? "Reverting..." : "Revert Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function OverrideTable({ overrides, onRevert, showRevert }: { overrides: AdminOverride[]; onRevert: (id: string) => void; showRevert: boolean }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Target User</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Created</TableHead>
            {showRevert && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {overrides.map(override => (
            <TableRow key={override.id} data-testid={`override-row-${override.id}`}>
              <TableCell>
                <Badge variant="outline">{getActionLabel(override.actionType)}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{override.targetUserId.slice(0, 12)}...</TableCell>
              <TableCell className="max-w-[200px] truncate" title={override.overrideReason}>
                {override.overrideReason}
              </TableCell>
              <TableCell>{getStatusBadge(override.status)}</TableCell>
              <TableCell className="text-sm">
                {override.overrideExpiresAt ? (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(override.overrideExpiresAt)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No expiry</span>
                )}
              </TableCell>
              <TableCell className="text-sm">{formatDate(override.createdAt)}</TableCell>
              {showRevert && (
                <TableCell>
                  {override.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRevert(override.id)}
                      data-testid={`button-revert-${override.id}`}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Revert
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AuditLogTable({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Affected User</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map(log => (
            <TableRow key={log.id} data-testid={`audit-row-${log.id}`}>
              <TableCell>
                <Badge variant="outline">{getActionLabel(log.actionType)}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{log.adminActorId.slice(0, 12)}...</TableCell>
              <TableCell className="font-mono text-xs">{log.affectedUserId.slice(0, 12)}...</TableCell>
              <TableCell className="max-w-[200px] truncate" title={log.overrideReason}>
                {log.overrideReason}
              </TableCell>
              <TableCell className="text-sm">{formatDate(log.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
