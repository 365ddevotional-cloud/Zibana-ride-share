import { 
  userRoles, 
  driverProfiles, 
  riderProfiles, 
  directorProfiles,
  tripCoordinatorProfiles,
  trips,
  users,
  payoutTransactions,
  notifications,
  ratings,
  disputes,
  refunds,
  walletAdjustments,
  auditLogs,
  chargebacks,
  paymentReconciliations,
  wallets,
  walletTransactions,
  walletPayouts,
  riskProfiles,
  fraudEvents,
  incentivePrograms,
  incentiveEarnings,
  countries,
  taxRules,
  exchangeRates,
  complianceProfiles,
  // Phase 22 - Enhanced Ride Lifecycle
  rides,
  driverMovements,
  rideAuditLogs,
  // Phase 23 - Ride Offers
  rideOffers,
  type UserRole, 
  type InsertUserRole,
  type DriverProfile,
  type InsertDriverProfile,
  type RiderProfile,
  type InsertRiderProfile,
  type DirectorProfile,
  type InsertDirectorProfile,
  type TripCoordinatorProfile,
  type InsertTripCoordinatorProfile,
  type Trip,
  type InsertTrip,
  // Phase 22 - Enhanced Ride types
  type Ride,
  type InsertRide,
  type DriverMovement,
  type InsertDriverMovement,
  type RideAuditLog,
  type InsertRideAuditLog,
  type PayoutTransaction,
  type InsertPayoutTransaction,
  type Notification,
  type InsertNotification,
  type RideOffer,
  type InsertRideOffer,
  type Rating,
  type InsertRating,
  type Dispute,
  type InsertDispute,
  type UpdateDispute,
  type Refund,
  type InsertRefund,
  type UpdateRefund,
  type WalletAdjustment,
  type InsertWalletAdjustment,
  type AuditLog,
  type InsertAuditLog,
  type Chargeback,
  type InsertChargeback,
  type UpdateChargeback,
  type PaymentReconciliation,
  type InsertPaymentReconciliation,
  type Wallet,
  type InsertWallet,
  type WalletTransaction,
  type InsertWalletTransaction,
  type WalletPayout,
  type InsertWalletPayout,
  type RiskProfile,
  type InsertRiskProfile,
  type FraudEvent,
  type InsertFraudEvent,
  type IncentiveProgram,
  type InsertIncentiveProgram,
  type UpdateIncentiveProgram,
  type IncentiveEarning,
  type InsertIncentiveEarning,
  type Country,
  type InsertCountry,
  type UpdateCountry,
  type TaxRule,
  type InsertTaxRule,
  type UpdateTaxRule,
  type ExchangeRate,
  type InsertExchangeRate,
  type ComplianceProfile,
  type InsertComplianceProfile,
  type UpdateComplianceProfile,
  supportTickets,
  supportMessages,
  type SupportTicket,
  type InsertSupportTicket,
  type SupportMessage,
  type InsertSupportMessage,
  type SupportTicketWithDetails,
  organizationContracts,
  serviceLevelAgreements,
  enterpriseInvoices,
  type OrganizationContract,
  type InsertOrganizationContract,
  type ServiceLevelAgreement,
  type InsertServiceLevelAgreement,
  type EnterpriseInvoice,
  type InsertEnterpriseInvoice,
  type OrganizationContractWithDetails,
  type ServiceLevelAgreementWithDetails,
  type EnterpriseInvoiceWithDetails,
  referralCodes,
  referralEvents,
  marketingCampaigns,
  partnerLeads,
  type ReferralCode,
  type InsertReferralCode,
  type ReferralEvent,
  type InsertReferralEvent,
  type MarketingCampaign,
  type InsertMarketingCampaign,
  type PartnerLead,
  type InsertPartnerLead,
  type ReferralCodeWithStats,
  type GrowthStats,
  featureFlags,
  type FeatureFlag,
  type InsertFeatureFlag,
  type PlatformMetrics,
  type RiderMetrics,
  type DriverMetrics,
  type OrganizationMetrics,
  type FinancialMetrics,
  type MetricsOverview,
  type MetricAlert,
  // Phase 25 - Monetization, Fraud & Country Rules
  countryPricingRules,
  riderWallets,
  driverWallets,
  zibaWallet,
  escrows,
  financialAuditLogs,
  abuseFlags,
  driverPayoutHistory,
  riderTransactionHistory,
  type CountryPricingRules,
  type InsertCountryPricingRules,
  type RiderWallet,
  type InsertRiderWallet,
  type DriverWallet,
  type InsertDriverWallet,
  type ZibaWallet,
  type Escrow,
  type InsertEscrow,
  type FinancialAuditLog,
  type InsertFinancialAuditLog,
  type AbuseFlag,
  type InsertAbuseFlag,
  type AbuseFlagWithDetails,
  type DriverPayoutHistory,
  type InsertDriverPayoutHistory,
  type RiderTransactionHistory,
  type InsertRiderTransactionHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, count, sql, sum, gte, lte, lt, inArray, isNull } from "drizzle-orm";
import { calculateFare } from "./pricing";

export interface TripFilter {
  status?: string;
  startDate?: string;
  endDate?: string;
  driverId?: string;
  riderId?: string;
}

export interface IStorage {
  getUserRole(userId: string): Promise<UserRole | undefined>;
  createUserRole(data: InsertUserRole): Promise<UserRole>;
  getAdminCount(): Promise<number>;
  
  // Admin appointment methods (SUPER_ADMIN only)
  appointAdmin(userId: string, adminStartAt: Date, adminEndAt: Date, adminPermissions: string[], appointedBy: string): Promise<UserRole>;
  revokeAdmin(userId: string): Promise<UserRole | undefined>;
  getAllAdmins(): Promise<UserRole[]>;
  checkAndExpireAdmins(): Promise<number>;
  isAdminValid(userId: string): Promise<{ valid: boolean; role: UserRole | null; reason?: string }>;
  updateAdminPermissions(userId: string, adminPermissions: string[], adminEndAt?: Date): Promise<UserRole | undefined>;
  
  // Role Appointments (SUPER_ADMIN only)
  getAllUsersWithRoles(): Promise<any[]>;
  promoteToAdmin(userId: string, promotedBy: string): Promise<UserRole>;
  demoteToRider(userId: string): Promise<UserRole | undefined>;

  // Theme preferences
  updateThemePreference(userId: string, preference: "light" | "dark" | "system"): Promise<void>;
  getThemePreference(userId: string): Promise<"light" | "dark" | "system">;

  getDriverProfile(userId: string): Promise<DriverProfile | undefined>;
  createDriverProfile(data: InsertDriverProfile): Promise<DriverProfile>;
  updateDriverProfile(userId: string, data: Partial<InsertDriverProfile>): Promise<DriverProfile | undefined>;
  updateDriverOnlineStatus(userId: string, isOnline: boolean): Promise<DriverProfile | undefined>;
  updateDriverStatus(userId: string, status: string): Promise<DriverProfile | undefined>;
  getAllDrivers(): Promise<DriverProfile[]>;
  getAllDriversWithDetails(): Promise<any[]>;

  createRiderProfile(data: InsertRiderProfile): Promise<RiderProfile>;
  getRiderProfile(userId: string): Promise<RiderProfile | undefined>;
  getAllRidersWithDetails(): Promise<any[]>;

  createTrip(data: InsertTrip): Promise<Trip>;
  getAvailableTrips(): Promise<Trip[]>;
  getDriverCurrentTrip(driverId: string): Promise<Trip | null>;
  getRiderCurrentTrip(riderId: string): Promise<Trip | null>;
  getRiderTripHistory(riderId: string): Promise<Trip[]>;
  getFilteredTrips(filter: TripFilter): Promise<any[]>;
  getDriverTripHistory(driverId: string, filter?: TripFilter): Promise<any[]>;
  getRiderTripHistoryFiltered(riderId: string, filter?: TripFilter): Promise<any[]>;
  getTripById(tripId: string): Promise<any | null>;
  acceptTrip(tripId: string, driverId: string): Promise<Trip | null>;
  updateTripStatus(tripId: string, driverId: string, status: string): Promise<Trip | null>;
  cancelTrip(tripId: string, riderId: string, reason?: string): Promise<Trip | null>;
  adminCancelTrip(tripId: string, reason?: string): Promise<Trip | null>;
  getAllTrips(): Promise<any[]>;
  getAllTripsWithDetails(): Promise<any[]>;

  getAdminStats(): Promise<{
    totalDrivers: number;
    pendingDrivers: number;
    totalTrips: number;
    activeTrips: number;
    totalRiders: number;
    completedTrips: number;
    totalFares: string;
    totalCommission: string;
    totalDriverPayouts: string;
  }>;

  createPayoutTransaction(data: InsertPayoutTransaction): Promise<PayoutTransaction>;
  getAllPayoutTransactions(): Promise<any[]>;
  getPendingPayouts(): Promise<any[]>;
  getDriverPayouts(driverId: string): Promise<PayoutTransaction[]>;
  markPayoutAsPaid(transactionId: string, adminId: string): Promise<PayoutTransaction | null>;
  creditDriverWallet(driverId: string, amount: string, tripId: string): Promise<void>;
  getDriverWalletBalance(driverId: string): Promise<string>;

  getDirectorProfile(userId: string): Promise<DirectorProfile | undefined>;
  createDirectorProfile(data: InsertDirectorProfile): Promise<DirectorProfile>;
  getAllDirectorsWithDetails(): Promise<any[]>;
  getDirectorCount(): Promise<number>;

  // Phase 14.5 - Trip Coordinator
  getTripCoordinatorProfile(userId: string): Promise<TripCoordinatorProfile | undefined>;
  createTripCoordinatorProfile(data: InsertTripCoordinatorProfile): Promise<TripCoordinatorProfile>;
  getAllTripCoordinatorsWithDetails(): Promise<any[]>;
  getCoordinatorTrips(coordinatorId: string, filter?: TripFilter): Promise<any[]>;
  getCoordinatorTripStats(coordinatorId: string): Promise<{ totalTrips: number; completedTrips: number; activeTrips: number; totalFares: string }>;

  createNotification(data: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<Notification | null>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  notifyAllDrivers(title: string, message: string, type?: "info" | "success" | "warning"): Promise<void>;
  notifyAdminsAndDirectors(title: string, message: string, type?: "info" | "success" | "warning"): Promise<void>;
  
  // Ride offers
  createRideOffer(data: InsertRideOffer): Promise<RideOffer>;
  getRideOffersByRide(rideId: string): Promise<RideOffer[]>;
  getPendingRideOfferForDriver(driverId: string): Promise<RideOffer | null>;
  updateRideOfferStatus(offerId: string, status: "accepted" | "expired" | "declined"): Promise<RideOffer | null>;
  expirePendingOffersForRide(rideId: string, exceptDriverId?: string): Promise<void>;
  
  // Profile photos
  updateDriverProfilePhoto(userId: string, profilePhoto: string): Promise<void>;
  updateDriverVerificationPhoto(userId: string, verificationPhoto: string, sessionId: string): Promise<void>;
  updateDriverVerificationStatus(userId: string, status: "unverified" | "pending_review" | "verified" | "rejected"): Promise<void>;
  updateRiderProfilePhoto(userId: string, profilePhoto: string): Promise<void>;
  updateRiderVerificationPhoto(userId: string, verificationPhoto: string, sessionId: string): Promise<void>;
  getDriversNeedingVerification(): Promise<DriverProfile[]>;

  createRating(data: InsertRating): Promise<Rating>;
  getRatingByTripAndRater(tripId: string, raterId: string): Promise<Rating | null>;
  getTripRatings(tripId: string): Promise<Rating[]>;
  getAllRatings(): Promise<any[]>;
  updateUserAverageRating(userId: string, role: "driver" | "rider"): Promise<void>;

  createDispute(data: InsertDispute): Promise<Dispute>;
  getDisputeByTripAndUser(tripId: string, userId: string): Promise<Dispute | null>;
  getDisputeById(disputeId: string): Promise<any | null>;
  getAllDisputes(): Promise<any[]>;
  getFilteredDisputes(filter: { status?: string; category?: string; raisedByRole?: string }): Promise<any[]>;
  updateDispute(disputeId: string, data: UpdateDispute): Promise<Dispute | null>;
  getTripDisputes(tripId: string): Promise<Dispute[]>;

  createRefund(data: InsertRefund): Promise<Refund>;
  getRefundById(refundId: string): Promise<Refund | null>;
  getRefundsByTripId(tripId: string): Promise<Refund[]>;
  getAllRefunds(): Promise<any[]>;
  getFilteredRefunds(filter: { status?: string; tripId?: string }): Promise<any[]>;
  updateRefund(refundId: string, data: Partial<UpdateRefund>): Promise<Refund | null>;
  getRiderRefunds(riderId: string): Promise<Refund[]>;
  getDriverRefunds(driverId: string): Promise<Refund[]>;

  createWalletAdjustment(data: InsertWalletAdjustment): Promise<WalletAdjustment>;
  getUserWalletAdjustments(userId: string): Promise<WalletAdjustment[]>;
  getAllWalletAdjustments(): Promise<WalletAdjustment[]>;

  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  getAllAuditLogs(): Promise<AuditLog[]>;

  // Chargebacks
  createChargeback(data: InsertChargeback): Promise<Chargeback>;
  getChargebackById(chargebackId: string): Promise<Chargeback | null>;
  getAllChargebacks(): Promise<any[]>;
  getFilteredChargebacks(filter: { status?: string }): Promise<any[]>;
  updateChargeback(chargebackId: string, data: UpdateChargeback, resolvedByUserId?: string): Promise<Chargeback | null>;
  getChargebacksByTripId(tripId: string): Promise<Chargeback[]>;

  // Payment Reconciliations
  createPaymentReconciliation(data: InsertPaymentReconciliation): Promise<PaymentReconciliation>;
  getAllReconciliations(): Promise<any[]>;
  getFilteredReconciliations(filter: { status?: string }): Promise<any[]>;
  updateReconciliation(reconciliationId: string, status: string, reconciledByUserId: string, notes?: string): Promise<PaymentReconciliation | null>;
  runReconciliation(tripId: string, actualAmount: string, provider: string): Promise<PaymentReconciliation>;

  // Phase 11 - Wallets
  getOrCreateWallet(userId: string, role: "driver" | "ziba"): Promise<Wallet>;
  getWalletById(walletId: string): Promise<Wallet | null>;
  getWalletByUserId(userId: string): Promise<Wallet | null>;
  getZibaWallet(): Promise<Wallet>;
  getAllDriverWallets(): Promise<any[]>;
  creditWallet(walletId: string, amount: string, source: string, referenceId?: string, createdByUserId?: string, description?: string): Promise<WalletTransaction>;
  debitWallet(walletId: string, amount: string, source: string, referenceId?: string, createdByUserId?: string, description?: string): Promise<WalletTransaction | null>;
  holdWalletBalance(walletId: string, amount: string): Promise<boolean>;
  releaseWalletBalance(walletId: string, amount: string): Promise<boolean>;
  getWalletTransactions(walletId: string): Promise<WalletTransaction[]>;

  // Phase 11 - Payouts
  createWalletPayout(data: InsertWalletPayout): Promise<WalletPayout>;
  getWalletPayoutById(payoutId: string): Promise<WalletPayout | null>;
  getWalletPayoutsByWalletId(walletId: string): Promise<WalletPayout[]>;
  getDriverPayoutHistory(userId: string): Promise<any[]>;
  getAllWalletPayouts(): Promise<any[]>;
  getFilteredWalletPayouts(filter: { status?: string }): Promise<any[]>;
  processWalletPayout(payoutId: string, processedByUserId: string): Promise<WalletPayout | null>;
  reverseWalletPayout(payoutId: string, failureReason: string): Promise<WalletPayout | null>;

  // Phase 12 - Analytics
  getAnalyticsOverview(startDate?: Date, endDate?: Date): Promise<{
    trips: { total: number; completed: number; cancelled: number };
    revenue: { grossFares: string; commission: string; driverEarnings: string; netRevenue: string };
    refunds: { total: number; totalAmount: string };
    chargebacks: { total: number; won: number; lost: number; pending: number };
    wallets: { totalBalance: string; lockedBalance: string; availableBalance: string };
    payouts: { processed: number; pending: number; failed: number; totalProcessed: string };
  }>;
  getTripsAnalytics(startDate?: Date, endDate?: Date): Promise<any[]>;
  getRevenueAnalytics(startDate?: Date, endDate?: Date): Promise<any[]>;
  getRefundsAnalytics(startDate?: Date, endDate?: Date): Promise<any[]>;
  getPayoutsAnalytics(startDate?: Date, endDate?: Date): Promise<any[]>;
  getReconciliationAnalytics(startDate?: Date, endDate?: Date): Promise<{ matched: number; mismatched: number; manualReview: number }>;

  // Phase 13 - Fraud Detection
  getRiskProfile(userId: string): Promise<RiskProfile | null>;
  getOrCreateRiskProfile(userId: string, role: "rider" | "driver"): Promise<RiskProfile>;
  updateRiskProfile(userId: string, score: number, level: "low" | "medium" | "high" | "critical"): Promise<RiskProfile | null>;
  getAllRiskProfiles(): Promise<any[]>;
  getRiskProfilesByLevel(level: string): Promise<any[]>;
  getFraudOverview(): Promise<{
    riskProfiles: { total: number; low: number; medium: number; high: number; critical: number };
    fraudEvents: { total: number; unresolved: number; resolved: number };
  }>;

  createFraudEvent(data: InsertFraudEvent): Promise<FraudEvent>;
  getFraudEventById(eventId: string): Promise<FraudEvent | null>;
  getAllFraudEvents(): Promise<any[]>;
  getUnresolvedFraudEvents(): Promise<any[]>;
  getFraudEventsByEntityId(entityId: string): Promise<FraudEvent[]>;
  getFraudEventsBySeverity(severity: string): Promise<any[]>;
  resolveFraudEvent(eventId: string, resolvedByUserId: string): Promise<FraudEvent | null>;

  getUserFraudSignals(userId: string, role: "rider" | "driver"): Promise<{
    refundCount: number;
    chargebackCount: number;
    disputeCount: number;
    tripCount: number;
    cancelledCount: number;
    reversedPayoutCount: number;
  }>;

  // Phase 14 - Incentive Programs
  createIncentiveProgram(data: InsertIncentiveProgram): Promise<IncentiveProgram>;
  getIncentiveProgramById(programId: string): Promise<IncentiveProgram | null>;
  getAllIncentivePrograms(): Promise<any[]>;
  getActiveIncentivePrograms(): Promise<IncentiveProgram[]>;
  updateIncentiveProgram(programId: string, data: Partial<UpdateIncentiveProgram>): Promise<IncentiveProgram | null>;
  pauseIncentiveProgram(programId: string): Promise<IncentiveProgram | null>;
  endIncentiveProgram(programId: string): Promise<IncentiveProgram | null>;

  // Phase 14 - Incentive Earnings
  createIncentiveEarning(data: InsertIncentiveEarning): Promise<IncentiveEarning>;
  getIncentiveEarningById(earningId: string): Promise<IncentiveEarning | null>;
  getDriverIncentiveEarnings(driverId: string): Promise<any[]>;
  getAllIncentiveEarnings(): Promise<any[]>;
  getPendingIncentiveEarnings(): Promise<any[]>;
  approveIncentiveEarning(earningId: string): Promise<IncentiveEarning | null>;
  payIncentiveEarning(earningId: string, walletTransactionId: string): Promise<IncentiveEarning | null>;
  revokeIncentiveEarning(earningId: string, revokedByUserId: string, reason: string): Promise<IncentiveEarning | null>;
  getDriverEarningsByProgram(driverId: string, programId: string): Promise<IncentiveEarning[]>;
  getIncentiveStats(): Promise<{
    activePrograms: number;
    totalEarnings: string;
    pendingEarnings: string;
    paidEarnings: string;
    revokedEarnings: string;
  }>;

  // Phase 15 - Multi-Country
  createCountry(data: InsertCountry): Promise<Country>;
  getCountryById(countryId: string): Promise<Country | null>;
  getCountryByCode(isoCode: string): Promise<Country | null>;
  getAllCountries(): Promise<any[]>;
  getActiveCountries(): Promise<Country[]>;
  updateCountry(countryId: string, data: Partial<UpdateCountry>): Promise<Country | null>;

  // Phase 15 - Tax Rules
  createTaxRule(data: InsertTaxRule): Promise<TaxRule>;
  getTaxRuleById(ruleId: string): Promise<TaxRule | null>;
  getTaxRulesByCountry(countryId: string): Promise<any[]>;
  getActiveTaxRules(countryId: string): Promise<TaxRule[]>;
  getAllTaxRules(): Promise<any[]>;
  updateTaxRule(ruleId: string, data: Partial<UpdateTaxRule>): Promise<TaxRule | null>;

  // Phase 15 - Exchange Rates
  createExchangeRate(data: InsertExchangeRate): Promise<ExchangeRate>;
  getLatestExchangeRate(baseCurrency: string, targetCurrency: string): Promise<ExchangeRate | null>;
  getAllExchangeRates(): Promise<ExchangeRate[]>;
  getExchangeRateHistory(baseCurrency: string, targetCurrency: string): Promise<ExchangeRate[]>;

  // Phase 15 - Compliance Profiles
  createComplianceProfile(data: InsertComplianceProfile): Promise<ComplianceProfile>;
  getComplianceProfileByCountry(countryId: string): Promise<ComplianceProfile | null>;
  getAllComplianceProfiles(): Promise<any[]>;
  updateComplianceProfile(profileId: string, data: Partial<UpdateComplianceProfile>): Promise<ComplianceProfile | null>;

  // Phase 15 - Country Analytics
  getCountryAnalytics(countryId?: string): Promise<{
    countries: { id: string; name: string; isoCode: string; tripCount: number; revenue: string; estimatedTax: string }[];
  }>;
  getComplianceOverview(): Promise<{
    totalCountries: number;
    activeCountries: number;
    taxRulesCount: number;
    totalEstimatedTax: string;
  }>;

  // Phase 18 - Contracts, SLAs & Enterprise Billing
  createOrganizationContract(data: InsertOrganizationContract): Promise<OrganizationContract>;
  getOrganizationContract(contractId: string): Promise<OrganizationContract | null>;
  getContractByCoordinator(tripCoordinatorId: string): Promise<OrganizationContract | null>;
  getAllOrganizationContracts(): Promise<OrganizationContractWithDetails[]>;
  updateOrganizationContract(contractId: string, data: Partial<InsertOrganizationContract>): Promise<OrganizationContract | null>;

  createServiceLevelAgreement(data: InsertServiceLevelAgreement): Promise<ServiceLevelAgreement>;
  getServiceLevelAgreement(slaId: string): Promise<ServiceLevelAgreement | null>;
  getSLAsByContract(contractId: string): Promise<ServiceLevelAgreementWithDetails[]>;
  updateServiceLevelAgreement(slaId: string, data: Partial<InsertServiceLevelAgreement>): Promise<ServiceLevelAgreement | null>;

  createEnterpriseInvoice(data: InsertEnterpriseInvoice): Promise<EnterpriseInvoice>;
  getEnterpriseInvoice(invoiceId: string): Promise<EnterpriseInvoice | null>;
  getInvoicesByContract(contractId: string): Promise<EnterpriseInvoiceWithDetails[]>;
  getAllEnterpriseInvoices(): Promise<EnterpriseInvoiceWithDetails[]>;
  updateEnterpriseInvoiceStatus(invoiceId: string, status: string): Promise<EnterpriseInvoice | null>;
  generateInvoiceForContract(contractId: string, periodStart: Date, periodEnd: Date): Promise<EnterpriseInvoice | null>;

  getContractStats(): Promise<{
    totalContracts: number;
    activeContracts: number;
    totalBilled: string;
    pendingInvoices: number;
  }>;

  // Phase 19 - Growth, Marketing & Partnerships
  createReferralCode(data: InsertReferralCode): Promise<ReferralCode>;
  getReferralCodeByCode(code: string): Promise<ReferralCode | null>;
  getReferralCodesByOwner(ownerUserId: string): Promise<ReferralCode[]>;
  updateReferralCodeUsage(codeId: string): Promise<ReferralCode | null>;
  deactivateReferralCode(codeId: string): Promise<ReferralCode | null>;
  getAllReferralCodes(): Promise<ReferralCodeWithStats[]>;
  
  createReferralEvent(data: InsertReferralEvent): Promise<ReferralEvent>;
  getReferralEventsByCode(referralCodeId: string): Promise<ReferralEvent[]>;
  getReferralStats(ownerUserId: string): Promise<{ totalReferrals: number; conversions: number }>;
  
  createMarketingCampaign(data: InsertMarketingCampaign): Promise<MarketingCampaign>;
  getMarketingCampaign(campaignId: string): Promise<MarketingCampaign | null>;
  getAllMarketingCampaigns(): Promise<MarketingCampaign[]>;
  getActiveCampaigns(): Promise<MarketingCampaign[]>;
  updateMarketingCampaignStatus(campaignId: string, status: string): Promise<MarketingCampaign | null>;
  
  createPartnerLead(data: InsertPartnerLead): Promise<PartnerLead>;
  getPartnerLead(leadId: string): Promise<PartnerLead | null>;
  getAllPartnerLeads(): Promise<PartnerLead[]>;
  updatePartnerLeadStatus(leadId: string, status: string): Promise<PartnerLead | null>;
  
  getGrowthStats(): Promise<GrowthStats>;

  // Phase 20 - Post-Launch Monitoring & Feature Flags
  createFeatureFlag(data: InsertFeatureFlag): Promise<FeatureFlag>;
  getFeatureFlag(name: string): Promise<FeatureFlag | null>;
  getAllFeatureFlags(): Promise<FeatureFlag[]>;
  updateFeatureFlag(name: string, data: Partial<InsertFeatureFlag>): Promise<FeatureFlag | null>;
  isFeatureEnabled(name: string, userId?: string): Promise<boolean>;
  
  getPlatformMetrics(): Promise<PlatformMetrics>;
  getRiderMetrics(): Promise<RiderMetrics>;
  getDriverMetrics(): Promise<DriverMetrics>;
  getOrganizationMetrics(): Promise<OrganizationMetrics>;
  getFinancialMetrics(): Promise<FinancialMetrics>;
  getMetricsOverview(): Promise<MetricsOverview>;

  // Phase 22 - Enhanced Ride Lifecycle
  createRide(data: InsertRide): Promise<Ride>;
  getRideById(rideId: string): Promise<Ride | null>;
  getRidesByStatus(status: string): Promise<Ride[]>;
  getRiderRides(riderId: string): Promise<Ride[]>;
  getDriverRides(driverId: string): Promise<Ride[]>;
  getCurrentRiderRide(riderId: string): Promise<Ride | null>;
  getCurrentDriverRide(driverId: string): Promise<Ride | null>;
  getAvailableRidesForDriver(): Promise<Ride[]>;
  updateRideStatus(rideId: string, status: string, additionalData?: Partial<Ride>): Promise<Ride | null>;
  assignDriverToRide(rideId: string, driverId: string): Promise<Ride | null>;
  cancelRide(rideId: string, cancelledBy: string, reason?: string, compensationData?: {
    driverCancelReason?: string;
    cancellationFee?: number | null;
    driverCancelCompensation?: number | null;
    platformCancelFee?: number | null;
    compensationEligible?: boolean;
  }): Promise<Ride | null>;
  
  // Driver Movement tracking
  createDriverMovement(data: InsertDriverMovement): Promise<DriverMovement>;
  getDriverMovementsForRide(rideId: string): Promise<DriverMovement[]>;
  getTotalDriverMovement(rideId: string): Promise<{ distanceKm: number; durationSec: number }>;
  
  // Ride Audit Log
  createRideAuditLog(data: InsertRideAuditLog): Promise<RideAuditLog>;
  getRideAuditLogs(rideId: string): Promise<RideAuditLog[]>;
  
  // Phase 24 - Reservations / Scheduled Trips
  createReservation(data: InsertRide & { scheduledPickupAt: Date }): Promise<Ride>;
  getUpcomingReservations(riderId: string): Promise<Ride[]>;
  getDriverUpcomingReservations(driverId: string): Promise<Ride[]>;
  getAllUpcomingReservations(): Promise<Ride[]>;
  getAvailableReservationOffers(): Promise<Ride[]>;
  acceptReservationOffer(rideId: string, driverId: string): Promise<Ride | null>;
  assignDriverToReservation(rideId: string, driverId: string): Promise<Ride | null>;
  updateReservationStatus(rideId: string, status: string): Promise<Ride | null>;
  cancelReservation(rideId: string, cancelledBy: string, reason?: string): Promise<Ride | null>;
  getReservationsInPrepWindow(): Promise<Ride[]>;
  applyEarlyArrivalBonus(rideId: string, bonusAmount: string): Promise<Ride | null>;
}

export class DatabaseStorage implements IStorage {
  async getUserRole(userId: string): Promise<UserRole | undefined> {
    const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    return role;
  }

