import { 
  userRoles, 
  driverProfiles, 
  riderProfiles, 
  trips,
  users,
  type UserRole, 
  type InsertUserRole,
  type DriverProfile,
  type InsertDriverProfile,
  type RiderProfile,
  type InsertRiderProfile,
  type Trip,
  type InsertTrip
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, count } from "drizzle-orm";

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
    const [trip] = await db.insert(trips).values(data).returning();
    return trip;
  }

  async getAvailableTrips(): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.status, "requested"))
      .orderBy(desc(trips.createdAt));
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
          eq(trips.status, "requested")
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

    return {
      totalDrivers: driverStats?.count || 0,
      pendingDrivers: pendingStats?.count || 0,
      totalTrips: tripStats?.count || 0,
      activeTrips: activeStats?.count || 0,
      totalRiders: riderStats?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
