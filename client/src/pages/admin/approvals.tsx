import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, UserCheck, XCircle, Car, Users, Clock, GraduationCap, Filter, Eye, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

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
  isTrainee?: boolean;
  verificationStatus?: string;
  rejectionReason?: string;
  identityDocSubmitted?: boolean;
  driversLicenseDocSubmitted?: boolean;
  ninDocSubmitted?: boolean;
  addressDocSubmitted?: boolean;
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
  const [selectedDriver, setSelectedDriver] = useState<PendingDriver | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PendingDriver | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [docViewerOpen, setDocViewerOpen] = useState(false);
  const [viewingDocType, setViewingDocType] = useState<string | null>(null);
  const [viewingDocData, setViewingDocData] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  const { data: allDrivers = [], isLoading: driversLoading } = useQuery<PendingDriver[]>({
    queryKey: ["/api/admin/approvals", "drivers", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/approvals?type=driver&status=${statusFilter}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return res.json();
    },
  });

  const traineeDrivers = allDrivers.filter(
    (d) => d.verificationStatus === "unverified" || d.verificationStatus === "pending"
  );

  const { data: driverDocs } = useQuery<{ documents: DriverDocument[] }>({
    queryKey: ["/api/admin/driver", selectedDriver?.userId, "documents"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/driver/${selectedDriver!.userId}/documents`, {
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
    onSuccess: (_, variables) => {
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

  const openRejectDialog = (driver: PendingDriver) => {
    setRejectTarget(driver);
    setRejectionReason("");
    setRejectDialogOpen(true);
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

  const viewDocument = async (userId: string, docType: string) => {
    setDocLoading(true);
    setViewingDocType(docType);
    try {
      const res = await fetch(`/api/admin/driver/${userId}/document/${docType}`, {
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
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Vehicle</TableHead>
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
                  <TableCell className="text-muted-foreground">{driver.email || "\u2014"}</TableCell>
                  <TableCell>{driver.phone}</TableCell>
                  <TableCell>{driver.vehicleMake} {driver.vehicleModel}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{docsSubmitted}/4</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {driver.createdAt ? formatDate(driver.createdAt) : "\u2014"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={driver.status} />
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDriver(driver)}
                          data-testid={`button-view-driver-${driver.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {driver.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate({ type: "driver", id: driver.userId })}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              data-testid={`button-approve-driver-${driver.id}`}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRejectDialog(driver)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              data-testid={`button-reject-driver-${driver.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
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

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="drivers" className="gap-2" data-testid="tab-drivers">
              <Car className="h-4 w-4" />
              Drivers
              {statusFilter === "pending" && allDrivers.length > 0 && (
                <Badge variant="secondary" className="ml-1">{allDrivers.length}</Badge>
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
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" data-testid="option-pending">Pending</SelectItem>
                        <SelectItem value="approved" data-testid="option-approved">Approved</SelectItem>
                        <SelectItem value="rejected" data-testid="option-rejected">Rejected</SelectItem>
                        <SelectItem value="suspended" data-testid="option-suspended">Suspended</SelectItem>
                        <SelectItem value="all" data-testid="option-all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {driversLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading drivers...
                  </div>
                ) : (
                  renderDriverTable(allDrivers, true)
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
        <DialogContent className="max-w-lg">
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
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm" data-testid="text-driver-email">{selectedDriver.email || "\u2014"}</p>
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
                  <p className="text-sm">{selectedDriver.licensePlate}</p>
                </div>
              </div>

              {selectedDriver.rejectionReason && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Rejection Reason</p>
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
                          <span className="text-sm">{doc.label}</span>
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

              <DialogFooter className="gap-2">
                {selectedDriver.status === "pending" && (
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
