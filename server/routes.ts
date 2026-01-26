import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { insertDriverProfileSchema, insertTripSchema, updateDriverProfileSchema, insertIncentiveProgramSchema, insertCountrySchema, insertTaxRuleSchema, insertExchangeRateSchema, insertComplianceProfileSchema } from "@shared/schema";
import { evaluateDriverForIncentives, approveAndPayIncentive, revokeIncentive, evaluateAllDrivers } from "./incentives";

const requireRole = (allowedRoles: string[]): RequestHandler => {
  return async (req: any, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userRole = await storage.getUserRole(userId);
      if (!userRole || !allowedRoles.includes(userRole.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // For admin role, check if still valid (time-bound)
      if (userRole.role === "admin") {
        const { valid, reason } = await storage.isAdminValid(userId);
        if (!valid) {
          return res.status(403).json({ message: reason || "Admin access expired" });
        }
      }
      
      req.userRole = userRole.role;
      req.userRoleData = userRole;
      next();
    } catch (error) {
      console.error("Error checking role:", error);
      return res.status(500).json({ message: "Failed to verify access" });
    }
  };
};

// SUPER_ADMIN only middleware - strictest access control
const requireSuperAdmin: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userRole = await storage.getUserRole(userId);
    if (!userRole || userRole.role !== "super_admin") {
      return res.status(403).json({ message: "Super Admin access required" });
    }
    
    req.userRole = userRole.role;
    req.userRoleData = userRole;
    next();
  } catch (error) {
    console.error("Error checking super admin role:", error);
    return res.status(500).json({ message: "Failed to verify access" });
  }
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/user/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      if (!userRole) {
        return res.json(null);
      }
      return res.json({ role: userRole.role });
    } catch (error) {
      console.error("Error getting user role:", error);
      return res.status(500).json({ message: "Failed to get user role" });
    }
  });

  app.post("/api/user/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;

      if (!["driver", "rider"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const existingRole = await storage.getUserRole(userId);
      if (existingRole) {
        return res.status(400).json({ message: "Role already assigned" });
      }

      const userRole = await storage.createUserRole({ userId, role });

      if (role === "rider") {
        await storage.createRiderProfile({ userId });
      }

      return res.json({ role: userRole.role });
    } catch (error) {
      console.error("Error setting user role:", error);
      return res.status(500).json({ message: "Failed to set user role" });
    }
  });

  // Theme preference routes
  app.get("/api/user/theme-preference", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preference = await storage.getThemePreference(userId);
      return res.json({ themePreference: preference });
    } catch (error) {
      console.error("Error getting theme preference:", error);
      return res.status(500).json({ message: "Failed to get theme preference" });
    }
  });

  app.post("/api/user/theme-preference", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { themePreference } = req.body;

      if (!["light", "dark", "system"].includes(themePreference)) {
        return res.status(400).json({ message: "Invalid theme preference" });
      }

      await storage.updateThemePreference(userId, themePreference);
      return res.json({ themePreference });
    } catch (error) {
      console.error("Error updating theme preference:", error);
      return res.status(500).json({ message: "Failed to update theme preference" });
    }
  });

  app.get("/api/admin/exists", async (req: any, res) => {
    try {
      const existingAdmins = await storage.getAdminCount();
      return res.json({ exists: existingAdmins > 0 });
    } catch (error) {
      console.error("Error checking admin:", error);
      return res.status(500).json({ message: "Failed to check admin" });
    }
  });

  app.post("/api/admin/seed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const existingAdmins = await storage.getAdminCount();
      if (existingAdmins > 0) {
        return res.status(403).json({ message: "Admin already exists" });
      }

      const existingRole = await storage.getUserRole(userId);
      if (existingRole) {
        return res.status(400).json({ message: "You already have a role assigned" });
      }

      const userRole = await storage.createUserRole({ userId, role: "admin" });
      return res.json({ role: userRole.role, message: "You are now an admin" });
    } catch (error) {
      console.error("Error seeding admin:", error);
      return res.status(500).json({ message: "Failed to seed admin" });
    }
  });

  app.get("/api/driver/profile", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getDriverProfile(userId);
      if (!profile) {
        return res.json(null);
      }
      return res.json(profile);
    } catch (error) {
      console.error("Error getting driver profile:", error);
      return res.status(500).json({ message: "Failed to get driver profile" });
    }
  });

  app.post("/api/driver/profile", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertDriverProfileSchema.safeParse({ ...req.body, userId });
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid profile data", errors: parsed.error.flatten() });
      }

      const existingProfile = await storage.getDriverProfile(userId);
      if (existingProfile) {
        return res.status(400).json({ message: "Profile already exists" });
      }

      const profile = await storage.createDriverProfile(parsed.data);
      return res.json(profile);
    } catch (error) {
      console.error("Error creating driver profile:", error);
      return res.status(500).json({ message: "Failed to create driver profile" });
    }
  });

  app.patch("/api/driver/profile", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = updateDriverProfileSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid profile data", errors: parsed.error.flatten() });
      }

      const profile = await storage.updateDriverProfile(userId, parsed.data);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      return res.json(profile);
    } catch (error) {
      console.error("Error updating driver profile:", error);
      return res.status(500).json({ message: "Failed to update driver profile" });
    }
  });

  app.post("/api/driver/toggle-online", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isOnline } = req.body;

      const profile = await storage.getDriverProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (profile.status !== "approved") {
        return res.status(403).json({ message: "Driver must be approved to go online" });
      }

      const updated = await storage.updateDriverOnlineStatus(userId, isOnline);
      return res.json(updated);
    } catch (error) {
      console.error("Error toggling online status:", error);
      return res.status(500).json({ message: "Failed to toggle online status" });
    }
  });

  app.get("/api/driver/available-rides", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getDriverProfile(userId);
      
      if (!profile || profile.status !== "approved" || !profile.isOnline) {
        return res.json([]);
      }

      const rides = await storage.getAvailableTrips();
      return res.json(rides);
    } catch (error) {
      console.error("Error getting available rides:", error);
      return res.status(500).json({ message: "Failed to get available rides" });
    }
  });

  app.get("/api/driver/current-trip", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trip = await storage.getDriverCurrentTrip(userId);
      return res.json(trip);
    } catch (error) {
      console.error("Error getting current trip:", error);
      return res.status(500).json({ message: "Failed to get current trip" });
    }
  });

  app.post("/api/driver/accept-ride/:tripId", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;

      const profile = await storage.getDriverProfile(userId);
      if (!profile || profile.status !== "approved") {
        return res.status(403).json({ message: "Driver not approved" });
      }

      const currentTrip = await storage.getDriverCurrentTrip(userId);
      if (currentTrip) {
        return res.status(400).json({ message: "Already have an active trip" });
      }

      const trip = await storage.acceptTrip(tripId, userId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found or already accepted" });
      }

      await storage.createNotification({
        userId: trip.riderId,
        role: "rider",
        title: "Driver Accepted",
        message: `A driver has accepted your ride from ${trip.pickupLocation} to ${trip.dropoffLocation}`,
        type: "success",
      });

      return res.json(trip);
    } catch (error) {
      console.error("Error accepting ride:", error);
      return res.status(500).json({ message: "Failed to accept ride" });
    }
  });

  app.post("/api/driver/trip/:tripId/status", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const { status } = req.body;

      if (!["in_progress", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const trip = await storage.updateTripStatus(tripId, userId, status);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (status === "in_progress") {
        await storage.createNotification({
          userId: trip.riderId,
          role: "rider",
          title: "Trip Started",
          message: "Your trip is now in progress. Enjoy your ride!",
          type: "info",
        });
      } else if (status === "completed") {
        await storage.createNotification({
          userId: trip.riderId,
          role: "rider",
          title: "Trip Completed",
          message: `Your trip has been completed. Fare: $${trip.fareAmount}`,
          type: "success",
        });
        
        await storage.notifyAdminsAndDirectors(
          "Trip Completed",
          `Trip completed. Fare: $${trip.fareAmount}, Commission: $${trip.commissionAmount}`,
          "success"
        );

        // Phase 11: Credit driver and ZIBA wallets
        if (trip.driverPayout && trip.commissionAmount) {
          try {
            // Get or create driver wallet
            const driverWallet = await storage.getOrCreateWallet(userId, "driver");
            
            // Credit driver wallet with payout amount
            await storage.creditWallet(
              driverWallet.id,
              trip.driverPayout,
              "trip",
              tripId,
              undefined,
              `Earnings from trip: ${trip.pickupLocation} → ${trip.dropoffLocation}`
            );

            // Credit ZIBA wallet with commission
            const zibaWallet = await storage.getZibaWallet();
            await storage.creditWallet(
              zibaWallet.id,
              trip.commissionAmount,
              "trip",
              tripId,
              undefined,
              `Commission from trip: ${trip.pickupLocation} → ${trip.dropoffLocation}`
            );
          } catch (walletError) {
            console.error("Error crediting wallets:", walletError);
            // Don't fail the trip completion if wallet credit fails
          }
        }
      }

      return res.json(trip);
    } catch (error) {
      console.error("Error updating trip status:", error);
      return res.status(500).json({ message: "Failed to update trip status" });
    }
  });

  app.get("/api/driver/trip-history", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, startDate, endDate } = req.query;
      const filter: any = {};
      if (status) filter.status = status;
      if (startDate) filter.startDate = startDate;
      if (endDate) filter.endDate = endDate;
      
      const trips = await storage.getDriverTripHistory(userId, filter);
      return res.json(trips);
    } catch (error) {
      console.error("Error getting driver trip history:", error);
      return res.status(500).json({ message: "Failed to get trip history" });
    }
  });

  app.get("/api/rider/profile", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getRiderProfile(userId);
      return res.json(profile || null);
    } catch (error) {
      console.error("Error getting rider profile:", error);
      return res.status(500).json({ message: "Failed to get rider profile" });
    }
  });

  app.get("/api/rider/current-trip", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trip = await storage.getRiderCurrentTrip(userId);
      return res.json(trip);
    } catch (error) {
      console.error("Error getting current trip:", error);
      return res.status(500).json({ message: "Failed to get current trip" });
    }
  });

  app.get("/api/rider/trip-history", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, startDate, endDate } = req.query;
      const filter: any = {};
      if (status) filter.status = status;
      if (startDate) filter.startDate = startDate;
      if (endDate) filter.endDate = endDate;
      
      const hasFilters = Object.keys(filter).length > 0;
      const trips = hasFilters 
        ? await storage.getRiderTripHistoryFiltered(userId, filter)
        : await storage.getRiderTripHistory(userId);
      return res.json(trips);
    } catch (error) {
      console.error("Error getting trip history:", error);
      return res.status(500).json({ message: "Failed to get trip history" });
    }
  });

  app.post("/api/rider/request-ride", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertTripSchema.safeParse({ ...req.body, riderId: userId });
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid trip data", errors: parsed.error.flatten() });
      }

      const currentTrip = await storage.getRiderCurrentTrip(userId);
      if (currentTrip) {
        return res.status(400).json({ message: "Already have an active trip" });
      }

      const trip = await storage.createTrip(parsed.data);
      
      await storage.notifyAllDrivers(
        "New Ride Request",
        `New ride from ${parsed.data.pickupLocation} to ${parsed.data.dropoffLocation}`,
        "info"
      );
      
      return res.json(trip);
    } catch (error) {
      console.error("Error requesting ride:", error);
      return res.status(500).json({ message: "Failed to request ride" });
    }
  });

  app.post("/api/rider/cancel-ride/:tripId", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const { reason } = req.body || {};

      const trip = await storage.cancelTrip(tripId, userId, reason);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found or cannot be cancelled" });
      }

      return res.json(trip);
    } catch (error) {
      console.error("Error cancelling ride:", error);
      return res.status(500).json({ message: "Failed to cancel ride" });
    }
  });

  app.get("/api/admin/drivers", isAuthenticated, requireRole(["admin", "director"]), async (req: any, res) => {
    try {
      const drivers = await storage.getAllDriversWithDetails();
      return res.json(drivers);
    } catch (error) {
      console.error("Error getting drivers:", error);
      return res.status(500).json({ message: "Failed to get drivers" });
    }
  });

  app.get("/api/admin/trips", isAuthenticated, requireRole(["admin", "director"]), async (req: any, res) => {
    try {
      const { status, startDate, endDate, driverId, riderId } = req.query;
      const filter: any = {};
      if (status) filter.status = status;
      if (startDate) filter.startDate = startDate;
      if (endDate) filter.endDate = endDate;
      if (driverId) filter.driverId = driverId;
      if (riderId) filter.riderId = riderId;
      
      const hasFilters = Object.keys(filter).length > 0;
      const trips = hasFilters 
        ? await storage.getFilteredTrips(filter)
        : await storage.getAllTripsWithDetails();
      return res.json(trips);
    } catch (error) {
      console.error("Error getting trips:", error);
      return res.status(500).json({ message: "Failed to get trips" });
    }
  });

  app.get("/api/trips/:tripId", isAuthenticated, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (userRole?.role === "admin" || userRole?.role === "director") {
        return res.json(trip);
      }
      if (userRole?.role === "driver" && trip.driverId === userId) {
        return res.json(trip);
      }
      if (userRole?.role === "rider" && trip.riderId === userId) {
        return res.json(trip);
      }

      return res.status(403).json({ message: "Access denied" });
    } catch (error) {
      console.error("Error getting trip:", error);
      return res.status(500).json({ message: "Failed to get trip" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, requireRole(["admin", "director", "super_admin"]), async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error getting stats:", error);
      return res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // ==========================================
  // SUPER_ADMIN ONLY: Admin Appointment System
  // ==========================================

  // Get all admins (SUPER_ADMIN only)
  app.get("/api/super-admin/admins", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const admins = await storage.getAllAdmins();
      return res.json(admins);
    } catch (error) {
      console.error("Error getting admins:", error);
      return res.status(500).json({ message: "Failed to get admins" });
    }
  });

  // Appoint a new admin (SUPER_ADMIN only)
  app.post("/api/super-admin/appoint-admin", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId, adminStartAt, adminEndAt, adminPermissions } = req.body;
      const appointedBy = req.user.claims.sub;

      if (!userId || !adminStartAt || !adminEndAt || !adminPermissions) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!Array.isArray(adminPermissions) || adminPermissions.length === 0) {
        return res.status(400).json({ message: "At least one permission scope is required" });
      }

      const startDate = new Date(adminStartAt);
      const endDate = new Date(adminEndAt);

      if (endDate <= startDate) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year max
      if (endDate.getTime() - startDate.getTime() > maxDuration) {
        return res.status(400).json({ message: "Admin appointment cannot exceed 1 year" });
      }

      const admin = await storage.appointAdmin(userId, startDate, endDate, adminPermissions, appointedBy);
      
      await storage.createAuditLog({
        action: "ADMIN_APPOINTED",
        entityType: "user_role",
        entityId: userId,
        performedByUserId: appointedBy,
        performedByRole: "super_admin",
        metadata: JSON.stringify({ adminStartAt, adminEndAt, adminPermissions })
      });

      return res.json(admin);
    } catch (error) {
      console.error("Error appointing admin:", error);
      return res.status(500).json({ message: "Failed to appoint admin" });
    }
  });

  // Revoke admin access (SUPER_ADMIN only)
  app.post("/api/super-admin/revoke-admin/:userId", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const revokedBy = req.user.claims.sub;

      const admin = await storage.revokeAdmin(userId);
      if (!admin) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.createAuditLog({
        action: "ADMIN_REVOKED",
        entityType: "user_role",
        entityId: userId,
        performedByUserId: revokedBy,
        performedByRole: "super_admin",
        metadata: JSON.stringify({ oldRole: "admin", newRole: "rider" })
      });

      return res.json(admin);
    } catch (error) {
      console.error("Error revoking admin:", error);
      return res.status(500).json({ message: "Failed to revoke admin" });
    }
  });

  // Update admin permissions (SUPER_ADMIN only)
  app.patch("/api/super-admin/admin/:userId/permissions", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { adminPermissions, adminEndAt } = req.body;
      const updatedBy = req.user.claims.sub;

      if (!adminPermissions || !Array.isArray(adminPermissions) || adminPermissions.length === 0) {
        return res.status(400).json({ message: "At least one permission scope is required" });
      }

      const endDate = adminEndAt ? new Date(adminEndAt) : undefined;
      const admin = await storage.updateAdminPermissions(userId, adminPermissions, endDate);
      
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      await storage.createAuditLog({
        action: "ADMIN_PERMISSIONS_UPDATED",
        entityType: "user_role",
        entityId: userId,
        performedByUserId: updatedBy,
        performedByRole: "super_admin",
        metadata: JSON.stringify({ adminPermissions, adminEndAt })
      });

      return res.json(admin);
    } catch (error) {
      console.error("Error updating admin permissions:", error);
      return res.status(500).json({ message: "Failed to update admin permissions" });
    }
  });

  // Check admin validity (SUPER_ADMIN only)
  app.get("/api/super-admin/admin/:userId/validity", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const result = await storage.isAdminValid(userId);
      return res.json(result);
    } catch (error) {
      console.error("Error checking admin validity:", error);
      return res.status(500).json({ message: "Failed to check admin validity" });
    }
  });

  // Trigger expired admin cleanup (SUPER_ADMIN only - can also be scheduled)
  app.post("/api/super-admin/expire-admins", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const count = await storage.checkAndExpireAdmins();
      
      await storage.createAuditLog({
        action: "ADMINS_EXPIRED",
        entityType: "system",
        entityId: "batch",
        performedByUserId: req.user.claims.sub,
        performedByRole: "super_admin",
        metadata: JSON.stringify({ expiredCount: count })
      });

      return res.json({ expiredCount: count });
    } catch (error) {
      console.error("Error expiring admins:", error);
      return res.status(500).json({ message: "Failed to expire admins" });
    }
  });

  // ==========================================
  // ROLE APPOINTMENTS (SUPER_ADMIN ONLY)
  // ==========================================

  // Get all users with their roles (SUPER_ADMIN only)
  app.get("/api/super-admin/users-with-roles", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const usersWithRoles = await storage.getAllUsersWithRoles();
      return res.json(usersWithRoles);
    } catch (error) {
      console.error("Error getting users with roles:", error);
      return res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Promote user to admin (SUPER_ADMIN only)
  app.post("/api/super-admin/promote/:userId", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const promotedBy = req.user.claims.sub;
      
      // Check if user exists
      const targetRole = await storage.getUserRole(userId);
      if (targetRole?.role === "super_admin") {
        return res.status(400).json({ message: "Cannot modify super_admin role" });
      }
      if (targetRole?.role === "admin") {
        return res.status(400).json({ message: "User is already an admin" });
      }
      
      const updatedRole = await storage.promoteToAdmin(userId, promotedBy);
      
      await storage.createAuditLog({
        action: "ROLE_PROMOTE_TO_ADMIN",
        entityType: "user_role",
        entityId: userId,
        performedByUserId: promotedBy,
        performedByRole: "super_admin",
        metadata: JSON.stringify({ oldRole: targetRole?.role || null, newRole: "admin" })
      });
      
      return res.json(updatedRole);
    } catch (error) {
      console.error("Error promoting user:", error);
      return res.status(500).json({ message: "Failed to promote user" });
    }
  });

  // Demote admin to rider (SUPER_ADMIN only)
  app.post("/api/super-admin/demote/:userId", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const demotedBy = req.user.claims.sub;
      
      // Check if user is super_admin
      const targetRole = await storage.getUserRole(userId);
      if (targetRole?.role === "super_admin") {
        return res.status(400).json({ message: "Cannot demote super_admin" });
      }
      if (targetRole?.role !== "admin") {
        return res.status(400).json({ message: "User is not an admin" });
      }
      
      const updatedRole = await storage.demoteToRider(userId);
      
      await storage.createAuditLog({
        action: "ROLE_DEMOTE_TO_RIDER",
        entityType: "user_role",
        entityId: userId,
        performedByUserId: demotedBy,
        performedByRole: "super_admin",
        metadata: JSON.stringify({ oldRole: "admin", newRole: "rider" })
      });
      
      return res.json(updatedRole);
    } catch (error) {
      console.error("Error demoting user:", error);
      return res.status(500).json({ message: "Failed to demote user" });
    }
  });

  // ==========================================
  // END SUPER_ADMIN ONLY ROUTES
  // ==========================================

  app.post("/api/admin/driver/:driverId/status", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { driverId } = req.params;
      const { status } = req.body;

      if (!["pending", "approved", "suspended"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const driver = await storage.updateDriverStatus(driverId, status);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }

      if (status === "approved") {
        await storage.createNotification({
          userId: driverId,
          role: "driver",
          title: "Account Approved",
          message: "Congratulations! Your driver account has been approved. You can now go online and accept rides.",
          type: "success",
        });
      } else if (status === "suspended") {
        await storage.createNotification({
          userId: driverId,
          role: "driver",
          title: "Account Suspended",
          message: "Your driver account has been suspended. Please contact support for more information.",
          type: "warning",
        });
      }

      return res.json(driver);
    } catch (error) {
      console.error("Error updating driver status:", error);
      return res.status(500).json({ message: "Failed to update driver status" });
    }
  });

  // Approval Queue Endpoints
  app.get("/api/admin/approvals", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { type, status } = req.query;
      
      if (type === "driver") {
        const drivers = await storage.getAllDriversWithDetails();
        const filtered = status ? drivers.filter((d: any) => d.status === status) : drivers;
        return res.json(filtered);
      }
      
      return res.json([]);
    } catch (error) {
      console.error("Error fetching approvals:", error);
      return res.status(500).json({ message: "Failed to fetch approvals" });
    }
  });

  app.post("/api/admin/approvals/approve", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { type, id } = req.body;
      
      if (!type || !id) {
        return res.status(400).json({ message: "Type and ID are required" });
      }
      
      if (type === "driver") {
        const driver = await storage.updateDriverStatus(id, "approved");
        if (!driver) {
          return res.status(404).json({ message: "Driver not found" });
        }
        
        await storage.createNotification({
          userId: id,
          role: "driver",
          title: "Account Approved",
          message: "Congratulations! Your driver account has been approved. You can now go online and accept rides.",
          type: "success",
        });
        
        return res.json({ success: true, driver });
      }
      
      return res.status(400).json({ message: "Invalid type" });
    } catch (error) {
      console.error("Error approving:", error);
      return res.status(500).json({ message: "Failed to approve" });
    }
  });

  app.post("/api/admin/approvals/reject", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { type, id, reason } = req.body;
      
      if (!type || !id) {
        return res.status(400).json({ message: "Type and ID are required" });
      }
      
      if (type === "driver") {
        const driver = await storage.updateDriverStatus(id, "suspended");
        if (!driver) {
          return res.status(404).json({ message: "Driver not found" });
        }
        
        await storage.createNotification({
          userId: id,
          role: "driver",
          title: "Application Rejected",
          message: reason || "Your driver application has been rejected. Please contact support for more information.",
          type: "warning",
        });
        
        return res.json({ success: true, driver });
      }
      
      return res.status(400).json({ message: "Invalid type" });
    } catch (error) {
      console.error("Error rejecting:", error);
      return res.status(500).json({ message: "Failed to reject" });
    }
  });

  app.get("/api/admin/riders", isAuthenticated, requireRole(["admin", "director"]), async (req: any, res) => {
    try {
      const riders = await storage.getAllRidersWithDetails();
      return res.json(riders);
    } catch (error) {
      console.error("Error getting riders:", error);
      return res.status(500).json({ message: "Failed to get riders" });
    }
  });

  app.post("/api/admin/trip/:tripId/cancel", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { reason } = req.body || {};

      const trip = await storage.adminCancelTrip(tripId, reason);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found or already completed/cancelled" });
      }

      return res.json(trip);
    } catch (error) {
      console.error("Error cancelling trip:", error);
      return res.status(500).json({ message: "Failed to cancel trip" });
    }
  });

  app.get("/api/admin/payouts", isAuthenticated, requireRole(["admin", "director"]), async (req: any, res) => {
    try {
      const payouts = await storage.getAllPayoutTransactions();
      return res.json(payouts);
    } catch (error) {
      console.error("Error getting payouts:", error);
      return res.status(500).json({ message: "Failed to get payouts" });
    }
  });

  app.get("/api/admin/payouts/pending", isAuthenticated, requireRole(["admin", "director"]), async (req: any, res) => {
    try {
      const payouts = await storage.getPendingPayouts();
      return res.json(payouts);
    } catch (error) {
      console.error("Error getting pending payouts:", error);
      return res.status(500).json({ message: "Failed to get pending payouts" });
    }
  });

  app.post("/api/admin/payout/:transactionId/mark-paid", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { transactionId } = req.params;
      const adminId = req.user?.id;

      const payout = await storage.markPayoutAsPaid(transactionId, adminId);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found or already paid" });
      }

      await storage.createNotification({
        userId: payout.driverId,
        role: "driver",
        title: "Payout Processed",
        message: `Your payout of $${payout.amount} has been marked as paid.`,
        type: "success",
      });

      return res.json(payout);
    } catch (error) {
      console.error("Error marking payout as paid:", error);
      return res.status(500).json({ message: "Failed to mark payout as paid" });
    }
  });

  app.get("/api/admin/directors", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const directors = await storage.getAllDirectorsWithDetails();
      return res.json(directors);
    } catch (error) {
      console.error("Error getting directors:", error);
      return res.status(500).json({ message: "Failed to get directors" });
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      return res.json(notifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      return res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      return res.json({ count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      return res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  app.post("/api/notifications/:notificationId/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { notificationId } = req.params;
      const notification = await storage.markNotificationAsRead(notificationId, userId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      return res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  // Rating endpoints
  app.post("/api/ratings", isAuthenticated, requireRole(["driver", "rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId, score, comment } = req.body;

      if (!tripId || !score || score < 1 || score > 5) {
        return res.status(400).json({ message: "Valid tripId and score (1-5) are required" });
      }

      // Get trip details
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Check trip is completed
      if (trip.status !== "completed") {
        return res.status(400).json({ message: "Can only rate completed trips" });
      }

      // Check user participated in the trip
      const userRole = await storage.getUserRole(userId);
      if (!userRole) {
        return res.status(403).json({ message: "User role not found" });
      }

      let targetUserId: string;
      let raterRole: "rider" | "driver";

      if (userRole.role === "rider" && trip.riderId === userId) {
        targetUserId = trip.driverId;
        raterRole = "rider";
      } else if (userRole.role === "driver" && trip.driverId === userId) {
        targetUserId = trip.riderId;
        raterRole = "driver";
      } else {
        return res.status(403).json({ message: "You did not participate in this trip" });
      }

      // Check if already rated
      const existingRating = await storage.getRatingByTripAndRater(tripId, userId);
      if (existingRating) {
        return res.status(400).json({ message: "You have already rated this trip" });
      }

      // Create rating
      const rating = await storage.createRating({
        tripId,
        raterRole,
        raterId: userId,
        targetUserId,
        score,
        comment: comment?.substring(0, 300) || null,
      });

      // Update target user's average rating
      const targetRole = raterRole === "rider" ? "driver" : "rider";
      await storage.updateUserAverageRating(targetUserId, targetRole);

      return res.json(rating);
    } catch (error) {
      console.error("Error creating rating:", error);
      return res.status(500).json({ message: "Failed to create rating" });
    }
  });

  app.get("/api/ratings/trip/:tripId", isAuthenticated, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const ratings = await storage.getTripRatings(tripId);
      return res.json(ratings);
    } catch (error) {
      console.error("Error getting trip ratings:", error);
      return res.status(500).json({ message: "Failed to get ratings" });
    }
  });

  app.get("/api/ratings/check/:tripId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const existingRating = await storage.getRatingByTripAndRater(tripId, userId);
      return res.json({ hasRated: !!existingRating, rating: existingRating });
    } catch (error) {
      console.error("Error checking rating:", error);
      return res.status(500).json({ message: "Failed to check rating" });
    }
  });

  app.get("/api/admin/ratings", isAuthenticated, requireRole(["admin", "director"]), async (req: any, res) => {
    try {
      const ratings = await storage.getAllRatings();
      return res.json(ratings);
    } catch (error) {
      console.error("Error getting all ratings:", error);
      return res.status(500).json({ message: "Failed to get ratings" });
    }
  });

  // Dispute endpoints
  app.post("/api/disputes", isAuthenticated, requireRole(["driver", "rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId, category, description } = req.body;
      
      if (!tripId || !category || !description) {
        return res.status(400).json({ message: "Trip ID, category, and description are required" });
      }
      
      if (description.length > 500) {
        return res.status(400).json({ message: "Description must be 500 characters or less" });
      }
      
      // Get trip to validate
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Check trip status - only completed or cancelled trips
      if (trip.status !== "completed" && trip.status !== "cancelled") {
        return res.status(400).json({ message: "Disputes can only be filed for completed or cancelled trips" });
      }
      
      // Check if user participated in this trip
      const isRider = trip.riderId === userId;
      const isDriver = trip.driverId === userId;
      
      if (!isRider && !isDriver) {
        return res.status(403).json({ message: "You can only file disputes for trips you participated in" });
      }
      
      // Check for existing dispute by this user for this trip
      const existingDispute = await storage.getDisputeByTripAndUser(tripId, userId);
      if (existingDispute) {
        return res.status(400).json({ message: "You have already filed a dispute for this trip" });
      }
      
      // Determine roles and target
      const raisedByRole = isRider ? "rider" : "driver";
      const againstUserId = isRider ? trip.driverId : trip.riderId;
      
      if (!againstUserId) {
        return res.status(400).json({ message: "Cannot file dispute - other party not identified" });
      }
      
      const dispute = await storage.createDispute({
        tripId,
        raisedByRole,
        raisedById: userId,
        againstUserId,
        category,
        description,
      });
      
      return res.status(201).json(dispute);
    } catch (error) {
      console.error("Error creating dispute:", error);
      return res.status(500).json({ message: "Failed to create dispute" });
    }
  });

  app.get("/api/disputes/check/:tripId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const existingDispute = await storage.getDisputeByTripAndUser(tripId, userId);
      return res.json({ hasDispute: !!existingDispute, dispute: existingDispute });
    } catch (error) {
      console.error("Error checking dispute:", error);
      return res.status(500).json({ message: "Failed to check dispute" });
    }
  });

  app.get("/api/disputes/trip/:tripId", isAuthenticated, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const disputes = await storage.getTripDisputes(tripId);
      return res.json(disputes);
    } catch (error) {
      console.error("Error getting trip disputes:", error);
      return res.status(500).json({ message: "Failed to get disputes" });
    }
  });

  app.get("/api/admin/disputes", isAuthenticated, requireRole(["admin", "director"]), async (req: any, res) => {
    try {
      const { status, category, raisedByRole } = req.query;
      const filter: any = {};
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (raisedByRole) filter.raisedByRole = raisedByRole;
      
      const disputes = Object.keys(filter).length > 0 
        ? await storage.getFilteredDisputes(filter)
        : await storage.getAllDisputes();
      return res.json(disputes);
    } catch (error) {
      console.error("Error getting disputes:", error);
      return res.status(500).json({ message: "Failed to get disputes" });
    }
  });

  app.get("/api/admin/disputes/:id", isAuthenticated, requireRole(["admin", "director"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const dispute = await storage.getDisputeById(id);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      return res.json(dispute);
    } catch (error) {
      console.error("Error getting dispute:", error);
      return res.status(500).json({ message: "Failed to get dispute" });
    }
  });

  app.patch("/api/admin/disputes/:id", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      
      const existingDispute = await storage.getDisputeById(id);
      if (!existingDispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      
      const dispute = await storage.updateDispute(id, updateData);
      return res.json(dispute);
    } catch (error) {
      console.error("Error updating dispute:", error);
      return res.status(500).json({ message: "Failed to update dispute" });
    }
  });

  // ============================================
  // PHASE 10A: REFUNDS & ADJUSTMENTS
  // ============================================

  // Create refund - Admin and Trip Coordinator only
  app.post("/api/refunds/create", isAuthenticated, requireRole(["admin", "trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { tripId, amount, type, reason, linkedDisputeId } = req.body;

      if (!tripId || !amount || !type || !reason) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const refundData = {
        tripId,
        riderId: trip.riderId,
        driverId: trip.driverId || undefined,
        amount: String(amount),
        type: type as "full" | "partial" | "adjustment",
        reason,
        createdByRole: userRole as "admin" | "trip_coordinator" | "finance",
        createdByUserId: userId,
        linkedDisputeId: linkedDisputeId || undefined,
      };

      const refund = await storage.createRefund(refundData);

      // Create audit log
      await storage.createAuditLog({
        action: "refund_created",
        entityType: "refund",
        entityId: refund.id,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ tripId, amount, type, reason }),
      });

      return res.json(refund);
    } catch (error) {
      console.error("Error creating refund:", error);
      return res.status(500).json({ message: "Failed to create refund" });
    }
  });

  // Approve refund - Admin can approve any, Trip Coordinator can approve <= $20
  app.post("/api/refunds/approve", isAuthenticated, requireRole(["admin", "trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { refundId } = req.body;

      const refund = await storage.getRefundById(refundId);
      if (!refund) {
        return res.status(404).json({ message: "Refund not found" });
      }

      if (refund.status !== "pending") {
        return res.status(400).json({ message: "Refund is not pending approval" });
      }

      // Trip Coordinator can only approve refunds <= $20
      if (userRole === "trip_coordinator" && parseFloat(refund.amount) > 20) {
        return res.status(403).json({ message: "Trip Coordinators can only approve refunds up to $20. Admin approval required." });
      }

      const updatedRefund = await storage.updateRefund(refundId, {
        status: "approved",
        approvedByUserId: userId,
      });

      // Create audit log
      await storage.createAuditLog({
        action: "refund_approved",
        entityType: "refund",
        entityId: refundId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ amount: refund.amount }),
      });

      return res.json(updatedRefund);
    } catch (error) {
      console.error("Error approving refund:", error);
      return res.status(500).json({ message: "Failed to approve refund" });
    }
  });

  // Reject refund - Admin only
  app.post("/api/refunds/reject", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { refundId, reason } = req.body;

      const refund = await storage.getRefundById(refundId);
      if (!refund) {
        return res.status(404).json({ message: "Refund not found" });
      }

      if (refund.status !== "pending") {
        return res.status(400).json({ message: "Refund is not pending" });
      }

      const updatedRefund = await storage.updateRefund(refundId, {
        status: "rejected",
        reason: reason || refund.reason,
      });

      // Create audit log
      await storage.createAuditLog({
        action: "refund_rejected",
        entityType: "refund",
        entityId: refundId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ reason }),
      });

      return res.json(updatedRefund);
    } catch (error) {
      console.error("Error rejecting refund:", error);
      return res.status(500).json({ message: "Failed to reject refund" });
    }
  });

  // Process refund - Finance only (processes approved refunds)
  app.post("/api/refunds/process", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { refundId } = req.body;

      const refund = await storage.getRefundById(refundId);
      if (!refund) {
        return res.status(404).json({ message: "Refund not found" });
      }

      if (refund.status !== "approved") {
        return res.status(400).json({ message: "Refund must be approved before processing" });
      }

      const updatedRefund = await storage.updateRefund(refundId, {
        status: "processed",
        processedByUserId: userId,
      });

      // Create audit log
      await storage.createAuditLog({
        action: "refund_processed",
        entityType: "refund",
        entityId: refundId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ amount: refund.amount }),
      });

      return res.json(updatedRefund);
    } catch (error) {
      console.error("Error processing refund:", error);
      return res.status(500).json({ message: "Failed to process refund" });
    }
  });

  // Reverse refund - Admin only
  app.post("/api/refunds/reverse", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { refundId, reason } = req.body;

      const refund = await storage.getRefundById(refundId);
      if (!refund) {
        return res.status(404).json({ message: "Refund not found" });
      }

      if (refund.status !== "processed") {
        return res.status(400).json({ message: "Only processed refunds can be reversed" });
      }

      const updatedRefund = await storage.updateRefund(refundId, {
        status: "reversed",
      });

      // Create audit log
      await storage.createAuditLog({
        action: "refund_reversed",
        entityType: "refund",
        entityId: refundId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ reason }),
      });

      return res.json(updatedRefund);
    } catch (error) {
      console.error("Error reversing refund:", error);
      return res.status(500).json({ message: "Failed to reverse refund" });
    }
  });

  // Get refunds with filtering
  app.get("/api/refunds", isAuthenticated, requireRole(["admin", "finance", "trip_coordinator", "director"]), async (req: any, res) => {
    try {
      const { tripId, status } = req.query;
      const filter: any = {};
      if (tripId) filter.tripId = tripId;
      if (status) filter.status = status;

      const refundsList = Object.keys(filter).length > 0
        ? await storage.getFilteredRefunds(filter)
        : await storage.getAllRefunds();
      return res.json(refundsList);
    } catch (error) {
      console.error("Error getting refunds:", error);
      return res.status(500).json({ message: "Failed to get refunds" });
    }
  });

  // Get refund audit trail
  app.get("/api/refunds/:refundId/audit", isAuthenticated, requireRole(["admin", "finance", "trip_coordinator", "director"]), async (req: any, res) => {
    try {
      const { refundId } = req.params;
      const auditLogs = await storage.getAuditLogsByEntity("refund", refundId);
      return res.json(auditLogs);
    } catch (error) {
      console.error("Error getting refund audit:", error);
      return res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // Rider view own refunds
  app.get("/api/rider/refunds", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const refundsList = await storage.getRiderRefunds(userId);
      return res.json(refundsList);
    } catch (error) {
      console.error("Error getting rider refunds:", error);
      return res.status(500).json({ message: "Failed to get refunds" });
    }
  });

  // Driver view refunds affecting them
  app.get("/api/driver/refunds", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const refundsList = await storage.getDriverRefunds(userId);
      return res.json(refundsList);
    } catch (error) {
      console.error("Error getting driver refunds:", error);
      return res.status(500).json({ message: "Failed to get refunds" });
    }
  });

  // Wallet adjustment - Admin only
  app.post("/api/wallet/adjust", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { targetUserId, amount, reason, linkedRefundId } = req.body;

      if (!targetUserId || amount === undefined || !reason) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const adjustment = await storage.createWalletAdjustment({
        userId: targetUserId,
        amount: String(amount),
        reason,
        linkedRefundId: linkedRefundId || undefined,
        createdByUserId: userId,
      });

      // Create audit log
      await storage.createAuditLog({
        action: "wallet_adjusted",
        entityType: "wallet_adjustment",
        entityId: adjustment.id,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ targetUserId, amount, reason }),
      });

      return res.json(adjustment);
    } catch (error) {
      console.error("Error creating wallet adjustment:", error);
      return res.status(500).json({ message: "Failed to create wallet adjustment" });
    }
  });

  // Get all wallet adjustments
  app.get("/api/wallet/adjustments", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const adjustments = await storage.getAllWalletAdjustments();
      return res.json(adjustments);
    } catch (error) {
      console.error("Error getting wallet adjustments:", error);
      return res.status(500).json({ message: "Failed to get wallet adjustments" });
    }
  });

  // ============= PHASE 10B: CHARGEBACKS & RECONCILIATION =============

  // Report a new chargeback (Finance/Admin only)
  app.post("/api/chargebacks/report", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { tripId, paymentProvider, externalReference, amount, currency, reason } = req.body;

      if (!tripId || !paymentProvider || !externalReference || amount === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify trip exists
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const chargeback = await storage.createChargeback({
        tripId,
        paymentProvider,
        externalReference,
        amount: String(amount),
        currency: currency || "USD",
        reason,
        status: "reported",
        reportedAt: new Date(),
      });

      // Audit log
      await storage.createAuditLog({
        action: "chargeback_reported",
        entityType: "chargeback",
        entityId: chargeback.id,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ tripId, paymentProvider, externalReference, amount }),
      });

      return res.json(chargeback);
    } catch (error) {
      console.error("Error reporting chargeback:", error);
      return res.status(500).json({ message: "Failed to report chargeback" });
    }
  });

  // Resolve a chargeback (Admin/Finance only)
  app.post("/api/chargebacks/resolve", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { chargebackId, status, reason } = req.body;

      if (!chargebackId || !status) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const validStatuses = ["under_review", "won", "lost", "reversed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const chargeback = await storage.getChargebackById(chargebackId);
      if (!chargeback) {
        return res.status(404).json({ message: "Chargeback not found" });
      }

      // Update with resolved info
      const updated = await storage.updateChargeback(chargebackId, { status, reason }, userId);

      // Audit log
      await storage.createAuditLog({
        action: `chargeback_${status}`,
        entityType: "chargeback",
        entityId: chargebackId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ previousStatus: chargeback.status, newStatus: status, reason }),
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error resolving chargeback:", error);
      return res.status(500).json({ message: "Failed to resolve chargeback" });
    }
  });

  // Get chargebacks with optional status filter
  app.get("/api/chargebacks", isAuthenticated, requireRole(["admin", "finance", "director"]), async (req: any, res) => {
    try {
      const { status } = req.query;
      const chargebacksList = await storage.getFilteredChargebacks({ status: status as string });
      return res.json(chargebacksList);
    } catch (error) {
      console.error("Error getting chargebacks:", error);
      return res.status(500).json({ message: "Failed to get chargebacks" });
    }
  });

  // Get chargeback audit trail
  app.get("/api/chargebacks/:chargebackId/audit", isAuthenticated, requireRole(["admin", "finance", "director"]), async (req: any, res) => {
    try {
      const { chargebackId } = req.params;
      const auditLogs = await storage.getAuditLogsByEntity("chargeback", chargebackId);
      return res.json(auditLogs);
    } catch (error) {
      console.error("Error getting chargeback audit:", error);
      return res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // Run reconciliation for a trip (Finance only)
  app.post("/api/reconciliation/run", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { tripId, actualAmount, provider } = req.body;

      if (!tripId || actualAmount === undefined || !provider) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const reconciliation = await storage.runReconciliation(tripId, String(actualAmount), provider);

      // Audit log
      await storage.createAuditLog({
        action: "reconciliation_run",
        entityType: "reconciliation",
        entityId: reconciliation.id,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ tripId, actualAmount, provider, status: reconciliation.status, variance: reconciliation.variance }),
      });

      return res.json(reconciliation);
    } catch (error) {
      console.error("Error running reconciliation:", error);
      return res.status(500).json({ message: "Failed to run reconciliation" });
    }
  });

  // Get reconciliations with optional status filter
  app.get("/api/reconciliation", isAuthenticated, requireRole(["admin", "finance", "director"]), async (req: any, res) => {
    try {
      const { status } = req.query;
      const reconciliations = await storage.getFilteredReconciliations({ status: status as string });
      return res.json(reconciliations);
    } catch (error) {
      console.error("Error getting reconciliations:", error);
      return res.status(500).json({ message: "Failed to get reconciliations" });
    }
  });

  // Mark reconciliation as reviewed (Finance/Admin only)
  app.post("/api/reconciliation/review", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { reconciliationId, status, notes } = req.body;

      if (!reconciliationId || !status) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const validStatuses = ["matched", "mismatched"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'matched' or 'mismatched'" });
      }

      const updated = await storage.updateReconciliation(reconciliationId, status, userId, notes);

      // Audit log
      await storage.createAuditLog({
        action: "reconciliation_reviewed",
        entityType: "reconciliation",
        entityId: reconciliationId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ status, notes }),
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error reviewing reconciliation:", error);
      return res.status(500).json({ message: "Failed to review reconciliation" });
    }
  });

  // Trip Coordinator can flag a trip as suspicious (attach chargeback evidence)
  app.post("/api/trips/:tripId/flag", isAuthenticated, requireRole(["admin", "trip_coordinator", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { tripId } = req.params;
      const { reason, evidence } = req.body;

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Create an audit log entry for the flag
      await storage.createAuditLog({
        action: "trip_flagged",
        entityType: "trip",
        entityId: tripId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ reason, evidence }),
      });

      return res.json({ message: "Trip flagged successfully", tripId });
    } catch (error) {
      console.error("Error flagging trip:", error);
      return res.status(500).json({ message: "Failed to flag trip" });
    }
  });

  // ========== PHASE 11 - WALLET ENDPOINTS ==========

  // Get current user's wallet
  app.get("/api/wallets/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getWalletByUserId(userId);
      
      if (!wallet) {
        return res.json(null);
      }

      const transactions = await storage.getWalletTransactions(wallet.id);
      const payouts = await storage.getWalletPayoutsByWalletId(wallet.id);

      return res.json({
        ...wallet,
        transactions: transactions.slice(0, 20),
        payouts: payouts.slice(0, 10),
      });
    } catch (error) {
      console.error("Error getting wallet:", error);
      return res.status(500).json({ message: "Failed to get wallet" });
    }
  });

  // Get specific user's wallet (admin/finance only)
  app.get("/api/wallets/:userId", isAuthenticated, requireRole(["admin", "finance", "director", "trip_coordinator"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const wallet = await storage.getWalletByUserId(userId);
      
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      return res.json(wallet);
    } catch (error) {
      console.error("Error getting user wallet:", error);
      return res.status(500).json({ message: "Failed to get wallet" });
    }
  });

  // Get wallet transactions
  app.get("/api/wallets/:userId/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const { userId } = req.params;
      const userRole = await storage.getUserRole(requestingUserId);

      // Users can view their own transactions, admins/finance can view anyone's
      const canView = requestingUserId === userId || 
        (userRole && ["admin", "finance", "director", "trip_coordinator"].includes(userRole.role));
      
      if (!canView) {
        return res.status(403).json({ message: "Access denied" });
      }

      const wallet = await storage.getWalletByUserId(userId);
      if (!wallet) {
        return res.json([]);
      }

      const transactions = await storage.getWalletTransactions(wallet.id);
      return res.json(transactions);
    } catch (error) {
      console.error("Error getting wallet transactions:", error);
      return res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  // Get all driver wallets (admin/finance)
  app.get("/api/admin/wallets", isAuthenticated, requireRole(["admin", "finance", "director", "trip_coordinator"]), async (req: any, res) => {
    try {
      const wallets = await storage.getAllDriverWallets();
      return res.json(wallets);
    } catch (error) {
      console.error("Error getting wallets:", error);
      return res.status(500).json({ message: "Failed to get wallets" });
    }
  });

  // Get ZIBA platform wallet (admin/finance)
  app.get("/api/admin/wallets/ziba", isAuthenticated, requireRole(["admin", "finance", "director"]), async (req: any, res) => {
    try {
      const zibaWallet = await storage.getZibaWallet();
      const transactions = await storage.getWalletTransactions(zibaWallet.id);
      return res.json({
        ...zibaWallet,
        transactions: transactions.slice(0, 50),
      });
    } catch (error) {
      console.error("Error getting ZIBA wallet:", error);
      return res.status(500).json({ message: "Failed to get ZIBA wallet" });
    }
  });

  // ========== PHASE 11 - PAYOUT ENDPOINTS ==========

  // Get all payouts (admin/finance)
  app.get("/api/payouts", isAuthenticated, requireRole(["admin", "finance", "director", "trip_coordinator"]), async (req: any, res) => {
    try {
      const { status } = req.query;
      const payouts = status 
        ? await storage.getFilteredWalletPayouts({ status })
        : await storage.getAllWalletPayouts();
      return res.json(payouts);
    } catch (error) {
      console.error("Error getting payouts:", error);
      return res.status(500).json({ message: "Failed to get payouts" });
    }
  });

  // Get driver's payout history
  app.get("/api/driver/payouts", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payouts = await storage.getDriverPayoutHistory(userId);
      return res.json(payouts);
    } catch (error) {
      console.error("Error getting driver payouts:", error);
      return res.status(500).json({ message: "Failed to get payout history" });
    }
  });

  // Initiate a payout (finance/admin only)
  app.post("/api/payouts/initiate", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { walletId, amount, method, periodStart, periodEnd } = req.body;

      if (!walletId || !amount || !periodStart || !periodEnd) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const wallet = await storage.getWalletById(walletId);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);
      const payoutAmount = parseFloat(amount);

      if (payoutAmount > availableBalance) {
        return res.status(400).json({ message: "Insufficient available balance" });
      }

      // Hold the balance
      const held = await storage.holdWalletBalance(walletId, amount);
      if (!held) {
        return res.status(400).json({ message: "Failed to hold balance" });
      }

      const payout = await storage.createWalletPayout({
        walletId,
        amount,
        method: method || "bank",
        initiatedByUserId: userId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      });

      // Audit log
      await storage.createAuditLog({
        action: "payout_initiated",
        entityType: "wallet_payout",
        entityId: payout.id,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ walletId, amount, method }),
      });

      return res.json(payout);
    } catch (error) {
      console.error("Error initiating payout:", error);
      return res.status(500).json({ message: "Failed to initiate payout" });
    }
  });

  // Process a payout (finance only)
  app.post("/api/payouts/process", isAuthenticated, requireRole(["finance"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { payoutId } = req.body;

      if (!payoutId) {
        return res.status(400).json({ message: "Missing payout ID" });
      }

      const payout = await storage.getWalletPayoutById(payoutId);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }

      if (payout.status !== "pending") {
        // First move to processing
        const updated = await storage.reverseWalletPayout(payoutId, "Processing");
        if (!updated) {
          return res.status(400).json({ message: "Cannot process this payout" });
        }
      }

      // Mark as processing first
      const processingPayout = await storage.getWalletPayoutById(payoutId);
      if (processingPayout?.status === "pending") {
        // Update to processing status manually for now
      }

      const processed = await storage.processWalletPayout(payoutId, userId);
      if (!processed) {
        return res.status(400).json({ message: "Failed to process payout" });
      }

      // Audit log
      await storage.createAuditLog({
        action: "payout_processed",
        entityType: "wallet_payout",
        entityId: payoutId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ status: "paid" }),
      });

      // Notify driver
      const wallet = await storage.getWalletById(payout.walletId);
      if (wallet) {
        await storage.createNotification({
          userId: wallet.userId,
          role: "driver",
          title: "Payout Processed",
          message: `Your payout of $${payout.amount} has been processed successfully.`,
          type: "success",
        });
      }

      return res.json(processed);
    } catch (error) {
      console.error("Error processing payout:", error);
      return res.status(500).json({ message: "Failed to process payout" });
    }
  });

  // Reverse a payout (admin only)
  app.post("/api/payouts/reverse", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.userRole;
      const { payoutId, reason } = req.body;

      if (!payoutId || !reason) {
        return res.status(400).json({ message: "Missing payout ID or reason" });
      }

      const payout = await storage.getWalletPayoutById(payoutId);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }

      const reversed = await storage.reverseWalletPayout(payoutId, reason);
      if (!reversed) {
        return res.status(400).json({ message: "Failed to reverse payout" });
      }

      // Audit log
      await storage.createAuditLog({
        action: "payout_reversed",
        entityType: "wallet_payout",
        entityId: payoutId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ reason }),
      });

      // Notify driver
      const wallet = await storage.getWalletById(payout.walletId);
      if (wallet) {
        await storage.createNotification({
          userId: wallet.userId,
          role: "driver",
          title: "Payout Reversed",
          message: `Your payout of $${payout.amount} has been reversed. Reason: ${reason}`,
          type: "warning",
        });
      }

      return res.json(reversed);
    } catch (error) {
      console.error("Error reversing payout:", error);
      return res.status(500).json({ message: "Failed to reverse payout" });
    }
  });

  // Phase 12 - Analytics API Routes
  const parseAnalyticsDateRange = (range?: string): { startDate?: Date; endDate?: Date } => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    
    if (!range || range === "all") {
      return {};
    }
    
    let startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    
    switch (range) {
      case "today":
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        // Custom range: expect startDate,endDate format
        if (range.includes(",")) {
          const [start, end] = range.split(",");
          return { 
            startDate: new Date(start), 
            endDate: new Date(end) 
          };
        }
        return {};
    }
    
    return { startDate, endDate };
  };

  app.get("/api/analytics/overview", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const { range } = req.query;
      const { startDate, endDate } = parseAnalyticsDateRange(range as string);
      const overview = await storage.getAnalyticsOverview(startDate, endDate);
      return res.json(overview);
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      return res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });

  app.get("/api/analytics/trips", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const { range } = req.query;
      const { startDate, endDate } = parseAnalyticsDateRange(range as string);
      const data = await storage.getTripsAnalytics(startDate, endDate);
      return res.json(data);
    } catch (error) {
      console.error("Error fetching trips analytics:", error);
      return res.status(500).json({ message: "Failed to fetch trips analytics" });
    }
  });

  app.get("/api/analytics/revenue", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const { range } = req.query;
      const { startDate, endDate } = parseAnalyticsDateRange(range as string);
      const data = await storage.getRevenueAnalytics(startDate, endDate);
      return res.json(data);
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      return res.status(500).json({ message: "Failed to fetch revenue analytics" });
    }
  });

  app.get("/api/analytics/refunds", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const { range } = req.query;
      const { startDate, endDate } = parseAnalyticsDateRange(range as string);
      const data = await storage.getRefundsAnalytics(startDate, endDate);
      return res.json(data);
    } catch (error) {
      console.error("Error fetching refunds analytics:", error);
      return res.status(500).json({ message: "Failed to fetch refunds analytics" });
    }
  });

  app.get("/api/analytics/payouts", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const { range } = req.query;
      const { startDate, endDate } = parseAnalyticsDateRange(range as string);
      const data = await storage.getPayoutsAnalytics(startDate, endDate);
      return res.json(data);
    } catch (error) {
      console.error("Error fetching payouts analytics:", error);
      return res.status(500).json({ message: "Failed to fetch payouts analytics" });
    }
  });

  app.get("/api/analytics/reconciliation", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const { range } = req.query;
      const { startDate, endDate } = parseAnalyticsDateRange(range as string);
      const data = await storage.getReconciliationAnalytics(startDate, endDate);
      return res.json(data);
    } catch (error) {
      console.error("Error fetching reconciliation analytics:", error);
      return res.status(500).json({ message: "Failed to fetch reconciliation analytics" });
    }
  });

  // CSV Export endpoint
  app.get("/api/reports/export", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const { type, range, format } = req.query;
      const { startDate, endDate } = parseAnalyticsDateRange(range as string);
      
      let data: any[];
      let filename: string;
      
      switch (type) {
        case "trips":
          data = await storage.getTripsAnalytics(startDate, endDate);
          filename = "trips_report";
          break;
        case "revenue":
          data = await storage.getRevenueAnalytics(startDate, endDate);
          filename = "revenue_report";
          break;
        case "refunds":
          data = await storage.getRefundsAnalytics(startDate, endDate);
          filename = "refunds_report";
          break;
        case "payouts":
          data = await storage.getPayoutsAnalytics(startDate, endDate);
          filename = "payouts_report";
          break;
        default:
          const overview = await storage.getAnalyticsOverview(startDate, endDate);
          data = [overview];
          filename = "overview_report";
      }
      
      if (format === "csv") {
        if (data.length === 0) {
          return res.status(200).send("No data available for export");
        }
        
        const headers = Object.keys(data[0]);
        const csvRows = [
          headers.join(","),
          ...data.map(row => 
            headers.map(header => {
              const value = row[header];
              if (typeof value === "object") {
                return JSON.stringify(value).replace(/,/g, ";");
              }
              return String(value ?? "").replace(/,/g, ";");
            }).join(",")
          )
        ];
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}_${new Date().toISOString().split("T")[0]}.csv"`);
        return res.send(csvRows.join("\n"));
      }
      
      // Default: return JSON
      return res.json({ data, filename, generatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error generating report:", error);
      return res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Phase 13 - Fraud Detection Routes
  app.get("/api/fraud/overview", isAuthenticated, requireRole(["admin", "finance", "trip_coordinator"]), async (req: any, res) => {
    try {
      const overview = await storage.getFraudOverview();
      return res.json(overview);
    } catch (error) {
      console.error("Error fetching fraud overview:", error);
      return res.status(500).json({ message: "Failed to fetch fraud overview" });
    }
  });

  app.get("/api/fraud/users", isAuthenticated, requireRole(["admin", "finance", "trip_coordinator"]), async (req: any, res) => {
    try {
      const { level } = req.query;
      let profiles;
      if (level) {
        profiles = await storage.getRiskProfilesByLevel(level as string);
      } else {
        profiles = await storage.getAllRiskProfiles();
      }
      return res.json(profiles);
    } catch (error) {
      console.error("Error fetching fraud users:", error);
      return res.status(500).json({ message: "Failed to fetch fraud users" });
    }
  });

  app.get("/api/fraud/events", isAuthenticated, requireRole(["admin", "finance", "trip_coordinator"]), async (req: any, res) => {
    try {
      const { severity, unresolved } = req.query;
      let events;
      if (unresolved === "true") {
        events = await storage.getUnresolvedFraudEvents();
      } else if (severity) {
        events = await storage.getFraudEventsBySeverity(severity as string);
      } else {
        events = await storage.getAllFraudEvents();
      }
      return res.json(events);
    } catch (error) {
      console.error("Error fetching fraud events:", error);
      return res.status(500).json({ message: "Failed to fetch fraud events" });
    }
  });

  app.post("/api/fraud/evaluate", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { userId, role } = req.body;
      
      if (userId && role) {
        const { evaluateUserRisk, evaluateAndRecordFraudEvents } = await import("./fraud");
        await evaluateAndRecordFraudEvents(userId, role, "Manual evaluation by admin");
        const result = await evaluateUserRisk(userId, role);
        
        await storage.createAuditLog({
          action: "fraud_evaluation",
          entityType: "user",
          entityId: userId,
          performedByUserId: req.user.id,
          performedByRole: "admin",
          metadata: JSON.stringify({ role, result }),
        });
        
        return res.json({ success: true, result });
      } else {
        const { runFullEvaluation } = await import("./fraud");
        const result = await runFullEvaluation();
        
        await storage.createAuditLog({
          action: "fraud_full_evaluation",
          entityType: "system",
          entityId: "fraud-evaluation",
          performedByUserId: req.user.id,
          performedByRole: "admin",
          metadata: JSON.stringify(result),
        });
        
        return res.json({ success: true, ...result });
      }
    } catch (error) {
      console.error("Error running fraud evaluation:", error);
      return res.status(500).json({ message: "Failed to run fraud evaluation" });
    }
  });

  app.post("/api/fraud/resolve/:eventId", isAuthenticated, requireRole(["admin", "trip_coordinator"]), async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const event = await storage.getFraudEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Fraud event not found" });
      }
      if (event.resolvedAt) {
        return res.status(400).json({ message: "Fraud event already resolved" });
      }
      
      const updated = await storage.resolveFraudEvent(eventId, req.user.id);
      
      await storage.createAuditLog({
        action: "fraud_event_resolved",
        entityType: "fraud_event",
        entityId: eventId,
        performedByUserId: req.user.id,
        performedByRole: req.user.role,
        metadata: JSON.stringify({ signalType: event.signalType, entityId: event.entityId }),
      });
      
      return res.json(updated);
    } catch (error) {
      console.error("Error resolving fraud event:", error);
      return res.status(500).json({ message: "Failed to resolve fraud event" });
    }
  });

  app.get("/api/fraud/user/:userId", isAuthenticated, requireRole(["admin", "finance", "trip_coordinator"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getRiskProfile(userId);
      const events = await storage.getFraudEventsByEntityId(userId);
      return res.json({ profile, events });
    } catch (error) {
      console.error("Error fetching user fraud data:", error);
      return res.status(500).json({ message: "Failed to fetch user fraud data" });
    }
  });

  // Phase 14 - Incentive Program Routes
  app.get("/api/incentives/stats", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const stats = await storage.getIncentiveStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error fetching incentive stats:", error);
      return res.status(500).json({ message: "Failed to fetch incentive stats" });
    }
  });

  app.get("/api/incentives/active", isAuthenticated, async (req: any, res) => {
    try {
      const programs = await storage.getActiveIncentivePrograms();
      return res.json(programs);
    } catch (error) {
      console.error("Error fetching active incentives:", error);
      return res.status(500).json({ message: "Failed to fetch active incentives" });
    }
  });

  app.get("/api/incentives/programs", isAuthenticated, requireRole(["admin", "finance", "trip_coordinator"]), async (req: any, res) => {
    try {
      const programs = await storage.getAllIncentivePrograms();
      return res.json(programs);
    } catch (error) {
      console.error("Error fetching incentive programs:", error);
      return res.status(500).json({ message: "Failed to fetch incentive programs" });
    }
  });

  app.get("/api/incentives/earnings", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const earnings = await storage.getAllIncentiveEarnings();
      return res.json(earnings);
    } catch (error) {
      console.error("Error fetching incentive earnings:", error);
      return res.status(500).json({ message: "Failed to fetch incentive earnings" });
    }
  });

  app.get("/api/incentives/driver/:driverId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { driverId } = req.params;
      const userRole = await storage.getUserRole(userId);
      
      if (userId !== driverId && !["admin", "finance", "trip_coordinator"].includes(userRole?.role || "")) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const earnings = await storage.getDriverIncentiveEarnings(driverId);
      return res.json(earnings);
    } catch (error) {
      console.error("Error fetching driver incentives:", error);
      return res.status(500).json({ message: "Failed to fetch driver incentives" });
    }
  });

  // Driver's own incentive earnings
  app.get("/api/incentives/earnings/mine", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getDriverProfile(userId);
      
      if (!profile) {
        return res.json([]);
      }
      
      const earnings = await storage.getDriverIncentiveEarnings(profile.userId);
      return res.json(earnings);
    } catch (error) {
      console.error("Error fetching own incentive earnings:", error);
      return res.status(500).json({ message: "Failed to fetch incentive earnings" });
    }
  });

  app.post("/api/incentives/create", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertIncentiveProgramSchema.safeParse({ ...req.body, createdByUserId: userId });
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid incentive program data", errors: parsed.error.errors });
      }

      const program = await storage.createIncentiveProgram(parsed.data);

      await storage.createAuditLog({
        action: "incentive_program_created",
        entityType: "incentive_program",
        entityId: program.id,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ name: program.name, type: program.type, rewardAmount: program.rewardAmount })
      });

      return res.json(program);
    } catch (error) {
      console.error("Error creating incentive program:", error);
      return res.status(500).json({ message: "Failed to create incentive program" });
    }
  });

  app.post("/api/incentives/update/:programId", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { programId } = req.params;
      
      const program = await storage.updateIncentiveProgram(programId, req.body);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      await storage.createAuditLog({
        action: "incentive_program_updated",
        entityType: "incentive_program",
        entityId: programId,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify(req.body)
      });

      return res.json(program);
    } catch (error) {
      console.error("Error updating incentive program:", error);
      return res.status(500).json({ message: "Failed to update incentive program" });
    }
  });

  app.post("/api/incentives/pause/:programId", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { programId } = req.params;
      
      const program = await storage.pauseIncentiveProgram(programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      await storage.createAuditLog({
        action: "incentive_program_paused",
        entityType: "incentive_program",
        entityId: programId,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ previousStatus: "active" })
      });

      return res.json(program);
    } catch (error) {
      console.error("Error pausing incentive program:", error);
      return res.status(500).json({ message: "Failed to pause incentive program" });
    }
  });

  app.post("/api/incentives/end/:programId", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { programId } = req.params;
      
      const program = await storage.endIncentiveProgram(programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      await storage.createAuditLog({
        action: "incentive_program_ended",
        entityType: "incentive_program",
        entityId: programId,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ previousStatus: program.status })
      });

      return res.json(program);
    } catch (error) {
      console.error("Error ending incentive program:", error);
      return res.status(500).json({ message: "Failed to end incentive program" });
    }
  });

  app.post("/api/incentives/evaluate", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { driverId } = req.body;
      
      if (driverId) {
        const result = await evaluateDriverForIncentives(driverId);
        return res.json(result);
      } else {
        const result = await evaluateAllDrivers();
        return res.json(result);
      }
    } catch (error) {
      console.error("Error evaluating incentives:", error);
      return res.status(500).json({ message: "Failed to evaluate incentives" });
    }
  });

  app.post("/api/incentives/approve/:earningId", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { earningId } = req.params;
      
      const result = await approveAndPayIncentive(earningId, userId);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error approving incentive:", error);
      return res.status(500).json({ message: "Failed to approve incentive" });
    }
  });

  app.post("/api/incentives/revoke/:earningId", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { earningId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Revocation reason is required" });
      }
      
      const result = await revokeIncentive(earningId, userId, reason);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error revoking incentive:", error);
      return res.status(500).json({ message: "Failed to revoke incentive" });
    }
  });

  // ========================================
  // Phase 14.5 - Trip Coordinator Routes
  // ========================================

  // Get trip coordinator profile
  app.get("/api/coordinator/profile", isAuthenticated, requireRole(["trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getTripCoordinatorProfile(userId);
      return res.json(profile || null);
    } catch (error) {
      console.error("Error fetching coordinator profile:", error);
      return res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Create/update trip coordinator profile
  app.post("/api/coordinator/profile", isAuthenticated, requireRole(["trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationName, organizationType, contactEmail, contactPhone } = req.body;

      if (!organizationName || !organizationType || !contactEmail) {
        return res.status(400).json({ message: "Organization name, type, and contact email are required" });
      }

      const existing = await storage.getTripCoordinatorProfile(userId);
      if (existing) {
        return res.status(400).json({ message: "Profile already exists" });
      }

      const profile = await storage.createTripCoordinatorProfile({
        userId,
        organizationName,
        organizationType,
        contactEmail,
        contactPhone: contactPhone || null
      });

      await storage.createAuditLog({
        action: "coordinator_profile_created",
        entityType: "trip_coordinator_profile",
        entityId: profile.id,
        performedByUserId: userId,
        performedByRole: "trip_coordinator",
        metadata: JSON.stringify({ organizationName, organizationType })
      });

      return res.json(profile);
    } catch (error) {
      console.error("Error creating coordinator profile:", error);
      return res.status(500).json({ message: "Failed to create profile" });
    }
  });

  // Get coordinator's trips
  app.get("/api/coordinator/trips", isAuthenticated, requireRole(["trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, startDate, endDate } = req.query;
      
      const filter: any = {};
      if (status) filter.status = status as string;
      if (startDate) filter.startDate = startDate as string;
      if (endDate) filter.endDate = endDate as string;

      const trips = await storage.getCoordinatorTrips(userId, filter);
      return res.json(trips);
    } catch (error) {
      console.error("Error fetching coordinator trips:", error);
      return res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  // Get coordinator trip statistics
  app.get("/api/coordinator/stats", isAuthenticated, requireRole(["trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getCoordinatorTripStats(userId);
      return res.json(stats);
    } catch (error) {
      console.error("Error fetching coordinator stats:", error);
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Create trip as coordinator (booking for third party)
  app.post("/api/coordinator/trips", isAuthenticated, requireRole(["trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { pickupLocation, dropoffLocation, passengerCount, passengerName, passengerContact, notesForDriver } = req.body;

      if (!pickupLocation || !dropoffLocation) {
        return res.status(400).json({ message: "Pickup and dropoff locations are required" });
      }

      if (!passengerName) {
        return res.status(400).json({ message: "Passenger name is required for third-party bookings" });
      }

      const profile = await storage.getTripCoordinatorProfile(userId);
      if (!profile) {
        return res.status(400).json({ message: "Please complete your organization profile first" });
      }

      const trip = await storage.createTrip({
        riderId: userId,
        pickupLocation,
        dropoffLocation,
        passengerCount: passengerCount || 1,
        bookedForType: "third_party",
        passengerName,
        passengerContact: passengerContact || null,
        notesForDriver: notesForDriver || null
      });

      await storage.createAuditLog({
        action: "coordinator_trip_created",
        entityType: "trip",
        entityId: trip.id,
        performedByUserId: userId,
        performedByRole: "trip_coordinator",
        metadata: JSON.stringify({ passengerName, organizationName: profile.organizationName })
      });

      // Notify available drivers
      await storage.notifyAllDrivers(
        "New Trip Available",
        `Pickup: ${pickupLocation} → ${dropoffLocation}`,
        "info"
      );

      return res.json(trip);
    } catch (error) {
      console.error("Error creating coordinator trip:", error);
      return res.status(500).json({ message: "Failed to create trip" });
    }
  });

  // Get receipt for a completed trip
  app.get("/api/coordinator/receipts/:tripId", isAuthenticated, requireRole(["trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Ensure the coordinator owns this trip
      if (trip.riderId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (trip.status !== "completed") {
        return res.status(400).json({ message: "Receipt only available for completed trips" });
      }

      const profile = await storage.getTripCoordinatorProfile(userId);

      return res.json({
        tripId: trip.id,
        organizationName: profile?.organizationName || "Unknown Organization",
        passengerName: trip.passengerName || "N/A",
        pickupLocation: trip.pickupLocation,
        dropoffLocation: trip.dropoffLocation,
        passengerCount: trip.passengerCount,
        fareAmount: trip.fareAmount,
        driverPayout: trip.driverPayout,
        commissionAmount: trip.commissionAmount,
        completedAt: trip.completedAt,
        createdAt: trip.createdAt
      });
    } catch (error) {
      console.error("Error fetching receipt:", error);
      return res.status(500).json({ message: "Failed to fetch receipt" });
    }
  });

  // Coordinator can submit disputes for their trips
  app.post("/api/coordinator/disputes", isAuthenticated, requireRole(["trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId, category, description } = req.body;

      if (!tripId || !category || !description) {
        return res.status(400).json({ message: "Trip ID, category, and description are required" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Ensure the coordinator owns this trip
      if (trip.riderId !== userId) {
        return res.status(403).json({ message: "You can only submit disputes for your own trips" });
      }

      // Check if dispute already exists
      const existingDispute = await storage.getDisputeByTripAndUser(tripId, userId);
      if (existingDispute) {
        return res.status(400).json({ message: "A dispute already exists for this trip" });
      }

      const dispute = await storage.createDispute({
        tripId,
        raisedByRole: "rider", // Coordinators are treated as riders
        raisedById: userId,
        againstUserId: trip.driverId || "",
        category,
        description
      });

      await storage.createAuditLog({
        action: "coordinator_dispute_created",
        entityType: "dispute",
        entityId: dispute.id,
        performedByUserId: userId,
        performedByRole: "trip_coordinator",
        metadata: JSON.stringify({ tripId, category })
      });

      // Notify admins
      await storage.notifyAdminsAndDirectors(
        "New Dispute Submitted",
        `A trip coordinator has raised a dispute for trip ${tripId}`,
        "warning"
      );

      return res.json(dispute);
    } catch (error) {
      console.error("Error creating coordinator dispute:", error);
      return res.status(500).json({ message: "Failed to create dispute" });
    }
  });

  // Get coordinator's disputes
  app.get("/api/coordinator/disputes", isAuthenticated, requireRole(["trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all disputes raised by this coordinator
      const allDisputes = await storage.getAllDisputes();
      const coordinatorDisputes = allDisputes.filter(d => d.raisedById === userId);
      
      return res.json(coordinatorDisputes);
    } catch (error) {
      console.error("Error fetching coordinator disputes:", error);
      return res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  // Coordinator can rate drivers
  app.post("/api/coordinator/ratings", isAuthenticated, requireRole(["trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId, score, comment } = req.body;

      if (!tripId || score === undefined) {
        return res.status(400).json({ message: "Trip ID and score are required" });
      }

      if (score < 1 || score > 5) {
        return res.status(400).json({ message: "Score must be between 1 and 5" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (trip.riderId !== userId) {
        return res.status(403).json({ message: "You can only rate trips you booked" });
      }

      if (trip.status !== "completed") {
        return res.status(400).json({ message: "Can only rate completed trips" });
      }

      if (!trip.driverId) {
        return res.status(400).json({ message: "No driver assigned to this trip" });
      }

      // Check if already rated
      const existingRating = await storage.getRatingByTripAndRater(tripId, userId);
      if (existingRating) {
        return res.status(400).json({ message: "You have already rated this trip" });
      }

      const rating = await storage.createRating({
        tripId,
        raterRole: "rider",
        raterId: userId,
        targetUserId: trip.driverId,
        score,
        comment: comment || null
      });

      // Update driver's average rating
      await storage.updateUserAverageRating(trip.driverId, "driver");

      return res.json(rating);
    } catch (error) {
      console.error("Error creating rating:", error);
      return res.status(500).json({ message: "Failed to create rating" });
    }
  });

  // Cancel a coordinator trip
  app.post("/api/coordinator/trips/:tripId/cancel", isAuthenticated, requireRole(["trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const { reason } = req.body;

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (trip.riderId !== userId) {
        return res.status(403).json({ message: "You can only cancel your own trips" });
      }

      if (trip.status === "completed" || trip.status === "cancelled") {
        return res.status(400).json({ message: "Cannot cancel this trip" });
      }

      const cancelledTrip = await storage.cancelTrip(tripId, userId, reason || "Cancelled by coordinator");

      await storage.createAuditLog({
        action: "coordinator_trip_cancelled",
        entityType: "trip",
        entityId: tripId,
        performedByUserId: userId,
        performedByRole: "trip_coordinator",
        metadata: JSON.stringify({ reason })
      });

      return res.json(cancelledTrip);
    } catch (error) {
      console.error("Error cancelling coordinator trip:", error);
      return res.status(500).json({ message: "Failed to cancel trip" });
    }
  });

  // ========================================
  // Phase 15 - Multi-Country Tax, Currency & Compliance
  // ========================================

  // Get all countries
  app.get("/api/countries", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const countries = await storage.getAllCountries();
      return res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      return res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  // Get active countries (for trip creation dropdown)
  app.get("/api/countries/active", isAuthenticated, async (req: any, res) => {
    try {
      const countries = await storage.getActiveCountries();
      return res.json(countries);
    } catch (error) {
      console.error("Error fetching active countries:", error);
      return res.status(500).json({ message: "Failed to fetch active countries" });
    }
  });

  // Create country
  app.post("/api/countries", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertCountrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid country data", errors: parsed.error.errors });
      }

      const existing = await storage.getCountryByCode(parsed.data.isoCode);
      if (existing) {
        return res.status(400).json({ message: "Country with this ISO code already exists" });
      }

      const country = await storage.createCountry(parsed.data);

      await storage.createAuditLog({
        action: "country_created",
        entityType: "country",
        entityId: country.id,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ name: country.name, isoCode: country.isoCode })
      });

      return res.status(201).json(country);
    } catch (error) {
      console.error("Error creating country:", error);
      return res.status(500).json({ message: "Failed to create country" });
    }
  });

  // Update country
  app.patch("/api/countries/:countryId", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { countryId } = req.params;
      const { name, currency, active } = req.body;

      const country = await storage.getCountryById(countryId);
      if (!country) {
        return res.status(404).json({ message: "Country not found" });
      }

      const updated = await storage.updateCountry(countryId, { name, currency, active });

      await storage.createAuditLog({
        action: "country_updated",
        entityType: "country",
        entityId: countryId,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ name, currency, active })
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error updating country:", error);
      return res.status(500).json({ message: "Failed to update country" });
    }
  });

  // Get all tax rules
  app.get("/api/tax-rules", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const { countryId } = req.query;
      const rules = countryId 
        ? await storage.getTaxRulesByCountry(countryId as string)
        : await storage.getAllTaxRules();
      return res.json(rules);
    } catch (error) {
      console.error("Error fetching tax rules:", error);
      return res.status(500).json({ message: "Failed to fetch tax rules" });
    }
  });

  // Create tax rule
  app.post("/api/tax-rules", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertTaxRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid tax rule data", errors: parsed.error.errors });
      }

      const country = await storage.getCountryById(parsed.data.countryId);
      if (!country) {
        return res.status(400).json({ message: "Country not found" });
      }

      const rule = await storage.createTaxRule(parsed.data);

      await storage.createAuditLog({
        action: "tax_rule_created",
        entityType: "tax_rule",
        entityId: rule.id,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ countryId: rule.countryId, taxType: rule.taxType, rate: rule.rate })
      });

      return res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating tax rule:", error);
      return res.status(500).json({ message: "Failed to create tax rule" });
    }
  });

  // Update tax rule
  app.patch("/api/tax-rules/:ruleId", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ruleId } = req.params;
      const { rate, effectiveTo, name } = req.body;

      const rule = await storage.getTaxRuleById(ruleId);
      if (!rule) {
        return res.status(404).json({ message: "Tax rule not found" });
      }

      const updated = await storage.updateTaxRule(ruleId, { rate, effectiveTo, name });

      await storage.createAuditLog({
        action: "tax_rule_updated",
        entityType: "tax_rule",
        entityId: ruleId,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ rate, effectiveTo })
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error updating tax rule:", error);
      return res.status(500).json({ message: "Failed to update tax rule" });
    }
  });

  // Get all exchange rates
  app.get("/api/exchange-rates", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const { base, target } = req.query;
      if (base && target) {
        const history = await storage.getExchangeRateHistory(base as string, target as string);
        return res.json(history);
      }
      const rates = await storage.getAllExchangeRates();
      return res.json(rates);
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      return res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });

  // Create exchange rate
  app.post("/api/exchange-rates", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertExchangeRateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid exchange rate data", errors: parsed.error.errors });
      }

      const rate = await storage.createExchangeRate(parsed.data);

      await storage.createAuditLog({
        action: "exchange_rate_created",
        entityType: "exchange_rate",
        entityId: rate.id,
        performedByUserId: userId,
        performedByRole: req.userRole,
        metadata: JSON.stringify({ base: rate.baseCurrency, target: rate.targetCurrency, rate: rate.rate })
      });

      return res.status(201).json(rate);
    } catch (error) {
      console.error("Error creating exchange rate:", error);
      return res.status(500).json({ message: "Failed to create exchange rate" });
    }
  });

  // Get latest exchange rate for a pair
  app.get("/api/exchange-rates/latest", isAuthenticated, async (req: any, res) => {
    try {
      const { base, target } = req.query;
      if (!base || !target) {
        return res.status(400).json({ message: "Base and target currencies are required" });
      }
      const rate = await storage.getLatestExchangeRate(base as string, target as string);
      return res.json(rate);
    } catch (error) {
      console.error("Error fetching latest exchange rate:", error);
      return res.status(500).json({ message: "Failed to fetch latest exchange rate" });
    }
  });

  // Get all compliance profiles
  app.get("/api/compliance", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const profiles = await storage.getAllComplianceProfiles();
      return res.json(profiles);
    } catch (error) {
      console.error("Error fetching compliance profiles:", error);
      return res.status(500).json({ message: "Failed to fetch compliance profiles" });
    }
  });

  // Create compliance profile
  app.post("/api/compliance", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertComplianceProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid compliance profile data", errors: parsed.error.errors });
      }

      const existing = await storage.getComplianceProfileByCountry(parsed.data.countryId);
      if (existing) {
        return res.status(400).json({ message: "Compliance profile already exists for this country" });
      }

      const country = await storage.getCountryById(parsed.data.countryId);
      if (!country) {
        return res.status(400).json({ message: "Country not found" });
      }

      const profile = await storage.createComplianceProfile(parsed.data);

      await storage.createAuditLog({
        action: "compliance_profile_created",
        entityType: "compliance_profile",
        entityId: profile.id,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ countryId: profile.countryId, legalEntityName: profile.legalEntityName })
      });

      return res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating compliance profile:", error);
      return res.status(500).json({ message: "Failed to create compliance profile" });
    }
  });

  // Update compliance profile
  app.patch("/api/compliance/:profileId", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { profileId } = req.params;
      const { legalEntityName, registrationId, taxId, notes } = req.body;

      const allProfiles = await storage.getAllComplianceProfiles();
      const found = allProfiles.find((p: any) => p.id === profileId);
      if (!found) {
        return res.status(404).json({ message: "Compliance profile not found" });
      }

      const updated = await storage.updateComplianceProfile(profileId, {
        legalEntityName, registrationId, taxId, notes
      });

      await storage.createAuditLog({
        action: "compliance_profile_updated",
        entityType: "compliance_profile",
        entityId: profileId,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ legalEntityName, notes })
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error updating compliance profile:", error);
      return res.status(500).json({ message: "Failed to update compliance profile" });
    }
  });

  // Get country analytics
  app.get("/api/analytics/countries", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const { countryId } = req.query;
      const analytics = await storage.getCountryAnalytics(countryId as string | undefined);
      return res.json(analytics);
    } catch (error) {
      console.error("Error fetching country analytics:", error);
      return res.status(500).json({ message: "Failed to fetch country analytics" });
    }
  });

  // Get compliance overview
  app.get("/api/compliance/overview", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const overview = await storage.getComplianceOverview();
      return res.json(overview);
    } catch (error) {
      console.error("Error fetching compliance overview:", error);
      return res.status(500).json({ message: "Failed to fetch compliance overview" });
    }
  });

  // ============================================
  // Phase 16 - Support System Routes
  // ============================================

  // Rate limiting map for support endpoints
  const supportRateLimits = new Map<string, { count: number; resetAt: number }>();
  const SUPPORT_RATE_LIMIT = 10; // requests per minute
  const SUPPORT_RATE_WINDOW = 60000; // 1 minute

  function checkSupportRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = supportRateLimits.get(userId);
    
    if (!userLimit || now > userLimit.resetAt) {
      supportRateLimits.set(userId, { count: 1, resetAt: now + SUPPORT_RATE_WINDOW });
      return true;
    }
    
    if (userLimit.count >= SUPPORT_RATE_LIMIT) {
      return false;
    }
    
    userLimit.count++;
    return true;
  }

  // Sanitize input to prevent XSS
  function sanitizeInput(input: string): string {
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .trim()
      .slice(0, 5000); // Max length
  }

  // Create support ticket (Rider, Driver, Trip Coordinator)
  app.post("/api/support/tickets/create", isAuthenticated, requireRole(["rider", "driver", "trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userRole = req.user?.role;
      
      if (!checkSupportRateLimit(userId)) {
        return res.status(429).json({ message: "Rate limit exceeded. Please wait before submitting again." });
      }
      
      const { subject, description, tripId, priority } = req.body;
      
      if (!subject || !description) {
        return res.status(400).json({ message: "Subject and description are required" });
      }
      
      if (subject.length < 5 || subject.length > 255) {
        return res.status(400).json({ message: "Subject must be between 5 and 255 characters" });
      }
      
      if (description.length < 10 || description.length > 5000) {
        return res.status(400).json({ message: "Description must be between 10 and 5000 characters" });
      }
      
      // Map user role to ticket creator role
      let createdByRole: "rider" | "driver" | "trip_coordinator";
      if (userRole === "driver") {
        createdByRole = "driver";
      } else if (userRole === "trip_coordinator") {
        createdByRole = "trip_coordinator";
      } else {
        createdByRole = "rider";
      }
      
      // Validate tripId if provided
      if (tripId) {
        const trip = await storage.getTripById(tripId);
        if (!trip) {
          return res.status(400).json({ message: "Invalid trip ID" });
        }
        // Verify user is associated with trip
        if (trip.riderId !== userId && trip.driverId !== userId && trip.bookedByUserId !== userId) {
          return res.status(403).json({ message: "You are not associated with this trip" });
        }
      }
      
      const ticket = await storage.createSupportTicket({
        createdByUserId: userId,
        createdByRole,
        subject: sanitizeInput(subject),
        description: sanitizeInput(description),
        tripId: tripId || null,
        priority: priority || "medium",
        status: "open"
      });
      
      await storage.createAuditLog({
        action: "support_ticket_created",
        entityType: "support_ticket",
        entityId: ticket.id,
        performedByUserId: userId,
        performedByRole: createdByRole,
        metadata: JSON.stringify({ subject: ticket.subject, tripId })
      });
      
      return res.json(ticket);
    } catch (error) {
      console.error("Error creating support ticket:", error);
      return res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  // Get user's own tickets (Rider, Driver, Trip Coordinator)
  app.get("/api/support/tickets/my", isAuthenticated, requireRole(["rider", "driver", "trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const tickets = await storage.getUserSupportTickets(userId);
      return res.json(tickets);
    } catch (error) {
      console.error("Error fetching user tickets:", error);
      return res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Get ticket details with messages (ticket owner or support agent)
  app.get("/api/support/tickets/:ticketId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userRole = req.user?.role;
      const { ticketId } = req.params;
      
      const ticket = await storage.getSupportTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Access control: ticket owner, assigned agent, support_agent, or admin
      const isOwner = ticket.createdByUserId === userId;
      const isAssigned = ticket.assignedToUserId === userId;
      const isSupportAgent = userRole === "support_agent";
      const isAdmin = userRole === "admin";
      
      if (!isOwner && !isAssigned && !isSupportAgent && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Support agents and admins can see internal notes
      const includeInternal = isSupportAgent || isAdmin;
      const messages = await storage.getSupportMessages(ticketId, includeInternal);
      
      return res.json({ ticket, messages });
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      return res.status(500).json({ message: "Failed to fetch ticket details" });
    }
  });

  // Get assigned tickets (Support Agent)
  app.get("/api/support/tickets/assigned", isAuthenticated, requireRole(["support_agent"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const tickets = await storage.getAssignedSupportTickets(userId);
      return res.json(tickets);
    } catch (error) {
      console.error("Error fetching assigned tickets:", error);
      return res.status(500).json({ message: "Failed to fetch assigned tickets" });
    }
  });

  // Get all open tickets (Support Agent queue)
  app.get("/api/support/tickets/queue", isAuthenticated, requireRole(["support_agent"]), async (req: any, res) => {
    try {
      const { status, priority } = req.query;
      const tickets = await storage.getAllSupportTickets({ 
        status: status as string, 
        priority: priority as string 
      });
      return res.json(tickets);
    } catch (error) {
      console.error("Error fetching ticket queue:", error);
      return res.status(500).json({ message: "Failed to fetch ticket queue" });
    }
  });

  // Get escalated tickets (Admin only)
  app.get("/api/support/tickets/escalated", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const tickets = await storage.getEscalatedSupportTickets();
      return res.json(tickets);
    } catch (error) {
      console.error("Error fetching escalated tickets:", error);
      return res.status(500).json({ message: "Failed to fetch escalated tickets" });
    }
  });

  // Get support stats (Admin, Support Agent)
  app.get("/api/support/stats", isAuthenticated, requireRole(["admin", "support_agent"]), async (req: any, res) => {
    try {
      const stats = await storage.getSupportStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error fetching support stats:", error);
      return res.status(500).json({ message: "Failed to fetch support stats" });
    }
  });

  // Assign ticket to self (Support Agent)
  app.post("/api/support/tickets/:ticketId/assign", isAuthenticated, requireRole(["support_agent"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { ticketId } = req.params;
      
      const ticket = await storage.getSupportTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      if (ticket.status === "closed" || ticket.status === "resolved") {
        return res.status(400).json({ message: "Cannot assign closed tickets" });
      }
      
      const updated = await storage.assignSupportTicket(ticketId, userId);
      
      await storage.createAuditLog({
        action: "support_ticket_assigned",
        entityType: "support_ticket",
        entityId: ticketId,
        performedByUserId: userId,
        performedByRole: "support_agent",
        metadata: JSON.stringify({ previousStatus: ticket.status })
      });
      
      return res.json(updated);
    } catch (error) {
      console.error("Error assigning ticket:", error);
      return res.status(500).json({ message: "Failed to assign ticket" });
    }
  });

  // Respond to ticket (owner or support agent)
  app.post("/api/support/tickets/respond", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userRole = req.user?.role;
      const { ticketId, message, internal } = req.body;
      
      if (!checkSupportRateLimit(userId)) {
        return res.status(429).json({ message: "Rate limit exceeded" });
      }
      
      if (!ticketId || !message) {
        return res.status(400).json({ message: "Ticket ID and message are required" });
      }
      
      if (message.length < 1 || message.length > 5000) {
        return res.status(400).json({ message: "Message must be between 1 and 5000 characters" });
      }
      
      const ticket = await storage.getSupportTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Check ticket is not closed
      if (ticket.status === "closed") {
        return res.status(400).json({ message: "Cannot respond to closed tickets" });
      }
      
      // Access control
      const isOwner = ticket.createdByUserId === userId;
      const isAssigned = ticket.assignedToUserId === userId;
      const isSupportAgent = userRole === "support_agent";
      const isAdmin = userRole === "admin";
      
      if (!isOwner && !isAssigned && !isSupportAgent && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Only support agents and admins can post internal notes
      const isInternal = (isSupportAgent || isAdmin) && internal === true;
      
      const supportMessage = await storage.createSupportMessage({
        ticketId,
        senderUserId: userId,
        senderRole: userRole,
        message: sanitizeInput(message),
        internal: isInternal
      });
      
      await storage.createAuditLog({
        action: "support_message_sent",
        entityType: "support_ticket",
        entityId: ticketId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ internal: isInternal })
      });
      
      return res.json(supportMessage);
    } catch (error) {
      console.error("Error responding to ticket:", error);
      return res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Escalate ticket (Support Agent)
  app.post("/api/support/tickets/escalate", isAuthenticated, requireRole(["support_agent"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { ticketId, reason } = req.body;
      
      if (!ticketId) {
        return res.status(400).json({ message: "Ticket ID is required" });
      }
      
      const ticket = await storage.getSupportTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      if (ticket.status === "closed" || ticket.status === "resolved") {
        return res.status(400).json({ message: "Cannot escalate closed tickets" });
      }
      
      const updated = await storage.escalateSupportTicket(ticketId);
      
      // Add internal note about escalation
      if (reason) {
        await storage.createSupportMessage({
          ticketId,
          senderUserId: userId,
          senderRole: "support_agent",
          message: `Escalated: ${sanitizeInput(reason)}`,
          internal: true
        });
      }
      
      await storage.createAuditLog({
        action: "support_ticket_escalated",
        entityType: "support_ticket",
        entityId: ticketId,
        performedByUserId: userId,
        performedByRole: "support_agent",
        metadata: JSON.stringify({ reason: reason || "No reason provided" })
      });
      
      return res.json(updated);
    } catch (error) {
      console.error("Error escalating ticket:", error);
      return res.status(500).json({ message: "Failed to escalate ticket" });
    }
  });

  // Close/Resolve ticket (Support Agent or Admin)
  app.post("/api/support/tickets/close", isAuthenticated, requireRole(["support_agent", "admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userRole = req.user?.role;
      const { ticketId, resolution } = req.body;
      
      if (!ticketId) {
        return res.status(400).json({ message: "Ticket ID is required" });
      }
      
      const ticket = await storage.getSupportTicketById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      if (ticket.status === "closed") {
        return res.status(400).json({ message: "Ticket is already closed" });
      }
      
      const updated = await storage.closeSupportTicket(ticketId, "resolved");
      
      // Add resolution note
      if (resolution) {
        await storage.createSupportMessage({
          ticketId,
          senderUserId: userId,
          senderRole: userRole,
          message: `Resolution: ${sanitizeInput(resolution)}`,
          internal: false
        });
      }
      
      await storage.createAuditLog({
        action: "support_ticket_closed",
        entityType: "support_ticket",
        entityId: ticketId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ previousStatus: ticket.status, resolution })
      });
      
      return res.json(updated);
    } catch (error) {
      console.error("Error closing ticket:", error);
      return res.status(500).json({ message: "Failed to close ticket" });
    }
  });

  // Phase 18 - Contracts, SLAs & Enterprise Billing

  // Get all contracts (Admin, Finance, Director)
  app.get("/api/contracts", isAuthenticated, requireRole(["admin", "finance", "director"]), async (req: any, res) => {
    try {
      const contracts = await storage.getAllOrganizationContracts();
      return res.json(contracts);
    } catch (error) {
      console.error("Error getting contracts:", error);
      return res.status(500).json({ message: "Failed to get contracts" });
    }
  });

  // Get contract stats (Admin, Finance, Director)
  app.get("/api/contracts/stats", isAuthenticated, requireRole(["admin", "finance", "director"]), async (req: any, res) => {
    try {
      const stats = await storage.getContractStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error getting contract stats:", error);
      return res.status(500).json({ message: "Failed to get contract stats" });
    }
  });

  // Get single contract
  app.get("/api/contracts/:contractId", isAuthenticated, requireRole(["admin", "finance", "director", "trip_coordinator"]), async (req: any, res) => {
    try {
      const { contractId } = req.params;
      const userId = req.user?.claims?.sub;
      const userRole = req.userRole;

      const contract = await storage.getOrganizationContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      if (userRole === "trip_coordinator" && contract.tripCoordinatorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      return res.json(contract);
    } catch (error) {
      console.error("Error getting contract:", error);
      return res.status(500).json({ message: "Failed to get contract" });
    }
  });

  // Create contract (Admin only)
  app.post("/api/contracts", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { tripCoordinatorId, contractName, contractType, startDate, endDate, billingModel, currency } = req.body;

      if (!tripCoordinatorId || !contractName || !contractType || !startDate || !endDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const contract = await storage.createOrganizationContract({
        tripCoordinatorId,
        contractName: sanitizeInput(contractName),
        contractType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        billingModel: billingModel || "MONTHLY_INVOICE",
        currency: currency || "USD",
        status: "ACTIVE"
      });

      await storage.createAuditLog({
        action: "contract_created",
        entityType: "organization_contract",
        entityId: contract.id,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ contractName, contractType, tripCoordinatorId })
      });

      return res.json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      return res.status(500).json({ message: "Failed to create contract" });
    }
  });

  // Update contract (Admin only)
  app.patch("/api/contracts/:contractId", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { contractId } = req.params;
      const updates = req.body;

      const existing = await storage.getOrganizationContract(contractId);
      if (!existing) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const updated = await storage.updateOrganizationContract(contractId, updates);

      await storage.createAuditLog({
        action: "contract_updated",
        entityType: "organization_contract",
        entityId: contractId,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ updates })
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error updating contract:", error);
      return res.status(500).json({ message: "Failed to update contract" });
    }
  });

  // Get coordinator's contract (Trip Coordinator)
  app.get("/api/coordinator/contract", isAuthenticated, requireRole(["trip_coordinator"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const contract = await storage.getContractByCoordinator(userId);
      return res.json(contract);
    } catch (error) {
      console.error("Error getting coordinator contract:", error);
      return res.status(500).json({ message: "Failed to get contract" });
    }
  });

  // Get SLAs for a contract
  app.get("/api/contracts/:contractId/slas", isAuthenticated, requireRole(["admin", "finance", "director", "trip_coordinator"]), async (req: any, res) => {
    try {
      const { contractId } = req.params;
      const slas = await storage.getSLAsByContract(contractId);
      return res.json(slas);
    } catch (error) {
      console.error("Error getting SLAs:", error);
      return res.status(500).json({ message: "Failed to get SLAs" });
    }
  });

  // Create SLA (Admin only)
  app.post("/api/contracts/:contractId/slas", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { contractId } = req.params;
      const { metricType, targetValue, measurementPeriod, notes } = req.body;

      const contract = await storage.getOrganizationContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const sla = await storage.createServiceLevelAgreement({
        contractId,
        metricType,
        targetValue: targetValue.toString(),
        measurementPeriod: measurementPeriod || "MONTHLY",
        notes: notes ? sanitizeInput(notes) : null
      });

      await storage.createAuditLog({
        action: "sla_created",
        entityType: "service_level_agreement",
        entityId: sla.id,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ contractId, metricType, targetValue })
      });

      return res.json(sla);
    } catch (error) {
      console.error("Error creating SLA:", error);
      return res.status(500).json({ message: "Failed to create SLA" });
    }
  });

  // Get all invoices (Admin, Finance, Director)
  app.get("/api/invoices", isAuthenticated, requireRole(["admin", "finance", "director"]), async (req: any, res) => {
    try {
      const invoices = await storage.getAllEnterpriseInvoices();
      return res.json(invoices);
    } catch (error) {
      console.error("Error getting invoices:", error);
      return res.status(500).json({ message: "Failed to get invoices" });
    }
  });

  // Get invoices for a contract
  app.get("/api/contracts/:contractId/invoices", isAuthenticated, requireRole(["admin", "finance", "director", "trip_coordinator"]), async (req: any, res) => {
    try {
      const { contractId } = req.params;
      const invoices = await storage.getInvoicesByContract(contractId);
      return res.json(invoices);
    } catch (error) {
      console.error("Error getting contract invoices:", error);
      return res.status(500).json({ message: "Failed to get invoices" });
    }
  });

  // Generate invoice for contract (Admin, Finance)
  app.post("/api/contracts/:contractId/invoices/generate", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userRole = req.userRole;
      const { contractId } = req.params;
      const { periodStart, periodEnd } = req.body;

      if (!periodStart || !periodEnd) {
        return res.status(400).json({ message: "Period start and end dates are required" });
      }

      const invoice = await storage.generateInvoiceForContract(
        contractId,
        new Date(periodStart),
        new Date(periodEnd)
      );

      if (!invoice) {
        return res.status(404).json({ message: "Contract not found" });
      }

      await storage.createAuditLog({
        action: "invoice_generated",
        entityType: "enterprise_invoice",
        entityId: invoice.id,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ contractId, periodStart, periodEnd, totalAmount: invoice.totalAmount })
      });

      return res.json(invoice);
    } catch (error) {
      console.error("Error generating invoice:", error);
      return res.status(500).json({ message: "Failed to generate invoice" });
    }
  });

  // Update invoice status (Admin, Finance)
  app.patch("/api/invoices/:invoiceId/status", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userRole = req.userRole;
      const { invoiceId } = req.params;
      const { status } = req.body;

      if (!["DRAFT", "ISSUED", "PAID", "OVERDUE"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const invoice = await storage.getEnterpriseInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const updated = await storage.updateEnterpriseInvoiceStatus(invoiceId, status);

      await storage.createAuditLog({
        action: "invoice_status_updated",
        entityType: "enterprise_invoice",
        entityId: invoiceId,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ previousStatus: invoice.status, newStatus: status })
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      return res.status(500).json({ message: "Failed to update invoice status" });
    }
  });

  // Phase 19 - Growth, Marketing & Partnerships

  // Generate unique referral code
  function generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create referral code (any authenticated user)
  app.post("/api/referrals/create", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userRole = req.userRole;

      if (!["rider", "driver", "trip_coordinator"].includes(userRole)) {
        return res.status(403).json({ message: "Only riders, drivers, and trip coordinators can create referral codes" });
      }

      const existingCodes = await storage.getReferralCodesByOwner(userId);
      const activeCode = existingCodes.find(c => c.active);
      if (activeCode) {
        return res.json(activeCode);
      }

      let code = generateReferralCode();
      let attempts = 0;
      while (await storage.getReferralCodeByCode(code) && attempts < 10) {
        code = generateReferralCode();
        attempts++;
      }

      const referralCode = await storage.createReferralCode({
        code,
        ownerUserId: userId,
        ownerRole: userRole as any,
        active: true,
        maxUsage: null
      });

      await storage.createAuditLog({
        action: "referral_code_created",
        entityType: "referral_code",
        entityId: referralCode.id,
        performedByUserId: userId,
        performedByRole: userRole,
        metadata: JSON.stringify({ code })
      });

      return res.json(referralCode);
    } catch (error) {
      console.error("Error creating referral code:", error);
      return res.status(500).json({ message: "Failed to create referral code" });
    }
  });

  // Get my referral codes (any authenticated user)
  app.get("/api/referrals/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const codes = await storage.getReferralCodesByOwner(userId);
      return res.json(codes);
    } catch (error) {
      console.error("Error getting referral codes:", error);
      return res.status(500).json({ message: "Failed to get referral codes" });
    }
  });

  // Get referral stats for current user
  app.get("/api/referrals/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const stats = await storage.getReferralStats(userId);
      return res.json(stats);
    } catch (error) {
      console.error("Error getting referral stats:", error);
      return res.status(500).json({ message: "Failed to get referral stats" });
    }
  });

  // Get all referral codes (Admin only)
  app.get("/api/referrals", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const codes = await storage.getAllReferralCodes();
      return res.json(codes);
    } catch (error) {
      console.error("Error getting all referral codes:", error);
      return res.status(500).json({ message: "Failed to get referral codes" });
    }
  });

  // Create marketing campaign (Admin only)
  app.post("/api/campaigns", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { name, type, startAt, endAt, notes } = req.body;

      if (!name || !type || !startAt || !endAt) {
        return res.status(400).json({ message: "Name, type, start date, and end date are required" });
      }

      if (!["REFERRAL", "PROMO", "PARTNERSHIP"].includes(type)) {
        return res.status(400).json({ message: "Invalid campaign type" });
      }

      const campaign = await storage.createMarketingCampaign({
        name,
        type,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        notes: notes || null,
        status: "ACTIVE"
      });

      await storage.createAuditLog({
        action: "campaign_created",
        entityType: "marketing_campaign",
        entityId: campaign.id,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ name, type })
      });

      return res.json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      return res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // Get active campaigns
  app.get("/api/campaigns/active", isAuthenticated, async (req: any, res) => {
    try {
      const campaigns = await storage.getActiveCampaigns();
      return res.json(campaigns);
    } catch (error) {
      console.error("Error getting active campaigns:", error);
      return res.status(500).json({ message: "Failed to get active campaigns" });
    }
  });

  // Get all campaigns (Admin only)
  app.get("/api/campaigns", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const campaigns = await storage.getAllMarketingCampaigns();
      return res.json(campaigns);
    } catch (error) {
      console.error("Error getting campaigns:", error);
      return res.status(500).json({ message: "Failed to get campaigns" });
    }
  });

  // Update campaign status (Admin only)
  app.patch("/api/campaigns/:campaignId/status", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { campaignId } = req.params;
      const { status } = req.body;

      if (!["ACTIVE", "PAUSED", "ENDED"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const campaign = await storage.getMarketingCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const updated = await storage.updateMarketingCampaignStatus(campaignId, status);

      await storage.createAuditLog({
        action: "campaign_status_updated",
        entityType: "marketing_campaign",
        entityId: campaignId,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ previousStatus: campaign.status, newStatus: status })
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error updating campaign status:", error);
      return res.status(500).json({ message: "Failed to update campaign status" });
    }
  });

  // Create partner lead (Admin only)
  app.post("/api/partners/lead", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { organizationName, contactName, contactEmail, partnerType, notes } = req.body;

      if (!organizationName || !contactName || !contactEmail || !partnerType) {
        return res.status(400).json({ message: "Organization name, contact name, email, and partner type are required" });
      }

      if (!["NGO", "HOSPITAL", "CHURCH", "SCHOOL", "GOV", "CORPORATE"].includes(partnerType)) {
        return res.status(400).json({ message: "Invalid partner type" });
      }

      const lead = await storage.createPartnerLead({
        organizationName,
        contactName,
        contactEmail,
        partnerType,
        notes: notes || null,
        status: "NEW"
      });

      await storage.createAuditLog({
        action: "partner_lead_created",
        entityType: "partner_lead",
        entityId: lead.id,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ organizationName, partnerType })
      });

      return res.json(lead);
    } catch (error) {
      console.error("Error creating partner lead:", error);
      return res.status(500).json({ message: "Failed to create partner lead" });
    }
  });

  // Get all partner leads (Admin only)
  app.get("/api/partners/leads", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const leads = await storage.getAllPartnerLeads();
      return res.json(leads);
    } catch (error) {
      console.error("Error getting partner leads:", error);
      return res.status(500).json({ message: "Failed to get partner leads" });
    }
  });

  // Update partner lead status (Admin only)
  app.patch("/api/partners/leads/:leadId/status", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { leadId } = req.params;
      const { status } = req.body;

      if (!["NEW", "CONTACTED", "IN_DISCUSSION", "SIGNED", "LOST"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const lead = await storage.getPartnerLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Partner lead not found" });
      }

      const updated = await storage.updatePartnerLeadStatus(leadId, status);

      await storage.createAuditLog({
        action: "partner_lead_status_updated",
        entityType: "partner_lead",
        entityId: leadId,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ previousStatus: lead.status, newStatus: status })
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error updating partner lead status:", error);
      return res.status(500).json({ message: "Failed to update partner lead status" });
    }
  });

  // Get growth stats (Admin only)
  app.get("/api/growth/stats", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const stats = await storage.getGrowthStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error getting growth stats:", error);
      return res.status(500).json({ message: "Failed to get growth stats" });
    }
  });

  // Phase 20 - Post-Launch Monitoring & Feature Flags

  // Get metrics overview (Admin, Finance)
  app.get("/api/metrics/overview", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const overview = await storage.getMetricsOverview();
      return res.json(overview);
    } catch (error) {
      console.error("Error getting metrics overview:", error);
      return res.status(500).json({ message: "Failed to get metrics overview" });
    }
  });

  // Get platform metrics (Admin, Finance)
  app.get("/api/metrics/platform", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const metrics = await storage.getPlatformMetrics();
      return res.json(metrics);
    } catch (error) {
      console.error("Error getting platform metrics:", error);
      return res.status(500).json({ message: "Failed to get platform metrics" });
    }
  });

  // Get rider metrics (Admin, Finance)
  app.get("/api/metrics/riders", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const metrics = await storage.getRiderMetrics();
      return res.json(metrics);
    } catch (error) {
      console.error("Error getting rider metrics:", error);
      return res.status(500).json({ message: "Failed to get rider metrics" });
    }
  });

  // Get driver metrics (Admin, Finance)
  app.get("/api/metrics/drivers", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const metrics = await storage.getDriverMetrics();
      return res.json(metrics);
    } catch (error) {
      console.error("Error getting driver metrics:", error);
      return res.status(500).json({ message: "Failed to get driver metrics" });
    }
  });

  // Get organization metrics (Admin, Finance)
  app.get("/api/metrics/organizations", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const metrics = await storage.getOrganizationMetrics();
      return res.json(metrics);
    } catch (error) {
      console.error("Error getting organization metrics:", error);
      return res.status(500).json({ message: "Failed to get organization metrics" });
    }
  });

  // Get financial metrics (Admin, Finance)
  app.get("/api/metrics/financials", isAuthenticated, requireRole(["admin", "finance"]), async (req: any, res) => {
    try {
      const metrics = await storage.getFinancialMetrics();
      return res.json(metrics);
    } catch (error) {
      console.error("Error getting financial metrics:", error);
      return res.status(500).json({ message: "Failed to get financial metrics" });
    }
  });

  // Get all feature flags (Admin only)
  app.get("/api/feature-flags", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const flags = await storage.getAllFeatureFlags();
      return res.json(flags);
    } catch (error) {
      console.error("Error getting feature flags:", error);
      return res.status(500).json({ message: "Failed to get feature flags" });
    }
  });

  // Create feature flag (Admin only)
  app.post("/api/feature-flags", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { name, description, enabled, rolloutPercentage } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Feature flag name is required" });
      }

      const existing = await storage.getFeatureFlag(name);
      if (existing) {
        return res.status(400).json({ message: "Feature flag with this name already exists" });
      }

      const flag = await storage.createFeatureFlag({
        name,
        description: description || null,
        enabled: enabled || false,
        rolloutPercentage: rolloutPercentage || 0
      });

      await storage.createAuditLog({
        action: "feature_flag_created",
        entityType: "feature_flag",
        entityId: flag.id,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ name, enabled, rolloutPercentage })
      });

      return res.json(flag);
    } catch (error) {
      console.error("Error creating feature flag:", error);
      return res.status(500).json({ message: "Failed to create feature flag" });
    }
  });

  // Update feature flag (Admin only)
  app.patch("/api/feature-flags/:name", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { name } = req.params;
      const { enabled, rolloutPercentage, description } = req.body;

      const existing = await storage.getFeatureFlag(name);
      if (!existing) {
        return res.status(404).json({ message: "Feature flag not found" });
      }

      const updated = await storage.updateFeatureFlag(name, {
        enabled: enabled !== undefined ? enabled : existing.enabled,
        rolloutPercentage: rolloutPercentage !== undefined ? rolloutPercentage : existing.rolloutPercentage,
        description: description !== undefined ? description : existing.description
      });

      await storage.createAuditLog({
        action: "feature_flag_updated",
        entityType: "feature_flag",
        entityId: existing.id,
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ 
          name, 
          previousEnabled: existing.enabled, 
          newEnabled: updated?.enabled,
          previousRollout: existing.rolloutPercentage,
          newRollout: updated?.rolloutPercentage
        })
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error updating feature flag:", error);
      return res.status(500).json({ message: "Failed to update feature flag" });
    }
  });

  // Check if feature is enabled for current user
  app.get("/api/feature-flags/:name/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { name } = req.params;
      const enabled = await storage.isFeatureEnabled(name, userId);
      return res.json({ enabled });
    } catch (error) {
      console.error("Error checking feature flag:", error);
      return res.status(500).json({ message: "Failed to check feature flag" });
    }
  });

  return httpServer;
}
