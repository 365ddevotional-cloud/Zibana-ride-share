import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { FullPageLoading } from "@/components/loading-spinner";
import { TripFilterBar } from "@/components/trip-filter-bar";
import { TripDetailModal } from "@/components/trip-detail-modal";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { 
  Users, 
  Car, 
  MapPin,
  Shield,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  LogOut,
  Activity,
  DollarSign,
  TrendingUp,
  Wallet,
  Briefcase,
  Eye,
  Star,
  AlertTriangle,
  CreditCard,
  ArrowLeftRight,
  BarChart3,
  Download,
  Calendar
} from "lucide-react";
import type { DriverProfile, Trip, User } from "@shared/schema";
import { NotificationBell } from "@/components/notification-bell";

type DriverWithUser = DriverProfile & { email?: string };
type TripWithDetails = Trip & { driverName?: string; riderName?: string };
type RiderWithDetails = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  createdAt?: Date;
};

type PayoutWithDetails = {
  id: string;
  driverId: string;
  tripId?: string;
  type: string;
  amount: string;
  status: string;
  description?: string;
  paidAt?: string;
  paidByAdminId?: string;
  createdAt: string;
  driverName?: string;
};

type DirectorWithDetails = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  status: string;
  createdAt?: string;
};

type RatingWithDetails = {
  id: string;
  tripId: string;
  raterRole: "rider" | "driver";
  raterId: string;
  targetUserId: string;
  score: number;
  comment?: string;
  createdAt: string;
  raterName?: string;
  targetName?: string;
  tripPickup?: string;
  tripDropoff?: string;
};

type DisputeWithDetails = {
  id: string;
  tripId: string;
  raisedByRole: "rider" | "driver";
  raisedById: string;
  againstUserId: string;
  category: string;
  description: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  raisedByName?: string;
  againstUserName?: string;
  tripPickup?: string;
  tripDropoff?: string;
  tripStatus?: string;
};

type RefundWithDetails = {
  id: string;
  tripId: string;
  riderId: string;
  driverId?: string;
  amount: string;
  type: "full" | "partial" | "adjustment";
  status: string;
  reason: string;
  createdByRole: string;
  createdByUserId: string;
  approvedByUserId?: string;
  processedByUserId?: string;
  linkedDisputeId?: string;
  createdAt: string;
  updatedAt: string;
  riderName?: string;
  driverName?: string;
  tripPickup?: string;
  tripDropoff?: string;
  tripStatus?: string;
  createdByName?: string;
  approvedByName?: string;
  processedByName?: string;
};

type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedByUserId: string;
  performedByRole: string;
  metadata?: string;
  createdAt: string;
};

type ChargebackWithDetails = {
  id: string;
  tripId: string;
  paymentProvider: string;
  externalReference: string;
  amount: string;
  currency: string;
  reason?: string;
  status: string;
  reportedAt: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  createdAt: string;
  tripPickup?: string;
  tripDropoff?: string;
  tripFare?: string;
  riderName?: string;
  driverName?: string;
  resolvedByName?: string;
};

type WalletWithDetails = {
  id: string;
  userId: string;
  role: "driver" | "ziba";
  balance: string;
  lockedBalance: string;
  currency: string;
  ownerName?: string;
  pendingPayoutAmount?: string;
  createdAt: string;
  updatedAt: string;
};

type WalletPayoutWithDetails = {
  id: string;
  walletId: string;
  amount: string;
  method: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  initiatedByUserId: string;
  processedByUserId?: string;
  failureReason?: string;
  createdAt: string;
  processedAt?: string;
  driverName?: string;
  driverUserId?: string;
  initiatedByName?: string;
  processedByName?: string;
};

type ReconciliationWithDetails = {
  id: string;
  tripId: string;
  expectedAmount: string;
  actualAmount: string;
  variance: string;
  provider: string;
  status: string;
  reconciledByUserId?: string;
  notes?: string;
  createdAt: string;
  tripPickup?: string;
  tripDropoff?: string;
  reconciledByName?: string;
};

type AnalyticsOverview = {
  trips: { total: number; completed: number; cancelled: number };
  revenue: { grossFares: string; commission: string; driverEarnings: string; netRevenue: string };
  refunds: { total: number; totalAmount: string };
  chargebacks: { total: number; won: number; lost: number; pending: number };
  wallets: { totalBalance: string; lockedBalance: string; availableBalance: string };
  payouts: { processed: number; pending: number; failed: number; totalProcessed: string };
};

type RevenueDataPoint = {
  date: string;
  grossFares: string;
  commission: string;
  driverEarnings: string;
};

interface AdminDashboardProps {
  userRole?: "admin" | "director";
}

