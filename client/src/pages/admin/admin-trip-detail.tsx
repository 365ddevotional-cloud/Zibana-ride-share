import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Car,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { API_BASE } from "@/lib/apiBase";

type TripDetail = {
  id: string;
  riderId: string;
  driverId?: string;
  riderName?: string;
  riderEmail?: string;
  driverName?: string;
  driverEmail?: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: string;
  fareAmount?: string;
  driverPayout?: string;
  commissionAmount?: string;
  currencyCode?: string;
  createdAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  paymentSource?: string;
};

function getStatusBadge(status: string) {
  switch (status) {
    case "in_progress":
      return <Badge variant="default" data-testid="badge-status">In Progress</Badge>;
    case "completed":
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" data-testid="badge-status">Completed</Badge>;
    case "cancelled":
      return <Badge variant="destructive" data-testid="badge-status">Cancelled</Badge>;
    case "requested":
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" data-testid="badge-status">Requested</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-status">{status}</Badge>;
  }
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCurrency(amount?: string | null, currencyCode?: string): string {
  if (!amount) return "--";
  const num = parseFloat(amount);
  if (isNaN(num)) return "--";
  const code = currencyCode || "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(num);
  } catch {
    return `${code} ${num.toFixed(2)}`;
  }
}

function computeDurationMs(trip: TripDetail, now: Date): number | null {
  const { status, createdAt, acceptedAt, completedAt, cancelledAt } = trip;
  if (status === "completed") {
    const end = completedAt ? new Date(completedAt) : null;
    const start = acceptedAt ? new Date(acceptedAt) : createdAt ? new Date(createdAt) : null;
    if (!end || !start) return null;
    return end.getTime() - start.getTime();
  }
  if (status === "in_progress") {
    const start = acceptedAt ? new Date(acceptedAt) : createdAt ? new Date(createdAt) : null;
    if (!start) return null;
    return now.getTime() - start.getTime();
  }
  if (status === "cancelled") {
    const end = cancelledAt ? new Date(cancelledAt) : null;
    const start = createdAt ? new Date(createdAt) : null;
    if (!end || !start) return null;
    return end.getTime() - start.getTime();
  }
  if (status === "requested") {
    const start = createdAt ? new Date(createdAt) : null;
    if (!start) return null;
    return now.getTime() - start.getTime();
  }
  return null;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return "--";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function useLiveDuration(trip: TripDetail | undefined): string {
  const [now, setNow] = useState(() => new Date());
  const isLive = trip?.status === "in_progress" || trip?.status === "requested";

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  if (!trip) return "--";
  return formatDuration(computeDurationMs(trip, now));
}

export default function AdminTripDetail({ tripId }: { tripId: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: trip, isLoading } = useQuery<TripDetail>({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/trips/${tripId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load trip");
      return res.json();
    },
  });

  const duration = useLiveDuration(trip);

  function handleBack() {
    try {
      navigate("/admin/control/monitoring");
    } catch (err) {
      toast({ title: "Navigation failed", description: "Could not navigate back.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="trip-detail-loading">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="space-y-6" data-testid="trip-detail-not-found">
        <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Monitoring
        </Button>
        <div className="py-12 text-center text-sm text-muted-foreground" data-testid="text-not-found">
          Trip record not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="trip-detail-page">
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
              <Link href="/admin/control/monitoring" data-testid="breadcrumb-monitoring">Monitoring</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="breadcrumb-current">Trip Details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Monitoring
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-trip-heading">Trip Details</h1>
          <p className="text-sm font-mono text-muted-foreground mt-1" data-testid="text-trip-id">{trip.id}</p>
        </div>
        <div data-testid="text-trip-status">
          {getStatusBadge(trip.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-rider">
          <CardHeader className="pb-3 gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Rider
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium" data-testid="text-rider-name">{trip.riderName || "Unknown"}</p>
            {trip.riderEmail && (
              <p className="text-sm text-muted-foreground" data-testid="text-rider-email">{trip.riderEmail}</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-driver">
          <CardHeader className="pb-3 gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="h-4 w-4" />
              Driver
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium" data-testid="text-driver-name">{trip.driverName || "Unassigned"}</p>
            {trip.driverEmail && (
              <p className="text-sm text-muted-foreground" data-testid="text-driver-email">{trip.driverEmail}</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-locations">
          <CardHeader className="pb-3 gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm" data-testid="text-pickup">{trip.pickupLocation}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dropoff</p>
              <p className="text-sm" data-testid="text-dropoff">{trip.dropoffLocation}</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-timestamps">
          <CardHeader className="pb-3 gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timestamps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm" data-testid="text-created">{formatDateTime(trip.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Accepted</p>
              <p className="text-sm" data-testid="text-accepted">{formatDateTime(trip.acceptedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-sm" data-testid="text-completed">{formatDateTime(trip.completedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-mono" data-testid="text-duration">{duration}</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-financials">
          <CardHeader className="pb-3 gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Financials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Fare Amount</p>
              <p className="text-sm font-medium" data-testid="text-fare">{formatCurrency(trip.fareAmount, trip.currencyCode)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commission</p>
              <p className="text-sm" data-testid="text-commission">{formatCurrency(trip.commissionAmount, trip.currencyCode)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Driver Payout</p>
              <p className="text-sm" data-testid="text-payout">{formatCurrency(trip.driverPayout, trip.currencyCode)}</p>
            </div>
            {trip.paymentSource && (
              <div>
                <p className="text-xs text-muted-foreground">Payment Source</p>
                <p className="text-sm" data-testid="text-payment-source">{trip.paymentSource}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {trip.cancellationReason && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30" data-testid="card-cancellation">
          <CardHeader className="pb-3 gap-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Cancellation Reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 dark:text-red-400" data-testid="text-cancellation-reason">{trip.cancellationReason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
