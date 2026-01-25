import { 
  userRoles, 
  driverProfiles, 
  riderProfiles, 
  directorProfiles,
  trips,
  users,
  payoutTransactions,
  notifications,
  ratings,
  disputes,
  type UserRole, 
  type InsertUserRole,
  type DriverProfile,
  type InsertDriverProfile,
  type RiderProfile,
  type InsertRiderProfile,
  type DirectorProfile,
  type InsertDirectorProfile,
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
  type UpdateDispute
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
}

export const storage = new DatabaseStorage();
