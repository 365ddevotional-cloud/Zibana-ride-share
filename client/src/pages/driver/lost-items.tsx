import { useState } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ChevronLeft, Package, Phone, Calendar, Tag, CheckCircle, XCircle, RotateCcw, AlertTriangle } from "lucide-react";

interface LostItemReport {
  id: string;
  tripId: string;
  itemDescription: string;
  category: string;
  status: string;
  riderContactPhone?: string;
  driverNotes?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  reported: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  driver_confirmed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  driver_denied: "bg-red-500/15 text-red-700 dark:text-red-400",
  return_in_progress: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  returned: "bg-green-500/15 text-green-700 dark:text-green-400",
  closed: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DriverLostItems() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [driverNotes, setDriverNotes] = useState("");
  const [pendingAction, setPendingAction] = useState<{ id: string; response: "driver_confirmed" | "driver_denied" } | null>(null);

  const { data: reports, isLoading } = useQuery<LostItemReport[]>({
    queryKey: ["/api/lost-items/driver-reports"],
    enabled: !!user,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, response, driverNotes }: { id: string; response: string; driverNotes: string }) => {
      const res = await apiRequest("PATCH", `/api/lost-items/${id}/driver-response`, { response, driverNotes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lost-items/driver-reports"] });
      toast({ title: "Response submitted", description: "Your response has been recorded" });
      setNotesDialogOpen(false);
      setDriverNotes("");
      setPendingAction(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to submit response", variant: "destructive" });
    },
  });

  const markReturnedMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/lost-items/${id}/status`, { status: "returned" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lost-items/driver-reports"] });
      toast({ title: "Item marked as returned", description: "The lost item has been marked as returned to the rider" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    },
  });

  const handleRespond = (id: string, response: "driver_confirmed" | "driver_denied") => {
    setPendingAction({ id, response });
    setDriverNotes("");
    setNotesDialogOpen(true);
  };

  const handleSubmitResponse = () => {
    if (!pendingAction) return;
    respondMutation.mutate({
      id: pendingAction.id,
      response: pendingAction.response,
      driverNotes,
    });
  };

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/driver/dashboard")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            <h1 className="text-xl font-bold" data-testid="text-lost-items-title">Lost Item Reports</h1>
          </div>
        </div>

        <Card data-testid="card-relief-fund-info">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm" data-testid="text-relief-fund-info">
                  Were you in an accident? You may be eligible for relief fund support.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLocation("/driver/relief-fund")}
                  data-testid="button-view-relief-claims"
                >
                  View Relief Claims
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !reports || reports.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No lost item reports"
            description="Lost item reports from riders will appear here"
          />
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} data-testid={`card-lost-item-${report.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">{report.itemDescription}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" data-testid={`badge-category-${report.id}`}>
                        <Tag className="h-3 w-3 mr-1" />
                        {report.category}
                      </Badge>
                      <Badge
                        className={STATUS_COLORS[report.status] || STATUS_COLORS.closed}
                        data-testid={`badge-status-${report.id}`}
                      >
                        {formatStatus(report.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p data-testid={`text-trip-id-${report.id}`}>Trip: {report.tripId}</p>
                    {report.riderContactPhone && (
                      <p className="flex items-center gap-1" data-testid={`text-phone-${report.id}`}>
                        <Phone className="h-3 w-3" />
                        {report.riderContactPhone}
                      </p>
                    )}
                    <p className="flex items-center gap-1" data-testid={`text-date-${report.id}`}>
                      <Calendar className="h-3 w-3" />
                      {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {report.status === "reported" && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="bg-emerald-600"
                        onClick={() => handleRespond(report.id, "driver_confirmed")}
                        disabled={respondMutation.isPending}
                        data-testid={`button-found-${report.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Found It
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRespond(report.id, "driver_denied")}
                        disabled={respondMutation.isPending}
                        data-testid={`button-not-found-${report.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Not Found
                      </Button>
                    </div>
                  )}

                  {(report.status === "driver_confirmed" || report.status === "return_in_progress") && (
                    <Button
                      size="sm"
                      className="bg-emerald-600"
                      onClick={() => markReturnedMutation.mutate(report.id)}
                      disabled={markReturnedMutation.isPending}
                      data-testid={`button-returned-${report.id}`}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Mark as Returned
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.response === "driver_confirmed" ? "Confirm Found Item" : "Report Item Not Found"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Add any notes (optional)..."
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-driver-notes"
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setNotesDialogOpen(false)}
              data-testid="button-cancel-notes"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={respondMutation.isPending}
              className={pendingAction?.response === "driver_confirmed" ? "bg-emerald-600" : ""}
              variant={pendingAction?.response === "driver_denied" ? "destructive" : "default"}
              data-testid="button-submit-response"
            >
              {respondMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DriverLayout>
  );
}
