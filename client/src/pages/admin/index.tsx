import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { FullPageLoading } from "@/components/loading-spinner";
import { TripFilterBar } from "@/components/trip-filter-bar";
import { TripDetailModal } from "@/components/trip-detail-modal";
import { AdminReservationsPanel } from "@/components/admin/reservations-panel";
import { AdminScheduledTripsPanel } from "@/components/admin/scheduled-trips-panel";
import { AdminOverridePanel } from "@/components/admin/override-panel";
import { UserGrowthPanel } from "@/components/admin/user-growth-panel";
import { IncentivesPanel } from "@/components/admin/incentives-panel";
import { LaunchReadinessPanel } from "@/components/admin/launch-readiness-panel";
import { AcquisitionPanel } from "@/components/admin/acquisition-panel";
import { HelpCenterPanel } from "@/components/admin/help-center-panel";
import { SafetyPanel } from "@/components/admin/safety-panel";
import { TaxDocumentsPanel } from "@/components/admin/tax-documents-panel";
import { TaxComplianceConfig } from "@/components/admin/tax-compliance-config";
import { CashSettlementPanel } from "@/components/admin/cash-settlement-panel";
import { CashDisputesPanel } from "@/components/admin/cash-disputes-panel";
import { SimulationCenter } from "@/components/admin/simulation-center";
import { CorporateRidesPanel } from "@/components/admin/corporate-rides-panel";
import { BankTransfersPanel } from "@/components/admin/bank-transfers-panel";
import { AdminCancellationFeeSettings } from "@/components/admin/cancellation-fee-settings";
import { LostItemsPanel } from "@/components/admin/lost-items-panel";
import { AccidentReportsPanel } from "@/components/admin/accident-reports-panel";
import { InsurancePartnersPanel } from "@/components/admin/insurance-partners-panel";
import { ReliefFundPanel } from "@/components/admin/relief-fund-panel";
import { LostItemFraudPanel } from "@/components/admin/lost-item-fraud-panel";
import { ComplianceLogPanel } from "@/components/admin/compliance-log-panel";
import { SupportLogsPanel } from "@/components/admin/support-logs-panel";
import { InboxViewerPanel } from "@/components/admin/inbox-viewer-panel";
import { ZibraInsightsPanel } from "@/components/zibra-insights-panel";
import { ZibraGovernancePanel } from "@/components/zibra-governance-panel";
import { ZibaSupport } from "@/components/ziba-support";
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
  ArrowLeft,
  BarChart3,
  Download,
  Calendar,
  ShieldAlert,
  RefreshCw,
  Gift,
  Zap,
  Target,
  Award,
  Play,
  Pause,
  StopCircle,
  Globe,
  Plus,
  Percent,
  Building,
  FileText,
  ChevronRight,
  Settings,
  Settings2,
  TestTube,
  Trash2,
  Rocket,
  UserPlus,
  BookOpen,
  ScrollText,
  Banknote,
  Package,
  Heart,
  Headphones,
  Mail
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

type FraudOverview = {
  riskProfiles: { total: number; low: number; medium: number; high: number; critical: number };
  fraudEvents: { total: number; unresolved: number; resolved: number };
};

type RiskProfileWithDetails = {
  id: string;
  userId: string;
  role: "rider" | "driver";
  score: number;
  level: "low" | "medium" | "high" | "critical";
  lastEvaluatedAt: string;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  email?: string;
};

type FraudEventWithDetails = {
  id: string;
  entityType: "user" | "trip";
  entityId: string;
  signalType: string;
  severity: "low" | "medium" | "high";
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  entityName?: string;
  resolvedByName?: string;
};

type IncentiveStats = {
  activePrograms: number;
  totalEarnings: string;
  pendingEarnings: string;
  paidEarnings: string;
  revokedEarnings: string;
};

type IncentiveProgramWithDetails = {
  id: string;
  name: string;
  type: "trip" | "streak" | "peak" | "quality" | "promo";
  criteria: string;
  rewardAmount: string;
  currency: string;
  startAt: string;
  endAt: string;
  status: "active" | "paused" | "ended";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
  earnersCount?: number;
  totalPaid?: string;
};

type IncentiveEarningWithDetails = {
  id: string;
  programId: string;
  driverId: string;
  amount: string;
  status: "pending" | "approved" | "paid" | "revoked";
  evaluatedAt: string;
  paidAt?: string;
  revokedAt?: string;
  revokedByUserId?: string;
  revocationReason?: string;
  walletTransactionId?: string;
  driverName?: string;
  programName?: string;
  programType?: string;
  revokedByName?: string;
};

type GrowthStats = {
  totalReferralCodes: number;
  activeReferralCodes: number;
  totalReferrals: number;
  referralConversionRate: string;
  activeCampaigns: number;
  totalPartnerLeads: number;
  signedPartners: number;
};

type ReferralCodeWithDetails = {
  id: string;
  code: string;
  ownerId: string;
  ownerRole: string;
  usageCount: number;
  maxUses?: number;
  status: "active" | "inactive" | "expired";
  createdAt: string;
  ownerName?: string;
  ownerEmail?: string;
};

type CampaignWithDetails = {
  id: string;
  name: string;
  type: string;
  status: "draft" | "active" | "paused" | "ended";
  startDate: string;
  endDate: string;
  description?: string;
  createdAt: string;
  createdByName?: string;
};

