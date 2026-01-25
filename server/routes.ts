import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { insertDriverProfileSchema, insertTripSchema, updateDriverProfileSchema } from "@shared/schema";

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
      
      req.userRole = userRole.role;
      next();
    } catch (error) {
      console.error("Error checking role:", error);
      return res.status(500).json({ message: "Failed to verify access" });
    }
  };
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

  app.get("/api/admin/stats", isAuthenticated, requireRole(["admin", "director"]), async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error getting stats:", error);
      return res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.post("/api/admin/driver/:driverId/status", isAuthenticated, requireRole(["admin"]), async (req: any, res) => {
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

  return httpServer;
}
