import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { LostItemChat } from "@/components/lost-item-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/empty-state";
import {
  ArrowLeft, Shield, Package, AlertTriangle, FileText, Users,
  ChevronRight, Clock, Phone, MapPin, ShieldCheck, ExternalLink, MessageCircle,
} from "lucide-react";

interface Trip {
  id: number;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  createdAt: string;
}

interface LostItemReport {
  id: string;
  tripId: string;
  riderId: string;
  driverId: string;
  itemDescription: string;
  itemCategory: string;
  lastSeenLocation: string;
  contactPhone: string;
  status: string;
  communicationUnlocked: boolean;
  riderPhoneVisible: boolean;
  driverPhoneVisible: boolean;
  returnFee?: string;
  createdAt: string;
}

interface AccidentReport {
  id: number;
  tripId: number;
  accidentType: string;
  severity: string;
  description: string;
  isSafe: boolean;
  injuriesReported: boolean;
  emergencyServicesNeeded: boolean;
  emergencyServicesContacted: boolean;
  status: string;
  createdAt: string;
}

interface InsurancePartner {
  id: number;
  companyName: string;
  coverageType: string;
  contactEmail: string;
  contactPhone: string;
  claimUrl: string;
  isActive: boolean;
}

const ITEM_CATEGORIES = [
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "bag", label: "Bag" },
  { value: "wallet", label: "Wallet" },
  { value: "keys", label: "Keys" },
  { value: "documents", label: "Documents" },
  { value: "jewelry", label: "Jewelry" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS: Record<string, string> = {
  reported: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  driver_confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  return_in_progress: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  returned: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  driver_denied: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  disputed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.closed;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
      data-testid={`badge-status-${status}`}
    >
      {formatStatus(status)}
    </span>
  );
}

