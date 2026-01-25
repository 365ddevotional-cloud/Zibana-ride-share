import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { FullPageLoading } from "@/components/loading-spinner";
import { TripFilterBar } from "@/components/trip-filter-bar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { NotificationBell } from "@/components/notification-bell";
import { 
  MapPin, 
  Users, 
  Clock,
  Car,
  Plus,
  LogOut,
  History,
  Building2,
  CheckCircle,
  XCircle,
  Star,
  Receipt,
  AlertTriangle,
  TrendingUp,
  FileText
} from "lucide-react";
import type { Trip, TripCoordinatorProfile, Dispute } from "@shared/schema";
import { SupportSection } from "@/components/support-section";

const profileSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required"),
  organizationType: z.enum(["ngo", "hospital", "church", "school", "gov", "corporate", "other"]),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
});

const tripBookingSchema = z.object({
  pickupLocation: z.string().min(3, "Please enter a pickup location"),
  dropoffLocation: z.string().min(3, "Please enter a dropoff location"),
  passengerCount: z.coerce.number().min(1, "At least 1 passenger").max(8, "Maximum 8 passengers"),
  passengerName: z.string().min(2, "Passenger name is required"),
  passengerContact: z.string().optional(),
  notesForDriver: z.string().optional(),
});

const disputeSchema = z.object({
  tripId: z.string(),
  category: z.enum(["fare", "behavior", "cancellation", "other"]),
  description: z.string().min(10, "Please provide more details"),
});

type ProfileForm = z.infer<typeof profileSchema>;
type TripBookingForm = z.infer<typeof tripBookingSchema>;
type DisputeForm = z.infer<typeof disputeSchema>;

type TripWithDetails = Trip & { driverName?: string; organizationName?: string };

const ORGANIZATION_TYPES = [
  { value: "ngo", label: "NGO" },
  { value: "hospital", label: "Hospital" },
  { value: "church", label: "Church" },
  { value: "school", label: "School" },
  { value: "gov", label: "Government" },
  { value: "corporate", label: "Corporate" },
  { value: "other", label: "Other" },
];

