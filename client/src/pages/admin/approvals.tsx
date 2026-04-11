import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, UserCheck, XCircle, Car, Users, Clock, GraduationCap, Filter, Eye, FileText, CheckCircle, AlertCircle, Loader2, RotateCcw, MapPin, Calendar, Search } from "lucide-react";
import { API_BASE } from "@/lib/apiBase";

interface PendingDriver {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
  status: string;
  createdAt: string;
  city?: string;
  isTrainee?: boolean;
  verificationStatus?: string;
  rejectionReason?: string;
  identityDocSubmitted?: boolean;
  driversLicenseDocSubmitted?: boolean;
  ninDocSubmitted?: boolean;
  addressDocSubmitted?: boolean;
  vehicleLicenseDocSubmitted?: boolean;
  insuranceDocSubmitted?: boolean;
}

interface DriverDocument {
  type: string;
  label: string;
  submitted: boolean;
  verified: boolean;
  hasData: boolean;
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          Rejected
        </Badge>
      );
    case "suspended":
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
          Suspended
        </Badge>
      );
    case "correction_required":
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
          Correction Required
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function DocStatusIcon({ submitted, verified }: { submitted: boolean; verified: boolean }) {
  if (verified) return <CheckCircle className="h-4 w-4 text-green-600" />;
  if (submitted) return <Clock className="h-4 w-4 text-yellow-600" />;
  return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
}

