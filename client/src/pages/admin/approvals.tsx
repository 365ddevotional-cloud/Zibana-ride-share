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
import { ArrowLeft, UserCheck, XCircle, Car, Users, Clock } from "lucide-react";

interface PendingDriver {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
  status: string;
  createdAt: string;
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

export default function ApprovalsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("drivers");

  const { data: pendingDrivers = [], isLoading: driversLoading } = useQuery<PendingDriver[]>({
    queryKey: ["/api/admin/approvals", "drivers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/approvals?type=driver&status=pending");
      if (!res.ok) throw new Error("Failed to fetch pending drivers");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
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
    mutationFn: async ({ type, id, reason }: { type: string; id: number; reason?: string }) => {
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
            <TabsTrigger value="drivers" className="gap-2" data-testid="tab-drivers-pending">
              <Car className="h-4 w-4" />
              Drivers Pending
              {pendingDrivers.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingDrivers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="riders" className="gap-2" data-testid="tab-riders-pending">
              <Users className="h-4 w-4" />
              Riders Pending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Pending Driver Approvals
                </CardTitle>
                <CardDescription>
                  Review driver registrations and approve or reject their applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {driversLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading pending drivers...
                  </div>
                ) : pendingDrivers.length === 0 ? (
                  <EmptyState
                    icon={UserCheck}
                    title="No pending approvals"
                    description="All driver applications have been reviewed. New applications will appear here."
                  />
                ) : (
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
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingDrivers.map((driver) => (
                          <TableRow key={driver.id} data-testid={`row-pending-driver-${driver.id}`}>
                            <TableCell className="font-medium">{driver.fullName}</TableCell>
                            <TableCell className="text-muted-foreground">{driver.email || "—"}</TableCell>
                            <TableCell>{driver.phone}</TableCell>
                            <TableCell>{driver.vehicleMake} {driver.vehicleModel}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {driver.createdAt ? formatDate(driver.createdAt) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                                Pending
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
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