export default function AdminDashboard({ userRole = "admin" }: AdminDashboardProps) {
  const isDirector = userRole === "director";
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("drivers");
  const [analyticsRange, setAnalyticsRange] = useState("30d");
  
  const [tripStatusFilter, setTripStatusFilter] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [tripDriverFilter, setTripDriverFilter] = useState("");
  const [tripRiderFilter, setTripRiderFilter] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [tripDetailOpen, setTripDetailOpen] = useState(false);

  const { data: drivers = [], isLoading: driversLoading } = useQuery<DriverWithUser[]>({
    queryKey: ["/api/admin/drivers"],
    enabled: !!user,
  });

  const { data: riders = [], isLoading: ridersLoading } = useQuery<RiderWithDetails[]>({
    queryKey: ["/api/admin/riders"],
    enabled: !!user,
  });

  const buildTripQueryParams = () => {
    const params = new URLSearchParams();
    if (tripStatusFilter && tripStatusFilter !== "all") params.append("status", tripStatusFilter);
    if (tripStartDate) params.append("startDate", tripStartDate);
    if (tripEndDate) params.append("endDate", tripEndDate);
    if (tripDriverFilter) params.append("driverId", tripDriverFilter);
    if (tripRiderFilter) params.append("riderId", tripRiderFilter);
    return params.toString();
  };

  const tripQueryParams = buildTripQueryParams();
  const tripQueryKey = tripQueryParams 
    ? `/api/admin/trips?${tripQueryParams}` 
    : "/api/admin/trips";

  const { data: trips = [], isLoading: tripsLoading } = useQuery<TripWithDetails[]>({
    queryKey: ["/api/admin/trips", tripStatusFilter, tripStartDate, tripEndDate, tripDriverFilter, tripRiderFilter],
    queryFn: async () => {
      const res = await fetch(tripQueryKey, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trips");
      return res.json();
    },
    enabled: !!user,
  });

  const clearTripFilters = () => {
    setTripStatusFilter("");
    setTripStartDate("");
    setTripEndDate("");
    setTripDriverFilter("");
    setTripRiderFilter("");
  };

  const handleTripClick = (trip: TripWithDetails) => {
    setSelectedTrip(trip);
    setTripDetailOpen(true);
  };

  const { data: allRatings = [], isLoading: ratingsLoading } = useQuery<RatingWithDetails[]>({
    queryKey: ["/api/admin/ratings"],
    enabled: !!user,
  });

  const [disputeStatusFilter, setDisputeStatusFilter] = useState<string>("");
  const [disputeCategoryFilter, setDisputeCategoryFilter] = useState<string>("");
  const [disputeRoleFilter, setDisputeRoleFilter] = useState<string>("");
  const [selectedDispute, setSelectedDispute] = useState<DisputeWithDetails | null>(null);
  const [disputeAdminNotes, setDisputeAdminNotes] = useState<string>("");

  const disputeQueryParams = new URLSearchParams();
  if (disputeStatusFilter) disputeQueryParams.set("status", disputeStatusFilter);
  if (disputeCategoryFilter) disputeQueryParams.set("category", disputeCategoryFilter);
  if (disputeRoleFilter) disputeQueryParams.set("raisedByRole", disputeRoleFilter);

  const { data: allDisputes = [], isLoading: disputesLoading } = useQuery<DisputeWithDetails[]>({
    queryKey: ["/api/admin/disputes", disputeStatusFilter, disputeCategoryFilter, disputeRoleFilter],
    enabled: !!user,
  });

  const openDisputes = allDisputes.filter(d => d.status === "open");

  const { data: stats } = useQuery<{
    totalDrivers: number;
    pendingDrivers: number;
    totalTrips: number;
    activeTrips: number;
    totalRiders: number;
    completedTrips: number;
    totalFares: string;
    totalCommission: string;
    totalDriverPayouts: string;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
  });

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<PayoutWithDetails[]>({
    queryKey: ["/api/admin/payouts"],
    enabled: !!user,
  });

  const { data: directors = [], isLoading: directorsLoading } = useQuery<DirectorWithDetails[]>({
    queryKey: ["/api/admin/directors"],
    enabled: !!user && !isDirector,
  });

  // Phase 11 - Wallet queries
  const [walletPayoutStatusFilter, setWalletPayoutStatusFilter] = useState<string>("all");
  const [selectedWalletPayout, setSelectedWalletPayout] = useState<WalletPayoutWithDetails | null>(null);
  const [walletPayoutDetailOpen, setWalletPayoutDetailOpen] = useState(false);
  const [initiatePayoutOpen, setInitiatePayoutOpen] = useState(false);
  const [selectedWalletForPayout, setSelectedWalletForPayout] = useState<WalletWithDetails | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank");
  const [payoutPeriodStart, setPayoutPeriodStart] = useState("");
  const [payoutPeriodEnd, setPayoutPeriodEnd] = useState("");

  const { data: driverWallets = [], isLoading: walletsLoading } = useQuery<WalletWithDetails[]>({
    queryKey: ["/api/admin/wallets"],
    enabled: !!user,
  });

  const walletPayoutQueryKey = walletPayoutStatusFilter && walletPayoutStatusFilter !== "all"
    ? `/api/payouts?status=${walletPayoutStatusFilter}`
    : "/api/payouts";

  const { data: walletPayouts = [], isLoading: walletPayoutsLoading } = useQuery<WalletPayoutWithDetails[]>({
    queryKey: ["/api/payouts", walletPayoutStatusFilter],
    queryFn: async () => {
      const res = await fetch(walletPayoutQueryKey, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch wallet payouts");
      return res.json();
    },
    enabled: !!user,
  });

  const pendingWalletPayouts = walletPayouts.filter(p => p.status === "pending" || p.status === "processing");

  // Phase 12 - Analytics queries
  const { data: analyticsOverview, isLoading: analyticsLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/analytics/overview", analyticsRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/overview?range=${analyticsRange}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!user && !isDirector,
  });

  const { data: revenueData = [] } = useQuery<RevenueDataPoint[]>({
    queryKey: ["/api/analytics/revenue", analyticsRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/revenue?range=${analyticsRange}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch revenue analytics");
      return res.json();
    },
    enabled: !!user && !isDirector && activeTab === "reports",
  });

  const handleExportCSV = async (type: string) => {
    try {
      const res = await fetch(`/api/reports/export?type=${type}&range=${analyticsRange}&format=csv`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_report_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Export successful", description: `${type} report downloaded` });
    } catch (error) {
      toast({ title: "Export failed", description: "Could not generate report", variant: "destructive" });
    }
  };

  const updateDriverStatusMutation = useMutation({
    mutationFn: async ({ driverId, status }: { driverId: string; status: string }) => {
      const response = await apiRequest("POST", `/api/admin/driver/${driverId}/status`, { status });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Driver status updated",
        description: `Driver has been ${variables.status}`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update driver status",
        variant: "destructive",
      });
    },
  });

  const cancelTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const response = await apiRequest("POST", `/api/admin/trip/${tripId}/cancel`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Trip cancelled",
        description: "The trip has been cancelled successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to cancel trip",
        variant: "destructive",
      });
    },
  });

  const markPayoutPaidMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await apiRequest("POST", `/api/admin/payout/${transactionId}/mark-paid`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Payout marked as paid",
        description: "The payout has been successfully marked as paid",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to mark payout as paid",
        variant: "destructive",
      });
    },
  });

  const updateDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, status, adminNotes }: { disputeId: string; status?: string; adminNotes?: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/disputes/${disputeId}`, { status, adminNotes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/disputes"] });
      setSelectedDispute(null);
      setDisputeAdminNotes("");
      toast({
        title: "Dispute updated",
        description: "The dispute has been successfully updated",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update dispute",
        variant: "destructive",
      });
    },
  });

  // Refund state and queries
  const [refundStatusFilter, setRefundStatusFilter] = useState<string>("");
  const [selectedRefund, setSelectedRefund] = useState<RefundWithDetails | null>(null);
  const [refundAuditLogs, setRefundAuditLogs] = useState<AuditLogEntry[]>([]);

  const { data: allRefunds = [], isLoading: refundsLoading } = useQuery<RefundWithDetails[]>({
    queryKey: ["/api/refunds", refundStatusFilter],
    queryFn: async () => {
      const params = refundStatusFilter ? `?status=${refundStatusFilter}` : "";
      const res = await fetch(`/api/refunds${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch refunds");
      return res.json();
    },
    enabled: !!user,
  });

  const pendingRefunds = allRefunds.filter(r => r.status === "pending");

  const fetchRefundAudit = async (refundId: string) => {
    try {
      const res = await fetch(`/api/refunds/${refundId}/audit`, { credentials: "include" });
      if (res.ok) {
        const logs = await res.json();
        setRefundAuditLogs(logs);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    }
  };

  const approveRefundMutation = useMutation({
    mutationFn: async (refundId: string) => {
      const response = await apiRequest("POST", "/api/refunds/approve", { refundId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/refunds"] });
      setSelectedRefund(null);
      toast({ title: "Refund approved", description: "The refund has been approved" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to approve refund", variant: "destructive" });
    },
  });

  const rejectRefundMutation = useMutation({
    mutationFn: async ({ refundId, reason }: { refundId: string; reason?: string }) => {
      const response = await apiRequest("POST", "/api/refunds/reject", { refundId, reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/refunds"] });
      setSelectedRefund(null);
      toast({ title: "Refund rejected", description: "The refund has been rejected" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to reject refund", variant: "destructive" });
    },
  });

  const processRefundMutation = useMutation({
    mutationFn: async (refundId: string) => {
      const response = await apiRequest("POST", "/api/refunds/process", { refundId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/refunds"] });
      setSelectedRefund(null);
      toast({ title: "Refund processed", description: "The refund has been processed" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to process refund", variant: "destructive" });
    },
  });

  const reverseRefundMutation = useMutation({
    mutationFn: async ({ refundId, reason }: { refundId: string; reason?: string }) => {
      const response = await apiRequest("POST", "/api/refunds/reverse", { refundId, reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/refunds"] });
      setSelectedRefund(null);
      toast({ title: "Refund reversed", description: "The refund has been reversed" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to reverse refund", variant: "destructive" });
    },
  });

  // Chargeback state and queries
  const [chargebackStatusFilter, setChargebackStatusFilter] = useState<string>("");
  const [selectedChargeback, setSelectedChargeback] = useState<ChargebackWithDetails | null>(null);
  const [chargebackAuditLogs, setChargebackAuditLogs] = useState<AuditLogEntry[]>([]);
  const [reconciliationStatusFilter, setReconciliationStatusFilter] = useState<string>("");

  const { data: allChargebacks = [], isLoading: chargebacksLoading } = useQuery<ChargebackWithDetails[]>({
    queryKey: ["/api/chargebacks", chargebackStatusFilter],
    queryFn: async () => {
      const params = chargebackStatusFilter ? `?status=${chargebackStatusFilter}` : "";
      const res = await fetch(`/api/chargebacks${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch chargebacks");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: allReconciliations = [], isLoading: reconciliationsLoading } = useQuery<ReconciliationWithDetails[]>({
    queryKey: ["/api/reconciliation", reconciliationStatusFilter],
    queryFn: async () => {
      const params = reconciliationStatusFilter ? `?status=${reconciliationStatusFilter}` : "";
      const res = await fetch(`/api/reconciliation${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reconciliations");
      return res.json();
    },
    enabled: !!user,
  });

  const reportedChargebacks = allChargebacks.filter(c => c.status === "reported");
  const manualReviewReconciliations = allReconciliations.filter(r => r.status === "manual_review");

  const fetchChargebackAudit = async (chargebackId: string) => {
    try {
      const res = await fetch(`/api/chargebacks/${chargebackId}/audit`, { credentials: "include" });
      if (res.ok) {
        const logs = await res.json();
        setChargebackAuditLogs(logs);
      }
    } catch (error) {
      console.error("Failed to fetch chargeback audit logs:", error);
    }
  };

  const resolveChargebackMutation = useMutation({
    mutationFn: async ({ chargebackId, status, reason }: { chargebackId: string; status: string; reason?: string }) => {
      const response = await apiRequest("POST", "/api/chargebacks/resolve", { chargebackId, status, reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chargebacks"] });
      setSelectedChargeback(null);
      toast({ title: "Chargeback updated", description: "The chargeback has been updated" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to update chargeback", variant: "destructive" });
    },
  });

  const reviewReconciliationMutation = useMutation({
    mutationFn: async ({ reconciliationId, status, notes }: { reconciliationId: string; status: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/reconciliation/review", { reconciliationId, status, notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reconciliation"] });
      toast({ title: "Reconciliation reviewed", description: "The reconciliation has been updated" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to review reconciliation", variant: "destructive" });
    },
  });

  // Phase 11 - Wallet Payout mutations
  const initiatePayoutMutation = useMutation({
    mutationFn: async (data: { walletId: string; amount: string; method: string; periodStart: string; periodEnd: string }) => {
      const response = await apiRequest("POST", "/api/payouts/initiate", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      setInitiatePayoutOpen(false);
      setSelectedWalletForPayout(null);
      setPayoutAmount("");
      setPayoutMethod("bank");
      setPayoutPeriodStart("");
      setPayoutPeriodEnd("");
      toast({ title: "Payout initiated", description: "The payout has been initiated and balance held" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to initiate payout", variant: "destructive" });
    },
  });

  const processPayoutMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const response = await apiRequest("POST", "/api/payouts/process", { payoutId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      setWalletPayoutDetailOpen(false);
      toast({ title: "Payout processed", description: "The payout has been processed and driver notified" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to process payout", variant: "destructive" });
    },
  });

  const reversePayoutMutation = useMutation({
    mutationFn: async ({ payoutId, reason }: { payoutId: string; reason: string }) => {
      const response = await apiRequest("POST", "/api/payouts/reverse", { payoutId, reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      setWalletPayoutDetailOpen(false);
      toast({ title: "Payout reversed", description: "The payout has been reversed" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to reverse payout", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading) {
    return <FullPageLoading text="Loading admin dashboard..." />;
  }

  const pendingDrivers = drivers.filter(d => d.status === "pending");
  const pendingPayouts = payouts.filter(p => p.status === "pending");
  const canCancelTrip = (status: string) => ["requested", "accepted", "in_progress"].includes(status);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              isDirector 
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                : "bg-primary/10 text-primary"
            }`}>
              {isDirector ? <Eye className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
              {isDirector ? "Director" : "Admin"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeToggle />
            <UserAvatar user={user} size="sm" />
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{isDirector ? "Director Dashboard" : "Admin Dashboard"}</h1>
          <p className="text-muted-foreground">
            {isDirector 
              ? "Read-only view of drivers, riders, trips, and payouts" 
              : "Manage drivers, riders, and trips"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Car className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalDrivers || 0}</p>
                <p className="text-sm text-muted-foreground">Total Drivers</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingDrivers || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalRiders || 0}</p>
                <p className="text-sm text-muted-foreground">Total Riders</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalTrips || 0}</p>
                <p className="text-sm text-muted-foreground">Total Trips</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.activeTrips || 0}</p>
                <p className="text-sm text-muted-foreground">Active Trips</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.completedTrips || 0}</p>
                  <p className="text-sm text-muted-foreground">Completed Trips</p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-fares">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${stats?.totalFares || "0.00"}</p>
                  <p className="text-sm text-muted-foreground">Total Fares</p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-commission">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${stats?.totalCommission || "0.00"}</p>
                  <p className="text-sm text-muted-foreground">ZIBA Commission (20%)</p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-driver-payouts">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Wallet className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${stats?.totalDriverPayouts || "0.00"}</p>
                  <p className="text-sm text-muted-foreground">Driver Payouts</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="drivers" data-testid="tab-drivers">
              <Car className="h-4 w-4 mr-2" />
              Drivers
              {pendingDrivers.length > 0 && (
                <span className="ml-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs text-white">
                  {pendingDrivers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="riders" data-testid="tab-riders">
              <Users className="h-4 w-4 mr-2" />
              Riders
            </TabsTrigger>
            <TabsTrigger value="trips" data-testid="tab-trips">
              <MapPin className="h-4 w-4 mr-2" />
              Trips
            </TabsTrigger>
            <TabsTrigger value="payouts" data-testid="tab-payouts">
              <Wallet className="h-4 w-4 mr-2" />
              Payouts
              {pendingPayouts.length > 0 && (
                <span className="ml-2 rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">
                  {pendingPayouts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ratings" data-testid="tab-ratings">
              <Star className="h-4 w-4 mr-2" />
              Ratings
            </TabsTrigger>
            <TabsTrigger value="disputes" data-testid="tab-disputes">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Disputes
              {openDisputes.length > 0 && (
                <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">
                  {openDisputes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="refunds" data-testid="tab-refunds">
              <DollarSign className="h-4 w-4 mr-2" />
              Refunds
              {pendingRefunds.length > 0 && (
                <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-2 py-0.5">
                  {pendingRefunds.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="chargebacks" data-testid="tab-chargebacks">
              <CreditCard className="h-4 w-4 mr-2" />
              Chargebacks
              {reportedChargebacks.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {reportedChargebacks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="wallets" data-testid="tab-wallets">
              <Wallet className="h-4 w-4 mr-2" />
              Wallets
              {pendingWalletPayouts.length > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                  {pendingWalletPayouts.length}
                </span>
              )}
            </TabsTrigger>
            {!isDirector && (
              <TabsTrigger value="directors" data-testid="tab-directors">
                <Briefcase className="h-4 w-4 mr-2" />
                Directors
              </TabsTrigger>
            )}
            {!isDirector && (
              <TabsTrigger value="reports" data-testid="tab-reports">
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <CardTitle>Driver Management</CardTitle>
                <CardDescription>
                  Approve, suspend, or manage driver accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {driversLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading drivers...
                  </div>
                ) : drivers.length === 0 ? (
                  <EmptyState
                    icon={Car}
                    title="No drivers yet"
                    description="Driver registrations will appear here"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>License Plate</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Online</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.map((driver) => (
                          <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                            <TableCell className="font-medium">{driver.fullName}</TableCell>
                            <TableCell>{driver.phone}</TableCell>
                            <TableCell>{driver.vehicleMake} {driver.vehicleModel}</TableCell>
                            <TableCell>{driver.licensePlate}</TableCell>
                            <TableCell>
                              <StatusBadge status={driver.status} />
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={driver.isOnline ? "online" : "offline"} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {!isDirector && driver.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => updateDriverStatusMutation.mutate({
                                        driverId: driver.userId,
                                        status: "approved"
                                      })}
                                      disabled={updateDriverStatusMutation.isPending}
                                      data-testid={`button-approve-${driver.id}`}
                                    >
                                      <UserCheck className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => updateDriverStatusMutation.mutate({
                                        driverId: driver.userId,
                                        status: "suspended"
                                      })}
                                      disabled={updateDriverStatusMutation.isPending}
                                      data-testid={`button-reject-${driver.id}`}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {!isDirector && driver.status === "approved" && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateDriverStatusMutation.mutate({
                                      driverId: driver.userId,
                                      status: "suspended"
                                    })}
                                    disabled={updateDriverStatusMutation.isPending}
                                    data-testid={`button-suspend-${driver.id}`}
                                  >
                                    <UserX className="h-4 w-4 mr-1" />
                                    Suspend
                                  </Button>
                                )}
                                {!isDirector && driver.status === "suspended" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateDriverStatusMutation.mutate({
                                      driverId: driver.userId,
                                      status: "approved"
                                    })}
                                    disabled={updateDriverStatusMutation.isPending}
                                    data-testid={`button-reinstate-${driver.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Reinstate
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
          </TabsContent>

          <TabsContent value="riders">
            <Card>
              <CardHeader>
                <CardTitle>Rider List</CardTitle>
                <CardDescription>
                  View all registered riders on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ridersLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading riders...
                  </div>
                ) : riders.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No riders yet"
                    description="Rider registrations will appear here"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {riders.map((rider) => (
                          <TableRow key={rider.id} data-testid={`row-rider-${rider.id}`}>
                            <TableCell className="font-medium">{rider.fullName || "-"}</TableCell>
                            <TableCell>{rider.email || "-"}</TableCell>
                            <TableCell>{rider.phone || "-"}</TableCell>
                            <TableCell>
                              {rider.createdAt 
                                ? new Date(rider.createdAt).toLocaleDateString() 
                                : "-"}
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

          <TabsContent value="trips">
            <Card>
              <CardHeader>
                <CardTitle>Trip Management</CardTitle>
                <CardDescription>
                  View and manage all trips across the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TripFilterBar
                  status={tripStatusFilter}
                  onStatusChange={setTripStatusFilter}
                  startDate={tripStartDate}
                  onStartDateChange={setTripStartDate}
                  endDate={tripEndDate}
                  onEndDateChange={setTripEndDate}
                  driverId={tripDriverFilter}
                  onDriverIdChange={setTripDriverFilter}
                  riderId={tripRiderFilter}
                  onRiderIdChange={setTripRiderFilter}
                  drivers={drivers}
                  riders={riders}
                  showDriverFilter
                  showRiderFilter
                  onClear={clearTripFilters}
                />
                {tripsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading trips...
                  </div>
                ) : trips.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="No trips found"
                    description="Try adjusting your filters or check back later"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rider</TableHead>
                          <TableHead>Pickup</TableHead>
                          <TableHead>Dropoff</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Fare</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trips.map((trip) => (
                          <TableRow 
                            key={trip.id} 
                            data-testid={`row-trip-${trip.id}`}
                            className="cursor-pointer hover-elevate"
                            onClick={() => handleTripClick(trip)}
                          >
                            <TableCell className="font-medium">{trip.riderName || "-"}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{trip.pickupLocation}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{trip.dropoffLocation}</TableCell>
                            <TableCell>
                              <StatusBadge status={trip.status as any} />
                            </TableCell>
                            <TableCell>{trip.driverName || "-"}</TableCell>
                            <TableCell>{trip.fareAmount ? `$${trip.fareAmount}` : "-"}</TableCell>
                            <TableCell>
                              {trip.createdAt 
                                ? new Date(trip.createdAt).toLocaleDateString() 
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isDirector && canCancelTrip(trip.status) && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelTripMutation.mutate(trip.id);
                                  }}
                                  disabled={cancelTripMutation.isPending}
                                  data-testid={`button-cancel-trip-${trip.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            <TripDetailModal
              trip={selectedTrip}
              open={tripDetailOpen}
              onOpenChange={setTripDetailOpen}
              userRole={isDirector ? "director" : "admin"}
            />
          </TabsContent>

          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Payout Ledger</CardTitle>
                <CardDescription>
                  Track driver earnings and manage payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payoutsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading payouts...
                  </div>
                ) : payouts.length === 0 ? (
                  <EmptyState
                    icon={Wallet}
                    title="No payouts yet"
                    description="Driver earnings from completed trips will appear here"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Driver</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Paid At</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.map((payout) => (
                          <TableRow key={payout.id} data-testid={`row-payout-${payout.id}`}>
                            <TableCell className="font-medium">{payout.driverName || "-"}</TableCell>
                            <TableCell>
                              <span className="capitalize">{payout.type}</span>
                            </TableCell>
                            <TableCell className="font-semibold text-green-600 dark:text-green-400">
                              ${payout.amount}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={payout.status as any} />
                            </TableCell>
                            <TableCell>
                              {payout.createdAt 
                                ? new Date(payout.createdAt).toLocaleDateString() 
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {payout.paidAt 
                                ? new Date(payout.paidAt).toLocaleDateString() 
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isDirector && payout.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => markPayoutPaidMutation.mutate(payout.id)}
                                  disabled={markPayoutPaidMutation.isPending}
                                  data-testid={`button-mark-paid-${payout.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark Paid
                                </Button>
                              )}
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

          <TabsContent value="ratings">
            <Card>
              <CardHeader>
                <CardTitle>Ratings & Reviews</CardTitle>
                <CardDescription>
                  View all ratings submitted by drivers and riders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ratingsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading ratings...
                  </div>
                ) : allRatings.length === 0 ? (
                  <EmptyState
                    icon={Star}
                    title="No ratings yet"
                    description="Ratings will appear here after trips are completed and rated"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Comment</TableHead>
                          <TableHead>Trip</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allRatings.map((rating) => (
                          <TableRow key={rating.id} data-testid={`rating-row-${rating.id}`}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{rating.raterName}</span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  ({rating.raterRole})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{rating.targetName}</span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  ({rating.raterRole === "rider" ? "driver" : "rider"})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= rating.score
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {rating.comment || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              <div className="max-w-32 truncate">
                                {rating.tripPickup} → {rating.tripDropoff}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(rating.createdAt).toLocaleDateString()}
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

          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle>Disputes & Issues</CardTitle>
                <CardDescription>
                  Review and manage disputes reported by riders and drivers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Select value={disputeStatusFilter} onValueChange={setDisputeStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="select-dispute-status-filter">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={disputeCategoryFilter} onValueChange={setDisputeCategoryFilter}>
                    <SelectTrigger className="w-40" data-testid="select-dispute-category-filter">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="fare">Fare Issue</SelectItem>
                      <SelectItem value="behavior">Behavior</SelectItem>
                      <SelectItem value="cancellation">Cancellation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={disputeRoleFilter} onValueChange={setDisputeRoleFilter}>
                    <SelectTrigger className="w-40" data-testid="select-dispute-role-filter">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="rider">Rider</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                    </SelectContent>
                  </Select>
                  {(disputeStatusFilter || disputeCategoryFilter || disputeRoleFilter) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDisputeStatusFilter("");
                        setDisputeCategoryFilter("");
                        setDisputeRoleFilter("");
                      }}
                      data-testid="button-clear-dispute-filters"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>
                {disputesLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading disputes...
                  </div>
                ) : allDisputes.length === 0 ? (
                  <EmptyState
                    icon={AlertTriangle}
                    title="No disputes found"
                    description="Disputes from riders and drivers will appear here"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>Against</TableHead>
                          <TableHead>Trip</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allDisputes.map((dispute) => (
                          <TableRow key={dispute.id} data-testid={`row-dispute-${dispute.id}`}>
                            <TableCell>
                              <StatusBadge status={dispute.status as any} />
                            </TableCell>
                            <TableCell className="capitalize">{dispute.category}</TableCell>
                            <TableCell>
                              <span className="capitalize text-xs text-muted-foreground">{dispute.raisedByRole}: </span>
                              {dispute.raisedByName}
                            </TableCell>
                            <TableCell>{dispute.againstUserName}</TableCell>
                            <TableCell>
                              <span className="text-sm truncate max-w-32 block">
                                {dispute.tripPickup} → {dispute.tripDropoff}
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(dispute.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDispute(dispute);
                                  setDisputeAdminNotes(dispute.adminNotes || "");
                                }}
                                data-testid={`button-view-dispute-${dispute.id}`}
                              >
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
          </TabsContent>

          <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
            <DialogContent className="max-w-lg" data-testid="modal-dispute-detail">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Dispute Details
                </DialogTitle>
                <DialogDescription>
                  Review and manage this dispute
                </DialogDescription>
              </DialogHeader>
              {selectedDispute && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <StatusBadge status={selectedDispute.status as any} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="capitalize font-medium">{selectedDispute.category}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Raised By</p>
                      <p className="font-medium">{selectedDispute.raisedByName}</p>
                      <p className="text-xs text-muted-foreground capitalize">({selectedDispute.raisedByRole})</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Against</p>
                      <p className="font-medium">{selectedDispute.againstUserName}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trip</p>
                    <p className="font-medium text-sm">{selectedDispute.tripPickup} → {selectedDispute.tripDropoff}</p>
                    <p className="text-xs text-muted-foreground">Trip Status: {selectedDispute.tripStatus}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedDispute.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Filed</p>
                    <p className="font-medium">{new Date(selectedDispute.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedDispute.resolvedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Resolved</p>
                      <p className="font-medium">{new Date(selectedDispute.resolvedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {!isDirector && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Admin Notes</label>
                        <Textarea
                          value={disputeAdminNotes}
                          onChange={(e) => setDisputeAdminNotes(e.target.value)}
                          placeholder="Add internal notes about this dispute..."
                          rows={3}
                          data-testid="textarea-admin-notes"
                        />
                      </div>
                      <DialogFooter className="flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedDispute(null)}
                          data-testid="button-close-dispute"
                        >
                          Close
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => updateDisputeMutation.mutate({
                            disputeId: selectedDispute.id,
                            adminNotes: disputeAdminNotes,
                          })}
                          disabled={updateDisputeMutation.isPending}
                          data-testid="button-save-notes"
                        >
                          Save Notes
                        </Button>
                        {selectedDispute.status === "open" && (
                          <Button
                            variant="default"
                            onClick={() => updateDisputeMutation.mutate({
                              disputeId: selectedDispute.id,
                              status: "under_review",
                              adminNotes: disputeAdminNotes,
                            })}
                            disabled={updateDisputeMutation.isPending}
                            data-testid="button-mark-under-review"
                          >
                            Mark Under Review
                          </Button>
                        )}
                        {(selectedDispute.status === "open" || selectedDispute.status === "under_review") && (
                          <>
                            <Button
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => updateDisputeMutation.mutate({
                                disputeId: selectedDispute.id,
                                status: "resolved",
                                adminNotes: disputeAdminNotes,
                              })}
                              disabled={updateDisputeMutation.isPending}
                              data-testid="button-resolve-dispute"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Resolve
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => updateDisputeMutation.mutate({
                                disputeId: selectedDispute.id,
                                status: "rejected",
                                adminNotes: disputeAdminNotes,
                              })}
                              disabled={updateDisputeMutation.isPending}
                              data-testid="button-reject-dispute"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                      </DialogFooter>
                    </>
                  )}
                  {isDirector && (
                    <div className="text-sm text-muted-foreground italic">
                      Directors have read-only access to disputes.
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <TabsContent value="refunds">
            <Card>
              <CardHeader>
                <CardTitle>Refund Queue</CardTitle>
                <CardDescription>
                  Review and process refund requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Select value={refundStatusFilter} onValueChange={setRefundStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="select-refund-status-filter">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="reversed">Reversed</SelectItem>
                    </SelectContent>
                  </Select>
                  {refundStatusFilter && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRefundStatusFilter("")}
                      data-testid="button-clear-refund-filters"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>
                {refundsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading refunds...
                  </div>
                ) : allRefunds.length === 0 ? (
                  <EmptyState
                    icon={DollarSign}
                    title="No refunds found"
                    description="Refund requests will appear here"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Rider</TableHead>
                          <TableHead>Trip</TableHead>
                          <TableHead>Created By</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allRefunds.map((refund) => (
                          <TableRow key={refund.id} data-testid={`row-refund-${refund.id}`}>
                            <TableCell>
                              <StatusBadge status={refund.status as any} />
                            </TableCell>
                            <TableCell className="capitalize">{refund.type}</TableCell>
                            <TableCell className="font-medium">${refund.amount}</TableCell>
                            <TableCell>{refund.riderName}</TableCell>
                            <TableCell>
                              <span className="text-sm truncate max-w-32 block">
                                {refund.tripPickup} → {refund.tripDropoff}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground capitalize">{refund.createdByRole}: </span>
                              {refund.createdByName}
                            </TableCell>
                            <TableCell>
                              {new Date(refund.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRefund(refund);
                                  fetchRefundAudit(refund.id);
                                }}
                                data-testid={`button-view-refund-${refund.id}`}
                              >
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
          </TabsContent>

          <Dialog open={!!selectedRefund} onOpenChange={(open) => { if (!open) { setSelectedRefund(null); setRefundAuditLogs([]); } }}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="modal-refund-detail">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Refund Details
                </DialogTitle>
                <DialogDescription>
                  Review and manage this refund request
                </DialogDescription>
              </DialogHeader>
              {selectedRefund && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <StatusBadge status={selectedRefund.status as any} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="capitalize font-medium">{selectedRefund.type}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-xl font-bold text-green-600">${selectedRefund.amount}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Rider</p>
                      <p className="font-medium">{selectedRefund.riderName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Driver</p>
                      <p className="font-medium">{selectedRefund.driverName || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trip</p>
                    <p className="font-medium text-sm">{selectedRefund.tripPickup} → {selectedRefund.tripDropoff}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedRefund.reason}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Created By</p>
                      <p className="font-medium">{selectedRefund.createdByName}</p>
                      <p className="text-xs text-muted-foreground capitalize">({selectedRefund.createdByRole})</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(selectedRefund.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {selectedRefund.approvedByName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Approved By</p>
                      <p className="font-medium">{selectedRefund.approvedByName}</p>
                    </div>
                  )}
                  {selectedRefund.processedByName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Processed By</p>
                      <p className="font-medium">{selectedRefund.processedByName}</p>
                    </div>
                  )}

                  {refundAuditLogs.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Audit Timeline</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {refundAuditLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-2 text-sm border-l-2 border-muted pl-3 py-1">
                            <div>
                              <span className="capitalize font-medium">{log.action.replace(/_/g, " ")}</span>
                              <span className="text-muted-foreground"> by {log.performedByRole}</span>
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isDirector && (
                    <DialogFooter className="flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => { setSelectedRefund(null); setRefundAuditLogs([]); }}
                        data-testid="button-close-refund"
                      >
                        Close
                      </Button>
                      {selectedRefund.status === "pending" && (
                        <>
                          <Button
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => approveRefundMutation.mutate(selectedRefund.id)}
                            disabled={approveRefundMutation.isPending}
                            data-testid="button-approve-refund"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => rejectRefundMutation.mutate({ refundId: selectedRefund.id })}
                            disabled={rejectRefundMutation.isPending}
                            data-testid="button-reject-refund"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      {selectedRefund.status === "approved" && (
                        <Button
                          variant="default"
                          onClick={() => processRefundMutation.mutate(selectedRefund.id)}
                          disabled={processRefundMutation.isPending}
                          data-testid="button-process-refund"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Process Refund
                        </Button>
                      )}
                      {selectedRefund.status === "processed" && (
                        <Button
                          variant="destructive"
                          onClick={() => reverseRefundMutation.mutate({ refundId: selectedRefund.id })}
                          disabled={reverseRefundMutation.isPending}
                          data-testid="button-reverse-refund"
                        >
                          Reverse
                        </Button>
                      )}
                    </DialogFooter>
                  )}
                  {isDirector && (
                    <div className="text-sm text-muted-foreground italic">
                      Directors have read-only access to refunds.
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <TabsContent value="chargebacks">
            <Card>
              <CardHeader>
                <CardTitle>Chargebacks & Reconciliation</CardTitle>
                <CardDescription>
                  Track external payment chargebacks and reconcile gateway transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-red-500" />
                      Chargeback Queue
                    </h3>
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Select value={chargebackStatusFilter} onValueChange={setChargebackStatusFilter}>
                        <SelectTrigger className="w-40" data-testid="select-chargeback-status-filter">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="reported">Reported</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                          <SelectItem value="reversed">Reversed</SelectItem>
                        </SelectContent>
                      </Select>
                      {chargebackStatusFilter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setChargebackStatusFilter("")}
                          data-testid="button-clear-chargeback-filters"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Clear
                        </Button>
                      )}
                    </div>
                    {chargebacksLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        Loading chargebacks...
                      </div>
                    ) : allChargebacks.length === 0 ? (
                      <EmptyState
                        icon={CreditCard}
                        title="No chargebacks found"
                        description="External chargebacks will appear here"
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Status</TableHead>
                              <TableHead>Provider</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Trip</TableHead>
                              <TableHead>External Ref</TableHead>
                              <TableHead>Reported</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allChargebacks.map((cb) => (
                              <TableRow key={cb.id} data-testid={`row-chargeback-${cb.id}`}>
                                <TableCell>
                                  <StatusBadge status={cb.status as any} />
                                </TableCell>
                                <TableCell className="capitalize">{cb.paymentProvider}</TableCell>
                                <TableCell className="font-medium text-red-600">${cb.amount} {cb.currency}</TableCell>
                                <TableCell>
                                  <span className="text-sm truncate max-w-32 block">
                                    {cb.tripPickup} → {cb.tripDropoff}
                                  </span>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{cb.externalReference}</TableCell>
                                <TableCell>
                                  {new Date(cb.reportedAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedChargeback(cb);
                                      fetchChargebackAudit(cb.id);
                                    }}
                                    data-testid={`button-view-chargeback-${cb.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <ArrowLeftRight className="h-5 w-5 text-blue-500" />
                      Payment Reconciliation
                      {manualReviewReconciliations.length > 0 && (
                        <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">
                          {manualReviewReconciliations.length} need review
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Select value={reconciliationStatusFilter} onValueChange={setReconciliationStatusFilter}>
                        <SelectTrigger className="w-40" data-testid="select-reconciliation-status-filter">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="matched">Matched</SelectItem>
                          <SelectItem value="mismatched">Mismatched</SelectItem>
                          <SelectItem value="manual_review">Manual Review</SelectItem>
                        </SelectContent>
                      </Select>
                      {reconciliationStatusFilter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReconciliationStatusFilter("")}
                          data-testid="button-clear-reconciliation-filters"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Clear
                        </Button>
                      )}
                    </div>
                    {reconciliationsLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        Loading reconciliations...
                      </div>
                    ) : allReconciliations.length === 0 ? (
                      <EmptyState
                        icon={ArrowLeftRight}
                        title="No reconciliations found"
                        description="Payment reconciliations will appear here"
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Status</TableHead>
                              <TableHead>Provider</TableHead>
                              <TableHead>Expected</TableHead>
                              <TableHead>Actual</TableHead>
                              <TableHead>Variance</TableHead>
                              <TableHead>Trip</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allReconciliations.map((rec) => (
                              <TableRow key={rec.id} data-testid={`row-reconciliation-${rec.id}`}>
                                <TableCell>
                                  <StatusBadge status={rec.status as any} />
                                </TableCell>
                                <TableCell className="capitalize">{rec.provider}</TableCell>
                                <TableCell>${rec.expectedAmount}</TableCell>
                                <TableCell>${rec.actualAmount}</TableCell>
                                <TableCell className={parseFloat(rec.variance) !== 0 ? "text-red-600 font-medium" : "text-green-600"}>
                                  ${rec.variance}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm truncate max-w-32 block">
                                    {rec.tripPickup} → {rec.tripDropoff}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {new Date(rec.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  {rec.status === "manual_review" && !isDirector && (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => reviewReconciliationMutation.mutate({ reconciliationId: rec.id, status: "matched" })}
                                        disabled={reviewReconciliationMutation.isPending}
                                        data-testid={`button-match-reconciliation-${rec.id}`}
                                      >
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => reviewReconciliationMutation.mutate({ reconciliationId: rec.id, status: "mismatched" })}
                                        disabled={reviewReconciliationMutation.isPending}
                                        data-testid={`button-mismatch-reconciliation-${rec.id}`}
                                      >
                                        <XCircle className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <Dialog open={!!selectedChargeback} onOpenChange={(open) => { if (!open) { setSelectedChargeback(null); setChargebackAuditLogs([]); } }}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="modal-chargeback-detail">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-red-500" />
                  Chargeback Details
                </DialogTitle>
                <DialogDescription>
                  Review and resolve this chargeback
                </DialogDescription>
              </DialogHeader>
              {selectedChargeback && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <StatusBadge status={selectedChargeback.status as any} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Provider</p>
                      <p className="capitalize font-medium">{selectedChargeback.paymentProvider}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-xl font-bold text-red-600">${selectedChargeback.amount} {selectedChargeback.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">External Reference</p>
                    <p className="font-mono text-sm bg-muted p-2 rounded">{selectedChargeback.externalReference}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Rider</p>
                      <p className="font-medium">{selectedChargeback.riderName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Driver</p>
                      <p className="font-medium">{selectedChargeback.driverName || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trip</p>
                    <p className="font-medium text-sm">{selectedChargeback.tripPickup} → {selectedChargeback.tripDropoff}</p>
                    {selectedChargeback.tripFare && (
                      <p className="text-xs text-muted-foreground">Original fare: ${selectedChargeback.tripFare}</p>
                    )}
                  </div>
                  {selectedChargeback.reason && (
                    <div>
                      <p className="text-sm text-muted-foreground">Reason</p>
                      <p className="text-sm bg-muted p-3 rounded-md">{selectedChargeback.reason}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Reported</p>
                      <p className="font-medium">{new Date(selectedChargeback.reportedAt).toLocaleString()}</p>
                    </div>
                    {selectedChargeback.resolvedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Resolved</p>
                        <p className="font-medium">{new Date(selectedChargeback.resolvedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {selectedChargeback.resolvedByName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Resolved By</p>
                      <p className="font-medium">{selectedChargeback.resolvedByName}</p>
                    </div>
                  )}

                  {chargebackAuditLogs.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Audit Timeline</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {chargebackAuditLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-2 text-sm border-l-2 border-muted pl-3 py-1">
                            <div>
                              <span className="capitalize font-medium">{log.action.replace(/_/g, " ")}</span>
                              <span className="text-muted-foreground"> by {log.performedByRole}</span>
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isDirector && (
                    <DialogFooter className="flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => { setSelectedChargeback(null); setChargebackAuditLogs([]); }}
                        data-testid="button-close-chargeback"
                      >
                        Close
                      </Button>
                      {selectedChargeback.status === "reported" && (
                        <Button
                          variant="default"
                          onClick={() => resolveChargebackMutation.mutate({ chargebackId: selectedChargeback.id, status: "under_review" })}
                          disabled={resolveChargebackMutation.isPending}
                          data-testid="button-review-chargeback"
                        >
                          Mark Under Review
                        </Button>
                      )}
                      {(selectedChargeback.status === "reported" || selectedChargeback.status === "under_review") && (
                        <>
                          <Button
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => resolveChargebackMutation.mutate({ chargebackId: selectedChargeback.id, status: "won" })}
                            disabled={resolveChargebackMutation.isPending}
                            data-testid="button-win-chargeback"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Won
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => resolveChargebackMutation.mutate({ chargebackId: selectedChargeback.id, status: "lost" })}
                            disabled={resolveChargebackMutation.isPending}
                            data-testid="button-lose-chargeback"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Lost
                          </Button>
                        </>
                      )}
                      {selectedChargeback.status === "lost" && (
                        <Button
                          variant="outline"
                          onClick={() => resolveChargebackMutation.mutate({ chargebackId: selectedChargeback.id, status: "reversed" })}
                          disabled={resolveChargebackMutation.isPending}
                          data-testid="button-reverse-chargeback"
                        >
                          Reverse
                        </Button>
                      )}
                    </DialogFooter>
                  )}
                  {isDirector && (
                    <div className="text-sm text-muted-foreground italic">
                      Directors have read-only access to chargebacks.
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Phase 11 - Wallets Tab */}
          <TabsContent value="wallets">
            <div className="space-y-6">
              {/* Driver Wallets Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Driver Wallets</CardTitle>
                  <CardDescription>
                    View driver earnings and initiate payouts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {walletsLoading ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Loading wallets...
                    </div>
                  ) : driverWallets.length === 0 ? (
                    <EmptyState
                      icon={Wallet}
                      title="No driver wallets yet"
                      description="Driver wallets will be created when drivers complete trips"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Driver</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-right">Locked</TableHead>
                            <TableHead className="text-right">Available</TableHead>
                            <TableHead className="text-right">Pending Payouts</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {driverWallets.map((wallet) => {
                            const availableBalance = (parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance)).toFixed(2);
                            return (
                              <TableRow key={wallet.id} data-testid={`row-wallet-${wallet.id}`}>
                                <TableCell className="font-medium">{wallet.ownerName || "Unknown"}</TableCell>
                                <TableCell className="text-right">${wallet.balance}</TableCell>
                                <TableCell className="text-right text-muted-foreground">${wallet.lockedBalance}</TableCell>
                                <TableCell className="text-right font-medium text-green-600">${availableBalance}</TableCell>
                                <TableCell className="text-right text-muted-foreground">${wallet.pendingPayoutAmount || "0.00"}</TableCell>
                                <TableCell className="text-right">
                                  {!isDirector && parseFloat(availableBalance) > 0 && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedWalletForPayout(wallet);
                                        setPayoutAmount(availableBalance);
                                        setInitiatePayoutOpen(true);
                                      }}
                                      data-testid={`button-initiate-payout-${wallet.id}`}
                                    >
                                      <DollarSign className="h-4 w-4 mr-1" />
                                      Initiate Payout
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payout Cycles Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Payout Cycles</CardTitle>
                  <CardDescription>
                    Track and manage wallet payouts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <Select value={walletPayoutStatusFilter} onValueChange={setWalletPayoutStatusFilter}>
                      <SelectTrigger className="w-40" data-testid="select-wallet-payout-status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="reversed">Reversed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {walletPayoutsLoading ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Loading payouts...
                    </div>
                  ) : walletPayouts.length === 0 ? (
                    <EmptyState
                      icon={DollarSign}
                      title="No payout cycles yet"
                      description="Initiated payouts will appear here"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Driver</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Initiated By</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {walletPayouts.map((payout) => (
                            <TableRow 
                              key={payout.id} 
                              className="cursor-pointer hover-elevate"
                              onClick={() => {
                                setSelectedWalletPayout(payout);
                                setWalletPayoutDetailOpen(true);
                              }}
                              data-testid={`row-wallet-payout-${payout.id}`}
                            >
                              <TableCell className="font-medium">{payout.driverName || "Unknown"}</TableCell>
                              <TableCell className="text-right">${payout.amount}</TableCell>
                              <TableCell className="capitalize">{payout.method}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(payout.periodStart).toLocaleDateString()} - {new Date(payout.periodEnd).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={payout.status as "pending" | "processing" | "paid" | "failed" | "reversed"} />
                              </TableCell>
                              <TableCell>{payout.initiatedByName || "-"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(payout.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWalletPayout(payout);
                                    setWalletPayoutDetailOpen(true);
                                  }}
                                  data-testid={`button-view-payout-${payout.id}`}
                                >
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
            </div>
          </TabsContent>

          {/* Initiate Payout Dialog */}
          <Dialog open={initiatePayoutOpen} onOpenChange={setInitiatePayoutOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Initiate Payout</DialogTitle>
                <DialogDescription>
                  Create a payout for {selectedWalletForPayout?.ownerName}
                </DialogDescription>
              </DialogHeader>
              {selectedWalletForPayout && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Available Balance</label>
                      <p className="text-lg font-bold text-green-600">
                        ${(parseFloat(selectedWalletForPayout.balance) - parseFloat(selectedWalletForPayout.lockedBalance)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Locked Balance</label>
                      <p className="text-lg text-muted-foreground">
                        ${selectedWalletForPayout.lockedBalance}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Payout Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={(parseFloat(selectedWalletForPayout.balance) - parseFloat(selectedWalletForPayout.lockedBalance)).toFixed(2)}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid="input-payout-amount"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Payment Method</label>
                    <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                      <SelectTrigger data-testid="select-payout-method">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="mobile">Mobile Money</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">Period Start</label>
                      <input
                        type="date"
                        value={payoutPeriodStart}
                        onChange={(e) => setPayoutPeriodStart(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        data-testid="input-period-start"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">Period End</label>
                      <input
                        type="date"
                        value={payoutPeriodEnd}
                        onChange={(e) => setPayoutPeriodEnd(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        data-testid="input-period-end"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInitiatePayoutOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (!payoutAmount || !payoutPeriodStart || !payoutPeriodEnd) {
                          toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
                          return;
                        }
                        initiatePayoutMutation.mutate({
                          walletId: selectedWalletForPayout.id,
                          amount: payoutAmount,
                          method: payoutMethod,
                          periodStart: payoutPeriodStart,
                          periodEnd: payoutPeriodEnd,
                        });
                      }}
                      disabled={initiatePayoutMutation.isPending}
                      data-testid="button-confirm-payout"
                    >
                      {initiatePayoutMutation.isPending ? "Initiating..." : "Initiate Payout"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Wallet Payout Detail Modal */}
          <Dialog open={walletPayoutDetailOpen} onOpenChange={setWalletPayoutDetailOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Payout Details</DialogTitle>
                <DialogDescription>
                  View payout information and take actions
                </DialogDescription>
              </DialogHeader>
              {selectedWalletPayout && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Driver</label>
                      <p className="font-medium">{selectedWalletPayout.driverName}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Amount</label>
                      <p className="font-bold text-lg">${selectedWalletPayout.amount}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Method</label>
                      <p className="capitalize">{selectedWalletPayout.method}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Status</label>
                      <StatusBadge status={selectedWalletPayout.status as "pending" | "processing" | "paid" | "failed" | "reversed"} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm text-muted-foreground">Period</label>
                      <p>{new Date(selectedWalletPayout.periodStart).toLocaleDateString()} - {new Date(selectedWalletPayout.periodEnd).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Initiated By</label>
                      <p>{selectedWalletPayout.initiatedByName || "-"}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Initiated At</label>
                      <p>{new Date(selectedWalletPayout.createdAt).toLocaleString()}</p>
                    </div>
                    {selectedWalletPayout.processedByName && (
                      <>
                        <div>
                          <label className="text-sm text-muted-foreground">Processed By</label>
                          <p>{selectedWalletPayout.processedByName}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Processed At</label>
                          <p>{selectedWalletPayout.processedAt ? new Date(selectedWalletPayout.processedAt).toLocaleString() : "-"}</p>
                        </div>
                      </>
                    )}
                    {selectedWalletPayout.failureReason && (
                      <div className="col-span-2">
                        <label className="text-sm text-muted-foreground">Failure Reason</label>
                        <p className="text-destructive">{selectedWalletPayout.failureReason}</p>
                      </div>
                    )}
                  </div>
                  {!isDirector && (
                    <DialogFooter className="gap-2">
                      {selectedWalletPayout.status === "pending" && (
                        <Button
                          onClick={() => processPayoutMutation.mutate(selectedWalletPayout.id)}
                          disabled={processPayoutMutation.isPending}
                          data-testid="button-process-payout"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Process Payout
                        </Button>
                      )}
                      {(selectedWalletPayout.status === "pending" || selectedWalletPayout.status === "paid") && (
                        <Button
                          variant="destructive"
                          onClick={() => {
                            const reason = prompt("Enter reason for reversal:");
                            if (reason) {
                              reversePayoutMutation.mutate({ payoutId: selectedWalletPayout.id, reason });
                            }
                          }}
                          disabled={reversePayoutMutation.isPending}
                          data-testid="button-reverse-payout"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reverse
                        </Button>
                      )}
                    </DialogFooter>
                  )}
                  {isDirector && (
                    <div className="text-sm text-muted-foreground italic">
                      Directors have read-only access to payouts.
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {!isDirector && (
            <TabsContent value="directors">
              <Card>
                <CardHeader>
                  <CardTitle>Directors</CardTitle>
                  <CardDescription>
                    Board members with read-only access to the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {directorsLoading ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Loading directors...
                    </div>
                  ) : directors.length === 0 ? (
                    <EmptyState
                      icon={Briefcase}
                      title="No directors yet"
                      description="Directors with governance access will appear here"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {directors.map((director) => (
                            <TableRow key={director.id} data-testid={`row-director-${director.id}`}>
                              <TableCell className="font-medium">{director.fullName || "-"}</TableCell>
                              <TableCell>{director.email || "-"}</TableCell>
                              <TableCell>
                                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                                  <Briefcase className="h-3 w-3" />
                                  Director
                                </span>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={director.status as any} />
                              </TableCell>
                              <TableCell>
                                {director.createdAt 
                                  ? new Date(director.createdAt).toLocaleDateString() 
                                  : "-"}
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
          )}

          {!isDirector && (
            <TabsContent value="reports">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Financial Analytics & Reports
                        </CardTitle>
                        <CardDescription>
                          Financial visibility for admin and finance teams
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={analyticsRange} onValueChange={setAnalyticsRange}>
                          <SelectTrigger className="w-[140px]" data-testid="select-analytics-range">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="90d">Last 90 Days</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        Loading analytics...
                      </div>
                    ) : !analyticsOverview ? (
                      <EmptyState
                        icon={BarChart3}
                        title="No data available"
                        description="Analytics will appear as trips are completed"
                      />
                    ) : (
                      <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Total Trips</CardDescription>
                              <CardTitle className="text-2xl" data-testid="text-analytics-total-trips">
                                {analyticsOverview.trips.total}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs text-muted-foreground">
                                <span className="text-green-600">{analyticsOverview.trips.completed} completed</span>
                                {" / "}
                                <span className="text-red-600">{analyticsOverview.trips.cancelled} cancelled</span>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Gross Revenue</CardDescription>
                              <CardTitle className="text-2xl text-green-600" data-testid="text-analytics-gross-revenue">
                                ${analyticsOverview.revenue.grossFares}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs text-muted-foreground">
                                From completed trips
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>ZIBA Commission</CardDescription>
                              <CardTitle className="text-2xl text-primary" data-testid="text-analytics-commission">
                                ${analyticsOverview.revenue.commission}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs text-muted-foreground">
                                Platform earnings (20%)
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Driver Earnings</CardDescription>
                              <CardTitle className="text-2xl text-blue-600" data-testid="text-analytics-driver-earnings">
                                ${analyticsOverview.revenue.driverEarnings}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs text-muted-foreground">
                                Total driver payouts (80%)
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Refunds</CardDescription>
                              <CardTitle className="text-xl">
                                {analyticsOverview.refunds.total} refunds
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-sm text-muted-foreground">
                                Total: <span className="font-medium text-red-600">${analyticsOverview.refunds.totalAmount}</span>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Chargebacks</CardDescription>
                              <CardTitle className="text-xl">
                                {analyticsOverview.chargebacks.total} total
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs space-x-2">
                                <span className="text-green-600">{analyticsOverview.chargebacks.won} won</span>
                                <span className="text-red-600">{analyticsOverview.chargebacks.lost} lost</span>
                                <span className="text-yellow-600">{analyticsOverview.chargebacks.pending} pending</span>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Wallet Payouts</CardDescription>
                              <CardTitle className="text-xl">
                                ${analyticsOverview.payouts.totalProcessed}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs space-x-2">
                                <span className="text-green-600">{analyticsOverview.payouts.processed} paid</span>
                                <span className="text-yellow-600">{analyticsOverview.payouts.pending} pending</span>
                                <span className="text-red-600">{analyticsOverview.payouts.failed} failed</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Driver Wallet Balances</CardTitle>
                            <CardDescription>Overview of driver earnings held in wallets</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="text-center p-4 bg-muted rounded-lg">
                                <div className="text-sm text-muted-foreground">Total Balance</div>
                                <div className="text-2xl font-bold">${analyticsOverview.wallets.totalBalance}</div>
                              </div>
                              <div className="text-center p-4 bg-muted rounded-lg">
                                <div className="text-sm text-muted-foreground">Available</div>
                                <div className="text-2xl font-bold text-green-600">${analyticsOverview.wallets.availableBalance}</div>
                              </div>
                              <div className="text-center p-4 bg-muted rounded-lg">
                                <div className="text-sm text-muted-foreground">Locked (Pending)</div>
                                <div className="text-2xl font-bold text-yellow-600">${analyticsOverview.wallets.lockedBalance}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {revenueData.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Revenue Over Time</CardTitle>
                              <CardDescription>Daily revenue breakdown</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Date</TableHead>
                                      <TableHead className="text-right">Gross Fares</TableHead>
                                      <TableHead className="text-right">Commission</TableHead>
                                      <TableHead className="text-right">Driver Earnings</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {revenueData.map((row, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell>{row.date}</TableCell>
                                        <TableCell className="text-right">${parseFloat(row.grossFares).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">${parseFloat(row.commission).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">${parseFloat(row.driverEarnings).toFixed(2)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Export Reports</CardTitle>
                            <CardDescription>Download financial data as CSV for accounting</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleExportCSV("overview")}
                                data-testid="button-export-overview"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Overview
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleExportCSV("trips")}
                                data-testid="button-export-trips"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Trips
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleExportCSV("revenue")}
                                data-testid="button-export-revenue"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Revenue
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleExportCSV("payouts")}
                                data-testid="button-export-payouts"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Payouts
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleExportCSV("refunds")}
                                data-testid="button-export-refunds"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Refunds
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
