import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DriverProfile } from "@shared/schema";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  UserX,
  FileText,
  GraduationCap,
  ShieldCheck,
  Star,
  Phone,
  Mail,
  Car,
  CalendarDays,
} from "lucide-react";

type DriverWithUser = DriverProfile & { email?: string };

interface DriverDocument {
  type: string;
  label: string;
  submitted: boolean;
  verified: boolean;
  hasData: boolean;
}

export default function AdminDriverDetail({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: drivers = [], isLoading } = useQuery<DriverWithUser[]>({
    queryKey: ["/api/admin/drivers"],
  });

  const driver = drivers.find((d) => d.userId === userId);

  const { data: documents = [] } = useQuery<DriverDocument[]>({
    queryKey: ["/api/admin/driver", userId, "documents"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/driver/${userId}/documents`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
    enabled: !!driver,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const response = await apiRequest("POST", `/api/admin/driver/${userId}/status`, { status, reason });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      const labels: Record<string, string> = {
        approved: "Driver approved",
        rejected: "Driver rejected",
        suspended: "Driver suspended",
      };
      toast({ title: labels[variables.status] || "Status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const toggleTrainingMutation = useMutation({
    mutationFn: async ({ isTraining }: { isTraining: boolean }) => {
      const response = await apiRequest("POST", `/api/admin/driver/${userId}/training`, { isTraining });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: variables.isTraining ? "Training mode enabled" : "Training mode disabled" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update training", description: error.message, variant: "destructive" });
    },
  });

  function getInitials(name?: string): string {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  function formatDate(dateStr?: string | Date | null): string {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="py-12 text-center text-sm text-muted-foreground">Loading driver details...</div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users/drivers")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Drivers
        </Button>
        <div className="py-12 text-center text-sm text-muted-foreground" data-testid="text-not-found">
          Driver not found.
        </div>
      </div>
    );
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
            <BreadcrumbLink asChild>
              <Link href="/admin/users/drivers" data-testid="breadcrumb-drivers">Drivers</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="breadcrumb-current">{driver.fullName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-4 flex-wrap border-b pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {driver.profilePhoto ? <AvatarImage src={driver.profilePhoto} alt={driver.fullName} /> : null}
            <AvatarFallback>{getInitials(driver.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-driver-name">{driver.fullName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={driver.status as any} />
              {driver.isTraining && (
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                  Training Mode
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {driver.status === "pending" && (
            <>
              <Button
                size="sm"
                onClick={() => updateStatusMutation.mutate({ status: "approved" })}
                disabled={updateStatusMutation.isPending}
                data-testid="button-approve"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatusMutation.mutate({ status: "rejected", reason: "Rejected by admin" })}
                disabled={updateStatusMutation.isPending}
                data-testid="button-reject"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatusMutation.mutate({ status: "suspended" })}
                disabled={updateStatusMutation.isPending}
                data-testid="button-suspend"
              >
                <UserX className="h-4 w-4 mr-1" />
                Suspend
              </Button>
            </>
          )}
          {driver.status === "approved" && !driver.isTraining && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleTrainingMutation.mutate({ isTraining: true })}
                disabled={toggleTrainingMutation.isPending}
                data-testid="button-assign-training"
              >
                <GraduationCap className="h-4 w-4 mr-1" />
                Assign to Training
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatusMutation.mutate({ status: "suspended" })}
                disabled={updateStatusMutation.isPending}
                data-testid="button-suspend"
              >
                <UserX className="h-4 w-4 mr-1" />
                Suspend
              </Button>
            </>
          )}
          {driver.status === "approved" && driver.isTraining && (
            <Button
              size="sm"
              onClick={() => toggleTrainingMutation.mutate({ isTraining: false })}
              disabled={toggleTrainingMutation.isPending}
              data-testid="button-mark-approved"
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Mark as Fully Approved
            </Button>
          )}
          {driver.status === "suspended" && (
            <Button
              size="sm"
              onClick={() => updateStatusMutation.mutate({ status: "approved" })}
              disabled={updateStatusMutation.isPending}
              data-testid="button-reinstate"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Reinstate
            </Button>
          )}
          {driver.status === "rejected" && (
            <Button
              size="sm"
              onClick={() => updateStatusMutation.mutate({ status: "approved" })}
              disabled={updateStatusMutation.isPending}
              data-testid="button-re-approve"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Re-approve
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-contact">
          <CardHeader className="pb-3 gap-2">
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm" data-testid="text-email">{driver.email || "--"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm" data-testid="text-phone">{driver.phone || "--"}</span>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm" data-testid="text-joined">Joined {formatDate(driver.createdAt)}</span>
            </div>
            {driver.averageRating && (
              <div className="flex items-center gap-3">
                <Star className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm" data-testid="text-rating">
                  {parseFloat(driver.averageRating).toFixed(1)} ({driver.totalRatings} ratings)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-vehicle">
          <CardHeader className="pb-3 gap-2">
            <CardTitle className="text-sm">Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Car className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm" data-testid="text-vehicle">
                {driver.vehicleMake} {driver.vehicleModel} ({(driver as any).vehicleYear || "--"})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-4 text-center shrink-0">LP</span>
              <span className="text-sm" data-testid="text-plate">{driver.licensePlate || "--"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-4 text-center shrink-0">VC</span>
              <span className="text-sm" data-testid="text-color">{(driver as any).vehicleColor || "--"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-documents">
        <CardHeader className="pb-3 gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.type}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  data-testid={`doc-row-${doc.type}`}
                >
                  <span className="text-sm">{doc.label}</span>
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
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No documents available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
