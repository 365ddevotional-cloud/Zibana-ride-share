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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserCheck, XCircle, Car, Users, Clock, GraduationCap, Filter } from "lucide-react";

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
    case "suspended":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          Suspended
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function ApprovalsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("drivers");
  const [statusFilter, setStatusFilter] = useState("pending");

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

  const approveMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      return apiRequest("POST", "/api/admin/approvals/approve", { type, id });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.type === "driver" ? "Driver Approved" : "Rider Approved",
        description: `The ${variables.type} has been approved successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
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
    onSuccess: (_, variables) => {
      toast({
        title: variables.type === "driver" ? "Driver Rejected" : "Rider Rejected",
        description: `The ${variables.type} has been rejected.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject. Please try again.",
        variant: "destructive",
      });
    },
  });

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
              <TableHead>Applied</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                <TableCell className="font-medium">{driver.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{driver.email || "—"}</TableCell>
                <TableCell>{driver.phone}</TableCell>
                <TableCell>{driver.vehicleMake} {driver.vehicleModel}</TableCell>
                <TableCell className="text-muted-foreground">
                  {driver.createdAt ? formatDate(driver.createdAt) : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={driver.status} />
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
                            onClick={() => rejectMutation.mutate({ type: "driver", id: driver.userId })}
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
                          onClick={() => rejectMutation.mutate({ type: "driver", id: driver.userId, reason: "Suspended by admin" })}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          data-testid={`button-suspend-driver-${driver.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      )}
                      {driver.status === "suspended" && (
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
            ))}
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
              <p className="text-sm text-muted-foreground">Review and approve pending registrations</p>
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
                      Review driver registrations and manage their status
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
    </div>
  );
}
