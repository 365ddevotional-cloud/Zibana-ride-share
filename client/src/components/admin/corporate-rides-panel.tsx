import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { Building, Users, MapPin, Calendar, Wallet, Ban, CheckCircle, Clock, Car, XCircle, Search } from "lucide-react";

interface CorporateOrganization {
  id: string;
  userId: string;
  organizationName: string;
  organizationType: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  walletBalance: number | string;
  currency: string;
  totalRides: number;
  monthlyRides: number;
  createdAt: string;
}

interface CorporateMember {
  id: string;
  name: string;
  email: string;
  organizationName: string;
  rideCount: number;
  status: string;
}

interface CorporateTrip {
  id: string;
  organizationName: string;
  riderName: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: string;
  fareAmount: number | string;
  cancellationFee: number | string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

interface CorporateScheduledRide {
  id: string;
  organizationName: string;
  riderName: string;
  pickupLocation: string;
  dropoffLocation: string;
  scheduledPickupAt: string;
  status: string;
  fareAmount: number | string;
}

interface CorporateWallet {
  id: string;
  organizationName: string;
  balance: number | string;
  currency: string;
  isFrozen: boolean;
  userId: string;
}

interface WalletTransaction {
  id: string;
  amount: number | string;
  type: string;
  description: string;
  createdAt: string;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(amount: number | string | null | undefined, currency = "NGN") {
  const val = parseFloat(String(amount || "0"));
  return `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function OrganizationsTab() {
  const { toast } = useToast();

  const { data: organizations = [], isLoading } = useQuery<CorporateOrganization[]>({
    queryKey: ["/api/admin/corporate/organizations"],
  });

  const suspendMutation = useMutation({
    mutationFn: (orgId: string) =>
      apiRequest("POST", `/api/admin/corporate/organizations/${orgId}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/corporate/organizations"] });
      toast({ title: "Organization suspended" });
    },
    onError: (err: Error) =>
      toast({ title: "Failed to suspend", description: err.message, variant: "destructive" }),
  });

  const activateMutation = useMutation({
    mutationFn: (orgId: string) =>
      apiRequest("POST", `/api/admin/corporate/organizations/${orgId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/corporate/organizations"] });
      toast({ title: "Organization activated" });
    },
    onError: (err: Error) =>
      toast({ title: "Failed to activate", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading organizations...</div>;
  }

  if (organizations.length === 0) {
    return (
      <EmptyState
        icon={Building}
        title="No organizations"
        description="No corporate organizations have been registered yet"
      />
    );
  }

  return (
    <Card data-testid="card-organizations">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Corporate Organizations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table data-testid="table-organizations">
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Total Rides</TableHead>
                <TableHead>Monthly Rides</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id} data-testid={`row-org-${org.id}`}>
                  <TableCell className="font-medium" data-testid={`text-org-name-${org.id}`}>
                    {org.organizationName}
                  </TableCell>
                  <TableCell data-testid={`text-org-type-${org.id}`}>{org.organizationType}</TableCell>
                  <TableCell data-testid={`text-org-email-${org.id}`}>{org.contactEmail}</TableCell>
                  <TableCell>
                    {org.status === "active" ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-org-status-${org.id}`}>
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" data-testid={`badge-org-status-${org.id}`}>
                        Suspended
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell data-testid={`text-org-balance-${org.id}`}>
                    {formatCurrency(org.walletBalance, org.currency)}
                  </TableCell>
                  <TableCell data-testid={`text-org-total-rides-${org.id}`}>{org.totalRides}</TableCell>
                  <TableCell data-testid={`text-org-monthly-rides-${org.id}`}>{org.monthlyRides}</TableCell>
                  <TableCell>
                    {org.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => suspendMutation.mutate(org.id)}
                        disabled={suspendMutation.isPending}
                        data-testid={`button-suspend-org-${org.id}`}
                      >
                        <Ban className="mr-1.5 h-3.5 w-3.5" />
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateMutation.mutate(org.id)}
                        disabled={activateMutation.isPending}
                        data-testid={`button-activate-org-${org.id}`}
                      >
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function MembersTab() {
  const { toast } = useToast();

  const { data: members = [], isLoading } = useQuery<CorporateMember[]>({
    queryKey: ["/api/admin/corporate/members"],
  });

  const revokeMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiRequest("POST", `/api/admin/corporate/members/${memberId}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/corporate/members"] });
      toast({ title: "Member access revoked" });
    },
    onError: (err: Error) =>
      toast({ title: "Failed to revoke access", description: err.message, variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiRequest("POST", `/api/admin/corporate/members/${memberId}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/corporate/members"] });
      toast({ title: "Member access restored" });
    },
    onError: (err: Error) =>
      toast({ title: "Failed to restore access", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading members...</div>;
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No members"
        description="No corporate members have been linked to organizations yet"
      />
    );
  }

  return (
    <Card data-testid="card-members">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Corporate Members
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table data-testid="table-members">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Ride Count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                  <TableCell className="font-medium" data-testid={`text-member-name-${member.id}`}>
                    {member.name}
                  </TableCell>
                  <TableCell data-testid={`text-member-email-${member.id}`}>{member.email}</TableCell>
                  <TableCell data-testid={`text-member-org-${member.id}`}>{member.organizationName}</TableCell>
                  <TableCell data-testid={`text-member-rides-${member.id}`}>{member.rideCount}</TableCell>
                  <TableCell>
                    {member.status === "active" ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-member-status-${member.id}`}>
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" data-testid={`badge-member-status-${member.id}`}>
                        Revoked
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revokeMutation.mutate(member.id)}
                        disabled={revokeMutation.isPending}
                        data-testid={`button-revoke-member-${member.id}`}
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreMutation.mutate(member.id)}
                        disabled={restoreMutation.isPending}
                        data-testid={`button-restore-member-${member.id}`}
                      >
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        Restore
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function TripHistoryTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: trips = [], isLoading } = useQuery<CorporateTrip[]>({
    queryKey: ["/api/admin/corporate/trips"],
  });

  const filteredTrips = trips.filter((trip) => {
    if (statusFilter !== "all" && trip.status !== statusFilter) return false;
    if (orgFilter && !trip.organizationName.toLowerCase().includes(orgFilter.toLowerCase())) return false;
    if (dateFrom && new Date(trip.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(trip.createdAt) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading trip history...</div>;
  }

  return (
    <Card data-testid="card-trip-history">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Corporate Trip History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by organization..."
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="w-[200px]"
              data-testid="input-org-filter"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-trip-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
            data-testid="input-date-from"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
            data-testid="input-date-to"
          />
        </div>

        {filteredTrips.length === 0 ? (
          <EmptyState
            icon={Car}
            title="No trips found"
            description="No corporate trips match the current filters"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table data-testid="table-trips">
              <TableHeader>
                <TableRow>
                  <TableHead>Trip ID</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Rider</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Dropoff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fare</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((trip) => (
                  <TableRow key={trip.id} data-testid={`row-trip-${trip.id}`}>
                    <TableCell className="font-mono text-sm" data-testid={`text-trip-id-${trip.id}`}>
                      {trip.id.length > 8 ? `${trip.id.slice(0, 8)}...` : trip.id}
                    </TableCell>
                    <TableCell data-testid={`text-trip-org-${trip.id}`}>{trip.organizationName}</TableCell>
                    <TableCell data-testid={`text-trip-rider-${trip.id}`}>{trip.riderName}</TableCell>
                    <TableCell data-testid={`text-trip-pickup-${trip.id}`}>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="max-w-[150px] truncate">{trip.pickupLocation}</span>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-trip-dropoff-${trip.id}`}>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="max-w-[150px] truncate">{trip.dropoffLocation}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {trip.status === "completed" && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-trip-status-${trip.id}`}>
                            Completed
                          </Badge>
                        )}
                        {trip.status === "in_progress" && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" data-testid={`badge-trip-status-${trip.id}`}>
                            In Progress
                          </Badge>
                        )}
                        {trip.status === "cancelled" && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" data-testid={`badge-trip-status-${trip.id}`}>
                            Cancelled
                          </Badge>
                        )}
                        {trip.status === "pending" && (
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" data-testid={`badge-trip-status-${trip.id}`}>
                            Pending
                          </Badge>
                        )}
                        {trip.status !== "completed" && trip.status !== "in_progress" && trip.status !== "cancelled" && trip.status !== "pending" && (
                          <Badge data-testid={`badge-trip-status-${trip.id}`}>{trip.status}</Badge>
                        )}
                        {trip.status === "cancelled" && trip.cancellationReason && (
                          <p className="text-xs text-muted-foreground" data-testid={`text-trip-cancel-reason-${trip.id}`}>
                            Reason: {trip.cancellationReason}
                          </p>
                        )}
                        {trip.status === "cancelled" && trip.cancelledAt && (
                          <p className="text-xs text-muted-foreground" data-testid={`text-trip-cancelled-at-${trip.id}`}>
                            {formatDateTime(trip.cancelledAt)}
                          </p>
                        )}
                        {trip.cancellationFee && parseFloat(String(trip.cancellationFee)) > 0 && (
                          <p className="text-xs text-orange-600 dark:text-orange-400" data-testid={`text-trip-cancel-fee-${trip.id}`}>
                            A cancellation fee was applied
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-trip-fare-${trip.id}`}>
                      {formatCurrency(trip.fareAmount)}
                    </TableCell>
                    <TableCell data-testid={`text-trip-date-${trip.id}`}>
                      {formatDate(trip.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduledRidesTab() {
  const [subFilter, setSubFilter] = useState("upcoming");

  const { data: scheduledRides = [], isLoading } = useQuery<CorporateScheduledRide[]>({
    queryKey: ["/api/admin/corporate/scheduled-rides"],
  });

  const now = new Date();
  const filteredRides = scheduledRides.filter((ride) => {
    if (subFilter === "upcoming") {
      return ride.status !== "completed" && new Date(ride.scheduledPickupAt) >= now;
    }
    return ride.status === "completed" || new Date(ride.scheduledPickupAt) < now;
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading scheduled rides...</div>;
  }

  return (
    <Card data-testid="card-scheduled-rides">
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Scheduled Rides
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={subFilter === "upcoming" ? "default" : "outline"}
            onClick={() => setSubFilter("upcoming")}
            data-testid="button-filter-upcoming"
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Upcoming
          </Button>
          <Button
            size="sm"
            variant={subFilter === "completed" ? "default" : "outline"}
            onClick={() => setSubFilter("completed")}
            data-testid="button-filter-completed"
          >
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            Completed
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredRides.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={subFilter === "upcoming" ? "No upcoming rides" : "No completed rides"}
            description={subFilter === "upcoming" ? "No scheduled corporate rides are upcoming" : "No scheduled corporate rides have been completed"}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table data-testid="table-scheduled-rides">
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Rider</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Dropoff</TableHead>
                  <TableHead>Scheduled At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fare</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRides.map((ride) => (
                  <TableRow key={ride.id} data-testid={`row-scheduled-${ride.id}`}>
                    <TableCell data-testid={`text-scheduled-org-${ride.id}`}>{ride.organizationName}</TableCell>
                    <TableCell data-testid={`text-scheduled-rider-${ride.id}`}>{ride.riderName}</TableCell>
                    <TableCell data-testid={`text-scheduled-pickup-${ride.id}`}>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="max-w-[150px] truncate">{ride.pickupLocation}</span>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-scheduled-dropoff-${ride.id}`}>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="max-w-[150px] truncate">{ride.dropoffLocation}</span>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-scheduled-time-${ride.id}`}>
                      {formatDateTime(ride.scheduledPickupAt)}
                    </TableCell>
                    <TableCell>
                      {ride.status === "scheduled" && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" data-testid={`badge-scheduled-status-${ride.id}`}>
                          Scheduled
                        </Badge>
                      )}
                      {ride.status === "completed" && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-scheduled-status-${ride.id}`}>
                          Completed
                        </Badge>
                      )}
                      {ride.status === "cancelled" && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" data-testid={`badge-scheduled-status-${ride.id}`}>
                          Cancelled
                        </Badge>
                      )}
                      {ride.status === "in_progress" && (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" data-testid={`badge-scheduled-status-${ride.id}`}>
                          In Progress
                        </Badge>
                      )}
                      {!["scheduled", "completed", "cancelled", "in_progress"].includes(ride.status) && (
                        <Badge data-testid={`badge-scheduled-status-${ride.id}`}>{ride.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-scheduled-fare-${ride.id}`}>
                      {formatCurrency(ride.fareAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WalletControlsTab() {
  const { toast } = useToast();
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [transactionsOpen, setTransactionsOpen] = useState(false);

  const { data: wallets = [], isLoading } = useQuery<CorporateWallet[]>({
    queryKey: ["/api/admin/corporate/wallets"],
  });

  const { data: transactions = [] } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/admin/corporate/wallets", selectedWalletId, "transactions"],
    enabled: !!selectedWalletId && transactionsOpen,
  });

  const freezeMutation = useMutation({
    mutationFn: (walletId: string) =>
      apiRequest("POST", `/api/admin/corporate/wallets/${walletId}/freeze`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/corporate/wallets"] });
      toast({ title: "Wallet frozen" });
    },
    onError: (err: Error) =>
      toast({ title: "Failed to freeze wallet", description: err.message, variant: "destructive" }),
  });

  const unfreezeMutation = useMutation({
    mutationFn: (walletId: string) =>
      apiRequest("POST", `/api/admin/corporate/wallets/${walletId}/unfreeze`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/corporate/wallets"] });
      toast({ title: "Wallet unfrozen" });
    },
    onError: (err: Error) =>
      toast({ title: "Failed to unfreeze wallet", description: err.message, variant: "destructive" }),
  });

  function openTransactions(walletId: string) {
    setSelectedWalletId(walletId);
    setTransactionsOpen(true);
  }

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading wallets...</div>;
  }

  if (wallets.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No wallets"
        description="No corporate wallets have been created yet"
      />
    );
  }

  return (
    <>
      <Card data-testid="card-wallet-controls">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Corporate Wallets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table data-testid="table-wallets">
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((wallet) => (
                  <TableRow key={wallet.id} data-testid={`row-wallet-${wallet.id}`}>
                    <TableCell className="font-medium" data-testid={`text-wallet-org-${wallet.id}`}>
                      {wallet.organizationName}
                    </TableCell>
                    <TableCell data-testid={`text-wallet-balance-${wallet.id}`}>
                      {formatCurrency(wallet.balance, wallet.currency)}
                    </TableCell>
                    <TableCell data-testid={`text-wallet-currency-${wallet.id}`}>{wallet.currency}</TableCell>
                    <TableCell>
                      {wallet.isFrozen ? (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" data-testid={`badge-wallet-frozen-${wallet.id}`}>
                          Frozen
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-wallet-active-${wallet.id}`}>
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {wallet.isFrozen ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unfreezeMutation.mutate(wallet.id)}
                            disabled={unfreezeMutation.isPending}
                            data-testid={`button-unfreeze-wallet-${wallet.id}`}
                          >
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                            Unfreeze
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => freezeMutation.mutate(wallet.id)}
                            disabled={freezeMutation.isPending}
                            data-testid={`button-freeze-wallet-${wallet.id}`}
                          >
                            <Ban className="mr-1.5 h-3.5 w-3.5" />
                            Freeze
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTransactions(wallet.id)}
                          data-testid={`button-view-transactions-${wallet.id}`}
                        >
                          <Clock className="mr-1.5 h-3.5 w-3.5" />
                          History
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={transactionsOpen} onOpenChange={(open) => { setTransactionsOpen(open); if (!open) setSelectedWalletId(null); }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-transactions">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Transaction History
            </DialogTitle>
          </DialogHeader>
          {transactions.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No transactions"
              description="No transactions found for this wallet"
            />
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table data-testid="table-transactions">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell data-testid={`text-tx-date-${tx.id}`}>{formatDateTime(tx.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-tx-type-${tx.id}`}>{tx.type}</Badge>
                      </TableCell>
                      <TableCell data-testid={`text-tx-amount-${tx.id}`}>
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell data-testid={`text-tx-desc-${tx.id}`}>{tx.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CorporateRidesPanel() {
  return (
    <div className="space-y-6" data-testid="corporate-rides-panel">
      <div>
        <h2 className="text-xl font-semibold text-foreground" data-testid="text-corporate-rides-title">
          Corporate & Scheduled Rides
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage corporate organizations, members, trips, scheduled rides, and wallets
        </p>
      </div>

      <Tabs defaultValue="organizations" data-testid="tabs-corporate">
        <TabsList className="flex-wrap" data-testid="tabslist-corporate">
          <TabsTrigger value="organizations" data-testid="tab-organizations">
            <Building className="mr-1.5 h-4 w-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-members">
            <Users className="mr-1.5 h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="trips" data-testid="tab-trips">
            <Car className="mr-1.5 h-4 w-4" />
            Trip History
          </TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled">
            <Calendar className="mr-1.5 h-4 w-4" />
            Scheduled Rides
          </TabsTrigger>
          <TabsTrigger value="wallets" data-testid="tab-wallets">
            <Wallet className="mr-1.5 h-4 w-4" />
            Wallet Controls
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations">
          <OrganizationsTab />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab />
        </TabsContent>
        <TabsContent value="trips">
          <TripHistoryTab />
        </TabsContent>
        <TabsContent value="scheduled">
          <ScheduledRidesTab />
        </TabsContent>
        <TabsContent value="wallets">
          <WalletControlsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