export default function SafetyHubPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"report" | "my-reports">("report");
  const [expandedChat, setExpandedChat] = useState<string | null>(null);
  const [lostItemDialogOpen, setLostItemDialogOpen] = useState(false);
  const [accidentDialogOpen, setAccidentDialogOpen] = useState(false);
  const [insuranceDialogOpen, setInsuranceDialogOpen] = useState(false);
  const [selectedAccidentId, setSelectedAccidentId] = useState<number | null>(null);

  const [lostItemForm, setLostItemForm] = useState({
    tripId: "",
    itemDescription: "",
    itemCategory: "",
    lastSeenLocation: "",
    contactPhone: "",
  });

  const [accidentForm, setAccidentForm] = useState({
    tripId: "",
    accidentType: "",
    severity: "",
    description: "",
    isSafe: true,
    injuriesReported: false,
    emergencyServicesNeeded: false,
    emergencyServicesContacted: false,
  });

  const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips", "role=rider"],
    queryFn: async () => {
      const res = await fetch("/api/trips?role=rider", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load trips");
      return res.json();
    },
  });

  const { data: lostItems = [], isLoading: lostItemsLoading } = useQuery<LostItemReport[]>({
    queryKey: ["/api/lost-items/my-reports"],
    enabled: activeTab === "my-reports",
  });

  const { data: accidentReports = [], isLoading: accidentReportsLoading } = useQuery<AccidentReport[]>({
    queryKey: ["/api/accident-reports/my-reports"],
    enabled: activeTab === "my-reports",
  });

  const { data: insurancePartners = [] } = useQuery<InsurancePartner[]>({
    queryKey: ["/api/insurance-partners/active"],
    enabled: activeTab === "my-reports",
  });

  const createLostItemMutation = useMutation({
    mutationFn: async (data: typeof lostItemForm) => {
      const res = await apiRequest("POST", "/api/lost-items", {
        ...data,
        tripId: data.tripId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lost-items/my-reports"] });
      toast({ title: "Report submitted", description: "Your lost item report has been submitted successfully." });
      setLostItemDialogOpen(false);
      resetLostItemForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit report", description: error.message, variant: "destructive" });
    },
  });

  const createAccidentMutation = useMutation({
    mutationFn: async (data: typeof accidentForm) => {
      const res = await apiRequest("POST", "/api/accident-reports", {
        ...data,
        tripId: parseInt(data.tripId),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accident-reports/my-reports"] });
      toast({ title: "Report submitted", description: "Your accident report has been submitted successfully." });
      setAccidentDialogOpen(false);
      resetAccidentForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit report", description: error.message, variant: "destructive" });
    },
  });

  const insuranceReferralMutation = useMutation({
    mutationFn: async ({ accidentReportId, insurancePartnerId }: { accidentReportId: number; insurancePartnerId: number }) => {
      const res = await apiRequest("POST", "/api/insurance-referrals", {
        accidentReportId,
        insurancePartnerId,
        referredUserRole: "rider",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Insurance support requested", description: "Your request has been submitted. The insurance partner will be in touch." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to request insurance support", description: error.message, variant: "destructive" });
    },
  });

  const ELIGIBLE_SEVERITIES = ["moderate", "severe", "critical", "medium", "high"];

  function resetLostItemForm() {
    setLostItemForm({ tripId: "", itemDescription: "", itemCategory: "", lastSeenLocation: "", contactPhone: "" });
  }

  function resetAccidentForm() {
    setAccidentForm({ tripId: "", accidentType: "", severity: "", description: "", isSafe: true, injuriesReported: false, emergencyServicesNeeded: false, emergencyServicesContacted: false });
  }

  function handleLostItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lostItemForm.tripId || !lostItemForm.itemDescription || !lostItemForm.itemCategory) {
      toast({ title: "Missing fields", description: "Please fill in trip, item description, and category.", variant: "destructive" });
      return;
    }
    createLostItemMutation.mutate(lostItemForm);
  }

  function handleAccidentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accidentForm.tripId || !accidentForm.accidentType || !accidentForm.severity || !accidentForm.description) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    createAccidentMutation.mutate(accidentForm);
  }

  const reportsLoading = lostItemsLoading || accidentReportsLoading;
  const hasReports = lostItems.length > 0 || accidentReports.length > 0;

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-4" data-testid="safety-hub-page">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/rider/account")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Safety Hub</h1>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={activeTab === "report" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("report")}
              data-testid="tab-report"
            >
              <FileText className="h-4 w-4 mr-2" />
              Report
            </Button>
            <Button
              variant={activeTab === "my-reports" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("my-reports")}
              data-testid="tab-my-reports"
            >
              <Clock className="h-4 w-4 mr-2" />
              My Reports
            </Button>
          </div>

          {activeTab === "report" && (
            <div className="space-y-3">
              <Card
                className="cursor-pointer hover-elevate"
                onClick={() => setLostItemDialogOpen(true)}
                data-testid="card-lost-item"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium" data-testid="text-lost-item-title">Report Lost Item</p>
                        <p className="text-sm text-muted-foreground">Left something in a ride? Let us help.</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover-elevate"
                onClick={() => setAccidentDialogOpen(true)}
                data-testid="card-accident-report"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium" data-testid="text-accident-title">Report Accident</p>
                        <p className="text-sm text-muted-foreground">Report a safety incident or accident.</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover-elevate"
                onClick={() => setLocation("/rider/trusted-contacts")}
                data-testid="card-trusted-contacts"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium" data-testid="text-trusted-contacts-title">Trusted Contacts</p>
                        <p className="text-sm text-muted-foreground">Manage your emergency contacts.</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "my-reports" && (
            <div className="space-y-4">
              {reportsLoading ? (
                <div className="space-y-3" data-testid="loading-skeleton">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-64" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !hasReports ? (
                <EmptyState
                  icon={FileText}
                  title="No reports yet"
                  description="You haven't submitted any lost item or accident reports. Your reports will appear here once submitted."
                />
              ) : (
                <>
                  {lostItems.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                        Lost Item Reports
                      </p>
                      {lostItems.map((item) => (
                        <Card key={`lost-${item.id}`} data-testid={`card-lost-report-${item.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                  <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm" data-testid={`text-lost-item-desc-${item.id}`}>
                                    {item.itemDescription}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {ITEM_CATEGORIES.find((c) => c.value === item.itemCategory)?.label || item.itemCategory}
                                    {item.lastSeenLocation && ` - ${item.lastSeenLocation}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <StatusBadge status={item.status} />
                            </div>
                            {item.communicationUnlocked && (
                              <div className="mt-3 space-y-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setExpandedChat(expandedChat === item.id ? null : item.id)}
                                  data-testid={`button-chat-toggle-${item.id}`}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  {expandedChat === item.id ? "Hide Chat" : "Open Chat"}
                                </Button>
                                {expandedChat === item.id && user && (
                                  <LostItemChat
                                    reportId={item.id}
                                    currentUserId={user.id}
                                    communicationUnlocked={item.communicationUnlocked}
                                    userRole="rider"
                                  />
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {accidentReports.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                        Accident Reports
                      </p>
                      {accidentReports.map((report) => (
                        <div key={`accident-${report.id}`} className="space-y-2">
                          <Card data-testid={`card-accident-report-${report.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm" data-testid={`text-accident-type-${report.id}`}>
                                      {formatStatus(report.accidentType)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Severity: {formatStatus(report.severity)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                      {report.description}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {new Date(report.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <StatusBadge status={report.status} />
                              </div>
                            </CardContent>
                          </Card>
                          {ELIGIBLE_SEVERITIES.includes(report.severity) && insurancePartners.length > 0 && (
                            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" data-testid={`card-insurance-support-${report.id}`}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" data-testid={`badge-insurance-available-${report.id}`}>
                                      Insurance Support Available
                                    </Badge>
                                    <p className="text-sm text-muted-foreground" data-testid={`text-insurance-info-${report.id}`}>
                                      You may opt in to contact an insurance partner for assistance with this incident.
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedAccidentId(report.id);
                                        setInsuranceDialogOpen(true);
                                      }}
                                      data-testid={`button-contact-insurance-${report.id}`}
                                    >
                                      <ShieldCheck className="h-4 w-4 mr-1" />
                                      Contact Insurance
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <Dialog open={lostItemDialogOpen} onOpenChange={(open) => { if (!open) { setLostItemDialogOpen(false); resetLostItemForm(); } }}>
            <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-lost-item">
              <DialogHeader>
                <DialogTitle data-testid="text-lost-item-dialog-title">Report Lost Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleLostItemSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lost-trip">Trip</Label>
                  <Select
                    value={lostItemForm.tripId}
                    onValueChange={(v) => setLostItemForm({ ...lostItemForm, tripId: v })}
                  >
                    <SelectTrigger id="lost-trip" data-testid="select-lost-trip">
                      <SelectValue placeholder="Select a recent trip" />
                    </SelectTrigger>
                    <SelectContent>
                      {tripsLoading ? (
                        <div className="p-2">
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ) : trips.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No recent trips</div>
                      ) : (
                        trips.map((trip) => (
                          <SelectItem key={trip.id} value={String(trip.id)} data-testid={`option-trip-${trip.id}`}>
                            {trip.pickupAddress} → {trip.dropoffAddress}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-category">Category</Label>
                  <Select
                    value={lostItemForm.itemCategory}
                    onValueChange={(v) => setLostItemForm({ ...lostItemForm, itemCategory: v })}
                  >
                    <SelectTrigger id="item-category" data-testid="select-item-category">
                      <SelectValue placeholder="Select item category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value}`}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-description">Item Description</Label>
                  <Textarea
                    id="item-description"
                    placeholder="Describe the item you lost (e.g., black leather wallet with ID cards)"
                    value={lostItemForm.itemDescription}
                    onChange={(e) => setLostItemForm({ ...lostItemForm, itemDescription: e.target.value })}
                    data-testid="input-item-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last-seen-location">Last Seen Location</Label>
                  <Input
                    id="last-seen-location"
                    placeholder="Where did you last have the item?"
                    value={lostItemForm.lastSeenLocation}
                    onChange={(e) => setLostItemForm({ ...lostItemForm, lastSeenLocation: e.target.value })}
                    data-testid="input-last-seen-location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact Phone</Label>
                  <Input
                    id="contact-phone"
                    placeholder="Phone number to reach you"
                    value={lostItemForm.contactPhone}
                    onChange={(e) => setLostItemForm({ ...lostItemForm, contactPhone: e.target.value })}
                    data-testid="input-contact-phone"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createLostItemMutation.isPending}
                  data-testid="button-submit-lost-item"
                >
                  {createLostItemMutation.isPending ? "Submitting..." : "Submit Report"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={accidentDialogOpen} onOpenChange={(open) => { if (!open) { setAccidentDialogOpen(false); resetAccidentForm(); } }}>
            <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-accident-report">
              <DialogHeader>
                <DialogTitle data-testid="text-accident-dialog-title">Report Accident</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAccidentSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accident-trip">Trip</Label>
                  <Select
                    value={accidentForm.tripId}
                    onValueChange={(v) => setAccidentForm({ ...accidentForm, tripId: v })}
                  >
                    <SelectTrigger id="accident-trip" data-testid="select-accident-trip">
                      <SelectValue placeholder="Select a recent trip" />
                    </SelectTrigger>
                    <SelectContent>
                      {tripsLoading ? (
                        <div className="p-2">
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ) : trips.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No recent trips</div>
                      ) : (
                        trips.map((trip) => (
                          <SelectItem key={trip.id} value={String(trip.id)} data-testid={`option-accident-trip-${trip.id}`}>
                            {trip.pickupAddress} → {trip.dropoffAddress}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accident-type">Accident Type</Label>
                  <Select
                    value={accidentForm.accidentType}
                    onValueChange={(v) => setAccidentForm({ ...accidentForm, accidentType: v })}
                  >
                    <SelectTrigger id="accident-type" data-testid="select-accident-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="collision" data-testid="option-type-collision">Vehicle Collision</SelectItem>
                      <SelectItem value="near_miss" data-testid="option-type-near-miss">Near Miss</SelectItem>
                      <SelectItem value="harassment" data-testid="option-type-harassment">Harassment</SelectItem>
                      <SelectItem value="unsafe_driving" data-testid="option-type-unsafe-driving">Unsafe Driving</SelectItem>
                      <SelectItem value="medical_emergency" data-testid="option-type-medical">Medical Emergency</SelectItem>
                      <SelectItem value="other" data-testid="option-type-other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={accidentForm.severity}
                    onValueChange={(v) => setAccidentForm({ ...accidentForm, severity: v })}
                  >
                    <SelectTrigger id="severity" data-testid="select-severity">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low" data-testid="option-severity-low">Low</SelectItem>
                      <SelectItem value="medium" data-testid="option-severity-medium">Medium</SelectItem>
                      <SelectItem value="high" data-testid="option-severity-high">High</SelectItem>
                      <SelectItem value="critical" data-testid="option-severity-critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accident-description">Description</Label>
                  <Textarea
                    id="accident-description"
                    placeholder="Describe what happened in detail"
                    value={accidentForm.description}
                    onChange={(e) => setAccidentForm({ ...accidentForm, description: e.target.value })}
                    data-testid="input-accident-description"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="is-safe" className="cursor-pointer text-sm">Are you safe?</Label>
                    <Switch
                      id="is-safe"
                      checked={accidentForm.isSafe}
                      onCheckedChange={(v) => setAccidentForm({ ...accidentForm, isSafe: v })}
                      data-testid="switch-is-safe"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="injuries" className="cursor-pointer text-sm">Injuries reported?</Label>
                    <Switch
                      id="injuries"
                      checked={accidentForm.injuriesReported}
                      onCheckedChange={(v) => setAccidentForm({ ...accidentForm, injuriesReported: v })}
                      data-testid="switch-injuries-reported"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="emergency-needed" className="cursor-pointer text-sm">Emergency services needed?</Label>
                    <Switch
                      id="emergency-needed"
                      checked={accidentForm.emergencyServicesNeeded}
                      onCheckedChange={(v) => setAccidentForm({ ...accidentForm, emergencyServicesNeeded: v })}
                      data-testid="switch-emergency-needed"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="emergency-contacted" className="cursor-pointer text-sm">Emergency services contacted?</Label>
                    <Switch
                      id="emergency-contacted"
                      checked={accidentForm.emergencyServicesContacted}
                      onCheckedChange={(v) => setAccidentForm({ ...accidentForm, emergencyServicesContacted: v })}
                      data-testid="switch-emergency-contacted"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createAccidentMutation.isPending}
                  data-testid="button-submit-accident"
                >
                  {createAccidentMutation.isPending ? "Submitting..." : "Submit Report"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={insuranceDialogOpen} onOpenChange={setInsuranceDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-insurance-partners">
              <DialogHeader>
                <DialogTitle data-testid="text-insurance-dialog-title">Available Insurance Partners</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {insurancePartners.map((partner) => (
                  <Card key={partner.id} data-testid={`card-insurance-partner-${partner.id}`}>
                    <CardContent className="p-4 space-y-2">
                      <p className="font-medium text-sm" data-testid={`text-partner-name-${partner.id}`}>{partner.companyName}</p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-partner-coverage-${partner.id}`}>
                        Coverage: {partner.coverageType}
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {partner.contactPhone && (
                          <p className="flex items-center gap-1" data-testid={`text-partner-phone-${partner.id}`}>
                            <Phone className="h-3 w-3" /> {partner.contactPhone}
                          </p>
                        )}
                        {partner.contactEmail && (
                          <p data-testid={`text-partner-email-${partner.id}`}>
                            {partner.contactEmail}
                          </p>
                        )}
                        {partner.claimUrl && (
                          <a
                            href={partner.claimUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400"
                            data-testid={`link-partner-claim-${partner.id}`}
                          >
                            <ExternalLink className="h-3 w-3" /> File a Claim
                          </a>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={insuranceReferralMutation.isPending}
                        onClick={() => {
                          if (selectedAccidentId) {
                            insuranceReferralMutation.mutate({
                              accidentReportId: selectedAccidentId,
                              insurancePartnerId: partner.id,
                            });
                          }
                        }}
                        data-testid={`button-request-insurance-${partner.id}`}
                      >
                        {insuranceReferralMutation.isPending ? "Requesting..." : "Request Insurance Support"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
