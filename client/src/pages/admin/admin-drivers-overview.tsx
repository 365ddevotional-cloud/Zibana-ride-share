import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DriverProfile } from "@shared/schema";
import {
  Car,
  Clock,
  ShieldAlert,
  Search,
  Eye,
  UserX,
  CheckCircle,
  AlertTriangle,
  Star,
  Wifi,
  XCircle,
  FileText,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

type DriverWithUser = DriverProfile & { email?: string };

interface DriverDocument {
  type: string;
  label: string;
  submitted: boolean;
  verified: boolean;
  hasData: boolean;
}

export default function AdminDriversOverview() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineFilter, setOnlineFilter] = useState<string>("all");
  const [docsDialogDriver, setDocsDialogDriver] = useState<DriverWithUser | null>(null);

  const { data: drivers = [], isLoading } = useQuery<DriverWithUser[]>({
    queryKey: ["/api/admin/drivers"],
  });

  const { data: docsData } = useQuery<DriverDocument[]>({
    queryKey: ["/api/admin/driver", docsDialogDriver?.userId, "documents"],
    queryFn: async () => {
      if (!docsDialogDriver) return [];
      const res = await fetch(`/api/admin/driver/${docsDialogDriver.userId}/documents`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
    enabled: !!docsDialogDriver,
  });

  const updateDriverStatusMutation = useMutation({
    mutationFn: async ({ driverId, status, reason }: { driverId: string; status: string; reason?: string }) => {
      const response = await apiRequest("POST", `/api/admin/driver/${driverId}/status`, {
        status,
        reason,
      });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      const labels: Record<string, string> = {
        approved: "Driver approved",
        rejected: "Driver rejected",
        suspended: "Driver suspended",
        pending: "Driver status reset to pending",
      };
      toast({ title: labels[variables.status] || "Driver status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update driver", description: error.message, variant: "destructive" });
    },
  });

  const toggleTrainingMutation = useMutation({
    mutationFn: async ({ userId, isTraining }: { userId: string; isTraining: boolean }) => {
      const response = await apiRequest("POST", `/api/admin/driver/${userId}/training`, {
        isTraining,
      });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: variables.isTraining ? "Training mode enabled" : "Training mode disabled",
        description: variables.isTraining
          ? "Driver is now in training mode and will not receive real ride requests."
          : "Driver has been marked as fully approved and can receive ride requests.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update training status", description: error.message, variant: "destructive" });
    },
  });

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (onlineFilter === "online" && !d.isOnline) return false;
      if (onlineFilter === "offline" && d.isOnline) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = d.fullName?.toLowerCase().includes(q);
        const phoneMatch = d.phone?.toLowerCase().includes(q);
        const plateMatch = d.licensePlate?.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !plateMatch) return false;
      }
      return true;
    });
  }, [drivers, statusFilter, onlineFilter, searchQuery]);

  const totalDrivers = drivers.length;
  const onlineDrivers = drivers.filter((d) => d.isOnline).length;
  const suspendedDrivers = drivers.filter((d) => d.status === "suspended").length;
  const pendingDrivers = drivers.filter((d) => d.status === "pending").length;

  const lowRatingDrivers = drivers.filter(
    (d) => d.averageRating && parseFloat(d.averageRating) < 3.5 && d.status === "approved"
  );

  const metrics = [
    { label: "Total Drivers", value: totalDrivers, icon: Car, accent: "text-blue-600 dark:text-blue-400" },
    { label: "Online Now", value: onlineDrivers, icon: Wifi, accent: "text-green-600 dark:text-green-400" },
    { label: "Suspended", value: suspendedDrivers, icon: ShieldAlert, accent: "text-red-600 dark:text-red-400" },
    { label: "Pending Approval", value: pendingDrivers, icon: Clock, accent: "text-orange-600 dark:text-orange-400" },
  ];

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb data-testid="breadcrumb-nav">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/overview" data-testid="breadcrumb-admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="breadcrumb-current">Drivers</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold" data-testid="text-drivers-title">Driver Operations</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage driver accounts, approvals, and compliance</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="driver-metrics-row">
        {metrics.map((m) => (
          <Card key={m.label} data-testid={`metric-${m.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className={`h-4 w-4 shrink-0 ${m.accent}`} />
                <span className="text-xs text-muted-foreground truncate">{m.label}</span>
              </div>
              {isLoading ? (
                <p className="text-lg font-semibold text-muted-foreground">--</p>
              ) : (
                <p className="text-lg font-semibold">{m.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="driver-filter-bar">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-driver-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={onlineFilter} onValueChange={setOnlineFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-online-filter">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            {(statusFilter !== "all" || onlineFilter !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setOnlineFilter("all");
                  setSearchQuery("");
                }}
                data-testid="button-clear-filters"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="driver-list-card">
        <CardHeader className="pb-3 gap-2">
          <CardTitle className="text-base">
            {isLoading ? "Loading..." : `${filteredDrivers.length} driver${filteredDrivers.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading driver data...</div>
          ) : filteredDrivers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground" data-testid="empty-drivers">
              {drivers.length === 0
                ? "No drivers registered yet. Driver registrations will appear here."
                : "No drivers match the current filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Training</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {driver.profilePhoto ? (
                              <AvatarImage src={driver.profilePhoto} alt={driver.fullName} />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {getInitials(driver.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{driver.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{driver.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm truncate">
                          {driver.vehicleMake} {driver.vehicleModel}
                        </p>
                        <p className="text-xs text-muted-foreground">{driver.licensePlate}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={driver.status as any} />
                      </TableCell>
                      <TableCell>
                        {driver.isTraining ? (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                            Training
                          </Badge>
                        ) : driver.status === "approved" ? (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
                            Active
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={driver.isOnline ? "online" : "offline"} />
                      </TableCell>
                      <TableCell>
                        {driver.averageRating ? (
                          <div className="flex items-center gap-1">
                            <Star className={`h-3.5 w-3.5 ${parseFloat(driver.averageRating) < 3.5 ? "text-orange-500" : "text-amber-500"}`} />
                            <span className="text-sm">{parseFloat(driver.averageRating).toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({driver.totalRatings})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No ratings</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {driver.verificationStatus === "verified" ? (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs border-0">
                            {driver.verificationStatus === "unverified" ? "Unverified" : "Pending"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDocsDialogDriver(driver)}
                            data-testid={`button-docs-${driver.id}`}
                            title="View Documents"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>

                          {driver.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateDriverStatusMutation.mutate({
                                    driverId: driver.userId,
                                    status: "approved",
                                  })
                                }
                                disabled={updateDriverStatusMutation.isPending}
                                data-testid={`button-approve-${driver.id}`}
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateDriverStatusMutation.mutate({
                                    driverId: driver.userId,
                                    status: "rejected",
                                    reason: "Rejected by admin",
                                  })
                                }
                                disabled={updateDriverStatusMutation.isPending}
                                data-testid={`button-reject-${driver.id}`}
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateDriverStatusMutation.mutate({
                                    driverId: driver.userId,
                                    status: "suspended",
                                  })
                                }
                                disabled={updateDriverStatusMutation.isPending}
                                data-testid={`button-suspend-pending-${driver.id}`}
                                title="Suspend"
                              >
                                <UserX className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                              </Button>
                            </>
                          )}

                          {driver.status === "approved" && !driver.isTraining && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  toggleTrainingMutation.mutate({
                                    userId: driver.userId,
                                    isTraining: true,
                                  })
                                }
                                disabled={toggleTrainingMutation.isPending}
                                data-testid={`button-assign-training-${driver.id}`}
                                title="Assign to Training"
                              >
                                <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateDriverStatusMutation.mutate({
                                    driverId: driver.userId,
                                    status: "suspended",
                                  })
                                }
                                disabled={updateDriverStatusMutation.isPending}
                                data-testid={`button-suspend-${driver.id}`}
                                title="Suspend"
                              >
                                <UserX className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                            </>
                          )}

                          {driver.status === "approved" && driver.isTraining && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                toggleTrainingMutation.mutate({
                                  userId: driver.userId,
                                  isTraining: false,
                                })
                              }
                              disabled={toggleTrainingMutation.isPending}
                              data-testid={`button-mark-approved-${driver.id}`}
                              title="Mark as Fully Approved"
                            >
                              <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </Button>
                          )}

                          {driver.status === "suspended" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateDriverStatusMutation.mutate({
                                  driverId: driver.userId,
                                  status: "approved",
                                })
                              }
                              disabled={updateDriverStatusMutation.isPending}
                              data-testid={`button-reinstate-${driver.id}`}
                              title="Reinstate"
                            >
                              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                          )}

                          {driver.status === "rejected" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateDriverStatusMutation.mutate({
                                  driverId: driver.userId,
                                  status: "approved",
                                })
                              }
                              disabled={updateDriverStatusMutation.isPending}
                              data-testid={`button-re-approve-${driver.id}`}
                              title="Re-approve"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {lowRatingDrivers.length > 0 && (
        <div data-testid="attention-low-ratings">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Attention Required</h2>
          <Card className="border-orange-200 dark:border-orange-800/40">
            <CardHeader className="pb-2 gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <CardTitle className="text-sm">Low-Rated Drivers</CardTitle>
                <Badge variant="secondary" className="text-xs">{lowRatingDrivers.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {lowRatingDrivers.slice(0, 5).map((driver) => (
                  <div
                    key={driver.id}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5"
                    data-testid={`attention-driver-${driver.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(driver.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{driver.fullName}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="h-3 w-3 text-orange-500" />
                      <span className="text-sm font-medium">
                        {parseFloat(driver.averageRating!).toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
                {lowRatingDrivers.length > 5 && (
                  <p className="text-xs text-muted-foreground px-2">
                    +{lowRatingDrivers.length - 5} more drivers below 3.5 rating
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!docsDialogDriver} onOpenChange={(open) => { if (!open) setDocsDialogDriver(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-docs-dialog-title">
              Documents: {docsDialogDriver?.fullName}
            </DialogTitle>
            <DialogDescription>
              Document submission and verification status for this driver.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {docsData && docsData.length > 0 ? (
              docsData.map((doc) => (
                <div
                  key={doc.type}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  data-testid={`doc-row-${doc.type}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{doc.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.submitted ? (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                        Submitted
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs border-0">Not Submitted</Badge>
                    )}
                    {doc.verified ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs border-0">Unverified</Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {docsDialogDriver ? "Loading documents..." : "No documents available."}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocsDialogDriver(null)} data-testid="button-close-docs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
