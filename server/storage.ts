import { 
  userRoles, 
  driverProfiles, 
  riderProfiles, 
  trips,
  users,
  payoutTransactions,
  type UserRole, 
  type InsertUserRole,
  type DriverProfile,
  type InsertDriverProfile,
  type RiderProfile,
  type InsertRiderProfile,
  type Trip,
  type InsertTrip,
  type PayoutTransaction,
  type InsertPayoutTransaction
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, count, sql, sum } from "drizzle-orm";
import { calculateFare } from "./pricing";

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
  getAllRidersWithDetails(): Promise<any[]>;

  createTrip(data: InsertTrip): Promise<Trip>;
  getAvailableTrips(): Promise<Trip[]>;
  getDriverCurrentTrip(driverId: string): Promise<Trip | null>;
  getRiderCurrentTrip(riderId: string): Promise<Trip | null>;
  getRiderTripHistory(riderId: string): Promise<Trip[]>;
  acceptTrip(tripId: string, driverId: string): Promise<Trip | null>;
  updateTripStatus(tripId: string, driverId: string, status: string): Promise<Trip | null>;
  cancelTrip(tripId: string, riderId: string): Promise<Trip | null>;
  adminCancelTrip(tripId: string): Promise<Trip | null>;
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
    return trip || null;
  }

  async cancelTrip(tripId: string, riderId: string): Promise<Trip | null> {
    const [trip] = await db
      .update(trips)
      .set({ status: "cancelled" })
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

  async adminCancelTrip(tripId: string): Promise<Trip | null> {
    const [trip] = await db
      .update(trips)
      .set({ status: "cancelled" })
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
}

export const storage = new DatabaseStorage();