  async createUserRole(data: InsertUserRole): Promise<UserRole> {
    const [role] = await db.insert(userRoles).values(data).returning();
    return role;
  }

  async getAdminCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(userRoles)
      .where(eq(userRoles.role, "admin"));
    return result?.count || 0;
  }

  // Admin appointment methods (SUPER_ADMIN only)
  async appointAdmin(
    userId: string, 
    adminStartAt: Date, 
    adminEndAt: Date, 
    adminPermissions: string[], 
    appointedBy: string
  ): Promise<UserRole> {
    const existingRole = await this.getUserRole(userId);
    
    if (existingRole) {
      const [updated] = await db
        .update(userRoles)
        .set({
          role: "admin",
          adminStartAt,
          adminEndAt,
          adminPermissions,
          appointedBy,
          updatedAt: new Date()
        })
        .where(eq(userRoles.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userRoles)
        .values({
          userId,
          role: "admin",
          adminStartAt,
          adminEndAt,
          adminPermissions,
          appointedBy
        })
        .returning();
      return created;
    }
  }

  async revokeAdmin(userId: string): Promise<UserRole | undefined> {
    const [updated] = await db
      .update(userRoles)
      .set({
        role: "rider",
        adminStartAt: null,
        adminEndAt: null,
        adminPermissions: null,
        updatedAt: new Date()
      })
      .where(eq(userRoles.userId, userId))
      .returning();
    return updated;
  }

  async getAllAdmins(): Promise<UserRole[]> {
    return db
      .select()
      .from(userRoles)
      .where(or(eq(userRoles.role, "admin"), eq(userRoles.role, "super_admin")));
  }

  async checkAndExpireAdmins(): Promise<number> {
    const now = new Date();
    const result = await db
      .update(userRoles)
      .set({
        role: "rider",
        adminStartAt: null,
        adminEndAt: null,
        adminPermissions: null,
        updatedAt: now
      })
      .where(
        and(
          eq(userRoles.role, "admin"),
          lt(userRoles.adminEndAt, now)
        )
      )
      .returning();
    return result.length;
  }

  async isAdminValid(userId: string): Promise<{ valid: boolean; role: UserRole | null; reason?: string }> {
    const role = await this.getUserRole(userId);
    
    if (!role) {
      return { valid: false, role: null, reason: "No role found" };
    }
    
    if (role.role === "super_admin") {
      return { valid: true, role };
    }
    
    if (role.role !== "admin") {
      return { valid: false, role, reason: "Not an admin" };
    }
    
    const now = new Date();
    
    if (role.adminStartAt && new Date(role.adminStartAt) > now) {
      return { valid: false, role, reason: "Admin period has not started" };
    }
    
    if (role.adminEndAt && new Date(role.adminEndAt) < now) {
      return { valid: false, role, reason: "Admin period has expired" };
    }
    
    return { valid: true, role };
  }

  async updateAdminPermissions(
    userId: string, 
    adminPermissions: string[], 
    adminEndAt?: Date
  ): Promise<UserRole | undefined> {
    const updateData: any = {
      adminPermissions,
      updatedAt: new Date()
    };
    
    if (adminEndAt) {
      updateData.adminEndAt = adminEndAt;
    }
    
    const [updated] = await db
      .update(userRoles)
      .set(updateData)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.role, "admin")))
      .returning();
    return updated;
  }

  // Role Appointments (SUPER_ADMIN only)
  async getAllUsersWithRoles(): Promise<any[]> {
    const result = await db
      .select({
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: userRoles.role,
        createdAt: users.createdAt
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .orderBy(users.email);
    return result;
  }

  async promoteToAdmin(userId: string, promotedBy: string): Promise<UserRole> {
    const existingRole = await this.getUserRole(userId);
    
    if (existingRole) {
      const [updated] = await db
        .update(userRoles)
        .set({
          role: "admin",
          appointedBy: promotedBy,
          updatedAt: new Date()
        })
        .where(eq(userRoles.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userRoles)
        .values({
          userId,
          role: "admin",
          appointedBy: promotedBy
        })
        .returning();
      return created;
    }
  }

  async demoteToRider(userId: string): Promise<UserRole | undefined> {
    const [updated] = await db
      .update(userRoles)
      .set({
        role: "rider",
        adminStartAt: null,
        adminEndAt: null,
        adminPermissions: null,
        appointedBy: null,
        updatedAt: new Date()
      })
      .where(eq(userRoles.userId, userId))
      .returning();
    return updated;
  }

  async updateThemePreference(userId: string, preference: "light" | "dark" | "system"): Promise<void> {
    await db
      .update(users)
      .set({ themePreference: preference, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getThemePreference(userId: string): Promise<"light" | "dark" | "system"> {
    const [user] = await db.select({ themePreference: users.themePreference }).from(users).where(eq(users.id, userId));
    return user?.themePreference || "system";
  }

  async getDriverProfile(userId: string): Promise<DriverProfile | undefined> {
    const [profile] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, userId));
    return profile;
  }

  async createDriverProfile(data: InsertDriverProfile): Promise<DriverProfile> {
    const [profile] = await db.insert(driverProfiles).values(data).returning();
    return profile;
  }

  async updateDriverProfile(userId: string, data: Partial<InsertDriverProfile>): Promise<DriverProfile | undefined> {
    const [profile] = await db
      .update(driverProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(driverProfiles.userId, userId))
      .returning();
    return profile;
  }

  async updateDriverOnlineStatus(userId: string, isOnline: boolean): Promise<DriverProfile | undefined> {
    const [profile] = await db
      .update(driverProfiles)
      .set({ isOnline, updatedAt: new Date() })
      .where(eq(driverProfiles.userId, userId))
      .returning();
    return profile;
  }

  async updateDriverStatus(userId: string, status: string): Promise<DriverProfile | undefined> {
    const [profile] = await db
      .update(driverProfiles)
      .set({ status: status as any, isOnline: false, updatedAt: new Date() })
      .where(eq(driverProfiles.userId, userId))
      .returning();
    return profile;
  }

  async getAllDrivers(): Promise<DriverProfile[]> {
    return await db.select().from(driverProfiles).orderBy(desc(driverProfiles.createdAt));
  }

  async getAllDriversWithDetails(): Promise<any[]> {
    const allDrivers = await db.select().from(driverProfiles).orderBy(desc(driverProfiles.createdAt));
    
    const driversWithDetails = await Promise.all(
      allDrivers.map(async (driver) => {
        const [user] = await db.select().from(users).where(eq(users.id, driver.userId));
        return { ...driver, email: user?.email };
      })
    );

    return driversWithDetails;
  }

  async createRiderProfile(data: InsertRiderProfile): Promise<RiderProfile> {
    const [profile] = await db.insert(riderProfiles).values(data).returning();
    return profile;
  }

  async getRiderProfile(userId: string): Promise<RiderProfile | undefined> {
    const [profile] = await db.select().from(riderProfiles).where(eq(riderProfiles.userId, userId));
    return profile;
  }

  async getAllRidersWithDetails(): Promise<any[]> {
    const riderRoles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.role, "rider"))
      .orderBy(desc(userRoles.createdAt));

    const ridersWithDetails = await Promise.all(
      riderRoles.map(async (role) => {
        const [user] = await db.select().from(users).where(eq(users.id, role.userId));
        const [profile] = await db.select().from(riderProfiles).where(eq(riderProfiles.userId, role.userId));
        return {
          id: role.userId,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          fullName: profile?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email),
          phone: profile?.phone,
          createdAt: role.createdAt,
        };
      })
    );

    return ridersWithDetails;
  }

  async createTrip(data: InsertTrip): Promise<Trip> {
    const passengerCount = data.passengerCount ?? 1;
    const pricing = calculateFare(passengerCount);
    const [trip] = await db.insert(trips).values({
      ...data,
      fareAmount: pricing.fareAmount,
      driverPayout: pricing.driverPayout,
      commissionAmount: pricing.commissionAmount,
      commissionPercentage: pricing.commissionPercentage,
    }).returning();
    return trip;
  }

  async getAvailableTrips(): Promise<any[]> {
    const availableTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.status, "requested"))
      .orderBy(desc(trips.createdAt));

    const tripsWithRiderNames = await Promise.all(
      availableTrips.map(async (trip) => {
        const [rider] = await db
          .select()
          .from(riderProfiles)
          .where(eq(riderProfiles.userId, trip.riderId));
        
        let riderName = undefined;
        if (rider?.fullName) {
          riderName = rider.fullName;
        } else {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, trip.riderId));
          riderName = user?.firstName 
            ? `${user.firstName} ${user.lastName || ''}`.trim() 
            : 'Rider';
        }
        
        return { ...trip, riderName };
      })
    );

    return tripsWithRiderNames;
  }

  async getDriverCurrentTrip(driverId: string): Promise<Trip | null> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.driverId, driverId),
          or(
            eq(trips.status, "accepted"),
            eq(trips.status, "in_progress")
          )
        )
      );
    return trip || null;
  }

  async getRiderCurrentTrip(riderId: string): Promise<Trip | null> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.riderId, riderId),
          or(
            eq(trips.status, "requested"),
            eq(trips.status, "accepted"),
            eq(trips.status, "in_progress")
          )
        )
      )
      .orderBy(desc(trips.createdAt))
      .limit(1);
    return trip || null;
  }

  async getRiderTripHistory(riderId: string): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.riderId, riderId))
      .orderBy(desc(trips.createdAt))
      .limit(20);
  }

  async acceptTrip(tripId: string, driverId: string): Promise<Trip | null> {
    const [trip] = await db
      .update(trips)
      .set({ 
        driverId, 
        status: "accepted",
        acceptedAt: new Date()
      })
      .where(
        and(
          eq(trips.id, tripId),
          eq(trips.status, "requested")
        )
      )
      .returning();
    return trip || null;
  }

  async updateTripStatus(tripId: string, driverId: string, status: string): Promise<Trip | null> {
    const updates: any = { status };
    if (status === "completed") {
      updates.completedAt = new Date();
    }

    const [trip] = await db
      .update(trips)
      .set(updates)
      .where(
        and(
          eq(trips.id, tripId),
          eq(trips.driverId, driverId)
        )
      )
      .returning();

    if (trip && status === "completed" && trip.driverPayout) {
      await this.creditDriverWallet(driverId, trip.driverPayout, tripId);
    }

    return trip || null;
  }

  async cancelTrip(tripId: string, riderId: string, reason?: string): Promise<Trip | null> {
    const [trip] = await db
      .update(trips)
      .set({ 
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: "rider",
        cancellationReason: reason || null,
      })
      .where(
        and(
          eq(trips.id, tripId),
          eq(trips.riderId, riderId),
          or(
            eq(trips.status, "requested"),
            eq(trips.status, "accepted")
          )
        )
      )
      .returning();
    return trip || null;
  }

  async adminCancelTrip(tripId: string, reason?: string): Promise<Trip | null> {
    const [trip] = await db
      .update(trips)
      .set({ 
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: "admin",
        cancellationReason: reason || null,
      })
      .where(
        and(
          eq(trips.id, tripId),
          or(
            eq(trips.status, "requested"),
            eq(trips.status, "accepted"),
            eq(trips.status, "in_progress")
          )
        )
      )
      .returning();
    return trip || null;
  }

  async getAllTrips(): Promise<any[]> {
    return await this.getAllTripsWithDetails();
  }

  async getAllTripsWithDetails(): Promise<any[]> {
    const allTrips = await db
      .select()
      .from(trips)
      .orderBy(desc(trips.createdAt))
      .limit(100);

    const tripsWithDetails = await Promise.all(
      allTrips.map(async (trip) => {
        let driverName = undefined;
        let riderName = undefined;

        if (trip.driverId) {
          const [driver] = await db
            .select()
            .from(driverProfiles)
            .where(eq(driverProfiles.userId, trip.driverId));
          driverName = driver?.fullName;
        }

        const [rider] = await db
          .select()
          .from(riderProfiles)
          .where(eq(riderProfiles.userId, trip.riderId));
        
        if (rider?.fullName) {
          riderName = rider.fullName;
        } else {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, trip.riderId));
          riderName = user?.firstName 
            ? `${user.firstName} ${user.lastName || ''}`.trim() 
            : user?.email || 'Unknown';
        }

        return { ...trip, driverName, riderName };
      })
    );

    return tripsWithDetails;
  }

  private async enrichTripWithDetails(trip: Trip): Promise<any> {
    let driverName = undefined;
    let riderName = undefined;

    if (trip.driverId) {
      const [driver] = await db
        .select()
        .from(driverProfiles)
        .where(eq(driverProfiles.userId, trip.driverId));
      driverName = driver?.fullName;
    }

    const [rider] = await db
      .select()
      .from(riderProfiles)
      .where(eq(riderProfiles.userId, trip.riderId));
    
    if (rider?.fullName) {
      riderName = rider.fullName;
    } else {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, trip.riderId));
      riderName = user?.firstName 
        ? `${user.firstName} ${user.lastName || ''}`.trim() 
        : user?.email || 'Unknown';
    }

    return { ...trip, driverName, riderName };
  }

  async getFilteredTrips(filter: TripFilter): Promise<any[]> {
    const conditions: any[] = [];

    if (filter.status) {
      conditions.push(eq(trips.status, filter.status as any));
    }
    if (filter.driverId) {
      conditions.push(eq(trips.driverId, filter.driverId));
    }
    if (filter.riderId) {
      conditions.push(eq(trips.riderId, filter.riderId));
    }
    if (filter.startDate) {
      conditions.push(gte(trips.createdAt, new Date(filter.startDate)));
    }
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(trips.createdAt, endDate));
    }

    const query = conditions.length > 0
      ? db.select().from(trips).where(and(...conditions)).orderBy(desc(trips.createdAt)).limit(100)
      : db.select().from(trips).orderBy(desc(trips.createdAt)).limit(100);

    const allTrips = await query;
    return Promise.all(allTrips.map(trip => this.enrichTripWithDetails(trip)));
  }

  async getDriverTripHistory(driverId: string, filter?: TripFilter): Promise<any[]> {
    const conditions: any[] = [eq(trips.driverId, driverId)];

    if (filter?.status) {
      conditions.push(eq(trips.status, filter.status as any));
    }
    if (filter?.startDate) {
      conditions.push(gte(trips.createdAt, new Date(filter.startDate)));
    }
    if (filter?.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(trips.createdAt, endDate));
    }

    const allTrips = await db
      .select()
      .from(trips)
      .where(and(...conditions))
      .orderBy(desc(trips.createdAt))
      .limit(50);

    return Promise.all(allTrips.map(trip => this.enrichTripWithDetails(trip)));
  }

  async getRiderTripHistoryFiltered(riderId: string, filter?: TripFilter): Promise<any[]> {
    const conditions: any[] = [eq(trips.riderId, riderId)];

    if (filter?.status) {
      conditions.push(eq(trips.status, filter.status as any));
    }
    if (filter?.startDate) {
      conditions.push(gte(trips.createdAt, new Date(filter.startDate)));
    }
    if (filter?.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(trips.createdAt, endDate));
    }

    const allTrips = await db
      .select()
      .from(trips)
      .where(and(...conditions))
      .orderBy(desc(trips.createdAt))
      .limit(50);

    return Promise.all(allTrips.map(trip => this.enrichTripWithDetails(trip)));
  }

  async getTripById(tripId: string): Promise<any | null> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId));
    
    if (!trip) return null;
    return this.enrichTripWithDetails(trip);
  }

  async getAdminStats(): Promise<{
    totalDrivers: number;
    pendingDrivers: number;
    totalTrips: number;
    activeTrips: number;
    totalRiders: number;
    completedTrips: number;
    totalFares: string;
    totalCommission: string;
    totalDriverPayouts: string;
  }> {
    const [driverStats] = await db
      .select({ count: count() })
      .from(driverProfiles);

    const [pendingStats] = await db
      .select({ count: count() })
      .from(driverProfiles)
      .where(eq(driverProfiles.status, "pending"));

    const [tripStats] = await db
      .select({ count: count() })
      .from(trips);

    const [activeStats] = await db
      .select({ count: count() })
      .from(trips)
      .where(
        or(
          eq(trips.status, "requested"),
          eq(trips.status, "accepted"),
          eq(trips.status, "in_progress")
        )
      );

    const [riderStats] = await db
      .select({ count: count() })
      .from(userRoles)
      .where(eq(userRoles.role, "rider"));

    const [completedStats] = await db
      .select({ count: count() })
      .from(trips)
      .where(eq(trips.status, "completed"));

    const [pricingStats] = await db
      .select({
        totalFares: sql<string>`COALESCE(SUM(CAST(${trips.fareAmount} AS NUMERIC)), 0)`,
        totalCommission: sql<string>`COALESCE(SUM(CAST(${trips.commissionAmount} AS NUMERIC)), 0)`,
        totalDriverPayouts: sql<string>`COALESCE(SUM(CAST(${trips.driverPayout} AS NUMERIC)), 0)`,
      })
      .from(trips)
      .where(eq(trips.status, "completed"));

    return {
      totalDrivers: driverStats?.count || 0,
      pendingDrivers: pendingStats?.count || 0,
      totalTrips: tripStats?.count || 0,
      activeTrips: activeStats?.count || 0,
      totalRiders: riderStats?.count || 0,
      completedTrips: completedStats?.count || 0,
      totalFares: parseFloat(pricingStats?.totalFares || "0").toFixed(2),
      totalCommission: parseFloat(pricingStats?.totalCommission || "0").toFixed(2),
      totalDriverPayouts: parseFloat(pricingStats?.totalDriverPayouts || "0").toFixed(2),
    };
  }

  async createPayoutTransaction(data: InsertPayoutTransaction): Promise<PayoutTransaction> {
    const [transaction] = await db.insert(payoutTransactions).values(data).returning();
    return transaction;
  }

  async getAllPayoutTransactions(): Promise<any[]> {
    const allTransactions = await db
      .select()
      .from(payoutTransactions)
      .orderBy(desc(payoutTransactions.createdAt))
      .limit(200);

    const transactionsWithDetails = await Promise.all(
      allTransactions.map(async (txn) => {
        const [driver] = await db
          .select()
          .from(driverProfiles)
          .where(eq(driverProfiles.userId, txn.driverId));
        return { ...txn, driverName: driver?.fullName || 'Unknown Driver' };
      })
    );

    return transactionsWithDetails;
  }

  async getPendingPayouts(): Promise<any[]> {
    const pendingTxns = await db
      .select()
      .from(payoutTransactions)
      .where(
        and(
          eq(payoutTransactions.type, "earning"),
          eq(payoutTransactions.status, "pending")
        )
      )
      .orderBy(desc(payoutTransactions.createdAt));

    const transactionsWithDetails = await Promise.all(
      pendingTxns.map(async (txn) => {
        const [driver] = await db
          .select()
          .from(driverProfiles)
          .where(eq(driverProfiles.userId, txn.driverId));
        return { ...txn, driverName: driver?.fullName || 'Unknown Driver' };
      })
    );

    return transactionsWithDetails;
  }

  async getDriverPayouts(driverId: string): Promise<PayoutTransaction[]> {
    return await db
      .select()
      .from(payoutTransactions)
      .where(eq(payoutTransactions.driverId, driverId))
      .orderBy(desc(payoutTransactions.createdAt));
  }

  async markPayoutAsPaid(transactionId: string, adminId: string): Promise<PayoutTransaction | null> {
    const [transaction] = await db
      .update(payoutTransactions)
      .set({ 
        status: "paid",
        paidAt: new Date(),
        paidByAdminId: adminId
      })
      .where(
        and(
          eq(payoutTransactions.id, transactionId),
          eq(payoutTransactions.status, "pending")
        )
      )
      .returning();
    return transaction || null;
  }

  async creditDriverWallet(driverId: string, amount: string, tripId: string): Promise<void> {
    await db
      .update(driverProfiles)
      .set({ 
        walletBalance: sql`${driverProfiles.walletBalance} + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(driverProfiles.userId, driverId));

    await this.createPayoutTransaction({
      driverId,
      tripId,
      type: "earning",
      amount,
      status: "pending",
      description: `Earning from completed trip`,
    });
  }

  async getDriverWalletBalance(driverId: string): Promise<string> {
    const [driver] = await db
      .select({ walletBalance: driverProfiles.walletBalance })
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, driverId));
    return driver?.walletBalance || "0.00";
  }

  async getDirectorProfile(userId: string): Promise<DirectorProfile | undefined> {
    const [profile] = await db.select().from(directorProfiles).where(eq(directorProfiles.userId, userId));
    return profile;
  }

  async createDirectorProfile(data: InsertDirectorProfile): Promise<DirectorProfile> {
    const [profile] = await db.insert(directorProfiles).values(data).returning();
    return profile;
  }

  async getAllDirectorsWithDetails(): Promise<any[]> {
    const directorRoles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.role, "director"))
      .orderBy(desc(userRoles.createdAt));

    const directorsWithDetails = await Promise.all(
      directorRoles.map(async (role) => {
        const [user] = await db.select().from(users).where(eq(users.id, role.userId));
        const [profile] = await db.select().from(directorProfiles).where(eq(directorProfiles.userId, role.userId));
        return {
          id: role.userId,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          fullName: profile?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email),
          status: profile?.status || "active",
          createdAt: role.createdAt,
        };
      })
    );

    return directorsWithDetails;
  }

  async getDirectorCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(userRoles)
      .where(eq(userRoles.role, "director"));
    return result?.count || 0;
  }

  // Phase 14.5 - Trip Coordinator methods
  async getTripCoordinatorProfile(userId: string): Promise<TripCoordinatorProfile | undefined> {
    const [profile] = await db.select().from(tripCoordinatorProfiles).where(eq(tripCoordinatorProfiles.userId, userId));
    return profile;
  }

  async createTripCoordinatorProfile(data: InsertTripCoordinatorProfile): Promise<TripCoordinatorProfile> {
    const [profile] = await db.insert(tripCoordinatorProfiles).values(data).returning();
    return profile;
  }

  async getAllTripCoordinatorsWithDetails(): Promise<any[]> {
    const coordinatorRoles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.role, "trip_coordinator"))
      .orderBy(desc(userRoles.createdAt));

    const coordinatorsWithDetails = await Promise.all(
      coordinatorRoles.map(async (role) => {
        const [user] = await db.select().from(users).where(eq(users.id, role.userId));
        const [profile] = await db.select().from(tripCoordinatorProfiles).where(eq(tripCoordinatorProfiles.userId, role.userId));
        return {
          id: role.userId,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          organizationName: profile?.organizationName,
          organizationType: profile?.organizationType,
          contactEmail: profile?.contactEmail,
          contactPhone: profile?.contactPhone,
          createdAt: role.createdAt,
        };
      })
    );

    return coordinatorsWithDetails;
  }

  async getCoordinatorTrips(coordinatorId: string, filter?: TripFilter): Promise<any[]> {
    let query = db
      .select()
      .from(trips)
      .where(eq(trips.riderId, coordinatorId))
      .orderBy(desc(trips.createdAt));

    const tripResults = await query;

    const tripsWithDetails = await Promise.all(
      tripResults
        .filter(trip => {
          if (filter?.status && trip.status !== filter.status) return false;
          if (filter?.startDate && trip.createdAt && new Date(trip.createdAt) < new Date(filter.startDate)) return false;
          if (filter?.endDate && trip.createdAt && new Date(trip.createdAt) > new Date(filter.endDate)) return false;
          return true;
        })
        .map(async (trip) => {
          const [driver] = trip.driverId 
            ? await db.select().from(driverProfiles).where(eq(driverProfiles.userId, trip.driverId))
            : [null];
          const [profile] = await db.select().from(tripCoordinatorProfiles).where(eq(tripCoordinatorProfiles.userId, coordinatorId));
          return {
            ...trip,
            driverName: driver?.fullName || null,
            organizationName: profile?.organizationName || null,
          };
        })
    );

    return tripsWithDetails;
  }

  async getCoordinatorTripStats(coordinatorId: string): Promise<{ totalTrips: number; completedTrips: number; activeTrips: number; totalFares: string }> {
    const allTrips = await db.select().from(trips).where(eq(trips.riderId, coordinatorId));
    
    const totalTrips = allTrips.length;
    const completedTrips = allTrips.filter(t => t.status === "completed").length;
    const activeTrips = allTrips.filter(t => t.status === "requested" || t.status === "accepted" || t.status === "in_progress").length;
    const totalFares = allTrips
      .filter(t => t.status === "completed" && t.fareAmount)
      .reduce((sum, t) => sum + parseFloat(t.fareAmount || "0"), 0)
      .toFixed(2);

    return { totalTrips, completedTrips, activeTrips, totalFares };
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        )
      );
    return result?.count || 0;
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    const [notification] = await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      )
      .returning();
    return notification || null;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        )
      );
  }

  async notifyAllDrivers(title: string, message: string, type: "info" | "success" | "warning" = "info"): Promise<void> {
    const allDrivers = await db.select().from(driverProfiles);
    for (const driver of allDrivers) {
      await this.createNotification({
        userId: driver.userId,
        role: "driver",
        title,
        message,
        type,
      });
    }
  }

  async notifyAdminsAndDirectors(title: string, message: string, type: "info" | "success" | "warning" = "info"): Promise<void> {
    const adminRoles = await db
      .select()
      .from(userRoles)
      .where(or(eq(userRoles.role, "admin"), eq(userRoles.role, "director")));
    
    for (const role of adminRoles) {
      await this.createNotification({
        userId: role.userId,
        role: role.role as "admin" | "director",
        title,
        message,
        type,
      });
    }
  }

  // Ride offers implementation
  async createRideOffer(data: InsertRideOffer): Promise<RideOffer> {
    const [offer] = await db.insert(rideOffers).values(data).returning();
    return offer;
  }

  async getRideOffersByRide(rideId: string): Promise<RideOffer[]> {
    return await db
      .select()
      .from(rideOffers)
      .where(eq(rideOffers.rideId, rideId))
      .orderBy(desc(rideOffers.createdAt));
  }

  async getPendingRideOfferForDriver(driverId: string): Promise<RideOffer | null> {
    const [offer] = await db
      .select()
      .from(rideOffers)
      .where(
        and(
          eq(rideOffers.driverId, driverId),
          eq(rideOffers.status, "pending")
        )
      )
      .limit(1);
    return offer || null;
  }

  async updateRideOfferStatus(offerId: string, status: "accepted" | "expired" | "declined"): Promise<RideOffer | null> {
    const [offer] = await db
      .update(rideOffers)
      .set({ 
        status, 
        respondedAt: new Date() 
      })
      .where(eq(rideOffers.id, offerId))
      .returning();
    return offer || null;
  }

  async expirePendingOffersForRide(rideId: string, exceptDriverId?: string): Promise<void> {
    const conditions = [
      eq(rideOffers.rideId, rideId),
      eq(rideOffers.status, "pending")
    ];
    
    if (exceptDriverId) {
      await db
        .update(rideOffers)
        .set({ status: "expired", respondedAt: new Date() })
        .where(
          and(
            ...conditions,
            sql`${rideOffers.driverId} != ${exceptDriverId}`
          )
        );
    } else {
      await db
        .update(rideOffers)
        .set({ status: "expired", respondedAt: new Date() })
        .where(and(...conditions));
    }
  }

  // Profile photos implementation
  async updateDriverProfilePhoto(userId: string, profilePhoto: string): Promise<void> {
    await db
      .update(driverProfiles)
      .set({ profilePhoto, updatedAt: new Date() })
      .where(eq(driverProfiles.userId, userId));
  }

  async updateDriverVerificationPhoto(userId: string, verificationPhoto: string, sessionId: string): Promise<void> {
    await db
      .update(driverProfiles)
      .set({ 
        verificationPhoto, 
        verificationSessionId: sessionId,
        verificationTimestamp: new Date(),
        verificationStatus: "pending_review",
        updatedAt: new Date() 
      })
      .where(eq(driverProfiles.userId, userId));
  }

  async updateDriverVerificationStatus(userId: string, status: "unverified" | "pending_review" | "verified" | "rejected"): Promise<void> {
    await db
      .update(driverProfiles)
      .set({ verificationStatus: status, updatedAt: new Date() })
      .where(eq(driverProfiles.userId, userId));
  }

  async updateRiderProfilePhoto(userId: string, profilePhoto: string): Promise<void> {
    await db
      .update(riderProfiles)
      .set({ profilePhoto })
      .where(eq(riderProfiles.userId, userId));
  }

  async updateRiderVerificationPhoto(userId: string, verificationPhoto: string, sessionId: string): Promise<void> {
    await db
      .update(riderProfiles)
      .set({ 
        verificationPhoto, 
        verificationSessionId: sessionId,
        verificationTimestamp: new Date(),
        verificationStatus: "pending_review"
      })
      .where(eq(riderProfiles.userId, userId));
  }

  async getDriversNeedingVerification(): Promise<DriverProfile[]> {
    return await db
      .select()
      .from(driverProfiles)
      .where(eq(driverProfiles.verificationStatus, "pending_review"));
  }

  async createRating(data: InsertRating): Promise<Rating> {
    const [rating] = await db.insert(ratings).values(data).returning();
    return rating;
  }

  async getRatingByTripAndRater(tripId: string, raterId: string): Promise<Rating | null> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(
        and(
          eq(ratings.tripId, tripId),
          eq(ratings.raterId, raterId)
        )
      );
    return rating || null;
  }

  async getTripRatings(tripId: string): Promise<Rating[]> {
    return await db
      .select()
      .from(ratings)
      .where(eq(ratings.tripId, tripId))
      .orderBy(desc(ratings.createdAt));
  }

  async getAllRatings(): Promise<any[]> {
    const allRatings = await db
      .select()
      .from(ratings)
      .orderBy(desc(ratings.createdAt));
    
    const ratingsWithDetails = await Promise.all(
      allRatings.map(async (rating) => {
        const [raterUser] = await db.select().from(users).where(eq(users.id, rating.raterId));
        const [targetUser] = await db.select().from(users).where(eq(users.id, rating.targetUserId));
        const [trip] = await db.select().from(trips).where(eq(trips.id, rating.tripId));
        
        return {
          ...rating,
          raterName: raterUser ? `${raterUser.firstName || ""} ${raterUser.lastName || ""}`.trim() || "Unknown" : "Unknown",
          targetName: targetUser ? `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() || "Unknown" : "Unknown",
          tripPickup: trip?.pickupLocation,
          tripDropoff: trip?.dropoffLocation,
        };
      })
    );
    
    return ratingsWithDetails;
  }

  async updateUserAverageRating(userId: string, role: "driver" | "rider"): Promise<void> {
    const userRatings = await db
      .select()
      .from(ratings)
      .where(eq(ratings.targetUserId, userId));
    
    if (userRatings.length === 0) return;
    
    const totalScore = userRatings.reduce((sum, r) => sum + r.score, 0);
    const averageRating = (totalScore / userRatings.length).toFixed(2);
    const totalRatings = userRatings.length;
    
    if (role === "driver") {
      await db
        .update(driverProfiles)
        .set({ averageRating, totalRatings })
        .where(eq(driverProfiles.userId, userId));
    } else {
      await db
        .update(riderProfiles)
        .set({ averageRating, totalRatings })
        .where(eq(riderProfiles.userId, userId));
    }
  }

  async createDispute(data: InsertDispute): Promise<Dispute> {
    const [dispute] = await db.insert(disputes).values(data).returning();
    return dispute;
  }

  async getDisputeByTripAndUser(tripId: string, userId: string): Promise<Dispute | null> {
    const [dispute] = await db
      .select()
      .from(disputes)
      .where(and(eq(disputes.tripId, tripId), eq(disputes.raisedById, userId)));
    return dispute || null;
  }

  async getDisputeById(disputeId: string): Promise<any | null> {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId));
    if (!dispute) return null;
    
    const [raisedByUser] = await db.select().from(users).where(eq(users.id, dispute.raisedById));
    const [againstUser] = await db.select().from(users).where(eq(users.id, dispute.againstUserId));
    const [trip] = await db.select().from(trips).where(eq(trips.id, dispute.tripId));
    
    return {
      ...dispute,
      raisedByName: raisedByUser ? `${raisedByUser.firstName || ""} ${raisedByUser.lastName || ""}`.trim() || "Unknown" : "Unknown",
      againstUserName: againstUser ? `${againstUser.firstName || ""} ${againstUser.lastName || ""}`.trim() || "Unknown" : "Unknown",
      tripPickup: trip?.pickupLocation,
      tripDropoff: trip?.dropoffLocation,
      tripStatus: trip?.status,
    };
  }

  async getAllDisputes(): Promise<any[]> {
    const allDisputes = await db.select().from(disputes).orderBy(desc(disputes.createdAt));
    
    const disputesWithDetails = await Promise.all(
      allDisputes.map(async (dispute) => {
        const [raisedByUser] = await db.select().from(users).where(eq(users.id, dispute.raisedById));
        const [againstUser] = await db.select().from(users).where(eq(users.id, dispute.againstUserId));
        const [trip] = await db.select().from(trips).where(eq(trips.id, dispute.tripId));
        
        return {
          ...dispute,
          raisedByName: raisedByUser ? `${raisedByUser.firstName || ""} ${raisedByUser.lastName || ""}`.trim() || "Unknown" : "Unknown",
          againstUserName: againstUser ? `${againstUser.firstName || ""} ${againstUser.lastName || ""}`.trim() || "Unknown" : "Unknown",
          tripPickup: trip?.pickupLocation,
          tripDropoff: trip?.dropoffLocation,
          tripStatus: trip?.status,
        };
      })
    );
    
    return disputesWithDetails;
  }

  async getFilteredDisputes(filter: { status?: string; category?: string; raisedByRole?: string }): Promise<any[]> {
    let query = db.select().from(disputes);
    const conditions = [];
    
    if (filter.status) {
      conditions.push(eq(disputes.status, filter.status as any));
    }
    if (filter.category) {
      conditions.push(eq(disputes.category, filter.category as any));
    }
    if (filter.raisedByRole) {
      conditions.push(eq(disputes.raisedByRole, filter.raisedByRole as any));
    }
    
    const filteredDisputes = conditions.length > 0
      ? await db.select().from(disputes).where(and(...conditions)).orderBy(desc(disputes.createdAt))
      : await db.select().from(disputes).orderBy(desc(disputes.createdAt));
    
    const disputesWithDetails = await Promise.all(
      filteredDisputes.map(async (dispute) => {
        const [raisedByUser] = await db.select().from(users).where(eq(users.id, dispute.raisedById));
        const [againstUser] = await db.select().from(users).where(eq(users.id, dispute.againstUserId));
        const [trip] = await db.select().from(trips).where(eq(trips.id, dispute.tripId));
        
        return {
          ...dispute,
          raisedByName: raisedByUser ? `${raisedByUser.firstName || ""} ${raisedByUser.lastName || ""}`.trim() || "Unknown" : "Unknown",
          againstUserName: againstUser ? `${againstUser.firstName || ""} ${againstUser.lastName || ""}`.trim() || "Unknown" : "Unknown",
          tripPickup: trip?.pickupLocation,
          tripDropoff: trip?.dropoffLocation,
          tripStatus: trip?.status,
        };
      })
    );
    
    return disputesWithDetails;
  }

  async updateDispute(disputeId: string, data: UpdateDispute): Promise<Dispute | null> {
    const updateData: any = { ...data };
    if (data.status === "resolved" || data.status === "rejected") {
      updateData.resolvedAt = new Date();
    }
    
    const [dispute] = await db
      .update(disputes)
      .set(updateData)
      .where(eq(disputes.id, disputeId))
      .returning();
    return dispute || null;
  }

  async getTripDisputes(tripId: string): Promise<Dispute[]> {
    return await db.select().from(disputes).where(eq(disputes.tripId, tripId));
  }

  async createRefund(data: InsertRefund): Promise<Refund> {
    const [refund] = await db.insert(refunds).values(data).returning();
    return refund;
  }

  async getRefundById(refundId: string): Promise<Refund | null> {
    const [refund] = await db.select().from(refunds).where(eq(refunds.id, refundId));
    return refund || null;
  }

  async getRefundsByTripId(tripId: string): Promise<Refund[]> {
    return await db.select().from(refunds).where(eq(refunds.tripId, tripId));
  }

  async getAllRefunds(): Promise<any[]> {
    const allRefunds = await db.select().from(refunds).orderBy(desc(refunds.createdAt));
    
    const refundsWithDetails = await Promise.all(
      allRefunds.map(async (refund) => {
        const [rider] = await db.select().from(users).where(eq(users.id, refund.riderId));
        const [driver] = refund.driverId 
          ? await db.select().from(users).where(eq(users.id, refund.driverId))
          : [null];
        const [trip] = await db.select().from(trips).where(eq(trips.id, refund.tripId));
        const [createdBy] = await db.select().from(users).where(eq(users.id, refund.createdByUserId));
        const [approvedBy] = refund.approvedByUserId 
          ? await db.select().from(users).where(eq(users.id, refund.approvedByUserId))
          : [null];
        const [processedBy] = refund.processedByUserId 
          ? await db.select().from(users).where(eq(users.id, refund.processedByUserId))
          : [null];
        
        return {
          ...refund,
          riderName: rider ? `${rider.firstName || ""} ${rider.lastName || ""}`.trim() || "Unknown" : "Unknown",
          driverName: driver ? `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || "N/A" : "N/A",
          tripPickup: trip?.pickupLocation,
          tripDropoff: trip?.dropoffLocation,
          tripStatus: trip?.status,
          createdByName: createdBy ? `${createdBy.firstName || ""} ${createdBy.lastName || ""}`.trim() || "Unknown" : "Unknown",
          approvedByName: approvedBy ? `${approvedBy.firstName || ""} ${approvedBy.lastName || ""}`.trim() : null,
          processedByName: processedBy ? `${processedBy.firstName || ""} ${processedBy.lastName || ""}`.trim() : null,
        };
      })
    );
    
    return refundsWithDetails;
  }

  async getFilteredRefunds(filter: { status?: string; tripId?: string }): Promise<any[]> {
    const conditions = [];
    
    if (filter.status) {
      conditions.push(eq(refunds.status, filter.status as any));
    }
    if (filter.tripId) {
      conditions.push(eq(refunds.tripId, filter.tripId));
    }
    
    const filteredRefunds = conditions.length > 0
      ? await db.select().from(refunds).where(and(...conditions)).orderBy(desc(refunds.createdAt))
      : await db.select().from(refunds).orderBy(desc(refunds.createdAt));
    
    const refundsWithDetails = await Promise.all(
      filteredRefunds.map(async (refund) => {
        const [rider] = await db.select().from(users).where(eq(users.id, refund.riderId));
        const [driver] = refund.driverId 
          ? await db.select().from(users).where(eq(users.id, refund.driverId))
          : [null];
        const [trip] = await db.select().from(trips).where(eq(trips.id, refund.tripId));
        const [createdBy] = await db.select().from(users).where(eq(users.id, refund.createdByUserId));
        const [approvedBy] = refund.approvedByUserId 
          ? await db.select().from(users).where(eq(users.id, refund.approvedByUserId))
          : [null];
        const [processedBy] = refund.processedByUserId 
          ? await db.select().from(users).where(eq(users.id, refund.processedByUserId))
          : [null];
        
        return {
          ...refund,
          riderName: rider ? `${rider.firstName || ""} ${rider.lastName || ""}`.trim() || "Unknown" : "Unknown",
          driverName: driver ? `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || "N/A" : "N/A",
          tripPickup: trip?.pickupLocation,
          tripDropoff: trip?.dropoffLocation,
          tripStatus: trip?.status,
          createdByName: createdBy ? `${createdBy.firstName || ""} ${createdBy.lastName || ""}`.trim() || "Unknown" : "Unknown",
          approvedByName: approvedBy ? `${approvedBy.firstName || ""} ${approvedBy.lastName || ""}`.trim() : null,
          processedByName: processedBy ? `${processedBy.firstName || ""} ${processedBy.lastName || ""}`.trim() : null,
        };
      })
    );
    
    return refundsWithDetails;
  }

  async updateRefund(refundId: string, data: Partial<UpdateRefund>): Promise<Refund | null> {
    const [refund] = await db
      .update(refunds)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(refunds.id, refundId))
      .returning();
    return refund || null;
  }

  async getRiderRefunds(riderId: string): Promise<Refund[]> {
    return await db.select().from(refunds).where(eq(refunds.riderId, riderId)).orderBy(desc(refunds.createdAt));
  }

  async getDriverRefunds(driverId: string): Promise<Refund[]> {
    return await db.select().from(refunds).where(eq(refunds.driverId, driverId)).orderBy(desc(refunds.createdAt));
  }

  async createWalletAdjustment(data: InsertWalletAdjustment): Promise<WalletAdjustment> {
    const [adjustment] = await db.insert(walletAdjustments).values(data).returning();
    return adjustment;
  }

  async getUserWalletAdjustments(userId: string): Promise<WalletAdjustment[]> {
    return await db.select().from(walletAdjustments).where(eq(walletAdjustments.userId, userId)).orderBy(desc(walletAdjustments.createdAt));
  }

  async getAllWalletAdjustments(): Promise<WalletAdjustment[]> {
    return await db.select().from(walletAdjustments).orderBy(desc(walletAdjustments.createdAt));
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  async getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.createdAt));
  }

  async getAllAuditLogs(): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
  }

  // Chargeback methods
  async createChargeback(data: InsertChargeback): Promise<Chargeback> {
    const [chargeback] = await db.insert(chargebacks).values(data).returning();
    return chargeback;
  }

  async getChargebackById(chargebackId: string): Promise<Chargeback | null> {
    const [chargeback] = await db.select().from(chargebacks).where(eq(chargebacks.id, chargebackId));
    return chargeback || null;
  }

  async getAllChargebacks(): Promise<any[]> {
    const allChargebacks = await db.select().from(chargebacks).orderBy(desc(chargebacks.createdAt));
    const chargebacksWithDetails = await Promise.all(
      allChargebacks.map(async (cb) => {
        const [trip] = await db.select().from(trips).where(eq(trips.id, cb.tripId));
        const [rider] = trip?.riderId 
          ? await db.select().from(users).where(eq(users.id, trip.riderId))
          : [null];
        const [driver] = trip?.driverId 
          ? await db.select().from(users).where(eq(users.id, trip.driverId))
          : [null];
        const [resolvedBy] = cb.resolvedByUserId 
          ? await db.select().from(users).where(eq(users.id, cb.resolvedByUserId))
          : [null];
        
        return {
          ...cb,
          tripPickup: trip?.pickupLocation,
          tripDropoff: trip?.dropoffLocation,
          tripFare: trip?.fareAmount,
          riderName: rider ? `${rider.firstName || ""} ${rider.lastName || ""}`.trim() || "Unknown" : "Unknown",
          driverName: driver ? `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || "N/A" : "N/A",
          resolvedByName: resolvedBy ? `${resolvedBy.firstName || ""} ${resolvedBy.lastName || ""}`.trim() : null,
        };
      })
    );
    return chargebacksWithDetails;
  }

  async getFilteredChargebacks(filter: { status?: string }): Promise<any[]> {
    const conditions = [];
    if (filter.status && filter.status !== "all") {
      conditions.push(eq(chargebacks.status, filter.status as any));
    }

    const allChargebacks = conditions.length > 0
      ? await db.select().from(chargebacks).where(and(...conditions)).orderBy(desc(chargebacks.createdAt))
      : await db.select().from(chargebacks).orderBy(desc(chargebacks.createdAt));

    const chargebacksWithDetails = await Promise.all(
      allChargebacks.map(async (cb) => {
        const [trip] = await db.select().from(trips).where(eq(trips.id, cb.tripId));
        const [rider] = trip?.riderId 
          ? await db.select().from(users).where(eq(users.id, trip.riderId))
          : [null];
        const [driver] = trip?.driverId 
          ? await db.select().from(users).where(eq(users.id, trip.driverId))
          : [null];
        const [resolvedBy] = cb.resolvedByUserId 
          ? await db.select().from(users).where(eq(users.id, cb.resolvedByUserId))
          : [null];
        
        return {
          ...cb,
          tripPickup: trip?.pickupLocation,
          tripDropoff: trip?.dropoffLocation,
          tripFare: trip?.fareAmount,
          riderName: rider ? `${rider.firstName || ""} ${rider.lastName || ""}`.trim() || "Unknown" : "Unknown",
          driverName: driver ? `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || "N/A" : "N/A",
          resolvedByName: resolvedBy ? `${resolvedBy.firstName || ""} ${resolvedBy.lastName || ""}`.trim() : null,
        };
      })
    );
    return chargebacksWithDetails;
  }

  async updateChargeback(chargebackId: string, data: UpdateChargeback, resolvedByUserId?: string): Promise<Chargeback | null> {
    const updateData: any = { ...data };
    if (resolvedByUserId) {
      updateData.resolvedByUserId = resolvedByUserId;
      updateData.resolvedAt = new Date();
    }
    const [chargeback] = await db
      .update(chargebacks)
      .set(updateData)
      .where(eq(chargebacks.id, chargebackId))
      .returning();
    return chargeback || null;
  }

  async getChargebacksByTripId(tripId: string): Promise<Chargeback[]> {
    return await db.select().from(chargebacks).where(eq(chargebacks.tripId, tripId)).orderBy(desc(chargebacks.createdAt));
  }

  // Payment Reconciliation methods
  async createPaymentReconciliation(data: InsertPaymentReconciliation): Promise<PaymentReconciliation> {
    const [reconciliation] = await db.insert(paymentReconciliations).values(data).returning();
    return reconciliation;
  }

  async getAllReconciliations(): Promise<any[]> {
    const allReconciliations = await db.select().from(paymentReconciliations).orderBy(desc(paymentReconciliations.createdAt));
    const reconciliationsWithDetails = await Promise.all(
      allReconciliations.map(async (rec) => {
        const [trip] = await db.select().from(trips).where(eq(trips.id, rec.tripId));
        const [reconciledBy] = rec.reconciledByUserId 
          ? await db.select().from(users).where(eq(users.id, rec.reconciledByUserId))
          : [null];
        
        return {
          ...rec,
          tripPickup: trip?.pickupLocation,
          tripDropoff: trip?.dropoffLocation,
          reconciledByName: reconciledBy ? `${reconciledBy.firstName || ""} ${reconciledBy.lastName || ""}`.trim() : null,
        };
      })
    );
    return reconciliationsWithDetails;
  }

  async getFilteredReconciliations(filter: { status?: string }): Promise<any[]> {
    const conditions = [];
    if (filter.status && filter.status !== "all") {
      conditions.push(eq(paymentReconciliations.status, filter.status as any));
    }

    const allReconciliations = conditions.length > 0
      ? await db.select().from(paymentReconciliations).where(and(...conditions)).orderBy(desc(paymentReconciliations.createdAt))
      : await db.select().from(paymentReconciliations).orderBy(desc(paymentReconciliations.createdAt));

    const reconciliationsWithDetails = await Promise.all(
      allReconciliations.map(async (rec) => {
        const [trip] = await db.select().from(trips).where(eq(trips.id, rec.tripId));
        const [reconciledBy] = rec.reconciledByUserId 
          ? await db.select().from(users).where(eq(users.id, rec.reconciledByUserId))
          : [null];
        
        return {
          ...rec,
          tripPickup: trip?.pickupLocation,
          tripDropoff: trip?.dropoffLocation,
          reconciledByName: reconciledBy ? `${reconciledBy.firstName || ""} ${reconciledBy.lastName || ""}`.trim() : null,
        };
      })
    );
    return reconciliationsWithDetails;
  }

  async updateReconciliation(reconciliationId: string, status: string, reconciledByUserId: string, notes?: string): Promise<PaymentReconciliation | null> {
    const [reconciliation] = await db
      .update(paymentReconciliations)
      .set({ status: status as any, reconciledByUserId, notes })
      .where(eq(paymentReconciliations.id, reconciliationId))
      .returning();
    return reconciliation || null;
  }

  async runReconciliation(tripId: string, actualAmount: string, provider: string): Promise<PaymentReconciliation> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new Error("Trip not found");
    
    const expectedAmount = trip.fareAmount || "0";
    const expected = parseFloat(expectedAmount);
    const actual = parseFloat(actualAmount);
    const variance = (actual - expected).toFixed(2);
    const status = variance === "0.00" ? "matched" : "manual_review";

    const [reconciliation] = await db.insert(paymentReconciliations).values({
      tripId,
      expectedAmount,
      actualAmount,
      variance,
      provider: provider as any,
      status: status as any,
    }).returning();
    return reconciliation;
  }

  // Phase 11 - Wallet methods
  async getOrCreateWallet(userId: string, role: "driver" | "ziba"): Promise<Wallet> {
    const [existingWallet] = await db.select().from(wallets)
      .where(and(eq(wallets.userId, userId), eq(wallets.role, role)));
    if (existingWallet) return existingWallet;

    const [newWallet] = await db.insert(wallets).values({
      userId,
      role,
    }).returning();
    return newWallet;
  }

  async getWalletById(walletId: string): Promise<Wallet | null> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, walletId));
    return wallet || null;
  }

  async getWalletByUserId(userId: string): Promise<Wallet | null> {
    const [wallet] = await db.select().from(wallets)
      .where(and(eq(wallets.userId, userId), eq(wallets.role, "driver")));
    return wallet || null;
  }

  async getZibaWallet(): Promise<Wallet> {
    const ZIBA_SYSTEM_USER_ID = "ziba-system";
    return this.getOrCreateWallet(ZIBA_SYSTEM_USER_ID, "ziba");
  }

  async getAllDriverWallets(): Promise<any[]> {
    const allWallets = await db.select().from(wallets)
      .where(eq(wallets.role, "driver"))
      .orderBy(desc(wallets.updatedAt));

    const walletsWithDetails = await Promise.all(
      allWallets.map(async (wallet) => {
        const [driverProfile] = await db.select().from(driverProfiles)
          .where(eq(driverProfiles.userId, wallet.userId));
        const [user] = await db.select().from(users).where(eq(users.id, wallet.userId));
        
        const pendingPayouts = await db.select({ total: sum(walletPayouts.amount) })
          .from(walletPayouts)
          .where(and(
            eq(walletPayouts.walletId, wallet.id),
            or(eq(walletPayouts.status, "pending"), eq(walletPayouts.status, "processing"))
          ));
        
        return {
          ...wallet,
          ownerName: driverProfile?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
          pendingPayoutAmount: pendingPayouts[0]?.total || "0.00",
        };
      })
    );
    return walletsWithDetails;
  }

  async creditWallet(walletId: string, amount: string, source: string, referenceId?: string, createdByUserId?: string, description?: string): Promise<WalletTransaction> {
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) throw new Error("Credit amount must be positive");

    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, walletId));
    if (!wallet) throw new Error("Wallet not found");

    const newBalance = (parseFloat(wallet.balance) + amountNum).toFixed(2);
    await db.update(wallets)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(wallets.id, walletId));

    const [transaction] = await db.insert(walletTransactions).values({
      walletId,
      type: "credit",
      amount,
      source: source as any,
      referenceId,
      createdByUserId,
      description,
    }).returning();
    return transaction;
  }

  async debitWallet(walletId: string, amount: string, source: string, referenceId?: string, createdByUserId?: string, description?: string): Promise<WalletTransaction | null> {
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) throw new Error("Debit amount must be positive");

    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, walletId));
    if (!wallet) throw new Error("Wallet not found");

    const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);
    if (amountNum > availableBalance) {
      return null;
    }

    const newBalance = (parseFloat(wallet.balance) - amountNum).toFixed(2);
    await db.update(wallets)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(wallets.id, walletId));

    const [transaction] = await db.insert(walletTransactions).values({
      walletId,
      type: "debit",
      amount,
      source: source as any,
      referenceId,
      createdByUserId,
      description,
    }).returning();
    return transaction;
  }

  async holdWalletBalance(walletId: string, amount: string): Promise<boolean> {
    const amountNum = parseFloat(amount);
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, walletId));
    if (!wallet) return false;

    const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);
    if (amountNum > availableBalance) return false;

    const newLockedBalance = (parseFloat(wallet.lockedBalance) + amountNum).toFixed(2);
    await db.update(wallets)
      .set({ lockedBalance: newLockedBalance, updatedAt: new Date() })
      .where(eq(wallets.id, walletId));

    await db.insert(walletTransactions).values({
      walletId,
      type: "hold",
      amount,
      source: "payout",
      description: "Balance held for payout",
    });

    return true;
  }

  async releaseWalletBalance(walletId: string, amount: string): Promise<boolean> {
    const amountNum = parseFloat(amount);
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, walletId));
    if (!wallet) return false;

    const currentLocked = parseFloat(wallet.lockedBalance);
    if (amountNum > currentLocked) return false;

    const newLockedBalance = (currentLocked - amountNum).toFixed(2);
    await db.update(wallets)
      .set({ lockedBalance: newLockedBalance, updatedAt: new Date() })
      .where(eq(wallets.id, walletId));

    await db.insert(walletTransactions).values({
      walletId,
      type: "release",
      amount,
      source: "payout",
      description: "Balance released from hold",
    });

    return true;
  }

  async getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
    const transactions = await db.select().from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletId))
      .orderBy(desc(walletTransactions.createdAt));
    return transactions;
  }

  // Phase 11 - Payout methods
  async createWalletPayout(data: InsertWalletPayout): Promise<WalletPayout> {
    const [payout] = await db.insert(walletPayouts).values(data).returning();
    return payout;
  }

  async getWalletPayoutById(payoutId: string): Promise<WalletPayout | null> {
    const [payout] = await db.select().from(walletPayouts).where(eq(walletPayouts.id, payoutId));
    return payout || null;
  }

  async getWalletPayoutsByWalletId(walletId: string): Promise<WalletPayout[]> {
    const payouts = await db.select().from(walletPayouts)
      .where(eq(walletPayouts.walletId, walletId))
      .orderBy(desc(walletPayouts.createdAt));
    return payouts;
  }

  async getDriverPayoutHistory(userId: string): Promise<any[]> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) return [];

    const payouts = await db.select().from(walletPayouts)
      .where(eq(walletPayouts.walletId, wallet.id))
      .orderBy(desc(walletPayouts.createdAt));

    const payoutsWithDetails = await Promise.all(
      payouts.map(async (payout) => {
        const [initiatedBy] = await db.select().from(users).where(eq(users.id, payout.initiatedByUserId));
        const [processedBy] = payout.processedByUserId 
          ? await db.select().from(users).where(eq(users.id, payout.processedByUserId))
          : [null];
        
        return {
          ...payout,
          initiatedByName: initiatedBy ? `${initiatedBy.firstName || ""} ${initiatedBy.lastName || ""}`.trim() : null,
          processedByName: processedBy ? `${processedBy.firstName || ""} ${processedBy.lastName || ""}`.trim() : null,
        };
      })
    );
    return payoutsWithDetails;
  }

  async getAllWalletPayouts(): Promise<any[]> {
    const allPayouts = await db.select().from(walletPayouts).orderBy(desc(walletPayouts.createdAt));

    const payoutsWithDetails = await Promise.all(
      allPayouts.map(async (payout) => {
        const [wallet] = await db.select().from(wallets).where(eq(wallets.id, payout.walletId));
        const [driverProfile] = wallet 
          ? await db.select().from(driverProfiles).where(eq(driverProfiles.userId, wallet.userId))
          : [null];
        const [initiatedBy] = await db.select().from(users).where(eq(users.id, payout.initiatedByUserId));
        const [processedBy] = payout.processedByUserId 
          ? await db.select().from(users).where(eq(users.id, payout.processedByUserId))
          : [null];

        return {
          ...payout,
          driverName: driverProfile?.fullName || null,
          driverUserId: wallet?.userId,
          initiatedByName: initiatedBy ? `${initiatedBy.firstName || ""} ${initiatedBy.lastName || ""}`.trim() : null,
          processedByName: processedBy ? `${processedBy.firstName || ""} ${processedBy.lastName || ""}`.trim() : null,
        };
      })
    );
    return payoutsWithDetails;
  }

  async getFilteredWalletPayouts(filter: { status?: string }): Promise<any[]> {
    const conditions = [];
    if (filter.status && filter.status !== "all") {
      conditions.push(eq(walletPayouts.status, filter.status as any));
    }

    const allPayouts = conditions.length > 0
      ? await db.select().from(walletPayouts).where(and(...conditions)).orderBy(desc(walletPayouts.createdAt))
      : await db.select().from(walletPayouts).orderBy(desc(walletPayouts.createdAt));

    const payoutsWithDetails = await Promise.all(
      allPayouts.map(async (payout) => {
        const [wallet] = await db.select().from(wallets).where(eq(wallets.id, payout.walletId));
        const [driverProfile] = wallet 
          ? await db.select().from(driverProfiles).where(eq(driverProfiles.userId, wallet.userId))
          : [null];
        const [initiatedBy] = await db.select().from(users).where(eq(users.id, payout.initiatedByUserId));
        const [processedBy] = payout.processedByUserId 
          ? await db.select().from(users).where(eq(users.id, payout.processedByUserId))
          : [null];

        return {
          ...payout,
          driverName: driverProfile?.fullName || null,
          driverUserId: wallet?.userId,
          initiatedByName: initiatedBy ? `${initiatedBy.firstName || ""} ${initiatedBy.lastName || ""}`.trim() : null,
          processedByName: processedBy ? `${processedBy.firstName || ""} ${processedBy.lastName || ""}`.trim() : null,
        };
      })
    );
    return payoutsWithDetails;
  }

  async processWalletPayout(payoutId: string, processedByUserId: string): Promise<WalletPayout | null> {
    const [payout] = await db.select().from(walletPayouts).where(eq(walletPayouts.id, payoutId));
    if (!payout || payout.status !== "processing") return null;

    const wallet = await this.getWalletById(payout.walletId);
    if (!wallet) return null;

    const debitTx = await this.debitWallet(
      payout.walletId,
      payout.amount,
      "payout",
      payoutId,
      processedByUserId,
      `Payout processed`
    );

    if (!debitTx) return null;

    await this.releaseWalletBalance(payout.walletId, payout.amount);

    const [updatedPayout] = await db.update(walletPayouts)
      .set({ 
        status: "paid", 
        processedByUserId, 
        processedAt: new Date() 
      })
      .where(eq(walletPayouts.id, payoutId))
      .returning();

    return updatedPayout || null;
  }

  async reverseWalletPayout(payoutId: string, failureReason: string): Promise<WalletPayout | null> {
    const [payout] = await db.select().from(walletPayouts).where(eq(walletPayouts.id, payoutId));
    if (!payout) return null;

    if (payout.status === "processing" || payout.status === "pending") {
      await this.releaseWalletBalance(payout.walletId, payout.amount);
    }

    if (payout.status === "paid") {
      await this.creditWallet(
        payout.walletId,
        payout.amount,
        "payout",
        payoutId,
        undefined,
        `Payout reversed: ${failureReason}`
      );
    }

    const [updatedPayout] = await db.update(walletPayouts)
      .set({ 
        status: payout.status === "paid" ? "reversed" : "failed", 
        failureReason 
      })
      .where(eq(walletPayouts.id, payoutId))
      .returning();

    return updatedPayout || null;
  }

  // Phase 12 - Analytics Implementation
  async getAnalyticsOverview(startDate?: Date, endDate?: Date) {
    const dateConditions = [];
    if (startDate) dateConditions.push(gte(trips.createdAt, startDate));
    if (endDate) dateConditions.push(lte(trips.createdAt, endDate));

    // Trips analytics
    const tripResults = await db.select({
      total: count(),
      completed: sql<number>`count(*) filter (where ${trips.status} = 'completed')`,
      cancelled: sql<number>`count(*) filter (where ${trips.status} = 'cancelled')`
    }).from(trips).where(dateConditions.length > 0 ? and(...dateConditions) : undefined);

    const tripStats = tripResults[0] || { total: 0, completed: 0, cancelled: 0 };

    // Revenue analytics from completed trips
    const revenueResults = await db.select({
      grossFares: sql<string>`coalesce(sum(cast(${trips.fareAmount} as decimal)), 0)`,
      commission: sql<string>`coalesce(sum(cast(${trips.commissionAmount} as decimal)), 0)`,
      driverEarnings: sql<string>`coalesce(sum(cast(${trips.driverPayout} as decimal)), 0)`
    }).from(trips).where(and(
      eq(trips.status, "completed"),
      ...(dateConditions.length > 0 ? dateConditions : [])
    ));

    const revenue = revenueResults[0] || { grossFares: "0", commission: "0", driverEarnings: "0" };
    const netRevenue = revenue.commission;

    // Refunds analytics
    const refundDateConditions = [];
    if (startDate) refundDateConditions.push(gte(refunds.createdAt, startDate));
    if (endDate) refundDateConditions.push(lte(refunds.createdAt, endDate));

    const refundResults = await db.select({
      total: count(),
      totalAmount: sql<string>`coalesce(sum(cast(${refunds.amount} as decimal)), 0)`
    }).from(refunds).where(refundDateConditions.length > 0 ? and(...refundDateConditions) : undefined);

    const refundStats = refundResults[0] || { total: 0, totalAmount: "0" };

    // Chargebacks analytics
    const chargebackDateConditions = [];
    if (startDate) chargebackDateConditions.push(gte(chargebacks.createdAt, startDate));
    if (endDate) chargebackDateConditions.push(lte(chargebacks.createdAt, endDate));

    const chargebackResults = await db.select({
      total: count(),
      won: sql<number>`count(*) filter (where ${chargebacks.status} = 'won')`,
      lost: sql<number>`count(*) filter (where ${chargebacks.status} = 'lost')`,
      pending: sql<number>`count(*) filter (where ${chargebacks.status} in ('reported', 'under_review'))`
    }).from(chargebacks).where(chargebackDateConditions.length > 0 ? and(...chargebackDateConditions) : undefined);

    const chargebackStats = chargebackResults[0] || { total: 0, won: 0, lost: 0, pending: 0 };

    // Wallet balances (driver wallets only, exclude ZIBA platform wallet)
    const walletResults = await db.select({
      totalBalance: sql<string>`coalesce(sum(cast(${wallets.balance} as decimal)), 0)`,
      lockedBalance: sql<string>`coalesce(sum(cast(${wallets.lockedBalance} as decimal)), 0)`
    }).from(wallets).where(sql`${wallets.userId} != 'ziba-platform'`);

    const walletStats = walletResults[0] || { totalBalance: "0", lockedBalance: "0" };
    const availableBalance = (parseFloat(walletStats.totalBalance) - parseFloat(walletStats.lockedBalance)).toFixed(2);

    // Payout analytics
    const payoutDateConditions = [];
    if (startDate) payoutDateConditions.push(gte(walletPayouts.createdAt, startDate));
    if (endDate) payoutDateConditions.push(lte(walletPayouts.createdAt, endDate));

    const payoutResults = await db.select({
      processed: sql<number>`count(*) filter (where ${walletPayouts.status} = 'paid')`,
      pending: sql<number>`count(*) filter (where ${walletPayouts.status} in ('pending', 'processing'))`,
      failed: sql<number>`count(*) filter (where ${walletPayouts.status} = 'failed')`,
      totalProcessed: sql<string>`coalesce(sum(cast(${walletPayouts.amount} as decimal)) filter (where ${walletPayouts.status} = 'paid'), 0)`
    }).from(walletPayouts).where(payoutDateConditions.length > 0 ? and(...payoutDateConditions) : undefined);

    const payoutStats = payoutResults[0] || { processed: 0, pending: 0, failed: 0, totalProcessed: "0" };

    return {
      trips: { total: Number(tripStats.total), completed: Number(tripStats.completed), cancelled: Number(tripStats.cancelled) },
      revenue: { 
        grossFares: parseFloat(revenue.grossFares as string).toFixed(2), 
        commission: parseFloat(revenue.commission as string).toFixed(2), 
        driverEarnings: parseFloat(revenue.driverEarnings as string).toFixed(2),
        netRevenue: parseFloat(netRevenue as string).toFixed(2)
      },
      refunds: { total: Number(refundStats.total), totalAmount: parseFloat(refundStats.totalAmount as string).toFixed(2) },
      chargebacks: { 
        total: Number(chargebackStats.total), 
        won: Number(chargebackStats.won), 
        lost: Number(chargebackStats.lost), 
        pending: Number(chargebackStats.pending) 
      },
      wallets: { totalBalance: walletStats.totalBalance, lockedBalance: walletStats.lockedBalance, availableBalance },
      payouts: { 
        processed: Number(payoutStats.processed), 
        pending: Number(payoutStats.pending), 
        failed: Number(payoutStats.failed), 
        totalProcessed: parseFloat(payoutStats.totalProcessed as string).toFixed(2) 
      }
    };
  }

  async getTripsAnalytics(startDate?: Date, endDate?: Date) {
    const dateConditions = [];
    if (startDate) dateConditions.push(gte(trips.createdAt, startDate));
    if (endDate) dateConditions.push(lte(trips.createdAt, endDate));

    const results = await db.select({
      date: sql<string>`date(${trips.createdAt})`,
      total: count(),
      completed: sql<number>`count(*) filter (where ${trips.status} = 'completed')`,
      cancelled: sql<number>`count(*) filter (where ${trips.status} = 'cancelled')`,
      revenue: sql<string>`coalesce(sum(cast(${trips.fareAmount} as decimal)) filter (where ${trips.status} = 'completed'), 0)`
    })
    .from(trips)
    .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
    .groupBy(sql`date(${trips.createdAt})`)
    .orderBy(sql`date(${trips.createdAt})`);

    return results;
  }

  async getRevenueAnalytics(startDate?: Date, endDate?: Date) {
    const dateConditions = [eq(trips.status, "completed")];
    if (startDate) dateConditions.push(gte(trips.createdAt, startDate));
    if (endDate) dateConditions.push(lte(trips.createdAt, endDate));

    const results = await db.select({
      date: sql<string>`date(${trips.createdAt})`,
      grossFares: sql<string>`coalesce(sum(cast(${trips.fareAmount} as decimal)), 0)`,
      commission: sql<string>`coalesce(sum(cast(${trips.commissionAmount} as decimal)), 0)`,
      driverEarnings: sql<string>`coalesce(sum(cast(${trips.driverPayout} as decimal)), 0)`
    })
    .from(trips)
    .where(and(...dateConditions))
    .groupBy(sql`date(${trips.createdAt})`)
    .orderBy(sql`date(${trips.createdAt})`);

    return results;
  }

  async getRefundsAnalytics(startDate?: Date, endDate?: Date) {
    const dateConditions = [];
    if (startDate) dateConditions.push(gte(refunds.createdAt, startDate));
    if (endDate) dateConditions.push(lte(refunds.createdAt, endDate));

    const results = await db.select({
      date: sql<string>`date(${refunds.createdAt})`,
      count: count(),
      totalAmount: sql<string>`coalesce(sum(cast(${refunds.amount} as decimal)), 0)`,
      approved: sql<number>`count(*) filter (where ${refunds.status} = 'approved')`,
      rejected: sql<number>`count(*) filter (where ${refunds.status} = 'rejected')`,
      processed: sql<number>`count(*) filter (where ${refunds.status} = 'processed')`
    })
    .from(refunds)
    .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
    .groupBy(sql`date(${refunds.createdAt})`)
    .orderBy(sql`date(${refunds.createdAt})`);

    return results;
  }

  async getPayoutsAnalytics(startDate?: Date, endDate?: Date) {
    const dateConditions = [];
    if (startDate) dateConditions.push(gte(walletPayouts.createdAt, startDate));
    if (endDate) dateConditions.push(lte(walletPayouts.createdAt, endDate));

    const results = await db.select({
      date: sql<string>`date(${walletPayouts.createdAt})`,
      count: count(),
      totalAmount: sql<string>`coalesce(sum(cast(${walletPayouts.amount} as decimal)), 0)`,
      paid: sql<number>`count(*) filter (where ${walletPayouts.status} = 'paid')`,
      pending: sql<number>`count(*) filter (where ${walletPayouts.status} in ('pending', 'processing'))`,
      failed: sql<number>`count(*) filter (where ${walletPayouts.status} = 'failed')`
    })
    .from(walletPayouts)
    .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
    .groupBy(sql`date(${walletPayouts.createdAt})`)
    .orderBy(sql`date(${walletPayouts.createdAt})`);

    return results;
  }

  async getReconciliationAnalytics(startDate?: Date, endDate?: Date) {
    const dateConditions = [];
    if (startDate) dateConditions.push(gte(paymentReconciliations.createdAt, startDate));
    if (endDate) dateConditions.push(lte(paymentReconciliations.createdAt, endDate));

    const results = await db.select({
      matched: sql<number>`count(*) filter (where ${paymentReconciliations.status} = 'matched')`,
      mismatched: sql<number>`count(*) filter (where ${paymentReconciliations.status} = 'mismatched')`,
      manualReview: sql<number>`count(*) filter (where ${paymentReconciliations.status} = 'manual_review')`
    })
    .from(paymentReconciliations)
    .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);

    const stats = results[0] || { matched: 0, mismatched: 0, manualReview: 0 };
    return { matched: Number(stats.matched), mismatched: Number(stats.mismatched), manualReview: Number(stats.manualReview) };
  }

  // Phase 13 - Fraud Detection
  async getRiskProfile(userId: string): Promise<RiskProfile | null> {
    const [profile] = await db.select().from(riskProfiles).where(eq(riskProfiles.userId, userId));
    return profile || null;
  }

  async getOrCreateRiskProfile(userId: string, role: "rider" | "driver"): Promise<RiskProfile> {
    let profile = await this.getRiskProfile(userId);
    if (!profile) {
      const [newProfile] = await db.insert(riskProfiles).values({ userId, role }).returning();
      profile = newProfile;
    }
    return profile;
  }

  async updateRiskProfile(userId: string, score: number, level: "low" | "medium" | "high" | "critical"): Promise<RiskProfile | null> {
    const [updated] = await db
      .update(riskProfiles)
      .set({ score, level, lastEvaluatedAt: new Date(), updatedAt: new Date() })
      .where(eq(riskProfiles.userId, userId))
      .returning();
    return updated || null;
  }

  async getAllRiskProfiles(): Promise<any[]> {
    const allProfiles = await db.select().from(riskProfiles).orderBy(desc(riskProfiles.score));
    const profilesWithDetails = await Promise.all(
      allProfiles.map(async (profile) => {
        const [user] = await db.select().from(users).where(eq(users.id, profile.userId));
        let userName = "Unknown";
        if (profile.role === "driver") {
          const [dp] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, profile.userId));
          userName = dp?.fullName || "Unknown Driver";
        } else {
          const [rp] = await db.select().from(riderProfiles).where(eq(riderProfiles.userId, profile.userId));
          userName = rp?.fullName || user?.email || "Unknown Rider";
        }
        return { ...profile, userName, email: user?.email };
      })
    );
    return profilesWithDetails;
  }

  async getRiskProfilesByLevel(level: string): Promise<any[]> {
    const allProfiles = await db.select().from(riskProfiles).where(eq(riskProfiles.level, level as any)).orderBy(desc(riskProfiles.score));
    const profilesWithDetails = await Promise.all(
      allProfiles.map(async (profile) => {
        const [user] = await db.select().from(users).where(eq(users.id, profile.userId));
        let userName = "Unknown";
        if (profile.role === "driver") {
          const [dp] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, profile.userId));
          userName = dp?.fullName || "Unknown Driver";
        } else {
          const [rp] = await db.select().from(riderProfiles).where(eq(riderProfiles.userId, profile.userId));
          userName = rp?.fullName || user?.email || "Unknown Rider";
        }
        return { ...profile, userName, email: user?.email };
      })
    );
    return profilesWithDetails;
  }

  async getFraudOverview() {
    const [profileStats] = await db.select({
      total: count(),
      low: sql<number>`count(*) filter (where ${riskProfiles.level} = 'low')`,
      medium: sql<number>`count(*) filter (where ${riskProfiles.level} = 'medium')`,
      high: sql<number>`count(*) filter (where ${riskProfiles.level} = 'high')`,
      critical: sql<number>`count(*) filter (where ${riskProfiles.level} = 'critical')`
    }).from(riskProfiles);

    const [eventStats] = await db.select({
      total: count(),
      unresolved: sql<number>`count(*) filter (where ${fraudEvents.resolvedAt} is null)`,
      resolved: sql<number>`count(*) filter (where ${fraudEvents.resolvedAt} is not null)`
    }).from(fraudEvents);

    return {
      riskProfiles: {
        total: profileStats?.total || 0,
        low: Number(profileStats?.low || 0),
        medium: Number(profileStats?.medium || 0),
        high: Number(profileStats?.high || 0),
        critical: Number(profileStats?.critical || 0)
      },
      fraudEvents: {
        total: eventStats?.total || 0,
        unresolved: Number(eventStats?.unresolved || 0),
        resolved: Number(eventStats?.resolved || 0)
      }
    };
  }

  async createFraudEvent(data: InsertFraudEvent): Promise<FraudEvent> {
    const [event] = await db.insert(fraudEvents).values(data).returning();
    return event;
  }

  async getFraudEventById(eventId: string): Promise<FraudEvent | null> {
    const [event] = await db.select().from(fraudEvents).where(eq(fraudEvents.id, eventId));
    return event || null;
  }

  async getAllFraudEvents(): Promise<any[]> {
    const allEvents = await db.select().from(fraudEvents).orderBy(desc(fraudEvents.detectedAt));
    const eventsWithDetails = await Promise.all(
      allEvents.map(async (event) => {
        let entityName = "Unknown";
        let resolvedByName;
        if (event.entityType === "user") {
          const [user] = await db.select().from(users).where(eq(users.id, event.entityId));
          const [dp] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, event.entityId));
          const [rp] = await db.select().from(riderProfiles).where(eq(riderProfiles.userId, event.entityId));
          entityName = dp?.fullName || rp?.fullName || user?.email || "Unknown User";
        } else if (event.entityType === "trip") {
          const [trip] = await db.select().from(trips).where(eq(trips.id, event.entityId));
          entityName = trip ? `Trip: ${trip.pickupLocation} → ${trip.dropoffLocation}` : "Unknown Trip";
        }
        if (event.resolvedByUserId) {
          const [resolver] = await db.select().from(users).where(eq(users.id, event.resolvedByUserId));
          resolvedByName = resolver?.email;
        }
        return { ...event, entityName, resolvedByName };
      })
    );
    return eventsWithDetails;
  }

  async getUnresolvedFraudEvents(): Promise<any[]> {
    const events = await this.getAllFraudEvents();
    return events.filter(e => !e.resolvedAt);
  }

  async getFraudEventsByEntityId(entityId: string): Promise<FraudEvent[]> {
    return await db.select().from(fraudEvents).where(eq(fraudEvents.entityId, entityId)).orderBy(desc(fraudEvents.detectedAt));
  }

  async getFraudEventsBySeverity(severity: string): Promise<any[]> {
    const allEvents = await db.select().from(fraudEvents).where(eq(fraudEvents.severity, severity as any)).orderBy(desc(fraudEvents.detectedAt));
    const eventsWithDetails = await Promise.all(
      allEvents.map(async (event) => {
        let entityName = "Unknown";
        if (event.entityType === "user") {
          const [user] = await db.select().from(users).where(eq(users.id, event.entityId));
          const [dp] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, event.entityId));
          const [rp] = await db.select().from(riderProfiles).where(eq(riderProfiles.userId, event.entityId));
          entityName = dp?.fullName || rp?.fullName || user?.email || "Unknown User";
        } else if (event.entityType === "trip") {
          const [trip] = await db.select().from(trips).where(eq(trips.id, event.entityId));
          entityName = trip ? `Trip: ${trip.pickupLocation}` : "Unknown Trip";
        }
        return { ...event, entityName };
      })
    );
    return eventsWithDetails;
  }

  async resolveFraudEvent(eventId: string, resolvedByUserId: string): Promise<FraudEvent | null> {
    const [updated] = await db
      .update(fraudEvents)
      .set({ resolvedAt: new Date(), resolvedByUserId })
      .where(eq(fraudEvents.id, eventId))
      .returning();
    return updated || null;
  }

  async getUserFraudSignals(userId: string, role: "rider" | "driver") {
    const refundResult = await db.select({ count: count() }).from(refunds)
      .where(role === "rider" ? eq(refunds.riderId, userId) : eq(refunds.driverId, userId));
    const refundCount = refundResult[0]?.count || 0;

    const chargebackResult = await db.select({ count: count() }).from(chargebacks)
      .innerJoin(trips, eq(chargebacks.tripId, trips.id))
      .where(role === "rider" ? eq(trips.riderId, userId) : eq(trips.driverId, userId));
    const chargebackCount = chargebackResult[0]?.count || 0;

    const disputeResult = await db.select({ count: count() }).from(disputes)
      .where(or(eq(disputes.raisedById, userId), eq(disputes.againstUserId, userId)));
    const disputeCount = disputeResult[0]?.count || 0;

    const tripResult = await db.select({ count: count() }).from(trips)
      .where(role === "rider" ? eq(trips.riderId, userId) : eq(trips.driverId, userId));
    const tripCount = tripResult[0]?.count || 0;

    const cancelledResult = await db.select({ count: count() }).from(trips)
      .where(and(
        role === "rider" ? eq(trips.riderId, userId) : eq(trips.driverId, userId),
        eq(trips.status, "cancelled")
      ));
    const cancelledCount = cancelledResult[0]?.count || 0;

    let reversedPayoutCount = 0;
    if (role === "driver") {
      const wallet = await this.getWalletByUserId(userId);
      if (wallet) {
        const reversedResult = await db.select({ count: count() }).from(walletPayouts)
          .where(and(eq(walletPayouts.walletId, wallet.id), eq(walletPayouts.status, "reversed")));
        reversedPayoutCount = reversedResult[0]?.count || 0;
      }
    }

    return { refundCount, chargebackCount, disputeCount, tripCount, cancelledCount, reversedPayoutCount };
  }

  // Phase 14 - Incentive Programs
  async createIncentiveProgram(data: InsertIncentiveProgram): Promise<IncentiveProgram> {
    const [program] = await db.insert(incentivePrograms).values(data).returning();
    return program;
  }

  async getIncentiveProgramById(programId: string): Promise<IncentiveProgram | null> {
    const [program] = await db.select().from(incentivePrograms).where(eq(incentivePrograms.id, programId));
    return program || null;
  }

  async getAllIncentivePrograms(): Promise<any[]> {
    const allPrograms = await db.select().from(incentivePrograms).orderBy(desc(incentivePrograms.createdAt));
    const programsWithDetails = await Promise.all(
      allPrograms.map(async (program) => {
        const [creator] = await db.select().from(users).where(eq(users.id, program.createdByUserId));
        const [earnings] = await db.select({
          count: count(),
          totalPaid: sum(incentiveEarnings.amount)
        }).from(incentiveEarnings)
          .where(and(eq(incentiveEarnings.programId, program.id), eq(incentiveEarnings.status, "paid")));
        return {
          ...program,
          createdByName: creator?.email || "Unknown",
          earnersCount: earnings?.count || 0,
          totalPaid: earnings?.totalPaid || "0.00"
        };
      })
    );
    return programsWithDetails;
  }

  async getActiveIncentivePrograms(): Promise<IncentiveProgram[]> {
    const now = new Date();
    return await db.select().from(incentivePrograms)
      .where(and(
        eq(incentivePrograms.status, "active"),
        lte(incentivePrograms.startAt, now),
        gte(incentivePrograms.endAt, now)
      ))
      .orderBy(desc(incentivePrograms.createdAt));
  }

  async updateIncentiveProgram(programId: string, data: Partial<UpdateIncentiveProgram>): Promise<IncentiveProgram | null> {
    const [updated] = await db
      .update(incentivePrograms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(incentivePrograms.id, programId))
      .returning();
    return updated || null;
  }

  async pauseIncentiveProgram(programId: string): Promise<IncentiveProgram | null> {
    const [updated] = await db
      .update(incentivePrograms)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(incentivePrograms.id, programId))
      .returning();
    return updated || null;
  }

  async endIncentiveProgram(programId: string): Promise<IncentiveProgram | null> {
    const [updated] = await db
      .update(incentivePrograms)
      .set({ status: "ended", updatedAt: new Date() })
      .where(eq(incentivePrograms.id, programId))
      .returning();
    return updated || null;
  }

  // Phase 14 - Incentive Earnings
  async createIncentiveEarning(data: InsertIncentiveEarning): Promise<IncentiveEarning> {
    const [earning] = await db.insert(incentiveEarnings).values(data).returning();
    return earning;
  }

  async getIncentiveEarningById(earningId: string): Promise<IncentiveEarning | null> {
    const [earning] = await db.select().from(incentiveEarnings).where(eq(incentiveEarnings.id, earningId));
    return earning || null;
  }

  async getDriverIncentiveEarnings(driverId: string): Promise<any[]> {
    const earnings = await db.select().from(incentiveEarnings)
      .where(eq(incentiveEarnings.driverId, driverId))
      .orderBy(desc(incentiveEarnings.evaluatedAt));
    const earningsWithDetails = await Promise.all(
      earnings.map(async (earning) => {
        const [program] = await db.select().from(incentivePrograms).where(eq(incentivePrograms.id, earning.programId));
        const [driver] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, earning.driverId));
        let revokedByName;
        if (earning.revokedByUserId) {
          const [revoker] = await db.select().from(users).where(eq(users.id, earning.revokedByUserId));
          revokedByName = revoker?.email;
        }
        return {
          ...earning,
          driverName: driver?.fullName || "Unknown Driver",
          programName: program?.name || "Unknown Program",
          programType: program?.type || "unknown",
          revokedByName
        };
      })
    );
    return earningsWithDetails;
  }

  async getAllIncentiveEarnings(): Promise<any[]> {
    const allEarnings = await db.select().from(incentiveEarnings).orderBy(desc(incentiveEarnings.evaluatedAt));
    const earningsWithDetails = await Promise.all(
      allEarnings.map(async (earning) => {
        const [program] = await db.select().from(incentivePrograms).where(eq(incentivePrograms.id, earning.programId));
        const [driver] = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, earning.driverId));
        let revokedByName;
        if (earning.revokedByUserId) {
          const [revoker] = await db.select().from(users).where(eq(users.id, earning.revokedByUserId));
          revokedByName = revoker?.email;
        }
        return {
          ...earning,
          driverName: driver?.fullName || "Unknown Driver",
          programName: program?.name || "Unknown Program",
          programType: program?.type || "unknown",
          revokedByName
        };
      })
    );
    return earningsWithDetails;
  }

  async getPendingIncentiveEarnings(): Promise<any[]> {
    const earnings = await this.getAllIncentiveEarnings();
    return earnings.filter(e => e.status === "pending");
  }

  async approveIncentiveEarning(earningId: string): Promise<IncentiveEarning | null> {
    const [updated] = await db
      .update(incentiveEarnings)
      .set({ status: "approved" })
      .where(eq(incentiveEarnings.id, earningId))
      .returning();
    return updated || null;
  }

  async payIncentiveEarning(earningId: string, walletTransactionId: string): Promise<IncentiveEarning | null> {
    const [updated] = await db
      .update(incentiveEarnings)
      .set({ status: "paid", paidAt: new Date(), walletTransactionId })
      .where(eq(incentiveEarnings.id, earningId))
      .returning();
    return updated || null;
  }

  async revokeIncentiveEarning(earningId: string, revokedByUserId: string, reason: string): Promise<IncentiveEarning | null> {
    const [updated] = await db
      .update(incentiveEarnings)
      .set({ status: "revoked", revokedAt: new Date(), revokedByUserId, revocationReason: reason })
      .where(eq(incentiveEarnings.id, earningId))
      .returning();
    return updated || null;
  }

  async getDriverEarningsByProgram(driverId: string, programId: string): Promise<IncentiveEarning[]> {
    return await db.select().from(incentiveEarnings)
      .where(and(eq(incentiveEarnings.driverId, driverId), eq(incentiveEarnings.programId, programId)));
  }

  async getIncentiveStats() {
    const [programStats] = await db.select({
      activePrograms: sql<number>`count(*) filter (where ${incentivePrograms.status} = 'active')`
    }).from(incentivePrograms);

    const [earningStats] = await db.select({
      totalEarnings: sum(incentiveEarnings.amount),
      pendingEarnings: sql<string>`coalesce(sum(${incentiveEarnings.amount}) filter (where ${incentiveEarnings.status} = 'pending'), 0)`,
      paidEarnings: sql<string>`coalesce(sum(${incentiveEarnings.amount}) filter (where ${incentiveEarnings.status} = 'paid'), 0)`,
      revokedEarnings: sql<string>`coalesce(sum(${incentiveEarnings.amount}) filter (where ${incentiveEarnings.status} = 'revoked'), 0)`
    }).from(incentiveEarnings);

    return {
      activePrograms: Number(programStats?.activePrograms || 0),
      totalEarnings: earningStats?.totalEarnings || "0.00",
      pendingEarnings: String(earningStats?.pendingEarnings || "0.00"),
      paidEarnings: String(earningStats?.paidEarnings || "0.00"),
      revokedEarnings: String(earningStats?.revokedEarnings || "0.00")
    };
  }

  // ========================================
  // Phase 15 - Multi-Country Tax, Currency & Compliance
  // ========================================

  async createCountry(data: InsertCountry): Promise<Country> {
    const [country] = await db.insert(countries).values(data).returning();
    return country;
  }

  async getCountryById(countryId: string): Promise<Country | null> {
    const [country] = await db.select().from(countries).where(eq(countries.id, countryId));
    return country || null;
  }

  async getCountryByCode(isoCode: string): Promise<Country | null> {
    const [country] = await db.select().from(countries).where(eq(countries.isoCode, isoCode));
    return country || null;
  }

  async getAllCountries(): Promise<any[]> {
    const allCountries = await db.select().from(countries).orderBy(desc(countries.createdAt));
    
    const countriesWithDetails = await Promise.all(
      allCountries.map(async (country) => {
        const [taxRuleCount] = await db.select({ count: count() }).from(taxRules).where(eq(taxRules.countryId, country.id));
        const [tripStats] = await db.select({
          tripCount: count(),
          revenue: sql<string>`coalesce(sum(${trips.fareAmount}), 0)`
        }).from(trips).where(eq(trips.countryId, country.id));

        return {
          ...country,
          taxRulesCount: Number(taxRuleCount?.count || 0),
          activeTripsCount: Number(tripStats?.tripCount || 0),
          totalRevenue: String(tripStats?.revenue || "0.00")
        };
      })
    );

    return countriesWithDetails;
  }

  async getActiveCountries(): Promise<Country[]> {
    return await db.select().from(countries).where(eq(countries.active, true)).orderBy(countries.name);
  }

  async updateCountry(countryId: string, data: Partial<UpdateCountry>): Promise<Country | null> {
    const [updated] = await db.update(countries).set(data).where(eq(countries.id, countryId)).returning();
    return updated || null;
  }

  async createTaxRule(data: InsertTaxRule): Promise<TaxRule> {
    const [rule] = await db.insert(taxRules).values(data).returning();
    return rule;
  }

  async getTaxRuleById(ruleId: string): Promise<TaxRule | null> {
    const [rule] = await db.select().from(taxRules).where(eq(taxRules.id, ruleId));
    return rule || null;
  }

  async getTaxRulesByCountry(countryId: string): Promise<any[]> {
    const rules = await db.select().from(taxRules).where(eq(taxRules.countryId, countryId)).orderBy(desc(taxRules.effectiveFrom));
    
    const rulesWithDetails = await Promise.all(
      rules.map(async (rule) => {
        const country = await this.getCountryById(rule.countryId);
        return {
          ...rule,
          countryName: country?.name,
          countryCode: country?.isoCode
        };
      })
    );

    return rulesWithDetails;
  }

  async getActiveTaxRules(countryId: string): Promise<TaxRule[]> {
    const now = new Date();
    return await db.select().from(taxRules)
      .where(and(
        eq(taxRules.countryId, countryId),
        lte(taxRules.effectiveFrom, now),
        or(
          sql`${taxRules.effectiveTo} is null`,
          gte(taxRules.effectiveTo, now)
        )
      ))
      .orderBy(desc(taxRules.effectiveFrom));
  }

  async getAllTaxRules(): Promise<any[]> {
    const rules = await db.select().from(taxRules).orderBy(desc(taxRules.createdAt));
    
    const rulesWithDetails = await Promise.all(
      rules.map(async (rule) => {
        const country = await this.getCountryById(rule.countryId);
        return {
          ...rule,
          countryName: country?.name,
          countryCode: country?.isoCode
        };
      })
    );

    return rulesWithDetails;
  }

  async updateTaxRule(ruleId: string, data: Partial<UpdateTaxRule>): Promise<TaxRule | null> {
    const [updated] = await db.update(taxRules).set(data).where(eq(taxRules.id, ruleId)).returning();
    return updated || null;
  }

  async createExchangeRate(data: InsertExchangeRate): Promise<ExchangeRate> {
    const [rate] = await db.insert(exchangeRates).values(data).returning();
    return rate;
  }

  async getLatestExchangeRate(baseCurrency: string, targetCurrency: string): Promise<ExchangeRate | null> {
    const [rate] = await db.select().from(exchangeRates)
      .where(and(
        eq(exchangeRates.baseCurrency, baseCurrency),
        eq(exchangeRates.targetCurrency, targetCurrency)
      ))
      .orderBy(desc(exchangeRates.asOfDate))
      .limit(1);
    return rate || null;
  }

  async getAllExchangeRates(): Promise<ExchangeRate[]> {
    return await db.select().from(exchangeRates).orderBy(desc(exchangeRates.asOfDate));
  }

  async getExchangeRateHistory(baseCurrency: string, targetCurrency: string): Promise<ExchangeRate[]> {
    return await db.select().from(exchangeRates)
      .where(and(
        eq(exchangeRates.baseCurrency, baseCurrency),
        eq(exchangeRates.targetCurrency, targetCurrency)
      ))
      .orderBy(desc(exchangeRates.asOfDate));
  }

  async createComplianceProfile(data: InsertComplianceProfile): Promise<ComplianceProfile> {
    const [profile] = await db.insert(complianceProfiles).values(data).returning();
    return profile;
  }

  async getComplianceProfileByCountry(countryId: string): Promise<ComplianceProfile | null> {
    const [profile] = await db.select().from(complianceProfiles).where(eq(complianceProfiles.countryId, countryId));
    return profile || null;
  }

  async getAllComplianceProfiles(): Promise<any[]> {
    const profiles = await db.select().from(complianceProfiles).orderBy(desc(complianceProfiles.createdAt));
    
    const profilesWithDetails = await Promise.all(
      profiles.map(async (profile) => {
        const country = await this.getCountryById(profile.countryId);
        const [tripStats] = await db.select({
          tripCount: count(),
          revenue: sql<string>`coalesce(sum(${trips.fareAmount}), 0)`,
          estimatedTax: sql<string>`coalesce(sum(${trips.estimatedTaxAmount}), 0)`
        }).from(trips).where(eq(trips.countryId, profile.countryId));

        return {
          ...profile,
          countryName: country?.name,
          countryCode: country?.isoCode,
          totalTrips: Number(tripStats?.tripCount || 0),
          totalRevenue: String(tripStats?.revenue || "0.00"),
          estimatedTax: String(tripStats?.estimatedTax || "0.00")
        };
      })
    );

    return profilesWithDetails;
  }

  async updateComplianceProfile(profileId: string, data: Partial<UpdateComplianceProfile>): Promise<ComplianceProfile | null> {
    const [updated] = await db.update(complianceProfiles).set(data).where(eq(complianceProfiles.id, profileId)).returning();
    return updated || null;
  }

  async getCountryAnalytics(countryId?: string): Promise<{
    countries: { id: string; name: string; isoCode: string; tripCount: number; revenue: string; estimatedTax: string }[];
  }> {
    let query = db.select({
      id: countries.id,
      name: countries.name,
      isoCode: countries.isoCode
    }).from(countries);

    if (countryId) {
      query = query.where(eq(countries.id, countryId)) as any;
    }

    const allCountries = await query;

    const countriesWithAnalytics = await Promise.all(
      allCountries.map(async (country) => {
        const [tripStats] = await db.select({
          tripCount: count(),
          revenue: sql<string>`coalesce(sum(${trips.fareAmount}), 0)`,
          estimatedTax: sql<string>`coalesce(sum(${trips.estimatedTaxAmount}), 0)`
        }).from(trips).where(eq(trips.countryId, country.id));

        return {
          ...country,
          tripCount: Number(tripStats?.tripCount || 0),
          revenue: String(tripStats?.revenue || "0.00"),
          estimatedTax: String(tripStats?.estimatedTax || "0.00")
        };
      })
    );

    return { countries: countriesWithAnalytics };
  }

  async getComplianceOverview(): Promise<{
    totalCountries: number;
    activeCountries: number;
    taxRulesCount: number;
    totalEstimatedTax: string;
  }> {
    const [countryStats] = await db.select({
      total: count(),
      active: sql<number>`count(*) filter (where ${countries.active} = true)`
    }).from(countries);

    const [taxRuleCount] = await db.select({ count: count() }).from(taxRules);

    const [taxStats] = await db.select({
      totalTax: sql<string>`coalesce(sum(${trips.estimatedTaxAmount}), 0)`
    }).from(trips);

    return {
      totalCountries: Number(countryStats?.total || 0),
      activeCountries: Number(countryStats?.active || 0),
      taxRulesCount: Number(taxRuleCount?.count || 0),
      totalEstimatedTax: String(taxStats?.totalTax || "0.00")
    };
  }

  // Phase 16 - Support System

  async createSupportTicket(data: InsertSupportTicket): Promise<SupportTicket> {
    const [ticket] = await db.insert(supportTickets).values(data).returning();
    return ticket;
  }

  async getSupportTicketById(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket;
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicketWithDetails[]> {
    const ticketsResult = await db.select().from(supportTickets)
      .where(eq(supportTickets.createdByUserId, userId))
      .orderBy(desc(supportTickets.createdAt));

    return Promise.all(ticketsResult.map(async (ticket) => {
      const [msgCount] = await db.select({ count: count() }).from(supportMessages)
        .where(eq(supportMessages.ticketId, ticket.id));
      
      let tripDetails = null;
      if (ticket.tripId) {
        const [trip] = await db.select().from(trips).where(eq(trips.id, ticket.tripId));
        if (trip) {
          tripDetails = {
            pickup: trip.pickupLocation || "",
            dropoff: trip.dropoffLocation || "",
            fare: trip.fareAmount || "0.00"
          };
        }
      }

      return {
        ...ticket,
        messagesCount: Number(msgCount?.count || 0),
        tripDetails
      };
    }));
  }

  async getAssignedSupportTickets(agentUserId: string): Promise<SupportTicketWithDetails[]> {
    const ticketsResult = await db.select().from(supportTickets)
      .where(eq(supportTickets.assignedToUserId, agentUserId))
      .orderBy(desc(supportTickets.updatedAt));

    return Promise.all(ticketsResult.map(async (ticket) => {
      const [msgCount] = await db.select({ count: count() }).from(supportMessages)
        .where(eq(supportMessages.ticketId, ticket.id));
      
      let tripDetails = null;
      if (ticket.tripId) {
        const [trip] = await db.select().from(trips).where(eq(trips.id, ticket.tripId));
        if (trip) {
          tripDetails = {
            pickup: trip.pickupLocation || "",
            dropoff: trip.dropoffLocation || "",
            fare: trip.fareAmount || "0.00"
          };
        }
      }

      return {
        ...ticket,
        messagesCount: Number(msgCount?.count || 0),
        tripDetails
      };
    }));
  }

  async getAllSupportTickets(filters?: { status?: string; priority?: string }): Promise<SupportTicketWithDetails[]> {
    let query = db.select().from(supportTickets);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(supportTickets.status, filters.status as any));
    }
    if (filters?.priority) {
      conditions.push(eq(supportTickets.priority, filters.priority as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const ticketsResult = await query.orderBy(desc(supportTickets.updatedAt));

    return Promise.all(ticketsResult.map(async (ticket) => {
      const [msgCount] = await db.select({ count: count() }).from(supportMessages)
        .where(eq(supportMessages.ticketId, ticket.id));
      
      return {
        ...ticket,
        messagesCount: Number(msgCount?.count || 0)
      };
    }));
  }

  async getOpenSupportTickets(): Promise<SupportTicketWithDetails[]> {
    const ticketsResult = await db.select().from(supportTickets)
      .where(or(
        eq(supportTickets.status, "open"),
        eq(supportTickets.status, "in_progress")
      ))
      .orderBy(desc(supportTickets.priority), desc(supportTickets.createdAt));

    return Promise.all(ticketsResult.map(async (ticket) => {
      const [msgCount] = await db.select({ count: count() }).from(supportMessages)
        .where(eq(supportMessages.ticketId, ticket.id));
      
      return {
        ...ticket,
        messagesCount: Number(msgCount?.count || 0)
      };
    }));
  }

  async getEscalatedSupportTickets(): Promise<SupportTicketWithDetails[]> {
    const ticketsResult = await db.select().from(supportTickets)
      .where(eq(supportTickets.status, "escalated"))
      .orderBy(desc(supportTickets.updatedAt));

    return Promise.all(ticketsResult.map(async (ticket) => {
      const [msgCount] = await db.select({ count: count() }).from(supportMessages)
        .where(eq(supportMessages.ticketId, ticket.id));
      
      return {
        ...ticket,
        messagesCount: Number(msgCount?.count || 0)
      };
    }));
  }

  async updateSupportTicket(id: string, data: Partial<SupportTicket>): Promise<SupportTicket | undefined> {
    const [ticket] = await db.update(supportTickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket;
  }

  async assignSupportTicket(ticketId: string, agentUserId: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.update(supportTickets)
      .set({ 
        assignedToUserId: agentUserId, 
        status: "in_progress" as const,
        updatedAt: new Date() 
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return ticket;
  }

  async escalateSupportTicket(ticketId: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.update(supportTickets)
      .set({ 
        status: "escalated" as const,
        updatedAt: new Date() 
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return ticket;
  }

  async closeSupportTicket(ticketId: string, status: "resolved" | "closed" = "resolved"): Promise<SupportTicket | undefined> {
    const [ticket] = await db.update(supportTickets)
      .set({ 
        status,
        updatedAt: new Date() 
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return ticket;
  }

  async createSupportMessage(data: InsertSupportMessage): Promise<SupportMessage> {
    const [message] = await db.insert(supportMessages).values(data).returning();
    
    // Update ticket updatedAt timestamp
    await db.update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, data.ticketId));
    
    return message;
  }

  async getSupportMessages(ticketId: string, includeInternal: boolean = false): Promise<SupportMessage[]> {
    if (includeInternal) {
      return db.select().from(supportMessages)
        .where(eq(supportMessages.ticketId, ticketId))
        .orderBy(supportMessages.createdAt);
    }
    
    return db.select().from(supportMessages)
      .where(and(
        eq(supportMessages.ticketId, ticketId),
        eq(supportMessages.internal, false)
      ))
      .orderBy(supportMessages.createdAt);
  }

  async getSupportStats(): Promise<{
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    escalatedTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    highPriorityOpen: number;
  }> {
    const [stats] = await db.select({
      total: count(),
      open: sql<number>`count(*) filter (where ${supportTickets.status} = 'open')`,
      inProgress: sql<number>`count(*) filter (where ${supportTickets.status} = 'in_progress')`,
      escalated: sql<number>`count(*) filter (where ${supportTickets.status} = 'escalated')`,
      resolved: sql<number>`count(*) filter (where ${supportTickets.status} = 'resolved')`,
      closed: sql<number>`count(*) filter (where ${supportTickets.status} = 'closed')`,
      highPriorityOpen: sql<number>`count(*) filter (where ${supportTickets.priority} = 'high' and ${supportTickets.status} in ('open', 'in_progress'))`
    }).from(supportTickets);

    return {
      totalTickets: Number(stats?.total || 0),
      openTickets: Number(stats?.open || 0),
      inProgressTickets: Number(stats?.inProgress || 0),
      escalatedTickets: Number(stats?.escalated || 0),
      resolvedTickets: Number(stats?.resolved || 0),
      closedTickets: Number(stats?.closed || 0),
      highPriorityOpen: Number(stats?.highPriorityOpen || 0)
    };
  }

  // Phase 18 - Contracts, SLAs & Enterprise Billing

  async createOrganizationContract(data: InsertOrganizationContract): Promise<OrganizationContract> {
    const [contract] = await db.insert(organizationContracts).values(data).returning();
    return contract;
  }

  async getOrganizationContract(contractId: string): Promise<OrganizationContract | null> {
    const [contract] = await db.select().from(organizationContracts).where(eq(organizationContracts.id, contractId));
    return contract || null;
  }

  async getContractByCoordinator(tripCoordinatorId: string): Promise<OrganizationContract | null> {
    const [contract] = await db.select().from(organizationContracts)
      .where(and(
        eq(organizationContracts.tripCoordinatorId, tripCoordinatorId),
        eq(organizationContracts.status, "ACTIVE")
      ));
    return contract || null;
  }

  async getAllOrganizationContracts(): Promise<OrganizationContractWithDetails[]> {
    const contractsResult = await db.select().from(organizationContracts)
      .orderBy(desc(organizationContracts.createdAt));

    const contractsWithDetails: OrganizationContractWithDetails[] = [];
    for (const contract of contractsResult) {
      const [profile] = await db.select().from(tripCoordinatorProfiles)
        .where(eq(tripCoordinatorProfiles.userId, contract.tripCoordinatorId));
      
      const [slaCountResult] = await db.select({ count: count() }).from(serviceLevelAgreements)
        .where(eq(serviceLevelAgreements.contractId, contract.id));
      
      const [invoiceCountResult] = await db.select({ count: count() }).from(enterpriseInvoices)
        .where(eq(enterpriseInvoices.contractId, contract.id));

      const [totalBilledResult] = await db.select({ 
        total: sql<string>`coalesce(sum(${enterpriseInvoices.totalAmount}), 0)` 
      }).from(enterpriseInvoices)
        .where(eq(enterpriseInvoices.contractId, contract.id));

      contractsWithDetails.push({
        ...contract,
        organizationName: profile?.organizationName || "Unknown",
        slaCount: slaCountResult?.count || 0,
        invoiceCount: invoiceCountResult?.count || 0,
        totalBilled: totalBilledResult?.total || "0.00"
      });
    }

    return contractsWithDetails;
  }

  async updateOrganizationContract(contractId: string, data: Partial<InsertOrganizationContract>): Promise<OrganizationContract | null> {
    const [contract] = await db.update(organizationContracts)
      .set(data)
      .where(eq(organizationContracts.id, contractId))
      .returning();
    return contract || null;
  }

  async createServiceLevelAgreement(data: InsertServiceLevelAgreement): Promise<ServiceLevelAgreement> {
    const [sla] = await db.insert(serviceLevelAgreements).values(data).returning();
    return sla;
  }

  async getServiceLevelAgreement(slaId: string): Promise<ServiceLevelAgreement | null> {
    const [sla] = await db.select().from(serviceLevelAgreements).where(eq(serviceLevelAgreements.id, slaId));
    return sla || null;
  }

  async getSLAsByContract(contractId: string): Promise<ServiceLevelAgreementWithDetails[]> {
    const slas = await db.select().from(serviceLevelAgreements)
      .where(eq(serviceLevelAgreements.contractId, contractId))
      .orderBy(serviceLevelAgreements.createdAt);

    const [contract] = await db.select().from(organizationContracts)
      .where(eq(organizationContracts.id, contractId));

    return slas.map(sla => ({
      ...sla,
      contractName: contract?.contractName,
      currentValue: 0,
      compliancePercentage: 100
    }));
  }

  async updateServiceLevelAgreement(slaId: string, data: Partial<InsertServiceLevelAgreement>): Promise<ServiceLevelAgreement | null> {
    const [sla] = await db.update(serviceLevelAgreements)
      .set(data)
      .where(eq(serviceLevelAgreements.id, slaId))
      .returning();
    return sla || null;
  }

  async createEnterpriseInvoice(data: InsertEnterpriseInvoice): Promise<EnterpriseInvoice> {
    const [invoice] = await db.insert(enterpriseInvoices).values(data).returning();
    return invoice;
  }

  async getEnterpriseInvoice(invoiceId: string): Promise<EnterpriseInvoice | null> {
    const [invoice] = await db.select().from(enterpriseInvoices).where(eq(enterpriseInvoices.id, invoiceId));
    return invoice || null;
  }

  async getInvoicesByContract(contractId: string): Promise<EnterpriseInvoiceWithDetails[]> {
    const invoices = await db.select().from(enterpriseInvoices)
      .where(eq(enterpriseInvoices.contractId, contractId))
      .orderBy(desc(enterpriseInvoices.createdAt));

    const [contract] = await db.select().from(organizationContracts)
      .where(eq(organizationContracts.id, contractId));

    let organizationName = "Unknown";
    if (contract) {
      const [profile] = await db.select().from(tripCoordinatorProfiles)
        .where(eq(tripCoordinatorProfiles.userId, contract.tripCoordinatorId));
      organizationName = profile?.organizationName || "Unknown";
    }

    return invoices.map(invoice => ({
      ...invoice,
      contractName: contract?.contractName,
      organizationName
    }));
  }

  async getAllEnterpriseInvoices(): Promise<EnterpriseInvoiceWithDetails[]> {
    const invoices = await db.select().from(enterpriseInvoices)
      .orderBy(desc(enterpriseInvoices.createdAt));

    const invoicesWithDetails: EnterpriseInvoiceWithDetails[] = [];
    for (const invoice of invoices) {
      const [contract] = await db.select().from(organizationContracts)
        .where(eq(organizationContracts.id, invoice.contractId));

      let organizationName = "Unknown";
      if (contract) {
        const [profile] = await db.select().from(tripCoordinatorProfiles)
          .where(eq(tripCoordinatorProfiles.userId, contract.tripCoordinatorId));
        organizationName = profile?.organizationName || "Unknown";
      }

      invoicesWithDetails.push({
        ...invoice,
        contractName: contract?.contractName,
        organizationName
      });
    }

    return invoicesWithDetails;
  }

  async updateEnterpriseInvoiceStatus(invoiceId: string, status: string): Promise<EnterpriseInvoice | null> {
    const [invoice] = await db.update(enterpriseInvoices)
      .set({ status: status as any })
      .where(eq(enterpriseInvoices.id, invoiceId))
      .returning();
    return invoice || null;
  }

  async generateInvoiceForContract(contractId: string, periodStart: Date, periodEnd: Date): Promise<EnterpriseInvoice | null> {
    const contract = await this.getOrganizationContract(contractId);
    if (!contract) return null;

    const tripsResult = await db.select({
      count: count(),
      total: sql<string>`coalesce(sum(${trips.fareAmount}), 0)`
    }).from(trips)
      .where(and(
        eq(trips.riderId, contract.tripCoordinatorId),
        eq(trips.status, "completed"),
        gte(trips.completedAt, periodStart),
        lte(trips.completedAt, periodEnd)
      ));

    const totalTrips = Number(tripsResult[0]?.count || 0);
    const totalAmount = tripsResult[0]?.total || "0.00";

    const [invoice] = await db.insert(enterpriseInvoices).values({
      contractId,
      periodStart,
      periodEnd,
      totalTrips,
      totalAmount,
      currency: contract.currency,
      status: "DRAFT"
    }).returning();

    return invoice;
  }

  async getContractStats(): Promise<{
    totalContracts: number;
    activeContracts: number;
    totalBilled: string;
    pendingInvoices: number;
  }> {
    const [contractStats] = await db.select({
      total: count(),
      active: sql<number>`count(*) filter (where ${organizationContracts.status} = 'ACTIVE')`
    }).from(organizationContracts);

    const [invoiceStats] = await db.select({
      totalBilled: sql<string>`coalesce(sum(case when ${enterpriseInvoices.status} = 'PAID' then ${enterpriseInvoices.totalAmount} else 0 end), 0)`,
      pending: sql<number>`count(*) filter (where ${enterpriseInvoices.status} in ('DRAFT', 'ISSUED'))`
    }).from(enterpriseInvoices);

    return {
      totalContracts: Number(contractStats?.total || 0),
      activeContracts: Number(contractStats?.active || 0),
      totalBilled: invoiceStats?.totalBilled || "0.00",
      pendingInvoices: Number(invoiceStats?.pending || 0)
    };
  }

  // Phase 19 - Growth, Marketing & Partnerships
  async createReferralCode(data: InsertReferralCode): Promise<ReferralCode> {
    const [code] = await db.insert(referralCodes).values(data).returning();
    return code;
  }

  async getReferralCodeByCode(code: string): Promise<ReferralCode | null> {
    const [result] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));
    return result || null;
  }

  async getReferralCodesByOwner(ownerUserId: string): Promise<ReferralCode[]> {
    return db.select().from(referralCodes).where(eq(referralCodes.ownerUserId, ownerUserId)).orderBy(desc(referralCodes.createdAt));
  }

  async updateReferralCodeUsage(codeId: string): Promise<ReferralCode | null> {
    const [updated] = await db.update(referralCodes)
      .set({ usageCount: sql`${referralCodes.usageCount} + 1` })
      .where(eq(referralCodes.id, codeId))
      .returning();
    return updated || null;
  }

  async deactivateReferralCode(codeId: string): Promise<ReferralCode | null> {
    const [updated] = await db.update(referralCodes)
      .set({ active: false })
      .where(eq(referralCodes.id, codeId))
      .returning();
    return updated || null;
  }

  async getAllReferralCodes(): Promise<ReferralCodeWithStats[]> {
    const codes = await db.select().from(referralCodes).orderBy(desc(referralCodes.createdAt));
    const result: ReferralCodeWithStats[] = [];
    
    for (const code of codes) {
      const [eventCount] = await db.select({ count: count() })
        .from(referralEvents)
        .where(eq(referralEvents.referralCodeId, code.id));
      
      const user = await db.select().from(users).where(eq(users.id, code.ownerUserId)).then(r => r[0]);
      
      result.push({
        ...code,
        ownerName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown",
        totalConversions: Number(eventCount?.count || 0)
      });
    }
    
    return result;
  }

  async createReferralEvent(data: InsertReferralEvent): Promise<ReferralEvent> {
    const [event] = await db.insert(referralEvents).values(data).returning();
    await this.updateReferralCodeUsage(data.referralCodeId);
    return event;
  }

  async getReferralEventsByCode(referralCodeId: string): Promise<ReferralEvent[]> {
    return db.select().from(referralEvents)
      .where(eq(referralEvents.referralCodeId, referralCodeId))
      .orderBy(desc(referralEvents.createdAt));
  }

  async getReferralStats(ownerUserId: string): Promise<{ totalReferrals: number; conversions: number }> {
    const ownerCodes = await this.getReferralCodesByOwner(ownerUserId);
    let totalReferrals = 0;
    let conversions = 0;
    
    for (const code of ownerCodes) {
      totalReferrals++;
      const events = await this.getReferralEventsByCode(code.id);
      conversions += events.length;
    }
    
    return { totalReferrals, conversions };
  }

  async createMarketingCampaign(data: InsertMarketingCampaign): Promise<MarketingCampaign> {
    const [campaign] = await db.insert(marketingCampaigns).values(data).returning();
    return campaign;
  }

  async getMarketingCampaign(campaignId: string): Promise<MarketingCampaign | null> {
    const [campaign] = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, campaignId));
    return campaign || null;
  }

  async getAllMarketingCampaigns(): Promise<MarketingCampaign[]> {
    return db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.createdAt));
  }

  async getActiveCampaigns(): Promise<MarketingCampaign[]> {
    const now = new Date();
    return db.select().from(marketingCampaigns)
      .where(and(
        eq(marketingCampaigns.status, "ACTIVE"),
        lte(marketingCampaigns.startAt, now),
        gte(marketingCampaigns.endAt, now)
      ))
      .orderBy(desc(marketingCampaigns.createdAt));
  }

  async updateMarketingCampaignStatus(campaignId: string, status: string): Promise<MarketingCampaign | null> {
    const [updated] = await db.update(marketingCampaigns)
      .set({ status: status as any })
      .where(eq(marketingCampaigns.id, campaignId))
      .returning();
    return updated || null;
  }

  async createPartnerLead(data: InsertPartnerLead): Promise<PartnerLead> {
    const [lead] = await db.insert(partnerLeads).values(data).returning();
    return lead;
  }

  async getPartnerLead(leadId: string): Promise<PartnerLead | null> {
    const [lead] = await db.select().from(partnerLeads).where(eq(partnerLeads.id, leadId));
    return lead || null;
  }

  async getAllPartnerLeads(): Promise<PartnerLead[]> {
    return db.select().from(partnerLeads).orderBy(desc(partnerLeads.createdAt));
  }

  async updatePartnerLeadStatus(leadId: string, status: string): Promise<PartnerLead | null> {
    const [updated] = await db.update(partnerLeads)
      .set({ status: status as any })
      .where(eq(partnerLeads.id, leadId))
      .returning();
    return updated || null;
  }

  async getGrowthStats(): Promise<GrowthStats> {
    const [referralStats] = await db.select({
      total: count(),
      active: sql<number>`count(*) filter (where ${referralCodes.active} = true)`
    }).from(referralCodes);

    const [eventStats] = await db.select({ count: count() }).from(referralEvents);

    const [campaignStats] = await db.select({
      active: sql<number>`count(*) filter (where ${marketingCampaigns.status} = 'ACTIVE')`
    }).from(marketingCampaigns);

    const [partnerStats] = await db.select({
      total: count(),
      signed: sql<number>`count(*) filter (where ${partnerLeads.status} = 'SIGNED')`
    }).from(partnerLeads);

    const totalReferralCodes = Number(referralStats?.total || 0);
    const activeReferralCodes = Number(referralStats?.active || 0);
    const totalReferrals = Number(eventStats?.count || 0);
    
    return {
      totalReferralCodes,
      activeReferralCodes,
      totalReferrals,
      referralConversionRate: totalReferralCodes > 0 ? (totalReferrals / totalReferralCodes) * 100 : 0,
      activeCampaigns: Number(campaignStats?.active || 0),
      totalPartnerLeads: Number(partnerStats?.total || 0),
      signedPartners: Number(partnerStats?.signed || 0)
    };
  }

  // Phase 20 - Post-Launch Monitoring & Feature Flags
  async createFeatureFlag(data: InsertFeatureFlag): Promise<FeatureFlag> {
    const [flag] = await db.insert(featureFlags).values(data).returning();
    return flag;
  }

  async getFeatureFlag(name: string): Promise<FeatureFlag | null> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.name, name));
    return flag || null;
  }

  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).orderBy(desc(featureFlags.createdAt));
  }

  async updateFeatureFlag(name: string, data: Partial<InsertFeatureFlag>): Promise<FeatureFlag | null> {
    const [updated] = await db.update(featureFlags)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(featureFlags.name, name))
      .returning();
    return updated || null;
  }

  async isFeatureEnabled(name: string, userId?: string): Promise<boolean> {
    const flag = await this.getFeatureFlag(name);
    if (!flag || !flag.enabled) return false;
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;
    if (userId) {
      const hash = userId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
      return Math.abs(hash % 100) < flag.rolloutPercentage;
    }
    return Math.random() * 100 < flag.rolloutPercentage;
  }

  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [tripStats] = await db.select({
      total: count(),
      completed: sql<number>`count(*) filter (where ${trips.status} = 'completed')`,
      cancelled: sql<number>`count(*) filter (where ${trips.status} = 'cancelled')`
    }).from(trips);

    const [ticketStats] = await db.select({ count: count() })
      .from(supportTickets)
      .where(gte(supportTickets.createdAt, dayAgo));

    const totalTrips = Number(tripStats?.total || 0);
    const completedTrips = Number(tripStats?.completed || 0);
    const cancelledTrips = Number(tripStats?.cancelled || 0);

    return {
      dailyActiveUsers: 0,
      monthlyActiveUsers: 0,
      tripSuccessRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0,
      cancellationRate: totalTrips > 0 ? (cancelledTrips / totalTrips) * 100 : 0,
      avgTripCompletionTime: 0,
      supportTicketVolume: Number(ticketStats?.count || 0)
    };
  }

  async getRiderMetrics(): Promise<RiderMetrics> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalRiders] = await db.select({ count: count() }).from(riderProfiles);
    const [newSignups] = await db.select({ count: count() })
      .from(riderProfiles)
      .where(gte(riderProfiles.createdAt, weekAgo));

    const [riderTrips] = await db.select({
      total: sql<number>`count(distinct ${trips.riderId})`,
      repeat: sql<number>`count(*) filter (where ${trips.riderId} in (
        select rider_id from trips group by rider_id having count(*) > 1
      ))`
    }).from(trips);

    return {
      newSignups: Number(newSignups?.count || 0),
      repeatUsageRate: 0,
      failedBookingAttempts: 0,
      totalRiders: Number(totalRiders?.count || 0)
    };
  }

  async getDriverMetrics(): Promise<DriverMetrics> {
    const [totalDrivers] = await db.select({ count: count() }).from(driverProfiles);
    const [activeDrivers] = await db.select({ count: count() })
      .from(driverProfiles)
      .where(eq(driverProfiles.status, "approved"));

    const [tripStats] = await db.select({
      accepted: sql<number>`count(*) filter (where ${trips.status} != 'requested')`,
      completed: sql<number>`count(*) filter (where ${trips.status} = 'completed')`,
      total: count()
    }).from(trips).where(sql`${trips.driverId} is not null`);

    const total = Number(tripStats?.total || 0);
    const accepted = Number(tripStats?.accepted || 0);
    const completed = Number(tripStats?.completed || 0);

    return {
      activeDrivers: Number(activeDrivers?.count || 0),
      acceptanceRate: total > 0 ? (accepted / total) * 100 : 0,
      completionRate: accepted > 0 ? (completed / accepted) * 100 : 0,
      earningsVariance: 0,
      totalDrivers: Number(totalDrivers?.count || 0)
    };
  }

  async getOrganizationMetrics(): Promise<OrganizationMetrics> {
    const [orgStats] = await db.select({ count: count() }).from(tripCoordinatorProfiles);
    const [contractStats] = await db.select({
      active: sql<number>`count(*) filter (where ${organizationContracts.status} = 'ACTIVE')`
    }).from(organizationContracts);
    const [invoiceStats] = await db.select({ count: count() }).from(enterpriseInvoices);

    const [orgTrips] = await db.select({ count: count() })
      .from(trips)
      .where(eq(trips.bookedForType, "third_party"));

    const activeOrgs = Number(contractStats?.active || 0);
    const tripCount = Number(orgTrips?.count || 0);

    return {
      activeOrganizations: activeOrgs,
      tripsPerOrganization: activeOrgs > 0 ? tripCount / activeOrgs : 0,
      slaComplianceRate: 100,
      invoiceCount: Number(invoiceStats?.count || 0)
    };
  }

  async getFinancialMetrics(): Promise<FinancialMetrics> {
    const [tripFinancials] = await db.select({
      grossFares: sql<string>`coalesce(sum(${trips.fareAmount}), 0)`,
      commission: sql<string>`coalesce(sum(${trips.commissionAmount}), 0)`
    }).from(trips).where(eq(trips.status, "completed"));

    const [refundStats] = await db.select({
      total: sql<string>`coalesce(sum(${refunds.amount}), 0)`
    }).from(refunds).where(eq(refunds.status, "processed"));

    const [chargebackStats] = await db.select({ count: count() }).from(chargebacks);

    const grossFares = tripFinancials?.grossFares || "0.00";
    const commission = tripFinancials?.commission || "0.00";
    const refundVolume = refundStats?.total || "0.00";

    return {
      grossFares,
      platformCommission: commission,
      refundVolume,
      chargebackCount: Number(chargebackStats?.count || 0),
      netRevenue: (parseFloat(commission) - parseFloat(refundVolume)).toFixed(2)
    };
  }

  async getMetricsOverview(): Promise<MetricsOverview> {
    const [platform, riders, drivers, organizations, financials] = await Promise.all([
      this.getPlatformMetrics(),
      this.getRiderMetrics(),
      this.getDriverMetrics(),
      this.getOrganizationMetrics(),
      this.getFinancialMetrics()
    ]);

    const alerts: MetricAlert[] = [];

    if (platform.cancellationRate > 30) {
      alerts.push({
        id: crypto.randomUUID(),
        type: "warning",
        metric: "cancellation_rate",
        message: "High cancellation rate detected",
        value: platform.cancellationRate,
        threshold: 30,
        createdAt: new Date()
      });
    }

    if (financials.chargebackCount > 10) {
      alerts.push({
        id: crypto.randomUUID(),
        type: "error",
        metric: "chargeback_count",
        message: "Elevated chargeback volume",
        value: financials.chargebackCount,
        threshold: 10,
        createdAt: new Date()
      });
    }

    return { platform, riders, drivers, organizations, financials, alerts };
  }

  // Phase 22 - Enhanced Ride Lifecycle Implementation
  async createRide(data: InsertRide): Promise<Ride> {
    // Set matching expiration to 10 seconds from now
    const matchingExpiresAt = new Date();
    matchingExpiresAt.setSeconds(matchingExpiresAt.getSeconds() + 10);
    
    const [ride] = await db.insert(rides).values({
      ...data,
      status: "requested",
      matchingExpiresAt,
      requestedAt: new Date(),
    }).returning();
    return ride;
  }

  async getRideById(rideId: string): Promise<Ride | null> {
    const [ride] = await db.select().from(rides).where(eq(rides.id, rideId));
    return ride || null;
  }

  async getRidesByStatus(status: string): Promise<Ride[]> {
    return db.select().from(rides).where(eq(rides.status, status as any)).orderBy(desc(rides.requestedAt));
  }

  async getRiderRides(riderId: string): Promise<Ride[]> {
    return db.select().from(rides).where(eq(rides.riderId, riderId)).orderBy(desc(rides.requestedAt));
  }

  async getDriverRides(driverId: string): Promise<Ride[]> {
    return db.select().from(rides).where(eq(rides.driverId, driverId)).orderBy(desc(rides.requestedAt));
  }

  async getCurrentRiderRide(riderId: string): Promise<Ride | null> {
    const activeStatuses = ["requested", "matching", "accepted", "driver_en_route", "arrived", "waiting", "in_progress"];
    const [ride] = await db.select().from(rides)
      .where(and(
        eq(rides.riderId, riderId),
        inArray(rides.status, activeStatuses as any)
      ))
      .orderBy(desc(rides.requestedAt))
      .limit(1);
    return ride || null;
  }

  async getCurrentDriverRide(driverId: string): Promise<Ride | null> {
    const activeStatuses = ["accepted", "driver_en_route", "arrived", "waiting", "in_progress"];
    const [ride] = await db.select().from(rides)
      .where(and(
        eq(rides.driverId, driverId),
        inArray(rides.status, activeStatuses as any)
      ))
      .orderBy(desc(rides.requestedAt))
      .limit(1);
    return ride || null;
  }

  async getAvailableRidesForDriver(): Promise<Ride[]> {
    return db.select().from(rides)
      .where(and(
        inArray(rides.status, ["requested", "matching"] as any),
        isNull(rides.driverId)
      ))
      .orderBy(desc(rides.requestedAt));
  }

  async updateRideStatus(rideId: string, status: string, additionalData?: Partial<Ride>): Promise<Ride | null> {
    const timestampField = this.getTimestampFieldForStatus(status);
    const updateData: any = {
      status,
      updatedAt: new Date(),
      ...additionalData,
    };
    
    if (timestampField) {
      updateData[timestampField] = new Date();
    }

    const [ride] = await db.update(rides)
      .set(updateData)
      .where(eq(rides.id, rideId))
      .returning();
    return ride || null;
  }

  private getTimestampFieldForStatus(status: string): string | null {
    const mapping: Record<string, string> = {
      accepted: "acceptedAt",
      driver_en_route: "enRouteAt",
      arrived: "arrivedAt",
      waiting: "waitingStartedAt",
      in_progress: "startedAt",
      completed: "completedAt",
      cancelled: "cancelledAt",
    };
    return mapping[status] || null;
  }

  async assignDriverToRide(rideId: string, driverId: string): Promise<Ride | null> {
    // Check if matching window has expired
    const [existingRide] = await db.select().from(rides).where(eq(rides.id, rideId));
    if (!existingRide) return null;
    
    if (existingRide.matchingExpiresAt && new Date() > existingRide.matchingExpiresAt) {
      throw new Error("Matching window has expired");
    }

    const [ride] = await db.update(rides)
      .set({
        driverId,
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(rides.id, rideId))
      .returning();
    return ride || null;
  }

  async cancelRide(rideId: string, cancelledBy: string, reason?: string, compensationData?: {
    driverCancelReason?: string;
    cancellationFee?: number | null;
    driverCancelCompensation?: number | null;
    platformCancelFee?: number | null;
    compensationEligible?: boolean;
  }): Promise<Ride | null> {
    const updateData: any = {
      status: "cancelled",
      cancelledBy: cancelledBy as any,
      cancelReason: reason,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (compensationData) {
      if (compensationData.driverCancelReason) {
        updateData.driverCancelReason = compensationData.driverCancelReason;
      }
      if (compensationData.cancellationFee !== undefined && compensationData.cancellationFee !== null) {
        updateData.cancellationFee = compensationData.cancellationFee.toString();
      }
      if (compensationData.driverCancelCompensation !== undefined && compensationData.driverCancelCompensation !== null) {
        updateData.driverCancelCompensation = compensationData.driverCancelCompensation.toString();
      }
      if (compensationData.platformCancelFee !== undefined && compensationData.platformCancelFee !== null) {
        updateData.platformCancelFee = compensationData.platformCancelFee.toString();
      }
      if (compensationData.compensationEligible !== undefined) {
        updateData.compensationEligible = compensationData.compensationEligible;
      }
    }
    
    const [ride] = await db.update(rides)
      .set(updateData)
      .where(eq(rides.id, rideId))
      .returning();
    return ride || null;
  }

  // Driver Movement tracking
  async createDriverMovement(data: InsertDriverMovement): Promise<DriverMovement> {
    const [movement] = await db.insert(driverMovements).values(data).returning();
    return movement;
  }

  async getDriverMovementsForRide(rideId: string): Promise<DriverMovement[]> {
    return db.select().from(driverMovements).where(eq(driverMovements.rideId, rideId)).orderBy(driverMovements.recordedAt);
  }

  async getTotalDriverMovement(rideId: string): Promise<{ distanceKm: number; durationSec: number }> {
    const movements = await this.getDriverMovementsForRide(rideId);
    const totalDistance = movements.reduce((sum, m) => sum + parseFloat(m.distanceKm || "0"), 0);
    const totalDuration = movements.reduce((sum, m) => sum + (m.durationSec || 0), 0);
    return { distanceKm: totalDistance, durationSec: totalDuration };
  }

  // Ride Audit Log
  async createRideAuditLog(data: InsertRideAuditLog): Promise<RideAuditLog> {
    const [log] = await db.insert(rideAuditLogs).values(data).returning();
    return log;
  }

  async getRideAuditLogs(rideId: string): Promise<RideAuditLog[]> {
    return db.select().from(rideAuditLogs).where(eq(rideAuditLogs.rideId, rideId)).orderBy(desc(rideAuditLogs.createdAt));
  }

  // Phase 24 - Reservations / Scheduled Trips Implementation
  async createReservation(data: InsertRide & { scheduledPickupAt: Date }): Promise<Ride> {
    const recommendedDepartAt = new Date(data.scheduledPickupAt);
    recommendedDepartAt.setMinutes(recommendedDepartAt.getMinutes() - 30);
    
    const [ride] = await db.insert(rides).values({
      ...data,
      status: "requested",
      isReserved: true,
      reservationStatus: "scheduled",
      scheduledPickupAt: data.scheduledPickupAt,
      recommendedDepartAt,
      reservationConfirmedAt: new Date(),
    }).returning();
    return ride;
  }

  async getUpcomingReservations(riderId: string): Promise<Ride[]> {
    const now = new Date();
    return db.select().from(rides)
      .where(
        and(
          eq(rides.riderId, riderId),
          eq(rides.isReserved, true),
          sql`${rides.scheduledPickupAt} > ${now}`,
          sql`${rides.reservationStatus} IN ('scheduled', 'driver_assigned', 'prep_window')`
        )
      )
      .orderBy(rides.scheduledPickupAt);
  }

  async getDriverUpcomingReservations(driverId: string): Promise<Ride[]> {
    const now = new Date();
    return db.select().from(rides)
      .where(
        and(
          eq(rides.assignedDriverId, driverId),
          eq(rides.isReserved, true),
          sql`${rides.scheduledPickupAt} > ${now}`,
          sql`${rides.reservationStatus} IN ('driver_assigned', 'prep_window', 'active')`
        )
      )
      .orderBy(rides.scheduledPickupAt);
  }

  async getAllUpcomingReservations(): Promise<Ride[]> {
    const now = new Date();
    return db.select().from(rides)
      .where(
        and(
          eq(rides.isReserved, true),
          sql`${rides.scheduledPickupAt} > ${now}`,
          sql`${rides.reservationStatus} IN ('scheduled', 'driver_assigned', 'prep_window')`
        )
      )
      .orderBy(rides.scheduledPickupAt);
  }

  async getAvailableReservationOffers(): Promise<Ride[]> {
    const now = new Date();
    return db.select().from(rides)
      .where(
        and(
          eq(rides.isReserved, true),
          eq(rides.reservationStatus, "scheduled"),
          sql`${rides.assignedDriverId} IS NULL`,
          sql`${rides.scheduledPickupAt} > ${now}`
        )
      )
      .orderBy(rides.scheduledPickupAt);
  }

  async acceptReservationOffer(rideId: string, driverId: string): Promise<Ride | null> {
    const [ride] = await db.update(rides)
      .set({
        assignedDriverId: driverId,
        driverId: driverId,
        reservationStatus: "driver_assigned",
        driverAssignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(rides.id, rideId),
          eq(rides.isReserved, true),
          eq(rides.reservationStatus, "scheduled"),
          sql`${rides.assignedDriverId} IS NULL`
        )
      )
      .returning();
    return ride || null;
  }

  async assignDriverToReservation(rideId: string, driverId: string): Promise<Ride | null> {
    const [ride] = await db.update(rides)
      .set({
        assignedDriverId: driverId,
        driverId: driverId,
        reservationStatus: "driver_assigned",
        driverAssignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(rides.id, rideId),
          eq(rides.isReserved, true),
          eq(rides.reservationStatus, "scheduled")
        )
      )
      .returning();
    return ride || null;
  }

  async updateReservationStatus(rideId: string, status: string): Promise<Ride | null> {
    const [ride] = await db.update(rides)
      .set({
        reservationStatus: status as any,
        updatedAt: new Date(),
      })
      .where(eq(rides.id, rideId))
      .returning();
    return ride || null;
  }

  async cancelReservation(rideId: string, cancelledBy: string, reason?: string): Promise<Ride | null> {
    const ride = await this.getRideById(rideId);
    if (!ride || !ride.isReserved) return null;
    
    const now = new Date();
    const scheduledTime = new Date(ride.scheduledPickupAt!);
    const hoursUntilPickup = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    let cancelFee: string | null = null;
    if (hoursUntilPickup < 1 && cancelledBy === "rider") {
      cancelFee = ride.reservationPremium || "5.00";
    }
    
    const [updated] = await db.update(rides)
      .set({
        status: "cancelled",
        reservationStatus: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: cancelledBy as any,
        cancelReason: reason,
        reservationCancelFee: cancelFee,
        updatedAt: new Date(),
      })
      .where(eq(rides.id, rideId))
      .returning();
    return updated || null;
  }

  async getReservationsInPrepWindow(): Promise<Ride[]> {
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    
    return db.select().from(rides)
      .where(
        and(
          eq(rides.isReserved, true),
          eq(rides.reservationStatus, "driver_assigned"),
          sql`${rides.scheduledPickupAt} <= ${thirtyMinutesFromNow}`,
          sql`${rides.scheduledPickupAt} > ${now}`
        )
      )
      .orderBy(rides.scheduledPickupAt);
  }

  async applyEarlyArrivalBonus(rideId: string, bonusAmount: string): Promise<Ride | null> {
    const [ride] = await db.update(rides)
      .set({
        earlyArrivalBonus: bonusAmount,
        earlyArrivalBonusPaid: true,
        updatedAt: new Date(),
      })
      .where(eq(rides.id, rideId))
      .returning();
    return ride || null;
  }

  // ========================
  // Phase 25 - Monetization Methods
  // ========================

  // Country Pricing Rules
  async getCountryPricingRules(countryId: string): Promise<CountryPricingRules | null> {
    const [rules] = await db.select().from(countryPricingRules)
      .where(eq(countryPricingRules.countryId, countryId))
      .limit(1);
    return rules || null;
  }

  async getAllCountryPricingRules(): Promise<CountryPricingRules[]> {
    return db.select().from(countryPricingRules).orderBy(countryPricingRules.createdAt);
  }

  async createCountryPricingRules(data: InsertCountryPricingRules): Promise<CountryPricingRules> {
    const [rules] = await db.insert(countryPricingRules).values(data).returning();
    return rules;
  }

  async updateCountryPricingRules(countryId: string, data: Partial<InsertCountryPricingRules>): Promise<CountryPricingRules | null> {
    const [rules] = await db.update(countryPricingRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(countryPricingRules.countryId, countryId))
      .returning();
    return rules || null;
  }

  // Rider Wallets
  async getRiderWallet(userId: string): Promise<RiderWallet | null> {
    const [wallet] = await db.select().from(riderWallets)
      .where(eq(riderWallets.userId, userId))
      .limit(1);
    return wallet || null;
  }

  async createRiderWallet(data: InsertRiderWallet): Promise<RiderWallet> {
    const [wallet] = await db.insert(riderWallets).values(data).returning();
    return wallet;
  }

  async updateRiderWalletBalance(userId: string, amount: number, type: "credit" | "debit"): Promise<RiderWallet | null> {
    const operator = type === "credit" ? sql`+ ${amount}` : sql`- ${amount}`;
    const [wallet] = await db.update(riderWallets)
      .set({
        balance: sql`${riderWallets.balance} ${operator}`,
        updatedAt: new Date(),
      })
      .where(eq(riderWallets.userId, userId))
      .returning();
    return wallet || null;
  }

  async getAllRiderWallets(): Promise<RiderWallet[]> {
    return db.select().from(riderWallets).orderBy(desc(riderWallets.updatedAt));
  }

  // Driver Wallets
  async getDriverWallet(userId: string): Promise<DriverWallet | null> {
    const [wallet] = await db.select().from(driverWallets)
      .where(eq(driverWallets.userId, userId))
      .limit(1);
    return wallet || null;
  }

  async createDriverWallet(data: InsertDriverWallet): Promise<DriverWallet> {
    const [wallet] = await db.insert(driverWallets).values(data).returning();
    return wallet;
  }

  async getAllDriverWalletsV2(): Promise<DriverWallet[]> {
    return db.select().from(driverWallets).orderBy(desc(driverWallets.updatedAt));
  }

  async initiateDriverPayoutV2(driverId: string, amount: number, initiatedByUserId: string): Promise<DriverPayoutHistory | null> {
    const wallet = await this.getDriverWallet(driverId);
    if (!wallet || parseFloat(wallet.withdrawableBalance) < amount) {
      return null;
    }

    await db.update(driverWallets)
      .set({
        withdrawableBalance: sql`${driverWallets.withdrawableBalance} - ${amount}`,
        balance: sql`${driverWallets.balance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(driverWallets.userId, driverId));

    const [payout] = await db.insert(driverPayoutHistory).values({
      driverId,
      amount: amount.toString(),
      initiatedByUserId,
    }).returning();

    await db.insert(financialAuditLogs).values({
      userId: driverId,
      actorRole: "ADMIN",
      eventType: "PAYOUT",
      amount: amount.toString(),
      description: `Payout initiated for driver`,
    });

    return payout;
  }

  async completeDriverPayout(payoutId: string, processedByUserId: string, transactionRef?: string): Promise<DriverPayoutHistory | null> {
    const [payout] = await db.update(driverPayoutHistory)
      .set({
        status: "paid",
        processedByUserId,
        transactionRef,
        processedAt: new Date(),
      })
      .where(eq(driverPayoutHistory.id, payoutId))
      .returning();
    return payout || null;
  }

  async failDriverPayout(payoutId: string, reason: string): Promise<DriverPayoutHistory | null> {
    const [payout] = await db.select().from(driverPayoutHistory)
      .where(eq(driverPayoutHistory.id, payoutId))
      .limit(1);

    if (payout) {
      await db.update(driverWallets)
        .set({
          withdrawableBalance: sql`${driverWallets.withdrawableBalance} + ${parseFloat(payout.amount)}`,
          balance: sql`${driverWallets.balance} + ${parseFloat(payout.amount)}`,
          updatedAt: new Date(),
        })
        .where(eq(driverWallets.userId, payout.driverId));
    }

    const [updated] = await db.update(driverPayoutHistory)
      .set({
        status: "failed",
        failureReason: reason,
      })
      .where(eq(driverPayoutHistory.id, payoutId))
      .returning();
    return updated || null;
  }

  async getDriverPayoutHistoryV2(driverId: string): Promise<DriverPayoutHistory[]> {
    return db.select().from(driverPayoutHistory)
      .where(eq(driverPayoutHistory.driverId, driverId))
      .orderBy(desc(driverPayoutHistory.createdAt));
  }

  async getPendingPayoutsV2(): Promise<DriverPayoutHistory[]> {
    return db.select().from(driverPayoutHistory)
      .where(eq(driverPayoutHistory.status, "pending"))
      .orderBy(driverPayoutHistory.createdAt);
  }

  // ZIBA Platform Wallet (Phase 25)
  async getZibaPlatformWallet(): Promise<ZibaWallet | null> {
    const [wallet] = await db.select().from(zibaWallet).limit(1);
    if (!wallet) {
      const [created] = await db.insert(zibaWallet).values({}).returning();
      return created;
    }
    return wallet;
  }

  // Financial Audit Logs
  async createFinancialAuditLog(data: InsertFinancialAuditLog): Promise<FinancialAuditLog> {
    const [log] = await db.insert(financialAuditLogs).values(data).returning();
    return log;
  }

  async getFinancialAuditLogs(filters?: { rideId?: string; userId?: string; eventType?: string }, limit = 100): Promise<FinancialAuditLog[]> {
    let query = db.select().from(financialAuditLogs);

    if (filters?.rideId) {
      query = query.where(eq(financialAuditLogs.rideId, filters.rideId)) as any;
    }
    if (filters?.userId) {
      query = query.where(eq(financialAuditLogs.userId, filters.userId)) as any;
    }

    return query.orderBy(desc(financialAuditLogs.createdAt)).limit(limit);
  }

  // Abuse Flags
  async getAbuseFlags(status?: "pending" | "reviewed" | "resolved" | "dismissed"): Promise<AbuseFlagWithDetails[]> {
    let query = db.select().from(abuseFlags);
    if (status) {
      query = query.where(eq(abuseFlags.status, status)) as any;
    }
    const flags = await query.orderBy(desc(abuseFlags.createdAt));
    
    const flagsWithDetails: AbuseFlagWithDetails[] = [];
    for (const flag of flags) {
      let userName: string | undefined;
      if (flag.userRole === "rider") {
        const profile = await this.getRiderProfile(flag.userId);
        userName = profile?.fullName || undefined;
      } else if (flag.userRole === "driver") {
        const profile = await this.getDriverProfile(flag.userId);
        userName = profile?.fullName || undefined;
      }
      
      let reviewedByName: string | undefined;
      if (flag.reviewedByUserId) {
        const reviewer = await this.getDriverProfile(flag.reviewedByUserId);
        reviewedByName = reviewer?.fullName || undefined;
      }
      
      flagsWithDetails.push({ ...flag, userName, reviewedByName });
    }
    return flagsWithDetails;
  }

  async resolveAbuseFlag(
    flagId: string,
    reviewedByUserId: string,
    status: "resolved" | "dismissed",
    reviewNotes?: string,
    penaltyApplied?: number
  ): Promise<AbuseFlag | null> {
    const [flag] = await db.update(abuseFlags)
      .set({
        status,
        reviewedByUserId,
        reviewNotes,
        penaltyApplied: penaltyApplied?.toString(),
        resolvedAt: new Date(),
      })
      .where(eq(abuseFlags.id, flagId))
      .returning();
    return flag || null;
  }

  // Escrows
  async getEscrowsByStatus(status: "pending" | "locked" | "released" | "held" | "refunded"): Promise<Escrow[]> {
    return db.select().from(escrows)
      .where(eq(escrows.status, status))
      .orderBy(desc(escrows.createdAt));
  }

  async getEscrowByRideId(rideId: string): Promise<Escrow | null> {
    const [escrow] = await db.select().from(escrows)
      .where(eq(escrows.rideId, rideId))
      .limit(1);
    return escrow || null;
  }

  // Rider Transaction History
  async getRiderTransactionHistory(riderId: string): Promise<RiderTransactionHistory[]> {
    return db.select().from(riderTransactionHistory)
      .where(eq(riderTransactionHistory.riderId, riderId))
      .orderBy(desc(riderTransactionHistory.createdAt));
  }
}

export const storage = new DatabaseStorage();
