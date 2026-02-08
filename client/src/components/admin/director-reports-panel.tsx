import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Activity, Shield, BarChart3, Flag, TrendingUp, TrendingDown,
  Minus, AlertTriangle, Search
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type DirectorReport = {
  directorUserId: string;
  name: string;
  directorType: string;
  lifecycleStatus: string;
  totalDrivers: number;
  activeDriversToday: number;
  activityRatio: number;
  avgActive7d: number;
  complianceRate: number;
  performanceScore: number | null;
  performanceTier: string | null;
  lifespanEndDate: string | null;
  commissionFrozen: boolean;
};

export function DirectorReportsPanel() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [flagDialog, setFlagDialog] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "activityRatio" | "complianceRate" | "performanceScore">("activityRatio");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useQuery<{ reports: DirectorReport[] }>({
    queryKey: ["/api/admin/directors/reports"],
  });

  const flagMutation = useMutation({
    mutationFn: async ({ directorUserId, reason }: { directorUserId: string; reason: string }) => {
      await apiRequest("POST", `/api/admin/directors/${directorUserId}/flag`, { reason });
    },
    onSuccess: () => {
      toast({ title: "Director flagged", description: "The director has been flagged for review." });
      setFlagDialog(null);
      setFlagReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/directors/reports"] });
    },
    onError: (e: any) => {
      toast({ title: "Failed to flag", description: e.message, variant: "destructive" });
    },
  });

  const reports = data?.reports || [];

  const filtered = reports
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.directorUserId.includes(search))
    .sort((a, b) => {
      const valA = a[sortBy] ?? 0;
      const valB = b[sortBy] ?? 0;
      if (sortDir === "asc") return (valA as number) - (valB as number);
      return (valB as number) - (valA as number);
    });

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  if (isLoading) {
    return (
      <Card className="mt-4" data-testid="director-reports-loading">
        <CardContent className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mt-4" data-testid="director-reports-panel">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Director Reports
              </CardTitle>
              <CardDescription>Compare all directors — counts and ratios only, no financial data</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search directors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-[200px]"
                data-testid="input-search-directors"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-directors">No directors found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Director</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="p-0 h-auto font-medium" onClick={() => handleSort("activityRatio")} data-testid="button-sort-activity">
                        Activity {sortBy === "activityRatio" && (sortDir === "desc" ? "↓" : "↑")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="p-0 h-auto font-medium" onClick={() => handleSort("complianceRate")} data-testid="button-sort-compliance">
                        Compliance {sortBy === "complianceRate" && (sortDir === "desc" ? "↓" : "↑")}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="p-0 h-auto font-medium" onClick={() => handleSort("performanceScore")} data-testid="button-sort-performance">
                        Score {sortBy === "performanceScore" && (sortDir === "desc" ? "↓" : "↑")}
                      </Button>
                    </TableHead>
                    <TableHead>Drivers</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.directorUserId} data-testid={`row-director-report-${r.directorUserId}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm" data-testid={`text-director-name-${r.directorUserId}`}>{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.directorUserId.slice(0, 8)}...</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-type-${r.directorUserId}`}>
                          {r.directorType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.lifecycleStatus === "active" ? "default" : r.lifecycleStatus === "suspended" ? "destructive" : "secondary"}
                          data-testid={`badge-status-${r.directorUserId}`}
                        >
                          {r.lifecycleStatus}
                        </Badge>
                        {r.commissionFrozen && (
                          <Badge variant="outline" className="ml-1 text-xs">frozen</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" data-testid={`text-activity-${r.directorUserId}`}>{r.activityRatio}%</span>
                          <Progress value={r.activityRatio} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" data-testid={`text-compliance-${r.directorUserId}`}>{r.complianceRate}%</span>
                          {r.complianceRate < 50 && <AlertTriangle className="w-3 h-3 text-destructive" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.performanceScore !== null ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium" data-testid={`text-score-${r.directorUserId}`}>{r.performanceScore}</span>
                            {r.performanceTier && (
                              <Badge variant="outline" className="text-xs">{r.performanceTier}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm" data-testid={`text-drivers-${r.directorUserId}`}>
                            {r.activeDriversToday}/{r.totalDrivers}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setFlagDialog(r.directorUserId)}
                          data-testid={`button-flag-${r.directorUserId}`}
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          Flag
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!flagDialog} onOpenChange={(v) => { if (!v) { setFlagDialog(null); setFlagReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Director for Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for flagging..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              data-testid="input-flag-reason"
            />
            <p className="text-xs text-muted-foreground">
              The director will be notified that their account is under review. No action will be taken automatically.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFlagDialog(null); setFlagReason(""); }} data-testid="button-cancel-flag">
              Cancel
            </Button>
            <Button
              onClick={() => flagDialog && flagMutation.mutate({ directorUserId: flagDialog, reason: flagReason })}
              disabled={!flagReason.trim() || flagMutation.isPending}
              data-testid="button-confirm-flag"
            >
              {flagMutation.isPending ? "Flagging..." : "Flag for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
