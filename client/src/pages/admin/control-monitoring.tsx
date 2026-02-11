import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  MapPin,
  Car,
  Clock,
  Eye,
  Users,
  Activity,
} from "lucide-react";
import type { Trip, DriverProfile } from "@shared/schema";

type TripWithDetails = Trip & { driverName?: string; riderName?: string };
type DriverWithUser = DriverProfile & { email?: string };

function getStatusBadge(status: string) {
  switch (status) {
    case "in_progress":
      return <Badge variant="default" data-testid="badge-status-active">Active</Badge>;
    case "completed":
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" data-testid="badge-status-completed">Completed</Badge>;
    case "cancelled":
      return <Badge variant="destructive" data-testid="badge-status-cancelled">Cancelled</Badge>;
    case "requested":
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" data-testid="badge-status-requested">Requested</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-status-other">{status}</Badge>;
  }
}

function formatDuration(startDate: string | Date | null, endDate: string | Date | null): string {
  if (!startDate) return "--";
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "<1 min";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

function getDriverStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Approved</Badge>;
    case "pending":
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Pending</Badge>;
    case "suspended":
      return <Badge variant="destructive">Suspended</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function ControlMonitoringPage() {
  const [tripSearch, setTripSearch] = useState("");
  const [tripFilter, setTripFilter] = useState("all");
  const [driverSearch, setDriverSearch] = useState("");

  const { data: trips, isLoading: tripsLoading } = useQuery<TripWithDetails[]>({
    queryKey: ["/api/admin/trips"],
  });

  const { data: drivers, isLoading: driversLoading } = useQuery<DriverWithUser[]>({
    queryKey: ["/api/admin/drivers"],
  });

  const filteredTrips = (trips || []).filter((trip) => {
    const matchesSearch =
      !tripSearch ||
      trip.id?.toString().toLowerCase().includes(tripSearch.toLowerCase()) ||
      trip.driverName?.toLowerCase().includes(tripSearch.toLowerCase()) ||
      trip.riderName?.toLowerCase().includes(tripSearch.toLowerCase());

    const matchesFilter =
      tripFilter === "all" ||
      (tripFilter === "active" && trip.status === "in_progress") ||
      (tripFilter === "completed" && trip.status === "completed") ||
      (tripFilter === "cancelled" && trip.status === "cancelled");

    return matchesSearch && matchesFilter;
  });

  const filteredDrivers = (drivers || []).filter((driver) => {
    return (
      !driverSearch ||
      driver.fullName?.toLowerCase().includes(driverSearch.toLowerCase()) ||
      driver.email?.toLowerCase().includes(driverSearch.toLowerCase())
    );
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="monitoring-summary">
        <Card className="rounded-xl border border-slate-200 dark:border-slate-700">
          <CardContent className="flex items-center gap-3 py-4 px-4">
            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Trips</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{trips?.length ?? "--"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-slate-200 dark:border-slate-700">
          <CardContent className="flex items-center gap-3 py-4 px-4">
            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{trips?.filter(t => t.status === "in_progress").length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-slate-200 dark:border-slate-700">
          <CardContent className="flex items-center gap-3 py-4 px-4">
            <Car className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Drivers</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{drivers?.length ?? "--"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-slate-200 dark:border-slate-700">
          <CardContent className="flex items-center gap-3 py-4 px-4">
            <Users className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Approved</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{drivers?.filter(d => d.status === "approved").length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-slate-200 dark:border-slate-700" data-testid="trips-table-card">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">Active Trips</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Trip ID, Rider, or Driver..."
                value={tripSearch}
                onChange={(e) => setTripSearch(e.target.value)}
                className="pl-9"
                data-testid="input-trip-search"
              />
            </div>
            <Select value={tripFilter} onValueChange={setTripFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-trip-filter">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trips</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {tripsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="no-trips">
              No trips match your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip ID</TableHead>
                    <TableHead>Rider</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips.slice(0, 25).map((trip) => (
                    <TableRow key={trip.id} data-testid={`trip-row-${trip.id}`}>
                      <TableCell className="font-mono text-xs">{trip.id?.toString().slice(0, 8)}...</TableCell>
                      <TableCell className="text-sm">{trip.riderName || "Unknown"}</TableCell>
                      <TableCell className="text-sm">{trip.driverName || "Unassigned"}</TableCell>
                      <TableCell>{getStatusBadge(trip.status || "unknown")}</TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDuration((trip as any).startedAt ?? (trip as any).started_at ?? null, (trip as any).completedAt ?? (trip as any).completed_at ?? null)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" data-testid={`button-view-trip-${trip.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200 dark:border-slate-700" data-testid="drivers-table-card">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">Driver Status</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search drivers..."
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              className="pl-9"
              data-testid="input-driver-search"
            />
          </div>
        </CardHeader>
        <CardContent>
          {driversLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400" data-testid="no-drivers">
              No drivers found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.slice(0, 25).map((driver) => (
                    <TableRow key={driver.id} data-testid={`driver-row-${driver.id}`}>
                      <TableCell className="text-sm font-medium">{driver.fullName || driver.email || "Unknown"}</TableCell>
                      <TableCell>{getDriverStatusBadge(driver.status || "pending")}</TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                        {(driver as any).averageRating ? `${parseFloat((driver as any).averageRating).toFixed(1)} / 5` : "N/A"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                        {driver.updatedAt ? new Date(driver.updatedAt).toLocaleDateString() : "--"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