type PartnerLeadWithDetails = {
  id: string;
  organizationName: string;
  contactName: string;
  email: string;
  phone?: string;
  type: "corporate" | "fleet" | "enterprise" | "reseller";
  status: "new" | "contacted" | "qualified" | "negotiating" | "signed" | "rejected";
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type EnhancedCampaignWithDetails = {
  id: string;
  name: string;
  type: string;
  startAt: string;
  endAt: string;
  status: string;
  notes: string | null;
  createdAt: string;
  details?: {
    id: string;
    campaignId: string;
    targetAudience: string | null;
    countryCode: string | null;
    subregion: string | null;
    incentiveType: string | null;
    incentiveValue: string | null;
    incentiveRules: string | null;
    maxRedemptions: number | null;
    currentRedemptions: number;
    createdAt: string;
  };
};

type ReactivationRule = {
  id: string;
  name: string;
  targetRole: string;
  inactiveDaysThreshold: number;
  messageTitle: string;
  messageBody: string;
  incentiveType: string | null;
  incentiveValue: string | null;
  countryCode: string | null;
  status: string;
  triggerCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type AttributionStat = {
  source: string;
  count: number;
};

type GrowthSafetyStatus = {
  viralityEnabled: boolean;
  shareMomentsEnabled: boolean;
  reactivationEnabled: boolean;
  maxReferralRewardPerUser: number | null;
  maxDailyReferrals: number | null;
  countryOverrides: any[];
};

interface AdminDashboardProps {
  userRole?: "super_admin" | "admin" | "director" | "finance" | "trip_coordinator";
}

function CancellationFeeSettings() {
  const { toast } = useToast();
  const [countryCode, setCountryCode] = useState("NG");
  const [feeEnRoute, setFeeEnRoute] = useState("");
  const [feeArrived, setFeeArrived] = useState("");

  const { data: settings, isLoading } = useQuery<{
    countryCode: string;
    gracePeriodMinutes: number;
    cancellationFee: string;
    cancellationFeeArrivedMultiplier: string;
    feeEnRoute: number;
    feeArrived: number;
    currency: string;
  }>({
    queryKey: ["/api/admin/cancellation-fee-settings", countryCode],
    queryFn: () => fetch(`/api/admin/cancellation-fee-settings?countryCode=${countryCode}`, { credentials: "include" }).then(r => r.json()),
  });

  useEffect(() => {
    if (settings) {
      setFeeEnRoute(String(settings.feeEnRoute));
      setFeeArrived(String(settings.feeArrived));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const enRoute = parseFloat(feeEnRoute);
      const arrived = parseFloat(feeArrived);
      if (isNaN(enRoute) || isNaN(arrived) || enRoute <= 0 || arrived <= 0) {
        throw new Error("Please enter valid fee amounts");
      }
      const multiplier = arrived / enRoute;
      return apiRequest("POST", "/api/admin/cancellation-fee-settings", {
        countryCode,
        cancellationFee: enRoute,
        cancellationFeeArrivedMultiplier: multiplier.toFixed(2),
      });
    },
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Cancellation fee settings updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cancellation-fee-settings", countryCode] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save settings", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6" data-testid="fee-settings-panel">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-fee-settings-title">
            <Settings className="h-5 w-5" />
            Cancellation Fee Settings
          </CardTitle>
          <CardDescription>Configure cancellation fees applied when riders cancel after a driver has been assigned.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="country-select">Country</Label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger id="country-select" data-testid="select-fee-country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NG">Nigeria (NGN)</SelectItem>
                <SelectItem value="US">United States (USD)</SelectItem>
                <SelectItem value="GB">United Kingdom (GBP)</SelectItem>
                <SelectItem value="ZA">South Africa (ZAR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground" data-testid="text-grace-period">
              <Clock className="inline h-4 w-4 mr-1" />
              Grace period: <strong>3 minutes</strong> — riders can cancel free of charge within this window after a driver accepts.
            </p>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading current settings...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fee-en-route">Fee when driver is en route ({settings?.currency || "NGN"})</Label>
                <Input
                  id="fee-en-route"
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeEnRoute}
                  onChange={(e) => setFeeEnRoute(e.target.value)}
                  data-testid="input-fee-en-route"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fee-arrived">Fee when driver has arrived ({settings?.currency || "NGN"})</Label>
                <Input
                  id="fee-arrived"
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeArrived}
                  onChange={(e) => setFeeArrived(e.target.value)}
                  data-testid="input-fee-arrived"
                />
              </div>
            </div>
          )}

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
            data-testid="button-save-fee-settings"
          >
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p data-testid="text-fee-note">Fee amounts are in the local currency. Riders will see "A cancellation fee may apply." — exact amounts are not shown.</p>
            <p data-testid="text-driver-compensation-note">The fee is credited to the driver's earnings.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard({ userRole = "admin" }: AdminDashboardProps) {
  const isSuperAdmin = userRole === "super_admin";
  const isDirector = userRole === "director";
  const isTripCoordinator = userRole === "trip_coordinator";
  const isFinance = userRole === "finance";
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("drivers");
  const [driverStatusFilter, setDriverStatusFilter] = useState<string>("");
  const [analyticsRange, setAnalyticsRange] = useState("30d");
  const [fraudLevelFilter, setFraudLevelFilter] = useState("all");
  
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
  const [zAssistOpen, setZAssistOpen] = useState(false);

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

  // Phase 13 - Fraud Detection queries
  const { data: fraudOverview } = useQuery<FraudOverview>({
    queryKey: ["/api/fraud/overview"],
    queryFn: async () => {
      const res = await fetch("/api/fraud/overview", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch fraud overview");
      return res.json();
    },
    enabled: !!user && !isDirector,
  });

  const { data: riskProfiles = [] } = useQuery<RiskProfileWithDetails[]>({
    queryKey: ["/api/fraud/users", fraudLevelFilter],
    queryFn: async () => {
      const url = fraudLevelFilter && fraudLevelFilter !== "all" 
        ? `/api/fraud/users?level=${fraudLevelFilter}` 
        : "/api/fraud/users";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch risk profiles");
      return res.json();
    },
    enabled: !!user && !isDirector && activeTab === "fraud",
  });

  const { data: fraudEvents = [] } = useQuery<FraudEventWithDetails[]>({
    queryKey: ["/api/fraud/events"],
    queryFn: async () => {
      const res = await fetch("/api/fraud/events?unresolved=true", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch fraud events");
      return res.json();
    },
    enabled: !!user && !isDirector && activeTab === "fraud",
  });

  const runFraudEvaluationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fraud/evaluate", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fraud/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fraud/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fraud/events"] });
      toast({
        title: "Fraud evaluation complete",
        description: `Evaluated ${data.evaluated} users. Found ${data.highRisk} high-risk and ${data.critical} critical.`,
      });
    },
    onError: () => {
      toast({ title: "Evaluation failed", description: "Could not run fraud evaluation", variant: "destructive" });
    },
  });

  const resolveFraudEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiRequest("POST", `/api/fraud/resolve/${eventId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fraud/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fraud/overview"] });
      toast({ title: "Event resolved", description: "Fraud event marked as resolved" });
    },
    onError: () => {
      toast({ title: "Resolution failed", description: "Could not resolve fraud event", variant: "destructive" });
    },
  });

  // Phase 14 - Incentive Queries
  const { data: incentiveStats } = useQuery<IncentiveStats>({
    queryKey: ["/api/incentives/stats"],
    queryFn: async () => {
      const res = await fetch("/api/incentives/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch incentive stats");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator,
  });

  const { data: incentivePrograms = [], isLoading: programsLoading } = useQuery<IncentiveProgramWithDetails[]>({
    queryKey: ["/api/incentives/programs"],
    queryFn: async () => {
      const res = await fetch("/api/incentives/programs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch incentive programs");
      return res.json();
    },
    enabled: !!user && !isDirector && activeTab === "incentives",
  });

  const { data: incentiveEarnings = [], isLoading: earningsLoading } = useQuery<IncentiveEarningWithDetails[]>({
    queryKey: ["/api/incentives/earnings"],
    queryFn: async () => {
      const res = await fetch("/api/incentives/earnings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch incentive earnings");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "incentives",
  });

  // Phase 15 - Countries, Tax Rules, Exchange Rates, Compliance
  type CountryWithDetails = {
    id: string;
    name: string;
    isoCode: string;
    currency: string;
    timezone: string;
    active: boolean;
    createdAt: string;
    taxRulesCount: number;
    activeTripsCount: number;
    totalRevenue: string;
  };

  type TaxRuleWithDetails = {
    id: string;
    countryId: string;
    name: string;
    taxType: string;
    rate: string;
    appliesTo: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    countryName?: string;
    countryCode?: string;
  };

  type ExchangeRateType = {
    id: string;
    baseCurrency: string;
    targetCurrency: string;
    rate: string;
    source: string;
    asOfDate: string;
  };

  type ComplianceOverviewType = {
    totalCountries: number;
    activeCountries: number;
    taxRulesCount: number;
    totalEstimatedTax: string;
  };

  const { data: countriesData = [], isLoading: countriesLoading } = useQuery<CountryWithDetails[]>({
    queryKey: ["/api/countries"],
    queryFn: async () => {
      const res = await fetch("/api/countries", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch countries");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "countries",
  });

  const { data: taxRulesData = [], isLoading: taxRulesLoading } = useQuery<TaxRuleWithDetails[]>({
    queryKey: ["/api/tax-rules"],
    queryFn: async () => {
      const res = await fetch("/api/tax-rules", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tax rules");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "countries",
  });

  const { data: exchangeRatesData = [] } = useQuery<ExchangeRateType[]>({
    queryKey: ["/api/exchange-rates"],
    queryFn: async () => {
      const res = await fetch("/api/exchange-rates", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch exchange rates");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "countries",
  });

  const { data: complianceOverview } = useQuery<ComplianceOverviewType>({
    queryKey: ["/api/compliance/overview"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/overview", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch compliance overview");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "countries",
  });

  const [showCreateCountryDialog, setShowCreateCountryDialog] = useState(false);
  const [newCountry, setNewCountry] = useState({ name: "", isoCode: "", currency: "", timezone: "" });
  const [showCreateTaxRuleDialog, setShowCreateTaxRuleDialog] = useState(false);
  const [newTaxRule, setNewTaxRule] = useState({ countryId: "", name: "", taxType: "VAT" as string, rate: "", appliesTo: "FARE" as string, effectiveFrom: "" });
  const [showCreateExchangeRateDialog, setShowCreateExchangeRateDialog] = useState(false);
  const [newExchangeRate, setNewExchangeRate] = useState({ baseCurrency: "", targetCurrency: "", rate: "" });
  const [countriesSubTab, setCountriesSubTab] = useState<"countries" | "taxes" | "rates">("countries");

  // Contracts state
  const [showCreateContractDialog, setShowCreateContractDialog] = useState(false);
  const [showGenerateInvoiceDialog, setShowGenerateInvoiceDialog] = useState(false);
  const [selectedContractForInvoice, setSelectedContractForInvoice] = useState<string | null>(null);
  const [invoicePeriod, setInvoicePeriod] = useState({ startDate: "", endDate: "" });
  const [newContract, setNewContract] = useState({
    tripCoordinatorId: "",
    contractName: "",
    contractType: "CORPORATE" as string,
    startDate: "",
    endDate: "",
    billingModel: "MONTHLY_INVOICE" as string,
    currency: "USD"
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<any[]>({
    queryKey: ["/api/contracts"],
    enabled: !!user && !isDirector && !isTripCoordinator,
  });

  const { data: contractStats } = useQuery<{
    totalContracts: number;
    activeContracts: number;
    totalBilled: string;
    pendingInvoices: number;
  }>({
    queryKey: ["/api/contracts/stats"],
    enabled: !!user && !isDirector && !isTripCoordinator,
  });

  const { data: allInvoices = [] } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
    enabled: !!user && !isDirector && !isTripCoordinator,
  });

  const { data: tripCoordinators = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/trip-coordinators"],
    enabled: !!user && !isDirector && !isTripCoordinator,
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: typeof newContract) => {
      const res = await apiRequest("POST", "/api/contracts", {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts/stats"] });
      setShowCreateContractDialog(false);
      setNewContract({
        tripCoordinatorId: "",
        contractName: "",
        contractType: "CORPORATE",
        startDate: "",
        endDate: "",
        billingModel: "MONTHLY_INVOICE",
        currency: "USD"
      });
      toast({ title: "Contract created", description: "Enterprise contract created successfully" });
    },
    onError: () => {
      toast({ title: "Creation failed", description: "Could not create contract", variant: "destructive" });
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async ({ contractId, periodStart, periodEnd }: { contractId: string; periodStart: string; periodEnd: string }) => {
      const res = await apiRequest("POST", `/api/contracts/${contractId}/invoices/generate`, {
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts/stats"] });
      setShowGenerateInvoiceDialog(false);
      setSelectedContractForInvoice(null);
      setInvoicePeriod({ startDate: "", endDate: "" });
      toast({ title: "Invoice generated", description: "Invoice created successfully" });
    },
    onError: () => {
      toast({ title: "Generation failed", description: "Could not generate invoice", variant: "destructive" });
    },
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${invoiceId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts/stats"] });
      toast({ title: "Invoice updated", description: "Invoice status updated" });
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not update invoice status", variant: "destructive" });
    },
  });

  const createCountryMutation = useMutation({
    mutationFn: async (data: typeof newCountry) => {
      const res = await apiRequest("POST", "/api/countries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/overview"] });
      setShowCreateCountryDialog(false);
      setNewCountry({ name: "", isoCode: "", currency: "", timezone: "" });
      toast({ title: "Country created", description: "Country added successfully" });
    },
    onError: () => {
      toast({ title: "Creation failed", description: "Could not create country", variant: "destructive" });
    },
  });

  const createTaxRuleMutation = useMutation({
    mutationFn: async (data: typeof newTaxRule) => {
      const res = await apiRequest("POST", "/api/tax-rules", {
        ...data,
        effectiveFrom: new Date(data.effectiveFrom).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/overview"] });
      setShowCreateTaxRuleDialog(false);
      setNewTaxRule({ countryId: "", name: "", taxType: "VAT", rate: "", appliesTo: "FARE", effectiveFrom: "" });
      toast({ title: "Tax rule created", description: "Tax rule added successfully" });
    },
    onError: () => {
      toast({ title: "Creation failed", description: "Could not create tax rule", variant: "destructive" });
    },
  });

  const createExchangeRateMutation = useMutation({
    mutationFn: async (data: typeof newExchangeRate) => {
      const res = await apiRequest("POST", "/api/exchange-rates", {
        ...data,
        source: "MANUAL",
        asOfDate: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      setShowCreateExchangeRateDialog(false);
      setNewExchangeRate({ baseCurrency: "", targetCurrency: "", rate: "" });
      toast({ title: "Exchange rate created", description: "Exchange rate added successfully" });
    },
    onError: () => {
      toast({ title: "Creation failed", description: "Could not create exchange rate", variant: "destructive" });
    },
  });

  const toggleCountryMutation = useMutation({
    mutationFn: async ({ countryId, active }: { countryId: string; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/countries/${countryId}`, { active });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/overview"] });
      toast({ title: "Country updated", description: "Country status updated" });
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not update country", variant: "destructive" });
    },
  });

  const [showCreateProgramDialog, setShowCreateProgramDialog] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: "",
    type: "trip" as "trip" | "streak" | "peak" | "quality" | "promo",
    criteria: "",
    rewardAmount: "",
    startAt: "",
    endAt: "",
  });

  const createProgramMutation = useMutation({
    mutationFn: async (data: typeof newProgram) => {
      const res = await apiRequest("POST", "/api/incentives/create", {
        ...data,
        criteria: JSON.stringify(JSON.parse(data.criteria || "{}")),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
      setShowCreateProgramDialog(false);
      setNewProgram({ name: "", type: "trip", criteria: "", rewardAmount: "", startAt: "", endAt: "" });
      toast({ title: "Program created", description: "Incentive program created successfully" });
    },
    onError: () => {
      toast({ title: "Creation failed", description: "Could not create incentive program", variant: "destructive" });
    },
  });

  const pauseProgramMutation = useMutation({
    mutationFn: async (programId: string) => {
      const res = await apiRequest("POST", `/api/incentives/pause/${programId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
      toast({ title: "Program paused", description: "Incentive program has been paused" });
    },
    onError: () => {
      toast({ title: "Pause failed", description: "Could not pause program", variant: "destructive" });
    },
  });

  const endProgramMutation = useMutation({
    mutationFn: async (programId: string) => {
      const res = await apiRequest("POST", `/api/incentives/end/${programId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
      toast({ title: "Program ended", description: "Incentive program has been ended" });
    },
    onError: () => {
      toast({ title: "End failed", description: "Could not end program", variant: "destructive" });
    },
  });

  const approveEarningMutation = useMutation({
    mutationFn: async (earningId: string) => {
      const res = await apiRequest("POST", `/api/incentives/approve/${earningId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
      toast({ title: "Earning approved", description: "Incentive earning approved and paid to driver" });
    },
    onError: () => {
      toast({ title: "Approval failed", description: "Could not approve earning", variant: "destructive" });
    },
  });

  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeEarningId, setRevokeEarningId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const revokeEarningMutation = useMutation({
    mutationFn: async ({ earningId, reason }: { earningId: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/incentives/revoke/${earningId}`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
      setShowRevokeDialog(false);
      setRevokeEarningId(null);
      setRevokeReason("");
      toast({ title: "Earning revoked", description: "Incentive earning has been revoked" });
    },
    onError: () => {
      toast({ title: "Revocation failed", description: "Could not revoke earning", variant: "destructive" });
    },
  });

  const evaluateIncentivesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/incentives/evaluate", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incentives/stats"] });
      toast({
        title: "Evaluation complete",
        description: `Evaluated ${data.evaluated} drivers. ${data.newEarnings} new earnings, ${data.blocked} blocked.`,
      });
    },
    onError: () => {
      toast({ title: "Evaluation failed", description: "Could not evaluate incentives", variant: "destructive" });
    },
  });

  // Growth Tab - State, Queries, and Mutations
  const [showCreateCampaignDialog, setShowCreateCampaignDialog] = useState(false);
  const [showCreatePartnerLeadDialog, setShowCreatePartnerLeadDialog] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "referral" as string,
    description: "",
    startDate: "",
    endDate: "",
  });
  const [newPartnerLead, setNewPartnerLead] = useState({
    organizationName: "",
    contactName: "",
    email: "",
    phone: "",
    type: "corporate" as "corporate" | "fleet" | "enterprise" | "reseller",
    notes: "",
  });

  const [showCreateReactivationRuleDialog, setShowCreateReactivationRuleDialog] = useState(false);
  const [newReactivationRule, setNewReactivationRule] = useState({
    name: "",
    targetRole: "rider" as string,
    inactiveDaysThreshold: 30,
    messageTitle: "",
    messageBody: "",
    incentiveType: "" as string,
    incentiveValue: "" as string,
    countryCode: "" as string,
  });
  const [growthSafetyForm, setGrowthSafetyForm] = useState<GrowthSafetyStatus>({
    viralityEnabled: true,
    shareMomentsEnabled: true,
    reactivationEnabled: true,
    maxReferralRewardPerUser: null,
    maxDailyReferrals: null,
    countryOverrides: [],
  });
  const [growthSafetyLoaded, setGrowthSafetyLoaded] = useState(false);

  const { data: growthStats } = useQuery<GrowthStats>({
    queryKey: ["/api/growth/stats"],
    queryFn: async () => {
      const res = await fetch("/api/growth/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch growth stats");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator,
  });

  const { data: referralCodes = [], isLoading: referralCodesLoading } = useQuery<ReferralCodeWithDetails[]>({
    queryKey: ["/api/referrals"],
    queryFn: async () => {
      const res = await fetch("/api/referrals", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch referral codes");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "growth",
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<CampaignWithDetails[]>({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "growth",
  });

  const { data: partnerLeads = [], isLoading: partnerLeadsLoading } = useQuery<PartnerLeadWithDetails[]>({
    queryKey: ["/api/partners/leads"],
    queryFn: async () => {
      const res = await fetch("/api/partners/leads", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch partner leads");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "growth",
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      const res = await apiRequest("POST", "/api/campaigns", {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/growth/stats"] });
      setShowCreateCampaignDialog(false);
      setNewCampaign({ name: "", type: "referral", description: "", startDate: "", endDate: "" });
      toast({ title: "Campaign created", description: "Campaign created successfully" });
    },
    onError: () => {
      toast({ title: "Creation failed", description: "Could not create campaign", variant: "destructive" });
    },
  });

  const updateCampaignStatusMutation = useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/campaigns/${campaignId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/growth/stats"] });
      toast({ title: "Campaign updated", description: "Campaign status updated" });
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not update campaign status", variant: "destructive" });
    },
  });

  const createPartnerLeadMutation = useMutation({
    mutationFn: async (data: typeof newPartnerLead) => {
      const res = await apiRequest("POST", "/api/partners/lead", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/growth/stats"] });
      setShowCreatePartnerLeadDialog(false);
      setNewPartnerLead({ organizationName: "", contactName: "", email: "", phone: "", type: "corporate", notes: "" });
      toast({ title: "Partner lead created", description: "Partner lead added successfully" });
    },
    onError: () => {
      toast({ title: "Creation failed", description: "Could not create partner lead", variant: "destructive" });
    },
  });

  const updatePartnerLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/partners/leads/${leadId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/growth/stats"] });
      toast({ title: "Lead updated", description: "Partner lead status updated" });
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not update lead status", variant: "destructive" });
    },
  });

  // Phase 11A - Enhanced Campaign Details, Reactivation Rules, Attribution, Growth Safety
  const { data: enhancedCampaigns = [], isLoading: enhancedCampaignsLoading } = useQuery<EnhancedCampaignWithDetails[]>({
    queryKey: ["/api/campaigns/with-details"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns/with-details", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch enhanced campaigns");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "growth",
  });

  const { data: reactivationRules = [], isLoading: reactivationRulesLoading } = useQuery<ReactivationRule[]>({
    queryKey: ["/api/reactivation-rules"],
    queryFn: async () => {
      const res = await fetch("/api/reactivation-rules", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reactivation rules");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "growth",
  });

  const { data: attributionStats = [] } = useQuery<AttributionStat[]>({
    queryKey: ["/api/attribution/stats"],
    queryFn: async () => {
      const res = await fetch("/api/attribution/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attribution stats");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "growth",
  });

  const { data: growthSafetyData } = useQuery<GrowthSafetyStatus>({
    queryKey: ["/api/growth-safety"],
    queryFn: async () => {
      const res = await fetch("/api/growth-safety", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch growth safety");
      return res.json();
    },
    enabled: !!user && !isDirector && !isTripCoordinator && activeTab === "growth",
  });

  useEffect(() => {
    if (growthSafetyData && !growthSafetyLoaded) {
      setGrowthSafetyForm(growthSafetyData);
      setGrowthSafetyLoaded(true);
    }
  }, [growthSafetyData, growthSafetyLoaded]);

  const createReactivationRuleMutation = useMutation({
    mutationFn: async (data: typeof newReactivationRule) => {
      const res = await apiRequest("POST", "/api/reactivation-rules", {
        ...data,
        incentiveType: data.incentiveType || null,
        incentiveValue: data.incentiveValue || null,
        countryCode: data.countryCode || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reactivation-rules"] });
      setShowCreateReactivationRuleDialog(false);
      setNewReactivationRule({ name: "", targetRole: "rider", inactiveDaysThreshold: 30, messageTitle: "", messageBody: "", incentiveType: "", incentiveValue: "", countryCode: "" });
      toast({ title: "Rule created", description: "Reactivation rule created successfully" });
    },
    onError: () => {
      toast({ title: "Creation failed", description: "Could not create reactivation rule", variant: "destructive" });
    },
  });

  const updateReactivationRuleStatusMutation = useMutation({
    mutationFn: async ({ ruleId, status }: { ruleId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/reactivation-rules/${ruleId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reactivation-rules"] });
      toast({ title: "Rule updated", description: "Reactivation rule status updated" });
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not update rule status", variant: "destructive" });
    },
  });

  const saveGrowthSafetyMutation = useMutation({
    mutationFn: async (data: GrowthSafetyStatus) => {
      const res = await apiRequest("POST", "/api/growth-safety", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-safety"] });
      toast({ title: "Settings saved", description: "Growth safety controls updated successfully" });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save growth safety settings", variant: "destructive" });
    },
  });

  const getAttributionCount = (source: string): number => {
    const stat = attributionStats.find(s => s.source === source);
    return stat?.count || 0;
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "User deleted",
        description: "User has been permanently removed from the platform",
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
        description: error.message || "Failed to delete user",
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

  // Pairing blocks query (Super Admin only)
  const { data: pairingBlocks = [], isLoading: pairingBlocksLoading, refetch: refetchPairingBlocks } = useQuery<{
    id: string;
    riderId: string;
    driverId: string;
    reason: string;
    tripId?: string;
    ratingScore?: number;
    isActive: boolean;
    removedByAdminId?: string;
    removalReason?: string;
    removedAt?: string;
    createdAt: string;
  }[]>({
    queryKey: ["/api/admin/pairing-blocks"],
    enabled: !!user && isSuperAdmin,
  });

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

  // Remove pairing block mutation (Super Admin only)
  const removePairingBlockMutation = useMutation({
    mutationFn: async ({ riderId, driverId, reason }: { riderId: string; driverId: string; reason: string }) => {
      const response = await apiRequest("POST", "/api/admin/pairing-blocks/remove", { riderId, driverId, reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pairing-blocks"] });
      toast({ title: "Block removed", description: "The pairing block has been removed" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to remove pairing block", variant: "destructive" });
    },
  });

  // Adjust user rating mutation (Super Admin only)
  const adjustRatingMutation = useMutation({
    mutationFn: async ({ targetUserId, newRating, reason, adminNote, resetRatingCount }: { targetUserId: string; newRating: number; reason: string; adminNote?: string; resetRatingCount?: boolean }) => {
      const response = await apiRequest("POST", "/api/admin/trust/adjust-rating", { targetUserId, newRating, reason, adminNote, resetRatingCount });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trust/profiles"] });
      toast({ 
        title: "Rating adjusted", 
        description: `Rating changed from ${data.oldRating} to ${data.newRating}` 
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to adjust rating", variant: "destructive" });
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
            <ProfileDropdown user={user} role={isDirector ? "director" : "admin"} onLogout={logout} />
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
          <Card 
            className="cursor-pointer hover-elevate transition-all" 
            onClick={() => setActiveTab("drivers")}
            data-testid="kpi-total-drivers"
          >
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Car className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{stats?.totalDrivers || 0}</p>
                <p className="text-sm text-muted-foreground">Total Drivers</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover-elevate transition-all" 
            onClick={() => setLocation("/admin/approvals")}
            data-testid="kpi-pending-approval"
          >
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{stats?.pendingDrivers || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover-elevate transition-all" 
            onClick={() => setActiveTab("riders")}
            data-testid="kpi-total-riders"
          >
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{stats?.totalRiders || 0}</p>
                <p className="text-sm text-muted-foreground">Total Riders</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover-elevate transition-all" 
            onClick={() => setActiveTab("trips")}
            data-testid="kpi-total-trips"
          >
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{stats?.totalTrips || 0}</p>
                <p className="text-sm text-muted-foreground">Total Trips</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover-elevate transition-all" 
            onClick={() => setActiveTab("trips")}
            data-testid="kpi-active-trips"
          >
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{stats?.activeTrips || 0}</p>
                <p className="text-sm text-muted-foreground">Active Trips</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card 
              className="cursor-pointer hover-elevate transition-all" 
              onClick={() => setActiveTab("trips")}
              data-testid="kpi-completed-trips"
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold">{stats?.completedTrips || 0}</p>
                  <p className="text-sm text-muted-foreground">Completed Trips</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate transition-all" 
              onClick={() => setActiveTab("reports")}
              data-testid="card-total-fares"
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold">${stats?.totalFares || "0.00"}</p>
                  <p className="text-sm text-muted-foreground">Total Fares</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate transition-all" 
              onClick={() => setActiveTab("reports")}
              data-testid="card-total-commission"
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold">${stats?.totalCommission || "0.00"}</p>
                  <p className="text-sm text-muted-foreground">ZIBA Commission (20%)</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate transition-all" 
              onClick={() => setActiveTab("payouts")}
              data-testid="card-driver-payouts"
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Wallet className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold">${stats?.totalDriverPayouts || "0.00"}</p>
                  <p className="text-sm text-muted-foreground">Driver Payouts</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Super Admin Tools Section */}
        {isSuperAdmin && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              Super Admin Tools
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card 
                className="cursor-pointer hover-elevate transition-all" 
                onClick={() => setActiveTab("training")}
                data-testid="card-super-admin-training"
              >
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <TestTube className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold">Training</p>
                    <p className="text-sm text-muted-foreground">Manage training users</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover-elevate transition-all" 
                onClick={() => setActiveTab("role-appointments")}
                data-testid="card-super-admin-role-appointments"
              >
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold">Role Appointments</p>
                    <p className="text-sm text-muted-foreground">Assign admin roles</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover-elevate transition-all" 
                onClick={() => setActiveTab("admin-management")}
                data-testid="card-super-admin-admin-management"
              >
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                    <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold">Admin Management</p>
                    <p className="text-sm text-muted-foreground">Manage admin accounts</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover-elevate transition-all" 
                onClick={() => setActiveTab("simulation")}
                data-testid="card-super-admin-simulation"
              >
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Play className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold">Simulation Center</p>
                    <p className="text-sm text-muted-foreground">Generate simulation codes</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Primary Navigation Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            Management Center
          </h2>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="admin-nav-bar mb-6 flex-wrap h-auto gap-0 p-1 rounded-lg">
              <TabsTrigger value="drivers" className="admin-nav-trigger rounded-md" data-testid="tab-drivers">
              <Car className="h-4 w-4 mr-2" />
              Drivers
              {pendingDrivers.length > 0 && (
                <span className="ml-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs text-white">
                  {pendingDrivers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="riders" className="admin-nav-trigger rounded-md" data-testid="tab-riders">
              <Users className="h-4 w-4 mr-2" />
              Riders
            </TabsTrigger>
            <TabsTrigger value="trips" className="admin-nav-trigger rounded-md" data-testid="tab-trips">
              <MapPin className="h-4 w-4 mr-2" />
              Trips
            </TabsTrigger>
            <TabsTrigger value="reservations" className="admin-nav-trigger rounded-md" data-testid="tab-reservations">
              <Calendar className="h-4 w-4 mr-2" />
              Reservations
            </TabsTrigger>
            <TabsTrigger value="payouts" className="admin-nav-trigger rounded-md" data-testid="tab-payouts">
              <Wallet className="h-4 w-4 mr-2" />
              Payouts
              {pendingPayouts.length > 0 && (
                <span className="ml-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs text-white font-bold">
                  {pendingPayouts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ratings" className="admin-nav-trigger rounded-md" data-testid="tab-ratings">
              <Star className="h-4 w-4 mr-2" />
              Ratings
            </TabsTrigger>
            <TabsTrigger value="disputes" className="admin-nav-trigger rounded-md" data-testid="tab-disputes">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Disputes
              {openDisputes.length > 0 && (
                <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                  {openDisputes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="refunds" className="admin-nav-trigger rounded-md" data-testid="tab-refunds">
              <DollarSign className="h-4 w-4 mr-2" />
              Refunds
              {pendingRefunds.length > 0 && (
                <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                  {pendingRefunds.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="chargebacks" className="admin-nav-trigger rounded-md" data-testid="tab-chargebacks">
              <CreditCard className="h-4 w-4 mr-2" />
              Chargebacks
              {reportedChargebacks.length > 0 && (
                <span className="ml-2 bg-red-400 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                  {reportedChargebacks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="wallets" className="admin-nav-trigger rounded-md" data-testid="tab-wallets">
              <Wallet className="h-4 w-4 mr-2" />
              Wallets
              {pendingWalletPayouts.length > 0 && (
                <span className="ml-2 bg-blue-400 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                  {pendingWalletPayouts.length}
                </span>
              )}
            </TabsTrigger>
            {!isDirector && (
              <TabsTrigger value="directors" className="admin-nav-trigger rounded-md" data-testid="tab-directors">
                <Briefcase className="h-4 w-4 mr-2" />
                Directors
              </TabsTrigger>
            )}
            {!isDirector && (
              <TabsTrigger value="reports" className="admin-nav-trigger rounded-md" data-testid="tab-reports">
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </TabsTrigger>
            )}
            {!isDirector && (
              <TabsTrigger value="fraud" className="admin-nav-trigger rounded-md" data-testid="tab-fraud">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Fraud
                {fraudOverview && (fraudOverview.riskProfiles.high + fraudOverview.riskProfiles.critical) > 0 && (
                  <span className="ml-2 bg-red-400 text-white rounded-full px-2 py-0.5 text-xs font-bold">
                    {fraudOverview.riskProfiles.high + fraudOverview.riskProfiles.critical}
                  </span>
                )}
              </TabsTrigger>
            )}
            {!isDirector && !isTripCoordinator && (
              <TabsTrigger value="countries" className="admin-nav-trigger rounded-md" data-testid="tab-countries">
                <Globe className="h-4 w-4 mr-2" />
                Countries
              </TabsTrigger>
            )}
            {!isDirector && !isTripCoordinator && (
              <TabsTrigger value="contracts" className="admin-nav-trigger rounded-md" data-testid="tab-contracts">
                <FileText className="h-4 w-4 mr-2" />
                Contracts
              </TabsTrigger>
            )}
            {!isDirector && !isTripCoordinator && (
              <TabsTrigger value="growth" className="admin-nav-trigger rounded-md" data-testid="tab-growth">
                <TrendingUp className="h-4 w-4 mr-2" />
                Growth
              </TabsTrigger>
            )}
            {!isDirector && !isTripCoordinator && (
              <TabsTrigger value="monitoring" className="admin-nav-trigger rounded-md" data-testid="tab-monitoring">
                <Activity className="h-4 w-4 mr-2" />
                Monitoring
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="admin-management" className="admin-nav-trigger rounded-md" data-testid="tab-admin-management">
                <Shield className="h-4 w-4 mr-2" />
                Admin Management
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="role-appointments" className="admin-nav-trigger rounded-md" data-testid="tab-role-appointments">
                <UserCheck className="h-4 w-4 mr-2" />
                Role Appointments
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="training" className="admin-nav-trigger rounded-md" data-testid="tab-training">
                <TestTube className="h-4 w-4 mr-2" />
                Training
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="pairing-blocks" className="admin-nav-trigger rounded-md" data-testid="tab-pairing-blocks">
                <UserX className="h-4 w-4 mr-2" />
                Pairing Blocks
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="overrides" className="admin-nav-trigger rounded-md" data-testid="tab-overrides">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Overrides
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="user-growth" className="admin-nav-trigger rounded-md" data-testid="tab-user-growth">
                <TrendingUp className="h-4 w-4 mr-2" />
                User Growth
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="launch-readiness" className="admin-nav-trigger rounded-md" data-testid="tab-launch-readiness">
                <Rocket className="h-4 w-4 mr-2" />
                Launch Control
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin" || userRole === "finance") && (
              <TabsTrigger value="incentives" className="admin-nav-trigger rounded-md" data-testid="tab-incentives">
                <Award className="h-4 w-4 mr-2" />
                Incentives
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="acquisition" className="admin-nav-trigger rounded-md" data-testid="tab-acquisition">
                <UserPlus className="h-4 w-4 mr-2" />
                Acquisition
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin" || userRole === "support_agent") && (
              <TabsTrigger value="help-center" className="admin-nav-trigger rounded-md" data-testid="tab-help-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Help Center
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="safety" className="admin-nav-trigger rounded-md" data-testid="tab-safety">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Safety
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="compliance-logs" className="admin-nav-trigger rounded-md" data-testid="tab-compliance-logs">
                <Shield className="h-4 w-4 mr-2" />
                Compliance Logs
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="support-logs" className="admin-nav-trigger rounded-md" data-testid="tab-support-logs">
                <Headphones className="h-4 w-4 mr-1" />
                Support Logs
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="zibra-insights" className="admin-nav-trigger rounded-md" data-testid="tab-zibra-insights">
                <BarChart3 className="h-4 w-4 mr-2" />
                ZIBRA Insights
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="zibra-governance" className="admin-nav-trigger rounded-md" data-testid="tab-zibra-governance">
                <Settings2 className="h-4 w-4 mr-2" />
                ZIBRA Governance
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="tax-documents" className="admin-nav-trigger rounded-md" data-testid="tab-tax-documents">
                <ScrollText className="h-4 w-4 mr-2" />
                Tax Documents
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="cash-settlements" className="admin-nav-trigger rounded-md" data-testid="tab-cash-settlements">
                <Briefcase className="h-4 w-4 mr-2" />
                Cash Settlements
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin" || userRole === "finance") && (
              <TabsTrigger value="bank-transfers" className="admin-nav-trigger rounded-md" data-testid="tab-bank-transfers">
                <Banknote className="h-4 w-4 mr-2" />
                Bank Transfers
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="cash-disputes" className="admin-nav-trigger rounded-md" data-testid="tab-cash-disputes">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Cash Disputes
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="corporate" className="admin-nav-trigger rounded-md" data-testid="tab-corporate">
                <Building className="h-4 w-4 mr-2" />
                Corporate Rides
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="fee-settings" className="admin-nav-trigger rounded-md" data-testid="tab-fee-settings">
                <Settings className="h-4 w-4 mr-2" />
                Fee Settings
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="simulation" className="admin-nav-trigger rounded-md" data-testid="tab-simulation">
                <Play className="h-4 w-4 mr-2" />
                Simulation
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="lost-items" className="admin-nav-trigger rounded-md" data-testid="tab-lost-items">
                <Package className="h-4 w-4 mr-2" />
                Lost Items
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="accident-reports" className="admin-nav-trigger rounded-md" data-testid="tab-accident-reports">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Accidents
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="insurance" className="admin-nav-trigger rounded-md" data-testid="tab-insurance">
                <Shield className="h-4 w-4 mr-2" />
                Insurance
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="relief-fund" className="admin-nav-trigger rounded-md" data-testid="tab-relief-fund">
                <Heart className="h-4 w-4 mr-2" />
                Relief Fund
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="lost-item-fraud" className="admin-nav-trigger rounded-md" data-testid="tab-lost-item-fraud">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Fraud Detection
              </TabsTrigger>
            )}
            {(isSuperAdmin || userRole === "admin") && (
              <TabsTrigger value="inbox" className="admin-nav-trigger rounded-md" data-testid="tab-inbox">
                <Mail className="h-4 w-4 mr-2" />
                Inbox
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="drivers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Driver Management</CardTitle>
                  <CardDescription>
                    Approve, suspend, or manage driver accounts
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={driverStatusFilter} onValueChange={setDriverStatusFilter}>
                    <SelectTrigger className="w-[160px]" data-testid="select-driver-status-filter">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  {driverStatusFilter && driverStatusFilter !== "all" && (
                    <Button variant="ghost" size="sm" onClick={() => setDriverStatusFilter("")} data-testid="button-clear-driver-filter">
                      Clear
                    </Button>
                  )}
                </div>
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
                        {drivers
                          .filter(d => !driverStatusFilter || driverStatusFilter === "all" || d.status === driverStatusFilter)
                          .map((driver) => (
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
                                {!isDirector && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        data-testid={`button-delete-driver-${driver.id}`}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this driver?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently remove {driver.fullName} from the platform. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() => deleteUserMutation.mutate(driver.userId)}
                                          disabled={deleteUserMutation.isPending}
                                        >
                                          {deleteUserMutation.isPending ? "Deleting..." : "Delete Driver"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
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
                          <TableHead className="text-right">Actions</TableHead>
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
                            <TableCell className="text-right">
                              {!isDirector && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      data-testid={`button-delete-rider-${rider.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete this rider?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently remove {rider.fullName || rider.email} from the platform. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => deleteUserMutation.mutate(rider.id)}
                                        disabled={deleteUserMutation.isPending}
                                      >
                                        {deleteUserMutation.isPending ? "Deleting..." : "Delete Rider"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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

          <TabsContent value="reservations">
            <div className="space-y-6">
              <AdminScheduledTripsPanel />
              <AdminReservationsPanel />
            </div>
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

          {!isDirector && (
            <TabsContent value="fraud">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5" />
                          Fraud Detection & Risk Scoring
                        </CardTitle>
                        <CardDescription>
                          Monitor suspicious activity and manage risk profiles
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => runFraudEvaluationMutation.mutate()}
                        disabled={runFraudEvaluationMutation.isPending}
                        data-testid="button-run-fraud-evaluation"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${runFraudEvaluationMutation.isPending ? "animate-spin" : ""}`} />
                        Run Evaluation
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {fraudOverview && (
                      <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Low Risk</CardDescription>
                              <CardTitle className="text-2xl text-green-600" data-testid="text-fraud-low">
                                {fraudOverview.riskProfiles.low}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs text-muted-foreground">Score 0-20</div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Medium Risk</CardDescription>
                              <CardTitle className="text-2xl text-yellow-600" data-testid="text-fraud-medium">
                                {fraudOverview.riskProfiles.medium}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs text-muted-foreground">Score 21-50</div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>High Risk</CardDescription>
                              <CardTitle className="text-2xl text-orange-600" data-testid="text-fraud-high">
                                {fraudOverview.riskProfiles.high}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs text-muted-foreground">Score 51-80</div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Critical Risk</CardDescription>
                              <CardTitle className="text-2xl text-red-600" data-testid="text-fraud-critical">
                                {fraudOverview.riskProfiles.critical}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs text-muted-foreground">Score 81-100</div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Total Risk Profiles</CardDescription>
                              <CardTitle className="text-xl">{fraudOverview.riskProfiles.total}</CardTitle>
                            </CardHeader>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Active Fraud Events</CardDescription>
                              <CardTitle className="text-xl">
                                <span className="text-red-600">{fraudOverview.fraudEvents.unresolved}</span>
                                <span className="text-muted-foreground text-sm ml-2">/ {fraudOverview.fraudEvents.total} total</span>
                              </CardTitle>
                            </CardHeader>
                          </Card>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <CardTitle className="text-lg">Risk Profiles</CardTitle>
                      <Select value={fraudLevelFilter} onValueChange={setFraudLevelFilter}>
                        <SelectTrigger className="w-[140px]" data-testid="select-fraud-level">
                          <SelectValue placeholder="Filter by level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {riskProfiles.length === 0 ? (
                      <EmptyState
                        icon={ShieldAlert}
                        title="No risk profiles"
                        description="Run the fraud evaluation to generate risk profiles"
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Level</TableHead>
                              <TableHead>Last Evaluated</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {riskProfiles.map((profile) => (
                              <TableRow key={profile.id} data-testid={`row-risk-profile-${profile.id}`}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{profile.userName}</div>
                                    <div className="text-xs text-muted-foreground">{profile.email}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="capitalize">{profile.role}</TableCell>
                                <TableCell>
                                  <span className={`font-bold ${
                                    profile.score >= 81 ? "text-red-600" :
                                    profile.score >= 51 ? "text-orange-600" :
                                    profile.score >= 21 ? "text-yellow-600" :
                                    "text-green-600"
                                  }`}>
                                    {profile.score}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={profile.level} />
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {new Date(profile.lastEvaluatedAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Active Fraud Events</CardTitle>
                    <CardDescription>Unresolved suspicious activity alerts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {fraudEvents.length === 0 ? (
                      <EmptyState
                        icon={CheckCircle}
                        title="No active fraud events"
                        description="All fraud events have been resolved"
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Entity</TableHead>
                              <TableHead>Signal Type</TableHead>
                              <TableHead>Severity</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Detected</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fraudEvents.map((event) => (
                              <TableRow key={event.id} data-testid={`row-fraud-event-${event.id}`}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-sm">{event.entityName}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{event.entityType}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">{event.signalType}</TableCell>
                                <TableCell>
                                  <StatusBadge status={event.severity} />
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                  {event.description}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {new Date(event.detectedAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => resolveFraudEventMutation.mutate(event.id)}
                                    disabled={resolveFraudEventMutation.isPending}
                                    data-testid={`button-resolve-${event.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Resolve
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
          )}

          {/* Countries Tab - Phase 15 */}
          {!isDirector && !isTripCoordinator && (
            <TabsContent value="countries">
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Countries</CardTitle>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{complianceOverview?.totalCountries || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Countries</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{complianceOverview?.activeCountries || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tax Rules</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{complianceOverview?.taxRulesCount || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Estimated Tax</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${complianceOverview?.totalEstimatedTax || "0.00"}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  variant={countriesSubTab === "countries" ? "default" : "outline"}
                  onClick={() => setCountriesSubTab("countries")}
                  data-testid="button-subtab-countries"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Countries
                </Button>
                <Button
                  variant={countriesSubTab === "taxes" ? "default" : "outline"}
                  onClick={() => setCountriesSubTab("taxes")}
                  data-testid="button-subtab-taxes"
                >
                  <Percent className="h-4 w-4 mr-2" />
                  Tax Rules
                </Button>
                <Button
                  variant={countriesSubTab === "rates" ? "default" : "outline"}
                  onClick={() => setCountriesSubTab("rates")}
                  data-testid="button-subtab-rates"
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Exchange Rates
                </Button>
              </div>

              {countriesSubTab === "countries" && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Countries</CardTitle>
                        <CardDescription>Manage operating countries</CardDescription>
                      </div>
                      <Button onClick={() => setShowCreateCountryDialog(true)} data-testid="button-create-country">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Country
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {countriesLoading ? (
                      <div className="py-8 text-center text-muted-foreground">Loading countries...</div>
                    ) : countriesData.length === 0 ? (
                      <EmptyState
                        icon={Globe}
                        title="No countries configured"
                        description="Add operating countries to enable multi-country support"
                      />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Country</TableHead>
                            <TableHead>ISO Code</TableHead>
                            <TableHead>Currency</TableHead>
                            <TableHead>Timezone</TableHead>
                            <TableHead>Tax Rules</TableHead>
                            <TableHead>Revenue</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {countriesData.map((country) => (
                            <TableRow key={country.id} data-testid={`row-country-${country.id}`}>
                              <TableCell className="font-medium">{country.name}</TableCell>
                              <TableCell><Badge variant="outline">{country.isoCode}</Badge></TableCell>
                              <TableCell>{country.currency}</TableCell>
                              <TableCell>{country.timezone}</TableCell>
                              <TableCell>{country.taxRulesCount}</TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-medium" data-testid={`text-revenue-native-${country.id}`}>
                                    {country.currency} {parseFloat(country.totalRevenue || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  {country.currency !== "USD" && (
                                    <div className="text-xs text-muted-foreground" data-testid={`text-revenue-usd-${country.id}`}>
                                      {country.totalRevenueUsd
                                        ? `~ $${parseFloat(country.totalRevenueUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                                        : "USD rate unavailable"}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={country.active ? "default" : "secondary"}>
                                  {country.active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleCountryMutation.mutate({ countryId: country.id, active: !country.active })}
                                  data-testid={`button-toggle-country-${country.id}`}
                                >
                                  {country.active ? "Deactivate" : "Activate"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}

              {countriesSubTab === "taxes" && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Tax Rules</CardTitle>
                        <CardDescription>Configure tax rates by country</CardDescription>
                      </div>
                      <Button onClick={() => setShowCreateTaxRuleDialog(true)} data-testid="button-create-tax-rule">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tax Rule
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {taxRulesLoading ? (
                      <div className="py-8 text-center text-muted-foreground">Loading tax rules...</div>
                    ) : taxRulesData.length === 0 ? (
                      <EmptyState
                        icon={Percent}
                        title="No tax rules configured"
                        description="Add tax rules to calculate taxes for trips"
                      />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Applies To</TableHead>
                            <TableHead>Effective From</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {taxRulesData.map((rule) => (
                            <TableRow key={rule.id} data-testid={`row-tax-rule-${rule.id}`}>
                              <TableCell className="font-medium">{rule.name}</TableCell>
                              <TableCell>{rule.countryName || rule.countryCode}</TableCell>
                              <TableCell><Badge variant="outline">{rule.taxType}</Badge></TableCell>
                              <TableCell>{rule.rate}%</TableCell>
                              <TableCell>{rule.appliesTo}</TableCell>
                              <TableCell>{new Date(rule.effectiveFrom).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}

              {countriesSubTab === "rates" && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Exchange Rates</CardTitle>
                        <CardDescription>Manage currency exchange rates</CardDescription>
                      </div>
                      <Button onClick={() => setShowCreateExchangeRateDialog(true)} data-testid="button-create-exchange-rate">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Rate
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {exchangeRatesData.length === 0 ? (
                      <EmptyState
                        icon={ArrowLeftRight}
                        title="No exchange rates configured"
                        description="Add exchange rates for currency conversion"
                      />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Base Currency</TableHead>
                            <TableHead>Target Currency</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>As Of</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {exchangeRatesData.map((rate) => (
                            <TableRow key={rate.id} data-testid={`row-exchange-rate-${rate.id}`}>
                              <TableCell className="font-medium">{rate.baseCurrency}</TableCell>
                              <TableCell>{rate.targetCurrency}</TableCell>
                              <TableCell>{rate.rate}</TableCell>
                              <TableCell><Badge variant="outline">{rate.source}</Badge></TableCell>
                              <TableCell>{new Date(rate.asOfDate).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Create Country Dialog */}
              <Dialog open={showCreateCountryDialog} onOpenChange={setShowCreateCountryDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Country</DialogTitle>
                    <DialogDescription>Configure a new operating country</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium">Country Name</label>
                      <Input
                        value={newCountry.name}
                        onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
                        placeholder="e.g., Kenya"
                        data-testid="input-country-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">ISO Code (2-3 chars)</label>
                      <Input
                        value={newCountry.isoCode}
                        onChange={(e) => setNewCountry({ ...newCountry, isoCode: e.target.value.toUpperCase() })}
                        placeholder="e.g., KE"
                        maxLength={3}
                        data-testid="input-country-iso"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Currency Code</label>
                      <Input
                        value={newCountry.currency}
                        onChange={(e) => setNewCountry({ ...newCountry, currency: e.target.value.toUpperCase() })}
                        placeholder="e.g., KES"
                        maxLength={3}
                        data-testid="input-country-currency"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Timezone</label>
                      <Input
                        value={newCountry.timezone}
                        onChange={(e) => setNewCountry({ ...newCountry, timezone: e.target.value })}
                        placeholder="e.g., Africa/Nairobi"
                        data-testid="input-country-timezone"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateCountryDialog(false)}>Cancel</Button>
                    <Button
                      onClick={() => createCountryMutation.mutate(newCountry)}
                      disabled={createCountryMutation.isPending || !newCountry.name || !newCountry.isoCode || !newCountry.currency || !newCountry.timezone}
                      data-testid="button-submit-country"
                    >
                      Add Country
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Create Tax Rule Dialog */}
              <Dialog open={showCreateTaxRuleDialog} onOpenChange={setShowCreateTaxRuleDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Tax Rule</DialogTitle>
                    <DialogDescription>Configure a tax rate for a country</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium">Country</label>
                      <Select value={newTaxRule.countryId} onValueChange={(v) => setNewTaxRule({ ...newTaxRule, countryId: v })}>
                        <SelectTrigger data-testid="select-tax-rule-country">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countriesData.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={newTaxRule.name}
                        onChange={(e) => setNewTaxRule({ ...newTaxRule, name: e.target.value })}
                        placeholder="e.g., VAT"
                        data-testid="input-tax-rule-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tax Type</label>
                      <Select value={newTaxRule.taxType} onValueChange={(v) => setNewTaxRule({ ...newTaxRule, taxType: v })}>
                        <SelectTrigger data-testid="select-tax-rule-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VAT">VAT</SelectItem>
                          <SelectItem value="SALES">Sales Tax</SelectItem>
                          <SelectItem value="SERVICE">Service Tax</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Rate (%)</label>
                      <Input
                        type="number"
                        value={newTaxRule.rate}
                        onChange={(e) => setNewTaxRule({ ...newTaxRule, rate: e.target.value })}
                        placeholder="e.g., 16"
                        data-testid="input-tax-rule-rate"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Applies To</label>
                      <Select value={newTaxRule.appliesTo} onValueChange={(v) => setNewTaxRule({ ...newTaxRule, appliesTo: v })}>
                        <SelectTrigger data-testid="select-tax-rule-applies">
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FARE">Fare Only</SelectItem>
                          <SelectItem value="COMMISSION">Commission Only</SelectItem>
                          <SelectItem value="BOTH">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Effective From</label>
                      <Input
                        type="date"
                        value={newTaxRule.effectiveFrom}
                        onChange={(e) => setNewTaxRule({ ...newTaxRule, effectiveFrom: e.target.value })}
                        data-testid="input-tax-rule-effective"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateTaxRuleDialog(false)}>Cancel</Button>
                    <Button
                      onClick={() => createTaxRuleMutation.mutate(newTaxRule)}
                      disabled={createTaxRuleMutation.isPending || !newTaxRule.countryId || !newTaxRule.name || !newTaxRule.rate || !newTaxRule.effectiveFrom}
                      data-testid="button-submit-tax-rule"
                    >
                      Add Tax Rule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Create Exchange Rate Dialog */}
              <Dialog open={showCreateExchangeRateDialog} onOpenChange={setShowCreateExchangeRateDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Exchange Rate</DialogTitle>
                    <DialogDescription>Configure a currency exchange rate</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium">Base Currency</label>
                      <Input
                        value={newExchangeRate.baseCurrency}
                        onChange={(e) => setNewExchangeRate({ ...newExchangeRate, baseCurrency: e.target.value.toUpperCase() })}
                        placeholder="e.g., USD"
                        maxLength={3}
                        data-testid="input-exchange-base"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Target Currency</label>
                      <Input
                        value={newExchangeRate.targetCurrency}
                        onChange={(e) => setNewExchangeRate({ ...newExchangeRate, targetCurrency: e.target.value.toUpperCase() })}
                        placeholder="e.g., KES"
                        maxLength={3}
                        data-testid="input-exchange-target"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Rate</label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={newExchangeRate.rate}
                        onChange={(e) => setNewExchangeRate({ ...newExchangeRate, rate: e.target.value })}
                        placeholder="e.g., 130.50"
                        data-testid="input-exchange-rate"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateExchangeRateDialog(false)}>Cancel</Button>
                    <Button
                      onClick={() => createExchangeRateMutation.mutate(newExchangeRate)}
                      disabled={createExchangeRateMutation.isPending || !newExchangeRate.baseCurrency || !newExchangeRate.targetCurrency || !newExchangeRate.rate}
                      data-testid="button-submit-exchange-rate"
                    >
                      Add Rate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          )}

          {/* Contracts Tab */}
          {!isDirector && !isTripCoordinator && (
            <TabsContent value="contracts">
              <div className="space-y-6">
                {/* Contract Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{contractStats?.totalContracts || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{contractStats?.activeContracts || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${contractStats?.totalBilled || "0.00"}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">{contractStats?.pendingInvoices || 0}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Contracts List */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <div>
                      <CardTitle>Enterprise Contracts</CardTitle>
                      <CardDescription>Manage organization contracts and SLAs</CardDescription>
                    </div>
                    <Button onClick={() => setShowCreateContractDialog(true)} data-testid="button-create-contract">
                      <Plus className="h-4 w-4 mr-2" />
                      New Contract
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {contractsLoading ? (
                      <div className="py-8 text-center text-muted-foreground">Loading contracts...</div>
                    ) : contracts.length === 0 ? (
                      <EmptyState
                        icon={FileText}
                        title="No contracts yet"
                        description="Enterprise contracts will appear here"
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Contract Name</TableHead>
                              <TableHead>Organization</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Billing</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>SLAs</TableHead>
                              <TableHead>Invoices</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {contracts.map((contract: any) => (
                              <TableRow key={contract.id} data-testid={`row-contract-${contract.id}`}>
                                <TableCell className="font-medium">{contract.contractName}</TableCell>
                                <TableCell>{contract.organizationName}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{contract.contractType}</Badge>
                                </TableCell>
                                <TableCell>{contract.billingModel}</TableCell>
                                <TableCell>
                                  <Badge variant={contract.status === "ACTIVE" ? "default" : "secondary"}>
                                    {contract.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{contract.slaCount || 0}</TableCell>
                                <TableCell>{contract.invoiceCount || 0}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedContractForInvoice(contract.id);
                                      setShowGenerateInvoiceDialog(true);
                                    }}
                                    data-testid={`button-generate-invoice-${contract.id}`}
                                  >
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Invoice
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

                {/* All Invoices */}
                <Card>
                  <CardHeader>
                    <CardTitle>Enterprise Invoices</CardTitle>
                    <CardDescription>Track and manage billing invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {allInvoices.length === 0 ? (
                      <EmptyState
                        icon={DollarSign}
                        title="No invoices yet"
                        description="Generated invoices will appear here"
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Invoice ID</TableHead>
                              <TableHead>Contract</TableHead>
                              <TableHead>Organization</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Trips</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allInvoices.map((invoice: any) => (
                              <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                                <TableCell className="font-mono text-sm">{invoice.id.slice(0, 8)}...</TableCell>
                                <TableCell>{invoice.contractName || "N/A"}</TableCell>
                                <TableCell>{invoice.organizationName || "N/A"}</TableCell>
                                <TableCell className="text-sm">
                                  {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{invoice.totalTrips}</TableCell>
                                <TableCell className="font-medium">${invoice.totalAmount}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    invoice.status === "PAID" ? "default" :
                                    invoice.status === "OVERDUE" ? "destructive" :
                                    "secondary"
                                  }>
                                    {invoice.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Select
                                    value={invoice.status}
                                    onValueChange={(status) => updateInvoiceStatusMutation.mutate({ invoiceId: invoice.id, status })}
                                  >
                                    <SelectTrigger className="w-28" data-testid={`select-invoice-status-${invoice.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="DRAFT">Draft</SelectItem>
                                      <SelectItem value="ISSUED">Issued</SelectItem>
                                      <SelectItem value="PAID">Paid</SelectItem>
                                      <SelectItem value="OVERDUE">Overdue</SelectItem>
                                    </SelectContent>
                                  </Select>
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

              {/* Create Contract Dialog */}
              <Dialog open={showCreateContractDialog} onOpenChange={setShowCreateContractDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Enterprise Contract</DialogTitle>
                    <DialogDescription>Set up a new contract for an organization</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium">Organization (Trip Coordinator)</label>
                      <Select value={newContract.tripCoordinatorId} onValueChange={(v) => setNewContract({ ...newContract, tripCoordinatorId: v })}>
                        <SelectTrigger data-testid="select-contract-coordinator">
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {tripCoordinators.map((tc: any) => (
                            <SelectItem key={tc.userId} value={tc.userId}>
                              {tc.organizationName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Contract Name</label>
                      <Input
                        value={newContract.contractName}
                        onChange={(e) => setNewContract({ ...newContract, contractName: e.target.value })}
                        placeholder="e.g., Annual Service Agreement"
                        data-testid="input-contract-name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Contract Type</label>
                        <Select value={newContract.contractType} onValueChange={(v) => setNewContract({ ...newContract, contractType: v })}>
                          <SelectTrigger data-testid="select-contract-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NGO">NGO</SelectItem>
                            <SelectItem value="HOSPITAL">Hospital</SelectItem>
                            <SelectItem value="CHURCH">Church</SelectItem>
                            <SelectItem value="SCHOOL">School</SelectItem>
                            <SelectItem value="GOV">Government</SelectItem>
                            <SelectItem value="CORPORATE">Corporate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Billing Model</label>
                        <Select value={newContract.billingModel} onValueChange={(v) => setNewContract({ ...newContract, billingModel: v })}>
                          <SelectTrigger data-testid="select-billing-model">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PREPAID">Prepaid</SelectItem>
                            <SelectItem value="POSTPAID">Postpaid</SelectItem>
                            <SelectItem value="MONTHLY_INVOICE">Monthly Invoice</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Start Date</label>
                        <Input
                          type="date"
                          value={newContract.startDate}
                          onChange={(e) => setNewContract({ ...newContract, startDate: e.target.value })}
                          data-testid="input-contract-start"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Date</label>
                        <Input
                          type="date"
                          value={newContract.endDate}
                          onChange={(e) => setNewContract({ ...newContract, endDate: e.target.value })}
                          data-testid="input-contract-end"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Currency</label>
                      <Input
                        value={newContract.currency}
                        onChange={(e) => setNewContract({ ...newContract, currency: e.target.value.toUpperCase() })}
                        placeholder="USD"
                        maxLength={3}
                        data-testid="input-contract-currency"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateContractDialog(false)}>Cancel</Button>
                    <Button
                      onClick={() => createContractMutation.mutate(newContract)}
                      disabled={createContractMutation.isPending || !newContract.tripCoordinatorId || !newContract.contractName || !newContract.startDate || !newContract.endDate}
                      data-testid="button-submit-contract"
                    >
                      Create Contract
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Generate Invoice Dialog */}
              <Dialog open={showGenerateInvoiceDialog} onOpenChange={setShowGenerateInvoiceDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Invoice</DialogTitle>
                    <DialogDescription>Create an invoice for the billing period</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium">Period Start</label>
                      <Input
                        type="date"
                        value={invoicePeriod.startDate}
                        onChange={(e) => setInvoicePeriod({ ...invoicePeriod, startDate: e.target.value })}
                        data-testid="input-invoice-start"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Period End</label>
                      <Input
                        type="date"
                        value={invoicePeriod.endDate}
                        onChange={(e) => setInvoicePeriod({ ...invoicePeriod, endDate: e.target.value })}
                        data-testid="input-invoice-end"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowGenerateInvoiceDialog(false)}>Cancel</Button>
                    <Button
                      onClick={() => {
                        if (selectedContractForInvoice) {
                          generateInvoiceMutation.mutate({
                            contractId: selectedContractForInvoice,
                            periodStart: invoicePeriod.startDate,
                            periodEnd: invoicePeriod.endDate
                          });
                        }
                      }}
                      disabled={generateInvoiceMutation.isPending || !invoicePeriod.startDate || !invoicePeriod.endDate}
                      data-testid="button-submit-invoice"
                    >
                      Generate Invoice
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          )}

          {/* Growth Tab */}
          {!isDirector && !isTripCoordinator && (
            <TabsContent value="growth">
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Referral Codes</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-referral-codes">
                      {growthStats?.totalReferralCodes || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="stat-active-referral-codes">
                      {growthStats?.activeReferralCodes || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-referrals">
                      {growthStats?.totalReferrals || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-conversion-rate">
                      {growthStats?.referralConversionRate || "0%"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600" data-testid="stat-active-campaigns">
                      {growthStats?.activeCampaigns || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Partner Leads</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-partner-leads">
                      {growthStats?.totalPartnerLeads || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Signed Partners</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="stat-signed-partners">
                      {growthStats?.signedPartners || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Referral Codes Section */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Referral Codes</CardTitle>
                  <CardDescription>All referral codes across the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {referralCodesLoading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading referral codes...</div>
                  ) : referralCodes.length === 0 ? (
                    <EmptyState
                      icon={TrendingUp}
                      title="No referral codes"
                      description="Referral codes will appear here once created"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {referralCodes.map((code) => (
                            <TableRow key={code.id} data-testid={`row-referral-${code.id}`}>
                              <TableCell className="font-mono font-medium">{code.code}</TableCell>
                              <TableCell>
                                <div>{code.ownerName || "Unknown"}</div>
                                <div className="text-xs text-muted-foreground">{code.ownerEmail}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{code.ownerRole}</Badge>
                              </TableCell>
                              <TableCell>
                                {code.usageCount}{code.maxUses ? ` / ${code.maxUses}` : ""}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={code.status === "active" ? "default" : code.status === "inactive" ? "secondary" : "outline"}
                                  className="capitalize"
                                >
                                  {code.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(code.createdAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Campaigns and Partner Leads Grid */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Campaigns Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle>Campaigns</CardTitle>
                        <CardDescription>Marketing and promotional campaigns</CardDescription>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowCreateCampaignDialog(true)}
                        data-testid="button-create-campaign"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New Campaign
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {campaignsLoading ? (
                      <div className="py-8 text-center text-muted-foreground">Loading campaigns...</div>
                    ) : campaigns.length === 0 ? (
                      <EmptyState
                        icon={Target}
                        title="No campaigns"
                        description="Create your first campaign to drive growth"
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {campaigns.map((campaign) => (
                              <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                                <TableCell className="font-medium">{campaign.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">{campaign.type}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      campaign.status === "active" ? "default" :
                                      campaign.status === "paused" ? "secondary" :
                                      campaign.status === "ended" ? "outline" : "secondary"
                                    }
                                    className="capitalize"
                                  >
                                    {campaign.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {new Date(campaign.startDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {new Date(campaign.endDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={campaign.status}
                                    onValueChange={(value) => updateCampaignStatusMutation.mutate({ campaignId: campaign.id, status: value })}
                                  >
                                    <SelectTrigger className="w-[100px]" data-testid={`select-campaign-status-${campaign.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="draft">Draft</SelectItem>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="paused">Paused</SelectItem>
                                      <SelectItem value="ended">Ended</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Partner Leads Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle>Partner Leads</CardTitle>
                        <CardDescription>Potential business partnerships</CardDescription>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowCreatePartnerLeadDialog(true)}
                        data-testid="button-create-partner-lead"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New Lead
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {partnerLeadsLoading ? (
                      <div className="py-8 text-center text-muted-foreground">Loading partner leads...</div>
                    ) : partnerLeads.length === 0 ? (
                      <EmptyState
                        icon={Building}
                        title="No partner leads"
                        description="Add partner leads to track business development"
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Organization</TableHead>
                              <TableHead>Contact</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {partnerLeads.map((lead) => (
                              <TableRow key={lead.id} data-testid={`row-partner-lead-${lead.id}`}>
                                <TableCell className="font-medium">{lead.organizationName}</TableCell>
                                <TableCell>{lead.contactName}</TableCell>
                                <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">{lead.type}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      lead.status === "signed" ? "default" :
                                      lead.status === "rejected" ? "destructive" :
                                      lead.status === "negotiating" ? "secondary" : "outline"
                                    }
                                    className="capitalize"
                                  >
                                    {lead.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={lead.status}
                                    onValueChange={(value) => updatePartnerLeadStatusMutation.mutate({ leadId: lead.id, status: value })}
                                  >
                                    <SelectTrigger className="w-[110px]" data-testid={`select-lead-status-${lead.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="new">New</SelectItem>
                                      <SelectItem value="contacted">Contacted</SelectItem>
                                      <SelectItem value="qualified">Qualified</SelectItem>
                                      <SelectItem value="negotiating">Negotiating</SelectItem>
                                      <SelectItem value="signed">Signed</SelectItem>
                                      <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                  </Select>
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

              {/* Create Campaign Dialog */}
              <Dialog open={showCreateCampaignDialog} onOpenChange={setShowCreateCampaignDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Campaign</DialogTitle>
                    <DialogDescription>Set up a new marketing or promotional campaign</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Campaign Name</label>
                      <Input
                        value={newCampaign.name}
                        onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                        placeholder="e.g., Summer Referral Boost"
                        data-testid="input-campaign-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Select
                        value={newCampaign.type}
                        onValueChange={(value) => setNewCampaign({ ...newCampaign, type: value })}
                      >
                        <SelectTrigger data-testid="select-campaign-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="promotional">Promotional</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="seasonal">Seasonal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={newCampaign.description}
                        onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                        placeholder="Campaign description..."
                        data-testid="input-campaign-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Start Date</label>
                        <Input
                          type="datetime-local"
                          value={newCampaign.startDate}
                          onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                          data-testid="input-campaign-start-date"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Date</label>
                        <Input
                          type="datetime-local"
                          value={newCampaign.endDate}
                          onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                          data-testid="input-campaign-end-date"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateCampaignDialog(false)}>Cancel</Button>
                    <Button
                      onClick={() => createCampaignMutation.mutate(newCampaign)}
                      disabled={createCampaignMutation.isPending || !newCampaign.name || !newCampaign.startDate || !newCampaign.endDate}
                      data-testid="button-submit-campaign"
                    >
                      Create Campaign
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Create Partner Lead Dialog */}
              <Dialog open={showCreatePartnerLeadDialog} onOpenChange={setShowCreatePartnerLeadDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Partner Lead</DialogTitle>
                    <DialogDescription>Add a new potential business partner</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Organization Name</label>
                      <Input
                        value={newPartnerLead.organizationName}
                        onChange={(e) => setNewPartnerLead({ ...newPartnerLead, organizationName: e.target.value })}
                        placeholder="e.g., Acme Corporation"
                        data-testid="input-partner-org-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Contact Name</label>
                      <Input
                        value={newPartnerLead.contactName}
                        onChange={(e) => setNewPartnerLead({ ...newPartnerLead, contactName: e.target.value })}
                        placeholder="e.g., John Smith"
                        data-testid="input-partner-contact-name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input
                          type="email"
                          value={newPartnerLead.email}
                          onChange={(e) => setNewPartnerLead({ ...newPartnerLead, email: e.target.value })}
                          placeholder="partner@company.com"
                          data-testid="input-partner-email"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Phone (Optional)</label>
                        <Input
                          type="tel"
                          value={newPartnerLead.phone}
                          onChange={(e) => setNewPartnerLead({ ...newPartnerLead, phone: e.target.value })}
                          placeholder="+1 234 567 8900"
                          data-testid="input-partner-phone"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Partner Type</label>
                      <Select
                        value={newPartnerLead.type}
                        onValueChange={(value: typeof newPartnerLead.type) => setNewPartnerLead({ ...newPartnerLead, type: value })}
                      >
                        <SelectTrigger data-testid="select-partner-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corporate">Corporate</SelectItem>
                          <SelectItem value="fleet">Fleet</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                          <SelectItem value="reseller">Reseller</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Notes (Optional)</label>
                      <Textarea
                        value={newPartnerLead.notes}
                        onChange={(e) => setNewPartnerLead({ ...newPartnerLead, notes: e.target.value })}
                        placeholder="Additional notes about this lead..."
                        data-testid="input-partner-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreatePartnerLeadDialog(false)}>Cancel</Button>
                    <Button
                      onClick={() => createPartnerLeadMutation.mutate(newPartnerLead)}
                      disabled={createPartnerLeadMutation.isPending || !newPartnerLead.organizationName || !newPartnerLead.contactName || !newPartnerLead.email}
                      data-testid="button-submit-partner-lead"
                    >
                      Add Partner Lead
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Section 1: Enhanced Campaign Details */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Enhanced Campaign Details</CardTitle>
                  <CardDescription>Campaigns with detailed targeting and incentive information</CardDescription>
                </CardHeader>
                <CardContent>
                  {enhancedCampaignsLoading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading enhanced campaigns...</div>
                  ) : enhancedCampaigns.length === 0 ? (
                    <EmptyState
                      icon={Target}
                      title="No campaign details"
                      description="Campaign details will appear here once campaigns are created with targeting info"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Target Audience</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead>Incentive</TableHead>
                            <TableHead>Redemptions</TableHead>
                            <TableHead>Dates</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enhancedCampaigns.map((campaign) => (
                            <TableRow key={campaign.id} data-testid={`row-enhanced-campaign-${campaign.id}`}>
                              <TableCell className="font-medium">{campaign.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{campaign.type}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    campaign.status === "active" ? "default" :
                                    campaign.status === "paused" ? "secondary" :
                                    campaign.status === "ended" ? "outline" : "secondary"
                                  }
                                  className="capitalize"
                                >
                                  {campaign.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{campaign.details?.targetAudience || "-"}</TableCell>
                              <TableCell>{campaign.details?.countryCode || "-"}</TableCell>
                              <TableCell>
                                {campaign.details?.incentiveType ? (
                                  <span>{campaign.details.incentiveType}: {campaign.details.incentiveValue || "-"}</span>
                                ) : "-"}
                              </TableCell>
                              <TableCell>
                                {campaign.details ? (
                                  <span>{campaign.details.currentRedemptions}{campaign.details.maxRedemptions ? ` / ${campaign.details.maxRedemptions}` : ""}</span>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(campaign.startAt).toLocaleDateString()} - {new Date(campaign.endAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 2: Reactivation Rules */}
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle>Reactivation Rules</CardTitle>
                      <CardDescription>Automated rules to re-engage inactive users</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowCreateReactivationRuleDialog(true)}
                      data-testid="button-create-reactivation-rule"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Rule
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {reactivationRulesLoading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading reactivation rules...</div>
                  ) : reactivationRules.length === 0 ? (
                    <EmptyState
                      icon={RefreshCw}
                      title="No reactivation rules"
                      description="Create rules to automatically re-engage inactive users"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Target Role</TableHead>
                            <TableHead>Inactive Days</TableHead>
                            <TableHead>Message Title</TableHead>
                            <TableHead>Incentive</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Triggers</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reactivationRules.map((rule) => (
                            <TableRow key={rule.id} data-testid={`row-reactivation-rule-${rule.id}`}>
                              <TableCell className="font-medium">{rule.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{rule.targetRole}</Badge>
                              </TableCell>
                              <TableCell>{rule.inactiveDaysThreshold} days</TableCell>
                              <TableCell>{rule.messageTitle}</TableCell>
                              <TableCell>
                                {rule.incentiveType ? (
                                  <span>{rule.incentiveType}: {rule.incentiveValue || "-"}</span>
                                ) : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    rule.status === "ACTIVE" ? "default" :
                                    rule.status === "PAUSED" ? "secondary" : "outline"
                                  }
                                >
                                  {rule.status}
                                </Badge>
                              </TableCell>
                              <TableCell data-testid={`text-trigger-count-${rule.id}`}>{rule.triggerCount}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <Button
                                    variant={rule.status === "ACTIVE" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => updateReactivationRuleStatusMutation.mutate({ ruleId: rule.id, status: "ACTIVE" })}
                                    disabled={rule.status === "ACTIVE"}
                                    data-testid={`button-rule-activate-${rule.id}`}
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Active
                                  </Button>
                                  <Button
                                    variant={rule.status === "PAUSED" ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => updateReactivationRuleStatusMutation.mutate({ ruleId: rule.id, status: "PAUSED" })}
                                    disabled={rule.status === "PAUSED"}
                                    data-testid={`button-rule-pause-${rule.id}`}
                                  >
                                    <Pause className="h-3 w-3 mr-1" />
                                    Pause
                                  </Button>
                                  <Button
                                    variant={rule.status === "ENDED" ? "destructive" : "outline"}
                                    size="sm"
                                    onClick={() => updateReactivationRuleStatusMutation.mutate({ ruleId: rule.id, status: "ENDED" })}
                                    disabled={rule.status === "ENDED"}
                                    data-testid={`button-rule-end-${rule.id}`}
                                  >
                                    <StopCircle className="h-3 w-3 mr-1" />
                                    End
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

              {/* Create Reactivation Rule Dialog */}
              <Dialog open={showCreateReactivationRuleDialog} onOpenChange={setShowCreateReactivationRuleDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Reactivation Rule</DialogTitle>
                    <DialogDescription>Set up an automated rule to re-engage inactive users</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Rule Name</Label>
                      <Input
                        value={newReactivationRule.name}
                        onChange={(e) => setNewReactivationRule({ ...newReactivationRule, name: e.target.value })}
                        placeholder="e.g., 30-day inactive rider nudge"
                        data-testid="input-reactivation-name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Target Role</Label>
                        <Select
                          value={newReactivationRule.targetRole}
                          onValueChange={(value) => setNewReactivationRule({ ...newReactivationRule, targetRole: value })}
                        >
                          <SelectTrigger data-testid="select-reactivation-target-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rider">Rider</SelectItem>
                            <SelectItem value="driver">Driver</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Inactive Days Threshold</Label>
                        <Input
                          type="number"
                          value={newReactivationRule.inactiveDaysThreshold}
                          onChange={(e) => setNewReactivationRule({ ...newReactivationRule, inactiveDaysThreshold: parseInt(e.target.value) || 0 })}
                          placeholder="30"
                          data-testid="input-reactivation-days"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Message Title</Label>
                      <Input
                        value={newReactivationRule.messageTitle}
                        onChange={(e) => setNewReactivationRule({ ...newReactivationRule, messageTitle: e.target.value })}
                        placeholder="e.g., We miss you!"
                        data-testid="input-reactivation-message-title"
                      />
                    </div>
                    <div>
                      <Label>Message Body</Label>
                      <Textarea
                        value={newReactivationRule.messageBody}
                        onChange={(e) => setNewReactivationRule({ ...newReactivationRule, messageBody: e.target.value })}
                        placeholder="Message to send to inactive users..."
                        data-testid="input-reactivation-message-body"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Incentive Type (Optional)</Label>
                        <Select
                          value={newReactivationRule.incentiveType}
                          onValueChange={(value) => setNewReactivationRule({ ...newReactivationRule, incentiveType: value })}
                        >
                          <SelectTrigger data-testid="select-reactivation-incentive-type">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="discount">Discount</SelectItem>
                            <SelectItem value="credit">Credit</SelectItem>
                            <SelectItem value="free_ride">Free Ride</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Incentive Value (Optional)</Label>
                        <Input
                          value={newReactivationRule.incentiveValue}
                          onChange={(e) => setNewReactivationRule({ ...newReactivationRule, incentiveValue: e.target.value })}
                          placeholder="e.g., 10%"
                          data-testid="input-reactivation-incentive-value"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Country Code (Optional)</Label>
                      <Input
                        value={newReactivationRule.countryCode}
                        onChange={(e) => setNewReactivationRule({ ...newReactivationRule, countryCode: e.target.value })}
                        placeholder="e.g., NG"
                        data-testid="input-reactivation-country-code"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateReactivationRuleDialog(false)}>Cancel</Button>
                    <Button
                      onClick={() => createReactivationRuleMutation.mutate(newReactivationRule)}
                      disabled={createReactivationRuleMutation.isPending || !newReactivationRule.name || !newReactivationRule.messageTitle || !newReactivationRule.messageBody}
                      data-testid="button-submit-reactivation-rule"
                    >
                      Create Rule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Section 3: Marketing Attribution Stats */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Marketing Attribution</CardTitle>
                  <CardDescription>User acquisition source breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Referral</CardTitle>
                        <Badge variant="outline">REFERRAL</Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="stat-attribution-referral">
                          {getAttributionCount("REFERRAL")}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Campaign</CardTitle>
                        <Badge variant="outline">CAMPAIGN</Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="stat-attribution-campaign">
                          {getAttributionCount("CAMPAIGN")}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Organic</CardTitle>
                        <Badge variant="outline">ORGANIC</Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="stat-attribution-organic">
                          {getAttributionCount("ORGANIC")}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Admin Invite</CardTitle>
                        <Badge variant="outline">ADMIN_INVITE</Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="stat-attribution-admin-invite">
                          {getAttributionCount("ADMIN_INVITE")}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Section 4: Growth Safety Controls */}
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle>Growth Safety Controls</CardTitle>
                      <CardDescription>Toggle growth features and set safety limits</CardDescription>
                    </div>
                    <Button
                      onClick={() => saveGrowthSafetyMutation.mutate(growthSafetyForm)}
                      disabled={saveGrowthSafetyMutation.isPending}
                      data-testid="button-save-growth-safety"
                    >
                      {saveGrowthSafetyMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex items-center justify-between gap-2 rounded-md border p-4">
                        <div>
                          <Label className="text-sm font-medium">Virality Enabled</Label>
                          <p className="text-xs text-muted-foreground">Allow viral sharing features</p>
                        </div>
                        <Switch
                          checked={growthSafetyForm.viralityEnabled}
                          onCheckedChange={(checked) => setGrowthSafetyForm({ ...growthSafetyForm, viralityEnabled: checked })}
                          data-testid="switch-virality-enabled"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-md border p-4">
                        <div>
                          <Label className="text-sm font-medium">Share Moments</Label>
                          <p className="text-xs text-muted-foreground">Enable shareable moments</p>
                        </div>
                        <Switch
                          checked={growthSafetyForm.shareMomentsEnabled}
                          onCheckedChange={(checked) => setGrowthSafetyForm({ ...growthSafetyForm, shareMomentsEnabled: checked })}
                          data-testid="switch-share-moments-enabled"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-md border p-4">
                        <div>
                          <Label className="text-sm font-medium">Reactivation</Label>
                          <p className="text-xs text-muted-foreground">Enable user reactivation</p>
                        </div>
                        <Switch
                          checked={growthSafetyForm.reactivationEnabled}
                          onCheckedChange={(checked) => setGrowthSafetyForm({ ...growthSafetyForm, reactivationEnabled: checked })}
                          data-testid="switch-reactivation-enabled"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Max Referral Reward Per User</Label>
                        <Input
                          type="number"
                          value={growthSafetyForm.maxReferralRewardPerUser ?? ""}
                          onChange={(e) => setGrowthSafetyForm({ ...growthSafetyForm, maxReferralRewardPerUser: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="No limit"
                          data-testid="input-max-referral-reward"
                        />
                      </div>
                      <div>
                        <Label>Max Daily Referrals</Label>
                        <Input
                          type="number"
                          value={growthSafetyForm.maxDailyReferrals ?? ""}
                          onChange={(e) => setGrowthSafetyForm({ ...growthSafetyForm, maxDailyReferrals: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="No limit"
                          data-testid="input-max-daily-referrals"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {!isDirector && !isTripCoordinator && (
            <TabsContent value="monitoring">
              <MonitoringTab />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="admin-management">
              <AdminManagementTab />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="role-appointments">
              <RoleAppointmentsTab />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="training">
              <TesterManagementSection />
            </TabsContent>
          )}

          {/* Pairing Blocks Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="pairing-blocks">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserX className="h-5 w-5" />
                    Pairing Blocks
                  </CardTitle>
                  <CardDescription>
                    Manage rider-driver pairing blocks. Blocks are automatically created when a rider rates a driver with less than 3 stars.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pairingBlocksLoading ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Loading pairing blocks...
                    </div>
                  ) : pairingBlocks.length === 0 ? (
                    <EmptyState
                      icon={CheckCircle}
                      title="No pairing blocks"
                      description="No pairing blocks have been created yet"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rider ID</TableHead>
                            <TableHead>Driver ID</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pairingBlocks.map((block) => (
                            <TableRow key={block.id} data-testid={`pairing-block-row-${block.id}`}>
                              <TableCell className="font-mono text-xs">{block.riderId.slice(0, 8)}...</TableCell>
                              <TableCell className="font-mono text-xs">{block.driverId.slice(0, 8)}...</TableCell>
                              <TableCell>
                                <Badge variant={block.reason === "low_rating" ? "destructive" : "secondary"}>
                                  {block.reason.replace(/_/g, " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {block.ratingScore ? (
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 ${
                                          star <= block.ratingScore!
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-muted-foreground"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                ) : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={block.isActive ? "destructive" : "secondary"}>
                                  {block.isActive ? "Active" : "Removed"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(block.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {block.isActive && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" data-testid={`remove-block-${block.id}`}>
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Remove
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Remove Pairing Block</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will allow this rider and driver to be matched again. Are you sure you want to remove this block?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => removePairingBlockMutation.mutate({
                                            riderId: block.riderId,
                                            driverId: block.driverId,
                                            reason: "Admin override - block removed manually"
                                          })}
                                          data-testid={`confirm-remove-block-${block.id}`}
                                        >
                                          Remove Block
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                                {!block.isActive && (
                                  <span className="text-xs text-muted-foreground">
                                    Removed by admin
                                  </span>
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
          )}

          {(isSuperAdmin || userRole === "admin") && (
            <TabsContent value="overrides">
              <AdminOverridePanel />
            </TabsContent>
          )}

          {(isSuperAdmin || userRole === "admin") && (
            <TabsContent value="user-growth">
              <UserGrowthPanel />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="launch-readiness">
              <LaunchReadinessPanel />
            </TabsContent>
          )}

          {(isSuperAdmin || userRole === "admin" || userRole === "finance") && (
            <TabsContent value="incentives">
              <IncentivesPanel />
            </TabsContent>
          )}

          {(isSuperAdmin || userRole === "admin") && (
            <TabsContent value="acquisition">
              <AcquisitionPanel />
            </TabsContent>
          )}

          {(isSuperAdmin || userRole === "admin" || userRole === "support_agent") && (
            <TabsContent value="help-center">
              <HelpCenterPanel />
            </TabsContent>
          )}

          {(isSuperAdmin || userRole === "admin") && (
            <TabsContent value="safety">
              <SafetyPanel />
            </TabsContent>
          )}

          {(isSuperAdmin || userRole === "admin") && (
            <TabsContent value="compliance-logs">
              <ComplianceLogPanel />
            </TabsContent>
          )}
          {(isSuperAdmin || userRole === "admin") && (
          <TabsContent value="support-logs">
            <SupportLogsPanel />
          </TabsContent>
          )}
          {(isSuperAdmin || userRole === "admin") && (
            <TabsContent value="zibra-insights">
              <ZibraInsightsPanel />
            </TabsContent>
          )}
          {isSuperAdmin && (
            <TabsContent value="zibra-governance">
              <ZibraGovernancePanel />
            </TabsContent>
          )}
          {(isSuperAdmin || userRole === "admin") && (
            <TabsContent value="tax-documents">
              <div className="space-y-6">
                <TaxDocumentsPanel />
                <TaxComplianceConfig />
              </div>
            </TabsContent>
          )}
          {(isSuperAdmin || userRole === "admin") && (
            <TabsContent value="cash-settlements">
              <CashSettlementPanel />
            </TabsContent>
          )}
          {(isSuperAdmin || userRole === "admin" || userRole === "finance") && (
            <TabsContent value="bank-transfers">
              <BankTransfersPanel />
            </TabsContent>
          )}
          {(isSuperAdmin || userRole === "admin") && (
            <TabsContent value="cash-disputes">
              <CashDisputesPanel />
            </TabsContent>
          )}
          {(isSuperAdmin || userRole === "admin") && (
            <TabsContent value="corporate">
              <CorporateRidesPanel />
            </TabsContent>
          )}
          {(isSuperAdmin || userRole === "admin") && (
            <TabsContent value="fee-settings">
              <div className="space-y-6">
                <CancellationFeeSettings />
                <AdminCancellationFeeSettings />
              </div>
            </TabsContent>
          )}
          {isSuperAdmin && (
            <TabsContent value="simulation">
              <SimulationCenter />
            </TabsContent>
          )}
          {isSuperAdmin && (
            <TabsContent value="lost-items">
              <LostItemsPanel />
            </TabsContent>
          )}
          {isSuperAdmin && (
            <TabsContent value="accident-reports">
              <AccidentReportsPanel />
            </TabsContent>
          )}
          <TabsContent value="insurance">
            <InsurancePartnersPanel />
          </TabsContent>
          <TabsContent value="relief-fund">
            <ReliefFundPanel />
          </TabsContent>
          <TabsContent value="lost-item-fraud">
            <LostItemFraudPanel />
          </TabsContent>
          {(isSuperAdmin || userRole === "admin") && (
          <TabsContent value="inbox">
            <InboxViewerPanel />
          </TabsContent>
          )}
        </Tabs>
        </div>
      </main>
      {zAssistOpen && (
        <div className="fixed bottom-20 right-4 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] z-50 shadow-lg rounded-lg overflow-hidden" data-testid="panel-z-assist">
          <ZibaSupport onClose={() => setZAssistOpen(false)} />
        </div>
      )}
      <Button
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg h-12 w-12"
        size="icon"
        onClick={() => setZAssistOpen(!zAssistOpen)}
        data-testid="button-z-assist-toggle"
      >
        <Headphones className="h-5 w-5" />
      </Button>
    </div>
  );
}

function MonitoringTab() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<{
    platform: {
      dailyActiveUsers: number;
      monthlyActiveUsers: number;
      tripSuccessRate: number;
      cancellationRate: number;
      avgTripCompletionTime: number;
      supportTicketVolume: number;
    };
    riders: {
      newSignups: number;
      repeatUsageRate: number;
      failedBookingAttempts: number;
      totalRiders: number;
    };
    drivers: {
      activeDrivers: number;
      acceptanceRate: number;
      completionRate: number;
      earningsVariance: number;
      totalDrivers: number;
    };
    organizations: {
      activeOrganizations: number;
      tripsPerOrganization: number;
      slaComplianceRate: number;
      invoiceCount: number;
    };
    financials: {
      grossFares: string;
      platformCommission: string;
      refundVolume: string;
      chargebackCount: number;
      netRevenue: string;
    };
    alerts: Array<{
      id: string;
      type: string;
      metric: string;
      message: string;
      value: number;
      threshold: number;
      createdAt: string;
    }>;
  }>({
    queryKey: ["/api/metrics/overview"]
  });

  const { data: featureFlags, isLoading: flagsLoading } = useQuery<Array<{
    id: string;
    name: string;
    description: string | null;
    enabled: boolean;
    rolloutPercentage: number;
    createdAt: string;
    updatedAt: string;
  }>>({
    queryKey: ["/api/feature-flags"]
  });

  const [showCreateFlagDialog, setShowCreateFlagDialog] = useState(false);
  const [newFlag, setNewFlag] = useState({ name: "", description: "", enabled: false, rolloutPercentage: 0 });

  const createFlagMutation = useMutation({
    mutationFn: async (data: typeof newFlag) => {
      return apiRequest("POST", "/api/feature-flags", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
      setShowCreateFlagDialog(false);
      setNewFlag({ name: "", description: "", enabled: false, rolloutPercentage: 0 });
    }
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ name, enabled }: { name: string; enabled: boolean }) => {
      return apiRequest("PATCH", `/api/feature-flags/${name}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
    }
  });

  const updateRolloutMutation = useMutation({
    mutationFn: async ({ name, rolloutPercentage }: { name: string; rolloutPercentage: number }) => {
      return apiRequest("PATCH", `/api/feature-flags/${name}`, { rolloutPercentage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
    }
  });

  if (metricsLoading || flagsLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading monitoring data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {metrics?.alerts && metrics.alerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-muted-foreground">
                      Current: {alert.value.toFixed(1)} | Threshold: {alert.threshold}
                    </p>
                  </div>
                  <Badge variant={alert.type === "error" ? "destructive" : "secondary"}>
                    {alert.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trip Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics?.platform.tripSuccessRate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Completed trips vs total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics?.platform.cancellationRate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Cancelled trips vs total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.platform.supportTicketVolume || 0}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics?.financials.netRevenue || "0.00"}</div>
            <p className="text-xs text-muted-foreground">Commission minus refunds</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rider Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Riders</span>
                <span className="font-medium">{metrics?.riders.totalRiders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New Signups (7d)</span>
                <span className="font-medium">{metrics?.riders.newSignups || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Repeat Usage Rate</span>
                <span className="font-medium">{(metrics?.riders.repeatUsageRate || 0).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Driver Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Drivers</span>
                <span className="font-medium">{metrics?.drivers.activeDrivers || 0} / {metrics?.drivers.totalDrivers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Acceptance Rate</span>
                <span className="font-medium">{(metrics?.drivers.acceptanceRate || 0).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="font-medium">{(metrics?.drivers.completionRate || 0).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Organizations</span>
                <span className="font-medium">{metrics?.organizations.activeOrganizations || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trips per Organization</span>
                <span className="font-medium">{(metrics?.organizations.tripsPerOrganization || 0).toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">SLA Compliance</span>
                <span className="font-medium">{(metrics?.organizations.slaComplianceRate || 0).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gross Fares</span>
                <span className="font-medium">${metrics?.financials.grossFares || "0.00"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Platform Commission</span>
                <span className="font-medium">${metrics?.financials.platformCommission || "0.00"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Refund Volume</span>
                <span className="font-medium">${metrics?.financials.refundVolume || "0.00"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Chargebacks</span>
                <span className="font-medium">{metrics?.financials.chargebackCount || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Feature Flags</CardTitle>
            <CardDescription>Control gradual feature rollouts</CardDescription>
          </div>
          <Button onClick={() => setShowCreateFlagDialog(true)} data-testid="button-create-feature-flag">
            <Plus className="h-4 w-4 mr-2" />
            New Flag
          </Button>
        </CardHeader>
        <CardContent>
          {featureFlags && featureFlags.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rollout %</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureFlags.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell className="font-mono text-sm">{flag.name}</TableCell>
                    <TableCell className="text-muted-foreground">{flag.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={flag.enabled ? "default" : "secondary"}>
                        {flag.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={flag.rolloutPercentage}
                          onChange={(e) => updateRolloutMutation.mutate({ name: flag.name, rolloutPercentage: parseInt(e.target.value) || 0 })}
                          className="w-20"
                          data-testid={`input-rollout-${flag.name}`}
                        />
                        <span>%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={flag.enabled ? "destructive" : "default"}
                        onClick={() => toggleFlagMutation.mutate({ name: flag.name, enabled: !flag.enabled })}
                        data-testid={`button-toggle-${flag.name}`}
                      >
                        {flag.enabled ? "Disable" : "Enable"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Zap}
              title="No Feature Flags"
              description="Create feature flags to control gradual rollouts"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateFlagDialog} onOpenChange={setShowCreateFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
            <DialogDescription>Add a new feature flag for gradual rollout control</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Flag Name</label>
              <Input
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                placeholder="e.g., new_checkout_flow"
                data-testid="input-flag-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                placeholder="What does this flag control?"
                data-testid="input-flag-description"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rollout Percentage</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newFlag.rolloutPercentage}
                  onChange={(e) => setNewFlag({ ...newFlag, rolloutPercentage: parseInt(e.target.value) || 0 })}
                  className="w-24"
                  data-testid="input-flag-rollout"
                />
                <span>%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFlagDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createFlagMutation.mutate(newFlag)}
              disabled={createFlagMutation.isPending || !newFlag.name}
              data-testid="button-submit-feature-flag"
            >
              Create Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type AdminData = {
  id: number;
  userId: string;
  role: string;
  adminStartAt?: string | null;
  adminEndAt?: string | null;
  adminPermissions?: string[] | null;
  appointedBy?: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

const ADMIN_PERMISSION_OPTIONS = [
  { value: "DRIVER_MANAGEMENT", label: "Driver Management" },
  { value: "RIDER_MANAGEMENT", label: "Rider Management" },
  { value: "TRIP_MONITORING", label: "Trip Monitoring" },
  { value: "DISPUTES", label: "Disputes" },
  { value: "REPORTS", label: "Reports" },
  { value: "PAYOUTS", label: "Payouts" },
  { value: "SUPPORT_TICKETS", label: "Support Tickets" },
  { value: "INCENTIVES", label: "Incentives" },
  { value: "FRAUD_DETECTION", label: "Fraud Detection" },
];

function TesterManagementSection() {
  const { toast } = useToast();
  const [showAddTesterDialog, setShowAddTesterDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTesterForAdjust, setSelectedTesterForAdjust] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustAction, setAdjustAction] = useState<"TOP_UP" | "REFUND">("TOP_UP");
  const [testerType, setTesterType] = useState<"RIDER" | "DRIVER">("RIDER");

  const { data: testers = [], isLoading, refetch } = useQuery<Array<{
    id: string;
    userId: string;
    role: string;
    isTester: boolean;
    testerType: string | null;
    createdAt: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    testerWalletBalance: number;
    mainWalletBalance: number;
  }>>({
    queryKey: ["/api/admin/testers"],
  });

  const { data: allUsers = [] } = useQuery<Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string | null;
  }>>({
    queryKey: ["/api/admin/users/for-wallet-credit"],
  });

  const createRiderTesterMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", "/api/admin/testers/rider", { userId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rider Trainee created with ₦45,000 credit" });
      refetch();
      setShowAddTesterDialog(false);
      setSelectedUserId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create trainee", description: error.message, variant: "destructive" });
    },
  });

  const createDriverTesterMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", "/api/admin/testers/driver", { userId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Driver Trainee created with ₦45,000 credit" });
      refetch();
      setShowAddTesterDialog(false);
      setSelectedUserId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create trainee", description: error.message, variant: "destructive" });
    },
  });

  const removeTesterMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/testers/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Training status removed" });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove trainee", description: error.message, variant: "destructive" });
    },
  });

  const adjustCreditMutation = useMutation({
    mutationFn: async (data: { userId: string; amount: number; action: "TOP_UP" | "REFUND" }) => {
      const res = await apiRequest("POST", "/api/admin/testers/adjust-credit", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message || "Credit adjusted successfully" });
      refetch();
      setShowAdjustDialog(false);
      setSelectedTesterForAdjust(null);
      setAdjustAmount("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to adjust credit", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateTester = () => {
    if (!selectedUserId) return;
    if (testerType === "RIDER") {
      createRiderTesterMutation.mutate(selectedUserId);
    } else {
      createDriverTesterMutation.mutate(selectedUserId);
    }
  };

  const handleAdjustCredit = () => {
    if (!selectedTesterForAdjust || !adjustAmount) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    adjustCreditMutation.mutate({
      userId: selectedTesterForAdjust,
      amount: Math.round(amount * 100),
      action: adjustAction,
    });
  };

  const openAddDialog = (type: "RIDER" | "DRIVER") => {
    setSelectedUserId(null);
    setTesterType(type);
    setShowAddTesterDialog(true);
  };

  const openAdjustDialog = (userId: string, action: "TOP_UP" | "REFUND") => {
    setSelectedTesterForAdjust(userId);
    setAdjustAction(action);
    setAdjustAmount("");
    setShowAdjustDialog(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Training Management
          </CardTitle>
          <CardDescription>Add riders and drivers to training mode with ₦45,000 test credit</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => openAddDialog("RIDER")}
            data-testid="button-add-rider-trainee"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rider Trainee
          </Button>
          <Button
            onClick={() => openAddDialog("DRIVER")}
            variant="outline"
            data-testid="button-add-driver-trainee"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Driver Trainee
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading trainees...</div>
        ) : testers.length === 0 ? (
          <EmptyState
            icon={TestTube}
            title="No Trainees Added"
            description="Add trainees to test the platform without real payments"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Training Type</TableHead>
                <TableHead>Test Credits</TableHead>
                <TableHead>Main Wallet</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testers.map((tester) => (
                <TableRow key={tester.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{tester.email || "Unknown"}</div>
                      {(tester.firstName || tester.lastName) && (
                        <div className="text-sm text-muted-foreground">
                          {[tester.firstName, tester.lastName].filter(Boolean).join(" ")}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tester.testerType === "RIDER" ? "default" : "secondary"}>
                      {tester.testerType || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-green-600 dark:text-green-400">
                    ₦{((tester.testerWalletBalance || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    ₦{((tester.mainWalletBalance || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{new Date(tester.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAdjustDialog(tester.userId, "TOP_UP")}
                        data-testid={`button-topup-tester-${tester.userId}`}
                        title="Top up test credits"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAdjustDialog(tester.userId, "REFUND")}
                        data-testid={`button-refund-tester-${tester.userId}`}
                        title="Refund test credits"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeTesterMutation.mutate(tester.userId)}
                        disabled={removeTesterMutation.isPending}
                        data-testid={`button-remove-tester-${tester.userId}`}
                        title="Remove tester"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showAddTesterDialog} onOpenChange={(open) => {
        setShowAddTesterDialog(open);
        if (!open) setSelectedUserId(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add {testerType === "RIDER" ? "Rider" : "Driver"} Trainee</DialogTitle>
            <DialogDescription>
              The user will receive ₦45,000 test wallet credit automatically
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUserId || ""} onValueChange={(val) => setSelectedUserId(val || null)}>
                <SelectTrigger data-testid="select-tester-user">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} ({user.firstName || ""} {user.lastName || ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTesterDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreateTester}
              disabled={!selectedUserId || createRiderTesterMutation.isPending || createDriverTesterMutation.isPending}
              data-testid="button-submit-add-tester"
            >
              Add Trainee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdjustDialog} onOpenChange={(open) => {
        setShowAdjustDialog(open);
        if (!open) {
          setSelectedTesterForAdjust(null);
          setAdjustAmount("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{adjustAction === "TOP_UP" ? "Top Up" : "Refund"} Trainee Credit</DialogTitle>
            <DialogDescription>
              {adjustAction === "TOP_UP" 
                ? "Add test credits to this trainee's wallet" 
                : "Remove test credits from this trainee's wallet"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (₦)</label>
              <Input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Enter amount in Naira"
                min="0"
                step="100"
                data-testid="input-adjust-amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>Cancel</Button>
            <Button
              onClick={handleAdjustCredit}
              disabled={!adjustAmount || adjustCreditMutation.isPending}
              data-testid="button-submit-adjust-credit"
            >
              {adjustAction === "TOP_UP" ? "Top Up" : "Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AdminManagementTab() {
  const { toast } = useToast();
  const [showAppointDialog, setShowAppointDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminData | null>(null);
  const [appointForm, setAppointForm] = useState({
    userId: "",
    adminStartAt: new Date().toISOString().split("T")[0],
    adminEndAt: "",
    adminPermissions: [] as string[],
  });

  const { data: admins = [], isLoading, refetch } = useQuery<AdminData[]>({
    queryKey: ["/api/super-admin/admins"],
  });

  const appointMutation = useMutation({
    mutationFn: async (data: typeof appointForm) => {
      const res = await apiRequest("POST", "/api/super-admin/appoint-admin", {
        userId: data.userId,
        adminStartAt: new Date(data.adminStartAt).toISOString(),
        adminEndAt: new Date(data.adminEndAt).toISOString(),
        adminPermissions: data.adminPermissions,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Admin appointed successfully" });
      refetch();
      setShowAppointDialog(false);
      setAppointForm({
        userId: "",
        adminStartAt: new Date().toISOString().split("T")[0],
        adminEndAt: "",
        adminPermissions: [],
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to appoint admin", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/super-admin/revoke-admin/${userId}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Admin access revoked" });
      refetch();
      setShowRevokeDialog(false);
      setSelectedAdmin(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to revoke admin", description: error.message, variant: "destructive" });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: { userId: string; adminPermissions: string[]; adminEndAt?: string }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/admin/${data.userId}/permissions`, {
        adminPermissions: data.adminPermissions,
        adminEndAt: data.adminEndAt ? new Date(data.adminEndAt).toISOString() : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Admin permissions updated" });
      refetch();
      setShowEditDialog(false);
      setSelectedAdmin(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update permissions", description: error.message, variant: "destructive" });
    },
  });

  const expireAdminsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/super-admin/expire-admins", {});
      return res.json() as Promise<{ expiredCount: number }>;
    },
    onSuccess: (data) => {
      toast({ title: `Expired ${data.expiredCount} admin(s)` });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to expire admins", description: error.message, variant: "destructive" });
    },
  });

  const togglePermission = (permission: string) => {
    setAppointForm(prev => ({
      ...prev,
      adminPermissions: prev.adminPermissions.includes(permission)
        ? prev.adminPermissions.filter(p => p !== permission)
        : [...prev.adminPermissions, permission],
    }));
  };

  const toggleEditPermission = (permission: string) => {
    if (!selectedAdmin) return;
    const currentPermissions = selectedAdmin.adminPermissions || [];
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    setSelectedAdmin({ ...selectedAdmin, adminPermissions: newPermissions });
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  const isExpired = (endDateStr: string | null | undefined) => {
    if (!endDateStr) return false;
    return new Date(endDateStr) < new Date();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Admin Management</CardTitle>
            <CardDescription>Appoint, manage, and revoke admin access with time-bound permissions</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => expireAdminsMutation.mutate()}
              disabled={expireAdminsMutation.isPending}
              data-testid="button-expire-admins"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Expirations
            </Button>
            <Button onClick={() => setShowAppointDialog(true)} data-testid="button-appoint-admin">
              <Plus className="h-4 w-4 mr-2" />
              Appoint Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading admins...</div>
          ) : admins.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No Admins Appointed"
              description="Appoint admins with time-limited access and specific permissions"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id} data-testid={`row-admin-${admin.userId}`}>
                    <TableCell className="font-medium">
                      {admin.user.firstName} {admin.user.lastName}
                      <div className="text-xs text-muted-foreground">{admin.user.email}</div>
                    </TableCell>
                    <TableCell>{formatDate(admin.adminStartAt)}</TableCell>
                    <TableCell>{formatDate(admin.adminEndAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(admin.adminPermissions || []).slice(0, 3).map((perm) => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {perm.replace("_", " ")}
                          </Badge>
                        ))}
                        {(admin.adminPermissions || []).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(admin.adminPermissions || []).length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isExpired(admin.adminEndAt) ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setShowEditDialog(true);
                          }}
                          data-testid={`button-edit-admin-${admin.userId}`}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setShowRevokeDialog(true);
                          }}
                          data-testid={`button-revoke-admin-${admin.userId}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAppointDialog} onOpenChange={setShowAppointDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appoint New Admin</DialogTitle>
            <DialogDescription>Grant time-limited admin access with specific permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <Input
                value={appointForm.userId}
                onChange={(e) => setAppointForm({ ...appointForm, userId: e.target.value })}
                placeholder="Enter user ID to promote"
                data-testid="input-appoint-user-id"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={appointForm.adminStartAt}
                  onChange={(e) => setAppointForm({ ...appointForm, adminStartAt: e.target.value })}
                  data-testid="input-appoint-start-date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={appointForm.adminEndAt}
                  onChange={(e) => setAppointForm({ ...appointForm, adminEndAt: e.target.value })}
                  data-testid="input-appoint-end-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Permissions</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {ADMIN_PERMISSION_OPTIONS.map((perm) => (
                  <label key={perm.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appointForm.adminPermissions.includes(perm.value)}
                      onChange={() => togglePermission(perm.value)}
                      className="rounded"
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAppointDialog(false)}>Cancel</Button>
            <Button
              onClick={() => appointMutation.mutate(appointForm)}
              disabled={appointMutation.isPending || !appointForm.userId || !appointForm.adminEndAt || appointForm.adminPermissions.length === 0}
              data-testid="button-submit-appoint"
            >
              Appoint Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Admin Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke admin access for {selectedAdmin?.user?.firstName} {selectedAdmin?.user?.lastName}?
              They will be downgraded to a regular rider.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedAdmin && revokeMutation.mutate(selectedAdmin.userId)}
              disabled={revokeMutation.isPending}
              data-testid="button-confirm-revoke"
            >
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Admin Permissions</DialogTitle>
            <DialogDescription>
              Update permissions for {selectedAdmin?.user?.firstName} {selectedAdmin?.user?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Extend End Date (Optional)</label>
              <Input
                type="date"
                value={selectedAdmin?.adminEndAt?.split("T")[0] || ""}
                onChange={(e) => selectedAdmin && setSelectedAdmin({ ...selectedAdmin, adminEndAt: e.target.value })}
                data-testid="input-edit-end-date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Permissions</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {ADMIN_PERMISSION_OPTIONS.map((perm) => (
                  <label key={perm.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(selectedAdmin?.adminPermissions || []).includes(perm.value)}
                      onChange={() => toggleEditPermission(perm.value)}
                      className="rounded"
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button
              onClick={() => selectedAdmin && updatePermissionsMutation.mutate({
                userId: selectedAdmin.userId,
                adminPermissions: selectedAdmin.adminPermissions || [],
                adminEndAt: selectedAdmin.adminEndAt || undefined,
              })}
              disabled={updatePermissionsMutation.isPending || (selectedAdmin?.adminPermissions || []).length === 0}
              data-testid="button-submit-edit"
            >
              Update Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// MULTI-ROLE SYSTEM: Updated type to support multiple roles per user
type UserWithRole = {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;  // Primary role (backward compatibility)
  roles: string[];  // All roles for this user
  roleCount: number;  // Total number of roles
  createdAt: string | null;
};

function RoleAppointmentsTab() {
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    email: string;
    currentRole: string | null;
    action: "promote" | "demote";
  } | null>(null);

  const { data: usersWithRoles = [], isLoading } = useQuery<UserWithRole[]>({
    queryKey: ["/api/super-admin/users-with-roles"],
  });

  const promoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/super-admin/promote/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users-with-roles"] });
      toast({
        title: "User Promoted",
        description: "User has been promoted to Admin. They must log out and log back in for changes to take effect.",
      });
      setConfirmDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to promote user",
        variant: "destructive",
      });
    },
  });

  const demoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/super-admin/demote/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users-with-roles"] });
      toast({
        title: "User Demoted",
        description: "Admin has been demoted to Rider. They must log out and log back in for changes to take effect.",
      });
      setConfirmDialog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to demote user",
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    if (!confirmDialog) return;
    if (confirmDialog.action === "promote") {
      promoteMutation.mutate(confirmDialog.userId);
    } else {
      demoteMutation.mutate(confirmDialog.userId);
    }
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case "super_admin":
        return "default";
      case "admin":
        return "secondary";
      case "driver":
        return "outline";
      case "rider":
        return "outline";
      default:
        return "outline";
    }
  };

  const canPromote = (role: string | null) => {
    return role !== "super_admin" && role !== "admin";
  };

  const canDemote = (role: string | null) => {
    return role === "admin";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Role Appointments
        </CardTitle>
        <CardDescription>
          Promote users to Admin or demote Admins back to Rider. Changes require logout/login to take effect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading users...
          </div>
        ) : usersWithRoles.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="No users have registered yet."
          />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithRoles.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">{user.email || "N/A"}</TableCell>
                    <TableCell>
                      {user.firstName || user.lastName
                        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(user.roles && user.roles.length > 0) ? (
                          user.roles.map((role: string) => (
                            <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs">
                              {role.replace("_", " ").toUpperCase()}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">NO ROLE</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {user.roleCount || 0} {(user.roleCount || 0) === 1 ? "role" : "roles"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canPromote(user.role) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                userId: user.userId,
                                email: user.email || "Unknown",
                                currentRole: user.role,
                                action: "promote",
                              })
                            }
                            data-testid={`button-promote-${user.userId}`}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Promote to Admin
                          </Button>
                        )}
                        {canDemote(user.role) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                userId: user.userId,
                                email: user.email || "Unknown",
                                currentRole: user.role,
                                action: "demote",
                              })
                            }
                            data-testid={`button-demote-${user.userId}`}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Demote to Rider
                          </Button>
                        )}
                        {user.role === "super_admin" && (
                          <span className="text-sm text-muted-foreground italic">
                            Primary Owner
                          </span>
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

      <Dialog open={confirmDialog?.open || false} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === "promote" ? "Promote to Admin" : "Demote to Rider"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.action === "promote"
                ? `Are you sure you want to promote ${confirmDialog?.email} to Admin? They will have administrative access to the platform.`
                : `Are you sure you want to demote ${confirmDialog?.email} to Rider? They will lose all admin privileges.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">Important:</p>
              <p>The user must log out and log back in for role changes to take effect.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog?.action === "demote" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={promoteMutation.isPending || demoteMutation.isPending}
              data-testid="button-confirm-role-change"
            >
              {confirmDialog?.action === "promote" ? "Confirm Promotion" : "Confirm Demotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