export default function CoordinatorDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("trips");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [tripStatusFilter, setTripStatusFilter] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery<TripCoordinatorProfile | null>({
    queryKey: ["/api/coordinator/profile"],
    enabled: !!user,
  });

  const { data: stats } = useQuery<{ totalTrips: number; completedTrips: number; activeTrips: number; totalFares: string }>({
    queryKey: ["/api/coordinator/stats"],
    enabled: !!user && !!profile,
  });

  const buildTripQueryParams = () => {
    const params = new URLSearchParams();
    if (tripStatusFilter && tripStatusFilter !== "all") params.append("status", tripStatusFilter);
    if (tripStartDate) params.append("startDate", tripStartDate);
    if (tripEndDate) params.append("endDate", tripEndDate);
    return params.toString();
  };

  const tripQueryParams = buildTripQueryParams();
  const tripQueryKey = tripQueryParams 
    ? `/api/coordinator/trips?${tripQueryParams}` 
    : "/api/coordinator/trips";

  const { data: trips = [], isLoading: tripsLoading } = useQuery<TripWithDetails[]>({
    queryKey: ["/api/coordinator/trips", tripStatusFilter, tripStartDate, tripEndDate],
    queryFn: async () => {
      const res = await fetch(tripQueryKey, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trips");
      return res.json();
    },
    enabled: !!user && !!profile,
  });

  const { data: disputes = [] } = useQuery<Dispute[]>({
    queryKey: ["/api/coordinator/disputes"],
    enabled: !!user && !!profile,
  });

  const clearTripFilters = () => {
    setTripStatusFilter("");
    setTripStartDate("");
    setTripEndDate("");
  };

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      organizationName: "",
      organizationType: "other",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const bookingForm = useForm<TripBookingForm>({
    resolver: zodResolver(tripBookingSchema),
    defaultValues: {
      pickupLocation: "",
      dropoffLocation: "",
      passengerCount: 1,
      passengerName: "",
      passengerContact: "",
      notesForDriver: "",
    },
  });

  const disputeForm = useForm<DisputeForm>({
    resolver: zodResolver(disputeSchema),
    defaultValues: {
      tripId: "",
      category: "other",
      description: "",
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const res = await apiRequest("POST", "/api/coordinator/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile created", description: "Your organization profile has been set up." });
      queryClient.invalidateQueries({ queryKey: ["/api/coordinator/profile"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        logout();
        setLocation("/");
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bookTripMutation = useMutation({
    mutationFn: async (data: TripBookingForm) => {
      const res = await apiRequest("POST", "/api/coordinator/trips", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Trip booked", description: "Your trip request has been submitted." });
      queryClient.invalidateQueries({ queryKey: ["/api/coordinator/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coordinator/stats"] });
      setShowBookingForm(false);
      bookingForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        logout();
        setLocation("/");
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const res = await apiRequest("POST", `/api/coordinator/trips/${tripId}/cancel`, { reason: "Cancelled by coordinator" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Trip cancelled", description: "The trip has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ["/api/coordinator/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coordinator/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const submitDisputeMutation = useMutation({
    mutationFn: async (data: DisputeForm) => {
      const res = await apiRequest("POST", "/api/coordinator/disputes", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Dispute submitted", description: "Your dispute has been submitted for review." });
      queryClient.invalidateQueries({ queryKey: ["/api/coordinator/disputes"] });
      setDisputeDialogOpen(false);
      disputeForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const submitRatingMutation = useMutation({
    mutationFn: async ({ tripId, score, comment }: { tripId: string; score: number; comment: string }) => {
      const res = await apiRequest("POST", "/api/coordinator/ratings", { tripId, score, comment });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rating submitted", description: "Thank you for your feedback." });
      setRatingDialogOpen(false);
      setRatingScore(5);
      setRatingComment("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  if (authLoading || profileLoading) {
    return <FullPageLoading />;
  }

  if (!user) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-2 flex-wrap">
            <Logo />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Set Up Your Organization Profile
              </CardTitle>
              <CardDescription>
                Before you can book trips for beneficiaries, please complete your organization profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => createProfileMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your organization name" {...field} data-testid="input-org-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="organizationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-org-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ORGANIZATION_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="billing@organization.com" {...field} data-testid="input-contact-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 234 567 8900" {...field} data-testid="input-contact-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={createProfileMutation.isPending} data-testid="button-create-profile">
                    {createProfileMutation.isPending ? "Creating..." : "Create Profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="hidden md:flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{profile.organizationName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <UserAvatar user={user} size="sm" />
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-trips">{stats?.totalTrips || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-completed-trips">{stats?.completedTrips || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-trips">{stats?.activeTrips || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organization Charges</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-fares">${stats?.totalFares || "0.00"}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="trips" data-testid="tab-trips">
              <Car className="h-4 w-4 mr-2" />
              Organization Trips
            </TabsTrigger>
            <TabsTrigger value="disputes" data-testid="tab-disputes">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Disputes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <TripFilterBar
                statusFilter={tripStatusFilter}
                onStatusChange={setTripStatusFilter}
                startDate={tripStartDate}
                onStartDateChange={setTripStartDate}
                endDate={tripEndDate}
                onEndDateChange={setTripEndDate}
                onClear={clearTripFilters}
              />
              <Button onClick={() => setShowBookingForm(true)} data-testid="button-book-trip">
                <Plus className="h-4 w-4 mr-2" />
                Book Trip
              </Button>
            </div>

            {showBookingForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Book a Trip for Beneficiary</CardTitle>
                  <CardDescription>Enter the passenger and trip details</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...bookingForm}>
                    <form onSubmit={bookingForm.handleSubmit((data) => bookTripMutation.mutate(data))} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={bookingForm.control}
                          name="passengerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Passenger Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Full name of passenger" {...field} data-testid="input-passenger-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={bookingForm.control}
                          name="passengerContact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Passenger Contact (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Phone number" {...field} data-testid="input-passenger-contact" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={bookingForm.control}
                          name="pickupLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pickup Location</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter pickup address" {...field} data-testid="input-pickup" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={bookingForm.control}
                          name="dropoffLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dropoff Location</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter destination" {...field} data-testid="input-dropoff" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={bookingForm.control}
                          name="passengerCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Passengers</FormLabel>
                              <FormControl>
                                <Input type="number" min={1} max={8} {...field} data-testid="input-passenger-count" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={bookingForm.control}
                          name="notesForDriver"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes for Driver (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Special instructions" {...field} data-testid="input-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setShowBookingForm(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={bookTripMutation.isPending} data-testid="button-submit-trip">
                          {bookTripMutation.isPending ? "Booking..." : "Book Trip"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Organization Trips</CardTitle>
                <CardDescription>All trips booked by your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {tripsLoading ? (
                  <div className="flex justify-center py-8">Loading...</div>
                ) : trips.length === 0 ? (
                  <EmptyState
                    icon={Car}
                    title="No trips yet"
                    description="Book your first trip for a beneficiary"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Passenger</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fare</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trips.map((trip) => (
                        <TableRow key={trip.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{trip.passengerName || "N/A"}</div>
                              {trip.passengerContact && (
                                <div className="text-xs text-muted-foreground">{trip.passengerContact}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-green-500" />
                                {trip.pickupLocation}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3 text-red-500" />
                                {trip.dropoffLocation}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{trip.driverName || "Pending"}</TableCell>
                          <TableCell>
                            <StatusBadge status={trip.status} />
                          </TableCell>
                          <TableCell>{trip.fareAmount ? `$${trip.fareAmount}` : "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {trip.createdAt ? new Date(trip.createdAt).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {trip.status === "completed" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTrip(trip);
                                      setReceiptDialogOpen(true);
                                    }}
                                    data-testid={`button-receipt-${trip.id}`}
                                  >
                                    <Receipt className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTrip(trip);
                                      setRatingDialogOpen(true);
                                    }}
                                    data-testid={`button-rate-${trip.id}`}
                                  >
                                    <Star className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTrip(trip);
                                      disputeForm.setValue("tripId", trip.id);
                                      setDisputeDialogOpen(true);
                                    }}
                                    data-testid={`button-dispute-${trip.id}`}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {(trip.status === "requested" || trip.status === "accepted") && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => cancelTripMutation.mutate(trip.id)}
                                  disabled={cancelTripMutation.isPending}
                                  data-testid={`button-cancel-${trip.id}`}
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Disputes</CardTitle>
                <CardDescription>Track the status of disputes you've submitted</CardDescription>
              </CardHeader>
              <CardContent>
                {disputes.length === 0 ? (
                  <EmptyState
                    icon={AlertTriangle}
                    title="No disputes"
                    description="You haven't submitted any disputes yet"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trip ID</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {disputes.map((dispute) => (
                        <TableRow key={dispute.id}>
                          <TableCell className="font-mono text-xs">{dispute.tripId.slice(0, 8)}...</TableCell>
                          <TableCell className="capitalize">{dispute.category}</TableCell>
                          <TableCell className="max-w-xs truncate">{dispute.description}</TableCell>
                          <TableCell>
                            <StatusBadge status={dispute.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {dispute.createdAt ? new Date(dispute.createdAt).toLocaleDateString() : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <SupportSection 
            userTrips={trips.map((t: TripWithDetails) => ({ 
              id: t.id, 
              pickupLocation: t.pickupLocation || "",
              dropoffLocation: t.dropoffLocation || ""
            }))} 
          />
        </div>
      </main>

      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trip Receipt</DialogTitle>
            <DialogDescription>Receipt for completed trip</DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Organization:</span>
                  <span className="font-medium">{profile?.organizationName}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Passenger:</span>
                  <span className="font-medium">{selectedTrip.passengerName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From:</span>
                  <span>{selectedTrip.pickupLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span>{selectedTrip.dropoffLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Passengers:</span>
                  <span>{selectedTrip.passengerCount}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{selectedTrip.completedAt ? new Date(selectedTrip.completedAt).toLocaleString() : "-"}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Fare:</span>
                  <span>${selectedTrip.fareAmount}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Dispute</DialogTitle>
            <DialogDescription>Report an issue with this trip</DialogDescription>
          </DialogHeader>
          <Form {...disputeForm}>
            <form onSubmit={disputeForm.handleSubmit((data) => submitDisputeMutation.mutate(data))} className="space-y-4">
              <FormField
                control={disputeForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fare">Fare Issue</SelectItem>
                        <SelectItem value="behavior">Driver Behavior</SelectItem>
                        <SelectItem value="cancellation">Cancellation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={disputeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Please describe the issue..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDisputeDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitDisputeMutation.isPending}>
                  {submitDisputeMutation.isPending ? "Submitting..." : "Submit Dispute"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Driver</DialogTitle>
            <DialogDescription>Rate your experience with this trip</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant={ratingScore >= star ? "default" : "outline"}
                  size="icon"
                  onClick={() => setRatingScore(star)}
                >
                  <Star className={`h-5 w-5 ${ratingScore >= star ? "fill-current" : ""}`} />
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="Add a comment (optional)"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedTrip) {
                  submitRatingMutation.mutate({ tripId: selectedTrip.id, score: ratingScore, comment: ratingComment });
                }
              }}
              disabled={submitRatingMutation.isPending}
            >
              {submitRatingMutation.isPending ? "Submitting..." : "Submit Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
