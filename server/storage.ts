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
  type PayoutTransaction,
  type InsertPayoutTransaction,
  type Notification,
  type InsertNotification,
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
  type InsertIncentiveEarning
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, count, sql, sum, gte, lte } from "drizzle-orm";
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
}

export const storage = new DatabaseStorage();
