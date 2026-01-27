import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { insertDriverProfileSchema, insertTripSchema, updateDriverProfileSchema, insertIncentiveProgramSchema, insertCountrySchema, insertTaxRuleSchema, insertExchangeRateSchema, insertComplianceProfileSchema } from "@shared/schema";
import { evaluateDriverForIncentives, approveAndPayIncentive, revokeIncentive, evaluateAllDrivers } from "./incentives";
import { notificationService } from "./notification-service";

const requireRole = (allowedRoles: string[]): RequestHandler => {
  return async (req: any, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        console.warn(`[SECURITY AUDIT] Unauthenticated access attempt to ${req.path}`);
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userRole = await storage.getUserRole(userId);
      if (!userRole) {
        console.warn(`[SECURITY AUDIT] User ${userId} has no role, denied access to ${req.path}`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // super_admin always has access to all roles
      const hasAccess = userRole.role === "super_admin" || allowedRoles.includes(userRole.role);
      if (!hasAccess) {
        // SECURITY AUDIT LOG: Log unauthorized admin access attempts
        console.warn(`[SECURITY AUDIT] Unauthorized access attempt: User ${userId} (role: ${userRole.role}) tried to access ${req.path} - Required roles: ${allowedRoles.join(", ")}`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // For admin role, check if still valid (time-bound)
      if (userRole.role === "admin") {
        const { valid, reason } = await storage.isAdminValid(userId);
        if (!valid) {
          console.warn(`[SECURITY AUDIT] Admin ${userId} access expired: ${reason}`);
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

  // Driver Payout Info Management
  app.get("/api/driver/payout-info", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getDriverWallet(userId);
      if (!wallet) {
        return res.json({ 
          bankName: null, 
          accountNumber: null, 
          accountName: null, 
          mobileMoneyProvider: null, 
          mobileMoneyNumber: null,
          preferredPayoutMethod: null,
          withdrawableBalance: "0.00"
        });
      }
      return res.json({
        bankName: wallet.bankName,
        accountNumber: wallet.accountNumber,
        accountName: wallet.accountName,
        mobileMoneyProvider: wallet.mobileMoneyProvider,
        mobileMoneyNumber: wallet.mobileMoneyNumber,
        preferredPayoutMethod: wallet.preferredPayoutMethod,
        withdrawableBalance: wallet.withdrawableBalance,
      });
    } catch (error) {
      console.error("Error getting driver payout info:", error);
      return res.status(500).json({ message: "Failed to get payout info" });
    }
  });

  app.patch("/api/driver/payout-info", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bankName, accountNumber, accountName, mobileMoneyProvider, mobileMoneyNumber, preferredPayoutMethod } = req.body;
      
      let wallet = await storage.getDriverWallet(userId);
      if (!wallet) {
        wallet = await storage.createDriverWallet({ userId, currency: "USD" });
      }
      
      const updated = await storage.updateDriverPayoutInfo(userId, {
        bankName,
        accountNumber,
        accountName,
        mobileMoneyProvider,
        mobileMoneyNumber,
        preferredPayoutMethod,
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Driver wallet not found" });
      }
      
      console.log(`[AUDIT] Driver payout info updated: userId=${userId}`);
      
      return res.json({ message: "Payout info updated", wallet: updated });
    } catch (error) {
      console.error("Error updating driver payout info:", error);
      return res.status(500).json({ message: "Failed to update payout info" });
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

  // Get rider wallet
  app.get("/api/rider/wallet", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let wallet = await storage.getRiderWallet(userId);
      
      // Auto-create wallet if doesn't exist
      if (!wallet) {
        wallet = await storage.createRiderWallet({ userId, currency: "NGN" });
      }
      
      return res.json(wallet);
    } catch (error) {
      console.error("Error getting rider wallet:", error);
      return res.status(500).json({ message: "Failed to get wallet" });
    }
  });

  // Get payment settings for rider (available methods based on mode)
  app.get("/api/rider/payment-settings", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getRiderProfile(userId);
      
      // Check if payments are in simulated mode
      const { isRealPaymentsEnabled } = await import("./payment-provider");
      const isNigeriaPaymentsEnabled = await isRealPaymentsEnabled("NG");
      const isSimulatedMode = !isNigeriaPaymentsEnabled;
      
      // Build available payment methods
      const availableMethods: { id: string; name: string; description: string; enabled: boolean }[] = [
        { id: "WALLET", name: "Wallet", description: "Pay from your ZIBA wallet balance", enabled: true },
      ];
      
      // Test Wallet only available in simulated mode
      if (isSimulatedMode) {
        availableMethods.push({
          id: "TEST_WALLET",
          name: "Test Wallet",
          description: "Testing only - No real charges (Simulated Mode)",
          enabled: true,
        });
      }
      
      // Card only available for Nigeria with Paystack enabled
      if (isNigeriaPaymentsEnabled) {
        availableMethods.push({
          id: "CARD",
          name: "Card (Paystack)",
          description: "Pay with debit/credit card via Paystack",
          enabled: true,
        });
      }
      
      return res.json({
        currentMethod: profile?.paymentMethod || "WALLET",
        availableMethods,
        walletMode: isSimulatedMode ? "SIMULATED" : "REAL",
        isTestWalletAvailable: isSimulatedMode,
        isCardAvailable: isNigeriaPaymentsEnabled,
      });
    } catch (error) {
      console.error("Error getting payment settings:", error);
      return res.status(500).json({ message: "Failed to get payment settings" });
    }
  });

  // Update rider payment method
  app.patch("/api/rider/payment-method", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { paymentMethod } = req.body;
      
      if (!paymentMethod || !["WALLET", "TEST_WALLET", "CARD"].includes(paymentMethod)) {
        return res.status(400).json({ message: "Invalid payment method" });
      }
      
      // Validate TEST_WALLET is only available in simulated mode
      if (paymentMethod === "TEST_WALLET") {
        const { isRealPaymentsEnabled } = await import("./payment-provider");
        const isSimulatedMode = !(await isRealPaymentsEnabled("NG"));
        if (!isSimulatedMode) {
          return res.status(400).json({ 
            message: "Test Wallet is only available in testing mode",
            code: "TEST_WALLET_NOT_AVAILABLE"
          });
        }
      }
      
      // Validate CARD is only available for Nigeria with Paystack enabled
      if (paymentMethod === "CARD") {
        const { isRealPaymentsEnabled } = await import("./payment-provider");
        const isCardAvailable = await isRealPaymentsEnabled("NG");
        if (!isCardAvailable) {
          return res.status(400).json({ 
            message: "Card payments are not yet available in your region",
            code: "CARD_NOT_AVAILABLE"
          });
        }
      }
      
      // Check if rider profile exists, create if not
      let profile = await storage.getRiderProfile(userId);
      if (!profile) {
        profile = await storage.createRiderProfile({ userId, paymentMethod });
      } else {
        profile = await storage.updateRiderPaymentMethod(userId, paymentMethod);
      }
      
      console.log(`[PAYMENT METHOD] User ${userId} changed to ${paymentMethod}`);
      
      return res.json({
        message: "Payment method updated",
        paymentMethod: profile?.paymentMethod,
      });
    } catch (error) {
      console.error("Error updating payment method:", error);
      return res.status(500).json({ message: "Failed to update payment method" });
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

      // Get rider profile to check payment method
      const riderProfile = await storage.getRiderProfile(userId);
      const paymentMethod = riderProfile?.paymentMethod || "WALLET";
      
      // Check if we're in simulated mode (no real payments enabled globally)
      const { isRealPaymentsEnabled } = await import("./payment-provider");
      const isSimulatedMode = !(await isRealPaymentsEnabled("NG")); // Default check against NG
      
      // Determine if this is a test ride
      const isTestRide = paymentMethod === "TEST_WALLET" && isSimulatedMode;
      
      // Log ride request audit
      console.log(`[RIDE AUDIT] userId=${userId}, paymentMethod=${paymentMethod}, walletMode=${isSimulatedMode ? "SIMULATED" : "REAL"}, isTestRide=${isTestRide}`);
      
      // TEST_WALLET: Bypass wallet balance checks in simulated mode
      if (isTestRide) {
        console.log(`[TEST_RIDE] Bypassing wallet check for user ${userId} - TEST_WALLET in SIMULATED mode`);
      } else {
        // WALLET-FIRST: Check rider wallet balance before allowing ride request
        const riderWallet = await storage.getRiderWallet(userId);
        if (!riderWallet) {
          // Auto-create wallet with zero balance
          await storage.createRiderWallet({ userId, currency: "NGN" });
          return res.status(400).json({ 
            message: "Please add funds to your wallet to request a ride.",
            code: "INSUFFICIENT_BALANCE"
          });
        }

        // Check if wallet is frozen
        if (riderWallet.isFrozen) {
          console.log(`[SECURITY AUDIT] Frozen wallet ride request attempt: userId=${userId}`);
          return res.status(403).json({ 
            message: "Your wallet is frozen. Please contact support.",
            code: "WALLET_FROZEN"
          });
        }

        // Check minimum balance requirement - WALLET payment
        const availableBalance = parseFloat(riderWallet.balance) - parseFloat(riderWallet.lockedBalance);
        const minimumRequiredBalance = 500; // ₦5.00 in kobo
        if (availableBalance < minimumRequiredBalance) {
          return res.status(400).json({ 
            message: "Please add funds to your wallet to request a ride.",
            code: "INSUFFICIENT_BALANCE",
            required: minimumRequiredBalance,
            available: availableBalance
          });
        }
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

  // Test Credit for Testers - Add funds to wallet (NO REAL PAYMENTS)
  app.post("/api/wallet/test-credit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const { amount } = req.body;
      
      // Default to 5000 NGN (stored as cents = 500000)
      const creditAmount = amount ? parseFloat(amount) : 500000;
      
      // Get or create rider wallet
      let riderWallet = await storage.getRiderWallet(userId);
      if (!riderWallet) {
        riderWallet = await storage.createRiderWallet({ userId, currency: "NGN" });
      }
      
      // Credit the wallet
      const updatedWallet = await storage.adjustRiderWalletBalance(userId, creditAmount, "TEST_CREDIT", userId);
      
      // Audit log
      console.log(`[TEST_CREDIT] userId=${userId}, email=${userEmail}, amount=${creditAmount}, timestamp=${new Date().toISOString()}`);
      
      // Log to financial audit
      await storage.createFinancialAuditLog({
        eventType: "ADJUSTMENT",
        userId: userId,
        actorRole: "RIDER",
        amount: creditAmount.toString(),
        currency: "NGN",
        description: `Test wallet credit for ${userEmail}`,
        metadata: JSON.stringify({ creditedBy: "SELF", reason: "TEST_CREDIT" }),
      });
      
      return res.json({
        success: true,
        message: "Test credit added successfully",
        balance: updatedWallet?.balance || creditAmount,
        currency: "NGN",
      });
    } catch (error) {
      console.error("Error adding test credit:", error);
      return res.status(500).json({ message: "Failed to add test credit" });
    }
  });

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

  // ================================================
  // Phase 22 - Enhanced Ride Lifecycle Routes
  // ================================================

  // Create a new ride request (Rider action)
  app.post("/api/rides", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      // Verify user is a rider
      const role = await storage.getUserRole(userId);
      if (role?.role !== "rider") {
        return res.status(403).json({ message: "Only riders can request rides" });
      }

      const { pickupLat, pickupLng, pickupAddress, dropoffLat, dropoffLng, dropoffAddress, passengerCount } = req.body;

      // Validate required fields
      if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
        return res.status(400).json({ message: "Pickup and dropoff coordinates are required" });
      }

      const ride = await storage.createRide({
        riderId: userId,
        pickupLat: pickupLat.toString(),
        pickupLng: pickupLng.toString(),
        pickupAddress: pickupAddress || null,
        dropoffLat: dropoffLat.toString(),
        dropoffLng: dropoffLng.toString(),
        dropoffAddress: dropoffAddress || null,
        passengerCount: passengerCount || 1,
      });

      // Log the action
      await storage.createRideAuditLog({
        rideId: ride.id,
        action: "ride_requested",
        actorId: userId,
        actorRole: "rider",
        previousStatus: null,
        newStatus: "matching",
        metadata: JSON.stringify({ pickupAddress, dropoffAddress }),
      });

      return res.status(201).json(ride);
    } catch (error) {
      console.error("Error creating ride:", error);
      return res.status(500).json({ message: "Failed to create ride" });
    }
  });

  // Get available rides for drivers (matching status)
  app.get("/api/rides/available", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      // Verify user is a driver
      const role = await storage.getUserRole(userId);
      if (role?.role !== "driver") {
        return res.status(403).json({ message: "Only drivers can view available rides" });
      }

      const rides = await storage.getRidesByStatus("matching");
      
      // Filter out expired matching windows
      const now = new Date();
      const activeRides = rides.filter(ride => 
        !ride.matchingExpiresAt || new Date(ride.matchingExpiresAt) > now
      );

      return res.json(activeRides);
    } catch (error) {
      console.error("Error fetching available rides:", error);
      return res.status(500).json({ message: "Failed to fetch available rides" });
    }
  });

  // Get ride by ID
  app.get("/api/rides/:rideId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { rideId } = req.params;

      const ride = await storage.getRideById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      // Only rider, assigned driver, or admin can view
      const role = await storage.getUserRole(userId);
      if (ride.riderId !== userId && ride.driverId !== userId && role?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to view this ride" });
      }

      return res.json(ride);
    } catch (error) {
      console.error("Error fetching ride:", error);
      return res.status(500).json({ message: "Failed to fetch ride" });
    }
  });

  // Get rider's rides
  app.get("/api/rides/rider/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const rides = await storage.getRiderRides(userId);
      return res.json(rides);
    } catch (error) {
      console.error("Error fetching rider rides:", error);
      return res.status(500).json({ message: "Failed to fetch rides" });
    }
  });

  // Get rider's current active ride
  app.get("/api/rides/rider/current", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const ride = await storage.getCurrentRiderRide(userId);
      
      if (ride && ride.driverId) {
        const driverProfile = await storage.getDriverProfile(ride.driverId);
        if (driverProfile) {
          return res.json({
            ...ride,
            driverName: driverProfile.fullName,
            driverPhone: driverProfile.phone,
            driverVehicle: `${driverProfile.vehicleMake} ${driverProfile.vehicleModel}`,
            driverLicensePlate: driverProfile.licensePlate,
            driverRating: driverProfile.averageRating,
          });
        }
      }
      
      return res.json(ride);
    } catch (error) {
      console.error("Error fetching current rider ride:", error);
      return res.status(500).json({ message: "Failed to fetch current ride" });
    }
  });

  // Get driver's current active ride
  app.get("/api/rides/driver/current", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      const role = await storage.getUserRole(userId);
      if (role?.role !== "driver") {
        return res.status(403).json({ message: "Only drivers can access this" });
      }
      
      const ride = await storage.getCurrentDriverRide(userId);
      
      if (ride && ride.riderId) {
        const riderProfile = await storage.getRiderProfile(ride.riderId);
        if (riderProfile) {
          return res.json({
            ...ride,
            riderName: riderProfile.fullName || "Rider",
          });
        }
      }
      
      return res.json(ride);
    } catch (error) {
      console.error("Error fetching current driver ride:", error);
      return res.status(500).json({ message: "Failed to fetch current ride" });
    }
  });

  // Get driver's rides
  app.get("/api/rides/driver/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const rides = await storage.getDriverRides(userId);
      return res.json(rides);
    } catch (error) {
      console.error("Error fetching driver rides:", error);
      return res.status(500).json({ message: "Failed to fetch rides" });
    }
  });

  // Driver accepts a ride
  app.post("/api/rides/:rideId/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { rideId } = req.params;

      // Verify user is a driver
      const role = await storage.getUserRole(userId);
      if (role?.role !== "driver") {
        return res.status(403).json({ message: "Only drivers can accept rides" });
      }

      const ride = await storage.getRideById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      // Validate action using lifecycle rules
      const { validateAction } = await import("./ride-lifecycle.js");
      const validation = validateAction("accept_ride", "driver", ride.status as any, {
        matchingExpiresAt: ride.matchingExpiresAt,
      });

      if (!validation.allowed) {
        return res.status(400).json({ message: validation.error });
      }

      const updatedRide = await storage.assignDriverToRide(rideId, userId);

      // Log the action
      await storage.createRideAuditLog({
        rideId,
        action: "ride_accepted",
        actorId: userId,
        actorRole: "driver",
        previousStatus: ride.status,
        newStatus: "accepted",
      });

      // Notify rider
      await storage.createNotification({
        userId: ride.riderId,
        role: "rider",
        title: "Driver Assigned",
        type: "ride_update",
        message: "Your driver is on the way!",
      });

      return res.json(updatedRide);
    } catch (error: any) {
      console.error("Error accepting ride:", error);
      return res.status(500).json({ message: error.message || "Failed to accept ride" });
    }
  });

  // Driver starts pickup navigation
  app.post("/api/rides/:rideId/start-pickup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { rideId } = req.params;

      const ride = await storage.getRideById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      // Validate driver is assigned
      if (ride.driverId !== userId) {
        return res.status(403).json({ message: "Only the assigned driver can perform this action" });
      }

      const { validateAction, isValidTransition } = await import("./ride-lifecycle.js");
      const validation = validateAction("start_pickup", "driver", ride.status as any, {
        isAssignedDriver: true,
      });

      if (!validation.allowed) {
        return res.status(400).json({ message: validation.error });
      }

      // Validate state transition
      const transition = isValidTransition(ride.status as any, "driver_en_route");
      if (!transition.valid) {
        return res.status(400).json({ message: transition.error });
      }

      const updatedRide = await storage.updateRideStatus(rideId, "driver_en_route");

      // Log the action
      await storage.createRideAuditLog({
        rideId,
        action: "pickup_started",
        actorId: userId,
        actorRole: "driver",
        previousStatus: ride.status,
        newStatus: "driver_en_route",
      });

      return res.json(updatedRide);
    } catch (error) {
      console.error("Error starting pickup:", error);
      return res.status(500).json({ message: "Failed to start pickup" });
    }
  });

  // Driver arrives at pickup
  app.post("/api/rides/:rideId/arrive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { rideId } = req.params;

      const ride = await storage.getRideById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      if (ride.driverId !== userId) {
        return res.status(403).json({ message: "Only the assigned driver can perform this action" });
      }

      const { validateAction, isValidTransition } = await import("./ride-lifecycle.js");
      const validation = validateAction("arrive", "driver", ride.status as any, {
        isAssignedDriver: true,
      });

      if (!validation.allowed) {
        return res.status(400).json({ message: validation.error });
      }

      const transition = isValidTransition(ride.status as any, "arrived");
      if (!transition.valid) {
        return res.status(400).json({ message: transition.error });
      }

      const updatedRide = await storage.updateRideStatus(rideId, "arrived");

      // Log the action
      await storage.createRideAuditLog({
        rideId,
        action: "driver_arrived",
        actorId: userId,
        actorRole: "driver",
        previousStatus: ride.status,
        newStatus: "arrived",
      });

      // Notify rider
      await storage.createNotification({
        userId: ride.riderId,
        role: "rider",
        title: "Driver Arrived",
        type: "ride_update",
        message: "Your driver has arrived!",
      });

      return res.json(updatedRide);
    } catch (error) {
      console.error("Error marking arrival:", error);
      return res.status(500).json({ message: "Failed to mark arrival" });
    }
  });

  // System/Driver starts waiting period
  app.post("/api/rides/:rideId/start-waiting", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { rideId } = req.params;

      const ride = await storage.getRideById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      if (ride.driverId !== userId) {
        return res.status(403).json({ message: "Only the assigned driver can perform this action" });
      }

      const { isValidTransition } = await import("./ride-lifecycle.js");
      const transition = isValidTransition(ride.status as any, "waiting");
      if (!transition.valid) {
        return res.status(400).json({ message: transition.error });
      }

      const updatedRide = await storage.updateRideStatus(rideId, "waiting");

      // Log the action
      await storage.createRideAuditLog({
        rideId,
        action: "waiting_started",
        actorId: userId,
        actorRole: "driver",
        previousStatus: ride.status,
        newStatus: "waiting",
      });

      return res.json(updatedRide);
    } catch (error) {
      console.error("Error starting waiting:", error);
      return res.status(500).json({ message: "Failed to start waiting period" });
    }
  });

  // Driver starts the trip
  app.post("/api/rides/:rideId/start-trip", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { rideId } = req.params;

      const ride = await storage.getRideById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      if (ride.driverId !== userId) {
        return res.status(403).json({ message: "Only the assigned driver can perform this action" });
      }

      const { validateAction, isValidTransition, calculateWaitingTime } = await import("./ride-lifecycle.js");
      const validation = validateAction("start_trip", "driver", ride.status as any, {
        isAssignedDriver: true,
      });

      if (!validation.allowed) {
        return res.status(400).json({ message: validation.error });
      }

      const transition = isValidTransition(ride.status as any, "in_progress");
      if (!transition.valid) {
        return res.status(400).json({ message: transition.error });
      }

      // Calculate waiting time if applicable
      let waitingData: any = {};
      if (ride.waitingStartedAt) {
        const waiting = calculateWaitingTime(ride.waitingStartedAt);
        waitingData = {
          waitingPaidMin: waiting.paidMinutes + waiting.bonusMinutes,
        };
      }

      const updatedRide = await storage.updateRideStatus(rideId, "in_progress", {
        ...waitingData,
        lastMovementAt: new Date(),
      });

      // Log the action
      await storage.createRideAuditLog({
        rideId,
        action: "trip_started",
        actorId: userId,
        actorRole: "driver",
        previousStatus: ride.status,
        newStatus: "in_progress",
        metadata: JSON.stringify(waitingData),
      });

      return res.json(updatedRide);
    } catch (error) {
      console.error("Error starting trip:", error);
      return res.status(500).json({ message: "Failed to start trip" });
    }
  });

  // Driver completes the trip
  app.post("/api/rides/:rideId/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { rideId } = req.params;
      const { confirmFinalDestination, isEarlyStop } = req.body;

      const ride = await storage.getRideById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      if (ride.driverId !== userId) {
        return res.status(403).json({ message: "Only the assigned driver can perform this action" });
      }

      const { validateAction, isValidTransition } = await import("./ride-lifecycle.js");
      const validation = validateAction("complete_trip", "driver", ride.status as any, {
        isAssignedDriver: true,
      });

      if (!validation.allowed) {
        return res.status(400).json({ message: validation.error });
      }

      // Require confirmation that this is the final destination
      if (confirmFinalDestination !== true) {
        return res.status(400).json({ 
          message: "Please confirm this is the final destination",
          requiresConfirmation: true 
        });
      }

      const transition = isValidTransition(ride.status as any, "completed");
      if (!transition.valid) {
        return res.status(400).json({ message: transition.error });
      }

      // Calculate trip duration
      const startedAt = ride.startedAt ? new Date(ride.startedAt) : new Date();
      const completedAt = new Date();
      const tripDurationMin = (completedAt.getTime() - startedAt.getTime()) / (1000 * 60);

      // Get total distance from driver movements
      const movement = await storage.getTotalDriverMovement(rideId);
      const actualDistanceKm = movement.distanceKm;

      // Import fare calculation module
      const { 
        calculateCompleteFare, 
        generateFareReceipt,
        recalculateFareForEarlyStop 
      } = await import("./fare-calculation.js");

      // Calculate fare with all components
      const fareBreakdown = calculateCompleteFare({
        distanceKm: actualDistanceKm,
        durationMin: tripDurationMin,
        estimatedDurationMin: parseFloat(ride.estimatedDurationMin || "0"),
        waitingStartedAt: ride.waitingStartedAt ? new Date(ride.waitingStartedAt) : null,
        tripEndedAt: completedAt,
        currency: ride.currency || "USD"
      });

      // Handle early stop case
      let earlyStopData = null;
      if (isEarlyStop) {
        earlyStopData = recalculateFareForEarlyStop({
          originalEstimatedKm: parseFloat(ride.estimatedDistanceKm || "0"),
          actualDistanceKm,
          originalEstimatedMin: parseFloat(ride.estimatedDurationMin || "0"),
          actualDurationMin: tripDurationMin,
          waitingStartedAt: ride.waitingStartedAt ? new Date(ride.waitingStartedAt) : null,
          tripEndedAt: completedAt
        });
      }

      // Update ride with final fare breakdown
      const updatedRide = await storage.updateRideStatus(rideId, "completed", {
        actualDurationMin: tripDurationMin.toString(),
        actualDistanceKm: actualDistanceKm.toString(),
        baseFare: fareBreakdown.baseFare.toString(),
        distanceFare: fareBreakdown.distanceFare.toString(),
        timeFare: fareBreakdown.timeFare.toString(),
        waitingFee: fareBreakdown.waitingFee.toString(),
        trafficFee: fareBreakdown.trafficFee.toString(),
        totalFare: fareBreakdown.totalFare.toString(),
        driverEarning: fareBreakdown.driverEarning.toString(),
        platformFee: fareBreakdown.platformFee.toString(),
        earlyStopConfirmed: isEarlyStop || false,
      });

      // Get driver info for receipt
      const driverProfile = await storage.getDriverProfile(userId);

      // Generate receipt
      const receipt = generateFareReceipt({
        rideId,
        fareBreakdown,
        pickupAddress: ride.pickupAddress || "Pickup location",
        dropoffAddress: ride.dropoffAddress || "Dropoff location",
        distanceKm: actualDistanceKm,
        durationMin: tripDurationMin,
        driverName: driverProfile?.fullName || "Your driver",
        completedAt
      });

      // Log the action
      await storage.createRideAuditLog({
        rideId,
        action: "trip_completed",
        actorId: userId,
        actorRole: "driver",
        previousStatus: ride.status,
        newStatus: "completed",
        metadata: JSON.stringify({ 
          tripDurationMin,
          fareBreakdown,
          receipt,
          earlyStopData,
          isEarlyStop: isEarlyStop || false
        }),
      });

      // Notify rider with receipt info
      await storage.createNotification({
        userId: ride.riderId,
        role: "rider",
        title: "Trip Complete",
        type: "ride_update",
        message: `Your trip is complete! Total fare: $${fareBreakdown.totalFare.toFixed(2)}. Please rate your driver.`,
      });

      return res.json({
        ...updatedRide,
        fareBreakdown,
        receipt,
        earlyStopData
      });
    } catch (error) {
      console.error("Error completing trip:", error);
      return res.status(500).json({ message: "Failed to complete trip" });
    }
  });

  // Cancel a ride (Rider or Driver)
  app.post("/api/rides/:rideId/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { rideId } = req.params;
      const { reason, driverCancelReason } = req.body;

      const ride = await storage.getRideById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      // Determine role
      const isRider = ride.riderId === userId;
      const isDriver = ride.driverId === userId;

      if (!isRider && !isDriver) {
        return res.status(403).json({ message: "Only the rider or assigned driver can cancel" });
      }

      const role = isRider ? "rider" : "driver";
      const { validateAction, isDriverEligibleForCompensation } = await import("./ride-lifecycle.js");
      const { 
        calculateCancellationCompensation, 
        canCancelWithoutPenalty,
        isJustifiedCancellation 
      } = await import("./fare-calculation.js");

      // Block rider cancellation during in_progress
      if (isRider && ride.status === "in_progress") {
        return res.status(400).json({ 
          message: "You cannot cancel a ride that is already in progress. Please contact your driver directly.",
          blocked: true 
        });
      }

      // Get driver movement if applicable
      let driverMovement = { distanceKm: 0, durationSec: 0 };
      if (ride.driverId) {
        driverMovement = await storage.getTotalDriverMovement(rideId);
      }

      const validation = validateAction("cancel_ride", role, ride.status as any, {
        driverMovement,
      });

      if (!validation.allowed) {
        return res.status(400).json({ message: validation.error });
      }

      // Check if reason is required (driver cancelling in_progress)
      if (validation.requiresReason && !reason) {
        return res.status(400).json({ 
          message: "Cancellation reason is required",
          requiresReason: true,
          validReasons: ["rider_requested", "safety_concern", "vehicle_issue", "emergency", "rider_no_show", "other"]
        });
      }

      // Calculate compensation for rider cancellation
      let compensationData = null;
      let compensationEligible = false;
      if (isRider && ride.driverId) {
        compensationData = calculateCancellationCompensation({
          distanceKm: driverMovement.distanceKm,
          durationSec: driverMovement.durationSec,
          waitingStartedAt: ride.waitingStartedAt ? new Date(ride.waitingStartedAt) : null,
          cancelledAt: new Date()
        });
        compensationEligible = compensationData.eligible;
      }

      // For driver cancellation, check if reason is justified
      let driverCompensation = null;
      if (isDriver && driverCancelReason) {
        const justified = isJustifiedCancellation(driverCancelReason);
        if (justified && ["rider_requested", "rider_no_show"].includes(driverCancelReason)) {
          // Driver gets compensated for rider-caused cancellations
          driverCompensation = calculateCancellationCompensation({
            distanceKm: driverMovement.distanceKm,
            durationSec: driverMovement.durationSec,
            waitingStartedAt: ride.waitingStartedAt ? new Date(ride.waitingStartedAt) : null,
            cancelledAt: new Date()
          });
        }
      }

      // Check penalty status for riders
      let penaltyInfo = null;
      if (isRider && ride.waitingStartedAt) {
        penaltyInfo = canCancelWithoutPenalty(new Date(ride.waitingStartedAt));
      }

      const cancelledBy = isRider ? "rider" : "driver";
      const updatedRide = await storage.cancelRide(rideId, cancelledBy, reason, {
        driverCancelReason,
        cancellationFee: compensationData?.riderCharge || null,
        driverCancelCompensation: (compensationData?.driverCompensation || driverCompensation?.driverCompensation) || null,
        platformCancelFee: (compensationData?.platformFee || driverCompensation?.platformFee) || null,
        compensationEligible,
      });

      // Log the action
      await storage.createRideAuditLog({
        rideId,
        action: "ride_cancelled",
        actorId: userId,
        actorRole: role,
        previousStatus: ride.status,
        newStatus: "cancelled",
        metadata: JSON.stringify({ 
          reason, 
          driverCancelReason,
          cancelledBy,
          compensationEligible,
          compensationData,
          driverCompensation,
          driverMovement,
          penaltyInfo,
          appliedFee: validation.requiresFee,
        }),
      });

      // Notify the other party
      if (isRider && ride.driverId) {
        const compensationMsg = compensationEligible 
          ? ` You will receive a compensation of $${compensationData?.driverCompensation?.toFixed(2)}.`
          : "";
        await storage.createNotification({
          userId: ride.driverId,
          role: "driver",
          title: "Ride Cancelled",
          type: "ride_update",
          message: `The rider has cancelled the ride.${compensationMsg}`,
        });
      } else if (isDriver) {
        await storage.createNotification({
          userId: ride.riderId,
          role: "rider",
          title: "Ride Cancelled",
          type: "ride_update",
          message: "Your driver has cancelled the ride. We'll find you another driver.",
        });
      }

      return res.json({
        ...updatedRide,
        compensationEligible,
        compensationData,
        driverCompensation,
        penaltyInfo,
        feeApplied: validation.requiresFee,
      });
    } catch (error) {
      console.error("Error cancelling ride:", error);
      return res.status(500).json({ message: "Failed to cancel ride" });
    }
  });

  // Record driver movement (for tracking en route)
  app.post("/api/rides/:rideId/movement", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { rideId } = req.params;
      const { lat, lng, distanceKm, durationSec } = req.body;

      const ride = await storage.getRideById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      if (ride.driverId !== userId) {
        return res.status(403).json({ message: "Only the assigned driver can record movement" });
      }

      // Only track movement during en_route or in_progress
      if (ride.status !== "driver_en_route" && ride.status !== "in_progress") {
        return res.status(400).json({ message: "Movement tracking not active for current status" });
      }

      const movement = await storage.createDriverMovement({
        rideId,
        driverId: userId,
        lat: lat?.toString(),
        lng: lng?.toString(),
        distanceKm: distanceKm?.toString(),
        durationSec,
      });

      // Update last movement timestamp for safety detection
      if (ride.status === "in_progress") {
        await storage.updateRideStatus(rideId, ride.status, {
          lastMovementAt: new Date(),
        });
      }

      return res.json(movement);
    } catch (error) {
      console.error("Error recording movement:", error);
      return res.status(500).json({ message: "Failed to record movement" });
    }
  });

  // Safety check - report safe status
  app.post("/api/rides/:rideId/safety-check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { rideId } = req.params;
      const { isSafe, message } = req.body;

      const ride = await storage.getRideById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      // Either rider or driver can respond
      if (ride.riderId !== userId && ride.driverId !== userId) {
        return res.status(403).json({ message: "Only ride participants can respond to safety check" });
      }

      const role = ride.riderId === userId ? "rider" : "driver";

      // Log the safety response
      await storage.createRideAuditLog({
        rideId,
        action: "safety_check_response",
        actorId: userId,
        actorRole: role,
        previousStatus: ride.status,
        newStatus: ride.status,
        metadata: JSON.stringify({ isSafe, message, respondedBy: role }),
      });

      // Update safety check timestamp
      await storage.updateRideStatus(rideId, ride.status, {
        safetyCheckAt: new Date(),
      });

      return res.json({ success: true, message: "Safety response recorded" });
    } catch (error) {
      console.error("Error recording safety check:", error);
      return res.status(500).json({ message: "Failed to record safety check" });
    }
  });

  // Get ride audit logs
  app.get("/api/rides/:rideId/audit-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { rideId } = req.params;

      const ride = await storage.getRideById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      // Only rider, driver, or admin can view
      const role = await storage.getUserRole(userId);
      if (ride.riderId !== userId && ride.driverId !== userId && role?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to view audit logs" });
      }

      const logs = await storage.getRideAuditLogs(rideId);
      return res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      return res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ==========================================
  // Ride Offers Routes
  // ==========================================

  // Get pending ride offer for current driver
  app.get("/api/ride-offers/pending", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const offer = await storage.getPendingRideOfferForDriver(userId);
      
      if (!offer) {
        return res.json(null);
      }

      // Get ride details
      const ride = await storage.getRideById(offer.rideId);
      if (!ride) {
        return res.json(null);
      }

      return res.json({
        ...offer,
        ride: {
          pickupAddress: ride.pickupAddress,
          dropoffAddress: ride.dropoffAddress,
          estimatedFare: ride.totalFare || ride.baseFare,
          passengerCount: ride.passengerCount,
        }
      });
    } catch (error) {
      console.error("Error getting pending offer:", error);
      return res.status(500).json({ message: "Failed to get pending offer" });
    }
  });

  // Accept a ride offer
  app.post("/api/ride-offers/:offerId/accept", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { offerId } = req.params;

      const offer = await storage.getPendingRideOfferForDriver(userId);
      if (!offer || offer.id !== offerId) {
        return res.status(400).json({ message: "Offer not found or expired" });
      }

      // Check if offer is expired
      if (new Date() > new Date(offer.offerExpiresAt)) {
        await storage.updateRideOfferStatus(offerId, "expired");
        return res.status(400).json({ message: "Offer has expired" });
      }

      const ride = await storage.getRideById(offer.rideId);
      if (!ride || ride.status !== "matching") {
        await storage.updateRideOfferStatus(offerId, "expired");
        return res.status(400).json({ message: "Ride is no longer available" });
      }

      // Accept the offer
      await storage.updateRideOfferStatus(offerId, "accepted");

      // Assign driver to ride
      const updatedRide = await storage.assignDriverToRide(offer.rideId, userId);
      
      if (!updatedRide) {
        return res.status(500).json({ message: "Failed to assign driver to ride" });
      }

      // Expire all other pending offers for this ride
      await storage.expirePendingOffersForRide(offer.rideId, userId);

      // Send notifications
      await notificationService.onRideAccepted(updatedRide, userId);

      // Log the action
      await storage.createRideAuditLog({
        rideId: offer.rideId,
        action: "ride_accepted",
        actorId: userId,
        actorRole: "driver",
        previousStatus: "matching",
        newStatus: "accepted",
      });

      return res.json({ success: true, ride: updatedRide });
    } catch (error) {
      console.error("Error accepting offer:", error);
      return res.status(500).json({ message: "Failed to accept offer" });
    }
  });

  // Decline a ride offer
  app.post("/api/ride-offers/:offerId/decline", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { offerId } = req.params;

      const offer = await storage.getPendingRideOfferForDriver(userId);
      if (!offer || offer.id !== offerId) {
        return res.status(400).json({ message: "Offer not found" });
      }

      await storage.updateRideOfferStatus(offerId, "declined");

      return res.json({ success: true });
    } catch (error) {
      console.error("Error declining offer:", error);
      return res.status(500).json({ message: "Failed to decline offer" });
    }
  });

  // ==========================================
  // Profile Photo Routes
  // ==========================================

  // Upload profile photo (driver or rider)
  app.post("/api/profile/photo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { photoData } = req.body;

      if (!photoData) {
        return res.status(400).json({ message: "Photo data is required" });
      }

      const role = await storage.getUserRole(userId);
      
      if (role?.role === "driver") {
        await storage.updateDriverProfilePhoto(userId, photoData);
      } else if (role?.role === "rider") {
        await storage.updateRiderProfilePhoto(userId, photoData);
      } else {
        return res.status(400).json({ message: "Profile photos are for riders and drivers only" });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      return res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Upload verification photo (live photo for identity verification)
  app.post("/api/profile/verification-photo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { photoData, sessionId } = req.body;

      if (!photoData || !sessionId) {
        return res.status(400).json({ message: "Photo data and session ID are required" });
      }

      const role = await storage.getUserRole(userId);
      
      if (role?.role === "driver") {
        await storage.updateDriverVerificationPhoto(userId, photoData, sessionId);
      } else if (role?.role === "rider") {
        await storage.updateRiderVerificationPhoto(userId, photoData, sessionId);
      } else {
        return res.status(400).json({ message: "Verification photos are for riders and drivers only" });
      }

      return res.json({ success: true, status: "pending_review" });
    } catch (error) {
      console.error("Error uploading verification photo:", error);
      return res.status(500).json({ message: "Failed to upload verification photo" });
    }
  });

  // Admin: Get drivers needing verification
  app.get("/api/admin/drivers/pending-verification", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const drivers = await storage.getDriversNeedingVerification();
      return res.json(drivers);
    } catch (error) {
      console.error("Error getting pending verifications:", error);
      return res.status(500).json({ message: "Failed to get pending verifications" });
    }
  });

  // Admin: Approve or reject driver verification
  app.post("/api/admin/drivers/:driverId/verify", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { driverId } = req.params;
      const { status } = req.body;

      if (!["verified", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid verification status" });
      }

      await storage.updateDriverVerificationStatus(driverId, status);

      // Notify driver
      const message = status === "verified" 
        ? "Your identity has been verified. You can now start accepting rides."
        : "Your identity verification was not approved. Please submit a new photo.";

      await storage.createNotification({
        userId: driverId,
        role: "driver",
        title: status === "verified" ? "Verification Approved" : "Verification Rejected",
        message,
        type: status === "verified" ? "success" : "warning",
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Error updating verification:", error);
      return res.status(500).json({ message: "Failed to update verification" });
    }
  });

  // ================================================
  // Phase 24 - Reservations / Scheduled Trips Routes
  // ================================================

  // Create a new reservation (Rider action)
  app.post("/api/reservations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      const role = await storage.getUserRole(userId);
      if (role?.role !== "rider") {
        return res.status(403).json({ message: "Only riders can create reservations" });
      }

      const { pickupLat, pickupLng, dropoffLat, dropoffLng, pickupAddress, dropoffAddress, scheduledPickupAt, passengerCount } = req.body;

      if (!scheduledPickupAt) {
        return res.status(400).json({ message: "Scheduled pickup time is required" });
      }

      const scheduledTime = new Date(scheduledPickupAt);
      const now = new Date();
      const minAdvanceTime = new Date(now.getTime() + 60 * 60 * 1000);
      
      if (scheduledTime < minAdvanceTime) {
        return res.status(400).json({ message: "Reservations must be at least 1 hour in advance" });
      }

      const estimatedDistanceKm = Math.random() * 15 + 3;
      const estimatedDurationMin = estimatedDistanceKm * 3 + Math.random() * 10;
      const baseFare = 2.50;
      const distanceFare = estimatedDistanceKm * 0.75;
      const reservationPremium = 5.00;
      const totalFare = baseFare + distanceFare + reservationPremium;

      const reservation = await storage.createReservation({
        riderId: userId,
        pickupLat: pickupLat.toString(),
        pickupLng: pickupLng.toString(),
        dropoffLat: dropoffLat.toString(),
        dropoffLng: dropoffLng.toString(),
        pickupAddress,
        dropoffAddress,
        scheduledPickupAt: scheduledTime,
        passengerCount: passengerCount || 1,
        estimatedDistanceKm: estimatedDistanceKm.toFixed(2),
        estimatedDurationMin: estimatedDurationMin.toFixed(0),
        baseFare: baseFare.toFixed(2),
        distanceFare: distanceFare.toFixed(2),
        reservationPremium: reservationPremium.toFixed(2),
        totalFare: totalFare.toFixed(2),
      });

      await notificationService.notifyRider(
        userId,
        "ride_accepted",
        "Reservation Confirmed",
        `Your ride is scheduled for ${scheduledTime.toLocaleString()}`,
        reservation.id
      );

      return res.json(reservation);
    } catch (error) {
      console.error("Error creating reservation:", error);
      return res.status(500).json({ message: "Failed to create reservation" });
    }
  });

  // Get rider's upcoming reservations
  app.get("/api/reservations/upcoming", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const reservations = await storage.getUpcomingReservations(userId);
      return res.json(reservations);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      return res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  // Get driver's upcoming assigned reservations
  app.get("/api/reservations/driver/upcoming", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const role = await storage.getUserRole(userId);
      if (role?.role !== "driver") {
        return res.status(403).json({ message: "Only drivers can view assigned reservations" });
      }
      const reservations = await storage.getDriverUpcomingReservations(userId);
      return res.json(reservations);
    } catch (error) {
      console.error("Error fetching driver reservations:", error);
      return res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  // Get all upcoming reservations (Admin)
  app.get("/api/reservations/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const role = await storage.getUserRole(userId);
      if (!["admin", "super_admin"].includes(role?.role || "")) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const reservations = await storage.getAllUpcomingReservations();
      return res.json(reservations);
    } catch (error) {
      console.error("Error fetching all reservations:", error);
      return res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  // Assign driver to reservation (Admin)
  app.post("/api/reservations/:id/assign", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      const { driverId } = req.body;

      const role = await storage.getUserRole(userId);
      if (!["admin", "super_admin"].includes(role?.role || "")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const reservation = await storage.assignDriverToReservation(id, driverId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found or already assigned" });
      }

      await notificationService.notifyDriver(
        driverId,
        "ride_accepted",
        "New Reserved Trip",
        `You've been assigned a scheduled pickup for ${new Date(reservation.scheduledPickupAt!).toLocaleString()}`,
        id
      );

      await notificationService.notifyRider(
        reservation.riderId,
        "ride_accepted",
        "Driver Assigned",
        "A driver has been assigned to your scheduled trip",
        id
      );

      return res.json(reservation);
    } catch (error) {
      console.error("Error assigning driver:", error);
      return res.status(500).json({ message: "Failed to assign driver" });
    }
  });

  // Cancel reservation (Rider action)
  app.post("/api/reservations/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      const { reason } = req.body;

      const reservation = await storage.getRideById(id);
      if (!reservation || reservation.riderId !== userId) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      const cancelled = await storage.cancelReservation(id, "rider", reason);
      if (!cancelled) {
        return res.status(400).json({ message: "Failed to cancel reservation" });
      }

      if (cancelled.assignedDriverId) {
        await notificationService.notifyDriver(
          cancelled.assignedDriverId,
          "ride_cancelled",
          "Reservation Cancelled",
          "A scheduled trip has been cancelled by the rider",
          id
        );
      }

      return res.json(cancelled);
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      return res.status(500).json({ message: "Failed to cancel reservation" });
    }
  });

  // Start reserved trip (Driver action - when entering prep window)
  app.post("/api/reservations/:id/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      const role = await storage.getUserRole(userId);
      if (role?.role !== "driver") {
        return res.status(403).json({ message: "Only drivers can start reserved trips" });
      }

      const reservation = await storage.getRideById(id);
      if (!reservation || reservation.assignedDriverId !== userId) {
        return res.status(404).json({ message: "Reservation not found or not assigned to you" });
      }

      const updated = await storage.updateReservationStatus(id, "active");
      if (updated) {
        await storage.updateRideStatus(id, "driver_en_route", {
          enRouteAt: new Date(),
          driverEnRouteStartedAt: new Date(),
        });

        await notificationService.notifyRider(
          reservation.riderId,
          "driver_en_route",
          "Driver On The Way",
          "Your driver is heading to the pickup location",
          id
        );
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error starting reservation:", error);
      return res.status(500).json({ message: "Failed to start reservation" });
    }
  });

  // Apply early arrival bonus
  app.post("/api/reservations/:id/early-bonus", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      const role = await storage.getUserRole(userId);
      if (!["admin", "super_admin"].includes(role?.role || "")) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const reservation = await storage.getRideById(id);
      if (!reservation || !reservation.isReserved) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (!reservation.arrivedAt || !reservation.scheduledPickupAt) {
        return res.status(400).json({ message: "Cannot calculate bonus - missing arrival data" });
      }

      const arrivedTime = new Date(reservation.arrivedAt);
      const scheduledTime = new Date(reservation.scheduledPickupAt);
      const minutesEarly = (scheduledTime.getTime() - arrivedTime.getTime()) / (1000 * 60);

      if (minutesEarly <= 0) {
        return res.status(400).json({ message: "Driver did not arrive early" });
      }

      const bonusAmount = Math.min(minutesEarly * 0.50, 10.00).toFixed(2);
      const updated = await storage.applyEarlyArrivalBonus(id, bonusAmount);

      if (updated && reservation.driverId) {
        const wallet = await storage.getWalletByUserId(reservation.driverId);
        if (wallet) {
          await storage.creditWallet(
            wallet.id,
            bonusAmount,
            "incentive",
            id,
            userId,
            `Early arrival bonus for reservation ${id}`
          );
        }

        await notificationService.notifyDriver(
          reservation.driverId,
          "ride_completed",
          "Early Arrival Bonus",
          `You earned $${bonusAmount} for arriving ${Math.round(minutesEarly)} minutes early`,
          id
        );
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error applying early bonus:", error);
      return res.status(500).json({ message: "Failed to apply bonus" });
    }
  });

  // Get reservations in prep window (for notification service)
  app.get("/api/reservations/prep-window", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const role = await storage.getUserRole(userId);
      if (!["admin", "super_admin"].includes(role?.role || "")) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const reservations = await storage.getReservationsInPrepWindow();
      return res.json(reservations);
    } catch (error) {
      console.error("Error fetching prep window reservations:", error);
      return res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  // Get available reservation offers for drivers to accept
  app.get("/api/reservations/offers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const role = await storage.getUserRole(userId);
      if (role?.role !== "driver") {
        return res.status(403).json({ message: "Only drivers can view reservation offers" });
      }
      
      const driverProfile = await storage.getDriverProfile(userId);
      if (!driverProfile || driverProfile.status !== "approved") {
        return res.status(403).json({ message: "Only approved drivers can view offers" });
      }
      
      const offers = await storage.getAvailableReservationOffers();
      return res.json(offers);
    } catch (error) {
      console.error("Error fetching reservation offers:", error);
      return res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  // Driver accepts a reservation offer
  app.post("/api/reservations/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      const role = await storage.getUserRole(userId);
      if (role?.role !== "driver") {
        return res.status(403).json({ message: "Only drivers can accept reservations" });
      }

      const driverProfile = await storage.getDriverProfile(userId);
      if (!driverProfile || driverProfile.status !== "approved") {
        return res.status(403).json({ message: "Only approved drivers can accept reservations" });
      }

      const reservation = await storage.getRideById(id);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      if (!reservation.isReserved || reservation.reservationStatus !== "scheduled") {
        return res.status(400).json({ message: "Reservation is not available for acceptance" });
      }
      if (reservation.assignedDriverId) {
        return res.status(400).json({ message: "This reservation has already been accepted by another driver" });
      }

      const updated = await storage.acceptReservationOffer(id, userId);
      if (!updated) {
        return res.status(400).json({ message: "Could not accept reservation - it may have been taken" });
      }

      await storage.createRideAuditLog({
        rideId: id,
        action: "reservation_accepted",
        actorId: userId,
        actorRole: "driver",
        previousStatus: "requested",
        newStatus: "requested",
        metadata: JSON.stringify({ driverId: userId }),
      });

      await notificationService.notifyRider(
        reservation.riderId,
        "ride_accepted",
        "Driver Assigned",
        `A driver has accepted your reservation for ${new Date(reservation.scheduledPickupAt!).toLocaleString()}`,
        id
      );

      await notificationService.notifyDriver(
        userId,
        "ride_accepted",
        "Reservation Confirmed",
        `You've accepted a reservation for ${new Date(reservation.scheduledPickupAt!).toLocaleString()}`,
        id
      );

      return res.json(updated);
    } catch (error) {
      console.error("Error accepting reservation:", error);
      return res.status(500).json({ message: "Failed to accept reservation" });
    }
  });

  // ==========================================
  // PHASE 25 - MONETIZATION, FRAUD & PRICING
  // ==========================================

  // Country Pricing Rules
  app.get("/api/country-pricing-rules", isAuthenticated, requireRole(["super_admin", "admin", "finance"]), async (req, res) => {
    try {
      const rules = await storage.getAllCountryPricingRules();
      return res.json(rules);
    } catch (error) {
      console.error("Error fetching country pricing rules:", error);
      return res.status(500).json({ message: "Failed to fetch pricing rules" });
    }
  });

  app.get("/api/country-pricing-rules/:countryId", isAuthenticated, requireRole(["super_admin", "admin", "finance"]), async (req, res) => {
    try {
      const countryId = req.params.countryId as string;
      const rules = await storage.getCountryPricingRules(countryId);
      if (!rules) {
        return res.status(404).json({ message: "Pricing rules not found" });
      }
      return res.json(rules);
    } catch (error) {
      console.error("Error fetching country pricing rules:", error);
      return res.status(500).json({ message: "Failed to fetch pricing rules" });
    }
  });

  app.post("/api/country-pricing-rules", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const rules = await storage.createCountryPricingRules(req.body);
      return res.status(201).json(rules);
    } catch (error) {
      console.error("Error creating country pricing rules:", error);
      return res.status(500).json({ message: "Failed to create pricing rules" });
    }
  });

  app.patch("/api/country-pricing-rules/:countryId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const countryId = req.params.countryId as string;
      const rules = await storage.updateCountryPricingRules(countryId, req.body);
      if (!rules) {
        return res.status(404).json({ message: "Pricing rules not found" });
      }
      return res.json(rules);
    } catch (error) {
      console.error("Error updating country pricing rules:", error);
      return res.status(500).json({ message: "Failed to update pricing rules" });
    }
  });

  // Rider Wallets
  app.get("/api/rider-wallets", isAuthenticated, requireRole(["super_admin", "admin", "finance"]), async (req, res) => {
    try {
      const wallets = await storage.getAllRiderWallets();
      return res.json(wallets);
    } catch (error) {
      console.error("Error fetching rider wallets:", error);
      return res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  app.get("/api/rider-wallets/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const targetUserId = req.params.userId;
      
      // Allow users to see their own wallet, or admins to see any wallet
      const userRole = await storage.getUserRole(userId);
      if (userId !== targetUserId && !["super_admin", "admin", "finance"].includes(userRole?.role || "")) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      let wallet = await storage.getRiderWallet(targetUserId);
      if (!wallet) {
        wallet = await storage.createRiderWallet({ userId: targetUserId });
      }
      return res.json(wallet);
    } catch (error) {
      console.error("Error fetching rider wallet:", error);
      return res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });

  // Driver Wallets (V2 - Phase 25)
  app.get("/api/driver-wallets-v2", isAuthenticated, requireRole(["super_admin", "admin", "finance"]), async (req, res) => {
    try {
      const wallets = await storage.getAllDriverWalletsV2();
      return res.json(wallets);
    } catch (error) {
      console.error("Error fetching driver wallets:", error);
      return res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  app.get("/api/driver-wallets-v2/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const targetUserId = req.params.userId;
      
      const userRole = await storage.getUserRole(userId);
      if (userId !== targetUserId && !["super_admin", "admin", "finance"].includes(userRole?.role || "")) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      let wallet = await storage.getDriverWallet(targetUserId);
      if (!wallet) {
        wallet = await storage.createDriverWallet({ userId: targetUserId });
      }
      return res.json(wallet);
    } catch (error) {
      console.error("Error fetching driver wallet:", error);
      return res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });

  // Driver Payouts
  app.post("/api/driver-payouts", isAuthenticated, requireRole(["super_admin", "admin", "finance"]), async (req: any, res) => {
    try {
      const { driverId, amount } = req.body;
      const userId = req.user?.claims?.sub;
      
      if (!driverId || !amount || amount <= 0) {
        return res.status(400).json({ message: "Driver ID and positive amount required" });
      }
      
      const payout = await storage.initiateDriverPayoutV2(driverId, amount, userId);
      if (!payout) {
        return res.status(400).json({ message: "Insufficient withdrawable balance" });
      }
      
      return res.status(201).json(payout);
    } catch (error) {
      console.error("Error initiating payout:", error);
      return res.status(500).json({ message: "Failed to initiate payout" });
    }
  });

  app.get("/api/driver-payouts/pending", isAuthenticated, requireRole(["super_admin", "admin", "finance"]), async (req, res) => {
    try {
      const payouts = await storage.getPendingPayoutsV2();
      return res.json(payouts);
    } catch (error) {
      console.error("Error fetching pending payouts:", error);
      return res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });

  app.patch("/api/driver-payouts/:id/complete", isAuthenticated, requireRole(["super_admin", "admin", "finance"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { transactionRef } = req.body;
      
      const payout = await storage.completeDriverPayout(req.params.id, userId, transactionRef);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }
      
      return res.json(payout);
    } catch (error) {
      console.error("Error completing payout:", error);
      return res.status(500).json({ message: "Failed to complete payout" });
    }
  });

  app.patch("/api/driver-payouts/:id/fail", isAuthenticated, requireRole(["super_admin", "admin", "finance"]), async (req, res) => {
    try {
      const payoutId = req.params.id as string;
      const { reason } = req.body;
      
      const payout = await storage.failDriverPayout(payoutId, reason || "Unknown error");
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }
      
      return res.json(payout);
    } catch (error) {
      console.error("Error failing payout:", error);
      return res.status(500).json({ message: "Failed to update payout" });
    }
  });

  // Admin Wallet Management - Freeze/Unfreeze/Adjust (ADMIN ONLY)
  app.post("/api/admin/wallet/freeze/rider/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const targetUserId = req.params.userId as string;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Freeze reason is required" });
      }
      
      const wallet = await storage.freezeRiderWallet(targetUserId, reason, adminId);
      if (!wallet) {
        return res.status(404).json({ message: "Rider wallet not found" });
      }
      
      console.log(`[SECURITY AUDIT] Rider wallet frozen: targetUserId=${targetUserId}, by=${adminId}, reason=${reason}`);
      
      await storage.createAuditLog({
        action: "wallet_frozen",
        entityType: "rider_wallet",
        entityId: targetUserId,
        performedByUserId: adminId,
        performedByRole: "admin",
        metadata: JSON.stringify({ reason, frozenAt: new Date().toISOString() }),
      });
      
      return res.json({ message: "Rider wallet frozen", wallet });
    } catch (error) {
      console.error("Error freezing rider wallet:", error);
      return res.status(500).json({ message: "Failed to freeze wallet" });
    }
  });

  app.post("/api/admin/wallet/unfreeze/rider/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const targetUserId = req.params.userId as string;
      
      const wallet = await storage.unfreezeRiderWallet(targetUserId);
      if (!wallet) {
        return res.status(404).json({ message: "Rider wallet not found" });
      }
      
      console.log(`[SECURITY AUDIT] Rider wallet unfrozen: targetUserId=${targetUserId}, by=${adminId}`);
      
      await storage.createAuditLog({
        action: "wallet_unfrozen",
        entityType: "rider_wallet",
        entityId: targetUserId,
        performedByUserId: adminId,
        performedByRole: "admin",
        metadata: JSON.stringify({ unfrozenAt: new Date().toISOString() }),
      });
      
      return res.json({ message: "Rider wallet unfrozen", wallet });
    } catch (error) {
      console.error("Error unfreezing rider wallet:", error);
      return res.status(500).json({ message: "Failed to unfreeze wallet" });
    }
  });

  app.post("/api/admin/wallet/freeze/driver/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const targetUserId = req.params.userId as string;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Freeze reason is required" });
      }
      
      const wallet = await storage.freezeDriverWallet(targetUserId, reason, adminId);
      if (!wallet) {
        return res.status(404).json({ message: "Driver wallet not found" });
      }
      
      console.log(`[SECURITY AUDIT] Driver wallet frozen: targetUserId=${targetUserId}, by=${adminId}, reason=${reason}`);
      
      await storage.createAuditLog({
        action: "wallet_frozen",
        entityType: "driver_wallet",
        entityId: targetUserId,
        performedByUserId: adminId,
        performedByRole: "admin",
        metadata: JSON.stringify({ reason, frozenAt: new Date().toISOString() }),
      });
      
      return res.json({ message: "Driver wallet frozen", wallet });
    } catch (error) {
      console.error("Error freezing driver wallet:", error);
      return res.status(500).json({ message: "Failed to freeze wallet" });
    }
  });

  app.post("/api/admin/wallet/unfreeze/driver/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const targetUserId = req.params.userId as string;
      
      const wallet = await storage.unfreezeDriverWallet(targetUserId);
      if (!wallet) {
        return res.status(404).json({ message: "Driver wallet not found" });
      }
      
      console.log(`[SECURITY AUDIT] Driver wallet unfrozen: targetUserId=${targetUserId}, by=${adminId}`);
      
      await storage.createAuditLog({
        action: "wallet_unfrozen",
        entityType: "driver_wallet",
        entityId: targetUserId,
        performedByUserId: adminId,
        performedByRole: "admin",
        metadata: JSON.stringify({ unfrozenAt: new Date().toISOString() }),
      });
      
      return res.json({ message: "Driver wallet unfrozen", wallet });
    } catch (error) {
      console.error("Error unfreezing driver wallet:", error);
      return res.status(500).json({ message: "Failed to unfreeze wallet" });
    }
  });

  app.post("/api/admin/wallet/adjust/rider/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const targetUserId = req.params.userId as string;
      const { amount, reason } = req.body;
      
      if (amount === undefined || !reason) {
        return res.status(400).json({ message: "Amount and reason are required" });
      }
      
      const wallet = await storage.adjustRiderWalletBalance(targetUserId, parseFloat(amount), reason, adminId);
      if (!wallet) {
        return res.status(404).json({ message: "Rider wallet not found" });
      }
      
      console.log(`[SECURITY AUDIT] Rider wallet adjusted: targetUserId=${targetUserId}, amount=${amount}, by=${adminId}, reason=${reason}`);
      
      return res.json({ message: "Rider wallet adjusted", wallet });
    } catch (error) {
      console.error("Error adjusting rider wallet:", error);
      return res.status(500).json({ message: "Failed to adjust wallet" });
    }
  });

  app.post("/api/admin/wallet/adjust/driver/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const targetUserId = req.params.userId as string;
      const { amount, reason } = req.body;
      
      if (amount === undefined || !reason) {
        return res.status(400).json({ message: "Amount and reason are required" });
      }
      
      const wallet = await storage.adjustDriverWalletBalance(targetUserId, parseFloat(amount), reason, adminId);
      if (!wallet) {
        return res.status(404).json({ message: "Driver wallet not found" });
      }
      
      console.log(`[SECURITY AUDIT] Driver wallet adjusted: targetUserId=${targetUserId}, amount=${amount}, by=${adminId}, reason=${reason}`);
      
      return res.json({ message: "Driver wallet adjusted", wallet });
    } catch (error) {
      console.error("Error adjusting driver wallet:", error);
      return res.status(500).json({ message: "Failed to adjust wallet" });
    }
  });

  app.post("/api/admin/wallet/reverse-transaction", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { userId, walletType, originalAmount, reason } = req.body;
      
      if (!userId || !walletType || originalAmount === undefined || !reason) {
        return res.status(400).json({ message: "userId, walletType, originalAmount, and reason are required" });
      }
      
      const reverseAmount = -parseFloat(originalAmount);
      let wallet;
      
      if (walletType === "rider") {
        wallet = await storage.adjustRiderWalletBalance(userId, reverseAmount, `REVERSAL: ${reason}`, adminId);
      } else if (walletType === "driver") {
        wallet = await storage.adjustDriverWalletBalance(userId, reverseAmount, `REVERSAL: ${reason}`, adminId);
      } else {
        return res.status(400).json({ message: "Invalid walletType. Must be 'rider' or 'driver'" });
      }
      
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      console.log(`[SECURITY AUDIT] Transaction reversed: userId=${userId}, walletType=${walletType}, amount=${reverseAmount}, by=${adminId}, reason=${reason}`);
      
      return res.json({ message: "Transaction reversed", wallet });
    } catch (error) {
      console.error("Error reversing transaction:", error);
      return res.status(500).json({ message: "Failed to reverse transaction" });
    }
  });

  // ==========================================
  // TEST WALLET CREDIT (SUPER_ADMIN ONLY)
  // ==========================================
  // This allows SUPER_ADMIN to credit wallets for testing
  // without real money movement (no Paystack calls)
  app.post("/api/admin/wallet/test-credit", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const adminEmail = req.user.claims.email;
      const { userId, amount, walletType = "rider" } = req.body;
      
      if (!userId || !amount) {
        return res.status(400).json({ message: "userId and amount are required" });
      }
      
      const creditAmount = parseFloat(amount);
      if (isNaN(creditAmount) || creditAmount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }
      
      // Credit the appropriate wallet
      let wallet;
      if (walletType === "driver") {
        wallet = await storage.adjustDriverWalletBalance(userId, creditAmount, "TEST_CREDIT", adminId);
      } else {
        wallet = await storage.adjustRiderWalletBalance(userId, creditAmount, "TEST_CREDIT", adminId);
      }
      
      if (!wallet) {
        return res.status(404).json({ message: `${walletType} wallet not found for user` });
      }
      
      // Log for audit trail
      console.log(`[TEST_CREDIT AUDIT] adminId=${adminId}, adminEmail=${adminEmail}, userId=${userId}, walletType=${walletType}, amount=${creditAmount}, reason=TESTING, timestamp=${new Date().toISOString()}`);
      
      // Also log to financial audit
      await storage.createFinancialAuditLog({
        eventType: "ADJUSTMENT",
        userId,
        amount: String(creditAmount),
        actorRole: "ADMIN",
        currency: "NGN",
        description: `TEST_CREDIT by SUPER_ADMIN (${adminEmail})`,
        metadata: JSON.stringify({ adminId, adminEmail, reason: "TESTING", walletType }),
      });
      
      return res.json({ 
        message: `Test credit of ${creditAmount} applied to ${walletType} wallet`,
        wallet,
        creditAmount,
        walletType,
      });
    } catch (error) {
      console.error("Error applying test credit:", error);
      return res.status(500).json({ message: "Failed to apply test credit" });
    }
  });

  // Get list of users for admin wallet management
  app.get("/api/admin/users/for-wallet-credit", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const users = await storage.getAllUsersWithRoles();
      const usersWithWallets = await Promise.all(
        users.map(async (user: any) => {
          const riderWallet = await storage.getRiderWallet(user.id);
          const driverWallet = await storage.getDriverWallet(user.id);
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            riderBalance: riderWallet?.balance || 0,
            driverBalance: driverWallet?.balance || 0,
          };
        })
      );
      return res.json(usersWithWallets);
    } catch (error) {
      console.error("Error fetching users for wallet credit:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // ZIBA Platform Wallet
  app.get("/api/ziba-wallet", isAuthenticated, requireRole(["super_admin", "admin", "finance", "director"]), async (req, res) => {
    try {
      const wallet = await storage.getZibaPlatformWallet();
      return res.json(wallet);
    } catch (error) {
      console.error("Error fetching ZIBA wallet:", error);
      return res.status(500).json({ message: "Failed to fetch platform wallet" });
    }
  });

  // Financial Audit Logs
  app.get("/api/financial-audit-logs", isAuthenticated, requireRole(["super_admin", "admin", "finance"]), async (req, res) => {
    try {
      const { rideId, userId, eventType, limit } = req.query;
      const logs = await storage.getFinancialAuditLogs(
        { 
          rideId: rideId as string, 
          userId: userId as string, 
          eventType: eventType as string 
        },
        limit ? parseInt(limit as string) : 100
      );
      return res.json(logs);
    } catch (error) {
      console.error("Error fetching financial audit logs:", error);
      return res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Abuse Flags
  app.get("/api/abuse-flags", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { status } = req.query;
      const flags = await storage.getAbuseFlags(status as any);
      return res.json(flags);
    } catch (error) {
      console.error("Error fetching abuse flags:", error);
      return res.status(500).json({ message: "Failed to fetch flags" });
    }
  });

  app.patch("/api/abuse-flags/:id/resolve", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { status, reviewNotes, penaltyApplied } = req.body;
      
      if (!["resolved", "dismissed"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'resolved' or 'dismissed'" });
      }
      
      const flag = await storage.resolveAbuseFlag(
        req.params.id,
        userId,
        status,
        reviewNotes,
        penaltyApplied
      );
      
      if (!flag) {
        return res.status(404).json({ message: "Flag not found" });
      }
      
      return res.json(flag);
    } catch (error) {
      console.error("Error resolving abuse flag:", error);
      return res.status(500).json({ message: "Failed to resolve flag" });
    }
  });

  // Escrows
  app.get("/api/escrows", isAuthenticated, requireRole(["super_admin", "admin", "finance"]), async (req, res) => {
    try {
      const { status } = req.query;
      const escrows = await storage.getEscrowsByStatus(status as any || "locked");
      return res.json(escrows);
    } catch (error) {
      console.error("Error fetching escrows:", error);
      return res.status(500).json({ message: "Failed to fetch escrows" });
    }
  });

  app.get("/api/escrows/ride/:rideId", isAuthenticated, requireRole(["super_admin", "admin", "finance"]), async (req, res) => {
    try {
      const rideId = req.params.rideId as string;
      const escrow = await storage.getEscrowByRideId(rideId);
      if (!escrow) {
        return res.status(404).json({ message: "Escrow not found" });
      }
      return res.json(escrow);
    } catch (error) {
      console.error("Error fetching escrow:", error);
      return res.status(500).json({ message: "Failed to fetch escrow" });
    }
  });

  // ==========================================
  // WALLET FUNDING (Paystack for Nigeria)
  // ==========================================
  
  // Initialize wallet funding (Paystack for NG, simulated for others)
  app.post("/api/wallet/fund", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userEmail = req.user?.claims?.email;
      const { amount, countryCode = "NG" } = req.body;
      
      if (!amount || amount < 100) {
        return res.status(400).json({ message: "Minimum funding amount is 100 NGN" });
      }
      
      const { processPayment } = await import("./payment-provider");
      
      const result = await processPayment(countryCode, {
        amount,
        currency: countryCode === "NG" ? "NGN" : "USD",
        userId,
        email: userEmail || undefined,
        description: "ZIBA Wallet Funding",
        callbackUrl: `${req.protocol}://${req.get("host")}/api/wallet/verify`,
      });
      
      if (!result.success) {
        return res.status(400).json({ message: result.error || "Payment initialization failed" });
      }
      
      console.log(`[Wallet] Funding initiated: ${amount} for ${userId}`);
      
      return res.json({
        success: true,
        transactionRef: result.transactionRef,
        authorizationUrl: result.authorizationUrl,
        message: result.message,
      });
    } catch (error) {
      console.error("Error initiating wallet funding:", error);
      return res.status(500).json({ message: "Failed to initialize payment" });
    }
  });
  
  // Verify wallet funding callback
  app.get("/api/wallet/verify", async (req, res) => {
    try {
      const { reference, trxref } = req.query;
      const transactionRef = (reference || trxref) as string;
      
      if (!transactionRef) {
        return res.redirect("/?payment=failed&reason=no_reference");
      }
      
      const { verifyPayment } = await import("./payment-provider");
      const result = await verifyPayment("NG", transactionRef);
      
      if (result.success) {
        console.log(`[Wallet] Payment verified: ${transactionRef}`);
        return res.redirect(`/?payment=success&ref=${transactionRef}`);
      } else {
        console.log(`[Wallet] Payment failed: ${transactionRef}`);
        return res.redirect(`/?payment=failed&ref=${transactionRef}`);
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      return res.redirect("/?payment=error");
    }
  });
  
  // Get payment status summary for admin
  app.get("/api/admin/payment-status", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { getPaymentStatusSummary } = await import("./payment-provider");
      const status = await getPaymentStatusSummary();
      return res.json(status);
    } catch (error) {
      console.error("Error getting payment status:", error);
      return res.status(500).json({ message: "Failed to get status" });
    }
  });

  // Rider Transaction History
  app.get("/api/rider-transactions/:riderId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const targetRiderId = req.params.riderId;
      
      const userRole = await storage.getUserRole(userId);
      if (userId !== targetRiderId && !["super_admin", "admin", "finance"].includes(userRole?.role || "")) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const transactions = await storage.getRiderTransactionHistory(targetRiderId);
      return res.json(transactions);
    } catch (error) {
      console.error("Error fetching rider transactions:", error);
      return res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Driver Payout History
  app.get("/api/driver-payout-history/:driverId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const targetDriverId = req.params.driverId;
      
      const userRole = await storage.getUserRole(userId);
      if (userId !== targetDriverId && !["super_admin", "admin", "finance"].includes(userRole?.role || "")) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const history = await storage.getDriverPayoutHistoryV2(targetDriverId);
      return res.json(history);
    } catch (error) {
      console.error("Error fetching payout history:", error);
      return res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  // ==========================================
  // PRODUCTION SWITCHES (Phase 26)
  // SUPER_ADMIN ONLY - Server-side, Logged
  // ==========================================

  // Get all system configs (admin view)
  app.get("/api/admin/system-config", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const configs = await storage.getAllSystemConfigs();
      const launchMode = await storage.getSystemConfig("LAUNCH_MODE");
      const explanationMode = await storage.getSystemConfig("EXPLANATION_MODE");
      const inviteRequired = await storage.getSystemConfig("INVITE_REQUIRED");
      const driverCap = await storage.getSystemConfig("DRIVER_ONBOARDING_CAP");
      const dailyRideLimit = await storage.getSystemConfig("DAILY_RIDE_LIMIT");
      
      return res.json({
        configs,
        current: {
          launchMode: launchMode || "soft_launch",
          explanationMode: explanationMode === "true",
          inviteRequired: inviteRequired !== "false",
          driverOnboardingCap: parseInt(driverCap) || 50,
          dailyRideLimit: parseInt(dailyRideLimit) || 100,
        }
      });
    } catch (error) {
      console.error("Error getting system config:", error);
      return res.status(500).json({ message: "Failed to get config" });
    }
  });

  // Update system config (SUPER_ADMIN ONLY)
  app.patch("/api/admin/system-config/:key", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { key } = req.params;
      const { value, reason } = req.body;
      
      if (!value) {
        return res.status(400).json({ message: "Value is required" });
      }

      const validKeys = ["LAUNCH_MODE", "EXPLANATION_MODE", "INVITE_REQUIRED", "DRIVER_ONBOARDING_CAP", "DAILY_RIDE_LIMIT"];
      if (!validKeys.includes(key)) {
        return res.status(400).json({ message: "Invalid config key" });
      }

      if (key === "LAUNCH_MODE" && !["soft_launch", "full_launch"].includes(value)) {
        return res.status(400).json({ message: "Invalid launch mode" });
      }

      const config = await storage.setSystemConfig(key, value, userId, reason);
      console.log(`[SECURITY AUDIT] System config ${key} changed to "${value}" by ${userId}`);
      
      return res.json({ message: "Config updated", config });
    } catch (error) {
      console.error("Error updating system config:", error);
      return res.status(500).json({ message: "Failed to update config" });
    }
  });

  // Get countries with payment status
  app.get("/api/admin/countries/payments", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const countries = await storage.getAllCountriesWithPaymentStatus();
      return res.json(countries);
    } catch (error) {
      console.error("Error getting countries:", error);
      return res.status(500).json({ message: "Failed to get countries" });
    }
  });

  // Enable/Disable real payments for a country (SUPER_ADMIN ONLY)
  app.patch("/api/admin/countries/:countryId/payments", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { countryId } = req.params;
      const { paymentsEnabled, paymentProvider, confirmation } = req.body;

      // Require explicit confirmation for enabling payments
      if (paymentsEnabled === true && confirmation !== "ENABLE_REAL_PAYMENTS") {
        return res.status(400).json({ 
          message: "Enabling real payments requires explicit confirmation",
          required: "Send confirmation: 'ENABLE_REAL_PAYMENTS'" 
        });
      }

      const updated = await storage.setCountryPaymentSettings(
        countryId, 
        paymentsEnabled, 
        paymentProvider || null, 
        userId
      );

      if (!updated) {
        return res.status(404).json({ message: "Country not found" });
      }

      console.log(`[SECURITY AUDIT] Country ${countryId} payments=${paymentsEnabled} provider=${paymentProvider} by ${userId}`);
      
      return res.json({ 
        message: paymentsEnabled ? "Real payments ENABLED" : "Payments disabled (simulated mode)", 
        country: updated 
      });
    } catch (error) {
      console.error("Error updating country payments:", error);
      return res.status(500).json({ message: "Failed to update" });
    }
  });

  // Get config audit logs (SUPER_ADMIN ONLY)
  app.get("/api/admin/config-audit-logs", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const logs = await storage.getConfigAuditLogs(100);
      return res.json(logs);
    } catch (error) {
      console.error("Error getting audit logs:", error);
      return res.status(500).json({ message: "Failed to get logs" });
    }
  });

  // Get explanation mode content (for admin dashboard)
  app.get("/api/admin/explanation-summary", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const explanationEnabled = await storage.getSystemConfig("EXPLANATION_MODE");
      if (explanationEnabled !== "true") {
        return res.json({ enabled: false, content: null });
      }

      return res.json({
        enabled: true,
        content: {
          title: "ZIBA Platform - Operational Summary",
          sections: [
            {
              heading: "Wallet-First Payment Model",
              description: "All rides are prepaid from rider wallets. Funds are escrowed during the ride and released to drivers upon completion. This eliminates payment failures and disputes."
            },
            {
              heading: "Escrow Handling",
              description: "When a ride starts, the fare is locked in escrow. On completion, the driver receives their payout and ZIBA collects commission. On cancellation or dispute, funds are held pending resolution."
            },
            {
              heading: "Navigation Approach",
              description: "ZIBA does not embed map SDKs to reduce costs and complexity. Navigation is handled by opening the rider's/driver's native GPS apps (Google Maps, Apple Maps) via deep links."
            },
            {
              heading: "Cost Control Decisions",
              description: "No external routing APIs, no real-time map tiles, no third-party geolocation services. Distance is calculated using internal Haversine formula. This keeps operational costs near zero."
            },
            {
              heading: "Driver Classification",
              description: "Drivers are independent contractors, not employees. They set their own hours, accept or decline rides freely, and are responsible for their own vehicles and expenses."
            },
            {
              heading: "Fraud Protections",
              description: "Rule-based fraud detection flags suspicious patterns (excessive cancellations, fake movements, reservation abuse). All financial transactions are logged for audit."
            }
          ]
        }
      });
    } catch (error) {
      console.error("Error getting explanation:", error);
      return res.status(500).json({ message: "Failed to get explanation" });
    }
  });

  // Get current launch mode status for UI badge
  app.get("/api/launch-mode", isAuthenticated, async (req, res) => {
    try {
      const launchMode = await storage.getSystemConfig("LAUNCH_MODE");
      return res.json({ mode: launchMode || "soft_launch" });
    } catch (error) {
      return res.json({ mode: "soft_launch" });
    }
  });

  return httpServer;
}
