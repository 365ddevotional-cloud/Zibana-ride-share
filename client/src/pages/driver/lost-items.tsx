import { useState } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { LostItemChat } from "@/components/lost-item-chat";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ChevronLeft, Package, Phone, Calendar, Tag, CheckCircle, XCircle, RotateCcw, AlertTriangle, Banknote, MapPin } from "lucide-react";

interface LostItemReport {
  id: string;
  tripId: string;
  riderId: string;
  driverId: string;
  itemDescription: string;
  category: string;
  status: string;
  riderContactPhone?: string;
  driverNotes?: string;
  communicationUnlocked: boolean;
  riderPhoneVisible: boolean;
  driverPhoneVisible: boolean;
  returnFee?: string;
  driverPayout?: string;
  returnMethod?: string;
  hubId?: string;
  hubDropOffPhotoUrl?: string;
  expectedDropOffTime?: string;
  hubConfirmedAt?: string;
  hubPickedUpAt?: string;
  driverHubBonus?: string;
  hubServiceFee?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  reported: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  driver_confirmed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  driver_denied: "bg-red-500/15 text-red-700 dark:text-red-400",
  return_in_progress: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  returned: "bg-green-500/15 text-green-700 dark:text-green-400",
  closed: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
  found: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  disputed: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  resolved_by_admin: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  en_route_to_hub: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  at_hub: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
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
  const [hubDialogOpen, setHubDialogOpen] = useState(false);
  const [selectedReportForHub, setSelectedReportForHub] = useState<string | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery<LostItemReport[]>({
    queryKey: ["/api/lost-items/driver-reports"],
    enabled: !!user,
  });

  const { data: hubs } = useQuery<any[]>({
    queryKey: ["/api/safe-return-hubs"],
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

  const selectReturnMethodMutation = useMutation({
    mutationFn: async ({ id, returnMethod, hubId }: { id: string; returnMethod: string; hubId?: string }) => {
      const res = await apiRequest("PATCH", `/api/lost-items/${id}/return-method`, { returnMethod, hubId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lost-items/driver-reports"] });
      toast({ title: "Return method selected", description: "Return method has been set" });
      setHubDialogOpen(false);
      setSelectedReportForHub(null);
      setSelectedHubId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const hubDropoffMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/lost-items/${id}/hub-dropoff`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lost-items/driver-reports"] });
      toast({ title: "Drop-off confirmed", description: "Item has been dropped off at the hub" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  const showChat = (status: string) =>
    ["driver_confirmed", "return_in_progress", "found", "returned", "en_route_to_hub", "at_hub"].includes(status);

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

                  {report.status === "returned" && report.driverPayout && (
                    <Badge
                      className="bg-green-500/15 text-green-700 dark:text-green-400"
                      data-testid={`badge-payout-${report.id}`}
                    >
                      <Banknote className="h-3 w-3 mr-1" />
                      Payout: {report.driverPayout}
                    </Badge>
                  )}

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

                  {report.status === "found" && !report.returnMethod && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Choose return method:</p>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectReturnMethodMutation.mutate({ id: report.id, returnMethod: "direct" })}
                          disabled={selectReturnMethodMutation.isPending}
                          data-testid={`button-direct-return-${report.id}`}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Return Directly
                        </Button>
                        <Button
                          size="sm"
                          className="bg-teal-600"
                          onClick={() => { setSelectedReportForHub(report.id); setHubDialogOpen(true); }}
                          disabled={selectReturnMethodMutation.isPending}
                          data-testid={`button-hub-return-${report.id}`}
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          Drop at Safe Hub
                        </Button>
                      </div>
                    </div>
                  )}

                  {report.status === "en_route_to_hub" && (
                    <div className="space-y-2">
                      <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-400" data-testid={`badge-hub-enroute-${report.id}`}>
                        <MapPin className="h-3 w-3 mr-1" />
                        En Route to Hub
                      </Badge>
                      <Button
                        size="sm"
                        className="bg-teal-600"
                        onClick={() => hubDropoffMutation.mutate(report.id)}
                        disabled={hubDropoffMutation.isPending}
                        data-testid={`button-confirm-dropoff-${report.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirm Drop-off at Hub
                      </Button>
                    </div>
                  )}

                  {report.status === "at_hub" && report.driverHubBonus && (
                    <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400" data-testid={`badge-hub-bonus-${report.id}`}>
                      <Banknote className="h-3 w-3 mr-1" />
                      Hub Bonus: {report.driverHubBonus} (pending rider pickup)
                    </Badge>
                  )}

                  {showChat(report.status) && report.communicationUnlocked && (
                    <LostItemChat
                      reportId={report.id}
                      currentUserId={user?.id || ""}
                      communicationUnlocked={report.communicationUnlocked}
                      userRole="driver"
                    />
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

      <Dialog open={hubDialogOpen} onOpenChange={setHubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Safe Return Hub</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {!hubs || hubs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-hubs">No hubs available in your area</p>
            ) : (
              hubs.map((hub: any) => (
                <Card
                  key={hub.id}
                  className={`cursor-pointer hover-elevate ${selectedHubId === hub.id ? "ring-2 ring-teal-500" : ""}`}
                  onClick={() => setSelectedHubId(hub.id)}
                  data-testid={`card-hub-${hub.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm" data-testid={`text-hub-name-${hub.id}`}>{hub.name}</p>
                        <p className="text-xs text-muted-foreground">{hub.address}</p>
                        <p className="text-xs text-muted-foreground">{hub.operatingHoursStart} - {hub.operatingHoursEnd}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {hub.hasCctv && <Badge variant="outline" className="text-xs">CCTV</Badge>}
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Bonus: {hub.driverBonusReward}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setHubDialogOpen(false)} data-testid="button-cancel-hub">Cancel</Button>
            <Button
              className="bg-teal-600"
              disabled={!selectedHubId || selectReturnMethodMutation.isPending}
              onClick={() => selectedReportForHub && selectedHubId && selectReturnMethodMutation.mutate({ id: selectedReportForHub, returnMethod: "hub", hubId: selectedHubId })}
              data-testid="button-confirm-hub"
            >
              {selectReturnMethodMutation.isPending ? "Confirming..." : "Confirm Hub"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DriverLayout>
  );
}