export default function ApprovalsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("drivers");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [cityFilter, setCityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<PendingDriver | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PendingDriver | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<PendingDriver | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [docViewerOpen, setDocViewerOpen] = useState(false);
  const [viewingDocType, setViewingDocType] = useState<string | null>(null);
  const [viewingDocData, setViewingDocData] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  const { data: allDrivers = [], isLoading: driversLoading } = useQuery<PendingDriver[]>({
    queryKey: ["/api/admin/approvals", "drivers", statusFilter],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/approvals?type=driver&status=${statusFilter}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return res.json();
    },
  });

  const { data: allDriversForCounts = [] } = useQuery<PendingDriver[]>({
    queryKey: ["/api/admin/approvals", "drivers", "all"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/approvals?type=driver&status=all`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return res.json();
    },
  });

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0, correction_required: 0, suspended: 0 };
    allDriversForCounts.forEach((d) => {
      if (d.status in counts) counts[d.status as keyof typeof counts]++;
    });
    return counts;
  }, [allDriversForCounts]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    allDriversForCounts.forEach((d) => {
      if (d.city) cities.add(d.city);
    });
    return Array.from(cities).sort();
  }, [allDriversForCounts]);

  const filteredDrivers = useMemo(() => {
    let result = allDrivers;
    if (cityFilter && cityFilter !== "all") {
      result = result.filter((d) => d.city === cityFilter);
    }
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      result = result.filter((d) => {
        if (!d.createdAt) return false;
        const created = new Date(d.createdAt);
        return created >= filterDate && created < nextDay;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((d) =>
        d.fullName?.toLowerCase().includes(q) ||
        d.phone?.toLowerCase().includes(q) ||
        d.licensePlate?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allDrivers, cityFilter, dateFilter, searchQuery]);

  const traineeDrivers = filteredDrivers.filter(
    (d) => d.verificationStatus === "unverified" || d.verificationStatus === "pending"
  );

  const { data: driverDocs } = useQuery<{ documents: DriverDocument[] }>({
    queryKey: ["/api/admin/driver", selectedDriver?.userId, "documents"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/driver/${selectedDriver!.userId}/documents`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    enabled: !!selectedDriver,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      return apiRequest("POST", "/api/admin/approvals/approve", { type, id });
    },
    onSuccess: () => {
      toast({
        title: "Driver Approved",
        description: "The driver has been approved and can now go online.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      setSelectedDriver(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve. Please try again.",
        variant: "destructive",
      });
    },
  });

  const forceApproveDocsMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/drivers/${userId}/force-approve-documents`);
    },
    onSuccess: () => {
      toast({
        title: "Documents Force-Approved",
        description: "All documents have been approved. Driver UI will reflect this immediately.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/driver"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to force-approve documents.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ type, id, reason }: { type: string; id: string; reason?: string }) => {
      return apiRequest("POST", "/api/admin/approvals/reject", { type, id, reason });
    },
    onSuccess: () => {
      toast({
        title: "Driver Rejected",
        description: "The driver application has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      setRejectDialogOpen(false);
      setRejectTarget(null);
      setRejectionReason("");
      setSelectedDriver(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject. Please try again.",
        variant: "destructive",
      });
    },
  });

  const correctionMutation = useMutation({
    mutationFn: async ({ type, id, reason }: { type: string; id: string; reason?: string }) => {
      return apiRequest("POST", "/api/admin/approvals/request-correction", { type, id, reason });
    },
    onSuccess: () => {
      toast({
        title: "Correction Requested",
        description: "The driver has been notified to re-upload their documents.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      setCorrectionDialogOpen(false);
      setCorrectionTarget(null);
      setCorrectionReason("");
      setSelectedDriver(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to request correction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openRejectDialog = (driver: PendingDriver) => {
    setRejectTarget(driver);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const openCorrectionDialog = (driver: PendingDriver) => {
    setCorrectionTarget(driver);
    setCorrectionReason("");
    setCorrectionDialogOpen(true);
  };

  const confirmReject = () => {
    if (rejectTarget) {
      rejectMutation.mutate({
        type: "driver",
        id: rejectTarget.userId,
        reason: rejectionReason || undefined,
      });
    }
  };

  const confirmCorrection = () => {
    if (correctionTarget) {
      correctionMutation.mutate({
        type: "driver",
        id: correctionTarget.userId,
        reason: correctionReason || undefined,
      });
    }
  };

  const viewDocument = async (userId: string, docType: string) => {
    setDocLoading(true);
    setViewingDocType(docType);
    try {
      const res = await fetch(`${API_BASE}/api/admin/driver/${userId}/document/${docType}`, {
        credentials: "include",
      });
      if (!res.ok) {
        toast({ title: "No document", description: "This document has not been uploaded yet.", variant: "destructive" });
        setDocLoading(false);
        return;
      }
      const data = await res.json();
      setViewingDocData(data.documentData);
      setDocViewerOpen(true);
    } catch {
      toast({ title: "Error", description: "Failed to load document.", variant: "destructive" });
    }
    setDocLoading(false);
  };

  function renderDriverTable(drivers: PendingDriver[], showActions: boolean) {
    if (drivers.length === 0) {
      return (
        <EmptyState
          icon={UserCheck}
          title="No drivers found"
          description="No driver applications match the current filter."
        />
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Plate</TableHead>
              <TableHead>Docs</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => {
              const docsSubmitted = [
                driver.identityDocSubmitted,
                driver.driversLicenseDocSubmitted,
                driver.ninDocSubmitted,
                driver.addressDocSubmitted,
                driver.vehicleLicenseDocSubmitted,
                driver.insuranceDocSubmitted,
              ].filter(Boolean).length;

              return (
                <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                  <TableCell className="font-medium">
                    <button
                      className="text-left hover:underline cursor-pointer"
                      onClick={() => setSelectedDriver(driver)}
                      data-testid={`link-driver-profile-${driver.id}`}
                    >
                      {driver.fullName}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {driver.city || "\u2014"}
                  </TableCell>
                  <TableCell>{driver.phone}</TableCell>
                  <TableCell className="font-mono text-xs">{driver.licensePlate || "\u2014"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{docsSubmitted}/6</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {driver.createdAt ? formatDate(driver.createdAt) : "\u2014"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={driver.status} />
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDriver(driver)}
                          data-testid={`button-view-driver-${driver.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {(driver.status === "pending" || driver.status === "correction_required") && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate({ type: "driver", id: driver.userId })}
                              disabled={approveMutation.isPending || rejectMutation.isPending || correctionMutation.isPending}
                              data-testid={`button-approve-driver-${driver.id}`}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRejectDialog(driver)}
                              disabled={approveMutation.isPending || rejectMutation.isPending || correctionMutation.isPending}
                              data-testid={`button-reject-driver-${driver.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
                              onClick={() => openCorrectionDialog(driver)}
                              disabled={approveMutation.isPending || rejectMutation.isPending || correctionMutation.isPending}
                              data-testid={`button-correction-driver-${driver.id}`}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Correction
                            </Button>
                          </>
                        )}
                        {driver.status === "approved" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectDialog(driver)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            data-testid={`button-suspend-driver-${driver.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Suspend
                          </Button>
                        )}
                        {(driver.status === "suspended" || driver.status === "rejected") && (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ type: "driver", id: driver.userId })}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            data-testid={`button-reinstate-driver-${driver.id}`}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Reinstate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/")}
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Approval Queue</h1>
              <p className="text-sm text-muted-foreground">Review and approve pending driver registrations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="status-counters">
          <Card className="cursor-pointer hover:border-yellow-400 transition-colors" onClick={() => setStatusFilter("pending")} data-testid="counter-pending">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-green-400 transition-colors" onClick={() => setStatusFilter("approved")} data-testid="counter-approved">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{statusCounts.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-red-400 transition-colors" onClick={() => setStatusFilter("rejected")} data-testid="counter-rejected">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{statusCounts.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-purple-400 transition-colors" onClick={() => setStatusFilter("correction_required")} data-testid="counter-correction">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Correction</p>
                  <p className="text-2xl font-bold text-purple-600">{statusCounts.correction_required}</p>
                </div>
                <RotateCcw className="h-8 w-8 text-purple-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="drivers" className="gap-2" data-testid="tab-drivers">
              <Car className="h-4 w-4" />
              Drivers
              {statusFilter === "pending" && filteredDrivers.length > 0 && (
                <Badge variant="secondary" className="ml-1">{filteredDrivers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="trainees" className="gap-2" data-testid="tab-trainees">
              <GraduationCap className="h-4 w-4" />
              Trainees
              {traineeDrivers.length > 0 && (
                <Badge variant="secondary" className="ml-1">{traineeDrivers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="riders" className="gap-2" data-testid="tab-riders-pending">
              <Users className="h-4 w-4" />
              Riders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      Driver Management
                    </CardTitle>
                    <CardDescription>
                      Review driver registrations, view documents, and manage approval status
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  <div className="flex items-center gap-1">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name, phone, plate..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-[200px] h-9"
                      data-testid="input-search-drivers"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[160px] h-9" data-testid="select-status-filter">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" data-testid="option-pending">Pending</SelectItem>
                        <SelectItem value="approved" data-testid="option-approved">Approved</SelectItem>
                        <SelectItem value="rejected" data-testid="option-rejected">Rejected</SelectItem>
                        <SelectItem value="correction_required" data-testid="option-correction">Correction Required</SelectItem>
                        <SelectItem value="suspended" data-testid="option-suspended">Suspended</SelectItem>
                        <SelectItem value="all" data-testid="option-all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger className="w-[140px] h-9" data-testid="select-city-filter">
                        <SelectValue placeholder="City" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" data-testid="option-city-all">All Cities</SelectItem>
                        {uniqueCities.map((city) => (
                          <SelectItem key={city} value={city} data-testid={`option-city-${city}`}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-[160px] h-9"
                      data-testid="input-date-filter"
                    />
                    {dateFilter && (
                      <Button size="sm" variant="ghost" className="h-9 px-2" onClick={() => setDateFilter("")} data-testid="button-clear-date">
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {driversLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading drivers...
                  </div>
                ) : (
                  renderDriverTable(filteredDrivers, true)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trainees">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                  Trainee Drivers
                </CardTitle>
                <CardDescription>
                  Drivers who have not completed verification or are in training
                </CardDescription>
              </CardHeader>
              <CardContent>
                {driversLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading trainee drivers...
                  </div>
                ) : traineeDrivers.length === 0 ? (
                  <EmptyState
                    icon={GraduationCap}
                    title="No trainee drivers"
                    description="All drivers have completed their verification process."
                  />
                ) : (
                  renderDriverTable(traineeDrivers, true)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="riders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  Rider Registrations
                </CardTitle>
                <CardDescription>
                  Rider accounts are automatically approved upon registration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Users}
                  title="No approval required"
                  description="Riders are automatically approved when they register. No manual approval is needed."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedDriver} onOpenChange={(open) => { if (!open) setSelectedDriver(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Driver Profile
            </DialogTitle>
            <DialogDescription>
              Review driver details and submitted documents
            </DialogDescription>
          </DialogHeader>

          {selectedDriver && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium" data-testid="text-driver-name">{selectedDriver.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={selectedDriver.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="text-sm" data-testid="text-driver-city">{selectedDriver.city || "\u2014"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm" data-testid="text-driver-phone">{selectedDriver.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="text-sm">{selectedDriver.vehicleMake} {selectedDriver.vehicleModel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">License Plate</p>
                  <p className="text-sm font-mono" data-testid="text-driver-plate">{selectedDriver.licensePlate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm" data-testid="text-driver-email">{selectedDriver.email || "\u2014"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Applied</p>
                  <p className="text-sm">{selectedDriver.createdAt ? formatDate(selectedDriver.createdAt) : "\u2014"}</p>
                </div>
              </div>

              {selectedDriver.rejectionReason && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                    {selectedDriver.status === "correction_required" ? "Correction Reason" : "Rejection Reason"}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300" data-testid="text-rejection-reason">
                    {selectedDriver.rejectionReason}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Submitted Documents
                </h4>
                <div className="space-y-2">
                  {driverDocs?.documents ? (
                    driverDocs.documents.map((doc) => (
                      <div key={doc.type} className="flex items-center justify-between p-2 rounded-md border">
                        <div className="flex items-center gap-2">
                          <DocStatusIcon submitted={doc.submitted} verified={doc.verified} />
                          <div className="flex items-center gap-2">
                            {doc.hasData && (
                              <button
                                className="w-10 h-10 rounded border bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all"
                                onClick={() => viewDocument(selectedDriver.userId, doc.type)}
                                data-testid={`thumb-doc-${doc.type}`}
                              >
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </button>
                            )}
                            <span className="text-sm">{doc.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.verified && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                              Verified
                            </Badge>
                          )}
                          {doc.submitted && !doc.verified && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                              Pending Review
                            </Badge>
                          )}
                          {!doc.submitted && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Not Uploaded
                            </Badge>
                          )}
                          {doc.hasData && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewDocument(selectedDriver.userId, doc.type)}
                              disabled={docLoading}
                              data-testid={`button-view-doc-${doc.type}`}
                            >
                              {docLoading && viewingDocType === doc.type ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">Loading documents...</p>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => forceApproveDocsMutation.mutate(selectedDriver.userId)}
                  disabled={forceApproveDocsMutation.isPending}
                  data-testid="button-force-approve-docs"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {forceApproveDocsMutation.isPending ? "Approving Docs..." : "Force Approve Documents"}
                </Button>
                {(selectedDriver.status === "pending" || selectedDriver.status === "correction_required") && (
                  <>
                    <Button
                      onClick={() => approveMutation.mutate({ type: "driver", id: selectedDriver.userId })}
                      disabled={approveMutation.isPending}
                      data-testid="button-approve-from-profile"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      {approveMutation.isPending ? "Approving..." : "Approve Driver"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => openRejectDialog(selectedDriver)}
                      disabled={rejectMutation.isPending}
                      data-testid="button-reject-from-profile"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
                      onClick={() => openCorrectionDialog(selectedDriver)}
                      disabled={correctionMutation.isPending}
                      data-testid="button-correction-from-profile"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {correctionMutation.isPending ? "Requesting..." : "Request Correction"}
                    </Button>
                  </>
                )}
                {selectedDriver.status === "approved" && (
                  <Button
                    variant="destructive"
                    onClick={() => openRejectDialog(selectedDriver)}
                    disabled={rejectMutation.isPending}
                    data-testid="button-suspend-from-profile"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Suspend Driver
                  </Button>
                )}
                {(selectedDriver.status === "rejected" || selectedDriver.status === "suspended") && (
                  <Button
                    onClick={() => approveMutation.mutate({ type: "driver", id: selectedDriver.userId })}
                    disabled={approveMutation.isPending}
                    data-testid="button-reinstate-from-profile"
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    {approveMutation.isPending ? "Reinstating..." : "Reinstate Driver"}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Driver Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {rejectTarget?.fullName}'s application. This reason will be visible to the driver.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason (optional but recommended)..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
            data-testid="input-rejection-reason"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="button-cancel-reject">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={correctionDialogOpen} onOpenChange={setCorrectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Document Correction</DialogTitle>
            <DialogDescription>
              Ask {correctionTarget?.fullName} to re-upload their documents. The driver will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Explain what needs to be corrected (optional)..."
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            className="min-h-[100px]"
            data-testid="input-correction-reason"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCorrectionDialogOpen(false)} data-testid="button-cancel-correction">
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={confirmCorrection}
              disabled={correctionMutation.isPending}
              data-testid="button-confirm-correction"
            >
              {correctionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Request Correction
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={docViewerOpen} onOpenChange={setDocViewerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document Viewer</DialogTitle>
          </DialogHeader>
          {viewingDocData && (
            <div className="flex justify-center">
              <img
                src={viewingDocData}
                alt="Driver document"
                className="max-h-[500px] rounded-md object-contain"
                data-testid="img-document-viewer"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
