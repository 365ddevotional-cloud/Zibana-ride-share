import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { createHash } from "crypto";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, count, sql, gte, lt, isNotNull, inArray, desc } from "drizzle-orm";
import { insertDriverProfileSchema, insertTripSchema, updateDriverProfileSchema, insertIncentiveProgramSchema, insertCountrySchema, insertTaxRuleSchema, insertExchangeRateSchema, insertComplianceProfileSchema, trips, countryPricingRules, stateLaunchConfigs, killSwitchStates, userTrustProfiles, driverProfiles, walletTransactions, cashTripDisputes, riderProfiles, tripCoordinatorProfiles, rides, wallets, riderWallets, users, bankTransfers, riderInboxMessages, insertRiderInboxMessageSchema, notificationPreferences, cancellationFeeConfig, marketingMessages } from "@shared/schema";
import { evaluateDriverForIncentives, approveAndPayIncentive, revokeIncentive, evaluateAllDrivers, evaluateBehaviorAndWarnings, calculateDriverMatchingScore, getDriverIncentiveProgress, assignFirstRidePromo, assignReturnRiderPromo, applyPromoToTrip, voidPromosOnCancellation } from "./incentives";
import { notificationService } from "./notification-service";
import { getCurrencyFromCountry, getCountryConfig, FINANCIAL_ENGINE_LOCKED } from "@shared/currency";
import { getPayoutProviderForCountry, generatePayoutReference, validatePaystackWebhook, validateFlutterwaveWebhook, type TransferStatus } from "./payout-provider";
import { generateTaxPDF, generateTaxCSV, generateBulkTaxCSV, type TaxDocumentData, type CountryTaxRules } from "./tax-document-generator";
import { validateRideRequest, assertFinancialEngineLocked } from "./financial-guards";
import { getSimulationConfig, assertSimulationEnabled, logSimulationStatus, SimulationDisabledError } from "./simulation-config";
import { 
  IDENTITY_ENGINE_LOCKED, 
  assertIdentityEngineLocked,
  checkDriverCanGoOnline,
  checkDriverCanAcceptRide,
  adminApproveIdentity,
  adminRejectIdentity,
  adminVerifyDriverLicense,
  hashIdentityDocument,
  validateIdentitySubmission,
} from "./identity-guards";
import {
  NAVIGATION_ENGINE_LOCKED,
  assertNavigationEngineLocked,
  checkNavigationSetup,
  validateDriverGps,
  processGpsUpdate,
  triggerAutoOffline,
  launchNavigation,
  closeNavigation,
  reportAppState,
  checkStaleGpsHeartbeats,
  canDriverGoOnline as canDriverGoOnlineNavigation,
} from "./navigation-guards";
import { NAVIGATION_PROVIDERS } from "@shared/navigation-config";
import { insertUserIdentityProfileSchema } from "@shared/schema";
import { getIdentityConfig, isValidIdTypeForCountry } from "@shared/identity-config";

// Helper function to get user's currency based on their country
async function getUserCurrency(userId: string): Promise<string> {
  const userRole = await storage.getUserRole(userId);
  const countryCode = userRole?.countryCode || "NG";
  return getCurrencyFromCountry(countryCode);
}

const requireRole = (allowedRoles: string[]): RequestHandler => {
  return async (req: any, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        console.warn(`[SECURITY AUDIT] Unauthenticated access attempt to ${req.path}`);
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { enabled: simEnabled } = getSimulationConfig();
      if (simEnabled) {
        const simSession = await storage.getActiveSimulationSession(userId);
        if (simSession && new Date(simSession.expiresAt) > new Date()) {
          const simRole = simSession.role;
          if (allowedRoles.includes(simRole)) {
            req.userRole = simRole;
            req.userRoleData = { role: simRole, userId, _simulation: true };
            return next();
          }
          return res.status(403).json({ message: "Access denied for simulated role" });
        }

        if (req.user?._isSimulated) {
          const sessionData = (req as any).session;
          const simRole = sessionData?.simulatedRole;
          if (simRole && allowedRoles.includes(simRole)) {
            req.userRole = simRole;
            req.userRoleData = { role: simRole, userId, _simulation: true };
            return next();
          }
          return res.status(403).json({ message: "Access denied for simulated role" });
        }
      }

      const allRoles = await storage.getAllUserRoles(userId);
      if (!allRoles || allRoles.length === 0) {
        console.warn(`[SECURITY AUDIT] User ${userId} has no role, denied access to ${req.path}`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      const matchedRole = allRoles.find(r => r.role === "super_admin") || allRoles.find(r => allowedRoles.includes(r.role));
      if (!matchedRole) {
        console.warn(`[SECURITY AUDIT] Unauthorized access attempt: User ${userId} (roles: ${allRoles.map(r => r.role).join(", ")}) tried to access ${req.path} - Required roles: ${allowedRoles.join(", ")}`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (matchedRole.role === "admin") {
        const { valid, reason } = await storage.isAdminValid(userId);
        if (!valid) {
          console.warn(`[SECURITY AUDIT] Admin ${userId} access expired: ${reason}`);
          return res.status(403).json({ message: reason || "Admin access expired" });
        }
      }
      
      req.userRole = matchedRole.role;
      req.userRoleData = matchedRole;
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

  // SUPER_ADMIN email binding - both emails have super admin access
  const SUPER_ADMIN_EMAILS = [
    "mosesafonabi951@gmail.com",  // Primary super admin (public/incognito)
    "365ddevotional@gmail.com"    // Replit account owner (preview)
  ];
  
  // Helper to check if email is authorized as SUPER_ADMIN
  const isSuperAdminEmail = (email: string): boolean => {
    return SUPER_ADMIN_EMAILS.includes(email);
  };

  // MULTI-ROLE SYSTEM: Get all roles for the authenticated user
  app.get("/api/user/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;

      const { enabled: simEnabled } = getSimulationConfig();
      if (simEnabled) {
        if (req.user?._isSimulated) {
          const sessionData = (req as any).session;
          const simRole = sessionData?.simulatedRole;
          if (simRole) {
            return res.json({
              role: simRole,
              roles: [simRole],
              roleCount: 1,
              simulating: true,
            });
          }
        }

        const simSession = await storage.getActiveSimulationSession(userId);
        if (simSession && new Date(simSession.expiresAt) > new Date()) {
          return res.json({
            role: simSession.role,
            roles: [simSession.role],
            roleCount: 1,
            simulating: true,
          });
        }
      }
      
      // SERVER-SIDE SUPER_ADMIN ENFORCEMENT: If email matches, ensure super_admin role
      if (isSuperAdminEmail(userEmail)) {
        const hasSuperAdmin = await storage.hasRole(userId, "super_admin");
        if (!hasSuperAdmin) {
          await storage.addRoleToUser(userId, "super_admin");
          console.log(`[SUPER_ADMIN ENFORCEMENT] Auto-assigned super_admin role to ${userEmail}`);
        }
      }
      
      // Get ALL roles for this user
      const allRoles = await storage.getAllUserRoles(userId);
      
      if (!allRoles || allRoles.length === 0) {
        return res.json(null);
      }
      
      // ENFORCE: Only the bound email can be super_admin - revoke from anyone else
      const hasSuperAdminRole = allRoles.some(r => r.role === "super_admin");
      if (hasSuperAdminRole && !isSuperAdminEmail(userEmail)) {
        console.log(`[SUPER_ADMIN ENFORCEMENT] Revoking super_admin from unauthorized email: ${userEmail}`);
        await storage.deleteSpecificRole(userId, "super_admin");
        const remainingRoles = await storage.getAllUserRoles(userId);
        if (remainingRoles.length === 0) {
          return res.json(null);
        }
        // Return remaining roles
        return res.json({ 
          role: remainingRoles[0].role,
          roles: remainingRoles.map(r => r.role),
          roleCount: remainingRoles.length
        });
      }
      
      // MULTI-ROLE RESPONSE: Return primary role + all roles + count
      // Primary role = first role or highest priority role
      const rolesPriority = ["super_admin", "admin", "finance_admin", "director", "trip_coordinator", "support_agent", "driver", "rider"];
      const sortedRoles = allRoles.sort((a, b) => {
        const aPriority = rolesPriority.indexOf(a.role);
        const bPriority = rolesPriority.indexOf(b.role);
        return aPriority - bPriority;
      });
      
      return res.json({ 
        role: sortedRoles[0].role,  // Primary role (for backward compatibility)
        roles: sortedRoles.map(r => r.role),  // All roles
        roleCount: sortedRoles.length  // Total role count
      });
    } catch (error) {
      console.error("Error getting user role:", error);
      return res.status(500).json({ message: "Failed to get user role" });
    }
  });

  // MULTI-ROLE SYSTEM: Add a role to user (prevents duplicates)
  app.post("/api/user/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role, countryCode = "NG" } = req.body;

      // RIDER APP: Only allow rider role from this endpoint
      if (role !== "rider") {
        console.warn(`[RIDER APP SECURITY] Non-rider role selection blocked: userId=${userId}, attemptedRole=${role}, timestamp=${new Date().toISOString()}`);
        return res.status(403).json({ message: "This app is for Riders only" });
      }

      // MULTI-ROLE: Check if user already has rider role
      const hasRiderRole = await storage.hasRole(userId, "rider");
      if (hasRiderRole) {
        return res.status(400).json({ message: "You already have this account type." });
      }

      // Add rider role using multi-role system
      const result = await storage.addRoleToUser(userId, role, countryCode);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      // Create rider profile
      await storage.createRiderProfile({ userId });
      
      // DEFAULT RATING: Create trust profile with 5.0 stars on signup
      await storage.getOrCreateUserTrustProfile(userId);

      // Return all roles for the user
      const allRoles = await storage.getAllUserRoles(userId);
      return res.json({ 
        role: result.role?.role,
        roles: allRoles.map(r => r.role),
        roleCount: allRoles.length
      });
    } catch (error) {
      console.error("Error setting user role:", error);
      return res.status(500).json({ message: "Failed to set user role" });
    }
  });

  // Account deletion endpoint (supports both paths)
  const handleAccountDelete = async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      
      if (!userRole) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Check for active trips
      const activeTrips = await storage.getActiveTripsByUser(userId);
      if (activeTrips.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete account with an active trip. Please complete or cancel your trip first." 
        });
      }
      
      // Check if driver is online
      if (userRole.role === "driver") {
        const driverProfile = await storage.getDriverProfile(userId);
        if (driverProfile?.isOnline) {
          return res.status(400).json({ 
            message: "Cannot delete account while online. Please go offline first." 
          });
        }
      }

      // Hard delete: remove user from all tables to allow email reuse
      await storage.deleteUserAccount(userId);
      
      console.log(`[ACCOUNT DELETION] User account deleted: userId=${userId}, role=${userRole.role}, timestamp=${new Date().toISOString()}`);
      
      // Destroy session completely and clear cookies
      req.logout(() => {
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Session destroy error:", err);
          }
          res.clearCookie("connect.sid", { path: "/" });
          return res.json({ success: true, message: "Account deleted successfully" });
        });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  };

  app.delete("/api/account", isAuthenticated, handleAccountDelete);
  app.delete("/api/user/account", isAuthenticated, handleAccountDelete);

  // Admin delete user endpoint
  app.delete("/api/admin/users/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Check if user has active trips
      const activeTrips = await storage.getActiveTripsByUser(userId);
      if (activeTrips.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete user with active trips. Complete or cancel trips first." 
        });
      }
      
      // Check if driver is online
      const driverProfile = await storage.getDriverProfile(userId);
      if (driverProfile?.isOnline) {
        return res.status(400).json({ 
          message: "Cannot delete driver while online. Driver must go offline first." 
        });
      }
      
      await storage.deleteUserAccount(userId);
      return res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ message: "Failed to delete user" });
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

  // Driver registration endpoint - creates driver role
  app.post("/api/driver/register", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const existingRole = await storage.getUserRole(userId);
      if (existingRole) {
        if (existingRole.role === "driver") {
          return res.json({ role: existingRole.role, message: "Already registered as driver" });
        }
        return res.status(400).json({ message: `You already have a ${existingRole.role} account. Please use the appropriate ZIBA app.` });
      }

      const userRole = await storage.createUserRole({ userId, role: "driver" });
      
      // Create driver profile with minimal required fields
      await storage.createDriverProfile({ 
        userId,
        fullName: "",
        phone: "",
        vehicleMake: "",
        vehicleModel: "",
        licensePlate: "",
      });
      
      // DEFAULT RATING: Create trust profile with 5.0 stars on signup
      await storage.getOrCreateUserTrustProfile(userId);

      console.log(`[DRIVER REGISTRATION] New driver registered: userId=${userId}, timestamp=${new Date().toISOString()}`);
      return res.json({ role: userRole.role, message: "Successfully registered as driver" });
    } catch (error) {
      console.error("Error registering driver:", error);
      return res.status(500).json({ message: "Failed to register as driver" });
    }
  });

  app.get("/api/driver/settlement/summary", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const summary = await storage.getDriverSettlementSummary(userId);
      return res.json(summary);
    } catch (error) {
      console.error("Error getting settlement summary:", error);
      return res.status(500).json({ message: "Failed to get settlement summary" });
    }
  });

  app.get("/api/driver/settlement/pending", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settlements = await storage.getPendingSettlements(userId);
      return res.json(settlements);
    } catch (error) {
      console.error("Error getting pending settlements:", error);
      return res.status(500).json({ message: "Failed to get pending settlements" });
    }
  });

  app.get("/api/driver/standing", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const standing = await storage.getDriverStanding(userId);
      if (!standing) {
        return res.json({ currentSharePercent: 70, totalTripsCompleted: 0, rating: "5.00", accountAgeDays: 0 });
      }
      return res.json(standing);
    } catch (error) {
      console.error("Error getting driver standing:", error);
      return res.status(500).json({ message: "Failed to get driver standing" });
    }
  });

  app.get("/api/admin/settlements/:driverId", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const { driverId } = req.params;
      const pending = await storage.getPendingSettlements(driverId);
      const summary = await storage.getDriverSettlementSummary(driverId);
      return res.json({ settlements: pending, summary });
    } catch (error) {
      console.error("Error getting driver settlements:", error);
      return res.status(500).json({ message: "Failed to get driver settlements" });
    }
  });

  // =============================================
  // CASH SETTLEMENT LEDGER - DRIVER ROUTES
  // =============================================

  app.get("/api/driver/settlement/ledger", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getDriverLedgerEntries(userId);
      const sanitized = entries.map(e => ({
        id: e.id,
        periodStart: e.periodStart,
        periodEnd: e.periodEnd,
        totalCashCollected: e.totalCashCollected,
        settlementStatus: e.settlementStatus,
        currencyCode: e.currencyCode,
      }));
      return res.json(sanitized);
    } catch (error) {
      console.error("Error getting driver ledger:", error);
      return res.status(500).json({ message: "Failed to get settlement ledger" });
    }
  });

  // =============================================
  // CASH SETTLEMENT LEDGER - ADMIN ROUTES
  // =============================================

  app.get("/api/admin/cash-settlements", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const pending = await storage.getAllPendingLedgers();
      return res.json(pending);
    } catch (error) {
      console.error("Error getting pending ledgers:", error);
      return res.status(500).json({ message: "Failed to get pending cash settlements" });
    }
  });

  app.get("/api/admin/cash-settlements/:driverId", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const { driverId } = req.params;
      const entries = await storage.getDriverLedgerEntries(driverId);
      return res.json(entries);
    } catch (error) {
      console.error("Error getting driver cash settlements:", error);
      return res.status(500).json({ message: "Failed to get driver cash settlements" });
    }
  });

  app.post("/api/admin/cash-settlements/:ledgerId/defer", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const { ledgerId } = req.params;
      const { adminNotes } = req.body || {};
      const result = await storage.deferLedgerEntry(ledgerId, adminNotes);
      if (!result) {
        return res.status(404).json({ message: "Ledger entry not found" });
      }
      return res.json(result);
    } catch (error) {
      console.error("Error deferring ledger entry:", error);
      return res.status(500).json({ message: "Failed to defer ledger entry" });
    }
  });

  app.post("/api/admin/cash-settlements/:ledgerId/waive", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const { ledgerId } = req.params;
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ message: "Reason is required for waiving a ledger entry" });
      }
      const adminUserId = req.user.claims.sub;
      const result = await storage.waiveLedgerEntry(ledgerId, adminUserId, reason);
      if (!result) {
        return res.status(404).json({ message: "Ledger entry not found" });
      }
      return res.json(result);
    } catch (error) {
      console.error("Error waiving ledger entry:", error);
      return res.status(500).json({ message: "Failed to waive ledger entry" });
    }
  });

  app.post("/api/admin/cash-settlements/:ledgerId/settle", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const { ledgerId } = req.params;
      const { method } = req.body || {};
      const result = await storage.executePeriodSettlement(ledgerId, method || "card_trip_offset");
      if (!result) {
        return res.status(404).json({ message: "Ledger entry not found" });
      }
      return res.json(result);
    } catch (error) {
      console.error("Error settling ledger entry:", error);
      return res.status(500).json({ message: "Failed to settle ledger entry" });
    }
  });

  app.get("/api/admin/cash-abuse-flags", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const pendingLedgers = await storage.getAllPendingLedgers();
      const driverIds = [...new Set(pendingLedgers.map(l => l.driverId))];
      const flags = await Promise.all(
        driverIds.map(async (driverId) => {
          const abuseFlags = await storage.getDriverCashAbuseFlags(driverId);
          return { driverId, ...abuseFlags };
        })
      );
      const flagged = flags.filter(f => f.flagged);
      return res.json(flagged);
    } catch (error) {
      console.error("Error getting cash abuse flags:", error);
      return res.status(500).json({ message: "Failed to get cash abuse flags" });
    }
  });

  app.get("/api/admin/cash-abuse-flags/:driverId", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const { driverId } = req.params;
      const flags = await storage.getDriverCashAbuseFlags(driverId);
      return res.json(flags);
    } catch (error) {
      console.error("Error getting driver abuse flags:", error);
      return res.status(500).json({ message: "Failed to get driver abuse flags" });
    }
  });

  app.get("/api/admin/country-cash-config", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const configs = await storage.getAllCountryCashConfigs();
      return res.json(configs);
    } catch (error) {
      console.error("Error getting country cash configs:", error);
      return res.status(500).json({ message: "Failed to get country cash configs" });
    }
  });

  app.put("/api/admin/country-cash-config/:countryCode", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const { countryCode } = req.params;
      const config = await storage.upsertCountryCashConfig({ ...req.body, countryCode });
      return res.json(config);
    } catch (error) {
      console.error("Error upserting country cash config:", error);
      return res.status(500).json({ message: "Failed to update country cash config" });
    }
  });

  app.post("/api/rider/trip/:tripId/confirm-cash", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (trip.riderId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (trip.status !== "completed") {
        return res.status(400).json({ message: "Trip is not completed" });
      }
      if (trip.paymentSource !== "CASH") {
        return res.status(400).json({ message: "Trip is not a cash trip" });
      }
      const [updated] = await db.update(trips).set({
        riderConfirmedCash: true,
        riderConfirmedCashAt: new Date(),
      }).where(eq(trips.id, tripId)).returning();
      return res.json(updated);
    } catch (error) {
      console.error("Error confirming cash payment:", error);
      return res.status(500).json({ message: "Failed to confirm cash payment" });
    }
  });

  app.post("/api/driver/trip/:tripId/confirm-cash", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (trip.driverId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (trip.status !== "completed") {
        return res.status(400).json({ message: "Trip is not completed" });
      }
      if (trip.paymentSource !== "CASH") {
        return res.status(400).json({ message: "Trip is not a cash trip" });
      }
      const [updated] = await db.update(trips).set({
        driverConfirmedCash: true,
        driverConfirmedCashAt: new Date(),
        driverCollected: true,
      }).where(eq(trips.id, tripId)).returning();
      return res.json(updated);
    } catch (error) {
      console.error("Error confirming cash received:", error);
      return res.status(500).json({ message: "Failed to confirm cash received" });
    }
  });

  app.post("/api/driver/trip/:tripId/dispute-cash", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (trip.driverId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (trip.status !== "completed") {
        return res.status(400).json({ message: "Trip is not completed" });
      }
      if (trip.paymentSource !== "CASH") {
        return res.status(400).json({ message: "Trip is not a cash trip" });
      }
      if (!trip.riderConfirmedCash || trip.driverConfirmedCash) {
        return res.status(400).json({ message: "Invalid dispute conditions" });
      }
      await db.update(trips).set({
        cashDisputeFlag: true,
        cashDisputeReason: "driver_disputes_payment",
      }).where(eq(trips.id, tripId));
      const [dispute] = await db.insert(cashTripDisputes).values({
        tripId,
        riderId: trip.riderId,
        driverId: userId,
        disputeType: "rider_paid_driver_disputes",
        riderClaimed: true,
        driverClaimed: false,
        status: "open",
        temporaryCreditAmount: trip.fareAmount ? String(trip.fareAmount) : "0",
      }).returning();
      try {
        const driverWallet = await storage.getOrCreateWallet(userId, "driver");
        await storage.creditWallet(
          driverWallet.id,
          trip.fareAmount || 0,
          "adjustment",
          tripId,
          undefined,
          `Temporary credit for disputed cash trip`
        );
      } catch (walletError) {
        console.error("Error crediting driver wallet for dispute:", walletError);
      }
      await db.update(riderProfiles).set({
        cashAccessRestricted: true,
        cashAccessRestrictedAt: new Date(),
        cashAccessRestrictedReason: "Cash dispute filed by driver",
      }).where(eq(riderProfiles.userId, trip.riderId));
      await storage.createNotification({
        userId: "admin",
        role: "admin",
        title: "Cash Trip Dispute",
        message: `Driver disputes cash payment for trip ${tripId}. Rider claims paid, driver says not received.`,
        type: "warning",
      });
      return res.json(dispute);
    } catch (error) {
      console.error("Error disputing cash trip:", error);
      return res.status(500).json({ message: "Failed to dispute cash trip" });
    }
  });

  app.post("/api/rider/trip/:tripId/dispute-cash", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (trip.riderId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (trip.status !== "completed") {
        return res.status(400).json({ message: "Trip is not completed" });
      }
      if (trip.paymentSource !== "CASH") {
        return res.status(400).json({ message: "Trip is not a cash trip" });
      }
      if (!trip.driverConfirmedCash || trip.riderConfirmedCash) {
        return res.status(400).json({ message: "Invalid dispute conditions" });
      }
      await db.update(trips).set({
        cashDisputeFlag: true,
        cashDisputeReason: "rider_disputes_confirmation",
      }).where(eq(trips.id, tripId));
      const [dispute] = await db.insert(cashTripDisputes).values({
        tripId,
        riderId: userId,
        driverId: trip.driverId!,
        disputeType: "driver_confirmed_rider_disputes",
        driverClaimed: true,
        riderClaimed: false,
        status: "open",
      }).returning();
      await storage.createNotification({
        userId: "admin",
        role: "admin",
        title: "Cash Trip Dispute",
        message: `Rider disputes driver's cash confirmation for trip ${tripId}. Driver flagged for admin review.`,
        type: "warning",
      });
      return res.json(dispute);
    } catch (error) {
      console.error("Error disputing cash trip:", error);
      return res.status(500).json({ message: "Failed to dispute cash trip" });
    }
  });

  app.get("/api/rider/trip/:tripId/cash-status", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
      if (!trip || trip.riderId !== userId) {
        return res.status(404).json({ message: "Trip not found" });
      }
      const [profile] = await db.select().from(riderProfiles).where(eq(riderProfiles.userId, userId));
      return res.json({
        riderConfirmedCash: trip.riderConfirmedCash,
        driverConfirmedCash: trip.driverConfirmedCash,
        cashDisputeFlag: trip.cashDisputeFlag,
        cashAccessRestricted: profile?.cashAccessRestricted || false,
      });
    } catch (error) {
      console.error("Error getting cash status:", error);
      return res.status(500).json({ message: "Failed to get cash status" });
    }
  });

  app.get("/api/driver/trip/:tripId/cash-status", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
      if (!trip || trip.driverId !== userId) {
        return res.status(404).json({ message: "Trip not found" });
      }
      return res.json({
        riderConfirmedCash: trip.riderConfirmedCash,
        driverConfirmedCash: trip.driverConfirmedCash,
        cashDisputeFlag: trip.cashDisputeFlag,
      });
    } catch (error) {
      console.error("Error getting cash status:", error);
      return res.status(500).json({ message: "Failed to get cash status" });
    }
  });

  app.get("/api/rider/payment-onboarding", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [profile] = await db.select().from(riderProfiles).where(eq(riderProfiles.userId, userId));
      return res.json({
        seen: profile?.paymentOnboardingSeen || false,
        cashAccessRestricted: profile?.cashAccessRestricted || false,
      });
    } catch (error) {
      console.error("Error getting payment onboarding status:", error);
      return res.status(500).json({ message: "Failed to get payment onboarding status" });
    }
  });

  app.post("/api/rider/payment-onboarding/seen", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await db.update(riderProfiles).set({
        paymentOnboardingSeen: true,
      }).where(eq(riderProfiles.userId, userId));
      return res.json({ success: true });
    } catch (error) {
      console.error("Error marking onboarding as seen:", error);
      return res.status(500).json({ message: "Failed to mark onboarding as seen" });
    }
  });

  app.get("/api/admin/cash-disputes", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const { status } = req.query;
      let results;
      if (status) {
        results = await db.select().from(cashTripDisputes).where(eq(cashTripDisputes.status, status as string));
      } else {
        results = await db.select().from(cashTripDisputes);
      }
      return res.json(results);
    } catch (error) {
      console.error("Error getting cash disputes:", error);
      return res.status(500).json({ message: "Failed to get cash disputes" });
    }
  });

  app.post("/api/admin/cash-disputes/:disputeId/resolve", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { disputeId } = req.params;
      const { resolution, adminNotes } = req.body;
      if (!resolution || !["rider_at_fault", "driver_at_fault", "inconclusive"].includes(resolution)) {
        return res.status(400).json({ message: "Invalid resolution" });
      }
      const [dispute] = await db.update(cashTripDisputes).set({
        status: "resolved",
        resolution,
        adminNotes: adminNotes || null,
        resolvedAt: new Date(),
        adminReviewedBy: userId,
      }).where(eq(cashTripDisputes.id, disputeId)).returning();
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      if (resolution === "driver_at_fault" || resolution === "inconclusive") {
        await db.update(riderProfiles).set({
          cashAccessRestricted: false,
          cashAccessRestrictedReason: null,
        }).where(eq(riderProfiles.userId, dispute.riderId));
      }
      return res.json(dispute);
    } catch (error) {
      console.error("Error resolving cash dispute:", error);
      return res.status(500).json({ message: "Failed to resolve cash dispute" });
    }
  });

  app.post("/api/admin/riders/:riderId/reinstate-cash", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { riderId } = req.params;
      await db.update(riderProfiles).set({
        cashAccessRestricted: false,
        cashAccessRestrictedReason: null,
      }).where(eq(riderProfiles.userId, riderId));
      console.log(`[ADMIN ACTION] User ${userId} reinstated cash access for rider ${riderId}`);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error reinstating cash access:", error);
      return res.status(500).json({ message: "Failed to reinstate cash access" });
    }
  });

  app.post("/api/admin/riders/:riderId/restrict-cash", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { riderId } = req.params;
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ message: "Reason is required" });
      }
      await db.update(riderProfiles).set({
        cashAccessRestricted: true,
        cashAccessRestrictedAt: new Date(),
        cashAccessRestrictedReason: reason,
      }).where(eq(riderProfiles.userId, riderId));
      return res.json({ success: true });
    } catch (error) {
      console.error("Error restricting cash access:", error);
      return res.status(500).json({ message: "Failed to restrict cash access" });
    }
  });

  app.get("/api/driver/profile", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // SIMULATION MODE: Return a virtual driver profile if simulating as driver
      const { enabled: simEnabled } = getSimulationConfig();
      if (simEnabled) {
        const simSession = await storage.getActiveSimulationSession(userId);
        if (simSession && simSession.role === "driver" && new Date(simSession.expiresAt) > new Date()) {
          const config = JSON.parse(simSession.config || "{}");
          const userEmail = req.user.claims.email || "sim-driver@ziba.com";
          const firstName = req.user.claims.first_name || "Simulation";
          const lastName = req.user.claims.last_name || "Driver";
          return res.json({
            id: `sim-driver-${simSession.id}`,
            userId,
            fullName: `${firstName} ${lastName}`,
            phone: "+234 000 000 0000",
            vehicleMake: "Toyota",
            vehicleModel: "Camry",
            licensePlate: "SIM-0000",
            status: "approved",
            isOnline: true,
            walletBalance: config.walletBalance || "10000.00",
            averageRating: config.ratingState ? parseFloat(config.ratingState) : 4.5,
            totalRatings: 25,
            profilePhoto: null,
            verificationPhoto: null,
            verificationStatus: "verified",
            verificationTimestamp: new Date().toISOString(),
            verificationSessionId: null,
            navigationProvider: "google_maps",
            navigationVerified: true,
            locationPermissionStatus: "granted",
            lastGpsHeartbeat: new Date().toISOString(),
            withdrawalVerificationStatus: "verified",
            isNINVerified: true,
            isDriversLicenseVerified: true,
            isAddressVerified: true,
            isIdentityVerified: true,
            ninHash: null,
            driversLicenseHash: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            email: userEmail,
            _simulation: true,
          });
        }
      }

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

  app.get("/api/driver/cancellation-metrics", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getDriverProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      const allTrips = await storage.getDriverTripHistory(profile.id);
      const totalTrips = allTrips.length;
      const cancelledTrips = allTrips.filter((t: any) => t.status === "cancelled" && t.cancelledBy === "driver").length;
      const cancellationRate = totalTrips > 0 ? (cancelledTrips / totalTrips) * 100 : 0;
      const warningThreshold = 12;
      return res.json({
        cancellationRate: Math.round(cancellationRate * 10) / 10,
        recentCancellations: cancelledTrips,
        totalTrips,
        warningThreshold,
        shouldWarn: totalTrips >= 5 && cancellationRate >= warningThreshold,
      });
    } catch (error) {
      console.error("Error getting driver cancellation metrics:", error);
      return res.status(500).json({ message: "Failed to get cancellation metrics" });
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

      // DRIVER VERIFICATION CHECK - Block going online if not verified for operations
      if (profile.withdrawalVerificationStatus === "suspended") {
        return res.status(403).json({ 
          message: "Your account is suspended. Contact support for assistance.",
          code: "DRIVER_SUSPENDED"
        });
      }

      // MANDATORY SETUP CHECK - Block going online if setup incomplete
      if (isOnline === true) {
        const missingFields: string[] = [];
        
        // Check location permissions
        if (profile.locationPermissionStatus !== "granted") {
          missingFields.push("locationPermission");
        }
        
        // Check navigation provider selection
        if (!profile.navigationProvider) {
          missingFields.push("navigationProvider");
        }
        
        // Check navigation verification
        if (!profile.navigationVerified) {
          missingFields.push("navigationVerified");
        }
        
        if (missingFields.length > 0) {
          return res.status(403).json({ 
            message: "Driver setup incomplete",
            error: "DRIVER_SETUP_INCOMPLETE",
            missingFields,
            setupCompleted: false
          });
        }
      }

      const updated = await storage.updateDriverOnlineStatus(userId, isOnline);
      
      // Phase 4: Track driver going online for analytics
      if (isOnline) {
        try {
          await storage.recordDriverOnline(userId);
        } catch (analyticsError) {
          console.error("Error recording driver online analytics:", analyticsError);
        }
      }
      
      return res.json(updated);
    } catch (error) {
      console.error("Error toggling online status:", error);
      return res.status(500).json({ message: "Failed to toggle online status" });
    }
  });

  // Get driver setup status
  app.get("/api/driver/setup-status", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // SIMULATION MODE: Return completed setup status
      const { enabled: simEnabled } = getSimulationConfig();
      if (simEnabled) {
        const simSession = await storage.getActiveSimulationSession(userId);
        if (simSession && simSession.role === "driver" && new Date(simSession.expiresAt) > new Date()) {
          return res.json({
            setupCompleted: true,
            locationPermissionStatus: "granted",
            navigationProvider: "google_maps",
            navigationVerified: true,
            lastGpsHeartbeat: new Date().toISOString(),
            missingFields: [],
          });
        }
      }

      const profile = await storage.getDriverProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const setupCompleted = 
        profile.locationPermissionStatus === "granted" &&
        profile.navigationProvider !== null &&
        profile.navigationVerified === true;

      return res.json({
        setupCompleted,
        locationPermissionStatus: profile.locationPermissionStatus,
        navigationProvider: profile.navigationProvider,
        navigationVerified: profile.navigationVerified,
        lastGpsHeartbeat: profile.lastGpsHeartbeat,
        missingFields: [
          ...(profile.locationPermissionStatus !== "granted" ? ["locationPermission"] : []),
          ...(!profile.navigationProvider ? ["navigationProvider"] : []),
          ...(!profile.navigationVerified ? ["navigationVerified"] : []),
        ]
      });
    } catch (error) {
      console.error("Error getting setup status:", error);
      return res.status(500).json({ message: "Failed to get setup status" });
    }
  });

  // Update location permission status
  app.patch("/api/driver/setup/location-permission", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.body;
      
      const validStatuses = ["not_requested", "denied", "foreground_only", "granted"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid permission status" });
      }

      const profile = await storage.updateDriverProfile(userId, { 
        locationPermissionStatus: status
      });
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      return res.json({ success: true, locationPermissionStatus: status });
    } catch (error) {
      console.error("Error updating location permission:", error);
      return res.status(500).json({ message: "Failed to update location permission" });
    }
  });

  // Update navigation provider selection
  app.patch("/api/driver/setup/navigation-provider", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { provider } = req.body;
      
      const validProviders = ["google_maps", "apple_maps", "waze", "other"];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ message: "Invalid navigation provider" });
      }

      const profile = await storage.updateDriverProfile(userId, { 
        navigationProvider: provider,
        navigationVerified: false
      });
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      return res.json({ 
        success: true, 
        navigationProvider: provider,
        navigationVerified: false
      });
    } catch (error) {
      console.error("Error updating navigation provider:", error);
      return res.status(500).json({ message: "Failed to update navigation provider" });
    }
  });

  // Verify navigation app works (after deep-link test)
  app.post("/api/driver/setup/verify-navigation", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const currentProfile = await storage.getDriverProfile(userId);
      if (!currentProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      if (!currentProfile.navigationProvider) {
        return res.status(400).json({ message: "Navigation provider must be selected first" });
      }

      const profile = await storage.updateDriverProfile(userId, { 
        navigationVerified: true
      });
      
      return res.json({ 
        success: true, 
        navigationVerified: true,
        setupCompleted: 
          currentProfile.locationPermissionStatus === "granted" &&
          currentProfile.navigationProvider !== null
      });
    } catch (error) {
      console.error("Error verifying navigation:", error);
      return res.status(500).json({ message: "Failed to verify navigation" });
    }
  });

  // GPS heartbeat endpoint
  app.post("/api/driver/gps-heartbeat", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lat, lng } = req.body;
      
      const profile = await storage.updateDriverProfile(userId, { 
        lastGpsHeartbeat: new Date()
      });
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      return res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error updating GPS heartbeat:", error);
      return res.status(500).json({ message: "Failed to update GPS heartbeat" });
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

      // Check if driver is suspended
      if (profile.withdrawalVerificationStatus === "suspended") {
        return res.status(403).json({ 
          message: "Your account is suspended. Contact support for assistance.",
          code: "DRIVER_SUSPENDED"
        });
      }

      // Phase 6: Kill-switch check for trip acceptance
      const { checkTripAcceptanceAllowed } = await import("./launch-control");
      const acceptanceCheck = await checkTripAcceptanceAllowed();
      if (!acceptanceCheck.allowed) {
        return res.status(403).json({ message: acceptanceCheck.reason, code: acceptanceCheck.code });
      }

      // MANDATORY SETUP CHECK - Block ride acceptance if setup incomplete
      const missingFields: string[] = [];
      if (profile.locationPermissionStatus !== "granted") missingFields.push("locationPermission");
      if (!profile.navigationProvider) missingFields.push("navigationProvider");
      if (!profile.navigationVerified) missingFields.push("navigationVerified");
      
      if (missingFields.length > 0) {
        return res.status(403).json({ 
          message: "Driver setup incomplete",
          error: "DRIVER_SETUP_INCOMPLETE",
          missingFields,
          setupCompleted: false
        });
      }

      const currentTrip = await storage.getDriverCurrentTrip(userId);
      if (currentTrip) {
        return res.status(400).json({ message: "Already have an active trip" });
      }

      // Get trip first to check pairing block
      const tripToCheck = await storage.getTrip(tripId);
      if (!tripToCheck) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // PAIRING BLOCK ENFORCEMENT: Prevent driver from accepting if blocked by/with rider
      const isBlocked = await storage.isDriverBlockedForRider(tripToCheck.riderId, userId);
      if (isBlocked) {
        console.log(`[PAIRING BLOCK] Driver ${userId} attempted to accept ride from blocked rider ${tripToCheck.riderId}`);
        return res.status(403).json({ 
          message: "This ride is no longer available.",
          code: "PAIRING_BLOCKED"
        });
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
        // Format fare in NGN
        const fareInNaira = (parseFloat(String(trip.fareAmount)) / 100).toFixed(2);
        const commissionInNaira = (parseFloat(String(trip.commissionAmount || 0)) / 100).toFixed(2);
        
        await storage.createNotification({
          userId: trip.riderId,
          role: "rider",
          title: "Trip Completed",
          message: `Your trip has been completed. Fare: ₦${fareInNaira}`,
          type: "success",
        });
        
        await storage.notifyAdminsAndDirectors(
          "Trip Completed",
          `Trip completed. Fare: ₦${fareInNaira}, Commission: ₦${commissionInNaira}`,
          "success"
        );

        // Phase 11: Credit driver and ZIBA wallets (skip for cash - handled in storage layer)
        const isCashTrip = trip.paymentSource === "CASH";
        if (trip.driverPayout && trip.commissionAmount && !isCashTrip) {
          try {
            const driverWallet = await storage.getOrCreateWallet(userId, "driver");
            
            await storage.creditWallet(
              driverWallet.id,
              trip.driverPayout,
              "trip",
              tripId,
              undefined,
              `Earnings from trip: ${trip.pickupLocation} → ${trip.dropoffLocation}`
            );

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
          }
        }

        // Phase 4: Track analytics for ride/trip completion
        try {
          await storage.recordRideCompletion(trip.riderId);
          if (trip.driverId) {
            await storage.recordTripCompletion(trip.driverId);
          }
        } catch (analyticsError) {
          console.error("Error recording analytics:", analyticsError);
        }

        // Phase 5: Update behavior stats on trip completion
        try {
          if (trip.driverId) {
            await evaluateBehaviorAndWarnings(trip.driverId, "driver");
          }
          await evaluateBehaviorAndWarnings(trip.riderId, "rider");
        } catch (behaviorError) {
          console.error("Error updating behavior stats:", behaviorError);
        }

        // Accumulate trip mileage for annual tax reporting
        try {
          if (trip.driverId) {
            const tripDistanceKm = parseFloat(trip.actualDistanceKm || trip.estimatedDistanceKm || "0");
            if (tripDistanceKm > 0) {
              const tripDistanceMiles = tripDistanceKm * 0.621371;
              const taxYear = new Date().getFullYear();
              await storage.addDriverMileage(trip.driverId, taxYear, tripDistanceMiles, "trip");
            }
          }
        } catch (mileageError) {
          console.error("Error accumulating driver mileage:", mileageError);
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
        const currency = await getUserCurrency(userId);
        wallet = await storage.createDriverWallet({ userId, currency });
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

  // Nigeria Bank Account Integration - Driver bank account CRUD
  app.get("/api/driver/bank-account", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const driverProfile = await storage.getDriverProfile(userId);
      if (!driverProfile) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      const bankAccount = await storage.getDriverBankAccount(driverProfile.id);
      
      // Also return verification status for UI
      const verificationStatus = {
        isNINVerified: driverProfile.isNINVerified,
        isDriversLicenseVerified: driverProfile.isDriversLicenseVerified,
        isAddressVerified: driverProfile.isAddressVerified,
        isIdentityVerified: driverProfile.isIdentityVerified,
        withdrawalVerificationStatus: driverProfile.withdrawalVerificationStatus,
        bankAccountVerified: bankAccount?.isVerified || false,
      };
      
      return res.json({ bankAccount, verificationStatus });
    } catch (error) {
      console.error("Error getting driver bank account:", error);
      return res.status(500).json({ message: "Failed to get bank account" });
    }
  });

  app.post("/api/driver/bank-account", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bankName, bankCode, accountNumber, accountName } = req.body;
      
      // Validate required fields
      if (!bankName || !bankCode || !accountNumber || !accountName) {
        return res.status(400).json({ message: "All bank account fields are required" });
      }
      
      const driverProfile = await storage.getDriverProfile(userId);
      if (!driverProfile) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      
      // Check if driver already has a bank account
      const existing = await storage.getDriverBankAccount(driverProfile.id);
      if (existing) {
        return res.status(400).json({ message: "Bank account already exists. Use PATCH to update." });
      }
      
      // Hash account number for uniqueness check
      const crypto = await import("crypto");
      const accountNumberHash = crypto.createHash("sha256").update(accountNumber).digest("hex");
      
      // Check if this bank account is already linked to another driver
      const hashExists = await storage.checkBankAccountHashExists(accountNumberHash, driverProfile.id);
      if (hashExists) {
        console.log(`[FRAUD] Bank account reuse attempt: driverId=${driverProfile.id}, accountNumber=****${accountNumber.slice(-4)}`);
        return res.status(400).json({ message: "This bank account is already linked to another driver" });
      }
      
      const bankAccount = await storage.createDriverBankAccount({
        driverId: driverProfile.id,
        bankName,
        bankCode,
        accountNumber,
        accountNumberHash,
        accountName,
        countryCode: "NG", // Nigeria only
      });
      
      console.log(`[AUDIT] Driver bank account created: driverId=${driverProfile.id}, bankName=${bankName}`);
      return res.json(bankAccount);
    } catch (error) {
      console.error("Error creating driver bank account:", error);
      return res.status(500).json({ message: "Failed to create bank account" });
    }
  });

  app.patch("/api/driver/bank-account", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bankName, bankCode, accountNumber, accountName } = req.body;
      
      const driverProfile = await storage.getDriverProfile(userId);
      if (!driverProfile) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      
      const existing = await storage.getDriverBankAccount(driverProfile.id);
      if (!existing) {
        return res.status(404).json({ message: "No bank account found. Create one first." });
      }
      
      // If account number is changing, check for reuse
      if (accountNumber && accountNumber !== existing.accountNumber) {
        const crypto = await import("crypto");
        const accountNumberHash = crypto.createHash("sha256").update(accountNumber).digest("hex");
        
        const hashExists = await storage.checkBankAccountHashExists(accountNumberHash, driverProfile.id);
        if (hashExists) {
          console.log(`[FRAUD] Bank account reuse attempt on update: driverId=${driverProfile.id}`);
          return res.status(400).json({ message: "This bank account is already linked to another driver" });
        }
      }
      
      // Updating bank account resets verification
      const updated = await storage.updateDriverBankAccount(driverProfile.id, {
        bankName: bankName || existing.bankName,
        bankCode: bankCode || existing.bankCode,
        accountNumber: accountNumber || existing.accountNumber,
        accountName: accountName || existing.accountName,
      });
      
      // Reset bank verification if account changed
      if (accountNumber && accountNumber !== existing.accountNumber) {
        await storage.verifyDriverBankAccount(driverProfile.id, false, "manual", "system");
        console.log(`[AUDIT] Bank account verification reset due to update: driverId=${driverProfile.id}`);
      }
      
      console.log(`[AUDIT] Driver bank account updated: driverId=${driverProfile.id}`);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating driver bank account:", error);
      return res.status(500).json({ message: "Failed to update bank account" });
    }
  });

  // Driver verification status and eligibility check
  app.get("/api/driver/withdrawal-eligibility", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const driverProfile = await storage.getDriverProfile(userId);
      if (!driverProfile) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      
      const bankAccount = await storage.getDriverBankAccount(driverProfile.id);
      const driverWallet = await storage.getDriverWallet(userId);
      const isTester = await storage.isUserTester(userId);
      
      // Get identity documents for Nigeria-specific checks
      const identityDocs = await storage.getIdentityDocuments(userId);
      const hasNIN = identityDocs.some(d => d.documentType === "NIN" && d.verified);
      const hasDriversLicense = identityDocs.some(d => d.documentType === "DRIVER_LICENSE" && d.verified);
      
      const issues: string[] = [];
      
      // Check all requirements
      if (driverProfile.withdrawalVerificationStatus !== "verified") {
        issues.push("Driver verification status is not verified");
      }
      if (!driverProfile.isNINVerified && !hasNIN) {
        issues.push("NIN verification required");
      }
      if (!driverProfile.isDriversLicenseVerified && !hasDriversLicense) {
        issues.push("Driver's license verification required");
      }
      if (!driverProfile.isAddressVerified) {
        issues.push("Address verification required");
      }
      if (!driverProfile.isIdentityVerified) {
        issues.push("Identity verification required");
      }
      if (!bankAccount) {
        issues.push("Bank account not linked");
      } else if (!bankAccount.isVerified) {
        issues.push("Bank account not verified");
      }
      if (!driverWallet || parseFloat(driverWallet.withdrawableBalance || "0") < 1000) {
        issues.push("Minimum withdrawal amount is ₦1,000");
      }
      if (isTester) {
        issues.push("Test drivers cannot withdraw real funds");
      }
      
      const isEligible = issues.length === 0;
      
      return res.json({
        isEligible,
        issues,
        walletBalance: driverWallet?.withdrawableBalance || "0.00",
        currency: "NGN",
        minimumWithdrawal: 1000,
        bankAccount: bankAccount ? {
          bankName: bankAccount.bankName,
          accountNumber: `****${bankAccount.accountNumber.slice(-4)}`,
          accountName: bankAccount.accountName,
          isVerified: bankAccount.isVerified,
        } : null,
        verificationStatus: {
          isNINVerified: driverProfile.isNINVerified || hasNIN,
          isDriversLicenseVerified: driverProfile.isDriversLicenseVerified || hasDriversLicense,
          isAddressVerified: driverProfile.isAddressVerified,
          isIdentityVerified: driverProfile.isIdentityVerified,
          overallStatus: driverProfile.withdrawalVerificationStatus,
        },
      });
    } catch (error) {
      console.error("Error checking withdrawal eligibility:", error);
      return res.status(500).json({ message: "Failed to check eligibility" });
    }
  });

  // Driver withdrawal request (Nigeria NGN only)
  app.post("/api/driver/withdrawals", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount } = req.body;
      
      const driverProfile = await storage.getDriverProfile(userId);
      if (!driverProfile) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      
      // Validate amount
      const withdrawAmount = parseFloat(amount);
      if (isNaN(withdrawAmount) || withdrawAmount < 1000) {
        return res.status(400).json({ message: "Minimum withdrawal amount is ₦1,000" });
      }
      
      // Check if driver is a tester
      const isTester = await storage.isUserTester(userId);
      if (isTester) {
        return res.status(403).json({ message: "Test drivers cannot withdraw real funds" });
      }
      
      // Check verification status
      if (driverProfile.withdrawalVerificationStatus !== "verified") {
        return res.status(403).json({ message: "Complete identity verification to withdraw" });
      }
      
      // Check all verification flags
      if (!driverProfile.isNINVerified || !driverProfile.isDriversLicenseVerified || 
          !driverProfile.isAddressVerified || !driverProfile.isIdentityVerified) {
        // Fall back to checking identity documents
        const docs = await storage.getIdentityDocuments(userId);
        const hasVerifiedNIN = docs.some(d => d.documentType === "NIN" && d.verified);
        const hasVerifiedLicense = docs.some(d => d.documentType === "DRIVER_LICENSE" && d.verified);
        
        if (!hasVerifiedNIN) {
          return res.status(403).json({ message: "NIN verification required for withdrawals" });
        }
        if (!hasVerifiedLicense) {
          return res.status(403).json({ message: "Driver's license verification required for withdrawals" });
        }
      }
      
      // Check bank account
      const bankAccount = await storage.getDriverBankAccount(driverProfile.id);
      if (!bankAccount) {
        return res.status(400).json({ message: "Link a bank account before withdrawing" });
      }
      if (!bankAccount.isVerified) {
        return res.status(403).json({ message: "Bank account verification pending" });
      }
      
      // Check wallet balance
      const driverWallet = await storage.getDriverWallet(userId);
      if (!driverWallet) {
        return res.status(400).json({ message: "Driver wallet not found" });
      }
      
      const walletBalance = parseFloat(driverWallet.withdrawableBalance || "0");
      if (walletBalance < withdrawAmount) {
        return res.status(400).json({ message: `Insufficient balance. Available: ₦${walletBalance.toFixed(2)}` });
      }
      
      // Create withdrawal request
      const withdrawal = await storage.createDriverWithdrawal({
        driverId: driverProfile.id,
        amount: withdrawAmount.toFixed(2),
        currencyCode: "NGN",
        payoutMethod: "BANK",
        bankAccountId: bankAccount.id,
      });
      
      console.log(`[AUDIT] Withdrawal requested: driverId=${driverProfile.id}, amount=₦${withdrawAmount}, withdrawalId=${withdrawal.id}`);
      
      return res.json({
        message: "Withdrawal request submitted",
        withdrawal: {
          id: withdrawal.id,
          amount: withdrawal.amount,
          currency: "NGN",
          status: withdrawal.status,
          bankAccount: `${bankAccount.bankName} - ****${bankAccount.accountNumber.slice(-4)}`,
        },
      });
    } catch (error) {
      console.error("Error creating withdrawal request:", error);
      return res.status(500).json({ message: "Failed to create withdrawal request" });
    }
  });

  // Get driver's withdrawal history
  app.get("/api/driver/withdrawals", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const driverProfile = await storage.getDriverProfile(userId);
      if (!driverProfile) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      
      const withdrawals = await storage.getDriverWithdrawals(driverProfile.id);
      return res.json(withdrawals);
    } catch (error) {
      console.error("Error getting driver withdrawals:", error);
      return res.status(500).json({ message: "Failed to get withdrawals" });
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
        const currency = await getUserCurrency(userId);
        wallet = await storage.createRiderWallet({ userId, currency });
      }
      
      // Check if user is a tester to include tester wallet info
      const isTester = await storage.isUserTester(userId);
      
      // Return wallet with currency forced to NGN and tester info
      return res.json({
        ...wallet,
        currency: "NGN", // Force NGN currency
        isTester,
        testerWalletBalance: wallet.testerWalletBalance || "0",
      });
    } catch (error) {
      console.error("Error getting rider wallet:", error);
      return res.status(500).json({ message: "Failed to get wallet" });
    }
  });

  app.get("/api/rider/wallet-info", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let wallet = await storage.getRiderWallet(userId);
      if (!wallet) {
        const currency = await getUserCurrency(userId);
        wallet = await storage.createRiderWallet({ userId, currency });
      }
      const isTester = await storage.isUserTester(userId);
      const profile = await storage.getRiderProfile(userId);
      const backendMethod = profile?.paymentMethod || "WALLET";
      let defaultPaymentMethod = "MAIN_WALLET";
      if (backendMethod === "CASH") defaultPaymentMethod = "CASH";
      else if (backendMethod === "TEST_WALLET") defaultPaymentMethod = "TEST_WALLET";
      else defaultPaymentMethod = "MAIN_WALLET";

      return res.json({
        mainBalance: wallet.balance || "0",
        testBalance: wallet.testerWalletBalance || "0",
        currencyCode: "NGN",
        isTester,
        defaultPaymentMethod,
      });
    } catch (error) {
      console.error("Error getting rider wallet info:", error);
      return res.status(500).json({ message: "Failed to get wallet info" });
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
      
      // Cash always available
      availableMethods.push({
        id: "CASH",
        name: "Cash",
        description: "Pay driver directly with cash",
        enabled: true,
      });

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
        isCashAvailable: true,
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
      
      if (!paymentMethod || !["WALLET", "TEST_WALLET", "CARD", "CASH"].includes(paymentMethod)) {
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

  // Get rider's saved payment methods (cards, bank accounts)
  app.get("/api/rider/payment-methods", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const methods = await storage.getRiderPaymentMethods(userId);
      return res.json(methods);
    } catch (error) {
      console.error("Error getting payment methods:", error);
      return res.status(500).json({ message: "Failed to get payment methods" });
    }
  });

  // Add a new payment method (card via Paystack authorization)
  app.post("/api/rider/payment-methods", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        type, 
        cardLast4, 
        cardBrand, 
        cardExpMonth, 
        cardExpYear,
        cardBin,
        bankName,
        bankAccountLast4,
        bankAccountName,
        mobileMoneyProvider,
        mobileMoneyNumberLast4,
        providerAuthCode,
        providerSignature,
        providerBank,
        providerChannel,
        providerReusable,
        nickname,
        isDefault 
      } = req.body;
      
      if (!type || !["CARD", "BANK", "MOBILE_MONEY"].includes(type)) {
        return res.status(400).json({ message: "Invalid payment method type" });
      }

      // Get user's country/currency
      const userRole = await storage.getUserRole(userId);
      const countryCode = userRole?.countryCode || "NG";
      const currency = countryCode === "NG" ? "NGN" : countryCode === "ZA" ? "ZAR" : "USD";

      // Check if this is the first method (make it default)
      const existingMethods = await storage.getRiderPaymentMethods(userId);
      const shouldBeDefault = isDefault || existingMethods.length === 0;

      const method = await storage.createRiderPaymentMethod({
        userId,
        type,
        cardLast4,
        cardBrand,
        cardExpMonth,
        cardExpYear,
        cardBin,
        bankName,
        bankAccountLast4,
        bankAccountName,
        mobileMoneyProvider,
        mobileMoneyNumberLast4,
        providerAuthCode,
        providerSignature,
        providerBank,
        providerChannel,
        providerReusable: providerReusable !== false,
        nickname,
        currency,
        countryCode,
        isDefault: shouldBeDefault,
        isActive: true,
      });

      console.log(`[PAYMENT METHODS] User ${userId} added ${type} ending in ${cardLast4 || bankAccountLast4 || mobileMoneyNumberLast4}`);
      
      return res.json(method);
    } catch (error) {
      console.error("Error adding payment method:", error);
      return res.status(500).json({ message: "Failed to add payment method" });
    }
  });

  // Set default payment method
  app.patch("/api/rider/payment-methods/:methodId/default", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { methodId } = req.params;
      
      const method = await storage.setDefaultPaymentMethod(userId, methodId);
      if (!method) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      console.log(`[PAYMENT METHODS] User ${userId} set ${methodId} as default`);
      
      return res.json(method);
    } catch (error) {
      console.error("Error setting default payment method:", error);
      return res.status(500).json({ message: "Failed to set default payment method" });
    }
  });

  // Delete a payment method
  app.delete("/api/rider/payment-methods/:methodId", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { methodId } = req.params;
      
      const deleted = await storage.deleteRiderPaymentMethod(userId, methodId);
      if (!deleted) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      console.log(`[PAYMENT METHODS] User ${userId} deleted ${methodId}`);
      
      return res.json({ message: "Payment method deleted" });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      return res.status(500).json({ message: "Failed to delete payment method" });
    }
  });

  // Initialize card addition via Paystack (returns authorization URL)
  app.post("/api/rider/payment-methods/add-card/initialize", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      
      if (!userEmail) {
        return res.status(400).json({ message: "User email not found" });
      }

      // Check if real payments are enabled for Nigeria
      const { isRealPaymentsEnabled, processPayment } = await import("./payment-provider");
      const isCardAvailable = await isRealPaymentsEnabled("NG");
      
      if (!isCardAvailable) {
        return res.status(400).json({ 
          message: "Card payments are not available in test mode. Cards can only be added when real payments are enabled.",
          code: "CARD_NOT_AVAILABLE"
        });
      }

      // Initialize a minimal payment to authorize the card (Paystack requires at least ₦50)
      const result = await processPayment("NG", {
        userId,
        email: userEmail,
        amount: 50, // Minimum for card authorization
        currency: "NGN",
        description: `Card authorization for user ${userId}`,
      });

      if (!result.success) {
        return res.status(400).json({ 
          message: result.error || "Failed to initialize card authorization",
          code: "INIT_FAILED"
        });
      }

      return res.json({
        authorizationUrl: result.authorizationUrl,
        accessCode: result.accessCode,
        reference: result.transactionRef,
      });
    } catch (error) {
      console.error("Error initializing card addition:", error);
      return res.status(500).json({ message: "Failed to initialize card addition" });
    }
  });

  // Verify card addition callback from Paystack
  app.post("/api/rider/payment-methods/add-card/verify", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reference } = req.body;

      if (!reference) {
        return res.status(400).json({ message: "Reference is required" });
      }

      // Verify the transaction with Paystack
      const { verifyPayment } = await import("./payment-provider");
      const result = await verifyPayment("NG", reference);

      if (!result.success) {
        return res.status(400).json({ 
          message: "Card authorization failed. Please try again.",
          code: "VERIFICATION_FAILED"
        });
      }

      // Extract card details from Paystack response (these would be in the actual API response)
      // For now, return success - the actual card details would come from Paystack webhook
      return res.json({
        message: "Card added successfully",
        success: true,
      });
    } catch (error) {
      console.error("Error verifying card addition:", error);
      return res.status(500).json({ message: "Failed to verify card addition" });
    }
  });

  // Change rider's payment source (only allowed when not in an active ride)
  app.patch("/api/rider/payment-source", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { paymentSource, paymentMethodId } = req.body;

      // Validate paymentSource
      const validSources = ["MAIN_WALLET", "CARD"];
      if (!validSources.includes(paymentSource)) {
        return res.status(400).json({ 
          message: "Invalid payment source. Use MAIN_WALLET or CARD",
          code: "INVALID_PAYMENT_SOURCE"
        });
      }

      // Check if user is a tester - testers cannot change payment source
      const isTester = await storage.isUserTester(userId);
      if (isTester) {
        return res.status(403).json({ 
          message: "Testers can only use test wallet for payments",
          code: "TESTER_RESTRICTED"
        });
      }

      // Check if rider has an active ride
      const activeRide = await storage.getCurrentRiderRide(userId);
      if (activeRide) {
        return res.status(400).json({ 
          message: "Cannot change payment source during an active ride. Please complete or cancel your current ride first.",
          code: "ACTIVE_RIDE_EXISTS"
        });
      }

      // If switching to CARD, validate the payment method
      if (paymentSource === "CARD") {
        if (!paymentMethodId) {
          return res.status(400).json({ 
            message: "Payment method ID is required for card payments",
            code: "PAYMENT_METHOD_REQUIRED"
          });
        }

        const paymentMethod = await storage.getRiderPaymentMethod(paymentMethodId);
        if (!paymentMethod || paymentMethod.userId !== userId) {
          return res.status(400).json({ 
            message: "Invalid payment method",
            code: "INVALID_PAYMENT_METHOD"
          });
        }

        if (!paymentMethod.isActive || !paymentMethod.providerReusable) {
          return res.status(400).json({ 
            message: "This payment method cannot be used",
            code: "PAYMENT_METHOD_UNAVAILABLE"
          });
        }

        // Check if real payments are enabled for user's country
        const userRole = await storage.getUserRole(userId);
        const countryCode = userRole?.countryCode || "NG";
        const country = await storage.getCountryByCode(countryCode);
        
        if (!country?.paymentsEnabled) {
          return res.status(400).json({ 
            message: "Card payments are not available in your region yet",
            code: "CARD_PAYMENTS_NOT_ENABLED"
          });
        }
      }

      // Update wallet payment source
      await storage.updateRiderWalletPaymentSource(userId, paymentSource);

      console.log(`[PAYMENT SOURCE] User ${userId} switched to ${paymentSource}${paymentMethodId ? ` (method: ${paymentMethodId})` : ""}`);

      return res.json({ 
        message: "Payment source updated",
        paymentSource,
        paymentMethodId: paymentSource === "CARD" ? paymentMethodId : null
      });
    } catch (error) {
      console.error("Error updating payment source:", error);
      return res.status(500).json({ message: "Failed to update payment source" });
    }
  });

  app.get("/api/rider/current-trip", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trip = await storage.getRiderCurrentTrip(userId);
      if (trip) {
        const { driverPayout, commissionAmount, commissionPercentage, ...sanitized } = trip as any;
        return res.json(sanitized);
      }
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
      const sanitized = trips.map(({ driverPayout, commissionAmount, commissionPercentage, ...rest }: any) => rest);
      return res.json(sanitized);
    } catch (error) {
      console.error("Error getting trip history:", error);
      return res.status(500).json({ message: "Failed to get trip history" });
    }
  });

  app.post("/api/rider/request-ride", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      // ASSERT FINANCIAL ENGINE IS LOCKED
      assertFinancialEngineLocked();

      // Phase 6: Kill-switch and launch readiness check
      const { checkTripRequestAllowed } = await import("./launch-control");
      const userId = req.user.claims.sub;
      const userRoleForLaunch = await storage.getUserRole(userId);
      const launchCountry = userRoleForLaunch?.countryCode || "NG";
      const stateCode = req.body.stateCode;
      const launchCheck = await checkTripRequestAllowed(launchCountry, stateCode);
      if (!launchCheck.allowed) {
        return res.status(403).json({ message: launchCheck.reason, code: launchCheck.code });
      }
      
      const parsed = insertTripSchema.safeParse({ ...req.body, riderId: userId });
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid trip data", errors: parsed.error.flatten() });
      }

      const currentTrip = await storage.getRiderCurrentTrip(userId);
      if (currentTrip) {
        return res.status(400).json({ message: "Already have an active trip" });
      }

      // Get user's country for country-aware config
      const userRole = await storage.getUserRole(userId);
      const countryCode = userRole?.countryCode || "NG";
      const countryConfig = getCountryConfig(countryCode);

      // Get or create rider wallet with user's country currency
      let riderWallet = await storage.getRiderWallet(userId);
      if (!riderWallet) {
        riderWallet = await storage.createRiderWallet({ userId, currency: countryConfig.currencyCode });
      }

      // SERVER-SIDE WALLET RESOLUTION - Determine payment source based on rider profile + tester status
      const isTester = await storage.isUserTester(userId);
      const riderProfile = await storage.getRiderProfile(userId);
      const riderPaymentMethod = riderProfile?.paymentMethod || "WALLET";
      
      // Resolve payment source: Cash uses CASH, Testers use TEST_WALLET, non-testers use MAIN_WALLET
      const resolvedPaymentSource = riderPaymentMethod === "CASH" ? "CASH" 
        : isTester ? "TEST_WALLET" : "MAIN_WALLET";
      
      // Get the correct balance based on resolved payment source (cash trips skip balance check)
      let availableBalance: number;
      
      if (resolvedPaymentSource === "CASH") {
        availableBalance = Infinity;
        console.log(`[WALLET RESOLUTION] Cash user ${userId} - using CASH, no balance check`);
      } else if (resolvedPaymentSource === "TEST_WALLET") {
        availableBalance = parseFloat(String(riderWallet.testerWalletBalance || "0"));
        console.log(`[WALLET RESOLUTION] Tester user ${userId} - using TEST_WALLET, balance: ${availableBalance}`);
      } else {
        availableBalance = parseFloat(String(riderWallet.balance || "0")) - parseFloat(String(riderWallet.lockedBalance || "0"));
        console.log(`[WALLET RESOLUTION] Regular user ${userId} - using MAIN_WALLET, balance: ${availableBalance}`);
      }

      // CURRENCY CONSISTENCY - Trip currency MUST match country currency
      const walletCurrency = riderWallet.currency || countryConfig.currencyCode;
      const tripCurrency = countryConfig.currencyCode; // FORCED to country currency

      // ===========================================
      // GLOBAL FINANCIAL GUARDS (ALL COUNTRIES)
      // ===========================================
      const guardResult = validateRideRequest({
        userId,
        isTester,
        walletCurrency,
        tripCurrency,
        countryCode,
        availableBalance,
        walletFrozen: riderWallet.isFrozen || false,
        userSuspended: false, // TODO: Add user suspension check
        resolvedPaymentSource,
      });

      if (!guardResult.allowed) {
        return res.status(400).json({
          message: guardResult.message,
          code: guardResult.code,
          ...guardResult.details,
        });
      }

      // Update wallet's payment source if it doesn't match (auto-sync for testers)
      if (isTester && riderWallet.paymentSource !== "TEST_WALLET") {
        await storage.updateRiderWalletPaymentSource(userId, "TEST_WALLET");
      } else if (!isTester && riderWallet.paymentSource !== "MAIN_WALLET") {
        await storage.updateRiderWalletPaymentSource(userId, "MAIN_WALLET");
      }

      // Create the trip with FULL financial tracking
      const tripData = {
        ...parsed.data,
        paymentSource: resolvedPaymentSource as "TEST_WALLET" | "MAIN_WALLET" | "CARD" | "BANK" | "CASH",
        isTestTrip: isTester,
        currencyCode: tripCurrency,
        countryId: countryCode,
      };
      
      const trip = await storage.createTrip(tripData);
      
      console.log(`[RIDE CREATED] tripId=${trip.id}, userId=${userId}, countryCode=${countryCode}, ` +
        `paymentSource=${resolvedPaymentSource}, isTester=${isTester}, walletBalance=${availableBalance}, ` +
        `currency=${tripCurrency}`);
      
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

  app.post("/api/trips/schedule", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { pickupLocation, dropoffLocation, scheduledPickupAt, paymentSource } = req.body;

      if (!pickupLocation || !dropoffLocation || !scheduledPickupAt) {
        return res.status(400).json({ message: "Pickup, drop-off, and scheduled time are required" });
      }

      const scheduledDate = new Date(scheduledPickupAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }

      const resolvedPayment = paymentSource === "CASH" ? "CASH" : "MAIN_WALLET";

      const userRole = await storage.getUserRole(userId);
      const countryCode = userRole?.countryCode || "NG";
      const countryCurrencies: Record<string, string> = { NG: "NGN", US: "USD", ZA: "ZAR", GH: "GHS", CA: "CAD", KE: "KES" };
      const tripCurrency = countryCurrencies[countryCode] || "NGN";

      const trip = await storage.createTrip({
        riderId: userId,
        pickupLocation,
        dropoffLocation,
        passengerCount: 1,
        paymentSource: resolvedPayment as any,
        isTestTrip: false,
        currencyCode: tripCurrency,
        countryId: countryCode,
        isReserved: true,
        scheduledPickupAt: scheduledDate,
        reservationStatus: "scheduled",
      });

      console.log(`[SCHEDULED RIDE] tripId=${trip.id}, userId=${userId}, scheduledAt=${scheduledPickupAt}, payment=${resolvedPayment}`);

      return res.json(trip);
    } catch (error) {
      console.error("Error scheduling ride:", error);
      return res.status(500).json({ message: "Failed to schedule ride" });
    }
  });

  app.get("/api/admin/scheduled-trips", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const allTrips = await storage.getAllTrips();
      const scheduledTrips = allTrips.filter((t: any) => t.isReserved === true);
      return res.json(scheduledTrips);
    } catch (error) {
      console.error("Error fetching scheduled trips:", error);
      return res.status(500).json({ message: "Failed to fetch scheduled trips" });
    }
  });

  app.post("/api/admin/scheduled-trips/:tripId/assign-driver", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { driverId } = req.body;
      if (!driverId) {
        return res.status(400).json({ message: "Driver ID is required" });
      }
      const trip = await storage.getTripById(tripId);
      if (!trip || !trip.isReserved) {
        return res.status(404).json({ message: "Scheduled trip not found" });
      }
      const updated = await storage.updateTrip(tripId, {
        driverId,
        reservationStatus: "driver_assigned",
        status: "accepted",
        acceptedAt: new Date(),
      });
      return res.json(updated);
    } catch (error) {
      console.error("Error assigning driver:", error);
      return res.status(500).json({ message: "Failed to assign driver" });
    }
  });

  app.post("/api/admin/scheduled-trips/:tripId/cancel", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { reason } = req.body;
      const trip = await storage.getTripById(tripId);
      if (!trip || !trip.isReserved) {
        return res.status(404).json({ message: "Scheduled trip not found" });
      }
      const cancelled = await storage.adminCancelTrip(tripId, reason || "Cancelled by admin");
      return res.json(cancelled);
    } catch (error) {
      console.error("Error cancelling scheduled trip:", error);
      return res.status(500).json({ message: "Failed to cancel scheduled trip" });
    }
  });

  app.get("/api/driver/scheduled-trips", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allTrips = await storage.getAllTrips();
      const driverScheduled = allTrips.filter((t: any) => {
        if (!t.isReserved) return false;
        if (t.status === "cancelled" || t.status === "completed") return false;
        const isAssignedToMe = t.driverId === userId;
        const isUnassigned = !t.driverId && t.reservationStatus === "scheduled";
        return isAssignedToMe || isUnassigned;
      });
      return res.json(driverScheduled);
    } catch (error) {
      console.error("Error fetching driver scheduled trips:", error);
      return res.status(500).json({ message: "Failed to fetch scheduled trips" });
    }
  });

  app.post("/api/driver/scheduled-trips/:tripId/accept", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const trip = await storage.getTripById(tripId);
      if (!trip || !trip.isReserved) {
        return res.status(404).json({ message: "Scheduled trip not found" });
      }
      if (trip.driverId && trip.driverId !== userId) {
        return res.status(400).json({ message: "This trip has already been assigned to another driver" });
      }
      const updated = await storage.updateTrip(tripId, {
        driverId: userId,
        reservationStatus: "driver_assigned",
        status: "accepted",
        acceptedAt: new Date(),
      });
      return res.json(updated);
    } catch (error) {
      console.error("Error accepting scheduled trip:", error);
      return res.status(500).json({ message: "Failed to accept trip" });
    }
  });

  app.post("/api/driver/scheduled-trips/:tripId/start", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const trip = await storage.getTripById(tripId);
      if (!trip || !trip.isReserved) {
        return res.status(404).json({ message: "Scheduled trip not found" });
      }
      if (trip.driverId !== userId) {
        return res.status(403).json({ message: "This trip is not assigned to you" });
      }
      if (trip.scheduledPickupAt) {
        const scheduledTime = new Date(trip.scheduledPickupAt).getTime();
        const now = Date.now();
        const fifteenMinMs = 15 * 60 * 1000;
        if (scheduledTime - now > fifteenMinMs) {
          const minutesUntil = Math.ceil((scheduledTime - now) / 60000);
          return res.status(400).json({ message: `Too early to start. Trip is scheduled in ${minutesUntil} minutes. You can start within 15 minutes of the scheduled time.` });
        }
      }
      const updated = await storage.updateTrip(tripId, {
        status: "in_progress",
        reservationStatus: "active",
      });
      return res.json(updated);
    } catch (error) {
      console.error("Error starting scheduled trip:", error);
      return res.status(500).json({ message: "Failed to start trip" });
    }
  });

  app.get("/api/rider/cancellation-metrics", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allTrips = await storage.getRiderTripHistory(userId);
      const totalTrips = allTrips.length;
      const cancelledTrips = allTrips.filter((t: any) => t.status === "cancelled" && t.cancelledBy === "rider").length;
      const cancellationRate = totalTrips > 0 ? (cancelledTrips / totalTrips) * 100 : 0;
      const warningThreshold = 15;
      return res.json({
        cancellationRate: Math.round(cancellationRate * 10) / 10,
        recentCancellations: cancelledTrips,
        totalTrips,
        warningThreshold,
        shouldWarn: totalTrips >= 5 && cancellationRate >= warningThreshold,
      });
    } catch (error) {
      console.error("Error getting rider cancellation metrics:", error);
      return res.status(500).json({ message: "Failed to get cancellation metrics" });
    }
  });

  app.post("/api/rider/cancel-ride/:tripId", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const { reason } = req.body || {};

      const existingTrip = await storage.getTripById(tripId);
      if (!existingTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      let cancellationFeeAmount: string | null = null;
      let feeDeducted = false;
      let feeMessage = "";

      try {
        const userRole = await storage.getUserRole(userId);
        const countryCode = userRole?.countryCode || "NG";
        const feeConfig = await storage.getCancellationFeeConfig(countryCode);

        if (feeConfig) {
          const gracePeriodMs = (feeConfig.gracePeriodMinutes || 3) * 60 * 1000;
          const tripCreatedAt = existingTrip.createdAt ? new Date(existingTrip.createdAt).getTime() : 0;
          const timeSinceRequest = Date.now() - tripCreatedAt;
          const isWithinGrace = timeSinceRequest < gracePeriodMs;

          if (existingTrip.isReserved && existingTrip.scheduledPickupAt) {
            const scheduledTime = new Date(existingTrip.scheduledPickupAt).getTime();
            const cancelWindowMs = (feeConfig.scheduledCancelWindowMinutes || 30) * 60 * 1000;
            const timeUntilPickup = scheduledTime - Date.now();

            if (timeUntilPickup <= cancelWindowMs) {
              cancellationFeeAmount = feeConfig.scheduledPenaltyAmount;
              feeMessage = `Scheduled ride cancellation fee of ${feeConfig.scheduledPenaltyAmount} applied (cancelled within ${feeConfig.scheduledCancelWindowMinutes} minutes of pickup).`;
            }
          } else if (!isWithinGrace && existingTrip.status !== "requested") {
            if (existingTrip.status === "accepted" && existingTrip.driverId) {
              cancellationFeeAmount = feeConfig.cancellationFeeAmount;
              feeMessage = `Cancellation fee of ${feeConfig.cancellationFeeAmount} applied (driver already assigned).`;
            }
          }

          if (cancellationFeeAmount) {
            const riderProfile = await storage.getRiderProfile(userId);
            if (riderProfile && (riderProfile.paymentMethod === "WALLET" || riderProfile.paymentMethod === "TEST_WALLET")) {
              const riderWallet = await storage.getRiderWallet(userId);
              if (riderWallet && parseFloat(riderWallet.balance) >= parseFloat(cancellationFeeAmount)) {
                await storage.updateRiderWalletBalance(userId, parseFloat(cancellationFeeAmount), "debit");
                feeDeducted = true;
                feeMessage += " Fee deducted from your wallet.";
              } else {
                feeMessage += " Insufficient wallet balance - fee recorded but not deducted.";
              }
            } else {
              feeMessage += " Fee recorded on your account.";
            }

            await storage.createRiderInboxMessage({
              userId,
              title: "Cancellation Fee Applied",
              body: feeMessage,
              type: "payment_alert",
              read: false,
              referenceId: tripId,
              referenceType: "trip_cancellation",
            });
          }
        }
      } catch (feeError) {
        console.error("Error processing cancellation fee:", feeError);
      }

      const trip = await storage.cancelTrip(tripId, userId, reason);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found or cannot be cancelled" });
      }

      if (cancellationFeeAmount) {
        try {
          await storage.updateTrip(tripId, {
            cancellationFeeApplied: cancellationFeeAmount,
            cancellationFeeDeducted: feeDeducted,
          });
        } catch (updateError) {
          console.error("Error updating trip cancellation fee fields:", updateError);
        }
      }

      // Phase 5: Update behavior stats on cancellation and void promos
      try {
        await evaluateBehaviorAndWarnings(userId, "rider");
        if (trip.driverId) {
          await evaluateBehaviorAndWarnings(trip.driverId, "driver");
        }
        await voidPromosOnCancellation(tripId);
      } catch (behaviorError) {
        console.error("Error updating behavior on cancellation:", behaviorError);
      }

      return res.json({
        ...trip,
        cancellationFeeApplied: cancellationFeeAmount,
        cancellationFeeDeducted: feeDeducted,
        cancellationFeeMessage: feeMessage || undefined,
      });
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

  // MULTI-ROLE SYSTEM: Admin endpoint to assign a role to a user (SUPER_ADMIN only)
  app.post("/api/admin/assign-role", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId, role, countryCode = "NG" } = req.body;
      const assignedBy = req.user.claims.sub;

      if (!userId || !role) {
        return res.status(400).json({ message: "userId and role are required" });
      }

      // Prevent assigning super_admin role via this endpoint
      if (role === "super_admin") {
        return res.status(403).json({ message: "Cannot assign super_admin role via this endpoint" });
      }

      // Check if user already has this role
      const hasRole = await storage.hasRole(userId, role);
      if (hasRole) {
        return res.status(400).json({ message: "You already have this account type." });
      }

      // Add the role
      const result = await storage.addRoleToUser(userId, role, countryCode);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      // Create role-specific profiles if needed
      if (role === "rider") {
        const existingRiderProfile = await storage.getRiderProfile(userId);
        if (!existingRiderProfile) {
          await storage.createRiderProfile({ userId });
        }
      } else if (role === "driver") {
        const existingDriverProfile = await storage.getDriverProfile(userId);
        if (!existingDriverProfile) {
          await storage.createDriverProfile({ userId, status: "pending" });
        }
      }
      
      // DEFAULT RATING: Create trust profile with 5.0 stars on role assignment
      await storage.getOrCreateUserTrustProfile(userId);

      // Create audit log
      await storage.createAuditLog({
        action: "MULTI_ROLE_ASSIGN",
        entityType: "user_role",
        entityId: userId,
        performedByUserId: assignedBy,
        performedByRole: "super_admin",
        metadata: JSON.stringify({ assignedRole: role, countryCode })
      });

      // Return all roles for the user
      const allRoles = await storage.getAllUserRoles(userId);
      return res.json({
        success: true,
        role: result.role,
        roles: allRoles.map(r => r.role),
        roleCount: allRoles.length
      });
    } catch (error) {
      console.error("Error assigning role:", error);
      return res.status(500).json({ message: "Failed to assign role" });
    }
  });

  // MULTI-ROLE SYSTEM: Admin endpoint to remove a specific role from a user (SUPER_ADMIN only)
  app.post("/api/admin/remove-role", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId, role } = req.body;
      const removedBy = req.user.claims.sub;

      if (!userId || !role) {
        return res.status(400).json({ message: "userId and role are required" });
      }

      // Prevent removing super_admin role via this endpoint
      if (role === "super_admin") {
        return res.status(403).json({ message: "Cannot remove super_admin role via this endpoint" });
      }

      // Check if user has this role
      const hasRole = await storage.hasRole(userId, role);
      if (!hasRole) {
        return res.status(400).json({ message: "User does not have this role" });
      }

      // Remove the specific role
      await storage.deleteSpecificRole(userId, role);

      // Create audit log
      await storage.createAuditLog({
        action: "MULTI_ROLE_REMOVE",
        entityType: "user_role",
        entityId: userId,
        performedByUserId: removedBy,
        performedByRole: "super_admin",
        metadata: JSON.stringify({ removedRole: role })
      });

      // Return remaining roles for the user
      const allRoles = await storage.getAllUserRoles(userId);
      return res.json({
        success: true,
        roles: allRoles.map(r => r.role),
        roleCount: allRoles.length
      });
    } catch (error) {
      console.error("Error removing role:", error);
      return res.status(500).json({ message: "Failed to remove role" });
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
        const filtered = (status && status !== "all") ? drivers.filter((d: any) => d.status === status) : drivers;
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
        message: `Your payout of ₦${(parseFloat(String(payout.amount)) / 100).toFixed(2)} has been marked as paid.`,
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

  // Admin Bank Account Management
  app.get("/api/admin/bank-accounts", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const bankAccounts = await storage.getAllDriverBankAccounts();
      
      // Enhance with driver info
      const enhanced = await Promise.all(bankAccounts.map(async (account) => {
        const drivers = await storage.getAllDrivers();
        const driver = drivers.find(d => d.id === account.driverId);
        return {
          ...account,
          driverName: driver?.fullName || "Unknown",
          driverUserId: driver?.userId,
          accountNumberMasked: `****${account.accountNumber.slice(-4)}`,
        };
      }));
      
      return res.json(enhanced);
    } catch (error) {
      console.error("Error getting bank accounts:", error);
      return res.status(500).json({ message: "Failed to get bank accounts" });
    }
  });

  app.post("/api/admin/bank-accounts/:driverId/verify", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { driverId } = req.params;
      const { verified } = req.body;
      
      const updated = await storage.verifyDriverBankAccount(
        driverId, 
        verified === true, 
        "manual", 
        adminUserId
      );
      
      if (!updated) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      
      console.log(`[AUDIT] Bank account ${verified ? "verified" : "unverified"}: driverId=${driverId}, by=${adminUserId}`);
      return res.json(updated);
    } catch (error) {
      console.error("Error verifying bank account:", error);
      return res.status(500).json({ message: "Failed to verify bank account" });
    }
  });

  // Admin Withdrawal Management
  app.get("/api/admin/withdrawals", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const withdrawals = await storage.getPendingDriverWithdrawals();
      
      // Enhance with driver and bank account info
      const enhanced = await Promise.all(withdrawals.map(async (withdrawal) => {
        const drivers = await storage.getAllDrivers();
        const driver = drivers.find(d => d.id === withdrawal.driverId);
        const bankAccount = await storage.getDriverBankAccount(withdrawal.driverId);
        return {
          ...withdrawal,
          driverName: driver?.fullName || "Unknown",
          driverUserId: driver?.userId,
          bankDetails: bankAccount ? {
            bankName: bankAccount.bankName,
            accountNumber: `****${bankAccount.accountNumber.slice(-4)}`,
            accountName: bankAccount.accountName,
          } : null,
        };
      }));
      
      return res.json(enhanced);
    } catch (error) {
      console.error("Error getting withdrawals:", error);
      return res.status(500).json({ message: "Failed to get withdrawals" });
    }
  });

  app.post("/api/admin/withdrawals/:withdrawalId/approve", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { withdrawalId } = req.params;
      const { initiateTransfer } = req.body; // Optional: if true, initiate real transfer
      
      // Get withdrawal details
      const withdrawal = await storage.getDriverWithdrawalById(withdrawalId);
      if (!withdrawal) {
        return res.status(404).json({ message: "Withdrawal not found" });
      }
      
      if (withdrawal.status !== "pending") {
        return res.status(400).json({ message: "Withdrawal already processed" });
      }
      
      // Get driver profile to check if test driver
      const driverProfile = await storage.getDriverProfile(withdrawal.driverId);
      if (!driverProfile) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      
      // Get bank account for transfer
      const bankAccount = await storage.getDriverBankAccount(withdrawal.driverId);
      if (!bankAccount || !bankAccount.isVerified) {
        return res.status(400).json({ message: "Driver bank account not verified" });
      }
      
      // If initiateTransfer is true, use payout provider
      if (initiateTransfer && withdrawal.currencyCode === "NGN") {
        const provider = getPayoutProviderForCountry("NG");
        const reference = generatePayoutReference();
        
        console.log(`[PAYOUT] Initiating transfer via ${provider.name}: ${withdrawal.amount} NGN to ${bankAccount.accountNumber}`);
        
        const result = await provider.initiateTransfer({
          amountNGN: parseFloat(withdrawal.amount),
          bankCode: bankAccount.bankCode,
          accountNumber: bankAccount.accountNumber,
          accountName: bankAccount.accountName,
          reference: reference,
          narration: `ZIBA Driver Payout - ${withdrawal.id}`,
        });
        
        if (result.success) {
          const updated = await storage.updateDriverWithdrawal(withdrawalId, {
            status: "approved",
            payoutProvider: provider.name,
            payoutReference: reference,
            providerReference: result.providerReference,
            providerStatus: result.status,
            processedBy: adminUserId,
            processedAt: new Date(),
          });
          
          console.log(`[AUDIT] Withdrawal approved with transfer: id=${withdrawalId}, provider=${provider.name}, ref=${reference}, by=${adminUserId}`);
          return res.json({ message: "Withdrawal approved and transfer initiated", withdrawal: updated, transferResult: result });
        } else {
          // Transfer failed - update with error
          await storage.updateDriverWithdrawal(withdrawalId, {
            providerError: result.error,
            payoutProvider: provider.name,
          });
          
          console.error(`[PAYOUT] Transfer failed: ${result.error}`);
          return res.status(400).json({ message: "Transfer failed", error: result.error });
        }
      }
      
      // Standard approval without transfer initiation
      const updated = await storage.updateDriverWithdrawalStatus(
        withdrawalId,
        "approved",
        adminUserId
      );
      
      console.log(`[AUDIT] Withdrawal approved: id=${withdrawalId}, by=${adminUserId}`);
      return res.json({ message: "Withdrawal approved", withdrawal: updated });
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      return res.status(500).json({ message: "Failed to approve withdrawal" });
    }
  });

  app.post("/api/admin/withdrawals/:withdrawalId/reject", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { withdrawalId } = req.params;
      const { reason } = req.body;
      
      const updated = await storage.updateDriverWithdrawalStatus(
        withdrawalId,
        "rejected",
        adminUserId,
        reason || "Rejected by admin"
      );
      
      if (!updated) {
        return res.status(404).json({ message: "Withdrawal not found" });
      }
      
      console.log(`[AUDIT] Withdrawal rejected: id=${withdrawalId}, by=${adminUserId}, reason=${reason}`);
      return res.json({ message: "Withdrawal rejected", withdrawal: updated });
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      return res.status(500).json({ message: "Failed to reject withdrawal" });
    }
  });

  app.post("/api/admin/withdrawals/:withdrawalId/mark-paid", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { withdrawalId } = req.params;
      const { payoutReference } = req.body;
      
      // First approve if pending
      let withdrawal = await storage.updateDriverWithdrawalStatus(
        withdrawalId,
        "paid",
        adminUserId
      );
      
      if (!withdrawal) {
        return res.status(404).json({ message: "Withdrawal not found" });
      }
      
      console.log(`[AUDIT] Withdrawal marked as paid: id=${withdrawalId}, by=${adminUserId}, ref=${payoutReference || "N/A"}`);
      
      // TODO: Deduct from driver wallet when payment is confirmed
      // This would integrate with actual payment provider
      
      return res.json({ message: "Withdrawal marked as paid", withdrawal });
    } catch (error) {
      console.error("Error marking withdrawal as paid:", error);
      return res.status(500).json({ message: "Failed to mark withdrawal as paid" });
    }
  });

  // Paystack Webhook for transfer status updates
  app.post("/api/webhooks/paystack", async (req, res) => {
    try {
      const signature = req.headers["x-paystack-signature"] as string;
      const body = JSON.stringify(req.body);
      
      // Validate webhook signature
      if (!validatePaystackWebhook(body, signature)) {
        console.log("[WEBHOOK] Invalid Paystack signature");
        return res.status(401).json({ message: "Invalid signature" });
      }
      
      const event = req.body;
      console.log(`[WEBHOOK] Paystack event received: ${event.event}`);
      
      // Handle transfer events
      if (event.event === "transfer.success" || event.event === "transfer.failed" || event.event === "transfer.reversed") {
        const transferData = event.data;
        const reference = transferData.reference;
        
        // Find withdrawal by reference
        const withdrawal = await storage.getDriverWithdrawalByReference(reference);
        if (!withdrawal) {
          console.log(`[WEBHOOK] Withdrawal not found for reference: ${reference}`);
          return res.status(200).json({ message: "Webhook received" });
        }
        
        let newStatus: "paid" | "failed" | "processing" = "processing";
        let providerStatus = transferData.status;
        let providerError = transferData.reason || null;
        
        if (event.event === "transfer.success") {
          newStatus = "paid";
          console.log(`[WEBHOOK] Transfer successful: reference=${reference}, withdrawalId=${withdrawal.id}`);
        } else if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
          newStatus = "failed";
          console.log(`[WEBHOOK] Transfer failed: reference=${reference}, reason=${providerError}`);
        }
        
        // Update withdrawal status
        await storage.updateDriverWithdrawal(withdrawal.id, {
          status: newStatus,
          providerStatus,
          providerError,
          processedAt: new Date(),
        });
        
        console.log(`[AUDIT] Withdrawal updated via Paystack webhook: id=${withdrawal.id}, status=${newStatus}`);
      }
      
      return res.status(200).json({ message: "Webhook processed" });
    } catch (error) {
      console.error("[WEBHOOK] Paystack error:", error);
      return res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Flutterwave Webhook for transfer status updates
  app.post("/api/webhooks/flutterwave", async (req, res) => {
    try {
      const signature = req.headers["verif-hash"] as string;
      
      // Validate webhook signature
      if (!validateFlutterwaveWebhook(signature)) {
        console.log("[WEBHOOK] Invalid Flutterwave signature");
        return res.status(401).json({ message: "Invalid signature" });
      }
      
      const event = req.body;
      console.log(`[WEBHOOK] Flutterwave event received: ${event.event}`);
      
      // Handle transfer events
      if (event.event === "transfer.completed") {
        const transferData = event.data;
        const reference = transferData.reference;
        
        // Find withdrawal by reference
        const withdrawal = await storage.getDriverWithdrawalByReference(reference);
        if (!withdrawal) {
          console.log(`[WEBHOOK] Withdrawal not found for reference: ${reference}`);
          return res.status(200).json({ message: "Webhook received" });
        }
        
        let newStatus: "paid" | "failed" | "processing" = "processing";
        let providerStatus = transferData.status;
        let providerError = transferData.complete_message || null;
        
        if (transferData.status === "SUCCESSFUL") {
          newStatus = "paid";
          console.log(`[WEBHOOK] Transfer successful: reference=${reference}, withdrawalId=${withdrawal.id}`);
        } else if (transferData.status === "FAILED") {
          newStatus = "failed";
          console.log(`[WEBHOOK] Transfer failed: reference=${reference}, reason=${providerError}`);
        }
        
        // Update withdrawal status
        await storage.updateDriverWithdrawal(withdrawal.id, {
          status: newStatus,
          providerStatus,
          providerError,
          processedAt: new Date(),
        });
        
        console.log(`[AUDIT] Withdrawal updated via Flutterwave webhook: id=${withdrawal.id}, status=${newStatus}`);
      }
      
      return res.status(200).json({ message: "Webhook processed" });
    } catch (error) {
      console.error("[WEBHOOK] Flutterwave error:", error);
      return res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Admin Driver Verification Management
  app.post("/api/admin/drivers/:userId/verify-nin", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { userId } = req.params;
      const { verified, ninNumber } = req.body;
      
      // If verifying with NIN number, check for duplicates
      if (verified && ninNumber) {
        const ninHash = require("crypto").createHash("sha256").update(ninNumber.trim().toUpperCase()).digest("hex");
        
        // Check if any other driver has this NIN hash
        const existingDriver = await storage.getDriverByNinHash(ninHash);
        if (existingDriver && existingDriver.userId !== userId) {
          console.log(`[FRAUD] Duplicate NIN detected: userId=${userId}, existingDriver=${existingDriver.userId}, by=${adminUserId}`);
          return res.status(400).json({ message: "This NIN is already registered to another driver. Fraud detected." });
        }
        
        const updated = await storage.updateDriverProfile(userId, {
          isNINVerified: true,
          ninHash: ninHash,
        });
        
        if (!updated) {
          return res.status(404).json({ message: "Driver not found" });
        }
        
        console.log(`[AUDIT] Driver NIN verified with hash: userId=${userId}, by=${adminUserId}`);
        return res.json(updated);
      }
      
      const updated = await storage.updateDriverProfile(userId, {
        isNINVerified: verified === true,
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      console.log(`[AUDIT] Driver NIN ${verified ? "verified" : "unverified"}: userId=${userId}, by=${adminUserId}`);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating NIN verification:", error);
      return res.status(500).json({ message: "Failed to update NIN verification" });
    }
  });

  app.post("/api/admin/drivers/:userId/verify-license", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { userId } = req.params;
      const { verified, licenseNumber } = req.body;
      
      // If verifying with license number, check for duplicates
      if (verified && licenseNumber) {
        const licenseHash = require("crypto").createHash("sha256").update(licenseNumber.trim().toUpperCase()).digest("hex");
        
        // Check if any other driver has this license hash
        const existingDriver = await storage.getDriverByLicenseHash(licenseHash);
        if (existingDriver && existingDriver.userId !== userId) {
          console.log(`[FRAUD] Duplicate license detected: userId=${userId}, existingDriver=${existingDriver.userId}, by=${adminUserId}`);
          return res.status(400).json({ message: "This driver's license is already registered to another driver. Fraud detected." });
        }
        
        const updated = await storage.updateDriverProfile(userId, {
          isDriversLicenseVerified: true,
          driversLicenseHash: licenseHash,
        });
        
        if (!updated) {
          return res.status(404).json({ message: "Driver not found" });
        }
        
        console.log(`[AUDIT] Driver license verified with hash: userId=${userId}, by=${adminUserId}`);
        return res.json(updated);
      }
      
      const updated = await storage.updateDriverProfile(userId, {
        isDriversLicenseVerified: verified === true,
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      console.log(`[AUDIT] Driver license ${verified ? "verified" : "unverified"}: userId=${userId}, by=${adminUserId}`);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating license verification:", error);
      return res.status(500).json({ message: "Failed to update license verification" });
    }
  });

  app.post("/api/admin/drivers/:userId/verify-address", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { userId } = req.params;
      const { verified } = req.body;
      
      const updated = await storage.updateDriverProfile(userId, {
        isAddressVerified: verified === true,
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      console.log(`[AUDIT] Driver address ${verified ? "verified" : "unverified"}: userId=${userId}, by=${adminUserId}`);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating address verification:", error);
      return res.status(500).json({ message: "Failed to update address verification" });
    }
  });

  app.post("/api/admin/drivers/:userId/verify-identity", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { userId } = req.params;
      const { verified } = req.body;
      
      const updated = await storage.updateDriverProfile(userId, {
        isIdentityVerified: verified === true,
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      console.log(`[AUDIT] Driver identity ${verified ? "verified" : "unverified"}: userId=${userId}, by=${adminUserId}`);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating identity verification:", error);
      return res.status(500).json({ message: "Failed to update identity verification" });
    }
  });

  // Complete driver verification (sets all flags and status to verified)
  app.post("/api/admin/drivers/:userId/complete-verification", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { userId } = req.params;
      
      // Update all verification flags
      await storage.updateDriverProfile(userId, {
        isNINVerified: true,
        isDriversLicenseVerified: true,
        isAddressVerified: true,
        isIdentityVerified: true,
      });
      
      // Set overall status to verified
      const updated = await storage.updateDriverWithdrawalVerificationStatus(userId, "verified");
      
      if (!updated) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      console.log(`[AUDIT] Driver verification completed: userId=${userId}, by=${adminUserId}`);
      return res.json({ message: "Driver verification completed", driver: updated });
    } catch (error) {
      console.error("Error completing driver verification:", error);
      return res.status(500).json({ message: "Failed to complete verification" });
    }
  });

  // =============================================
  // PHASE 1: UNIVERSAL IDENTITY FRAMEWORK ENDPOINTS
  // =============================================

  // Submit identity profile (for all users)
  app.post("/api/identity/submit", isAuthenticated, async (req: any, res) => {
    try {
      assertIdentityEngineLocked();
      
      const userId = req.user.claims.sub;
      const { 
        legalFullName, 
        dateOfBirth, 
        residentialAddress, 
        countryCode, 
        governmentIdType, 
        governmentIdNumber,
        driverLicenseNumber,
        driverLicenseCountry,
      } = req.body;

      // Validate required fields
      if (!legalFullName || !dateOfBirth || !residentialAddress || !countryCode || !governmentIdType || !governmentIdNumber) {
        return res.status(400).json({ message: "Missing required identity fields" });
      }

      // Validate ID type for country
      if (!isValidIdTypeForCountry(countryCode, governmentIdType)) {
        const config = getIdentityConfig(countryCode);
        return res.status(400).json({ 
          message: `Invalid ID type for ${countryCode}. Allowed: ${config.allowedIdTypes.join(", ")}`,
          code: "INVALID_ID_TYPE",
        });
      }

      // Validate submission (checks for duplicates)
      const validation = await validateIdentitySubmission({
        userId,
        countryCode,
        governmentIdType,
        governmentIdNumber,
        driverLicenseNumber,
      });

      if (!validation.allowed) {
        return res.status(400).json({
          message: validation.message,
          code: validation.code,
        });
      }

      // Check if profile already exists
      const existing = await storage.getUserIdentityProfile(userId);
      if (existing) {
        return res.status(400).json({ message: "Identity profile already submitted" });
      }

      // Hash the documents (NEVER store raw)
      const governmentIdHash = hashIdentityDocument(governmentIdNumber);
      const driverLicenseHash = driverLicenseNumber ? hashIdentityDocument(driverLicenseNumber) : null;

      // Create the identity profile
      const profile = await storage.createUserIdentityProfile({
        userId,
        legalFullName,
        dateOfBirth: new Date(dateOfBirth),
        residentialAddress,
        countryCode,
        governmentIdType,
        governmentIdHash,
        governmentIdIssuedCountry: countryCode,
        driverLicenseHash,
        driverLicenseCountry: driverLicenseCountry || null,
      });

      // Log the submission
      await storage.createIdentityAuditLog({
        userId,
        actionType: "SUBMISSION",
        actionBy: userId,
        actionDetails: JSON.stringify({ governmentIdType, countryCode }),
        countryCode,
        governmentIdType,
      });

      console.log(`[IDENTITY] Profile submitted: userId=${userId}, countryCode=${countryCode}, idType=${governmentIdType}`);

      return res.json({
        message: "Identity submitted for verification",
        profile: {
          id: profile.id,
          identityStatus: profile.identityStatus,
          countryCode: profile.countryCode,
          governmentIdType: profile.governmentIdType,
        },
      });
    } catch (error) {
      console.error("Error submitting identity:", error);
      return res.status(500).json({ message: "Failed to submit identity" });
    }
  });

  // Get my identity profile
  app.get("/api/identity/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserIdentityProfile(userId);
      
      if (!profile) {
        return res.json({ submitted: false });
      }

      return res.json({
        submitted: true,
        identityStatus: profile.identityStatus,
        identityVerified: profile.identityVerified,
        driverLicenseVerified: profile.driverLicenseVerified,
        countryCode: profile.countryCode,
        governmentIdType: profile.governmentIdType,
        rejectionReason: profile.rejectionReason,
        createdAt: profile.createdAt,
      });
    } catch (error) {
      console.error("Error getting identity profile:", error);
      return res.status(500).json({ message: "Failed to get identity profile" });
    }
  });

  // Get identity config for country
  app.get("/api/identity/config/:countryCode", isAuthenticated, async (req: any, res) => {
    try {
      const { countryCode } = req.params;
      const config = getIdentityConfig(countryCode);
      return res.json(config);
    } catch (error) {
      console.error("Error getting identity config:", error);
      return res.status(500).json({ message: "Failed to get identity config" });
    }
  });

  // Admin: Get all pending identity profiles
  app.get("/api/admin/identity/pending", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const profiles = await storage.getAllPendingIdentityProfiles();
      return res.json(profiles);
    } catch (error) {
      console.error("Error getting pending identities:", error);
      return res.status(500).json({ message: "Failed to get pending identities" });
    }
  });

  // Admin: Get all identity profiles
  app.get("/api/admin/identity/all", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const profiles = await storage.getAllIdentityProfiles();
      return res.json(profiles);
    } catch (error) {
      console.error("Error getting identities:", error);
      return res.status(500).json({ message: "Failed to get identities" });
    }
  });

  // Admin: Get identity profile for user
  app.get("/api/admin/identity/:userId", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getUserIdentityProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Identity profile not found" });
      }

      return res.json(profile);
    } catch (error) {
      console.error("Error getting identity profile:", error);
      return res.status(500).json({ message: "Failed to get identity profile" });
    }
  });

  // Admin: Approve identity
  app.post("/api/admin/identity/:userId/approve", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { userId } = req.params;

      const result = await adminApproveIdentity(userId, adminId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.json({ message: result.message });
    } catch (error) {
      console.error("Error approving identity:", error);
      return res.status(500).json({ message: "Failed to approve identity" });
    }
  });

  // Admin: Reject identity
  app.post("/api/admin/identity/:userId/reject", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { userId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const result = await adminRejectIdentity(userId, adminId, reason);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.json({ message: result.message });
    } catch (error) {
      console.error("Error rejecting identity:", error);
      return res.status(500).json({ message: "Failed to reject identity" });
    }
  });

  // Admin: Verify driver license
  app.post("/api/admin/identity/:userId/verify-license", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { userId } = req.params;

      const result = await adminVerifyDriverLicense(userId, adminId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.json({ message: result.message });
    } catch (error) {
      console.error("Error verifying driver license:", error);
      return res.status(500).json({ message: "Failed to verify driver license" });
    }
  });

  // Admin: Get identity audit logs
  app.get("/api/admin/identity/audit-logs", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const logs = await storage.getAllIdentityAuditLogs();
      return res.json(logs);
    } catch (error) {
      console.error("Error getting audit logs:", error);
      return res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // Admin: Get identity audit logs for user
  app.get("/api/admin/identity/:userId/audit-logs", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const logs = await storage.getIdentityAuditLogs(userId);
      return res.json(logs);
    } catch (error) {
      console.error("Error getting user audit logs:", error);
      return res.status(500).json({ message: "Failed to get user audit logs" });
    }
  });

  // Check driver can go online (for UI feedback)
  app.get("/api/driver/identity-check", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await checkDriverCanGoOnline(userId);
      return res.json(result);
    } catch (error) {
      console.error("Error checking driver identity:", error);
      return res.status(500).json({ message: "Failed to check driver identity" });
    }
  });

  // =============================================
  // PHASE 2: DRIVER GPS & NAVIGATION ENFORCEMENT ENDPOINTS
  // =============================================

  // Get navigation providers list
  app.get("/api/navigation/providers", isAuthenticated, async (req: any, res) => {
    try {
      const providers = Object.values(NAVIGATION_PROVIDERS).map(p => ({
        id: p.id,
        name: p.name,
      }));
      return res.json(providers);
    } catch (error) {
      console.error("Error getting navigation providers:", error);
      return res.status(500).json({ message: "Failed to get navigation providers" });
    }
  });

  // Get driver's navigation setup status
  app.get("/api/driver/navigation/setup", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const setup = await storage.getDriverNavigationSetup(userId);
      
      if (!setup) {
        return res.json({
          exists: false,
          setupComplete: false,
          gpsPermissionGranted: false,
          highAccuracyEnabled: false,
          preferredNavigationProvider: null,
          backgroundLocationConsent: false,
          foregroundServiceConsent: false,
        });
      }
      
      return res.json({
        exists: true,
        setupComplete: setup.navigationSetupCompleted,
        gpsPermissionGranted: setup.gpsPermissionGranted,
        highAccuracyEnabled: setup.highAccuracyEnabled,
        preferredNavigationProvider: setup.preferredNavigationProvider,
        backgroundLocationConsent: setup.backgroundLocationConsent,
        foregroundServiceConsent: setup.foregroundServiceConsent,
        isGpsActive: setup.isGpsActive,
        lastGpsHeartbeat: setup.lastGpsHeartbeat,
        lastOfflineReason: setup.lastOfflineReason,
      });
    } catch (error) {
      console.error("Error getting navigation setup:", error);
      return res.status(500).json({ message: "Failed to get navigation setup" });
    }
  });

  // Initialize or update navigation setup (Step 1: GPS Permission)
  app.post("/api/driver/navigation/setup/gps-permission", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      assertNavigationEngineLocked();
      
      const userId = req.user.claims.sub;
      const { granted, highAccuracy, permissionStatus } = req.body;
      
      let setup = await storage.getDriverNavigationSetup(userId);
      
      if (!setup) {
        setup = await storage.createDriverNavigationSetup({
          userId,
          gpsPermissionGranted: granted === true,
          highAccuracyEnabled: highAccuracy === true,
          locationPermissionStatus: permissionStatus || (granted ? "granted" : "denied"),
        });
      } else {
        setup = await storage.updateDriverNavigationSetup(userId, {
          gpsPermissionGranted: granted === true,
          highAccuracyEnabled: highAccuracy === true,
          locationPermissionStatus: permissionStatus || (granted ? "granted" : "denied"),
        });
      }
      
      // Log audit event
      await storage.createNavigationAuditLog({
        userId,
        actionType: granted ? "PERMISSION_GRANTED" : "PERMISSION_DENIED",
        actionDetails: JSON.stringify({ highAccuracy, permissionStatus }),
      });
      
      console.log(`[NAVIGATION] GPS permission ${granted ? "granted" : "denied"}: userId=${userId}`);
      
      return res.json({
        success: true,
        message: granted ? "GPS permission granted" : "GPS permission denied",
        setup,
      });
    } catch (error) {
      console.error("Error updating GPS permission:", error);
      return res.status(500).json({ message: "Failed to update GPS permission" });
    }
  });

  // Update navigation setup (Step 2: Navigation Provider Selection)
  app.post("/api/driver/navigation/setup/provider", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      assertNavigationEngineLocked();
      
      const userId = req.user.claims.sub;
      const { provider } = req.body;
      
      if (!provider || !NAVIGATION_PROVIDERS[provider as keyof typeof NAVIGATION_PROVIDERS]) {
        return res.status(400).json({ message: "Invalid navigation provider" });
      }
      
      let setup = await storage.getDriverNavigationSetup(userId);
      
      if (!setup) {
        return res.status(400).json({ message: "Complete GPS permission step first" });
      }
      
      setup = await storage.updateDriverNavigationSetup(userId, {
        preferredNavigationProvider: provider,
        navigationProviderSetAt: new Date(),
      });
      
      // Log audit event
      await storage.createNavigationAuditLog({
        userId,
        actionType: "PROVIDER_CHANGED",
        actionDetails: JSON.stringify({ provider }),
        navigationProvider: provider,
      });
      
      console.log(`[NAVIGATION] Provider set: userId=${userId}, provider=${provider}`);
      
      return res.json({
        success: true,
        message: `Navigation provider set to ${NAVIGATION_PROVIDERS[provider as keyof typeof NAVIGATION_PROVIDERS].name}`,
        setup,
      });
    } catch (error) {
      console.error("Error updating navigation provider:", error);
      return res.status(500).json({ message: "Failed to update navigation provider" });
    }
  });

  // Update navigation setup (Step 3: Background Execution Consent)
  app.post("/api/driver/navigation/setup/background-consent", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      assertNavigationEngineLocked();
      
      const userId = req.user.claims.sub;
      const { backgroundLocation, foregroundService } = req.body;
      
      let setup = await storage.getDriverNavigationSetup(userId);
      
      if (!setup) {
        return res.status(400).json({ message: "Complete GPS permission step first" });
      }
      
      setup = await storage.updateDriverNavigationSetup(userId, {
        backgroundLocationConsent: backgroundLocation === true,
        foregroundServiceConsent: foregroundService === true,
      });
      
      // Log audit event
      await storage.createNavigationAuditLog({
        userId,
        actionType: "BACKGROUND_CONSENT_GRANTED",
        actionDetails: JSON.stringify({ backgroundLocation, foregroundService }),
      });
      
      console.log(`[NAVIGATION] Background consent updated: userId=${userId}, bg=${backgroundLocation}, fg=${foregroundService}`);
      
      return res.json({
        success: true,
        message: "Background execution consent updated",
        setup,
      });
    } catch (error) {
      console.error("Error updating background consent:", error);
      return res.status(500).json({ message: "Failed to update background consent" });
    }
  });

  // Complete navigation setup wizard
  app.post("/api/driver/navigation/setup/complete", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      assertNavigationEngineLocked();
      
      const userId = req.user.claims.sub;
      
      // Validate all steps are complete
      const checkResult = await checkNavigationSetup(userId);
      
      if (!checkResult.canGoOnline) {
        return res.status(400).json({
          success: false,
          message: checkResult.message,
          missingSteps: checkResult.missingSteps,
        });
      }
      
      // Mark setup as complete
      const setup = await storage.completeNavigationSetup(userId);
      
      // Log audit event
      await storage.createNavigationAuditLog({
        userId,
        actionType: "SETUP_COMPLETED",
        actionDetails: JSON.stringify({ completedAt: new Date() }),
      });
      
      console.log(`[NAVIGATION] Setup completed: userId=${userId}`);
      
      return res.json({
        success: true,
        message: "Navigation setup completed. You can now go online.",
        setup,
      });
    } catch (error) {
      console.error("Error completing navigation setup:", error);
      return res.status(500).json({ message: "Failed to complete navigation setup" });
    }
  });

  // Check if driver can go online (combined identity + navigation check)
  app.get("/api/driver/can-go-online", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check identity requirements
      const identityCheck = await checkDriverCanGoOnline(userId);
      
      // Check navigation requirements
      const navigationCheck = await checkNavigationSetup(userId);
      
      const canGoOnline = identityCheck.allowed && navigationCheck.canGoOnline;
      
      return res.json({
        canGoOnline,
        identity: {
          ready: identityCheck.allowed,
          message: identityCheck.message,
        },
        navigation: {
          ready: navigationCheck.canGoOnline,
          setupComplete: navigationCheck.setupComplete,
          missingSteps: navigationCheck.missingSteps,
          message: navigationCheck.message,
        },
      });
    } catch (error) {
      console.error("Error checking driver status:", error);
      return res.status(500).json({ message: "Failed to check driver status" });
    }
  });

  // GPS heartbeat update (called frequently while online/on trip)
  app.post("/api/driver/gps/heartbeat", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      assertNavigationEngineLocked();
      
      const userId = req.user.claims.sub;
      const { latitude, longitude, accuracy, altitude, speed, heading, deviceTimestamp } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const result = await processGpsUpdate(
        userId,
        parseFloat(latitude),
        parseFloat(longitude),
        accuracy ? parseFloat(accuracy) : undefined,
        altitude ? parseFloat(altitude) : undefined,
        speed ? parseFloat(speed) : undefined,
        heading ? parseFloat(heading) : undefined,
        deviceTimestamp ? new Date(deviceTimestamp) : undefined
      );
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
          isSpoofing: result.isSpoofing,
        });
      }
      
      return res.json({
        success: true,
        message: "GPS heartbeat received",
      });
    } catch (error) {
      console.error("Error processing GPS heartbeat:", error);
      return res.status(500).json({ message: "Failed to process GPS heartbeat" });
    }
  });

  // Report GPS state change
  app.post("/api/driver/gps/state", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      assertNavigationEngineLocked();
      
      const userId = req.user.claims.sub;
      const { enabled, latitude, longitude } = req.body;
      
      await storage.updateGpsState(userId, enabled === true, latitude, longitude);
      
      // Log the event
      await storage.createNavigationAuditLog({
        userId,
        actionType: enabled ? "PERMISSION_GRANTED" : "GPS_TIMEOUT",
        actionDetails: JSON.stringify({ enabled }),
        latitude,
        longitude,
      });
      
      // If GPS disabled, trigger auto-offline
      if (!enabled) {
        await triggerAutoOffline(userId, "GPS_DISABLED", "Driver disabled GPS");
      }
      
      return res.json({
        success: true,
        message: enabled ? "GPS enabled" : "GPS disabled - driver set offline",
      });
    } catch (error) {
      console.error("Error updating GPS state:", error);
      return res.status(500).json({ message: "Failed to update GPS state" });
    }
  });

  // Report app state change (foreground/background)
  app.post("/api/driver/app/state", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      assertNavigationEngineLocked();
      
      const userId = req.user.claims.sub;
      const { isInForeground } = req.body;
      
      await reportAppState(userId, isInForeground === true);
      
      return res.json({
        success: true,
        message: isInForeground ? "App resumed" : "App backgrounded",
      });
    } catch (error) {
      console.error("Error updating app state:", error);
      return res.status(500).json({ message: "Failed to update app state" });
    }
  });

  // Get navigation link for trip
  app.post("/api/driver/navigation/launch", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      assertNavigationEngineLocked();
      
      const userId = req.user.claims.sub;
      const { tripId, destLatitude, destLongitude, startLatitude, startLongitude } = req.body;
      
      if (!tripId || !destLatitude || !destLongitude) {
        return res.status(400).json({ message: "Trip ID and destination coordinates are required" });
      }
      
      const links = await launchNavigation(
        userId,
        tripId,
        parseFloat(destLatitude),
        parseFloat(destLongitude),
        startLatitude ? parseFloat(startLatitude) : undefined,
        startLongitude ? parseFloat(startLongitude) : undefined
      );
      
      if (!links) {
        return res.status(400).json({ message: "Navigation setup not complete" });
      }
      
      return res.json({
        success: true,
        deepLink: links.deepLink,
        webFallback: links.webFallback,
      });
    } catch (error) {
      console.error("Error launching navigation:", error);
      return res.status(500).json({ message: "Failed to launch navigation" });
    }
  });

  // Close navigation (trip ended)
  app.post("/api/driver/navigation/close", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      assertNavigationEngineLocked();
      
      const userId = req.user.claims.sub;
      const { tripId } = req.body;
      
      await closeNavigation(userId, tripId);
      
      return res.json({
        success: true,
        message: "Navigation closed",
      });
    } catch (error) {
      console.error("Error closing navigation:", error);
      return res.status(500).json({ message: "Failed to close navigation" });
    }
  });

  // Admin: Get all driver navigation setups
  app.get("/api/admin/navigation/drivers", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const setups = await storage.getAllDriverNavigationSetups();
      return res.json(setups);
    } catch (error) {
      console.error("Error getting driver navigation setups:", error);
      return res.status(500).json({ message: "Failed to get driver navigation setups" });
    }
  });

  // Admin: Get driver's navigation setup
  app.get("/api/admin/navigation/drivers/:userId", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const setup = await storage.getDriverNavigationSetup(userId);
      
      if (!setup) {
        return res.status(404).json({ message: "Navigation setup not found" });
      }
      
      return res.json(setup);
    } catch (error) {
      console.error("Error getting driver navigation setup:", error);
      return res.status(500).json({ message: "Failed to get driver navigation setup" });
    }
  });

  // Admin: Get drivers with GPS issues
  app.get("/api/admin/navigation/gps-issues", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const driversWithIssues = await storage.getDriversWithGpsIssues();
      return res.json(driversWithIssues);
    } catch (error) {
      console.error("Error getting drivers with GPS issues:", error);
      return res.status(500).json({ message: "Failed to get drivers with GPS issues" });
    }
  });

  // Admin: Get all GPS interruptions
  app.get("/api/admin/navigation/interruptions", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const interruptions = await storage.getAllGpsInterruptions();
      return res.json(interruptions);
    } catch (error) {
      console.error("Error getting GPS interruptions:", error);
      return res.status(500).json({ message: "Failed to get GPS interruptions" });
    }
  });

  // Admin: Get driver's GPS interruptions
  app.get("/api/admin/navigation/interruptions/:userId", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const interruptions = await storage.getGpsInterruptions(userId);
      return res.json(interruptions);
    } catch (error) {
      console.error("Error getting driver GPS interruptions:", error);
      return res.status(500).json({ message: "Failed to get driver GPS interruptions" });
    }
  });

  // Admin: Resolve GPS interruption
  app.post("/api/admin/navigation/interruptions/:interruptionId/resolve", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { interruptionId } = req.params;
      const { notes } = req.body;
      
      if (!notes) {
        return res.status(400).json({ message: "Resolution notes are required" });
      }
      
      const interruption = await storage.resolveGpsInterruption(interruptionId, notes);
      
      if (!interruption) {
        return res.status(404).json({ message: "Interruption not found" });
      }
      
      return res.json({
        success: true,
        message: "Interruption resolved",
        interruption,
      });
    } catch (error) {
      console.error("Error resolving GPS interruption:", error);
      return res.status(500).json({ message: "Failed to resolve GPS interruption" });
    }
  });

  // Admin: Get all navigation audit logs
  app.get("/api/admin/navigation/audit-logs", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const logs = await storage.getAllNavigationAuditLogs();
      return res.json(logs);
    } catch (error) {
      console.error("Error getting navigation audit logs:", error);
      return res.status(500).json({ message: "Failed to get navigation audit logs" });
    }
  });

  // Admin: Get driver's navigation audit logs
  app.get("/api/admin/navigation/audit-logs/:userId", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const logs = await storage.getNavigationAuditLogs(userId);
      return res.json(logs);
    } catch (error) {
      console.error("Error getting driver navigation audit logs:", error);
      return res.status(500).json({ message: "Failed to get driver navigation audit logs" });
    }
  });

  // Admin: Get driver's GPS tracking logs
  app.get("/api/admin/navigation/tracking/:userId", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getGpsTrackingLogs(userId, limit);
      return res.json(logs);
    } catch (error) {
      console.error("Error getting GPS tracking logs:", error);
      return res.status(500).json({ message: "Failed to get GPS tracking logs" });
    }
  });

  // Admin: Get GPS tracking logs for a trip
  app.get("/api/admin/navigation/tracking/trip/:tripId", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const logs = await storage.getGpsTrackingLogsForTrip(tripId);
      return res.json(logs);
    } catch (error) {
      console.error("Error getting trip GPS tracking logs:", error);
      return res.status(500).json({ message: "Failed to get trip GPS tracking logs" });
    }
  });

  // System: Check stale GPS heartbeats (called by cron/scheduled task)
  app.post("/api/system/navigation/check-heartbeats", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      assertNavigationEngineLocked();
      
      const offlinedCount = await checkStaleGpsHeartbeats();
      
      return res.json({
        success: true,
        offlinedCount,
        message: `Checked heartbeats. ${offlinedCount} drivers auto-offlined.`,
      });
    } catch (error) {
      console.error("Error checking stale heartbeats:", error);
      return res.status(500).json({ message: "Failed to check stale heartbeats" });
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
        currency: currency || "NGN",
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
        const currency = await getUserCurrency(userId);
        riderWallet = await storage.createRiderWallet({ userId, currency });
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

  // =====================================
  // DRIVER WITHDRAWAL & IDENTITY VERIFICATION ROUTES
  // =====================================

  // Get driver's identity profile
  app.get("/api/driver/identity-profile", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getIdentityProfile(userId);
      const documents = await storage.getIdentityDocuments(userId);
      return res.json({ profile, documents });
    } catch (error) {
      console.error("Error getting identity profile:", error);
      return res.status(500).json({ message: "Failed to get identity profile" });
    }
  });

  // Create or update identity profile
  app.post("/api/driver/identity-profile", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      const { legalFirstName, legalLastName, dateOfBirth, residenceAddressLine1, residenceCity, residenceState, residencePostalCode } = req.body;

      if (!legalFirstName || !legalLastName || !dateOfBirth) {
        return res.status(400).json({ message: "Legal first name, last name, and date of birth are required" });
      }

      const existingProfile = await storage.getIdentityProfile(userId);
      
      const profileData = {
        legalFirstName,
        legalLastName,
        dateOfBirth: new Date(dateOfBirth),
        countryCode: userRole?.countryCode || "NG",
        residenceAddressLine1,
        residenceCity,
        residenceState,
        residencePostalCode,
        residenceCountryCode: userRole?.countryCode || "NG",
      };

      let profile;
      if (existingProfile) {
        profile = await storage.updateIdentityProfile(userId, profileData);
      } else {
        profile = await storage.createIdentityProfile({ userId, ...profileData });
      }

      return res.json(profile);
    } catch (error) {
      console.error("Error updating identity profile:", error);
      return res.status(500).json({ message: "Failed to update identity profile" });
    }
  });

  // Submit identity document
  app.post("/api/driver/identity-document", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      const { documentType, documentNumber, issuingAuthority, expiryDate } = req.body;

      if (!documentType || !documentNumber) {
        return res.status(400).json({ message: "Document type and number are required" });
      }

      // Hash the document number for secure storage
      const documentNumberHash = createHash("sha256").update(documentNumber.trim().toUpperCase()).digest("hex");

      // Check for document reuse across users (anti-fraud)
      const documentExists = await storage.checkDocumentHashExists(documentNumberHash, userId);
      if (documentExists) {
        console.warn(`[FRAUD ALERT] Document hash reuse attempt by user ${userId}`);
        return res.status(400).json({ 
          message: "This document is already registered to another user",
          code: "DOCUMENT_ALREADY_REGISTERED"
        });
      }

      // Check if document of this type already exists for user
      const existingDoc = await storage.getIdentityDocumentByType(userId, documentType);
      if (existingDoc) {
        return res.status(400).json({ 
          message: "You have already submitted a document of this type",
          code: "DOCUMENT_TYPE_EXISTS"
        });
      }

      const document = await storage.createIdentityDocument({
        userId,
        countryCode: userRole?.countryCode || "NG",
        documentType,
        documentNumberHash,
        issuingAuthority,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      });

      return res.json({ message: "Document submitted for verification", document });
    } catch (error) {
      console.error("Error submitting identity document:", error);
      return res.status(500).json({ message: "Failed to submit identity document" });
    }
  });

  // Get driver's withdrawal history
  app.get("/api/driver/withdrawals", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const withdrawals = await storage.getDriverWithdrawals(userId);
      return res.json(withdrawals);
    } catch (error) {
      console.error("Error getting driver withdrawals:", error);
      return res.status(500).json({ message: "Failed to get withdrawal history" });
    }
  });

  // Request withdrawal - with full identity verification
  app.post("/api/driver/withdraw", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      const { amount, payoutMethod } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid withdrawal amount" });
      }

      if (!payoutMethod || !["BANK", "MOBILE_MONEY"].includes(payoutMethod)) {
        return res.status(400).json({ message: "Invalid payout method. Use BANK or MOBILE_MONEY" });
      }

      // Get driver profile
      const driverProfile = await storage.getDriverProfile(userId);
      if (!driverProfile) {
        return res.status(400).json({ message: "Driver profile not found" });
      }

      // Check driver verification status
      if (driverProfile.withdrawalVerificationStatus !== "verified") {
        return res.status(403).json({ 
          message: "Your identity is not verified for withdrawals",
          code: "IDENTITY_NOT_VERIFIED",
          currentStatus: driverProfile.withdrawalVerificationStatus
        });
      }

      // Get identity profile
      const identityProfile = await storage.getIdentityProfile(userId);
      if (!identityProfile) {
        return res.status(403).json({ 
          message: "Identity profile required for withdrawal",
          code: "IDENTITY_PROFILE_MISSING"
        });
      }

      // Check identity verification
      if (!identityProfile.identityVerified) {
        return res.status(403).json({ 
          message: "Identity verification required for withdrawal",
          code: "IDENTITY_NOT_VERIFIED"
        });
      }

      // Check address verification
      if (!identityProfile.addressVerified) {
        return res.status(403).json({ 
          message: "Address verification required for withdrawal",
          code: "ADDRESS_NOT_VERIFIED"
        });
      }

      // Get driver wallet
      const wallet = await storage.getDriverWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "Driver wallet not found" });
      }

      // Check if tester - testers cannot withdraw real money
      if (userRole?.isTester) {
        return res.status(403).json({ 
          message: "Test drivers cannot withdraw real funds",
          code: "TESTER_WITHDRAWAL_BLOCKED"
        });
      }

      // Get currency from country
      const currencyCode = getCurrencyFromCountry(userRole?.countryCode || "NG");

      // Validate currency matches wallet
      if (wallet.currency !== currencyCode) {
        return res.status(400).json({ 
          message: "Currency mismatch between wallet and country",
          code: "CURRENCY_MISMATCH"
        });
      }

      // Check balance
      const withdrawableBalance = parseFloat(wallet.withdrawableBalance);
      if (amount > withdrawableBalance) {
        return res.status(400).json({ 
          message: `Insufficient withdrawable balance. Available: ${currencyCode} ${withdrawableBalance.toFixed(2)}`,
          code: "INSUFFICIENT_BALANCE"
        });
      }

      // Minimum withdrawal amounts by country
      const minWithdrawals: Record<string, number> = {
        NG: 1000, // 1000 NGN
        US: 10,   // $10 USD
        ZA: 100,  // 100 ZAR
      };
      const minAmount = minWithdrawals[userRole?.countryCode || "NG"] || 1000;
      if (amount < minAmount) {
        return res.status(400).json({ 
          message: `Minimum withdrawal is ${currencyCode} ${minAmount}`,
          code: "BELOW_MINIMUM"
        });
      }

      // Check payout method is configured
      if (payoutMethod === "BANK") {
        if (!wallet.bankName || !wallet.accountNumber) {
          return res.status(400).json({ 
            message: "Bank account details not configured",
            code: "PAYOUT_METHOD_NOT_CONFIGURED"
          });
        }
      } else if (payoutMethod === "MOBILE_MONEY") {
        if (!wallet.mobileMoneyProvider || !wallet.mobileMoneyNumber) {
          return res.status(400).json({ 
            message: "Mobile money details not configured",
            code: "PAYOUT_METHOD_NOT_CONFIGURED"
          });
        }
      }

      // Country-specific document requirements
      const countryCode = userRole?.countryCode || "NG";
      const documents = await storage.getIdentityDocuments(userId);
      const verifiedDocs = documents.filter(d => d.verified);

      if (countryCode === "NG") {
        // Nigeria requires NIN and Driver License
        const hasNIN = verifiedDocs.some(d => d.documentType === "NIN");
        const hasDriverLicense = verifiedDocs.some(d => d.documentType === "DRIVER_LICENSE");
        if (!hasNIN || !hasDriverLicense) {
          return res.status(403).json({ 
            message: "Nigerian drivers require verified NIN and Driver License for withdrawals",
            code: "DOCUMENTS_INCOMPLETE",
            required: ["NIN", "DRIVER_LICENSE"],
            verified: verifiedDocs.map(d => d.documentType)
          });
        }
      } else if (countryCode === "US") {
        // US requires Driver License
        const hasDriverLicense = verifiedDocs.some(d => d.documentType === "DRIVER_LICENSE");
        if (!hasDriverLicense) {
          return res.status(403).json({ 
            message: "US drivers require verified Driver License for withdrawals",
            code: "DOCUMENTS_INCOMPLETE",
            required: ["DRIVER_LICENSE"],
            verified: verifiedDocs.map(d => d.documentType)
          });
        }
      } else {
        // Other countries require at least one verified ID
        if (verifiedDocs.length === 0) {
          return res.status(403).json({ 
            message: "At least one verified identity document required for withdrawals",
            code: "DOCUMENTS_INCOMPLETE"
          });
        }
      }

      // Create withdrawal request
      const withdrawal = await storage.createDriverWithdrawal({
        driverId: userId,
        amount: amount.toString(),
        currencyCode,
        payoutMethod,
      });

      // Log the withdrawal request
      await storage.createAuditLog({
        action: "withdrawal_requested",
        entityType: "driver_withdrawal",
        entityId: withdrawal.id,
        performedByUserId: userId,
        performedByRole: "driver",
        metadata: JSON.stringify({ amount, currencyCode, payoutMethod }),
      });

      return res.json({ 
        message: "Withdrawal request submitted for processing",
        withdrawal 
      });
    } catch (error) {
      console.error("Error processing withdrawal request:", error);
      return res.status(500).json({ message: "Failed to process withdrawal request" });
    }
  });

  // Admin: Get all pending withdrawals
  app.get("/api/admin/withdrawals/pending", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const withdrawals = await storage.getPendingDriverWithdrawals();
      return res.json(withdrawals);
    } catch (error) {
      console.error("Error getting pending withdrawals:", error);
      return res.status(500).json({ message: "Failed to get pending withdrawals" });
    }
  });

  // Admin: Process withdrawal
  app.post("/api/admin/withdrawals/:withdrawalId/process", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { withdrawalId } = req.params;
      const { action, transactionRef, blockReason } = req.body;

      if (!action || !["approve", "reject", "block"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Use approve, reject, or block" });
      }

      let status: string;
      if (action === "approve") {
        status = "processing";
        // In test mode, mark as paid immediately (simulated)
        status = "paid";
      } else if (action === "reject") {
        status = "failed";
      } else {
        status = "blocked";
      }

      const withdrawal = await storage.updateDriverWithdrawalStatus(
        withdrawalId,
        status,
        adminId,
        action === "block" ? blockReason : undefined
      );

      if (!withdrawal) {
        return res.status(404).json({ message: "Withdrawal not found" });
      }

      // Log the action
      await storage.createAuditLog({
        action: `withdrawal_${action}ed`,
        entityType: "driver_withdrawal",
        entityId: withdrawalId,
        performedByUserId: adminId,
        performedByRole: req.userRole?.role || "admin",
        metadata: JSON.stringify({ action, transactionRef, blockReason }),
      });

      return res.json({ message: `Withdrawal ${action}ed`, withdrawal });
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      return res.status(500).json({ message: "Failed to process withdrawal" });
    }
  });

  // Admin: Verify driver identity document
  app.post("/api/admin/identity-documents/:documentId/verify", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { documentId } = req.params;
      const { verified, rejectionReason } = req.body;

      if (typeof verified !== "boolean") {
        return res.status(400).json({ message: "verified must be a boolean" });
      }

      const document = await storage.verifyIdentityDocument(
        documentId,
        verified,
        "manual",
        !verified ? rejectionReason : undefined
      );

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Log the verification
      await storage.createAuditLog({
        action: verified ? "document_verified" : "document_rejected",
        entityType: "identity_document",
        entityId: documentId,
        performedByUserId: adminId,
        performedByRole: req.userRole?.role || "admin",
        metadata: JSON.stringify({ verified, rejectionReason, documentType: document.documentType }),
      });

      return res.json({ message: verified ? "Document verified" : "Document rejected", document });
    } catch (error) {
      console.error("Error verifying document:", error);
      return res.status(500).json({ message: "Failed to verify document" });
    }
  });

  // Admin: Verify driver identity profile (address + identity)
  app.post("/api/admin/identity-profiles/:userId/verify", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { userId } = req.params;
      const { addressVerified, identityVerified } = req.body;

      const profile = await storage.verifyIdentityProfile(userId, addressVerified, identityVerified);
      if (!profile) {
        return res.status(404).json({ message: "Identity profile not found" });
      }

      // If both verified, update driver withdrawal verification status
      if (addressVerified && identityVerified) {
        await storage.updateDriverWithdrawalVerificationStatus(userId, "verified");
      }

      // Log the verification
      await storage.createAuditLog({
        action: "identity_profile_verified",
        entityType: "identity_profile",
        entityId: profile.id,
        performedByUserId: adminId,
        performedByRole: req.userRole?.role || "admin",
        metadata: JSON.stringify({ addressVerified, identityVerified }),
      });

      return res.json({ message: "Identity profile updated", profile });
    } catch (error) {
      console.error("Error verifying identity profile:", error);
      return res.status(500).json({ message: "Failed to verify identity profile" });
    }
  });

  // Admin: Update driver withdrawal verification status
  app.patch("/api/admin/drivers/:userId/withdrawal-status", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { userId } = req.params;
      const { status } = req.body;

      if (!status || !["pending_verification", "verified", "suspended"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Use pending_verification, verified, or suspended" });
      }

      const profile = await storage.updateDriverWithdrawalVerificationStatus(userId, status);
      if (!profile) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      // Log the status change
      await storage.createAuditLog({
        action: "driver_withdrawal_status_changed",
        entityType: "driver_profile",
        entityId: profile.id,
        performedByUserId: adminId,
        performedByRole: req.userRole?.role || "admin",
        metadata: JSON.stringify({ newStatus: status }),
      });

      return res.json({ message: "Driver withdrawal status updated", profile });
    } catch (error) {
      console.error("Error updating driver withdrawal status:", error);
      return res.status(500).json({ message: "Failed to update driver withdrawal status" });
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
          message: `Your payout of ₦${(parseFloat(String(payout.amount)) / 100).toFixed(2)} has been processed successfully.`,
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
          message: `Your payout of ₦${(parseFloat(String(payout.amount)) / 100).toFixed(2)} has been reversed. Reason: ${reason}`,
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
  // Phase 5 - Rider Promos Routes
  // ========================================

  app.get("/api/promos/mine", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const promos = await storage.getActiveRiderPromos(userId);
      return res.json(promos);
    } catch (error) {
      console.error("Error fetching rider promos:", error);
      return res.status(500).json({ message: "Failed to fetch promos" });
    }
  });

  app.get("/api/promos/history", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const promos = await storage.getRiderPromosByRider(userId);
      return res.json(promos);
    } catch (error) {
      console.error("Error fetching promo history:", error);
      return res.status(500).json({ message: "Failed to fetch promo history" });
    }
  });

  app.post("/api/promos/apply", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promoCode, tripId } = req.body;
      if (!promoCode || !tripId) {
        return res.status(400).json({ message: "Promo code and trip ID are required" });
      }
      const result = await applyPromoToTrip(userId, promoCode, tripId);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      return res.json(result);
    } catch (error) {
      console.error("Error applying promo:", error);
      return res.status(500).json({ message: "Failed to apply promo" });
    }
  });

  app.post("/api/promos/assign-first-ride", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currency } = req.body;
      const result = await assignFirstRidePromo(userId, currency || "USD");
      return res.json(result);
    } catch (error) {
      console.error("Error assigning first ride promo:", error);
      return res.status(500).json({ message: "Failed to assign promo" });
    }
  });

  app.get("/api/promos/all", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const promos = await storage.getAllRiderPromos();
      return res.json(promos);
    } catch (error) {
      console.error("Error fetching all promos:", error);
      return res.status(500).json({ message: "Failed to fetch promos" });
    }
  });

  app.post("/api/promos/void/:promoId", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { promoId } = req.params;
      const result = await storage.voidRiderPromo(promoId);
      if (!result) {
        return res.status(404).json({ message: "Promo not found" });
      }
      await storage.createAuditLog({
        action: "promo_voided",
        entityType: "rider_promo",
        entityId: promoId,
        performedByUserId: req.user.claims.sub,
        performedByRole: "admin",
        metadata: JSON.stringify({ promoId })
      });
      return res.json({ success: true });
    } catch (error) {
      console.error("Error voiding promo:", error);
      return res.status(500).json({ message: "Failed to void promo" });
    }
  });

  // ========================================
  // Phase 5 - Behavior Stats Routes
  // ========================================

  app.get("/api/behavior/mine", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getBehaviorStats(userId);
      return res.json(stats || null);
    } catch (error) {
      console.error("Error fetching behavior stats:", error);
      return res.status(500).json({ message: "Failed to fetch behavior stats" });
    }
  });

  app.get("/api/behavior/user/:userId", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const stats = await storage.getBehaviorStats(userId);
      return res.json(stats || null);
    } catch (error) {
      console.error("Error fetching user behavior stats:", error);
      return res.status(500).json({ message: "Failed to fetch behavior stats" });
    }
  });

  app.get("/api/behavior/all", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const stats = await storage.getAllBehaviorStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error fetching all behavior stats:", error);
      return res.status(500).json({ message: "Failed to fetch behavior stats" });
    }
  });

  app.post("/api/behavior/evaluate", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { userId, role } = req.body;
      if (!userId || !role) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      const result = await evaluateBehaviorAndWarnings(userId, role);
      return res.json(result);
    } catch (error) {
      console.error("Error evaluating behavior:", error);
      return res.status(500).json({ message: "Failed to evaluate behavior" });
    }
  });

  // ========================================
  // Phase 5 - Driver Matching & Incentive Progress
  // ========================================

  app.get("/api/incentives/progress", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await getDriverIncentiveProgress(userId);
      return res.json(progress);
    } catch (error) {
      console.error("Error fetching incentive progress:", error);
      return res.status(500).json({ message: "Failed to fetch incentive progress" });
    }
  });

  app.get("/api/matching/score/:driverId", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { driverId } = req.params;
      const lat = req.query.lat ? parseFloat(req.query.lat) : undefined;
      const lng = req.query.lng ? parseFloat(req.query.lng) : undefined;
      const riderLocation = lat && lng ? { lat, lng } : undefined;
      const score = await calculateDriverMatchingScore(driverId, riderLocation);
      return res.json(score);
    } catch (error) {
      console.error("Error calculating matching score:", error);
      return res.status(500).json({ message: "Failed to calculate matching score" });
    }
  });

  app.post("/api/incentives/pause-all", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activePrograms = await storage.getActiveIncentivePrograms();
      let paused = 0;
      for (const program of activePrograms) {
        await storage.pauseIncentiveProgram(program.id);
        paused++;
      }
      await storage.createAuditLog({
        action: "incentives_paused_all",
        entityType: "incentive_program",
        entityId: "system",
        performedByUserId: userId,
        performedByRole: "admin",
        metadata: JSON.stringify({ pausedCount: paused })
      });
      return res.json({ success: true, paused });
    } catch (error) {
      console.error("Error pausing all incentives:", error);
      return res.status(500).json({ message: "Failed to pause incentives" });
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
      
      const { subject, description, tripId, priority, supportContext } = req.body;
      
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
      
      const contextMetadata: Record<string, any> = { subject: ticket.subject, tripId };
      if (supportContext && typeof supportContext === "object") {
        const safeContext: Record<string, string> = {};
        const allowedKeys = ["appType", "userId", "role", "country", "appVersion", "deviceType", "os", "language", "networkStatus", "timestamp", "currentScreen"];
        for (const key of allowedKeys) {
          if (supportContext[key] && typeof supportContext[key] === "string") {
            safeContext[key] = supportContext[key].substring(0, 255);
          }
        }
        contextMetadata.supportContext = safeContext;
      }

      await storage.createAuditLog({
        action: "support_ticket_created",
        entityType: "support_ticket",
        entityId: ticket.id,
        performedByUserId: userId,
        performedByRole: createdByRole,
        metadata: JSON.stringify(contextMetadata)
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
      
      let supportContext = null;
      let walletContext = null;
      if (isSupportAgent || isAdmin) {
        try {
          const auditLogs = await storage.getAuditLogsByEntity("support_ticket", ticketId);
          const creationLog = auditLogs?.find((log: any) => log.action === "support_ticket_created");
          if (creationLog?.metadata) {
            const meta = typeof creationLog.metadata === "string" ? JSON.parse(creationLog.metadata) : creationLog.metadata;
            supportContext = meta.supportContext || null;
          }
        } catch (e) {
          // Context retrieval is optional, don't fail the request
        }
        try {
          const ticketUserId = ticket.createdByUserId;
          const wallet = await storage.getWalletByUserId(ticketUserId);
          if (wallet) {
            const autoTopUp = await storage.getAutoTopUpSettings(ticketUserId);
            walletContext = {
              balance: wallet.balance,
              currency: wallet.currency,
              isFrozen: (wallet as any).isFrozen || false,
              autoTopUp: autoTopUp ? {
                enabled: autoTopUp.autoTopUpEnabled,
                threshold: autoTopUp.autoTopUpThreshold,
                amount: autoTopUp.autoTopUpAmount,
                failureCount: autoTopUp.autoTopUpFailureCount,
              } : null,
            };
          }
        } catch (e) {
          // Wallet context retrieval is optional
        }
      }
      
      return res.json({ ticket, messages, supportContext, walletContext });
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
        currency: currency || "NGN",
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

  // =============================================
  // PHASE 11A: GROWTH, MARKETING & VIRALITY
  // =============================================

  // Apply a referral code (rider joining via referral)
  app.post("/api/referrals/apply", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ message: "Referral code is required" });
      }

      const referralCode = await storage.getReferralCodeByCode(code);
      if (!referralCode) {
        return res.status(404).json({ message: "Referral code not found" });
      }

      if (!referralCode.isActive) {
        return res.status(400).json({ message: "Referral code is no longer active" });
      }

      if (referralCode.ownerUserId === userId) {
        return res.status(400).json({ message: "You cannot use your own referral code" });
      }

      const existingReward = await storage.getRiderReferralRewardByReferred(userId);
      if (existingReward) {
        return res.status(400).json({ message: "You have already used a referral code" });
      }

      await storage.createReferralEvent({
        referralCodeId: referralCode.id,
        referredUserId: userId,
        eventType: "signup",
      });

      await storage.updateReferralCodeUsage(referralCode.id);

      const reward = await storage.createRiderReferralReward({
        referrerUserId: referralCode.ownerUserId,
        referredRiderUserId: userId,
        referralCodeId: referralCode.id,
        rewardAmount: "500.00",
        currency: "NGN",
      });

      await storage.createMarketingAttribution({
        userId,
        source: "REFERRAL",
        referralCodeId: referralCode.id,
      });

      return res.json(reward);
    } catch (error) {
      console.error("Error applying referral code:", error);
      return res.status(500).json({ message: "Failed to apply referral code" });
    }
  });

  // Get my rider referral rewards (for referrer)
  app.get("/api/referrals/rider-rewards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rewards = await storage.getRiderReferralRewardsByReferrer(userId);
      return res.json(rewards);
    } catch (error) {
      console.error("Error getting rider referral rewards:", error);
      return res.status(500).json({ message: "Failed to get rider referral rewards" });
    }
  });

  // Get pending shareable moments for current user
  app.get("/api/shareable-moments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const moments = await storage.getPendingShareableMoments(userId);
      return res.json(moments);
    } catch (error) {
      console.error("Error getting shareable moments:", error);
      return res.status(500).json({ message: "Failed to get shareable moments" });
    }
  });

  // Mark a moment as shared
  app.post("/api/shareable-moments/:id/share", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const result = await storage.markMomentShared(id);
      if (!result) {
        return res.status(404).json({ message: "Moment not found" });
      }
      return res.json(result);
    } catch (error) {
      console.error("Error marking moment as shared:", error);
      return res.status(500).json({ message: "Failed to mark moment as shared" });
    }
  });

  // Dismiss a moment
  app.post("/api/shareable-moments/:id/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const result = await storage.dismissMoment(id);
      if (!result) {
        return res.status(404).json({ message: "Moment not found" });
      }
      return res.json(result);
    } catch (error) {
      console.error("Error dismissing moment:", error);
      return res.status(500).json({ message: "Failed to dismiss moment" });
    }
  });

  // Add campaign details (Admin only)
  app.post("/api/campaigns/:campaignId/details", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { campaignId } = req.params;
      const { targetAudience, countryCode, subregion, incentiveType, incentiveValue, incentiveRules, maxRedemptions } = req.body;

      const campaign = await storage.getMarketingCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const detail = await storage.createCampaignDetail({
        campaignId,
        targetAudience,
        countryCode,
        subregion,
        incentiveType,
        incentiveValue,
        incentiveRules,
        maxRedemptions,
      });

      await storage.createAuditLog({
        userId,
        action: "campaign_detail_created",
        entityType: "campaign_detail",
        entityId: detail.id,
        metadata: JSON.stringify({ campaignId }),
      });

      return res.json(detail);
    } catch (error) {
      console.error("Error creating campaign detail:", error);
      return res.status(500).json({ message: "Failed to create campaign detail" });
    }
  });

  // Get all campaigns with details (Admin only)
  app.get("/api/campaigns/with-details", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const campaigns = await storage.getCampaignsWithDetails();
      return res.json(campaigns);
    } catch (error) {
      console.error("Error getting campaigns with details:", error);
      return res.status(500).json({ message: "Failed to get campaigns with details" });
    }
  });

  // Create reactivation rule (Admin only)
  app.post("/api/reactivation-rules", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, targetRole, inactiveDaysThreshold, messageTitle, messageBody, incentiveType, incentiveValue, countryCode } = req.body;

      if (!name || !targetRole || !messageTitle || !messageBody) {
        return res.status(400).json({ message: "Name, targetRole, messageTitle, and messageBody are required" });
      }

      const rule = await storage.createReactivationRule({
        name,
        targetRole,
        inactiveDaysThreshold: inactiveDaysThreshold || 14,
        messageTitle,
        messageBody,
        incentiveType,
        incentiveValue,
        countryCode,
        createdBy: userId,
      });

      await storage.createAuditLog({
        userId,
        action: "reactivation_rule_created",
        entityType: "reactivation_rule",
        entityId: rule.id,
        metadata: JSON.stringify({ name, targetRole }),
      });

      return res.json(rule);
    } catch (error) {
      console.error("Error creating reactivation rule:", error);
      return res.status(500).json({ message: "Failed to create reactivation rule" });
    }
  });

  // Get all reactivation rules (Admin only)
  app.get("/api/reactivation-rules", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const rules = await storage.getReactivationRules();
      return res.json(rules);
    } catch (error) {
      console.error("Error getting reactivation rules:", error);
      return res.status(500).json({ message: "Failed to get reactivation rules" });
    }
  });

  // Update reactivation rule status (Admin only)
  app.patch("/api/reactivation-rules/:ruleId/status", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ruleId } = req.params;
      const { status } = req.body;

      if (!status || !["ACTIVE", "PAUSED", "ENDED"].includes(status)) {
        return res.status(400).json({ message: "Status must be ACTIVE, PAUSED, or ENDED" });
      }

      const rule = await storage.updateReactivationRuleStatus(ruleId, status);
      if (!rule) {
        return res.status(404).json({ message: "Reactivation rule not found" });
      }

      await storage.createAuditLog({
        userId,
        action: "reactivation_rule_status_updated",
        entityType: "reactivation_rule",
        entityId: ruleId,
        metadata: JSON.stringify({ status }),
      });

      return res.json(rule);
    } catch (error) {
      console.error("Error updating reactivation rule status:", error);
      return res.status(500).json({ message: "Failed to update reactivation rule status" });
    }
  });

  // Get attribution stats (Admin only)
  app.get("/api/attribution/stats", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const stats = await storage.getAttributionStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error getting attribution stats:", error);
      return res.status(500).json({ message: "Failed to get attribution stats" });
    }
  });

  // Get my attribution source
  app.get("/api/attribution/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attribution = await storage.getMarketingAttribution(userId);
      return res.json(attribution);
    } catch (error) {
      console.error("Error getting attribution:", error);
      return res.status(500).json({ message: "Failed to get attribution" });
    }
  });

  // Get growth safety status (Admin only)
  app.get("/api/growth-safety", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const status = await storage.getGrowthSafetyStatus();
      return res.json(status);
    } catch (error) {
      console.error("Error getting growth safety status:", error);
      return res.status(500).json({ message: "Failed to get growth safety status" });
    }
  });

  // Update growth safety controls (Admin only)
  app.post("/api/growth-safety", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { controlType, enabled, countryCode, maxReferralRewardPerUser, maxDailyReferrals, viralityEnabled, shareMomentsEnabled, reactivationEnabled } = req.body;

      if (!controlType) {
        return res.status(400).json({ message: "controlType is required" });
      }

      const control = await storage.upsertGrowthSafetyControl({
        controlType,
        enabled: enabled ?? true,
        countryCode: countryCode || null,
        maxReferralRewardPerUser,
        maxDailyReferrals,
        viralityEnabled: viralityEnabled ?? true,
        shareMomentsEnabled: shareMomentsEnabled ?? true,
        reactivationEnabled: reactivationEnabled ?? true,
        updatedBy: userId,
      });

      await storage.createAuditLog({
        userId,
        action: "growth_safety_control_updated",
        entityType: "growth_safety_control",
        entityId: control.id,
        metadata: JSON.stringify({ controlType, countryCode }),
      });

      return res.json(control);
    } catch (error) {
      console.error("Error updating growth safety control:", error);
      return res.status(500).json({ message: "Failed to update growth safety control" });
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

      const { pickupLat, pickupLng, pickupAddress, dropoffLat, dropoffLng, dropoffAddress, passengerCount, paymentMethodId } = req.body;

      // Validate required fields
      if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
        return res.status(400).json({ message: "Pickup and dropoff coordinates are required" });
      }

      // CURRENCY LOCK: Get currency from rider's country (MANDATORY)
      const { getCurrencyFromCountry } = await import("@shared/currency");
      const userRole = await storage.getUserRole(userId);
      const riderCountryCode = userRole?.countryCode || "NG";
      const currencyCode = getCurrencyFromCountry(riderCountryCode);

      // Get or create rider wallet with user's country currency
      let riderWallet = await storage.getRiderWallet(userId);
      if (!riderWallet) {
        riderWallet = await storage.createRiderWallet({ userId, currency: currencyCode });
      }

      // Validate rider's wallet currency matches country currency
      if (riderWallet.currency !== currencyCode) {
        return res.status(400).json({ 
          message: `Currency mismatch: Your wallet (${riderWallet.currency}) does not match your country currency (${currencyCode})`,
          error: "CURRENCY_MISMATCH"
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

      // SERVER-SIDE PAYMENT SOURCE RESOLUTION
      const isTester = await storage.isUserTester(userId);
      
      // Resolve payment source based on tester status and requested payment method
      let resolvedPaymentSource: "TEST_WALLET" | "MAIN_WALLET" | "CARD" | "BANK";
      let paymentMethod = null;
      
      if (isTester) {
        // RULE: Testers MUST use TEST_WALLET only - no exceptions
        resolvedPaymentSource = "TEST_WALLET";
        console.log(`[PAYMENT SOURCE] Tester user ${userId} - forcing TEST_WALLET`);
      } else if (paymentMethodId) {
        // Non-tester with saved payment method - validate and use CARD
        paymentMethod = await storage.getRiderPaymentMethod(paymentMethodId);
        
        if (!paymentMethod || paymentMethod.userId !== userId) {
          return res.status(400).json({ 
            message: "Invalid payment method",
            code: "INVALID_PAYMENT_METHOD"
          });
        }
        
        if (!paymentMethod.isActive) {
          return res.status(400).json({ 
            message: "This payment method is no longer active",
            code: "PAYMENT_METHOD_INACTIVE"
          });
        }
        
        // RULE: Payment method currency MUST match ride currency
        if (paymentMethod.currency !== currencyCode) {
          return res.status(400).json({ 
            message: `Payment method currency (${paymentMethod.currency}) does not match ride currency (${currencyCode})`,
            code: "PAYMENT_CURRENCY_MISMATCH"
          });
        }
        
        if (paymentMethod.type === "CARD") {
          resolvedPaymentSource = "CARD";
        } else if (paymentMethod.type === "BANK_TRANSFER") {
          // RULE: BANK_TRANSFER is future-only, not active
          return res.status(400).json({ 
            message: "Bank transfer payments are not yet available",
            code: "BANK_TRANSFER_NOT_AVAILABLE"
          });
        } else {
          resolvedPaymentSource = "MAIN_WALLET";
        }
      } else {
        // Non-tester without payment method - use MAIN_WALLET
        resolvedPaymentSource = "MAIN_WALLET";
      }

      // AUTHORIZATION LOGIC based on payment source
      let availableBalance: number;
      let walletType: string;
      const minimumRequiredBalance = 5.00; // Minimum ₦5.00

      if (resolvedPaymentSource === "TEST_WALLET") {
        availableBalance = parseFloat(String(riderWallet.testerWalletBalance || "0"));
        walletType = "TEST";
        console.log(`[WALLET AUTH] Tester ${userId} - TEST_WALLET balance: ${availableBalance}`);
        
        if (availableBalance < minimumRequiredBalance) {
          return res.status(400).json({ 
            message: "Insufficient test wallet balance. Please contact support for test credit.",
            code: "INSUFFICIENT_BALANCE",
            paymentSource: resolvedPaymentSource,
            required: minimumRequiredBalance,
            available: availableBalance
          });
        }
      } else if (resolvedPaymentSource === "MAIN_WALLET") {
        availableBalance = parseFloat(String(riderWallet.balance || "0")) - parseFloat(String(riderWallet.lockedBalance || "0"));
        walletType = "MAIN";
        console.log(`[WALLET AUTH] User ${userId} - MAIN_WALLET balance: ${availableBalance}`);
        
        if (availableBalance < minimumRequiredBalance) {
          return res.status(400).json({ 
            message: "Insufficient wallet balance. Please add funds to continue.",
            code: "INSUFFICIENT_BALANCE",
            paymentSource: resolvedPaymentSource,
            required: minimumRequiredBalance,
            available: availableBalance
          });
        }
      } else if (resolvedPaymentSource === "CARD") {
        // CARD: Check country has real payments enabled
        const country = await storage.getCountryByCode(riderCountryCode);
        if (!country?.paymentsEnabled) {
          return res.status(400).json({ 
            message: "Card payments are not available in your region yet",
            code: "CARD_PAYMENTS_NOT_ENABLED"
          });
        }
        
        // Card authorization happens at ride start, not request
        // For now, we validate the card is reusable
        if (!paymentMethod?.providerReusable) {
          return res.status(400).json({ 
            message: "This card cannot be used for payments",
            code: "CARD_NOT_REUSABLE"
          });
        }
        
        walletType = "CARD";
        console.log(`[CARD AUTH] User ${userId} - CARD payment method validated`);
      }

      // Update wallet's payment source to match resolved source
      if (riderWallet.paymentSource !== resolvedPaymentSource) {
        await storage.updateRiderWalletPaymentSource(userId, resolvedPaymentSource);
      }

      // Create the ride with payment source snapshot
      const ride = await storage.createRide({
        riderId: userId,
        pickupLat: pickupLat.toString(),
        pickupLng: pickupLng.toString(),
        pickupAddress: pickupAddress || null,
        dropoffLat: dropoffLat.toString(),
        dropoffLng: dropoffLng.toString(),
        dropoffAddress: dropoffAddress || null,
        passengerCount: passengerCount || 1,
        currencyCode,
        paymentSource: resolvedPaymentSource,
        paymentMethodId: paymentMethod?.id || null,
      });

      console.log(`[RIDE CREATED] rideId=${ride.id}, userId=${userId}, paymentSource=${resolvedPaymentSource}, currency=${currencyCode}, isTester=${isTester}`);

      // Log the action
      await storage.createRideAuditLog({
        rideId: ride.id,
        action: "ride_requested",
        actorId: userId,
        actorRole: "rider",
        previousStatus: null,
        newStatus: "matching",
        metadata: JSON.stringify({ pickupAddress, dropoffAddress, paymentSource: resolvedPaymentSource }),
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

      // MANDATORY SETUP CHECK - Block ride acceptance if setup incomplete
      const driverProfile = await storage.getDriverProfile(userId);
      if (driverProfile) {
        const missingFields: string[] = [];
        if (driverProfile.locationPermissionStatus !== "granted") missingFields.push("locationPermission");
        if (!driverProfile.navigationProvider) missingFields.push("navigationProvider");
        if (!driverProfile.navigationVerified) missingFields.push("navigationVerified");
        
        if (missingFields.length > 0) {
          return res.status(403).json({ 
            message: "Driver setup incomplete",
            error: "DRIVER_SETUP_INCOMPLETE",
            missingFields,
            setupCompleted: false
          });
        }
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
      const currencyCode = ride.currencyCode || "NGN";
      const fareBreakdown = calculateCompleteFare({
        distanceKm: actualDistanceKm,
        durationMin: tripDurationMin,
        estimatedDurationMin: parseFloat(ride.estimatedDurationMin || "0"),
        waitingStartedAt: ride.waitingStartedAt ? new Date(ride.waitingStartedAt) : null,
        tripEndedAt: completedAt,
        currencyCode
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
          tripEndedAt: completedAt,
          currencyCode
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

      // PAYMENT CAPTURE & SETTLEMENT based on paymentSource
      const paymentSource = ride.paymentSource || "MAIN_WALLET";
      const riderRole = await storage.getUserRole(ride.riderId);
      const isTestRide = Boolean(riderRole?.isTester);
      
      let captureSucceeded = true;
      let captureError: string | null = null;
      
      try {
        if (paymentSource === "TEST_WALLET") {
          // Debit tester wallet
          const riderWallet = await storage.getRiderWallet(ride.riderId);
          if (riderWallet) {
            const currentBalance = parseFloat(String(riderWallet.testerWalletBalance || "0"));
            if (currentBalance >= fareBreakdown.totalFare) {
              await storage.adjustRiderTesterWalletBalance(
                ride.riderId, 
                -fareBreakdown.totalFare, 
                `RIDE_FARE: ${rideId}`, 
                "system"
              );
              console.log(`[PAYMENT CAPTURE] TEST_WALLET debited ${fareBreakdown.totalFare} ${currencyCode} for ride ${rideId}`);
            } else {
              captureSucceeded = false;
              captureError = "Insufficient test wallet balance";
            }
          }
        } else if (paymentSource === "MAIN_WALLET") {
          // Debit main wallet
          const riderWallet = await storage.getRiderWallet(ride.riderId);
          if (riderWallet) {
            const availableBalance = parseFloat(String(riderWallet.balance || "0")) - parseFloat(String(riderWallet.lockedBalance || "0"));
            if (availableBalance >= fareBreakdown.totalFare) {
              await storage.adjustRiderWalletBalance(
                ride.riderId, 
                -fareBreakdown.totalFare, 
                `RIDE_FARE: ${rideId}`, 
                "system"
              );
              console.log(`[PAYMENT CAPTURE] MAIN_WALLET debited ${fareBreakdown.totalFare} ${currencyCode} for ride ${rideId}`);
            } else {
              captureSucceeded = false;
              captureError = "Insufficient main wallet balance";
            }
          }
        } else if (paymentSource === "CARD") {
          // Capture card authorization
          // In test mode or if no authorization exists, skip real capture
          if (!ride.authorizationReference) {
            console.log(`[PAYMENT CAPTURE] CARD - No authorization reference, treating as test mode for ride ${rideId}`);
          } else {
            // Real card capture would happen here via payment provider
            // For now, log and mark as captured
            console.log(`[PAYMENT CAPTURE] CARD authorization ${ride.authorizationReference} would be captured for ${fareBreakdown.totalFare} ${currencyCode}`);
            
            // Update ride with capture info
            await storage.updateRideStatus(rideId, "completed", {
              captureAmount: fareBreakdown.totalFare.toString(),
              capturedAt: new Date(),
            });
          }
        }
      } catch (paymentError) {
        console.error(`[PAYMENT CAPTURE FAILED] ride ${rideId}:`, paymentError);
        captureSucceeded = false;
        captureError = paymentError instanceof Error ? paymentError.message : "Payment capture failed";
      }

      // Check auto top-up trigger after wallet debit
      if (captureSucceeded && (paymentSource === "MAIN_WALLET" || paymentSource === "TEST_WALLET")) {
        const shouldTopUp = await storage.shouldTriggerAutoTopUp(ride.riderId);
        if (shouldTopUp) {
          storage.triggerAutoTopUp(ride.riderId).catch(err => console.error("[AUTO_TOPUP] Error:", err));
        }
      }

      // If capture failed, move ride to PAYMENT_REVIEW instead of completed
      if (!captureSucceeded) {
        console.log(`[PAYMENT REVIEW] Ride ${rideId} moved to payment_review: ${captureError}`);
        
        await storage.updateRideStatus(rideId, "payment_review" as any, {
          actualDurationMin: tripDurationMin.toString(),
          actualDistanceKm: actualDistanceKm.toString(),
          baseFare: fareBreakdown.baseFare.toString(),
          distanceFare: fareBreakdown.distanceFare.toString(),
          timeFare: fareBreakdown.timeFare.toString(),
          waitingFee: fareBreakdown.waitingFee.toString(),
          trafficFee: fareBreakdown.trafficFee.toString(),
          totalFare: fareBreakdown.totalFare.toString(),
        });

        // Log payment failure
        await storage.createRideAuditLog({
          rideId,
          action: "payment_failed" as any,
          actorId: "system",
          actorRole: "system",
          previousStatus: ride.status,
          newStatus: "payment_review" as any,
          metadata: JSON.stringify({ 
            captureError,
            paymentSource,
            attemptedAmount: fareBreakdown.totalFare
          }),
        });

        // Driver earnings are protected - still credit driver
        // This ensures driver is paid even if rider payment fails
      }

      // REVENUE SPLIT: 80% driver, 20% platform (MANDATORY)
      // Process even for payment_review rides to protect driver earnings
      const revenueSplit = await storage.processRevenueSplit({
        rideId,
        riderId: ride.riderId,
        driverId: userId,
        totalFare: fareBreakdown.totalFare.toString(),
        currencyCode,
        isTestRide,
      });

      // Notify rider with receipt info (using correct currency)
      const { formatCurrency } = await import("@shared/currency");
      await storage.createNotification({
        userId: ride.riderId,
        role: "rider",
        title: "Trip Complete",
        type: "ride_update",
        message: `Your trip is complete! Total fare: ${formatCurrency(fareBreakdown.totalFare, currencyCode)}. Please rate your driver.`,
      });

      return res.json({
        ...updatedRide,
        fareBreakdown,
        receipt,
        earlyStopData,
        revenueSplit: {
          driverEarning: revenueSplit.driverShare,
          platformFee: revenueSplit.zibaShare,
          currencyCode: revenueSplit.currencyCode,
        }
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
        driverAcceptedAt: ride.acceptedAt ? new Date(ride.acceptedAt) : null,
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

      let feeAmount = 0;
      let feeApplied = false;
      let walletDebitSuccess = false;
      let insufficientBalance = false;

      if (validation.requiresFee && isRider) {
        feeAmount = validation.estimatedFee || (ride.status === "arrived" ? 750 : 500);
        feeApplied = true;

        try {
          const riderWallet = await storage.getRiderWallet(userId);
          const currentBalance = riderWallet ? parseFloat(riderWallet.balance?.toString() || "0") : 0;

          if (currentBalance < feeAmount) {
            insufficientBalance = true;
          }

          await storage.updateRiderWalletBalance(userId, feeAmount, "debit");
          walletDebitSuccess = true;

          if (insufficientBalance) {
            await storage.createFinancialAuditLog({
              rideId,
              userId,
              actorRole: "SYSTEM",
              eventType: "CANCELLATION_FEE",
              amount: feeAmount.toFixed(2),
              currency: "NGN",
              description: `Cancellation fee applied with insufficient balance. Previous balance: ₦${currentBalance.toFixed(2)}`,
              metadata: JSON.stringify({ feeAmount, previousBalance: currentBalance, insufficientBalance: true }),
            });
          }
        } catch (walletError) {
          console.error("Error debiting rider wallet for cancellation fee:", walletError);
        }

        await storage.createNotification({
          userId,
          role: "rider",
          title: "Cancellation Fee Applied",
          type: "ride_cancelled",
          message: `A cancellation fee of ₦${feeAmount.toFixed(2)} has been deducted from your wallet.`,
        });

        // Check auto top-up trigger after cancellation fee debit
        if (walletDebitSuccess) {
          const shouldTopUp = await storage.shouldTriggerAutoTopUp(userId);
          if (shouldTopUp) {
            storage.triggerAutoTopUp(userId).catch(err => console.error("[AUTO_TOPUP] Error:", err));
          }
        }
      }

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
          cancellation_timestamp: new Date().toISOString(),
          driver_accept_timestamp: ride.acceptedAt || null,
          driver_en_route_timestamp: ride.enRouteAt || null,
          cancellation_reason: reason || null,
          fee_applied: feeApplied,
          fee_amount: feeAmount,
          grace_period_active: validation.withinGracePeriod || false,
          wallet_debit_success: walletDebitSuccess,
          insufficient_balance: insufficientBalance,
        }),
      });

      if (isRider && ride.driverId) {
        const compensationMsg = compensationEligible 
          ? ` You will receive a compensation of ₦${((compensationData?.driverCompensation || 0) / 100).toFixed(2)}.`
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
        feeApplied,
        feeAmount: feeApplied ? feeAmount : undefined,
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

      // MANDATORY SETUP CHECK - Block ride acceptance if setup incomplete
      const driverProfile = await storage.getDriverProfile(userId);
      if (driverProfile) {
        // Check if driver is suspended
        if (driverProfile.withdrawalVerificationStatus === "suspended") {
          return res.status(403).json({ 
            message: "Your account is suspended. Contact support for assistance.",
            code: "DRIVER_SUSPENDED"
          });
        }

        const missingFields: string[] = [];
        if (driverProfile.locationPermissionStatus !== "granted") missingFields.push("locationPermission");
        if (!driverProfile.navigationProvider) missingFields.push("navigationProvider");
        if (!driverProfile.navigationVerified) missingFields.push("navigationVerified");
        
        if (missingFields.length > 0) {
          return res.status(403).json({ 
            message: "Driver setup incomplete",
            error: "DRIVER_SETUP_INCOMPLETE",
            missingFields,
            setupCompleted: false
          });
        }
      }

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

      const bonusAmountNum = Math.min(minutesEarly * 0.50, 10.00);
      const bonusAmount = bonusAmountNum.toFixed(2);
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
          `You earned ₦${(bonusAmountNum / 100).toFixed(2)} for arriving ${Math.round(minutesEarly)} minutes early`,
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
        const currency = await getUserCurrency(targetUserId);
        wallet = await storage.createRiderWallet({ userId: targetUserId, currency });
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
        const currency = await getUserCurrency(targetUserId);
        wallet = await storage.createDriverWallet({ userId: targetUserId, currency });
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

  // ==========================================
  // WALLET TOP-UP (SUPER_ADMIN ONLY)
  // ==========================================
  // POST /api/admin/wallet/topup - Top up any user's wallet
  app.post("/api/admin/wallet/topup", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const adminEmail = req.user.claims.email;
      const { userId, amount, walletType, note } = req.body;
      
      if (!userId || !amount || !walletType) {
        return res.status(400).json({ message: "userId, amount, and walletType (TEST or MAIN) are required" });
      }
      
      if (!["TEST", "MAIN"].includes(walletType)) {
        return res.status(400).json({ message: "walletType must be TEST or MAIN" });
      }
      
      const topupAmount = parseFloat(amount);
      if (isNaN(topupAmount) || topupAmount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }
      
      // Get user's country and currency
      const userRole = await storage.getUserRole(userId);
      const countryCode = userRole?.countryCode || "NG";
      const currencyMap: Record<string, string> = { NG: "NGN", US: "USD", ZA: "ZAR" };
      const currency = currencyMap[countryCode] || "NGN";
      
      // Find which wallet type the user has (rider or driver)
      let riderWallet = await storage.getRiderWallet(userId);
      let driverWallet = await storage.getDriverWallet(userId);
      
      let walletUpdated = false;
      let walletData: any = null;
      
      if (walletType === "TEST") {
        // Credit tester wallet balance
        if (riderWallet) {
          walletData = await storage.adjustRiderTesterWalletBalance(userId, topupAmount, "ADMIN_TOPUP", adminId);
          walletUpdated = true;
        } else if (driverWallet) {
          walletData = await storage.adjustDriverTesterWalletBalance(userId, topupAmount, "ADMIN_TOPUP", adminId);
          walletUpdated = true;
        }
      } else {
        // Credit main wallet balance
        if (riderWallet) {
          walletData = await storage.adjustRiderWalletBalance(userId, topupAmount, "ADMIN_TOPUP", adminId);
          walletUpdated = true;
        } else if (driverWallet) {
          walletData = await storage.adjustDriverWalletBalance(userId, topupAmount, "ADMIN_TOPUP", adminId);
          walletUpdated = true;
        }
      }
      
      if (!walletUpdated) {
        return res.status(404).json({ message: "No wallet found for this user. Create a wallet first." });
      }
      
      // Log to wallet_topup_logs
      await storage.createWalletTopupLog({
        userId,
        adminId,
        walletType,
        amount: String(topupAmount),
        currency,
        note: note || null,
      });
      
      // Log for audit trail
      console.log(`[WALLET_TOPUP AUDIT] adminId=${adminId}, adminEmail=${adminEmail}, userId=${userId}, walletType=${walletType}, amount=${topupAmount}, currency=${currency}, note=${note || "none"}, timestamp=${new Date().toISOString()}`);
      
      // Also log to financial audit
      await storage.createFinancialAuditLog({
        eventType: "ADJUSTMENT",
        userId,
        amount: String(topupAmount),
        actorRole: "ADMIN",
        currency,
        description: `ADMIN_TOPUP (${walletType}) by SUPER_ADMIN (${adminEmail})${note ? `: ${note}` : ""}`,
        metadata: JSON.stringify({ adminId, adminEmail, walletType, note }),
      });
      
      return res.json({ 
        message: `Successfully topped up ${walletType} wallet with ${currency} ${topupAmount}`,
        wallet: walletData,
        topupAmount,
        walletType,
        currency,
      });
    } catch (error) {
      console.error("Error topping up wallet:", error);
      return res.status(500).json({ message: "Failed to top up wallet" });
    }
  });

  // GET /api/admin/wallet/topup-logs - Get all top-up logs
  app.get("/api/admin/wallet/topup-logs", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const logs = await storage.getWalletTopupLogs();
      return res.json(logs);
    } catch (error) {
      console.error("Error fetching top-up logs:", error);
      return res.status(500).json({ message: "Failed to fetch top-up logs" });
    }
  });

  // ==========================================
  // TESTER MANAGEMENT - SUPER ADMIN ONLY
  // ==========================================

  // Create Rider Tester
  app.post("/api/admin/testers/rider", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const adminEmail = req.user.claims.email;
      const { userId, email } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      // Update user role to rider with tester flag
      await storage.setUserAsTester(userId, "RIDER", adminId);
      
      // Create wallet with ₦45,000 credit (4500000 kobo)
      let wallet = await storage.getRiderWallet(userId);
      if (!wallet) {
        const currency = await getUserCurrency(userId);
        wallet = await storage.createRiderWallet({ userId, currency });
      }
      
      // Credit test credits to TESTER WALLET (separate from main wallet)
      const creditAmount = 4500000;
      await storage.adjustRiderTesterWalletBalance(userId, creditAmount, "INITIAL_TEST_CREDIT", adminId);
      
      console.log(`[TESTER CREATED] type=RIDER, userId=${userId}, adminId=${adminId}, adminEmail=${adminEmail}, testerCredit=₦45,000`);
      
      await storage.createFinancialAuditLog({
        eventType: "ADJUSTMENT",
        userId,
        amount: String(creditAmount),
        actorRole: "ADMIN",
        currency: "NGN",
        description: `INITIAL_TEST_CREDIT - Rider Tester created by ${adminEmail}`,
        metadata: JSON.stringify({ testerType: "RIDER", adminId, source: "TESTER_SYSTEM", walletType: "TESTER" }),
      });
      
      return res.json({ 
        success: true,
        message: "Rider tester created with ₦45,000 test credit",
        userId,
        testerType: "RIDER",
        testerWalletBalance: creditAmount,
      });
    } catch (error) {
      console.error("Error creating rider tester:", error);
      return res.status(500).json({ message: "Failed to create rider tester" });
    }
  });

  // Create Driver Tester
  app.post("/api/admin/testers/driver", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const adminEmail = req.user.claims.email;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      // Update user role to driver with tester flag
      await storage.setUserAsTester(userId, "DRIVER", adminId);
      
      // Create driver wallet (main balance stays at 0)
      let wallet = await storage.getDriverWallet(userId);
      if (!wallet) {
        const currency = await getUserCurrency(userId);
        wallet = await storage.createDriverWallet({ userId, currency });
      }
      
      // Credit test credits to TESTER WALLET (separate from main wallet)
      const creditAmount = 4500000;
      await storage.adjustDriverTesterWalletBalance(userId, creditAmount, "INITIAL_TEST_CREDIT", adminId);
      
      console.log(`[TESTER CREATED] type=DRIVER, userId=${userId}, adminId=${adminId}, adminEmail=${adminEmail}, testerCredit=₦45,000`);
      
      await storage.createFinancialAuditLog({
        eventType: "ADJUSTMENT",
        userId,
        amount: String(creditAmount),
        actorRole: "ADMIN",
        currency: "NGN",
        description: `INITIAL_TEST_CREDIT - Driver Tester created by ${adminEmail}`,
        metadata: JSON.stringify({ testerType: "DRIVER", adminId, source: "TESTER_SYSTEM", walletType: "TESTER" }),
      });
      
      return res.json({ 
        success: true,
        message: "Driver tester created with ₦45,000 test credit",
        userId,
        testerType: "DRIVER",
        testerWalletBalance: creditAmount,
      });
    } catch (error) {
      console.error("Error creating driver tester:", error);
      return res.status(500).json({ message: "Failed to create driver tester" });
    }
  });

  // Get all testers with wallet balances
  app.get("/api/admin/testers", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const testers = await storage.getAllTesters();
      
      // Enrich with wallet info
      const testersWithWallets = await Promise.all(testers.map(async (tester: any) => {
        let testerWalletBalance = 0;
        let mainWalletBalance = 0;
        
        if (tester.testerType === "RIDER") {
          const wallet = await storage.getRiderWallet(tester.userId);
          if (wallet) {
            testerWalletBalance = parseFloat(String(wallet.testerWalletBalance || 0));
            mainWalletBalance = parseFloat(String(wallet.balance || 0));
          }
        } else if (tester.testerType === "DRIVER") {
          const wallet = await storage.getDriverWallet(tester.userId);
          if (wallet) {
            testerWalletBalance = parseFloat(String(wallet.testerWalletBalance || 0));
            mainWalletBalance = parseFloat(String(wallet.balance || 0));
          }
        }
        
        return {
          ...tester,
          testerWalletBalance,
          mainWalletBalance,
        };
      }));
      
      return res.json(testersWithWallets);
    } catch (error) {
      console.error("Error fetching testers:", error);
      return res.status(500).json({ message: "Failed to fetch testers" });
    }
  });

  // Remove tester status
  app.delete("/api/admin/testers/:userId", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { userId } = req.params;
      
      await storage.removeTesterStatus(userId);
      
      console.log(`[TESTER REMOVED] userId=${userId}, removedBy=${adminId}`);
      
      return res.json({ success: true, message: "Tester status removed" });
    } catch (error) {
      console.error("Error removing tester:", error);
      return res.status(500).json({ message: "Failed to remove tester" });
    }
  });

  // Adjust tester credit (TOP_UP or REFUND) - SUPER_ADMIN only
  app.post("/api/admin/testers/adjust-credit", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const adminEmail = req.user.claims.email;
      const { userId, amount, action } = req.body;

      if (!userId || !amount || !action) {
        return res.status(400).json({ message: "userId, amount, and action are required" });
      }

      if (!["TOP_UP", "REFUND"].includes(action)) {
        return res.status(400).json({ message: "Action must be TOP_UP or REFUND" });
      }

      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }

      // Check if user is a tester
      const testerStatus = await storage.getUserTesterStatus(userId);
      if (!testerStatus?.isTester) {
        return res.status(400).json({ message: "User is not a tester. Can only adjust tester wallets." });
      }

      // Get the appropriate wallet and adjust TESTER WALLET BALANCE (separate from main wallet)
      if (testerStatus.testerType === "RIDER") {
        const wallet = await storage.getRiderWallet(userId);
        if (!wallet) {
          return res.status(404).json({ message: "Rider wallet not found" });
        }

        if (action === "REFUND") {
          // Check TESTER wallet balance first (already in kobo)
          const currentTesterBalance = typeof wallet.testerWalletBalance === 'string' 
            ? parseFloat(wallet.testerWalletBalance)
            : Number(wallet.testerWalletBalance || 0);
          if (currentTesterBalance < amount) {
            return res.status(400).json({ message: "Insufficient tester wallet balance for refund. Cannot go below ₦0." });
          }
          // Refund from TESTER WALLET
          await storage.adjustRiderTesterWalletBalance(userId, -amount, `TESTER_REFUND by ${adminEmail}`, adminId);
        } else {
          // TOP_UP - add to TESTER WALLET
          await storage.adjustRiderTesterWalletBalance(userId, amount, `TESTER_TOPUP by ${adminEmail}`, adminId);
        }
      } else if (testerStatus.testerType === "DRIVER") {
        const wallet = await storage.getDriverWallet(userId);
        if (!wallet) {
          return res.status(404).json({ message: "Driver wallet not found" });
        }

        if (action === "REFUND") {
          // Check TESTER wallet balance first (already in kobo)
          const currentTesterBalance = typeof wallet.testerWalletBalance === 'string' 
            ? parseFloat(wallet.testerWalletBalance)
            : Number(wallet.testerWalletBalance || 0);
          if (currentTesterBalance < amount) {
            return res.status(400).json({ message: "Insufficient tester wallet balance for refund. Cannot go below ₦0." });
          }
          // Refund from TESTER WALLET
          await storage.adjustDriverTesterWalletBalance(userId, -amount, `TESTER_REFUND by ${adminEmail}`, adminId);
        } else {
          // TOP_UP - add to TESTER WALLET
          await storage.adjustDriverTesterWalletBalance(userId, amount, `TESTER_TOPUP by ${adminEmail}`, adminId);
        }
      } else {
        return res.status(400).json({ message: "Unknown tester type" });
      }

      const nairaAmount = (amount / 100).toFixed(2);
      console.log(`[TESTER ${action}] userId=${userId}, amount=₦${nairaAmount}, by=${adminEmail}`);

      return res.json({
        success: true,
        message: `${action === "TOP_UP" ? "Topped up" : "Refunded"} ₦${nairaAmount} ${action === "TOP_UP" ? "to" : "from"} tester wallet`,
      });
    } catch (error) {
      console.error("Error adjusting tester credit:", error);
      return res.status(500).json({ message: "Failed to adjust tester credit" });
    }
  });

  // Check if user is a tester
  app.get("/api/user/tester-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const testerStatus = await storage.getUserTesterStatus(userId);
      return res.json(testerStatus);
    } catch (error) {
      console.error("Error getting tester status:", error);
      return res.status(500).json({ message: "Failed to get tester status" });
    }
  });

  // Get list of users for admin wallet management
  app.get("/api/admin/users/for-wallet-credit", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const users = await storage.getAllUsersWithRoles();
      const usersWithWallets = await Promise.all(
        users.map(async (user: any) => {
          const riderWallet = await storage.getRiderWallet(user.userId);
          const driverWallet = await storage.getDriverWallet(user.userId);
          return {
            id: user.userId,
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
  // RIDER AUTO TOP-UP
  // ==========================================

  app.get("/api/rider/auto-topup", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const settings = await storage.getAutoTopUpSettings(userId);
      if (!settings) {
        return res.json({
          enabled: false,
          threshold: "500.00",
          amount: "1000.00",
          paymentMethodId: null,
          failureCount: 0,
        });
      }
      return res.json({
        enabled: settings.autoTopUpEnabled,
        threshold: settings.autoTopUpThreshold,
        amount: settings.autoTopUpAmount,
        paymentMethodId: settings.autoTopUpPaymentMethodId,
        failureCount: settings.autoTopUpFailureCount,
      });
    } catch (error) {
      console.error("Error fetching auto top-up settings:", error);
      return res.status(500).json({ message: "Failed to fetch auto top-up settings" });
    }
  });

  app.post("/api/rider/auto-topup", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { enabled, threshold, amount, paymentMethodId } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }

      if (threshold !== undefined && threshold < 100) {
        return res.status(400).json({ message: "Threshold must be at least 100" });
      }

      if (amount !== undefined && amount < 200) {
        return res.status(400).json({ message: "Amount must be at least 200" });
      }

      if (paymentMethodId) {
        const method = await storage.getRiderPaymentMethod(paymentMethodId);
        if (!method || method.userId !== userId) {
          return res.status(400).json({ message: "Invalid payment method" });
        }
        if (!method.isActive) {
          return res.status(400).json({ message: "Payment method is not active" });
        }
      }

      let existingWallet = await storage.getRiderWallet(userId);
      if (!existingWallet) {
        let currency = "NGN";
        try {
          currency = await getUserCurrency(userId);
        } catch (e) {
          console.warn(`[AUTO_TOPUP] Failed to get currency for user ${userId}, defaulting to NGN`);
        }
        try {
          existingWallet = await storage.createRiderWallet({ userId, currency });
        } catch (e: any) {
          if (e?.code === "23505" || e?.message?.includes("duplicate")) {
            existingWallet = await storage.getRiderWallet(userId);
          } else {
            throw e;
          }
        }
      }

      const wallet = await storage.updateAutoTopUpSettings(userId, {
        enabled,
        threshold: threshold !== undefined ? threshold.toString() : undefined,
        amount: amount !== undefined ? amount.toString() : undefined,
        paymentMethodId: paymentMethodId !== undefined ? paymentMethodId : undefined,
      });

      if (!wallet) {
        return res.status(500).json({ message: "Failed to update auto top-up settings" });
      }

      return res.json({
        success: true,
        message: enabled ? "Auto top-up enabled" : "Auto top-up disabled",
        settings: {
          autoTopUpEnabled: wallet.autoTopUpEnabled,
          autoTopUpThreshold: wallet.autoTopUpThreshold,
          autoTopUpAmount: wallet.autoTopUpAmount,
          autoTopUpPaymentMethodId: wallet.autoTopUpPaymentMethodId,
        },
      });
    } catch (error) {
      console.error("Error updating auto top-up settings:", error);
      return res.status(500).json({ message: "Failed to update auto top-up settings" });
    }
  });

  app.post("/api/rider/auto-topup/trigger", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const shouldTopUp = await storage.shouldTriggerAutoTopUp(userId);
      if (shouldTopUp) {
        storage.triggerAutoTopUp(userId).catch(err => console.error("[AUTO_TOPUP] Error:", err));
        return res.json({ triggered: true, message: "Auto top-up triggered" });
      }
      return res.json({ triggered: false, message: "Auto top-up not needed" });
    } catch (error) {
      console.error("Error triggering auto top-up:", error);
      return res.status(500).json({ message: "Failed to trigger auto top-up" });
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
        currency: "NGN",
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

  // =============================================
  // PHASE 3: RATINGS, BEHAVIOR SIGNALS & TRUST SCORING ENDPOINTS
  // =============================================

  // Submit a rating for a completed trip
  app.post("/api/ratings/submit", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { tripId, rateeId, score, ratingRole } = req.body;

      if (!tripId || !rateeId || !score || !ratingRole) {
        return res.status(400).json({ message: "Missing required fields: tripId, rateeId, score, ratingRole" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (trip.status !== "completed") {
        return res.status(400).json({ message: "Can only rate completed trips" });
      }

      if (ratingRole === "rider_to_driver" && trip.riderId !== userId) {
        return res.status(403).json({ message: "Only the rider can rate the driver" });
      }
      if (ratingRole === "driver_to_rider" && trip.driverId !== userId) {
        return res.status(403).json({ message: "Only the driver can rate the rider" });
      }

      const { submitRating } = await import("./trust-guards");
      const result = await submitRating(
        tripId,
        userId,
        rateeId,
        score,
        ratingRole,
        new Date(trip.completedAt)
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error, code: result.code });
      }

      return res.json({
        success: true,
        ratingId: result.ratingId,
        message: "Rating submitted successfully",
      });
    } catch (error) {
      console.error("Error submitting rating:", error);
      return res.status(500).json({ message: "Failed to submit rating" });
    }
  });

  // Get ratings for a specific trip
  app.get("/api/ratings/trip/:tripId", isAuthenticated, async (req, res) => {
    try {
      const ratings = await storage.getTrustTripRatings(req.params.tripId);
      return res.json(ratings);
    } catch (error) {
      console.error("Error getting trip ratings:", error);
      return res.status(500).json({ message: "Failed to get ratings" });
    }
  });

  // Check if user can rate a trip
  app.get("/api/ratings/can-rate/:tripId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { tripId } = req.params;

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ canRate: false, reason: "Trip not found" });
      }

      if (trip.status !== "completed") {
        return res.json({ canRate: false, reason: "Trip not completed" });
      }

      const existingRating = await storage.getTripRatingByRater(tripId, userId);
      if (existingRating) {
        return res.json({ canRate: false, reason: "Already rated" });
      }

      const { isRatingWindowOpen } = await import("@shared/trust-config");
      if (!isRatingWindowOpen(new Date(trip.completedAt))) {
        return res.json({ canRate: false, reason: "Rating window expired" });
      }

      let ratingRole: "rider_to_driver" | "driver_to_rider" | null = null;
      let rateeId: string | null = null;

      if (trip.riderId === userId && trip.driverId) {
        ratingRole = "rider_to_driver";
        rateeId = trip.driverId;
      } else if (trip.driverId === userId) {
        ratingRole = "driver_to_rider";
        rateeId = trip.riderId;
      }

      if (!ratingRole || !rateeId) {
        return res.json({ canRate: false, reason: "Not a participant of this trip" });
      }

      return res.json({ canRate: true, ratingRole, rateeId });
    } catch (error) {
      console.error("Error checking rating eligibility:", error);
      return res.status(500).json({ message: "Failed to check rating eligibility" });
    }
  });

  // Admin: Get all trust profiles (read-only)
  app.get("/api/admin/trust/profiles", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { getAllTrustProfiles } = await import("./trust-guards");
      const profiles = await getAllTrustProfiles();
      return res.json(profiles);
    } catch (error) {
      console.error("Error getting trust profiles:", error);
      return res.status(500).json({ message: "Failed to get trust profiles" });
    }
  });

  // Admin: Get trust details for a specific user (read-only)
  app.get("/api/admin/trust/user/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { getAdminTrustView } = await import("./trust-guards");
      const details = await getAdminTrustView(req.params.userId);
      return res.json(details);
    } catch (error) {
      console.error("Error getting user trust details:", error);
      return res.status(500).json({ message: "Failed to get user trust details" });
    }
  });

  // Admin: Get all trust audit logs (read-only)
  app.get("/api/admin/trust/audit-logs", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { getAllTrustAuditLogs } = await import("./trust-guards");
      const logs = await getAllTrustAuditLogs();
      return res.json(logs);
    } catch (error) {
      console.error("Error getting trust audit logs:", error);
      return res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // Admin: Get trust score thresholds (for future enforcement)
  app.get("/api/admin/trust/thresholds", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { trustScoreThresholdLow, trustScoreThresholdHigh } = await import("./trust-guards");
      return res.json({
        low: trustScoreThresholdLow(),
        high: trustScoreThresholdHigh(),
      });
    } catch (error) {
      console.error("Error getting trust thresholds:", error);
      return res.status(500).json({ message: "Failed to get thresholds" });
    }
  });

  // =============================================
  // SUPER ADMIN RATING CONTROL ENDPOINTS
  // =============================================

  // Super Admin: Adjust user rating
  app.post("/api/admin/trust/adjust-rating", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminEmail = req.user.claims.email;
      const adminUserId = req.user.claims.sub;
      const { targetUserId, newRating, reason, adminNote, resetRatingCount } = req.body;

      if (!targetUserId || newRating === undefined || !reason) {
        return res.status(400).json({ message: "Target user ID, new rating, and reason are required" });
      }

      const ratingValue = parseFloat(newRating);
      if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
        return res.status(400).json({ message: "Rating must be between 0 and 5" });
      }

      // Get current user trust profile
      const profile = await storage.getUserTrustProfile(targetUserId);
      if (!profile) {
        return res.status(404).json({ message: "User trust profile not found" });
      }

      const oldRating = parseFloat(profile.averageRating || "5.00");
      const oldRatingCount = profile.totalRatingsReceived;

      // Update the user's rating
      await storage.updateUserTrustProfile(targetUserId, {
        averageRating: ratingValue.toFixed(2),
        totalRatingsReceived: resetRatingCount ? 0 : profile.totalRatingsReceived,
      });

      // Create audit log entry
      await storage.createAdminRatingAudit({
        adminEmail,
        adminUserId,
        targetUserId,
        oldRating: String(oldRating.toFixed(2)),
        newRating: String(ratingValue.toFixed(2)),
        oldRatingCount,
        newRatingCount: resetRatingCount ? 0 : oldRatingCount,
        reason,
        adminNote: adminNote || null,
      });

      return res.json({ 
        success: true, 
        message: "Rating adjusted successfully",
        oldRating: oldRating.toFixed(2),
        newRating: ratingValue.toFixed(2),
      });
    } catch (error) {
      console.error("Error adjusting user rating:", error);
      return res.status(500).json({ message: "Failed to adjust rating" });
    }
  });

  // Super Admin: Get rating audit history for a user
  app.get("/api/admin/trust/rating-audit/:userId", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const audits = await storage.getAdminRatingAuditForUser(req.params.userId);
      return res.json(audits);
    } catch (error) {
      console.error("Error getting rating audit history:", error);
      return res.status(500).json({ message: "Failed to get rating audit history" });
    }
  });

  // Super Admin: Get all rating audits
  app.get("/api/admin/trust/rating-audits", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const audits = await storage.getAllAdminRatingAudits();
      return res.json(audits);
    } catch (error) {
      console.error("Error getting all rating audits:", error);
      return res.status(500).json({ message: "Failed to get rating audits" });
    }
  });

  // =============================================
  // PAIRING BLOCK MANAGEMENT ENDPOINTS
  // =============================================

  // Admin: Get all pairing blocks
  app.get("/api/admin/pairing-blocks", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const blocks = await storage.getAllPairingBlocks();
      return res.json(blocks);
    } catch (error) {
      console.error("Error getting pairing blocks:", error);
      return res.status(500).json({ message: "Failed to get pairing blocks" });
    }
  });

  // Admin: Get pairing blocks for a specific user
  app.get("/api/admin/pairing-blocks/user/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const blocks = await storage.getPairingBlocksByUser(req.params.userId);
      return res.json(blocks);
    } catch (error) {
      console.error("Error getting user pairing blocks:", error);
      return res.status(500).json({ message: "Failed to get user pairing blocks" });
    }
  });

  // Super Admin: Remove pairing block (override)
  app.post("/api/admin/pairing-blocks/remove", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { riderId, driverId, reason } = req.body;

      if (!riderId || !driverId || !reason) {
        return res.status(400).json({ message: "Rider ID, driver ID, and reason are required" });
      }

      const removedBlock = await storage.removePairingBlock(riderId, driverId, adminId, reason);
      
      if (!removedBlock) {
        return res.status(404).json({ message: "No active pairing block found between these users" });
      }

      return res.json({ 
        success: true, 
        message: "Pairing block removed successfully",
        block: removedBlock,
      });
    } catch (error) {
      console.error("Error removing pairing block:", error);
      return res.status(500).json({ message: "Failed to remove pairing block" });
    }
  });

  // Driver matching: Check if driver is blocked for rider
  app.get("/api/matching/blocked-drivers/:riderId", isAuthenticated, async (req, res) => {
    try {
      const blockedDrivers = await storage.getBlockedDriversForRider(req.params.riderId);
      return res.json({ blockedDrivers });
    } catch (error) {
      console.error("Error getting blocked drivers:", error);
      return res.status(500).json({ message: "Failed to get blocked drivers" });
    }
  });

  // =============================================
  // PHASE 4: SAFETY & INCIDENT INTELLIGENCE ENDPOINTS
  // =============================================

  // SOS Trigger - available during active trips
  app.post("/api/safety/sos", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { tripId, isSilentMode, latitude, longitude, speed, routePolyline } = req.body;

      if (!tripId) {
        return res.status(400).json({ message: "Trip ID is required" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      let role: "RIDER" | "DRIVER";
      if (trip.riderId === userId) {
        role = "RIDER";
      } else if (trip.driverId === userId) {
        role = "DRIVER";
      } else {
        return res.status(403).json({ message: "You are not part of this trip" });
      }

      const { triggerSos } = await import("./safety-guards");
      const result = await triggerSos(tripId, userId, role, isSilentMode || false, {
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        speed: speed?.toString(),
        routePolyline,
      });

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({
        success: true,
        triggerId: result.triggerId,
        message: "SOS triggered successfully",
      });
    } catch (error) {
      console.error("Error triggering SOS:", error);
      return res.status(500).json({ message: "Failed to trigger SOS" });
    }
  });

  // Report an incident
  app.post("/api/safety/incident", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { tripId, accusedUserId, incidentType, severity, description, evidenceMetadata } = req.body;

      if (!tripId || !accusedUserId || !incidentType || !severity || !description) {
        return res.status(400).json({ 
          message: "Missing required fields: tripId, accusedUserId, incidentType, severity, description" 
        });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      let role: "RIDER" | "DRIVER";
      if (trip.riderId === userId) {
        role = "RIDER";
      } else if (trip.driverId === userId) {
        role = "DRIVER";
      } else {
        return res.status(403).json({ message: "You are not part of this trip" });
      }

      const { reportIncident } = await import("./safety-guards");
      const result = await reportIncident(
        tripId,
        userId,
        role,
        accusedUserId,
        incidentType,
        severity,
        description,
        evidenceMetadata,
        trip.countryCode || undefined
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({
        success: true,
        incidentId: result.incidentId,
        autoSuspended: result.autoSuspended,
        message: "Incident reported successfully",
      });
    } catch (error) {
      console.error("Error reporting incident:", error);
      return res.status(500).json({ message: "Failed to report incident" });
    }
  });

  // Get user's reported incidents
  app.get("/api/safety/my-incidents", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const incidents = await storage.getIncidentsByUser(userId);
      return res.json(incidents);
    } catch (error) {
      console.error("Error getting incidents:", error);
      return res.status(500).json({ message: "Failed to get incidents" });
    }
  });

  // Check if user is suspended
  app.get("/api/safety/suspension-status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const isSuspended = await storage.isUserSuspended(userId);
      const activeSuspension = isSuspended ? await storage.getActiveSuspensionForUser(userId) : null;
      
      return res.json({
        isSuspended,
        suspension: activeSuspension ? {
          reason: activeSuspension.reason,
          type: activeSuspension.suspensionType,
          expiresAt: activeSuspension.expiresAt,
        } : null,
      });
    } catch (error) {
      console.error("Error checking suspension status:", error);
      return res.status(500).json({ message: "Failed to check suspension status" });
    }
  });

  // Admin: Get incident queue
  app.get("/api/admin/safety/incidents", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { getIncidentQueue } = await import("./safety-guards");
      const incidents = await getIncidentQueue();
      return res.json(incidents);
    } catch (error) {
      console.error("Error getting incident queue:", error);
      return res.status(500).json({ message: "Failed to get incidents" });
    }
  });

  // Admin: Get all incidents by status
  app.get("/api/admin/safety/incidents/:status", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const incidents = await storage.getIncidentsByStatus(req.params.status);
      return res.json(incidents);
    } catch (error) {
      console.error("Error getting incidents by status:", error);
      return res.status(500).json({ message: "Failed to get incidents" });
    }
  });

  // Admin: Get single incident details
  app.get("/api/admin/safety/incident/:incidentId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const incident = await storage.getIncident(req.params.incidentId);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }
      
      const auditLogs = await storage.getSafetyAuditLogsForIncident(req.params.incidentId);
      return res.json({ incident, auditLogs });
    } catch (error) {
      console.error("Error getting incident:", error);
      return res.status(500).json({ message: "Failed to get incident" });
    }
  });

  // Admin: Review incident (assign to self)
  app.post("/api/admin/safety/incident/:incidentId/review", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { adminReviewIncident } = await import("./safety-guards");
      const result = await adminReviewIncident(req.params.incidentId, adminId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Incident under review" });
    } catch (error) {
      console.error("Error reviewing incident:", error);
      return res.status(500).json({ message: "Failed to review incident" });
    }
  });

  // Admin: Approve incident (resolve)
  app.post("/api/admin/safety/incident/:incidentId/approve", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { notes, suspendUser, isPermanentBan } = req.body;

      if (!notes) {
        return res.status(400).json({ message: "Notes are required" });
      }

      const { adminApproveIncident } = await import("./safety-guards");
      const result = await adminApproveIncident(
        req.params.incidentId,
        adminId,
        notes,
        suspendUser || false,
        isPermanentBan || false
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Incident approved and resolved" });
    } catch (error) {
      console.error("Error approving incident:", error);
      return res.status(500).json({ message: "Failed to approve incident" });
    }
  });

  // Admin: Dismiss incident
  app.post("/api/admin/safety/incident/:incidentId/dismiss", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Dismissal reason is required" });
      }

      const { adminDismissIncident } = await import("./safety-guards");
      const result = await adminDismissIncident(req.params.incidentId, adminId, reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Incident dismissed" });
    } catch (error) {
      console.error("Error dismissing incident:", error);
      return res.status(500).json({ message: "Failed to dismiss incident" });
    }
  });

  // Admin: Escalate incident
  app.post("/api/admin/safety/incident/:incidentId/escalate", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Escalation reason is required" });
      }

      const { adminEscalateIncident } = await import("./safety-guards");
      const result = await adminEscalateIncident(req.params.incidentId, adminId, reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Incident escalated" });
    } catch (error) {
      console.error("Error escalating incident:", error);
      return res.status(500).json({ message: "Failed to escalate incident" });
    }
  });

  // Admin: Get all active suspensions
  app.get("/api/admin/safety/suspensions", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { getAllSuspensions } = await import("./safety-guards");
      const suspensions = await getAllSuspensions();
      return res.json(suspensions);
    } catch (error) {
      console.error("Error getting suspensions:", error);
      return res.status(500).json({ message: "Failed to get suspensions" });
    }
  });

  // Admin: Ban user permanently
  app.post("/api/admin/safety/ban/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { reason, relatedIncidentId } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Ban reason is required" });
      }

      const { adminBanUser } = await import("./safety-guards");
      const result = await adminBanUser(req.params.userId, adminId, reason, relatedIncidentId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, suspensionId: result.suspensionId, message: "User permanently banned" });
    } catch (error) {
      console.error("Error banning user:", error);
      return res.status(500).json({ message: "Failed to ban user" });
    }
  });

  // Admin: Lift suspension
  app.post("/api/admin/safety/suspension/:suspensionId/lift", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Lift reason is required" });
      }

      const { liftUserSuspension } = await import("./safety-guards");
      const result = await liftUserSuspension(req.params.suspensionId, adminId, reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Suspension lifted" });
    } catch (error) {
      console.error("Error lifting suspension:", error);
      return res.status(500).json({ message: "Failed to lift suspension" });
    }
  });

  // Admin: Get user safety profile
  app.get("/api/admin/safety/user/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { getUserSafetyProfile } = await import("./safety-guards");
      const profile = await getUserSafetyProfile(req.params.userId);
      return res.json(profile);
    } catch (error) {
      console.error("Error getting user safety profile:", error);
      return res.status(500).json({ message: "Failed to get user safety profile" });
    }
  });

  // Admin: Get all safety audit logs
  app.get("/api/admin/safety/audit-logs", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { getSafetyAuditLogs } = await import("./safety-guards");
      const logs = await getSafetyAuditLogs();
      return res.json(logs);
    } catch (error) {
      console.error("Error getting safety audit logs:", error);
      return res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // Admin: Get SOS triggers for a trip
  app.get("/api/admin/safety/sos/trip/:tripId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const triggers = await storage.getSosTriggersByTrip(req.params.tripId);
      return res.json(triggers);
    } catch (error) {
      console.error("Error getting SOS triggers:", error);
      return res.status(500).json({ message: "Failed to get SOS triggers" });
    }
  });

  // =============================================
  // LOST ITEM REPORTS
  // =============================================

  // Rider: Report a lost item
  app.post("/api/lost-items", isAuthenticated, async (req, res) => {
    try {
      const riderId = req.user!.claims.sub;
      const { tripId, itemDescription, itemCategory, lastSeenLocation, contactPhone, photoUrls } = req.body;

      if (!tripId || !itemDescription) {
        return res.status(400).json({ message: "Trip ID and item description are required" });
      }

      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const report = await storage.createLostItemReport({
        tripId,
        riderId,
        driverId: trip.driverId || "",
        itemDescription,
        itemType: itemCategory || "other",
        status: "reported",
      });

      // Auto-generate fraud detection signals
      try {
        const previousReports = await storage.getLostItemReportsByRider(riderId);
        const recentReports = previousReports.filter(r => {
          const created = new Date(r.createdAt || 0);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return created > thirtyDaysAgo;
        });

        // Frequent reporter: 3+ reports in 30 days
        if (recentReports.length >= 3) {
          await storage.createLostItemFraudSignal({
            userId: riderId,
            userRole: "rider",
            relatedReportId: report.id,
            signalType: "frequent_reporter",
            severity: recentReports.length >= 5 ? "high" : "medium",
            riskScore: Math.min(recentReports.length * 15, 100),
            description: `${recentReports.length} lost item reports in the last 30 days`,
          });
        }

        // Same item type: 2+ reports with the same item type in 30 days
        const sameTypeReports = recentReports.filter(r => r.itemType === (itemCategory || "other"));
        if (sameTypeReports.length >= 2) {
          await storage.createLostItemFraudSignal({
            userId: riderId,
            userRole: "rider",
            relatedReportId: report.id,
            signalType: "same_item_type",
            severity: sameTypeReports.length >= 3 ? "high" : "medium",
            riskScore: Math.min(sameTypeReports.length * 20, 100),
            description: `${sameTypeReports.length} reports for "${itemCategory || "other"}" items in the last 30 days`,
          });
        }

        // No proof: report with no photos
        if (!photoUrls || (Array.isArray(photoUrls) && photoUrls.length === 0)) {
          await storage.createLostItemFraudSignal({
            userId: riderId,
            userRole: "rider",
            relatedReportId: report.id,
            signalType: "no_proof",
            severity: "low",
            riskScore: 10,
            description: "Lost item report submitted without photo evidence",
          });
        }

        // Frequent accused: check if this driver has been accused often
        const allReports = await storage.getAllLostItemReports();
        const driverAccusations = allReports.filter(r => 
          r.driverId === (trip.driverId || "") && 
          new Date(r.createdAt || 0) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );
        if (driverAccusations.length >= 3) {
          await storage.createLostItemFraudSignal({
            userId: trip.driverId || "",
            userRole: "driver",
            relatedReportId: report.id,
            signalType: "frequent_accused",
            severity: driverAccusations.length >= 5 ? "high" : "medium",
            riskScore: Math.min(driverAccusations.length * 15, 100),
            description: `Driver accused in ${driverAccusations.length} lost item reports in the last 30 days`,
          });
        }
      } catch (fraudError) {
        console.error("Fraud signal generation failed (non-blocking):", fraudError);
      }

      return res.status(201).json(report);
    } catch (error) {
      console.error("Error creating lost item report:", error);
      return res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Rider: Get my lost item reports
  app.get("/api/lost-items/my-reports", isAuthenticated, async (req, res) => {
    try {
      const riderId = req.user!.claims.sub;
      const reports = await storage.getLostItemReportsByRider(riderId);
      return res.json(reports);
    } catch (error) {
      console.error("Error getting lost item reports:", error);
      return res.status(500).json({ message: "Failed to get reports" });
    }
  });

  // Driver: Get lost item reports assigned to me
  app.get("/api/lost-items/driver-reports", isAuthenticated, async (req, res) => {
    try {
      const driverId = req.user!.claims.sub;
      const reports = await storage.getLostItemReportsByDriver(driverId);
      return res.json(reports);
    } catch (error) {
      console.error("Error getting driver lost item reports:", error);
      return res.status(500).json({ message: "Failed to get reports" });
    }
  });

  // Get single lost item report
  app.get("/api/lost-items/:id", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.getLostItemReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      return res.json(report);
    } catch (error) {
      console.error("Error getting lost item report:", error);
      return res.status(500).json({ message: "Failed to get report" });
    }
  });

  // Driver: Confirm or deny lost item
  app.patch("/api/lost-items/:id/driver-response", isAuthenticated, async (req, res) => {
    try {
      const driverId = req.user!.claims.sub;
      const { response, driverNotes } = req.body;

      if (!response || !["driver_confirmed", "driver_denied"].includes(response)) {
        return res.status(400).json({ message: "Response must be 'driver_confirmed' or 'driver_denied'" });
      }

      const report = await storage.getLostItemReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      if (report.driverId !== driverId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const updateData: any = {
        status: response === "driver_confirmed" ? "found" : "driver_denied",
        driverHasItem: response === "driver_confirmed",
        driverConfirmedAt: new Date(),
      };
      if (driverNotes) updateData.adminNotes = driverNotes;

      // When driver confirms item found: unlock communication + make rider phone visible to driver
      if (response === "driver_confirmed") {
        updateData.communicationUnlocked = true;
        updateData.communicationUnlockedAt = new Date();
        updateData.riderPhoneVisible = true;
      }

      const updated = await storage.updateLostItemReport(req.params.id, updateData);

      // Create system message in chat
      if (response === "driver_confirmed") {
        await storage.createLostItemMessage({
          lostItemReportId: req.params.id,
          senderId: "system",
          senderRole: "system",
          message: "Driver confirmed the item was found. Chat is now unlocked for coordinating the return.",
          isSystemMessage: true,
        });
      }

      // Capture trust signal for driver response
      try {
        const { captureBehaviorSignal } = await import("./trust-guards");
        if (response === "driver_confirmed") {
          await captureBehaviorSignal(driverId, "LOST_ITEM_RETURNED", "driver", report.tripId, { lostItemId: req.params.id });
        } else if (response === "driver_denied") {
          await captureBehaviorSignal(driverId, "LOST_ITEM_DENIED", "driver", report.tripId, { lostItemId: req.params.id });
        }
      } catch (signalErr) {
        console.error("Trust signal capture failed (non-blocking):", signalErr);
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error updating lost item report:", error);
      return res.status(500).json({ message: "Failed to update report" });
    }
  });

  // Update lost item status (return in progress, returned, disputed, resolved_by_admin)
  app.patch("/api/lost-items/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { status, returnFee, driverShare, platformFee, returnLocation, returnNotes, disputeReason } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const validStatuses = ["reported", "found", "returned", "disputed", "resolved_by_admin", "driver_denied", "closed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }

      const report = await storage.getLostItemReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const updateData: any = { status };
      if (returnFee !== undefined) updateData.returnFeeAmount = returnFee;
      if (driverShare !== undefined) updateData.driverPayout = driverShare;
      if (platformFee !== undefined) updateData.platformFee = platformFee;
      if (returnLocation) updateData.meetupLocation = returnLocation;

      if (status === "returned") {
        updateData.returnCompletedAt = new Date();
        updateData.driverPhoneVisible = true;

        // Apply return fee from config if not provided
        if (!returnFee && report.driverId) {
          try {
            const feeConfig = await storage.getLostItemFeeConfig("NG");
            if (feeConfig) {
              const fee = report.urgency === "urgent" ? parseFloat(feeConfig.urgentFee || "0") : parseFloat(feeConfig.standardFee || "0");
              const driverPct = feeConfig.driverSharePercent || 75;
              updateData.returnFeeAmount = fee.toFixed(2);
              updateData.driverPayout = (fee * driverPct / 100).toFixed(2);
              updateData.platformFee = (fee * (100 - driverPct) / 100).toFixed(2);
              updateData.feeCollected = true;
            }
          } catch (feeErr) {
            console.error("Fee calculation failed (non-blocking):", feeErr);
          }
        }

        // System message
        await storage.createLostItemMessage({
          lostItemReportId: req.params.id,
          senderId: "system",
          senderRole: "system",
          message: "Item has been returned successfully. Driver phone number is now visible to the rider.",
          isSystemMessage: true,
        });
      }

      if (status === "disputed") {
        updateData.disputeReason = disputeReason || "No reason provided";
        await storage.createLostItemMessage({
          lostItemReportId: req.params.id,
          senderId: "system",
          senderRole: "system",
          message: "This case has been disputed and escalated for admin review.",
          isSystemMessage: true,
        });
      }

      if (status === "resolved_by_admin") {
        updateData.resolvedByAdminId = userId;
        updateData.resolvedAt = new Date();
        await storage.createLostItemMessage({
          lostItemReportId: req.params.id,
          senderId: "system",
          senderRole: "system",
          message: "This case has been resolved by an administrator.",
          isSystemMessage: true,
        });
      }

      const updated = await storage.updateLostItemReport(req.params.id, updateData);

      // Log analytics on terminal states
      if (["returned", "disputed", "resolved_by_admin", "closed"].includes(status)) {
        try {
          const messages = await storage.getLostItemMessages(req.params.id);
          const fraudSignals = await storage.getLostItemFraudSignalsByUser(report.riderId);
          const riderReports = await storage.getLostItemReportsByRider(report.riderId);
          const driverReports = report.driverId ? await storage.getLostItemReportsByDriver(report.driverId) : [];
          const driverReturns = driverReports.filter(r => r.status === "returned").length;
          const driverDenials = driverReports.filter(r => r.status === "driver_denied").length;

          const createdAt = new Date(report.createdAt);
          const resolvedAt = new Date();
          const resolutionHours = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

          await storage.createLostItemAnalytics({
            lostItemReportId: req.params.id,
            riderId: report.riderId,
            driverId: report.driverId || undefined,
            tripId: report.tripId,
            itemCategory: report.itemType,
            outcome: status,
            reportToResolutionHours: resolutionHours.toFixed(2),
            returnFeeApplied: updated?.returnFeeAmount || undefined,
            driverEarnings: updated?.driverPayout || undefined,
            riderLostItemCount: riderReports.length,
            driverReturnCount: driverReturns,
            driverDenialCount: driverDenials,
            chatMessageCount: messages.filter(m => !m.isSystemMessage).length,
            fraudSignalCount: fraudSignals.filter(s => s.lostItemReportId === req.params.id).length,
          });
        } catch (analyticsErr) {
          console.error("Analytics logging failed (non-blocking):", analyticsErr);
        }
      }

      // Capture trust signal for status transitions
      try {
        const { captureBehaviorSignal } = await import("./trust-guards");
        if (status === "returned" && report.riderId) {
          await captureBehaviorSignal(report.riderId, "LOST_ITEM_RESOLVED", "rider", report.tripId, { lostItemId: req.params.id });
        }
      } catch (signalErr) {
        console.error("Trust signal capture failed (non-blocking):", signalErr);
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error updating lost item status:", error);
      return res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Admin: Get all lost item reports
  app.get("/api/admin/lost-items", isAuthenticated, requireRole(["super_admin", "admin", "support_agent"]), async (req, res) => {
    try {
      const { status } = req.query;
      const reports = status 
        ? await storage.getLostItemReportsByStatus(status as string)
        : await storage.getAllLostItemReports();
      return res.json(reports);
    } catch (error) {
      console.error("Error getting all lost item reports:", error);
      return res.status(500).json({ message: "Failed to get reports" });
    }
  });

  // Admin: Get/update lost item fee config
  app.get("/api/admin/lost-item-fees", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const configs = await storage.getAllLostItemFeeConfigs();
      return res.json(configs);
    } catch (error) {
      console.error("Error getting lost item fee configs:", error);
      return res.status(500).json({ message: "Failed to get configs" });
    }
  });

  app.post("/api/admin/lost-item-fees", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { countryCode, standardFee, urgentFee, driverSharePercent, platformSharePercent } = req.body;
      if (!countryCode) {
        return res.status(400).json({ message: "Country code is required" });
      }
      const config = await storage.upsertLostItemFeeConfig({
        countryCode,
        standardFee: standardFee || "500.00",
        urgentFee: urgentFee || "1000.00",
        driverSharePercent: driverSharePercent || 75,
        platformSharePercent: platformSharePercent || 25,
      });
      return res.json(config);
    } catch (error) {
      console.error("Error updating lost item fee config:", error);
      return res.status(500).json({ message: "Failed to update config" });
    }
  });

  // =============================================
  // LOST ITEM CHAT & COMMUNICATION
  // =============================================

  // Get chat messages for a lost item report
  app.get("/api/lost-items/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const report = await storage.getLostItemReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      if (report.riderId !== userId && report.driverId !== userId) {
        const role = await storage.getUserRole(userId);
        if (!role || !["super_admin", "admin", "support_agent"].includes(role.role)) {
          return res.status(403).json({ message: "Not authorized" });
        }
      }
      if (!report.communicationUnlocked) {
        return res.json([]);
      }
      await storage.markLostItemMessagesRead(req.params.id, userId);
      const messages = await storage.getLostItemMessages(req.params.id);
      return res.json(messages);
    } catch (error) {
      console.error("Error getting lost item messages:", error);
      return res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Send a chat message for a lost item report
  app.post("/api/lost-items/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }
      const report = await storage.getLostItemReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      if (report.riderId !== userId && report.driverId !== userId) {
        return res.status(403).json({ message: "Only the rider or driver can send messages" });
      }
      if (!report.communicationUnlocked) {
        return res.status(403).json({ message: "Communication is not yet unlocked for this report" });
      }
      const senderRole = report.riderId === userId ? "rider" : "driver";
      const msg = await storage.createLostItemMessage({
        lostItemReportId: req.params.id,
        senderId: userId,
        senderRole,
        message: message.trim(),
        isSystemMessage: false,
      });
      return res.status(201).json(msg);
    } catch (error) {
      console.error("Error sending lost item message:", error);
      return res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get phone number for a lost item (privacy-controlled)
  app.get("/api/lost-items/:id/phone", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const report = await storage.getLostItemReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const isRider = report.riderId === userId;
      const isDriver = report.driverId === userId;
      if (!isRider && !isDriver) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Rider wants driver phone: only after item is returned
      if (isRider && report.driverPhoneVisible && report.driverId) {
        const driverProfile = await storage.getDriverProfile(report.driverId);
        return res.json({ phone: driverProfile?.phone || null, role: "driver" });
      }

      // Driver wants rider phone: only after driver confirms found
      if (isDriver && report.riderPhoneVisible) {
        const riderUser = await storage.getUser(report.riderId);
        return res.json({ phone: riderUser?.phone || null, role: "rider" });
      }

      return res.json({ phone: null, message: "Phone not yet available" });
    } catch (error) {
      console.error("Error getting phone for lost item:", error);
      return res.status(500).json({ message: "Failed to get phone" });
    }
  });

  // Admin: Unlock or revoke communication for a lost item
  app.patch("/api/admin/lost-items/:id/communication", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { unlock, riderPhoneVisible, driverPhoneVisible } = req.body;

      const report = await storage.getLostItemReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const updateData: any = {};
      if (unlock !== undefined) {
        updateData.communicationUnlocked = unlock;
        updateData.communicationUnlockedBy = adminId;
        updateData.communicationUnlockedAt = new Date();
      }
      if (riderPhoneVisible !== undefined) updateData.riderPhoneVisible = riderPhoneVisible;
      if (driverPhoneVisible !== undefined) updateData.driverPhoneVisible = driverPhoneVisible;

      const updated = await storage.updateLostItemReport(req.params.id, updateData);

      const action = unlock ? "unlocked" : "revoked";
      await storage.createLostItemMessage({
        lostItemReportId: req.params.id,
        senderId: "system",
        senderRole: "system",
        message: `Admin has ${action} communication for this case.`,
        isSystemMessage: true,
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error updating communication:", error);
      return res.status(500).json({ message: "Failed to update communication" });
    }
  });

  // Admin: Resolve a disputed lost item case
  app.patch("/api/admin/lost-items/:id/resolve", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { resolution, adminNotes } = req.body;

      const report = await storage.getLostItemReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const updated = await storage.updateLostItemReport(req.params.id, {
        status: "resolved_by_admin",
        resolvedByAdminId: adminId,
        resolvedAt: new Date(),
        adminNotes: adminNotes || resolution || null,
      });

      await storage.createLostItemMessage({
        lostItemReportId: req.params.id,
        senderId: "system",
        senderRole: "system",
        message: `Case resolved by admin. ${adminNotes || ""}`.trim(),
        isSystemMessage: true,
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error resolving lost item:", error);
      return res.status(500).json({ message: "Failed to resolve" });
    }
  });

  // Admin: Get lost item analytics summary
  app.get("/api/admin/lost-item-analytics", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const summary = await storage.getLostItemAnalyticsSummary();
      return res.json(summary);
    } catch (error) {
      console.error("Error getting lost item analytics:", error);
      return res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // Admin: Get all lost item analytics records
  app.get("/api/admin/lost-item-analytics/records", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const records = await storage.getAllLostItemAnalytics();
      return res.json(records);
    } catch (error) {
      console.error("Error getting analytics records:", error);
      return res.status(500).json({ message: "Failed to get records" });
    }
  });

  // =============================================
  // ACCIDENT REPORTS
  // =============================================

  // Report an accident
  app.post("/api/accident-reports", isAuthenticated, async (req, res) => {
    try {
      const reportedBy = req.user!.claims.sub;
      const { 
        tripId, incidentId, reporterRole, accidentType, severity,
        description, isSafe, injuriesReported, emergencyServicesNeeded,
        emergencyServicesContacted, gpsLat, gpsLng, photoUrls,
        voiceNoteUrl, vehicleDamageDescription
      } = req.body;

      if (!tripId || !description || !accidentType) {
        return res.status(400).json({ message: "Trip ID, description, and accident type are required" });
      }

      const report = await storage.createAccidentReport({
        tripId,
        incidentId: incidentId || "",
        reporterId: reportedBy,
        reporterRole: reporterRole || "rider",
        accidentSeverity: severity || accidentType || "minor",
        isSafe: isSafe !== undefined ? isSafe : true,
        emergencyServicesNeeded: emergencyServicesNeeded || false,
        emergencyServicesContacted: emergencyServicesContacted || false,
        photoEvidence: photoUrls || null,
        voiceNoteUrl: voiceNoteUrl || null,
        gpsLatitude: gpsLat || null,
        gpsLongitude: gpsLng || null,
        adminReviewStatus: "pending",
      });

      // Capture trust signals for accident reporting and safety cooperation
      try {
        const { captureBehaviorSignal } = await import("./trust-guards");
        const role = reporterRole || "rider";
        const signalCategory = role === "driver" ? "driver" : "rider";

        // Reward filing an accident report (transparency)
        if (signalCategory === "rider") {
          await captureBehaviorSignal(reportedBy, "ACCIDENT_REPORT_FILED", "rider", tripId, { accidentReportId: report.id });
        }

        // Safety check: isSafe response and emergency services cooperation
        if (isSafe === true) {
          if (signalCategory === "driver") {
            await captureBehaviorSignal(reportedBy, "ACCIDENT_SAFETY_CHECK_PASSED", "driver", tripId, { accidentReportId: report.id });
          } else {
            await captureBehaviorSignal(reportedBy, "ACCIDENT_SAFETY_COOPERATION", "rider", tripId, { accidentReportId: report.id });
          }
        }
      } catch (signalErr) {
        console.error("Trust signal capture failed (non-blocking):", signalErr);
      }

      return res.status(201).json(report);
    } catch (error) {
      console.error("Error creating accident report:", error);
      return res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Get my accident reports
  app.get("/api/accident-reports/my-reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const allReports = await storage.getAllAccidentReports();
      const myReports = allReports.filter(r => r.reporterId === userId);
      return res.json(myReports);
    } catch (error) {
      console.error("Error getting accident reports:", error);
      return res.status(500).json({ message: "Failed to get reports" });
    }
  });

  // Get single accident report
  app.get("/api/accident-reports/:id", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.getAccidentReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      return res.json(report);
    } catch (error) {
      console.error("Error getting accident report:", error);
      return res.status(500).json({ message: "Failed to get report" });
    }
  });

  // Admin: Get all accident reports
  app.get("/api/admin/accident-reports", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { status } = req.query;
      const reports = status
        ? await storage.getAccidentReportsByStatus(status as string)
        : await storage.getAllAccidentReports();
      return res.json(reports);
    } catch (error) {
      console.error("Error getting accident reports:", error);
      return res.status(500).json({ message: "Failed to get reports" });
    }
  });

  // Admin: Review accident report
  app.patch("/api/admin/accident-reports/:id/review", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { adminReviewStatus, adminNotes, insuranceClaimRef } = req.body;

      if (!adminReviewStatus) {
        return res.status(400).json({ message: "Review status is required" });
      }

      const updated = await storage.updateAccidentReport(req.params.id, {
        adminReviewStatus,
        adminNotes: adminNotes || null,
        insuranceClaimRef: insuranceClaimRef || null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      });

      if (!updated) {
        return res.status(404).json({ message: "Report not found" });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error reviewing accident report:", error);
      return res.status(500).json({ message: "Failed to review report" });
    }
  });

  // =============================================
  // INSURANCE PARTNERS
  // =============================================

  // Admin: Get all insurance partners
  app.get("/api/admin/insurance-partners", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const partners = await storage.getAllInsurancePartners();
      return res.json(partners);
    } catch (error) {
      console.error("Error getting insurance partners:", error);
      return res.status(500).json({ message: "Failed to get insurance partners" });
    }
  });

  // Admin: Get active insurance partners
  app.get("/api/insurance-partners/active", isAuthenticated, async (req, res) => {
    try {
      const partners = await storage.getActiveInsurancePartners();
      return res.json(partners);
    } catch (error) {
      console.error("Error getting active insurance partners:", error);
      return res.status(500).json({ message: "Failed to get partners" });
    }
  });

  // Admin: Create insurance partner
  app.post("/api/admin/insurance-partners", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { companyName, coverageType, contactEmail, contactPhone, claimUrl, apiEndpoint, activeRegions, notes } = req.body;
      if (!companyName || !coverageType) {
        return res.status(400).json({ message: "Company name and coverage type are required" });
      }
      const partner = await storage.createInsurancePartner({
        companyName,
        coverageType,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        claimUrl: claimUrl || null,
        apiEndpoint: apiEndpoint || null,
        activeRegions: activeRegions || null,
        notes: notes || null,
        isActive: true,
      });
      return res.status(201).json(partner);
    } catch (error) {
      console.error("Error creating insurance partner:", error);
      return res.status(500).json({ message: "Failed to create partner" });
    }
  });

  // Admin: Update insurance partner
  app.patch("/api/admin/insurance-partners/:id", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const updated = await storage.updateInsurancePartner(req.params.id, { ...req.body, updatedAt: new Date() });
      if (!updated) return res.status(404).json({ message: "Partner not found" });
      return res.json(updated);
    } catch (error) {
      console.error("Error updating insurance partner:", error);
      return res.status(500).json({ message: "Failed to update partner" });
    }
  });

  // Get insurance referrals for an accident report
  app.get("/api/insurance-referrals/:accidentReportId", isAuthenticated, async (req, res) => {
    try {
      const referrals = await storage.getInsuranceReferralsByAccident(req.params.accidentReportId);
      return res.json(referrals);
    } catch (error) {
      console.error("Error getting insurance referrals:", error);
      return res.status(500).json({ message: "Failed to get referrals" });
    }
  });

  // User opt-in to insurance referral
  app.post("/api/insurance-referrals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { accidentReportId, insurancePartnerId, referredUserRole } = req.body;
      if (!accidentReportId || !insurancePartnerId) {
        return res.status(400).json({ message: "Accident report ID and insurance partner ID are required" });
      }
      const referral = await storage.createInsuranceReferral({
        accidentReportId,
        insurancePartnerId,
        referredBy: userId,
        referredUserId: userId,
        referredUserRole: referredUserRole || "rider",
        status: "referred",
        userOptedIn: true,
      });
      return res.status(201).json(referral);
    } catch (error) {
      console.error("Error creating insurance referral:", error);
      return res.status(500).json({ message: "Failed to create referral" });
    }
  });

  // =============================================
  // DRIVER RELIEF FUND
  // =============================================

  // Admin: Get relief fund config
  app.get("/api/admin/relief-fund/config", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const config = await storage.getReliefFundConfig();
      return res.json(config || { totalPool: "0.00", cancellationFeePercent: 10, lostItemFeePercent: 5, currency: "NGN", isActive: true, minTrustScoreRequired: 50, maxPayoutPerClaim: "50000.00" });
    } catch (error) {
      console.error("Error getting relief fund config:", error);
      return res.status(500).json({ message: "Failed to get config" });
    }
  });

  // Admin: Update relief fund config
  app.post("/api/admin/relief-fund/config", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const config = await storage.upsertReliefFundConfig({ ...req.body, updatedBy: adminId });
      return res.json(config);
    } catch (error) {
      console.error("Error updating relief fund config:", error);
      return res.status(500).json({ message: "Failed to update config" });
    }
  });

  // Admin: Add manual contribution to relief fund
  app.post("/api/admin/relief-fund/contribute", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { amount, notes, currency } = req.body;
      if (!amount) return res.status(400).json({ message: "Amount is required" });
      const contribution = await storage.createReliefFundContribution({
        source: "admin_topup",
        amount,
        currency: currency || "NGN",
        contributedBy: adminId,
        notes: notes || null,
      });
      const config = await storage.getReliefFundConfig();
      if (config) {
        const newPool = (parseFloat(config.totalPool || "0") + parseFloat(amount)).toFixed(2);
        await storage.upsertReliefFundConfig({ ...config, totalPool: newPool, updatedBy: adminId });
      }
      return res.status(201).json(contribution);
    } catch (error) {
      console.error("Error contributing to relief fund:", error);
      return res.status(500).json({ message: "Failed to contribute" });
    }
  });

  // Admin: Get all contributions
  app.get("/api/admin/relief-fund/contributions", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const contributions = await storage.getAllReliefFundContributions();
      return res.json(contributions);
    } catch (error) {
      console.error("Error getting contributions:", error);
      return res.status(500).json({ message: "Failed to get contributions" });
    }
  });

  // Admin: Get all relief fund claims
  app.get("/api/admin/relief-fund/claims", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { status } = req.query;
      const claims = status
        ? await storage.getReliefFundClaimsByStatus(status as string)
        : await storage.getAllReliefFundClaims();
      return res.json(claims);
    } catch (error) {
      console.error("Error getting relief fund claims:", error);
      return res.status(500).json({ message: "Failed to get claims" });
    }
  });

  // Admin: Review relief fund claim
  app.patch("/api/admin/relief-fund/claims/:id", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { status, approvedAmount, reviewNotes, expectedPayoutDate, faultDetermination } = req.body;
      const updated = await storage.updateReliefFundClaim(req.params.id, {
        status,
        approvedAmount: approvedAmount || null,
        reviewedBy: adminId,
        reviewNotes: reviewNotes || null,
        expectedPayoutDate: expectedPayoutDate ? new Date(expectedPayoutDate) : null,
        faultDetermination: faultDetermination || null,
        updatedAt: new Date(),
      });
      if (!updated) return res.status(404).json({ message: "Claim not found" });
      return res.json(updated);
    } catch (error) {
      console.error("Error reviewing relief fund claim:", error);
      return res.status(500).json({ message: "Failed to review claim" });
    }
  });

  // Driver: Get my relief fund claims
  app.get("/api/relief-fund/my-claims", isAuthenticated, async (req, res) => {
    try {
      const driverId = req.user!.claims.sub;
      const claims = await storage.getReliefFundClaimsByDriver(driverId);
      return res.json(claims);
    } catch (error) {
      console.error("Error getting driver relief claims:", error);
      return res.status(500).json({ message: "Failed to get claims" });
    }
  });

  // Driver: Submit relief fund claim
  app.post("/api/relief-fund/claims", isAuthenticated, async (req, res) => {
    try {
      const driverId = req.user!.claims.sub;
      const { accidentReportId, requestedAmount } = req.body;
      if (!accidentReportId || !requestedAmount) {
        return res.status(400).json({ message: "Accident report ID and requested amount are required" });
      }
      const trustProfile = await storage.getUserTrustProfile(driverId);
      const claim = await storage.createReliefFundClaim({
        driverId,
        accidentReportId,
        requestedAmount,
        status: "pending",
        driverTrustScoreAtTime: trustProfile?.trustScore || 75,
      });
      return res.status(201).json(claim);
    } catch (error) {
      console.error("Error submitting relief fund claim:", error);
      return res.status(500).json({ message: "Failed to submit claim" });
    }
  });

  // =============================================
  // LOST ITEM FRAUD DETECTION
  // =============================================

  // Admin: Get all fraud signals
  app.get("/api/admin/lost-item-fraud", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const signals = await storage.getAllLostItemFraudSignals();
      return res.json(signals);
    } catch (error) {
      console.error("Error getting fraud signals:", error);
      return res.status(500).json({ message: "Failed to get fraud signals" });
    }
  });

  // Admin: Get fraud signals for a user
  app.get("/api/admin/lost-item-fraud/user/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const signals = await storage.getLostItemFraudSignalsByUser(req.params.userId);
      const riskScore = await storage.getUserLostItemRiskScore(req.params.userId);
      return res.json({ signals, riskScore });
    } catch (error) {
      console.error("Error getting user fraud signals:", error);
      return res.status(500).json({ message: "Failed to get fraud signals" });
    }
  });

  // Admin: Review fraud signal
  app.patch("/api/admin/lost-item-fraud/:id", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { adminNotes, autoResolved } = req.body;
      const updated = await storage.updateLostItemFraudSignal(req.params.id, {
        adminReviewed: true,
        adminReviewedBy: adminId,
        adminNotes: adminNotes || null,
        autoResolved: autoResolved || false,
      });
      if (!updated) return res.status(404).json({ message: "Signal not found" });
      return res.json(updated);
    } catch (error) {
      console.error("Error reviewing fraud signal:", error);
      return res.status(500).json({ message: "Failed to review signal" });
    }
  });

  // =============================================
  // PHASE 5: DISPUTES, REFUNDS & LEGAL RESOLUTION
  // =============================================

  // Check dispute eligibility for a trip
  app.get("/api/disputes/eligibility/:tripId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const role = await storage.getUserRole(userId);
      const initiatorRole = role?.role === "driver" ? "DRIVER" : "RIDER";

      const { checkDisputeEligibility } = await import("./dispute-guards");
      const result = await checkDisputeEligibility(req.params.tripId, userId, initiatorRole);

      return res.json(result);
    } catch (error) {
      console.error("Error checking dispute eligibility:", error);
      return res.status(500).json({ message: "Failed to check eligibility" });
    }
  });

  // File a dispute
  app.post("/api/disputes", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { tripId, accusedUserId, disputeType, description, evidenceMetadata } = req.body;

      if (!tripId || !accusedUserId || !disputeType || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const role = await storage.getUserRole(userId);
      const initiatorRole = role?.role === "driver" ? "DRIVER" : "RIDER";

      const { createDispute } = await import("./dispute-guards");
      const result = await createDispute(
        tripId,
        userId,
        initiatorRole,
        accusedUserId,
        disputeType,
        description,
        evidenceMetadata
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({
        success: true,
        disputeId: result.disputeId,
        autoFlagged: result.autoFlagged,
        message: "Dispute filed successfully",
      });
    } catch (error) {
      console.error("Error creating dispute:", error);
      return res.status(500).json({ message: "Failed to file dispute" });
    }
  });

  // Get my disputes (as initiator)
  app.get("/api/disputes/my", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const disputes = await storage.getPhase5DisputesByUser(userId);
      return res.json(disputes);
    } catch (error) {
      console.error("Error getting disputes:", error);
      return res.status(500).json({ message: "Failed to get disputes" });
    }
  });

  // Get disputes against me
  app.get("/api/disputes/against-me", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const disputes = await storage.getPhase5DisputesByAccused(userId);
      return res.json(disputes);
    } catch (error) {
      console.error("Error getting disputes:", error);
      return res.status(500).json({ message: "Failed to get disputes" });
    }
  });

  // Get dispute details
  app.get("/api/disputes/:disputeId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const dispute = await storage.getPhase5Dispute(req.params.disputeId);

      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      const isParty = dispute.initiatorUserId === userId || dispute.accusedUserId === userId;
      const role = await storage.getUserRole(userId);
      const isAdmin = role?.role === "admin" || role?.role === "super_admin";

      if (!isParty && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to view this dispute" });
      }

      return res.json(dispute);
    } catch (error) {
      console.error("Error getting dispute:", error);
      return res.status(500).json({ message: "Failed to get dispute" });
    }
  });

  // Get disputes for a trip
  app.get("/api/disputes/trip/:tripId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const trip = await storage.getTripById(req.params.tripId);

      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const isParty = trip.riderId === userId || trip.driverId === userId;
      const role = await storage.getUserRole(userId);
      const isAdmin = role?.role === "admin" || role?.role === "super_admin";

      if (!isParty && !isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const disputes = await storage.getPhase5DisputesByTrip(req.params.tripId);
      return res.json(disputes);
    } catch (error) {
      console.error("Error getting trip disputes:", error);
      return res.status(500).json({ message: "Failed to get disputes" });
    }
  });

  // Admin: Get open dispute queue
  app.get("/api/admin/disputes/queue", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { getDisputeQueue } = await import("./dispute-guards");
      const disputes = await getDisputeQueue();
      return res.json(disputes);
    } catch (error) {
      console.error("Error getting dispute queue:", error);
      return res.status(500).json({ message: "Failed to get dispute queue" });
    }
  });

  // Admin: Get disputes by status
  app.get("/api/admin/disputes/status/:status", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const disputes = await storage.getPhase5DisputesByStatus(req.params.status);
      return res.json(disputes);
    } catch (error) {
      console.error("Error getting disputes by status:", error);
      return res.status(500).json({ message: "Failed to get disputes" });
    }
  });

  // Admin: Review a dispute (assign to self)
  app.post("/api/admin/disputes/:disputeId/review", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;

      const { adminReviewDispute } = await import("./dispute-guards");
      const result = await adminReviewDispute(req.params.disputeId, adminId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Dispute is now under review" });
    } catch (error) {
      console.error("Error reviewing dispute:", error);
      return res.status(500).json({ message: "Failed to review dispute" });
    }
  });

  // Admin: Approve a dispute
  app.post("/api/admin/disputes/:disputeId/approve", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { notes, refundType, refundAmount } = req.body;

      if (!notes) {
        return res.status(400).json({ message: "Admin notes required" });
      }

      const { adminApproveDispute } = await import("./dispute-guards");
      const result = await adminApproveDispute(req.params.disputeId, adminId, notes, refundType, refundAmount);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Dispute resolved" });
    } catch (error) {
      console.error("Error approving dispute:", error);
      return res.status(500).json({ message: "Failed to approve dispute" });
    }
  });

  // Admin: Reject a dispute
  app.post("/api/admin/disputes/:disputeId/reject", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Rejection reason required" });
      }

      const { adminRejectDispute } = await import("./dispute-guards");
      const result = await adminRejectDispute(req.params.disputeId, adminId, reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Dispute rejected" });
    } catch (error) {
      console.error("Error rejecting dispute:", error);
      return res.status(500).json({ message: "Failed to reject dispute" });
    }
  });

  // Admin: Escalate a dispute to safety incident
  app.post("/api/admin/disputes/:disputeId/escalate", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Escalation reason required" });
      }

      const { adminEscalateDispute } = await import("./dispute-guards");
      const result = await adminEscalateDispute(req.params.disputeId, adminId, reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Dispute escalated to safety incident" });
    } catch (error) {
      console.error("Error escalating dispute:", error);
      return res.status(500).json({ message: "Failed to escalate dispute" });
    }
  });

  // Admin: Report a chargeback
  app.post("/api/admin/disputes/chargeback", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { userId, chargebackId } = req.body;

      if (!userId || !chargebackId) {
        return res.status(400).json({ message: "User ID and chargeback ID required" });
      }

      const { reportChargeback } = await import("./dispute-guards");
      const result = await reportChargeback(userId, chargebackId, adminId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Chargeback reported" });
    } catch (error) {
      console.error("Error reporting chargeback:", error);
      return res.status(500).json({ message: "Failed to report chargeback" });
    }
  });

  // Admin: Get user dispute profile
  app.get("/api/admin/disputes/user/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { getUserDisputeProfile } = await import("./dispute-guards");
      const profile = await getUserDisputeProfile(req.params.userId);
      return res.json(profile);
    } catch (error) {
      console.error("Error getting user dispute profile:", error);
      return res.status(500).json({ message: "Failed to get user dispute profile" });
    }
  });

  // Admin: Get dispute audit logs
  app.get("/api/admin/disputes/audit-logs", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { getDisputeAuditLogs } = await import("./dispute-guards");
      const logs = await getDisputeAuditLogs();
      return res.json(logs);
    } catch (error) {
      console.error("Error getting dispute audit logs:", error);
      return res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // Admin: Get dispute audit logs for specific dispute
  app.get("/api/admin/disputes/:disputeId/audit-logs", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const logs = await storage.getDisputeAuditLogsForDispute(req.params.disputeId);
      return res.json(logs);
    } catch (error) {
      console.error("Error getting dispute audit logs:", error);
      return res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // Admin: Get refunds for a dispute
  app.get("/api/admin/disputes/:disputeId/refunds", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const refunds = await storage.getPhase5RefundsByDispute(req.params.disputeId);
      return res.json(refunds);
    } catch (error) {
      console.error("Error getting refunds:", error);
      return res.status(500).json({ message: "Failed to get refunds" });
    }
  });

  // Admin: Process a pending refund
  app.post("/api/admin/disputes/refund/:refundId/process", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;

      const refund = await storage.getPhase5RefundOutcome(req.params.refundId);
      if (!refund) {
        return res.status(404).json({ message: "Refund not found" });
      }

      await storage.updatePhase5RefundStatus(req.params.refundId, "APPROVED", adminId);

      const { processRefund } = await import("./dispute-guards");
      const result = await processRefund(req.params.refundId, adminId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Refund processed" });
    } catch (error) {
      console.error("Error processing refund:", error);
      return res.status(500).json({ message: "Failed to process refund" });
    }
  });

  // Check if user is locked for chargebacks
  app.get("/api/disputes/chargeback-status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const isLocked = await storage.isUserLockedForChargebacks(userId);
      return res.json({ isLocked });
    } catch (error) {
      console.error("Error checking chargeback status:", error);
      return res.status(500).json({ message: "Failed to check status" });
    }
  });

  // =============================================
  // COMPLIANCE & STORE READINESS ENDPOINTS
  // =============================================

  // Public: Get active legal documents (pre-signup accessible)
  app.get("/api/legal", async (req, res) => {
    try {
      const docs = await storage.getActiveLegalDocuments();
      return res.json(docs);
    } catch (error) {
      console.error("Error getting legal documents:", error);
      return res.status(500).json({ message: "Failed to get legal documents" });
    }
  });

  // Public: Get specific legal document by type
  app.get("/api/legal/:documentType", async (req, res) => {
    try {
      const doc = await storage.getActiveLegalDocumentByType(req.params.documentType);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      return res.json(doc);
    } catch (error) {
      console.error("Error getting legal document:", error);
      return res.status(500).json({ message: "Failed to get legal document" });
    }
  });

  // User: Get my consents
  app.get("/api/consents/my", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const consents = await storage.getUserConsents(userId);
      return res.json(consents);
    } catch (error) {
      console.error("Error getting consents:", error);
      return res.status(500).json({ message: "Failed to get consents" });
    }
  });

  // User: Check required consents status
  app.get("/api/consents/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const role = await storage.getUserRole(userId);
      const { checkRequiredConsents } = await import("./compliance-guards");
      const status = await checkRequiredConsents(userId, role?.role || "rider");
      return res.json(status);
    } catch (error) {
      console.error("Error checking consent status:", error);
      return res.status(500).json({ message: "Failed to check consent status" });
    }
  });

  // User: Grant consent
  app.post("/api/consents/grant", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { consentType } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get("User-Agent");

      if (!consentType) {
        return res.status(400).json({ message: "Consent type is required" });
      }

      const { grantConsent } = await import("./compliance-guards");
      const result = await grantConsent(userId, consentType, ipAddress, userAgent);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, consentId: result.consentId });
    } catch (error) {
      console.error("Error granting consent:", error);
      return res.status(500).json({ message: "Failed to grant consent" });
    }
  });

  // User: Grant all required consents
  app.post("/api/consents/grant-all", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const ipAddress = req.ip;
      const userAgent = req.get("User-Agent");
      const role = await storage.getUserRole(userId);

      const { grantAllRequiredConsents } = await import("./compliance-guards");
      const result = await grantAllRequiredConsents(userId, role?.role || "rider", ipAddress, userAgent);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "All required consents granted" });
    } catch (error) {
      console.error("Error granting all consents:", error);
      return res.status(500).json({ message: "Failed to grant consents" });
    }
  });

  // User: Revoke consent
  app.post("/api/consents/revoke", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { consentType } = req.body;
      const ipAddress = req.ip;

      if (!consentType) {
        return res.status(400).json({ message: "Consent type is required" });
      }

      const { revokeConsent } = await import("./compliance-guards");
      const result = await revokeConsent(userId, consentType, ipAddress);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "Consent revoked" });
    } catch (error) {
      console.error("Error revoking consent:", error);
      return res.status(500).json({ message: "Failed to revoke consent" });
    }
  });

  // User: Confirm first use compliance
  app.post("/api/compliance/first-use", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const ipAddress = req.ip;
      const { deviceInfo } = req.body;

      const { confirmFirstUseCompliance } = await import("./compliance-guards");
      const result = await confirmFirstUseCompliance(userId, ipAddress, deviceInfo);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "First use confirmed" });
    } catch (error) {
      console.error("Error confirming first use:", error);
      return res.status(500).json({ message: "Failed to confirm first use" });
    }
  });

  // Public: Get store metadata (for app store submission)
  app.get("/api/compliance/store-metadata", async (req, res) => {
    try {
      const { getStoreMetadata } = await import("./compliance-guards");
      return res.json(getStoreMetadata());
    } catch (error) {
      console.error("Error getting store metadata:", error);
      return res.status(500).json({ message: "Failed to get store metadata" });
    }
  });

  // Public: Get readiness summary
  app.get("/api/compliance/readiness", async (req, res) => {
    try {
      const { getFullReadinessSummary } = await import("./compliance-guards");
      return res.json(getFullReadinessSummary());
    } catch (error) {
      console.error("Error getting readiness summary:", error);
      return res.status(500).json({ message: "Failed to get readiness summary" });
    }
  });

  // SUPER_ADMIN: Get full system readiness report
  app.get("/api/admin/compliance/readiness-report", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const { getSystemReadinessReport } = await import("./compliance-guards");
      const report = await getSystemReadinessReport();
      return res.json(report);
    } catch (error) {
      console.error("Error getting readiness report:", error);
      return res.status(500).json({ message: "Failed to get readiness report" });
    }
  });

  // SUPER_ADMIN: Toggle launch mode
  app.post("/api/admin/compliance/launch-mode", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { mode, value } = req.body;

      if (!mode || typeof value !== "boolean") {
        return res.status(400).json({ message: "Mode and boolean value are required" });
      }

      const { toggleLaunchMode } = await import("./compliance-guards");
      const result = await toggleLaunchMode(mode, value, adminId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: `${mode} set to ${value}` });
    } catch (error) {
      console.error("Error toggling launch mode:", error);
      return res.status(500).json({ message: "Failed to toggle launch mode" });
    }
  });

  // SUPER_ADMIN: Get all kill switch states
  app.get("/api/admin/compliance/kill-switches", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const states = await storage.getAllKillSwitchStates();
      return res.json(states);
    } catch (error) {
      console.error("Error getting kill switch states:", error);
      return res.status(500).json({ message: "Failed to get kill switch states" });
    }
  });

  // SUPER_ADMIN: Activate kill switch
  app.post("/api/admin/compliance/kill-switch/activate", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { switchName, reason } = req.body;

      if (!switchName || !reason) {
        return res.status(400).json({ message: "Switch name and reason are required" });
      }

      const { activateKillSwitch } = await import("./compliance-guards");
      const result = await activateKillSwitch(switchName, reason, adminId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: `Kill switch ${switchName} activated` });
    } catch (error) {
      console.error("Error activating kill switch:", error);
      return res.status(500).json({ message: "Failed to activate kill switch" });
    }
  });

  // SUPER_ADMIN: Deactivate kill switch
  app.post("/api/admin/compliance/kill-switch/deactivate", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { switchName } = req.body;

      if (!switchName) {
        return res.status(400).json({ message: "Switch name is required" });
      }

      const { deactivateKillSwitch } = await import("./compliance-guards");
      const result = await deactivateKillSwitch(switchName, adminId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: `Kill switch ${switchName} deactivated` });
    } catch (error) {
      console.error("Error deactivating kill switch:", error);
      return res.status(500).json({ message: "Failed to deactivate kill switch" });
    }
  });

  // SUPER_ADMIN: Get all test users
  app.get("/api/admin/compliance/test-users", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const testUsers = await storage.getAllTestUsers();
      return res.json(testUsers);
    } catch (error) {
      console.error("Error getting test users:", error);
      return res.status(500).json({ message: "Failed to get test users" });
    }
  });

  // SUPER_ADMIN: Mark user as test user
  app.post("/api/admin/compliance/test-user/mark", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const { markAsTestUser } = await import("./compliance-guards");
      const result = await markAsTestUser(userId, adminId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "User marked as test user" });
    } catch (error) {
      console.error("Error marking test user:", error);
      return res.status(500).json({ message: "Failed to mark test user" });
    }
  });

  // SUPER_ADMIN: Unmark user as test user
  app.post("/api/admin/compliance/test-user/unmark", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const { unmarkAsTestUser } = await import("./compliance-guards");
      const result = await unmarkAsTestUser(userId, adminId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      return res.json({ success: true, message: "User unmarked as test user" });
    } catch (error) {
      console.error("Error unmarking test user:", error);
      return res.status(500).json({ message: "Failed to unmark test user" });
    }
  });

  // SUPER_ADMIN: Get compliance audit logs
  app.get("/api/admin/compliance/audit-logs", isAuthenticated, requireRole(["super_admin", "admin"]), async (req, res) => {
    try {
      const { category, limit } = req.query;
      const { getComplianceAuditLogsForExport } = await import("./compliance-guards");
      const logs = await getComplianceAuditLogsForExport({
        category: category as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      return res.json(logs);
    } catch (error) {
      console.error("Error getting compliance audit logs:", error);
      return res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // SUPER_ADMIN: Export audit logs (for regulators)
  app.get("/api/admin/compliance/audit-logs/export", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const { category, format } = req.query;
      const { getComplianceAuditLogsForExport } = await import("./compliance-guards");
      const logs = await getComplianceAuditLogsForExport({
        category: category as string | undefined,
      });

      if (format === "csv") {
        const headers = "ID,Category,User ID,Action By,Event Type,Created At\n";
        const rows = logs.map(l => 
          `${l.id},${l.category},${l.userId || ""},${l.actionBy || ""},${l.eventType},${l.createdAt}`
        ).join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="compliance_audit_${new Date().toISOString().split("T")[0]}.csv"`);
        return res.send(headers + rows);
      }

      return res.json({ data: logs, exportedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error exporting audit logs:", error);
      return res.status(500).json({ message: "Failed to export audit logs" });
    }
  });

  // SUPER_ADMIN: Create legal document
  app.post("/api/admin/compliance/legal-documents", isAuthenticated, requireRole(["super_admin"]), async (req, res) => {
    try {
      const adminId = req.user!.claims.sub;
      const { documentType, version, title, content, effectiveDate } = req.body;

      if (!documentType || !version || !title || !content || !effectiveDate) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const doc = await storage.createLegalDocument({
        documentType,
        version,
        title,
        content,
        effectiveDate: new Date(effectiveDate),
        createdBy: adminId,
      });

      await storage.createComplianceAuditLog({
        category: "ADMIN_ACTION",
        actionBy: adminId,
        actionByRole: "super_admin",
        eventType: "LEGAL_DOCUMENT_CREATED",
        eventData: JSON.stringify({ documentType, version }),
      });

      return res.json({ success: true, document: doc });
    } catch (error) {
      console.error("Error creating legal document:", error);
      return res.status(500).json({ message: "Failed to create legal document" });
    }
  });

  // Check if user is a test user
  app.get("/api/compliance/test-mode", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const { isTestUser } = await import("./compliance-guards");
      const isTest = await isTestUser(userId);
      return res.json({ isTestUser: isTest });
    } catch (error) {
      console.error("Error checking test mode:", error);
      return res.status(500).json({ message: "Failed to check test mode" });
    }
  });

  // =============================================
  // PHASE 3: ADMIN OVERRIDE CONTROL & SUPPORT SAFETY
  // =============================================

  const VALID_OVERRIDE_ACTIONS = [
    "FORCE_LOGOUT", "RESET_SESSION", "RESTORE_AUTO_LOGIN",
    "ENABLE_DRIVER_ONLINE", "DISABLE_DRIVER_ONLINE",
    "CLEAR_CANCELLATION_FLAGS", "RESTORE_DRIVER_ACCESS",
    "CLEAR_RIDER_CANCELLATION_WARNING", "RESTORE_RIDE_ACCESS"
  ];

  app.post("/api/admin/override/apply", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { targetUserId, actionType, overrideReason, overrideExpiresAt } = req.body;

      if (!targetUserId || !actionType || !overrideReason) {
        return res.status(400).json({ message: "targetUserId, actionType, and overrideReason are required" });
      }

      if (!VALID_OVERRIDE_ACTIONS.includes(actionType)) {
        return res.status(400).json({ message: `Invalid actionType. Allowed: ${VALID_OVERRIDE_ACTIONS.join(", ")}` });
      }

      let previousState: string | null = null;
      let newState: string | null = null;

      switch (actionType) {
        case "FORCE_LOGOUT": {
          previousState = JSON.stringify({ action: "FORCE_LOGOUT", note: "Session override recorded" });
          newState = JSON.stringify({ action: "FORCE_LOGOUT", status: "active" });
          break;
        }
        case "RESET_SESSION": {
          previousState = JSON.stringify({ action: "RESET_SESSION", note: "Session reset override recorded" });
          newState = JSON.stringify({ action: "RESET_SESSION", status: "active" });
          break;
        }
        case "RESTORE_AUTO_LOGIN": {
          previousState = JSON.stringify({ action: "RESTORE_AUTO_LOGIN", note: "Auto-login restore recorded" });
          newState = JSON.stringify({ action: "RESTORE_AUTO_LOGIN", status: "active" });
          break;
        }
        case "ENABLE_DRIVER_ONLINE": {
          const driverProfile = await storage.getDriverProfile(targetUserId);
          previousState = JSON.stringify({ isOnline: driverProfile?.isOnline ?? false });
          await storage.updateDriverOnlineStatus(targetUserId, true);
          newState = JSON.stringify({ isOnline: true });
          break;
        }
        case "DISABLE_DRIVER_ONLINE": {
          const driverProfile = await storage.getDriverProfile(targetUserId);
          previousState = JSON.stringify({ isOnline: driverProfile?.isOnline ?? true });
          await storage.updateDriverOnlineStatus(targetUserId, false);
          newState = JSON.stringify({ isOnline: false });
          break;
        }
        case "CLEAR_CANCELLATION_FLAGS": {
          previousState = JSON.stringify({ action: "CLEAR_CANCELLATION_FLAGS", note: "Cancellation flags cleared" });
          newState = JSON.stringify({ action: "CLEAR_CANCELLATION_FLAGS", status: "active" });
          break;
        }
        case "RESTORE_DRIVER_ACCESS": {
          const suspension = await storage.getActiveSuspensionForUser(targetUserId);
          previousState = JSON.stringify({ suspensionId: suspension?.id ?? null, suspended: !!suspension });
          if (suspension) {
            await storage.liftSuspension(suspension.id, adminId, `Admin override: ${overrideReason}`);
          }
          newState = JSON.stringify({ suspended: false, liftedSuspensionId: suspension?.id ?? null });
          break;
        }
        case "CLEAR_RIDER_CANCELLATION_WARNING": {
          previousState = JSON.stringify({ action: "CLEAR_RIDER_CANCELLATION_WARNING", note: "Rider cancellation warning suppressed" });
          newState = JSON.stringify({ action: "CLEAR_RIDER_CANCELLATION_WARNING", status: "active" });
          break;
        }
        case "RESTORE_RIDE_ACCESS": {
          const rideSuspension = await storage.getActiveSuspensionForUser(targetUserId);
          previousState = JSON.stringify({ suspensionId: rideSuspension?.id ?? null, suspended: !!rideSuspension });
          if (rideSuspension) {
            await storage.liftSuspension(rideSuspension.id, adminId, `Admin override: ${overrideReason}`);
          }
          newState = JSON.stringify({ suspended: false, liftedSuspensionId: rideSuspension?.id ?? null });
          break;
        }
      }

      const override = await storage.createAdminOverride({
        targetUserId,
        adminActorId: adminId,
        actionType,
        overrideReason,
        overrideExpiresAt: overrideExpiresAt ? new Date(overrideExpiresAt) : undefined,
        previousState,
        newState,
      });

      await storage.createAdminOverrideAuditLog({
        overrideId: override.id,
        adminActorId: adminId,
        affectedUserId: targetUserId,
        actionType,
        overrideReason,
        previousState,
        newState,
        metadata: JSON.stringify({ expiresAt: overrideExpiresAt || null }),
      });

      console.log(`[ADMIN OVERRIDE] ${actionType} applied to user ${targetUserId} by admin ${adminId}`);
      return res.json({ success: true, override });
    } catch (error) {
      console.error("Error applying admin override:", error);
      return res.status(500).json({ message: "Failed to apply admin override" });
    }
  });

  app.get("/api/admin/overrides/active", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const overrides = await storage.getAllActiveOverrides();
      return res.json(overrides);
    } catch (error) {
      console.error("Error fetching active overrides:", error);
      return res.status(500).json({ message: "Failed to fetch active overrides" });
    }
  });

  app.get("/api/admin/overrides/user/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const overrides = await storage.getOverrideHistory(userId);
      return res.json(overrides);
    } catch (error) {
      console.error("Error fetching user override history:", error);
      return res.status(500).json({ message: "Failed to fetch override history" });
    }
  });

  app.post("/api/admin/override/:overrideId/revert", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { overrideId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Revert reason is required" });
      }

      const existing = await storage.getAdminOverride(overrideId);
      if (!existing) {
        return res.status(404).json({ message: "Override not found" });
      }
      if (existing.status !== "active") {
        return res.status(400).json({ message: `Cannot revert override with status: ${existing.status}` });
      }

      let revertNewState: string | null = null;

      switch (existing.actionType) {
        case "ENABLE_DRIVER_ONLINE": {
          const prev = existing.previousState ? JSON.parse(existing.previousState) : {};
          await storage.updateDriverOnlineStatus(existing.targetUserId, prev.isOnline ?? false);
          revertNewState = JSON.stringify({ isOnline: prev.isOnline ?? false, reverted: true });
          break;
        }
        case "DISABLE_DRIVER_ONLINE": {
          const prev = existing.previousState ? JSON.parse(existing.previousState) : {};
          await storage.updateDriverOnlineStatus(existing.targetUserId, prev.isOnline ?? true);
          revertNewState = JSON.stringify({ isOnline: prev.isOnline ?? true, reverted: true });
          break;
        }
        default: {
          revertNewState = JSON.stringify({ reverted: true, note: "Override flag removed" });
          break;
        }
      }

      const reverted = await storage.revertAdminOverride(overrideId, adminId, reason);

      await storage.createAdminOverrideAuditLog({
        overrideId,
        adminActorId: adminId,
        affectedUserId: existing.targetUserId,
        actionType: existing.actionType,
        overrideReason: `REVERT: ${reason}`,
        previousState: existing.newState,
        newState: revertNewState,
        metadata: JSON.stringify({ revertedAt: new Date().toISOString() }),
      });

      console.log(`[ADMIN OVERRIDE] Override ${overrideId} reverted by admin ${adminId}`);
      return res.json({ success: true, override: reverted });
    } catch (error) {
      console.error("Error reverting admin override:", error);
      return res.status(500).json({ message: "Failed to revert admin override" });
    }
  });

  app.get("/api/admin/overrides/audit-log", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const logs = await storage.getAdminOverrideAuditLogs();
      return res.json(logs);
    } catch (error) {
      console.error("Error fetching override audit logs:", error);
      return res.status(500).json({ message: "Failed to fetch override audit logs" });
    }
  });

  app.get("/api/admin/overrides/audit-log/:userId", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const logs = await storage.getAdminOverrideAuditLogs(userId);
      return res.json(logs);
    } catch (error) {
      console.error("Error fetching user override audit logs:", error);
      return res.status(500).json({ message: "Failed to fetch user override audit logs" });
    }
  });

  // Phase 4 - User Analytics: Session heartbeat + Growth Analytics API
  app.post("/api/analytics/session-heartbeat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const roles = await storage.getAllUserRoles(userId);
      for (const userRole of roles) {
        await storage.updateUserSession(userId, userRole.role);
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error("Error recording session heartbeat:", error);
      return res.status(500).json({ message: "Failed to record session" });
    }
  });

  app.get("/api/analytics/user-growth", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const data = await storage.getUserGrowthAnalytics();
      return res.json(data);
    } catch (error) {
      console.error("Error fetching user growth analytics:", error);
      return res.status(500).json({ message: "Failed to fetch user growth analytics" });
    }
  });

  // Admin Override Auto-Expiration Scheduler
  setInterval(async () => {
    try {
      const expiredCount = await storage.expireOverrides();
      if (expiredCount > 0) {
        console.log(`[OVERRIDE SCHEDULER] Expired ${expiredCount} admin overrides`);
      }
    } catch (error) {
      console.error("[OVERRIDE SCHEDULER] Error expiring overrides:", error);
    }
  }, 60000);
  console.log("[OVERRIDE SCHEDULER] Started — polling every 60s for expired overrides");

  // =============================================
  // PHASE 6: LAUNCH READINESS & SAFETY KILL-SWITCHES
  // =============================================

  // Get launch readiness status
  app.get("/api/admin/launch/readiness", isAuthenticated, requireRole(["super_admin", "admin", "director"]), async (req: any, res) => {
    try {
      const { getLaunchReadinessStatus } = await import("./launch-control");
      const countryCode = (req.query.countryCode as string) || "NG";
      const status = await getLaunchReadinessStatus(countryCode);
      return res.json(status);
    } catch (error) {
      console.error("Error getting launch readiness:", error);
      return res.status(500).json({ message: "Failed to get launch readiness status" });
    }
  });

  // Get state launch configs for a country
  app.get("/api/admin/launch/states", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const countryCode = (req.query.countryCode as string) || "NG";
      const states = await storage.getStateLaunchConfigsByCountry(countryCode);
      return res.json(states);
    } catch (error) {
      console.error("Error getting state configs:", error);
      return res.status(500).json({ message: "Failed to get state configs" });
    }
  });

  // Toggle state enabled/disabled
  app.post("/api/admin/launch/state/toggle", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { stateCode, countryCode, enabled } = req.body;
      if (!stateCode) return res.status(400).json({ message: "stateCode is required" });

      const cc = countryCode || "NG";
      const updated = await storage.updateStateLaunchConfig(stateCode, cc, {
        stateEnabled: enabled,
        lastUpdatedBy: adminId,
      });

      if (!updated) {
        return res.status(404).json({ message: "State config not found" });
      }

      await storage.createComplianceAuditLog({
        category: "LAUNCH_MODE_CHANGE",
        actionBy: adminId,
        eventType: `STATE_${enabled ? "ENABLED" : "DISABLED"}`,
        eventData: JSON.stringify({ stateCode, countryCode: cc }),
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error toggling state:", error);
      return res.status(500).json({ message: "Failed to toggle state" });
    }
  });

  // Update state launch config (thresholds, wait times, etc.)
  app.patch("/api/admin/launch/state/:stateCode", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { stateCode } = req.params;
      const countryCode = req.body.countryCode || "NG";
      const { minOnlineDriversCar, minOnlineDriversBike, minOnlineDriversKeke, maxPickupWaitMinutes, autoDisableOnWaitExceed } = req.body;

      const updateData: any = { lastUpdatedBy: adminId };
      if (minOnlineDriversCar !== undefined) updateData.minOnlineDriversCar = minOnlineDriversCar;
      if (minOnlineDriversBike !== undefined) updateData.minOnlineDriversBike = minOnlineDriversBike;
      if (minOnlineDriversKeke !== undefined) updateData.minOnlineDriversKeke = minOnlineDriversKeke;
      if (maxPickupWaitMinutes !== undefined) updateData.maxPickupWaitMinutes = maxPickupWaitMinutes;
      if (autoDisableOnWaitExceed !== undefined) updateData.autoDisableOnWaitExceed = autoDisableOnWaitExceed;

      const updated = await storage.updateStateLaunchConfig(stateCode, countryCode, updateData);
      if (!updated) return res.status(404).json({ message: "State config not found" });

      return res.json(updated);
    } catch (error) {
      console.error("Error updating state config:", error);
      return res.status(500).json({ message: "Failed to update state config" });
    }
  });

  // Toggle country enabled/disabled
  app.post("/api/admin/launch/country/toggle", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { countryCode, enabled } = req.body;
      if (!countryCode) return res.status(400).json({ message: "countryCode is required" });

      const country = await storage.getCountryByCode(countryCode);
      if (!country) return res.status(404).json({ message: "Country not found" });

      await storage.updateCountry(country.id, { countryEnabled: enabled });

      await storage.createComplianceAuditLog({
        category: "LAUNCH_MODE_CHANGE",
        actionBy: adminId,
        eventType: `COUNTRY_${enabled ? "ENABLED" : "DISABLED"}`,
        eventData: JSON.stringify({ countryCode }),
      });

      return res.json({ success: true, countryCode, enabled });
    } catch (error) {
      console.error("Error toggling country:", error);
      return res.status(500).json({ message: "Failed to toggle country" });
    }
  });

  // Get all countries for launch control
  app.get("/api/admin/launch/countries", isAuthenticated, requireRole(["super_admin", "admin", "director"]), async (req: any, res) => {
    try {
      const countries = await storage.getCountriesForLaunch();
      return res.json(countries);
    } catch (error) {
      console.error("Error getting countries:", error);
      return res.status(500).json({ message: "Failed to get countries" });
    }
  });

  app.post("/api/admin/launch/country/create", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { name, isoCode, currency, timezone, subregionType, subregions } = req.body;

      if (!name || !isoCode || !currency || !timezone) {
        return res.status(400).json({ message: "Name, ISO code, currency, and timezone are required" });
      }

      if (isoCode.length < 2 || isoCode.length > 3) {
        return res.status(400).json({ message: "ISO code must be 2-3 characters" });
      }

      const existing = await storage.getCountryByCode(isoCode.toUpperCase());
      if (existing) {
        return res.status(409).json({ message: `Country with code ${isoCode.toUpperCase()} already exists` });
      }

      const country = await storage.createCountry({
        name,
        isoCode: isoCode.toUpperCase(),
        currency: currency.toUpperCase(),
        timezone,
        active: true,
        countryEnabled: false,
        defaultSystemMode: "NORMAL",
        paymentsEnabled: false,
      } as any);

      if (subregions && Array.isArray(subregions) && subregions.length > 0) {
        const srType = subregionType || "state";
        for (const sub of subregions) {
          if (sub.code && sub.name) {
            await storage.createStateLaunchConfig({
              countryCode: isoCode.toUpperCase(),
              stateCode: sub.code.toUpperCase(),
              stateName: sub.name,
              subregionType: srType,
              stateEnabled: false,
              minOnlineDriversCar: 3,
              minOnlineDriversBike: 2,
              minOnlineDriversKeke: 1,
              maxPickupWaitMinutes: 15,
              autoDisableOnWaitExceed: true,
            });
          }
        }
      }

      await storage.createComplianceAuditLog({
        category: "LAUNCH_MODE_CHANGE",
        actionBy: adminId,
        eventType: "COUNTRY_CREATED",
        eventData: JSON.stringify({ isoCode: isoCode.toUpperCase(), name, subregionCount: subregions?.length || 0 }),
      });

      return res.json({ success: true, country });
    } catch (error: any) {
      console.error("Error creating country:", error);
      return res.status(500).json({ message: error.message || "Failed to create country" });
    }
  });

  app.post("/api/admin/launch/country/add-subregion", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const { countryCode, stateCode, stateName, subregionType } = req.body;
      if (!countryCode || !stateCode || !stateName) {
        return res.status(400).json({ message: "countryCode, stateCode, and stateName are required" });
      }

      const existing = await storage.getStateLaunchConfig(stateCode.toUpperCase(), countryCode.toUpperCase());
      if (existing) {
        return res.status(409).json({ message: `Subregion ${stateCode} already exists for ${countryCode}` });
      }

      const config = await storage.createStateLaunchConfig({
        countryCode: countryCode.toUpperCase(),
        stateCode: stateCode.toUpperCase(),
        stateName,
        subregionType: subregionType || "state",
        stateEnabled: false,
        minOnlineDriversCar: 3,
        minOnlineDriversBike: 2,
        minOnlineDriversKeke: 1,
        maxPickupWaitMinutes: 15,
        autoDisableOnWaitExceed: true,
      });

      return res.json({ success: true, config });
    } catch (error: any) {
      console.error("Error adding subregion:", error);
      return res.status(500).json({ message: error.message || "Failed to add subregion" });
    }
  });

  // Set country-specific system mode
  app.post("/api/admin/launch/country/system-mode", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { countryCode, mode, reason } = req.body;
      if (!countryCode || !mode) return res.status(400).json({ message: "countryCode and mode are required" });
      if (!["NORMAL", "LIMITED", "EMERGENCY"].includes(mode)) {
        return res.status(400).json({ message: "Valid mode (NORMAL, LIMITED, EMERGENCY) is required" });
      }

      const result = await storage.setCountrySystemMode(countryCode, mode, reason || "", adminId);
      if (!result) return res.status(404).json({ message: "Country not found" });

      await storage.createComplianceAuditLog({
        category: "LAUNCH_MODE_CHANGE",
        actionBy: adminId,
        eventType: "COUNTRY_SYSTEM_MODE_CHANGE",
        eventData: JSON.stringify({ countryCode, mode, reason }),
      });

      return res.json(result);
    } catch (error) {
      console.error("Error setting country system mode:", error);
      return res.status(500).json({ message: "Failed to set country system mode" });
    }
  });

  // Get/Set system mode
  app.get("/api/admin/launch/system-mode", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const mode = await storage.getCurrentSystemMode();
      return res.json(mode || { currentMode: "NORMAL", reason: null });
    } catch (error) {
      console.error("Error getting system mode:", error);
      return res.status(500).json({ message: "Failed to get system mode" });
    }
  });

  app.post("/api/admin/launch/system-mode", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { mode, reason } = req.body;
      if (!mode || !["NORMAL", "LIMITED", "EMERGENCY"].includes(mode)) {
        return res.status(400).json({ message: "Valid mode (NORMAL, LIMITED, EMERGENCY) is required" });
      }

      const result = await storage.setSystemMode(mode, reason || "", adminId);

      await storage.createComplianceAuditLog({
        category: "LAUNCH_MODE_CHANGE",
        actionBy: adminId,
        eventType: "SYSTEM_MODE_CHANGE",
        eventData: JSON.stringify({ mode, reason }),
      });

      return res.json(result);
    } catch (error) {
      console.error("Error setting system mode:", error);
      return res.status(500).json({ message: "Failed to set system mode" });
    }
  });

  // Enhanced kill switch routes (Phase 6 additions)
  app.get("/api/admin/launch/kill-switches", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const states = await storage.getAllKillSwitchStates();
      return res.json(states);
    } catch (error) {
      console.error("Error getting kill switches:", error);
      return res.status(500).json({ message: "Failed to get kill switches" });
    }
  });

  app.post("/api/admin/launch/kill-switch/toggle", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { switchName, activate, reason, scope, countryCode, subregionCode } = req.body;
      if (!switchName) return res.status(400).json({ message: "switchName is required" });

      const switchScope = scope || "GLOBAL";
      let result;
      if (activate) {
        result = await storage.activateScopedKillSwitch(
          switchName, switchScope, reason || "Activated via Launch Control", adminId,
          countryCode || undefined, subregionCode || undefined
        );
      } else {
        result = await storage.deactivateScopedKillSwitch(
          switchName, switchScope, adminId,
          countryCode || undefined, subregionCode || undefined
        );
      }

      await storage.createComplianceAuditLog({
        category: "KILL_SWITCH_TOGGLE",
        actionBy: adminId,
        eventType: activate ? "KILL_SWITCH_ACTIVATED" : "KILL_SWITCH_DEACTIVATED",
        eventData: JSON.stringify({ switchName, reason, scope: switchScope, countryCode, subregionCode }),
      });

      return res.json({ success: true, state: result });
    } catch (error) {
      console.error("Error toggling kill switch:", error);
      return res.status(500).json({ message: "Failed to toggle kill switch" });
    }
  });

  // Seed all countries, subregions, and kill switches on startup
  (async () => {
    try {
      const { seedCountryLaunch } = await import("./launch-control");
      await seedCountryLaunch();
      console.log("[LAUNCH CONTROL] Seeded countries, subregions, and kill switches for all markets");
    } catch (error) {
      console.error("[LAUNCH CONTROL] Error seeding launch data:", error);
    }
  })();

  (async () => {
    try {
      await storage.seedDefaultCountryTaxConfigs();
      console.log("[TAX COMPLIANCE] Seeded default country tax configurations");
    } catch (error) {
      console.error("[TAX COMPLIANCE] Error seeding tax configs:", error);
    }
  })();

  // Public endpoint - check if service available in area
  app.get("/api/launch/check", async (req, res) => {
    try {
      const { checkTripRequestAllowed } = await import("./launch-control");
      const countryCode = (req.query.countryCode as string) || "NG";
      const stateCode = req.query.stateCode as string;
      const result = await checkTripRequestAllowed(countryCode, stateCode);
      return res.json(result);
    } catch (error) {
      console.error("Error checking launch status:", error);
      return res.json({ allowed: false, reason: "Unable to verify service availability." });
    }
  });

  // =============================================
  // PHASE 8: ROLLOUT MANAGEMENT ENDPOINTS
  // =============================================

  const ROLLOUT_ORDER = ["PLANNED", "PREP", "PILOT", "LIMITED_LIVE", "FULL_LIVE"] as const;

  app.post("/api/admin/rollout/promote", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { countryCode, reason } = req.body;
      if (!countryCode) return res.status(400).json({ message: "countryCode is required" });

      const country = await storage.getCountryByCode(countryCode);
      if (!country) return res.status(404).json({ message: "Country not found" });

      const currentStatus = country.rolloutStatus || "PLANNED";
      const currentIdx = ROLLOUT_ORDER.indexOf(currentStatus as any);
      if (currentIdx === -1 || currentStatus === "PAUSED") {
        return res.status(400).json({ message: `Cannot promote from status: ${currentStatus}. Unpause first.` });
      }
      if (currentIdx >= ROLLOUT_ORDER.length - 1) {
        return res.status(400).json({ message: "Country is already at FULL_LIVE stage" });
      }

      const nextStatus = ROLLOUT_ORDER[currentIdx + 1];

      if (nextStatus === "PILOT") {
        if (!country.currency) {
          return res.status(400).json({ message: "Gate check failed: Country must have a currency configured" });
        }
        const subregions = await storage.getStateLaunchConfigsByCountry(countryCode);
        if (!subregions || subregions.length === 0) {
          return res.status(400).json({ message: "Gate check failed: At least 1 subregion must be configured" });
        }
        const { isScopedKillSwitchActive } = await import("./launch-control");
        const killActive = await isScopedKillSwitchActive("KILL_TRIP_REQUESTS", countryCode);
        if (killActive) {
          return res.status(400).json({ message: "Gate check failed: Kill switches must not be active for the country" });
        }
      }

      if (nextStatus === "LIMITED_LIVE") {
        const tripStats = await db.select({
          total: count(),
          completed: sql<number>`count(*) filter (where ${trips.status} = 'completed')`,
          cancelled: sql<number>`count(*) filter (where ${trips.status} = 'cancelled')`,
        }).from(trips).where(eq(trips.countryId, country.id));

        const stats = tripStats[0];
        const totalTrips = Number(stats?.total || 0);
        if (totalTrips > 0) {
          const completionRate = (Number(stats.completed) / totalTrips) * 100;
          const cancellationRate = (Number(stats.cancelled) / totalTrips) * 100;
          if (completionRate < (country.minTripCompletionRate || 80)) {
            return res.status(400).json({ message: `Gate check failed: Trip completion rate ${completionRate.toFixed(1)}% is below threshold ${country.minTripCompletionRate}%` });
          }
          if (cancellationRate > (country.maxCancellationRate || 20)) {
            return res.status(400).json({ message: `Gate check failed: Cancellation rate ${cancellationRate.toFixed(1)}% exceeds threshold ${country.maxCancellationRate}%` });
          }
        }

        if (country.lastIncidentAt) {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (new Date(country.lastIncidentAt) > sevenDaysAgo) {
            return res.status(400).json({ message: "Gate check failed: An incident occurred within the last 7 days" });
          }
        }
      }

      if (nextStatus === "FULL_LIVE") {
        if (country.lastIncidentAt) {
          const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
          if (new Date(country.lastIncidentAt) > fourteenDaysAgo) {
            return res.status(400).json({ message: "Gate check failed: An incident occurred within the last 14 days" });
          }
        }
      }

      const updateData: any = {
        rolloutStatus: nextStatus,
        rolloutStatusChangedBy: adminId,
        rolloutStatusChangedAt: new Date(),
      };
      if (["PILOT", "LIMITED_LIVE", "FULL_LIVE"].includes(nextStatus)) {
        updateData.countryEnabled = true;
      }

      const updated = await storage.updateCountry(country.id, updateData);

      await storage.createComplianceAuditLog({
        category: "LAUNCH_MODE_CHANGE",
        actionBy: adminId,
        eventType: "ROLLOUT_PROMOTED",
        eventData: JSON.stringify({ countryCode, from: currentStatus, to: nextStatus, reason }),
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error promoting rollout:", error);
      return res.status(500).json({ message: "Failed to promote rollout stage" });
    }
  });

  app.post("/api/admin/rollout/demote", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { countryCode, reason, targetStatus } = req.body;
      if (!countryCode || !targetStatus) return res.status(400).json({ message: "countryCode and targetStatus are required" });

      const validStatuses = ["PLANNED", "PREP", "PILOT", "LIMITED_LIVE", "FULL_LIVE", "PAUSED"];
      if (!validStatuses.includes(targetStatus)) {
        return res.status(400).json({ message: `Invalid targetStatus. Must be one of: ${validStatuses.join(", ")}` });
      }

      const country = await storage.getCountryByCode(countryCode);
      if (!country) return res.status(404).json({ message: "Country not found" });

      const currentStatus = country.rolloutStatus || "PLANNED";
      if (targetStatus !== "PAUSED") {
        const currentIdx = ROLLOUT_ORDER.indexOf(currentStatus as any);
        const targetIdx = ROLLOUT_ORDER.indexOf(targetStatus as any);
        if (targetIdx >= currentIdx) {
          return res.status(400).json({ message: "Target status must be an earlier stage than current status" });
        }
      }

      const updateData: any = {
        rolloutStatus: targetStatus,
        rolloutStatusChangedBy: adminId,
        rolloutStatusChangedAt: new Date(),
      };
      if (targetStatus === "PLANNED" || targetStatus === "PREP" || targetStatus === "PAUSED") {
        updateData.countryEnabled = false;
      }

      const updated = await storage.updateCountry(country.id, updateData);

      await storage.createComplianceAuditLog({
        category: "LAUNCH_MODE_CHANGE",
        actionBy: adminId,
        eventType: "ROLLOUT_DEMOTED",
        eventData: JSON.stringify({ countryCode, from: currentStatus, to: targetStatus, reason }),
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error demoting rollout:", error);
      return res.status(500).json({ message: "Failed to demote rollout stage" });
    }
  });

  app.post("/api/admin/rollout/config", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const { countryCode, pilotMaxDailyTrips, pilotMaxConcurrentDrivers, pilotSurgeEnabled, maxAvgPickupMinutes, minTripCompletionRate, maxCancellationRate } = req.body;
      if (!countryCode) return res.status(400).json({ message: "countryCode is required" });

      const country = await storage.getCountryByCode(countryCode);
      if (!country) return res.status(404).json({ message: "Country not found" });

      const updateData: any = {};
      if (pilotMaxDailyTrips !== undefined) updateData.pilotMaxDailyTrips = pilotMaxDailyTrips;
      if (pilotMaxConcurrentDrivers !== undefined) updateData.pilotMaxConcurrentDrivers = pilotMaxConcurrentDrivers;
      if (pilotSurgeEnabled !== undefined) updateData.pilotSurgeEnabled = pilotSurgeEnabled;
      if (maxAvgPickupMinutes !== undefined) updateData.maxAvgPickupMinutes = maxAvgPickupMinutes;
      if (minTripCompletionRate !== undefined) updateData.minTripCompletionRate = minTripCompletionRate;
      if (maxCancellationRate !== undefined) updateData.maxCancellationRate = maxCancellationRate;

      const updated = await storage.updateCountry(country.id, updateData);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating rollout config:", error);
      return res.status(500).json({ message: "Failed to update rollout config" });
    }
  });

  app.get("/api/admin/rollout/dashboard", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      const countryCode = req.query.countryCode as string;
      if (!countryCode) return res.status(400).json({ message: "countryCode query param is required" });

      const country = await storage.getCountryByCode(countryCode);
      if (!country) return res.status(404).json({ message: "Country not found" });

      const hasCurrency = !!country.currency;
      const subregions = await storage.getStateLaunchConfigsByCountry(countryCode);
      const hasSubregions = subregions && subregions.length > 0;

      const pricingCheck = await db.select({ count: count() }).from(countryPricingRules).where(eq(countryPricingRules.countryId, country.id));
      const hasPricing = Number(pricingCheck[0]?.count || 0) > 0;

      const prepChecklist = {
        hasCurrency,
        hasSubregions,
        hasPricing,
      };

      const tripStats = await db.select({
        total: count(),
        completed: sql<number>`count(*) filter (where ${trips.status} = 'completed')`,
        cancelled: sql<number>`count(*) filter (where ${trips.status} = 'cancelled')`,
      }).from(trips).where(eq(trips.countryId, country.id));

      const stats = tripStats[0];
      const totalTrips = Number(stats?.total || 0);
      const metrics = {
        totalTrips,
        completedTrips: Number(stats?.completed || 0),
        cancelledTrips: Number(stats?.cancelled || 0),
        completionRate: totalTrips > 0 ? ((Number(stats.completed) / totalTrips) * 100).toFixed(1) : "0.0",
        cancellationRate: totalTrips > 0 ? ((Number(stats.cancelled) / totalTrips) * 100).toFixed(1) : "0.0",
      };

      const activeSubregions = subregions ? subregions.filter(s => s.stateEnabled).length : 0;

      const liveDriversResult = await db.select({ count: count() }).from(stateLaunchConfigs)
        .where(and(
          eq(stateLaunchConfigs.countryCode, countryCode),
          sql`(${stateLaunchConfigs.currentOnlineDriversCar} + ${stateLaunchConfigs.currentOnlineDriversBike} + ${stateLaunchConfigs.currentOnlineDriversKeke}) > 0`
        ));
      const liveDriversCount = Number(liveDriversResult[0]?.count || 0);

      const killSwitchResult = await db.select({ count: count() }).from(killSwitchStates)
        .where(and(
          eq(killSwitchStates.isActive, true),
          eq(killSwitchStates.scope, "COUNTRY"),
          eq(killSwitchStates.scopeCountryCode, countryCode)
        ));
      const activeKillSwitches = Number(killSwitchResult[0]?.count || 0);

      return res.json({
        country,
        prepChecklist,
        metrics,
        activeSubregions,
        liveDriversCount,
        activeKillSwitches,
      });
    } catch (error) {
      console.error("Error fetching rollout dashboard:", error);
      return res.status(500).json({ message: "Failed to fetch rollout dashboard" });
    }
  });

  // =============================================
  // PHASE 9: DRIVER ACQUISITION AUTOMATION
  // =============================================

  // Get acquisition analytics
  app.get("/api/admin/acquisition/analytics", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const countryCode = req.query.countryCode as string | undefined;
      const analytics = await storage.getDriverAcquisitionAnalytics(countryCode);
      return res.json(analytics);
    } catch (error) {
      console.error("Error fetching acquisition analytics:", error);
      return res.status(500).json({ message: "Failed to fetch acquisition analytics" });
    }
  });

  // Get onboarding pipeline
  app.get("/api/admin/acquisition/pipeline", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const countryCode = req.query.countryCode as string | undefined;
      const pipeline = await storage.getOnboardingPipeline(countryCode);
      return res.json(pipeline);
    } catch (error) {
      console.error("Error fetching onboarding pipeline:", error);
      return res.status(500).json({ message: "Failed to fetch onboarding pipeline" });
    }
  });

  // Get driver acquisitions by channel
  app.get("/api/admin/acquisition/drivers", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { channel, countryCode } = req.query;
      const drivers = await storage.getDriverAcquisitionsByChannel(channel as string, countryCode as string);
      return res.json(drivers);
    } catch (error) {
      console.error("Error fetching driver acquisitions:", error);
      return res.status(500).json({ message: "Failed to fetch driver acquisitions" });
    }
  });

  // Track driver acquisition on signup
  app.post("/api/acquisition/track-signup", isAuthenticated, async (req: any, res) => {
    try {
      const { channel, referralCode, fleetOwnerId, countryCode, stateCode } = req.body;
      const userId = req.user.id;
      
      const existing = await storage.getDriverAcquisition(userId);
      if (existing) return res.status(400).json({ message: "Acquisition already tracked" });

      const zoneControl = await storage.getAcquisitionZoneControl(countryCode || "NG", stateCode);
      if (zoneControl?.status === "PAUSED") {
        return res.status(403).json({ message: "Driver acquisition is paused in this zone" });
      }

      const data: any = {
        driverUserId: userId,
        channel: channel || "PUBLIC_SIGNUP",
        countryCode: countryCode || "NG",
        stateCode,
        onboardingStage: "SIGNUP",
      };

      if (channel === "REFERRAL" && referralCode) {
        const code = await storage.getReferralCodeByCode(referralCode);
        if (code && code.active) {
          if (code.ownerUserId === userId) {
            return res.status(400).json({ message: "Cannot use your own referral code" });
          }
          data.referralCodeId = code.id;
          data.referredByUserId = code.ownerUserId;
          await storage.updateReferralCodeUsage(code.id);

          const country = await storage.getCountryByCode(countryCode || "NG");
          const reward = await storage.createDriverReferralReward({
            referrerUserId: code.ownerUserId,
            referredDriverUserId: userId,
            referralCodeId: code.id,
            requiredTrips: 5,
            completedTrips: 0,
            requiredWithinDays: 30,
            deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            rewardAmount: "500.00",
            currency: country?.currency || "NGN",
            paid: false,
            expired: false,
            fraudFlagged: false,
          });
        }
      }

      if (channel === "FLEET_OWNER" && fleetOwnerId) {
        data.fleetOwnerId = fleetOwnerId;
      }

      if (channel === "ADMIN_INVITED") {
        data.invitedByAdminId = req.user.id;
      }

      const acquisition = await storage.createDriverAcquisition(data);

      await storage.createDriverAutoMessage({
        driverUserId: userId,
        messageType: "WELCOME",
        title: "Welcome to ZIBA!",
        message: "Thanks for signing up as a driver. Complete your profile and upload your documents to get started.",
        countryCode: countryCode || "NG",
        stateCode,
      });

      return res.json(acquisition);
    } catch (error) {
      console.error("Error tracking acquisition:", error);
      return res.status(500).json({ message: "Failed to track acquisition" });
    }
  });

  // Update onboarding stage
  app.post("/api/acquisition/update-stage", isAuthenticated, async (req: any, res) => {
    try {
      const { stage } = req.body;
      const userId = req.user.id;
      
      const validStages = ["SIGNUP", "DOCUMENTS", "REVIEW", "FIRST_TRIP", "ACTIVE"];
      if (!validStages.includes(stage)) {
        return res.status(400).json({ message: "Invalid onboarding stage" });
      }

      const timestamps: any = {};
      if (stage === "DOCUMENTS") timestamps.documentsUploadedAt = new Date();
      if (stage === "REVIEW") timestamps.reviewStartedAt = new Date();
      if (stage === "FIRST_TRIP") timestamps.approvedAt = new Date();
      if (stage === "ACTIVE") timestamps.activatedAt = new Date();

      const updated = await storage.updateDriverOnboardingStage(userId, stage, timestamps);
      if (!updated) return res.status(404).json({ message: "No acquisition record found" });

      const messageMap: Record<string, { type: string; title: string; msg: string }> = {
        DOCUMENTS: { type: "DOCS_UPLOADED", title: "Documents Received", msg: "Your documents have been uploaded. They are now under review." },
        REVIEW: { type: "UNDER_REVIEW", title: "Under Review", msg: "Your application is being reviewed. You'll be notified once approved." },
        FIRST_TRIP: { type: "APPROVED", title: "You're Approved!", msg: "Congratulations! You're now approved to drive. Complete your first trip to become fully active." },
        ACTIVE: { type: "ACTIVATED", title: "Fully Active", msg: "You've completed your first trip and are now a fully active ZIBA driver!" },
      };

      if (messageMap[stage]) {
        const m = messageMap[stage];
        await storage.createDriverAutoMessage({
          driverUserId: userId,
          messageType: m.type,
          title: m.title,
          message: m.msg,
        });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error updating onboarding stage:", error);
      return res.status(500).json({ message: "Failed to update onboarding stage" });
    }
  });

  // Admin approve driver (moves to FIRST_TRIP stage)
  app.post("/api/admin/acquisition/approve-driver", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { driverUserId } = req.body;
      if (!driverUserId) return res.status(400).json({ message: "driverUserId is required" });

      const acquisition = await storage.getDriverAcquisition(driverUserId);
      if (!acquisition) return res.status(404).json({ message: "No acquisition record found" });
      if (acquisition.onboardingStage !== "REVIEW") {
        return res.status(400).json({ message: "Driver is not in review stage" });
      }

      const approvedAt = new Date();
      const approvalMinutes = acquisition.reviewStartedAt
        ? Math.round((approvedAt.getTime() - new Date(acquisition.reviewStartedAt).getTime()) / 60000)
        : null;

      const updated = await storage.updateDriverOnboardingStage(driverUserId, "FIRST_TRIP", {
        approvedAt,
        approvalTimeMinutes: approvalMinutes,
      } as any);

      await storage.updateDriverStatus(driverUserId, "approved");

      await storage.createDriverAutoMessage({
        driverUserId,
        messageType: "APPROVED",
        title: "Application Approved",
        message: "Your driver application has been approved. You can now go online and accept trips!",
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error approving driver:", error);
      return res.status(500).json({ message: "Failed to approve driver" });
    }
  });

  // Fleet Owner endpoints
  app.get("/api/admin/fleet-owners", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const fleetOwners = await storage.getAllFleetOwners();
      return res.json(fleetOwners);
    } catch (error) {
      console.error("Error fetching fleet owners:", error);
      return res.status(500).json({ message: "Failed to fetch fleet owners" });
    }
  });

  app.post("/api/admin/fleet-owners/create", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { userId, companyName, countryCode, maxDrivers, bonusPerActivation } = req.body;
      if (!userId) return res.status(400).json({ message: "userId is required" });

      const existing = await storage.getFleetOwner(userId);
      if (existing) return res.status(400).json({ message: "User is already a fleet owner" });

      const fleetOwner = await storage.createFleetOwner({
        userId,
        companyName: companyName || null,
        countryCode: countryCode || "NG",
        maxDrivers: maxDrivers || 50,
        bonusPerActivation: bonusPerActivation || "0.00",
      });

      return res.json(fleetOwner);
    } catch (error) {
      console.error("Error creating fleet owner:", error);
      return res.status(500).json({ message: "Failed to create fleet owner" });
    }
  });

  app.post("/api/admin/fleet-owners/suspend", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { userId, reason } = req.body;
      if (!userId || !reason) return res.status(400).json({ message: "userId and reason are required" });

      const suspended = await storage.suspendFleetOwner(userId, reason);
      if (!suspended) return res.status(404).json({ message: "Fleet owner not found" });

      return res.json(suspended);
    } catch (error) {
      console.error("Error suspending fleet owner:", error);
      return res.status(500).json({ message: "Failed to suspend fleet owner" });
    }
  });

  app.post("/api/admin/fleet-owners/update", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { userId, ...data } = req.body;
      if (!userId) return res.status(400).json({ message: "userId is required" });

      const updated = await storage.updateFleetOwner(userId, data);
      if (!updated) return res.status(404).json({ message: "Fleet owner not found" });

      return res.json(updated);
    } catch (error) {
      console.error("Error updating fleet owner:", error);
      return res.status(500).json({ message: "Failed to update fleet owner" });
    }
  });

  // Supply alerts
  app.get("/api/admin/supply-alerts", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const countryCode = req.query.countryCode as string | undefined;
      const alerts = await storage.getActiveSupplyAlerts(countryCode);
      return res.json(alerts);
    } catch (error) {
      console.error("Error fetching supply alerts:", error);
      return res.status(500).json({ message: "Failed to fetch supply alerts" });
    }
  });

  app.post("/api/admin/supply-alerts/resolve", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { alertId } = req.body;
      if (!alertId) return res.status(400).json({ message: "alertId is required" });

      const resolved = await storage.resolveSupplyAlert(alertId);
      if (!resolved) return res.status(404).json({ message: "Alert not found" });

      return res.json(resolved);
    } catch (error) {
      console.error("Error resolving supply alert:", error);
      return res.status(500).json({ message: "Failed to resolve supply alert" });
    }
  });

  // Acquisition zone controls
  app.get("/api/admin/acquisition/zone-controls", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { countryCode, stateCode } = req.query;
      if (!countryCode) return res.status(400).json({ message: "countryCode is required" });

      const control = await storage.getAcquisitionZoneControl(countryCode as string, stateCode as string);
      return res.json(control || { status: "ACTIVE" });
    } catch (error) {
      console.error("Error fetching zone control:", error);
      return res.status(500).json({ message: "Failed to fetch zone control" });
    }
  });

  app.post("/api/admin/acquisition/zone-controls", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { countryCode, stateCode, status, reason } = req.body;
      if (!countryCode || !status) return res.status(400).json({ message: "countryCode and status are required" });

      const control = await storage.setAcquisitionZoneControl(
        countryCode,
        stateCode || null,
        status,
        req.user.id,
        reason
      );

      return res.json(control);
    } catch (error) {
      console.error("Error setting zone control:", error);
      return res.status(500).json({ message: "Failed to set zone control" });
    }
  });

  // Referral rewards management
  app.get("/api/admin/referral-rewards", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const rewards = await storage.getDriverAcquisitionsByChannel("REFERRAL");
      return res.json(rewards);
    } catch (error) {
      console.error("Error fetching referral rewards:", error);
      return res.status(500).json({ message: "Failed to fetch referral rewards" });
    }
  });

  // Driver auto-messages for current driver
  app.get("/api/driver/messages", isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getDriverAutoMessages(req.user.id);
      return res.json(messages);
    } catch (error) {
      console.error("Error fetching driver messages:", error);
      return res.status(500).json({ message: "Failed to fetch driver messages" });
    }
  });

  // My acquisition status
  app.get("/api/driver/acquisition-status", isAuthenticated, async (req: any, res) => {
    try {
      const acquisition = await storage.getDriverAcquisition(req.user.id);
      return res.json(acquisition || null);
    } catch (error) {
      console.error("Error fetching acquisition status:", error);
      return res.status(500).json({ message: "Failed to fetch acquisition status" });
    }
  });

  // =============================================
  // PHASE 10A: HELP CENTER API ROUTES
  // =============================================

  // Public: Get help categories (audience-filtered)
  app.get("/api/help/categories", async (req: any, res) => {
    try {
      const audience = req.query.audience as string | undefined;
      const categories = await storage.getHelpCategories(audience);
      return res.json(categories);
    } catch (error) {
      console.error("Error fetching help categories:", error);
      return res.status(500).json({ message: "Failed to fetch help categories" });
    }
  });

  // Public: Get published help articles (with filters)
  app.get("/api/help/articles", async (req: any, res) => {
    try {
      const { categoryId, audience, featured, countryCode } = req.query;
      const articles = await storage.getHelpArticles({
        categoryId: categoryId as string,
        audience: audience as string,
        status: "PUBLISHED",
        featured: featured === "true" ? true : undefined,
        countryCode: countryCode as string,
      });
      return res.json(articles);
    } catch (error) {
      console.error("Error fetching help articles:", error);
      return res.status(500).json({ message: "Failed to fetch help articles" });
    }
  });

  // Public: Get most viewed help articles
  app.get("/api/help/articles/most-viewed", async (req: any, res) => {
    try {
      const { audience, limit } = req.query;
      const articles = await storage.getMostViewedHelpArticles(
        audience as string,
        limit ? parseInt(limit as string, 10) : undefined,
      );
      return res.json(articles);
    } catch (error) {
      console.error("Error fetching most viewed help articles:", error);
      return res.status(500).json({ message: "Failed to fetch most viewed help articles" });
    }
  });

  // Public: Get recently updated help articles
  app.get("/api/help/articles/recently-updated", async (req: any, res) => {
    try {
      const { audience, limit } = req.query;
      const articles = await storage.getRecentlyUpdatedHelpArticles(
        audience as string,
        limit ? parseInt(limit as string, 10) : undefined,
      );
      return res.json(articles);
    } catch (error) {
      console.error("Error fetching recently updated help articles:", error);
      return res.status(500).json({ message: "Failed to fetch recently updated help articles" });
    }
  });

  // Public: Get article by slug and increment view
  app.get("/api/help/articles/slug/:slug", async (req: any, res) => {
    try {
      const article = await storage.getHelpArticleBySlug(req.params.slug);
      if (!article || article.status !== "PUBLISHED") {
        return res.status(404).json({ message: "Article not found" });
      }
      await storage.incrementArticleView(article.id);
      return res.json(article);
    } catch (error) {
      console.error("Error fetching help article:", error);
      return res.status(500).json({ message: "Failed to fetch help article" });
    }
  });

  // Public: Search help articles
  app.get("/api/help/search", async (req: any, res) => {
    try {
      const { q, audience } = req.query;
      if (!q || typeof q !== "string" || q.trim().length === 0) {
        return res.json([]);
      }
      const results = await storage.searchHelpArticles(q.trim(), audience as string);
      const userId = req.user?.id;
      await storage.createHelpSearchLog({
        userId: userId || null,
        query: q.trim(),
        resultsCount: results.length,
      });
      return res.json(results);
    } catch (error) {
      console.error("Error searching help articles:", error);
      return res.status(500).json({ message: "Failed to search help articles" });
    }
  });

  // Public: Rate article helpful
  app.post("/api/help/articles/:id/rate", async (req: any, res) => {
    try {
      const { helpful } = req.body;
      if (typeof helpful !== "boolean") {
        return res.status(400).json({ message: "helpful must be a boolean" });
      }
      await storage.rateArticleHelpful(req.params.id, helpful);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error rating help article:", error);
      return res.status(500).json({ message: "Failed to rate article" });
    }
  });

  // Admin: Get all help categories (including inactive)
  app.get("/api/admin/help/categories", isAuthenticated, requireRole(["super_admin", "admin", "support_agent"]), async (req: any, res) => {
    try {
      const categories = await storage.getHelpCategories();
      return res.json(categories);
    } catch (error) {
      console.error("Error fetching admin help categories:", error);
      return res.status(500).json({ message: "Failed to fetch help categories" });
    }
  });

  // Admin: Create help category
  app.post("/api/admin/help/categories", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const category = await storage.createHelpCategory(req.body);
      return res.status(201).json(category);
    } catch (error) {
      console.error("Error creating help category:", error);
      return res.status(500).json({ message: "Failed to create help category" });
    }
  });

  // Admin: Update help category
  app.patch("/api/admin/help/categories/:id", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const category = await storage.updateHelpCategory(req.params.id, req.body);
      if (!category) return res.status(404).json({ message: "Category not found" });
      return res.json(category);
    } catch (error) {
      console.error("Error updating help category:", error);
      return res.status(500).json({ message: "Failed to update help category" });
    }
  });

  // Admin: Delete help category
  app.delete("/api/admin/help/categories/:id", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const deleted = await storage.deleteHelpCategory(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Category not found" });
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting help category:", error);
      return res.status(500).json({ message: "Failed to delete help category" });
    }
  });

  // Admin: Get all help articles (all statuses)
  app.get("/api/admin/help/articles", isAuthenticated, requireRole(["super_admin", "admin", "support_agent"]), async (req: any, res) => {
    try {
      const { categoryId, status, audience } = req.query;
      const articles = await storage.getHelpArticles({
        categoryId: categoryId as string,
        audience: audience as string,
        status: status as string,
      });
      return res.json(articles);
    } catch (error) {
      console.error("Error fetching admin help articles:", error);
      return res.status(500).json({ message: "Failed to fetch help articles" });
    }
  });

  // Admin: Create help article
  app.post("/api/admin/help/articles", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const article = await storage.createHelpArticle({
        ...req.body,
        createdBy: req.user.id,
        updatedBy: req.user.id,
      });
      return res.status(201).json(article);
    } catch (error) {
      console.error("Error creating help article:", error);
      return res.status(500).json({ message: "Failed to create help article" });
    }
  });

  // Admin: Update help article
  app.patch("/api/admin/help/articles/:id", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const article = await storage.updateHelpArticle(req.params.id, {
        ...req.body,
        updatedBy: req.user.id,
      });
      if (!article) return res.status(404).json({ message: "Article not found" });
      return res.json(article);
    } catch (error) {
      console.error("Error updating help article:", error);
      return res.status(500).json({ message: "Failed to update help article" });
    }
  });

  // Admin: Delete help article
  app.delete("/api/admin/help/articles/:id", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const deleted = await storage.deleteHelpArticle(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Article not found" });
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting help article:", error);
      return res.status(500).json({ message: "Failed to delete help article" });
    }
  });

  // Admin: Get search logs
  app.get("/api/admin/help/search-logs", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getHelpSearchLogs(limit);
      return res.json(logs);
    } catch (error) {
      console.error("Error fetching search logs:", error);
      return res.status(500).json({ message: "Failed to fetch search logs" });
    }
  });

  // =============================================
  // PHASE 10 - TRUSTED CONTACTS API
  // =============================================

  app.get("/api/trusted-contacts", isAuthenticated, async (req: any, res) => {
    try {
      const contacts = await storage.getTrustedContacts(req.user.id);
      return res.json(contacts);
    } catch (error) {
      console.error("Error fetching trusted contacts:", error);
      return res.status(500).json({ message: "Failed to fetch trusted contacts" });
    }
  });

  app.post("/api/trusted-contacts", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await storage.getTrustedContacts(req.user.id);
      if (existing.length >= 5) {
        return res.status(400).json({ message: "Maximum of 5 trusted contacts allowed" });
      }
      const contact = await storage.createTrustedContact({
        ...req.body,
        userId: req.user.id,
      });
      return res.json(contact);
    } catch (error) {
      console.error("Error creating trusted contact:", error);
      return res.status(500).json({ message: "Failed to create trusted contact" });
    }
  });

  app.patch("/api/trusted-contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const contact = await storage.updateTrustedContact(req.params.id, req.user.id, req.body);
      if (!contact) return res.status(404).json({ message: "Contact not found" });
      return res.json(contact);
    } catch (error) {
      console.error("Error updating trusted contact:", error);
      return res.status(500).json({ message: "Failed to update trusted contact" });
    }
  });

  app.delete("/api/trusted-contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const deleted = await storage.deleteTrustedContact(req.params.id, req.user.id);
      if (!deleted) return res.status(404).json({ message: "Contact not found" });
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting trusted contact:", error);
      return res.status(500).json({ message: "Failed to delete trusted contact" });
    }
  });

  // =============================================
  // PHASE 10 - TRIP SHARE LINKS API
  // =============================================

  app.post("/api/trips/:tripId/share", isAuthenticated, async (req: any, res) => {
    try {
      const { randomBytes } = await import("crypto");
      const shareToken = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const link = await storage.createTripShareLink({
        tripId: req.params.tripId,
        sharedBy: req.user.id,
        shareToken,
        recipientPhone: req.body.recipientPhone || null,
        recipientName: req.body.recipientName || null,
        isActive: true,
        expiresAt,
      });
      return res.json(link);
    } catch (error) {
      console.error("Error creating trip share link:", error);
      return res.status(500).json({ message: "Failed to create share link" });
    }
  });

  app.get("/api/trip-share/:token", async (req, res) => {
    try {
      const link = await storage.getTripShareLinkByToken(req.params.token);
      if (!link) return res.status(404).json({ message: "Share link not found or expired" });
      if (new Date() > new Date(link.expiresAt)) {
        return res.status(410).json({ message: "Share link has expired" });
      }
      await storage.incrementShareLinkViewCount(link.id);
      const trip = await storage.getTripById(link.tripId);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      return res.json({
        trip: {
          id: trip.id,
          status: trip.status,
          pickupLocation: trip.pickupLocation,
          dropoffLocation: trip.dropoffLocation,
          createdAt: trip.createdAt,
        },
        sharedAt: link.createdAt,
        expiresAt: link.expiresAt,
      });
    } catch (error) {
      console.error("Error fetching shared trip:", error);
      return res.status(500).json({ message: "Failed to fetch shared trip" });
    }
  });

  app.get("/api/trips/:tripId/share-links", isAuthenticated, async (req: any, res) => {
    try {
      const links = await storage.getTripShareLinks(req.params.tripId);
      return res.json(links);
    } catch (error) {
      console.error("Error fetching share links:", error);
      return res.status(500).json({ message: "Failed to fetch share links" });
    }
  });

  app.delete("/api/trip-share/:id", isAuthenticated, async (req: any, res) => {
    try {
      const deactivated = await storage.deactivateTripShareLink(req.params.id);
      if (!deactivated) return res.status(404).json({ message: "Share link not found" });
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deactivating share link:", error);
      return res.status(500).json({ message: "Failed to deactivate share link" });
    }
  });

  // =============================================
  // PHASE 10 - COUNTRY EMERGENCY CONFIG API
  // =============================================

  app.get("/api/emergency-config/:countryCode", async (req, res) => {
    try {
      const config = await storage.getCountryEmergencyConfig(req.params.countryCode.toUpperCase());
      if (!config) {
        return res.json({
          countryCode: req.params.countryCode.toUpperCase(),
          emergencyNumber: "911",
          policeNumber: null,
          ambulanceNumber: null,
          fireNumber: null,
          sosInstructions: null,
        });
      }
      return res.json(config);
    } catch (error) {
      console.error("Error fetching emergency config:", error);
      return res.status(500).json({ message: "Failed to fetch emergency config" });
    }
  });

  app.get("/api/admin/emergency-configs", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const configs = await storage.getAllCountryEmergencyConfigs();
      return res.json(configs);
    } catch (error) {
      console.error("Error fetching emergency configs:", error);
      return res.status(500).json({ message: "Failed to fetch emergency configs" });
    }
  });

  app.post("/api/admin/emergency-config", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const config = await storage.upsertCountryEmergencyConfig(req.body);
      return res.json(config);
    } catch (error) {
      console.error("Error saving emergency config:", error);
      return res.status(500).json({ message: "Failed to save emergency config" });
    }
  });

  // Phase 9: Admin Driver Override Routes
  app.post("/api/admin/driver/:driverId/override-trust-score", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { driverId } = req.params;
      const { trustScore, reason } = req.body;
      if (typeof trustScore !== "number" || trustScore < 0 || trustScore > 100) {
        return res.status(400).json({ message: "Trust score must be between 0 and 100" });
      }
      const level = trustScore >= 80 ? "high" : trustScore >= 60 ? "medium" : "low";
      await db.update(userTrustProfiles)
        .set({ trustScore, trustScoreLevel: level })
        .where(eq(userTrustProfiles.userId, driverId));
      console.log(`[Admin Override] Trust score for driver ${driverId} set to ${trustScore} by ${req.user.claims.sub}. Reason: ${reason}`);
      return res.json({ success: true, trustScore, trustScoreLevel: level, reason });
    } catch (error) {
      console.error("Error overriding trust score:", error);
      return res.status(500).json({ message: "Failed to override trust score" });
    }
  });

  app.post("/api/admin/driver/:driverId/reset-cancellation-metrics", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { driverId } = req.params;
      const { reason } = req.body;
      console.log(`[Admin Override] Cancellation metrics reset for driver ${driverId} by ${req.user.claims.sub}. Reason: ${reason}`);
      return res.json({ success: true, message: "Cancellation metrics reset logged", driverId, reason });
    } catch (error) {
      console.error("Error resetting cancellation metrics:", error);
      return res.status(500).json({ message: "Failed to reset cancellation metrics" });
    }
  });

  app.post("/api/admin/driver/:driverId/resolve-dispute", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { driverId } = req.params;
      const { disputeId, resolution } = req.body;
      console.log(`[Admin Override] Dispute ${disputeId} resolved for driver ${driverId} by ${req.user.claims.sub}. Resolution: ${resolution}`);
      return res.json({ success: true, disputeId, resolution });
    } catch (error) {
      console.error("Error resolving dispute:", error);
      return res.status(500).json({ message: "Failed to resolve dispute" });
    }
  });

  app.post("/api/admin/driver/:driverId/remove-pairing-block", isAuthenticated, requireRole(["super_admin", "admin"]), async (req: any, res) => {
    try {
      const { driverId } = req.params;
      const { blockedUserId, reason } = req.body;
      console.log(`[Admin Override] Pairing block removed for driver ${driverId}, blocked user ${blockedUserId} by ${req.user.claims.sub}. Reason: ${reason}`);
      return res.json({ success: true, driverId, blockedUserId, reason });
    } catch (error) {
      console.error("Error removing pairing block:", error);
      return res.status(500).json({ message: "Failed to remove pairing block" });
    }
  });

  // Phase 10: Admin Driver Analytics
  app.get("/api/admin/analytics/drivers", isAuthenticated, requireRole(["super_admin", "admin", "director"]), async (req: any, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [newDriversResult] = await db.select({ count: count() })
        .from(driverProfiles)
        .where(gte(driverProfiles.createdAt, thirtyDaysAgo));

      const [totalDriversResult] = await db.select({ count: count() })
        .from(driverProfiles);

      const [activeDriversResult] = await db.select({ count: count() })
        .from(driverProfiles)
        .where(eq(driverProfiles.isOnline, true));

      const [totalTripsResult] = await db.select({ count: count() })
        .from(trips)
        .where(eq(trips.status, "completed"));

      const totalTrips = totalTripsResult?.count || 0;
      const tipFrequency = 0;
      const newDriversCount = newDriversResult?.count || 0;
      const totalDrivers = totalDriversResult?.count || 0;
      const returningDriversCount = totalDrivers - newDriversCount;
      const dailyActiveDrivers = activeDriversResult?.count || 0;

      return res.json({
        newDriversCount,
        returningDriversCount: Math.max(0, returningDriversCount),
        dailyActiveDrivers,
        averageOnlineTime: 0,
        tipFrequency: Math.round(tipFrequency * 100) / 100,
        incentiveEffectiveness: 0,
        totalDrivers,
        totalCompletedTrips: totalTrips,
      });
    } catch (error) {
      console.error("Error fetching driver analytics:", error);
      return res.status(500).json({ message: "Failed to fetch driver analytics" });
    }
  });

  app.get("/api/driver/statements/:year", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year + 1, 0, 1);

      const driverTrips = await db.select()
        .from(trips)
        .where(
          and(
            eq(trips.driverId, userId),
            eq(trips.status, "completed"),
            gte(trips.completedAt, startOfYear),
            lt(trips.completedAt, endOfYear)
          )
        );

      const monthMap = new Map<number, { earnings: number; tips: number; commission: number; count: number }>();

      for (const trip of driverTrips) {
        const completedDate = trip.completedAt ? new Date(trip.completedAt) : null;
        if (!completedDate) continue;
        const month = completedDate.getMonth() + 1;

        if (!monthMap.has(month)) {
          monthMap.set(month, { earnings: 0, tips: 0, commission: 0, count: 0 });
        }
        const entry = monthMap.get(month)!;
        entry.earnings += parseFloat(trip.driverPayout || "0");
        entry.commission += parseFloat(trip.commissionAmount || "0");
        entry.count += 1;
      }

      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      const statements = Array.from(monthMap.entries()).map(([month, data]) => ({
        month,
        year,
        monthLabel: `${monthNames[month - 1]} ${year}`,
        totalDriverEarnings: Math.round(data.earnings * 100) / 100,
        totalTips: Math.round(data.tips * 100) / 100,
        totalIncentives: 0,
        totalPlatformFee: Math.round(data.commission * 100) / 100,
        netPayout: Math.round((data.earnings + data.tips) * 100) / 100,
        tripCount: data.count,
        onlineHours: 0,
        currency: "NGN",
      })).sort((a, b) => b.month - a.month);

      return res.json(statements);
    } catch (error) {
      console.error("Error fetching monthly statements:", error);
      return res.status(500).json({ message: "Failed to fetch statements" });
    }
  });

  // ============================================================
  // TAX STATEMENT DATA MODEL & QUERIES
  // Tax compliance only. No per-trip breakdowns. No daily exposure.
  // ============================================================

  async function computeTaxYearData(driverUserId: string, year: number) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const driverTrips = await db.select()
      .from(trips)
      .where(
        and(
          eq(trips.driverId, driverUserId),
          eq(trips.status, "completed"),
          gte(trips.completedAt, startOfYear),
          lt(trips.completedAt, endOfYear)
        )
      );

    let totalTripEarnings = 0;
    let totalPlatformFees = 0;
    let totalTips = 0;
    let tripCount = 0;
    let currency = "NGN";

    for (const trip of driverTrips) {
      totalTripEarnings += parseFloat(trip.driverPayout || "0");
      totalPlatformFees += parseFloat(trip.commissionAmount || "0");
      if (trip.currencyCode) currency = trip.currencyCode;
      tripCount += 1;
    }

    const totalIncentives = 0;
    const totalGrossEarnings = totalTripEarnings + totalTips + totalIncentives;
    const reportableIncome = totalGrossEarnings;

    const mileageRecord = await storage.getDriverMileageForYear(driverUserId, year);
    const totalMilesDriven = mileageRecord ? parseFloat(mileageRecord.totalMilesOnline) : 0;

    return {
      totalGrossEarnings: Math.round(totalGrossEarnings * 100) / 100,
      totalTips: Math.round(totalTips * 100) / 100,
      totalIncentives: Math.round(totalIncentives * 100) / 100,
      totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
      totalMilesDriven: Math.round(totalMilesDriven * 100) / 100,
      reportableIncome: Math.round(reportableIncome * 100) / 100,
      currency,
      tripCount,
    };
  }

  // Driver: tax profile management
  app.get("/api/driver/tax/profile", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getDriverTaxProfile(userId);
      if (!profile) return res.json(null);
      return res.json({ ...profile, taxId: profile.taxId ? "****" : null });
    } catch (error) {
      console.error("Error fetching tax profile:", error);
      return res.status(500).json({ message: "Failed to fetch tax profile" });
    }
  });

  app.post("/api/driver/tax/profile", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { legalName, taxId, country, taxClassification } = req.body;
      if (!legalName || !country) {
        return res.status(400).json({ message: "legalName and country are required" });
      }
      const { encryptField } = await import("./crypto");
      const profile = await storage.upsertDriverTaxProfile({
        driverUserId: userId,
        legalName,
        taxId: taxId ? encryptField(taxId) : null,
        country,
        taxClassification: taxClassification || "independent_contractor",
      });
      return res.json({ ...profile, taxId: profile.taxId ? "****" : null });
    } catch (error) {
      console.error("Error saving tax profile:", error);
      return res.status(500).json({ message: "Failed to save tax profile" });
    }
  });

  // Driver: view tax year summary (uses stored summary if exists, else computes live)
  app.get("/api/driver/statements/annual/:year", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const driverProfile = await storage.getDriverProfile(userId);
      const taxProfile = await storage.getDriverTaxProfile(userId);
      const storedSummary = await storage.getDriverTaxYearSummary(userId, year);

      let summaryData;
      if (storedSummary && (storedSummary.status === "finalized" || storedSummary.status === "issued")) {
        summaryData = {
          totalGrossEarnings: parseFloat(storedSummary.totalGrossEarnings),
          totalTips: parseFloat(storedSummary.totalTips),
          totalIncentives: parseFloat(storedSummary.totalIncentives),
          totalPlatformFees: parseFloat(storedSummary.totalPlatformFees),
          totalMilesDriven: parseFloat(storedSummary.totalMilesDriven),
          reportableIncome: parseFloat(storedSummary.reportableIncome),
          currency: storedSummary.currency,
          status: storedSummary.status,
        };
      } else {
        const computed = await computeTaxYearData(userId, year);
        summaryData = { ...computed, status: "draft" };
      }

      return res.json({
        year,
        driverName: taxProfile?.legalName || driverProfile?.fullName || "Driver",
        driverId: userId.substring(0, 8).toUpperCase(),
        totalGrossEarnings: summaryData.totalGrossEarnings,
        totalTips: summaryData.totalTips,
        totalIncentives: summaryData.totalIncentives,
        totalPlatformFee: summaryData.totalPlatformFees,
        reportableIncome: summaryData.reportableIncome,
        totalTrips: 0,
        totalOnlineHours: 0,
        totalMilesDrivenOnline: summaryData.totalMilesDriven,
        currency: summaryData.currency,
        status: summaryData.status,
      });
    } catch (error) {
      console.error("Error fetching annual statement:", error);
      return res.status(500).json({ message: "Failed to fetch annual statement" });
    }
  });

  // Driver: view tax documents
  app.get("/api/driver/tax/documents", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const docs = await storage.getDriverTaxDocuments(userId, year);
      return res.json(docs);
    } catch (error) {
      console.error("Error fetching tax documents:", error);
      return res.status(500).json({ message: "Failed to fetch tax documents" });
    }
  });

  app.get("/api/driver/statements/:year/:month/download", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const format = req.query.format || "csv";

      if (isNaN(year) || isNaN(month)) return res.status(400).json({ message: "Invalid parameters" });

      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 1);
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      const driverTrips = await db.select()
        .from(trips)
        .where(
          and(
            eq(trips.driverId, userId),
            eq(trips.status, "completed"),
            gte(trips.completedAt, startOfMonth),
            lt(trips.completedAt, endOfMonth)
          )
        );

      let totalEarnings = 0;
      let totalCommission = 0;
      for (const trip of driverTrips) {
        totalEarnings += parseFloat(trip.driverPayout || "0");
        totalCommission += parseFloat(trip.commissionAmount || "0");
      }

      if (format === "csv") {
        const csvLines = [
          `ZIBA Driver Earnings Statement`,
          `Month,${monthNames[month - 1]} ${year}`,
          `Total Trips,${driverTrips.length}`,
          `Total Earnings,${totalEarnings.toFixed(2)}`,
          `Total Service Fees,${totalCommission.toFixed(2)}`,
          `Net Payout,${totalEarnings.toFixed(2)}`,
          ``,
          `Generated,${new Date().toISOString()}`,
        ];
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="ziba-statement-${year}-${month}.csv"`);
        return res.send(csvLines.join("\n"));
      }

      return res.json({
        message: "PDF generation is not yet available. Please download CSV.",
        format: "csv",
        downloadUrl: `/api/driver/statements/${year}/${month}/download?format=csv`,
      });
    } catch (error) {
      console.error("Error downloading statement:", error);
      return res.status(500).json({ message: "Failed to download statement" });
    }
  });

  async function getCountryTaxRules(countryCode: string): Promise<CountryTaxRules> {
    const config = await storage.getCountryTaxConfig(countryCode);
    if (config) {
      return {
        documentLabel: config.documentLabel,
        documentType: config.documentType,
        mileageDisclosureEnabled: config.mileageDisclosureEnabled,
        withholdingEnabled: config.withholdingEnabled,
        complianceNotes: config.complianceNotes,
        driverClassificationLabel: config.driverClassificationLabel,
        reportableIncomeIncludesFees: config.reportableIncomeIncludesFees,
      };
    }
    return {
      documentLabel: "Annual Earnings & Tax Summary",
      documentType: "annual_statement",
      mileageDisclosureEnabled: true,
      withholdingEnabled: false,
      complianceNotes: "This document is provided for tax reporting purposes. Driver is responsible for filing applicable taxes.",
      driverClassificationLabel: "Independent Contractor",
      reportableIncomeIncludesFees: false,
    };
  }

  async function buildTaxDocumentData(driverUserId: string, year: number): Promise<TaxDocumentData> {
    const driverProfile = await storage.getDriverProfile(driverUserId);
    const taxProfile = await storage.getDriverTaxProfile(driverUserId);
    const storedSummary = await storage.getDriverTaxYearSummary(driverUserId, year);
    const docs = await storage.getDriverTaxDocuments(driverUserId, year);
    const latestDoc = docs.find(d => d.isLatest);

    let earnings;
    if (storedSummary && (storedSummary.status === "finalized" || storedSummary.status === "issued")) {
      earnings = {
        totalGrossEarnings: parseFloat(storedSummary.totalGrossEarnings),
        totalTips: parseFloat(storedSummary.totalTips),
        totalIncentives: parseFloat(storedSummary.totalIncentives),
        totalPlatformFees: parseFloat(storedSummary.totalPlatformFees),
        totalMilesDriven: parseFloat(storedSummary.totalMilesDriven),
        reportableIncome: parseFloat(storedSummary.reportableIncome),
        currency: storedSummary.currency,
      };
    } else {
      earnings = await computeTaxYearData(driverUserId, year);
    }

    const totalTripEarnings = earnings.totalGrossEarnings - earnings.totalTips - earnings.totalIncentives;
    const { maskTaxId } = await import("./crypto");
    const maskedTaxId = maskTaxId(taxProfile?.taxId || null);

    return {
      driverId: driverUserId,
      legalName: taxProfile?.legalName || driverProfile?.fullName || "Driver",
      country: taxProfile?.country || "NG",
      taxClassification: taxProfile?.taxClassification || "independent_contractor",
      maskedTaxId,
      taxYear: year,
      documentVersion: latestDoc?.version || 1,
      issueDate: new Date().toISOString().split("T")[0],
      totalGrossEarnings: earnings.totalGrossEarnings,
      totalTripEarnings: Math.round(totalTripEarnings * 100) / 100,
      totalTips: earnings.totalTips,
      totalIncentives: earnings.totalIncentives,
      totalPlatformFees: earnings.totalPlatformFees,
      totalMilesDriven: earnings.totalMilesDriven,
      reportableIncome: earnings.reportableIncome,
      currency: earnings.currency,
    };
  }

  app.get("/api/driver/statements/annual/:year/download", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.params.year);
      const format = (req.query.format || "pdf").toLowerCase();

      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const docData = await buildTaxDocumentData(userId, year);
      const rules = await getCountryTaxRules(docData.country);

      if (format === "csv") {
        const csv = generateTaxCSV(docData);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="ziba-annual-tax-${year}.csv"`);
        return res.send(csv);
      }

      const pdfDoc = generateTaxPDF(docData, rules.documentType, rules);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="ziba-annual-tax-${year}.pdf"`);
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      console.error("Error downloading annual statement:", error);
      return res.status(500).json({ message: "Failed to download annual statement" });
    }
  });

  // ============================================================
  // ADMIN TAX MANAGEMENT (read-only views, generate, issue)
  // ============================================================

  // Admin: validate driver data before generation
  app.get("/api/admin/tax/validate/:driverId/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const driverId = req.params.driverId;
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const errors: string[] = [];
      const warnings: string[] = [];

      const taxProfile = await storage.getDriverTaxProfile(driverId);
      if (!taxProfile) {
        errors.push("DriverTaxProfile does not exist");
      } else {
        if (!taxProfile.taxId) warnings.push("Tax ID not provided");
        if (!taxProfile.legalName) errors.push("Legal name missing");
        const countryConfig = await storage.getCountryTaxConfig(taxProfile.country);
        if (countryConfig && !countryConfig.taxDocumentsEnabled) {
          errors.push(`Tax documents are disabled for ${countryConfig.countryName} (${taxProfile.country})`);
        }
      }

      const mileageRecord = await storage.getDriverMileageForYear(driverId, year);
      if (!mileageRecord || parseFloat(mileageRecord.totalMilesOnline) === 0) {
        warnings.push("No mileage data for this year");
      }

      const computed = await computeTaxYearData(driverId, year);
      if (computed.tripCount === 0) {
        errors.push("No completed trips found for this tax year");
      }

      const canGenerate = errors.length === 0;
      return res.json({ canGenerate, errors, warnings, driverId, taxYear: year });
    } catch (error) {
      console.error("Error validating tax data:", error);
      return res.status(500).json({ message: "Failed to validate tax data" });
    }
  });

  // Admin: list all drivers with their tax generation status
  app.get("/api/admin/tax/drivers/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const allDriverProfiles = await db.select().from(driverProfiles);
      const summaries = await storage.getAllTaxYearSummariesForYear(year);
      const summaryMap = new Map(summaries.map(s => [s.driverUserId, s]));

      const drivers = allDriverProfiles.map(dp => {
        const summary = summaryMap.get(dp.userId);
        return {
          driverId: dp.userId,
          driverName: dp.fullName,
          country: dp.countryCode || "NG",
          status: summary?.status || "not_generated",
          totalGrossEarnings: summary ? parseFloat(summary.totalGrossEarnings) : null,
          reportableIncome: summary ? parseFloat(summary.reportableIncome) : null,
          generatedAt: summary?.generatedAt || null,
        };
      });

      return res.json(drivers);
    } catch (error) {
      console.error("Error fetching tax drivers:", error);
      return res.status(500).json({ message: "Failed to fetch driver list" });
    }
  });

  // Admin: generate/regenerate tax summary from source data
  app.post("/api/admin/tax/generate/:driverId/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const driverId = req.params.driverId;
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const existingSummary = await storage.getDriverTaxYearSummary(driverId, year);
      if (existingSummary && (existingSummary.status === "finalized" || existingSummary.status === "issued")) {
        return res.status(400).json({ message: "Cannot regenerate finalized or issued summary. Create a new generation cycle." });
      }

      const computed = await computeTaxYearData(driverId, year);
      const summary = await storage.upsertDriverTaxYearSummary({
        driverUserId: driverId,
        taxYear: year,
        totalGrossEarnings: computed.totalGrossEarnings.toFixed(2),
        totalTips: computed.totalTips.toFixed(2),
        totalIncentives: computed.totalIncentives.toFixed(2),
        totalPlatformFees: computed.totalPlatformFees.toFixed(2),
        totalMilesDriven: computed.totalMilesDriven.toFixed(2),
        reportableIncome: computed.reportableIncome.toFixed(2),
        currency: computed.currency,
        status: "draft",
        generatedBy: adminId,
      });

      await storage.logTaxGenerationEvent(driverId, year, "generated", adminId, `Summary generated from ${computed.tripCount} trips`);
      return res.json(summary);
    } catch (error: any) {
      console.error("Error generating tax summary:", error);
      return res.status(500).json({ message: error.message || "Failed to generate tax summary" });
    }
  });

  // Admin: finalize tax summary (locks it from changes)
  app.post("/api/admin/tax/finalize/:driverId/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const driverId = req.params.driverId;
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const summary = await storage.finalizeTaxYearSummary(driverId, year, adminId);
      await storage.logTaxGenerationEvent(driverId, year, "finalized", adminId);
      return res.json(summary);
    } catch (error: any) {
      console.error("Error finalizing tax summary:", error);
      return res.status(400).json({ message: error.message || "Failed to finalize tax summary" });
    }
  });

  // Admin: issue tax summary to driver
  app.post("/api/admin/tax/issue/:driverId/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const driverId = req.params.driverId;
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const summary = await storage.issueTaxYearSummary(driverId, year, adminId);
      await storage.logTaxGenerationEvent(driverId, year, "issued", adminId);

      const taxProfile = await storage.getDriverTaxProfile(driverId);
      const driverCountry = taxProfile?.country || "NG";
      const countryConfig = await storage.getCountryTaxConfig(driverCountry);
      const docType = (countryConfig?.documentType === "1099" ? "1099" : 
                       countryConfig?.documentType === "country_equivalent" ? "country_equivalent" : "annual_statement") as "1099" | "annual_statement" | "country_equivalent";
      const doc = await storage.createTaxDocument({
        driverUserId: driverId,
        taxYear: year,
        documentType: docType,
        fileUrl: `/api/driver/statements/annual/${year}/download?format=pdf`,
        generatedBy: adminId,
      });

      await storage.logTaxGenerationEvent(driverId, year, "document_created", adminId, `Document ${doc.id} v${doc.version} type=${docType}`);

      try {
        await notificationService.notifyUser(driverId, {
          type: "system",
          title: `Tax Document Available`,
          message: `Your ${year} annual tax statement is now available for download in your Statements section.`,
          role: "driver",
        });
      } catch (notifyErr) {
        console.warn("Failed to notify driver of tax document:", notifyErr);
      }

      return res.json({ summary, document: doc });
    } catch (error: any) {
      console.error("Error issuing tax summary:", error);
      return res.status(400).json({ message: error.message || "Failed to issue tax summary" });
    }
  });

  // Admin: view driver tax summary (read-only)
  app.get("/api/admin/tax/summary/:driverId/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const driverId = req.params.driverId;
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const summary = await storage.getDriverTaxYearSummary(driverId, year);
      const taxProfile = await storage.getDriverTaxProfile(driverId);
      const docs = await storage.getDriverTaxDocuments(driverId, year);
      const auditLogs = await storage.getTaxAuditLogs(driverId, year);

      if (!summary) {
        const computed = await computeTaxYearData(driverId, year);
        return res.json({
          stored: false,
          driverId,
          taxYear: year,
          taxProfile: taxProfile ? { ...taxProfile, taxId: taxProfile.taxId ? "****" : null } : null,
          ...computed,
          status: "not_generated",
          documents: docs,
          auditLogs,
        });
      }

      return res.json({
        stored: true,
        driverId,
        taxYear: year,
        taxProfile: taxProfile ? { ...taxProfile, taxId: taxProfile.taxId ? "****" : null } : null,
        totalGrossEarnings: parseFloat(summary.totalGrossEarnings),
        totalTips: parseFloat(summary.totalTips),
        totalIncentives: parseFloat(summary.totalIncentives),
        totalPlatformFees: parseFloat(summary.totalPlatformFees),
        totalMilesDriven: parseFloat(summary.totalMilesDriven),
        reportableIncome: parseFloat(summary.reportableIncome),
        currency: summary.currency,
        status: summary.status,
        generatedAt: summary.generatedAt,
        generatedBy: summary.generatedBy,
        finalizedAt: summary.finalizedAt,
        finalizedBy: summary.finalizedBy,
        documents: docs,
        auditLogs,
      });
    } catch (error) {
      console.error("Error fetching admin tax summary:", error);
      return res.status(500).json({ message: "Failed to fetch tax summary" });
    }
  });

  // Admin: list all tax summaries for a year (for compliance download)
  app.get("/api/admin/tax/summaries/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const summaries = await storage.getAllTaxYearSummariesForYear(year);
      return res.json(summaries.map(s => ({
        driverUserId: s.driverUserId,
        taxYear: s.taxYear,
        totalGrossEarnings: parseFloat(s.totalGrossEarnings),
        totalPlatformFees: parseFloat(s.totalPlatformFees),
        totalMilesDriven: parseFloat(s.totalMilesDriven),
        reportableIncome: parseFloat(s.reportableIncome),
        currency: s.currency,
        status: s.status,
        generatedAt: s.generatedAt,
      })));
    } catch (error) {
      console.error("Error fetching tax summaries:", error);
      return res.status(500).json({ message: "Failed to fetch tax summaries" });
    }
  });

  // Admin: bulk export tax summaries as CSV (spec-compliant format)
  app.get("/api/admin/tax/export/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const summaries = await storage.getAllTaxYearSummariesForYear(year);
      const rows: TaxDocumentData[] = [];

      for (const s of summaries) {
        const taxProfile = await storage.getDriverTaxProfile(s.driverUserId);
        const driverProfile = await storage.getDriverProfile(s.driverUserId);
        const ge = parseFloat(s.totalGrossEarnings);
        const ti = parseFloat(s.totalTips);
        const inc = parseFloat(s.totalIncentives);
        rows.push({
          driverId: s.driverUserId,
          legalName: taxProfile?.legalName || driverProfile?.fullName || "Driver",
          country: taxProfile?.country || "NG",
          taxClassification: taxProfile?.taxClassification || "independent_contractor",
          maskedTaxId: (await import("./crypto")).maskTaxId(taxProfile?.taxId || null),
          taxYear: s.taxYear,
          documentVersion: 1,
          issueDate: new Date().toISOString().split("T")[0],
          totalGrossEarnings: ge,
          totalTripEarnings: Math.round((ge - ti - inc) * 100) / 100,
          totalTips: ti,
          totalIncentives: inc,
          totalPlatformFees: parseFloat(s.totalPlatformFees),
          totalMilesDriven: parseFloat(s.totalMilesDriven),
          reportableIncome: parseFloat(s.reportableIncome),
          currency: s.currency,
        });
      }

      const csv = generateBulkTaxCSV(rows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="ziba-tax-summaries-${year}.csv"`);
      return res.send(csv);
    } catch (error) {
      console.error("Error exporting tax summaries:", error);
      return res.status(500).json({ message: "Failed to export tax summaries" });
    }
  });

  // Admin: download individual driver tax document as PDF or CSV
  app.get("/api/admin/tax/download/:driverId/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const driverId = req.params.driverId;
      const year = parseInt(req.params.year);
      const format = (req.query.format || "pdf").toLowerCase();
      const docType = (req.query.type || "annual_statement") as string;

      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const docData = await buildTaxDocumentData(driverId, year);
      const rules = await getCountryTaxRules(docData.country);

      if (format === "csv") {
        const csv = generateTaxCSV(docData);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="ziba-tax-${driverId.substring(0, 8)}-${year}.csv"`);
        return res.send(csv);
      }

      const pdfDoc = generateTaxPDF(docData, rules.documentType, rules);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="ziba-tax-${driverId.substring(0, 8)}-${year}.pdf"`);
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      console.error("Error downloading admin tax document:", error);
      return res.status(500).json({ message: "Failed to download tax document" });
    }
  });

  // Admin: view audit log for a driver's tax year
  app.get("/api/admin/tax/audit/:driverId/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const driverId = req.params.driverId;
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const logs = await storage.getTaxAuditLogs(driverId, year);
      return res.json(logs);
    } catch (error) {
      console.error("Error fetching tax audit logs:", error);
      return res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ============================================================
  // COUNTRY TAX COMPLIANCE CONFIGURATION (Admin)
  // ============================================================

  app.get("/api/admin/tax/country-configs", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const configs = await storage.getAllCountryTaxConfigs();
      return res.json(configs);
    } catch (error) {
      console.error("Error fetching country tax configs:", error);
      return res.status(500).json({ message: "Failed to fetch country tax configurations" });
    }
  });

  app.get("/api/admin/tax/country-configs/:countryCode", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const config = await storage.getCountryTaxConfig(req.params.countryCode);
      if (!config) return res.status(404).json({ message: "No tax configuration found for this country" });
      return res.json(config);
    } catch (error) {
      console.error("Error fetching country tax config:", error);
      return res.status(500).json({ message: "Failed to fetch country tax configuration" });
    }
  });

  app.post("/api/admin/tax/country-configs", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const config = await storage.upsertCountryTaxConfig(req.body);
      return res.json(config);
    } catch (error) {
      console.error("Error saving country tax config:", error);
      return res.status(500).json({ message: "Failed to save country tax configuration" });
    }
  });

  app.delete("/api/admin/tax/country-configs/:countryCode", isAuthenticated, requireRole(["super_admin"]), async (req: any, res) => {
    try {
      await storage.deleteCountryTaxConfig(req.params.countryCode);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting country tax config:", error);
      return res.status(500).json({ message: "Failed to delete country tax configuration" });
    }
  });

  // ============================================================
  // MILEAGE TRACKING (TAX COMPLIANCE ONLY)
  // Anti-fraud constants
  const MAX_SPEED_MPH = 120;
  const MAX_MILES_PER_UPDATE = 5;
  const MIN_UPDATE_INTERVAL_MS = 5000;
  // ============================================================

  function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  app.post("/api/driver/mileage/session/start", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, lat, lng } = req.body;

      if (!sessionId || typeof sessionId !== "string") {
        return res.status(400).json({ message: "sessionId is required" });
      }

      const session = await storage.startMileageSession(userId, sessionId, lat, lng);
      return res.json({ sessionId: session.sessionId, status: session.status });
    } catch (error) {
      console.error("Error starting mileage session:", error);
      return res.status(500).json({ message: "Failed to start mileage session" });
    }
  });

  app.post("/api/driver/mileage/session/update", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, lat, lng } = req.body;

      if (!sessionId || typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ message: "sessionId, lat, lng required" });
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ message: "Invalid GPS coordinates" });
      }

      const activeSession = await storage.getActiveMileageSession(userId);
      if (!activeSession || activeSession.sessionId !== sessionId) {
        return res.status(404).json({ message: "No active session found" });
      }

      let milesDelta = 0;
      if (activeSession.lastLat && activeSession.lastLng) {
        const prevLat = parseFloat(activeSession.lastLat);
        const prevLng = parseFloat(activeSession.lastLng);

        const rawDistance = haversineDistanceMiles(prevLat, prevLng, lat, lng);

        if (rawDistance > MAX_MILES_PER_UPDATE) {
          console.warn(`[MILEAGE ANTI-FRAUD] GPS jump detected for driver ${userId}: ${rawDistance.toFixed(2)} mi, session ${sessionId}`);
          return res.json({ 
            sessionId, 
            totalMilesAccumulated: activeSession.totalMilesAccumulated,
            warning: "GPS jump ignored" 
          });
        }

        if (activeSession.lastUpdateAt) {
          const timeDeltaMs = Date.now() - new Date(activeSession.lastUpdateAt).getTime();
          if (timeDeltaMs < MIN_UPDATE_INTERVAL_MS) {
            return res.json({ 
              sessionId, 
              totalMilesAccumulated: activeSession.totalMilesAccumulated,
              warning: "Update too frequent" 
            });
          }
          const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60);
          if (timeDeltaHours > 0) {
            const speedMph = rawDistance / timeDeltaHours;
            if (speedMph > MAX_SPEED_MPH) {
              console.warn(`[MILEAGE ANTI-FRAUD] Unrealistic speed ${speedMph.toFixed(0)} mph for driver ${userId}, session ${sessionId}`);
              return res.json({ 
                sessionId, 
                totalMilesAccumulated: activeSession.totalMilesAccumulated,
                warning: "Speed threshold exceeded" 
              });
            }
          }
        }

        milesDelta = rawDistance;
      }

      const updated = await storage.updateMileageSession(userId, sessionId, lat, lng, milesDelta);
      return res.json({
        sessionId,
        totalMilesAccumulated: updated?.totalMilesAccumulated || "0.00",
      });
    } catch (error) {
      console.error("Error updating mileage session:", error);
      return res.status(500).json({ message: "Failed to update mileage session" });
    }
  });

  app.post("/api/driver/mileage/session/end", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ message: "sessionId is required" });
      }

      const session = await storage.endMileageSession(userId, sessionId);
      if (!session) {
        return res.status(404).json({ message: "No active session found" });
      }

      return res.json({
        sessionId: session.sessionId,
        totalMilesAccumulated: session.totalMilesAccumulated,
        status: session.status,
      });
    } catch (error) {
      console.error("Error ending mileage session:", error);
      return res.status(500).json({ message: "Failed to end mileage session" });
    }
  });

  app.post("/api/driver/mileage/report", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { miles, source } = req.body;

      if (typeof miles !== "number" || miles <= 0 || miles > 500) {
        return res.status(400).json({ message: "Invalid mileage value" });
      }

      const validSource = source === "enroute" ? "enroute" : "trip";
      const taxYear = new Date().getFullYear();
      const record = await storage.addDriverMileage(userId, taxYear, miles, validSource as "trip" | "enroute");
      return res.json({ totalMilesOnline: record.totalMilesOnline, taxYear });
    } catch (error) {
      console.error("Error reporting driver mileage:", error);
      return res.status(500).json({ message: "Failed to report mileage" });
    }
  });

  app.get("/api/driver/mileage/:year", isAuthenticated, requireRole(["driver"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const record = await storage.getDriverMileageForYear(userId, year);
      return res.json({
        taxYear: year,
        totalMilesOnline: record ? parseFloat(record.totalMilesOnline) : 0,
        totalTripMiles: record ? parseFloat(record.totalTripMiles) : 0,
        totalEnrouteMiles: record ? parseFloat(record.totalEnrouteMiles) : 0,
        lastUpdatedAt: record?.lastUpdatedAt || null,
      });
    } catch (error) {
      console.error("Error fetching driver mileage:", error);
      return res.status(500).json({ message: "Failed to fetch mileage" });
    }
  });

  // Admin compliance: read-only mileage views
  app.get("/api/admin/mileage/driver/:driverId/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const driverId = req.params.driverId;
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const yearlyRecord = await storage.getDriverMileageForYear(driverId, year);
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year + 1, 0, 1);
      const dailyRecords = await storage.getDriverMileageDailyRecords(driverId, startOfYear, endOfYear);

      return res.json({
        driverId,
        taxYear: year,
        totalMilesOnline: yearlyRecord ? parseFloat(yearlyRecord.totalMilesOnline) : 0,
        totalTripMiles: yearlyRecord ? parseFloat(yearlyRecord.totalTripMiles) : 0,
        totalEnrouteMiles: yearlyRecord ? parseFloat(yearlyRecord.totalEnrouteMiles) : 0,
        lastUpdatedAt: yearlyRecord?.lastUpdatedAt || null,
        dailyRecordCount: dailyRecords.length,
        dailyRecords: dailyRecords.map(r => ({
          date: r.date,
          milesDriven: parseFloat(r.milesDriven),
          source: r.source,
        })),
      });
    } catch (error) {
      console.error("Error fetching admin mileage:", error);
      return res.status(500).json({ message: "Failed to fetch mileage data" });
    }
  });

  app.get("/api/admin/mileage/export/:year", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ message: "Invalid year" });

      const allRecords = await storage.getAllDriverMileageYearlySummaries();
      const yearRecords = allRecords.filter(r => r.taxYear === year);

      const csvLines = [
        `Driver ID,Tax Year,Total Miles Online,Trip Miles,En-Route Miles,Last Updated`,
        ...yearRecords.map(r =>
          `${r.driverUserId},${r.taxYear},${parseFloat(r.totalMilesOnline).toFixed(2)},${parseFloat(r.totalTripMiles).toFixed(2)},${parseFloat(r.totalEnrouteMiles).toFixed(2)},${r.lastUpdatedAt?.toISOString() || ""}`
        ),
      ];

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="mileage-audit-${year}.csv"`);
      return res.send(csvLines.join("\n"));
    } catch (error) {
      console.error("Error exporting mileage data:", error);
      return res.status(500).json({ message: "Failed to export mileage data" });
    }
  });

  // =============================================
  // SIMULATION CENTER
  // =============================================

  // System-level simulation status (public — no auth required)
  app.get("/api/simulation/system-status", (_req: any, res) => {
    const config = getSimulationConfig();
    return res.json({
      enabled: config.enabled,
      codeLength: config.codeLength,
      expiresMinutes: config.expiresMinutes,
    });
  });

  // Simulation guard middleware — blocks all simulation features if disabled
  const requireSimulationEnabled: RequestHandler = (_req, res, next) => {
    try {
      assertSimulationEnabled();
      next();
    } catch (err) {
      if (err instanceof SimulationDisabledError) {
        return res.status(403).json({ message: err.message });
      }
      next(err);
    }
  };

  // Admin: Create simulation code
  app.post("/api/admin/simulation/codes", isAuthenticated, requireSimulationEnabled, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role, countryCode, city, driverTier, walletBalance, ratingState, cashEnabled, reusable, expiresInHours } = req.body;

      if (!role || !["rider", "driver", "director", "admin"].includes(role)) {
        return res.status(400).json({ message: "Valid role required (rider, driver, director, admin)" });
      }

      const { codeLength } = getSimulationConfig();
      const min = Math.pow(10, codeLength - 1);
      const max = Math.pow(10, codeLength) - 1;
      const code = String(Math.floor(min + Math.random() * (max - min + 1)));

      const hours = expiresInHours || 24;
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

      const simCode = await storage.createSimulationCode({
        code,
        role,
        countryCode: countryCode || "NG",
        city: city || null,
        driverTier: driverTier || null,
        walletBalance: walletBalance || "0.00",
        ratingState: ratingState || "4.50",
        cashEnabled: cashEnabled !== false,
        reusable: reusable === true,
        expiresAt,
        createdBy: userId,
      });

      return res.json(simCode);
    } catch (error) {
      console.error("Error creating simulation code:", error);
      return res.status(500).json({ message: "Failed to create simulation code" });
    }
  });

  // Admin: List all simulation codes
  app.get("/api/admin/simulation/codes", isAuthenticated, requireSimulationEnabled, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const codes = await storage.getAllSimulationCodes();
      return res.json(codes);
    } catch (error) {
      console.error("Error fetching simulation codes:", error);
      return res.status(500).json({ message: "Failed to fetch simulation codes" });
    }
  });

  // Admin: Revoke simulation code
  app.post("/api/admin/simulation/codes/:id/revoke", isAuthenticated, requireSimulationEnabled, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid code ID" });
      await storage.revokeSimulationCode(id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error revoking simulation code:", error);
      return res.status(500).json({ message: "Failed to revoke simulation code" });
    }
  });

  // Admin: List all simulation sessions
  app.get("/api/admin/simulation/sessions", isAuthenticated, requireSimulationEnabled, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const sessions = await storage.getAllSimulationSessions();
      return res.json(sessions);
    } catch (error) {
      console.error("Error fetching simulation sessions:", error);
      return res.status(500).json({ message: "Failed to fetch simulation sessions" });
    }
  });

  // Admin: End a simulation session
  app.post("/api/admin/simulation/sessions/:id/end", isAuthenticated, requireSimulationEnabled, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid session ID" });
      await storage.endSimulationSession(id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error ending simulation session:", error);
      return res.status(500).json({ message: "Failed to end simulation session" });
    }
  });

  // Public: Validate simulation code (no auth required — this is the entry point)
  app.post("/api/simulation/validate", requireSimulationEnabled, async (req: any, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Simulation code required" });

      const simCode = await storage.getSimulationCode(code.trim());
      if (!simCode) return res.status(404).json({ message: "Invalid simulation code" });

      if (simCode.revokedAt) return res.status(410).json({ message: "This simulation code has been revoked" });
      if (new Date(simCode.expiresAt) < new Date()) return res.status(410).json({ message: "This simulation code has expired" });
      if (simCode.used && !simCode.reusable) return res.status(410).json({ message: "This simulation code has already been used" });

      return res.json({
        valid: true,
        role: simCode.role,
        countryCode: simCode.countryCode,
        city: simCode.city,
        cashEnabled: simCode.cashEnabled,
      });
    } catch (error) {
      console.error("Error validating simulation code:", error);
      return res.status(500).json({ message: "Failed to validate code" });
    }
  });

  app.post("/api/simulation/enter-direct", requireSimulationEnabled, async (req: any, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Simulation code required" });

      const simCode = await storage.getSimulationCode(code.trim());
      if (!simCode) return res.status(404).json({ message: "Invalid simulation code" });
      if (simCode.revokedAt) return res.status(410).json({ message: "This simulation code has been revoked" });
      if (new Date(simCode.expiresAt) < new Date()) return res.status(410).json({ message: "This simulation code has expired" });
      if (simCode.used && !simCode.reusable) return res.status(410).json({ message: "This simulation code has already been used" });

      const simUserId = `sim-${simCode.role}-${Date.now()}`;
      const simEmail = `${simCode.role}_sim_${code}@ziba.test`;
      const roleNames: Record<string, string> = { driver: "Driver", rider: "Rider", admin: "Admin", director: "Director" };
      const simFirstName = "Simulation";
      const simLastName = roleNames[simCode.role] || "User";

      if (!simCode.reusable) {
        await storage.markSimulationCodeUsed(simCode.id);
      }

      const sessionExpiry = new Date(simCode.expiresAt);
      const config = JSON.stringify({
        city: simCode.city,
        driverTier: simCode.driverTier,
        walletBalance: simCode.walletBalance,
        ratingState: simCode.ratingState,
        cashEnabled: simCode.cashEnabled,
      });

      const session = await storage.createSimulationSession({
        codeId: simCode.id,
        userId: simUserId,
        role: simCode.role,
        countryCode: simCode.countryCode,
        config,
        active: true,
        expiresAt: sessionExpiry,
      });

      const sessionData = req.session as any;
      sessionData.simulationActive = true;
      sessionData.simulatedUserId = simUserId;
      sessionData.simulatedEmail = simEmail;
      sessionData.simulatedFirstName = simFirstName;
      sessionData.simulatedLastName = simLastName;
      sessionData.simulatedRole = simCode.role;
      sessionData.simulatedCountryCode = simCode.countryCode;
      sessionData.simulationSessionId = session.id;

      req.session.save((err: any) => {
        if (err) {
          console.error("Error saving simulation session:", err);
          return res.status(500).json({ message: "Failed to save simulation session" });
        }
        return res.json({
          sessionId: session.id,
          role: simCode.role,
          countryCode: simCode.countryCode,
          config: JSON.parse(config),
          expiresAt: sessionExpiry,
          simulatedUser: {
            id: simUserId,
            email: simEmail,
            firstName: simFirstName,
            lastName: simLastName,
          },
        });
      });
    } catch (error) {
      console.error("Error entering direct simulation:", error);
      return res.status(500).json({ message: "Failed to enter simulation" });
    }
  });

  // Auth'd: Enter simulation mode (for already logged-in users)
  app.post("/api/simulation/enter", isAuthenticated, requireSimulationEnabled, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Simulation code required" });

      const simCode = await storage.getSimulationCode(code.trim());
      if (!simCode) return res.status(404).json({ message: "Invalid simulation code" });
      if (simCode.revokedAt) return res.status(410).json({ message: "This simulation code has been revoked" });
      if (new Date(simCode.expiresAt) < new Date()) return res.status(410).json({ message: "This simulation code has expired" });
      if (simCode.used && !simCode.reusable) return res.status(410).json({ message: "This simulation code has already been used" });

      // Check if user already has an active simulation
      const existing = await storage.getActiveSimulationSession(userId);
      if (existing) {
        await storage.endSimulationSession(existing.id);
      }

      // Mark code used
      if (!simCode.reusable) {
        await storage.markSimulationCodeUsed(simCode.id);
      }

      const sessionExpiry = new Date(simCode.expiresAt);

      const session = await storage.createSimulationSession({
        codeId: simCode.id,
        userId,
        role: simCode.role,
        countryCode: simCode.countryCode,
        config: JSON.stringify({
          city: simCode.city,
          driverTier: simCode.driverTier,
          walletBalance: simCode.walletBalance,
          ratingState: simCode.ratingState,
          cashEnabled: simCode.cashEnabled,
        }),
        active: true,
        expiresAt: sessionExpiry,
      });

      return res.json({
        sessionId: session.id,
        role: simCode.role,
        countryCode: simCode.countryCode,
        config: JSON.parse(session.config || "{}"),
        expiresAt: sessionExpiry,
      });
    } catch (error) {
      console.error("Error entering simulation:", error);
      return res.status(500).json({ message: "Failed to enter simulation" });
    }
  });

  app.get("/api/simulation/status", requireSimulationEnabled, async (req: any, res) => {
    try {
      const sessionData = req.session as any;
      if (sessionData?.simulationActive && sessionData?.simulatedUserId) {
        const simSessionId = sessionData.simulationSessionId;
        if (simSessionId) {
          const session = await storage.getSimulationSessionById?.(simSessionId);
          if (session && session.active && new Date(session.expiresAt) > new Date()) {
            return res.json({
              active: true,
              sessionId: session.id,
              role: session.role,
              countryCode: session.countryCode,
              config: JSON.parse(session.config || "{}"),
              expiresAt: session.expiresAt,
            });
          }
          if (session && (new Date(session.expiresAt) <= new Date() || !session.active)) {
            delete sessionData.simulationActive;
            delete sessionData.simulatedUserId;
            delete sessionData.simulatedEmail;
            delete sessionData.simulatedRole;
            delete sessionData.simulatedCountryCode;
            delete sessionData.simulationSessionId;
          }
        }
        if (sessionData.simulationActive) {
          return res.json({
            active: true,
            sessionId: sessionData.simulationSessionId,
            role: sessionData.simulatedRole,
            countryCode: sessionData.simulatedCountryCode,
            config: {},
            expiresAt: null,
          });
        }
      }

      if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = (req.user as any)?.claims?.sub;
        if (userId) {
          const session = await storage.getActiveSimulationSession(userId);
          if (!session || new Date(session.expiresAt) < new Date()) {
            if (session) await storage.endSimulationSession(session.id);
            return res.json({ active: false });
          }
          return res.json({
            active: true,
            sessionId: session.id,
            role: session.role,
            countryCode: session.countryCode,
            config: JSON.parse(session.config || "{}"),
            expiresAt: session.expiresAt,
          });
        }
      }

      return res.json({ active: false });
    } catch (error) {
      console.error("Error checking simulation status:", error);
      return res.status(500).json({ message: "Failed to check simulation status" });
    }
  });

  app.post("/api/simulation/exit", requireSimulationEnabled, async (req: any, res) => {
    try {
      const sessionData = req.session as any;

      if (sessionData?.simulationActive) {
        const simSessionId = sessionData.simulationSessionId;
        if (simSessionId) {
          await storage.endSimulationSession(simSessionId);
        }
        delete sessionData.simulationActive;
        delete sessionData.simulatedUserId;
        delete sessionData.simulatedEmail;
        delete sessionData.simulatedFirstName;
        delete sessionData.simulatedLastName;
        delete sessionData.simulatedRole;
        delete sessionData.simulatedCountryCode;
        delete sessionData.simulationSessionId;

        return req.session.save((err: any) => {
          if (err) console.error("Error saving session on exit:", err);
          return res.json({ success: true });
        });
      }

      if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = (req.user as any)?.claims?.sub;
        if (userId) {
          const session = await storage.getActiveSimulationSession(userId);
          if (session) {
            await storage.endSimulationSession(session.id);
          }
        }
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Error exiting simulation:", error);
      return res.status(500).json({ message: "Failed to exit simulation" });
    }
  });

  // Simulation: Generate a simulated ride event for driver
  app.post("/api/simulation/generate-ride", isAuthenticated, requireSimulationEnabled, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getActiveSimulationSession(userId);
      if (!session || session.role !== "driver") {
        return res.status(403).json({ message: "Active driver simulation required" });
      }

      const config = JSON.parse(session.config || "{}");
      const pickupLocations = [
        "Lagos Marina, Victoria Island",
        "Lekki Phase 1, Lagos",
        "Ikeja City Mall, Alausa",
        "Surulere Junction, Lagos",
        "Yaba Technology Hub",
        "Ajah Town Center",
        "Maryland Mall, Lagos",
        "Allen Avenue, Ikeja",
      ];
      const dropoffLocations = [
        "Banana Island, Ikoyi",
        "Computer Village, Ikeja",
        "Oshodi Terminal",
        "Apapa Port Complex",
        "National Theatre, Iganmu",
        "Third Mainland Bridge Plaza",
        "Festac Town Square",
        "Murtala Muhammed Airport",
      ];

      const pickup = pickupLocations[Math.floor(Math.random() * pickupLocations.length)];
      const dropoff = dropoffLocations[Math.floor(Math.random() * dropoffLocations.length)];
      const fare = (Math.floor(Math.random() * 4000) + 1000).toFixed(2);
      const paymentSource = config.cashEnabled && Math.random() > 0.5 ? "CASH" : "CARD";

      return res.json({
        simulated: true,
        rideRequest: {
          id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          pickupLocation: pickup,
          dropoffLocation: dropoff,
          fareAmount: fare,
          paymentSource,
          passengerCount: Math.floor(Math.random() * 3) + 1,
          riderName: "Simulated Rider",
          estimatedDuration: `${Math.floor(Math.random() * 30) + 10} min`,
          estimatedDistance: `${(Math.random() * 15 + 2).toFixed(1)} km`,
        },
      });
    } catch (error) {
      console.error("Error generating simulated ride:", error);
      return res.status(500).json({ message: "Failed to generate simulated ride" });
    }
  });

  // Simulation: Progress ride state (mock driver actions)
  app.post("/api/simulation/progress-ride", isAuthenticated, requireSimulationEnabled, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getActiveSimulationSession(userId);
      if (!session) {
        return res.status(403).json({ message: "Active simulation required" });
      }

      const { currentState, rideId } = req.body;
      const stateFlow = ["accepted", "driver_en_route", "arrived", "waiting", "in_progress", "completed"];
      const currentIdx = stateFlow.indexOf(currentState);

      if (currentIdx < 0 || currentIdx >= stateFlow.length - 1) {
        return res.json({ simulated: true, rideId, state: "completed", message: "Ride simulation complete" });
      }

      const nextState = stateFlow[currentIdx + 1];
      const delays: Record<string, number> = {
        driver_en_route: 3,
        arrived: 5,
        waiting: 2,
        in_progress: 8,
        completed: 0,
      };

      return res.json({
        simulated: true,
        rideId,
        previousState: currentState,
        state: nextState,
        estimatedSeconds: delays[nextState] || 3,
        message: nextState === "completed"
          ? "Trip completed! Earnings have been simulated."
          : `Moving to: ${nextState.replace(/_/g, " ")}`,
      });
    } catch (error) {
      console.error("Error progressing simulated ride:", error);
      return res.status(500).json({ message: "Failed to progress ride" });
    }
  });

  // Simulation: Generate rider ride request (simulated driver assignment)
  app.post("/api/simulation/rider-request", isAuthenticated, requireSimulationEnabled, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const session = await storage.getActiveSimulationSession(userId);
      if (!session || session.role !== "rider") {
        return res.status(403).json({ message: "Active rider simulation required" });
      }

      const { pickup, dropoff, paymentMethod } = req.body;
      const fare = (Math.floor(Math.random() * 4000) + 1000).toFixed(2);

      return res.json({
        simulated: true,
        ride: {
          id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: "accepted",
          pickupLocation: pickup || "Simulated Pickup",
          dropoffLocation: dropoff || "Simulated Dropoff",
          fareAmount: fare,
          paymentSource: paymentMethod || "CARD",
          driverName: "Simulated Driver",
          driverRating: "4.8",
          vehicleMake: "Toyota",
          vehicleModel: "Camry",
          licensePlate: "SIM-001",
          estimatedArrival: `${Math.floor(Math.random() * 10) + 3} min`,
        },
      });
    } catch (error) {
      console.error("Error generating rider simulation:", error);
      return res.status(500).json({ message: "Failed to generate rider ride" });
    }
  });

  // Simulation cleanup scheduler — runs every minute
  setInterval(async () => {
    try {
      const cleaned = await storage.cleanupExpiredSimulations();
      if (cleaned > 0) {
        console.log(`[SIMULATION] Cleaned up ${cleaned} expired simulation sessions`);
      }
    } catch (error) {
      console.error("[SIMULATION SCHEDULER] Error:", error);
    }
  }, 60 * 1000);

  // Cash Settlement Ledger Scheduler — runs every hour
  const SETTLEMENT_INTERVAL = 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const pendingLedgers = await storage.getAllPendingLedgers();
      const now = new Date();
      for (const ledger of pendingLedgers) {
        if (new Date(ledger.periodEnd) < now) {
          const abuseFlags = await storage.getDriverCashAbuseFlags(ledger.driverId);
          if (abuseFlags.flagged) {
            await storage.deferLedgerEntry(ledger.id, "Auto-deferred: abuse flag triggered");
            console.log(`[SETTLEMENT] Deferred ledger ${ledger.id} for driver ${ledger.driverId} - abuse flag`);
          } else {
            await storage.executePeriodSettlement(ledger.id, "card_trip_offset");
            console.log(`[SETTLEMENT] Settled ledger ${ledger.id} for driver ${ledger.driverId}`);
          }
        }
      }
    } catch (error) {
      console.error("[SETTLEMENT SCHEDULER] Error:", error);
    }
  }, SETTLEMENT_INTERVAL);
  console.log("[SETTLEMENT SCHEDULER] Started — polling every 60min for period settlements");

  // =============================================
  // BANK TRANSFER WALLET FUNDING
  // =============================================

  app.post("/api/wallet/bank-transfer", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount, currency } = req.body;

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      const userRole = await storage.getUserRole(userId);
      if (!userRole) {
        return res.status(403).json({ message: "User role not found" });
      }

      const userCurrency = currency || await getUserCurrency(userId);
      const referenceCode = `ZIBA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const transfer = await storage.createBankTransfer({
        userId,
        userRole: userRole.role,
        amount: String(amount),
        currency: userCurrency,
        referenceCode,
        bankName: "ZIBA Payment Bank",
        accountNumber: "0123456789",
        status: "pending",
      });

      return res.json({
        referenceCode: transfer.referenceCode,
        bankName: "ZIBA Payment Bank",
        accountNumber: "0123456789",
        amount: transfer.amount,
        currency: transfer.currency,
        instructions: "Transfer the exact amount using the reference code. Funds will be credited after confirmation.",
      });
    } catch (error) {
      console.error("Error initiating bank transfer:", error);
      return res.status(500).json({ message: "Failed to initiate bank transfer" });
    }
  });

  app.get("/api/wallet/bank-transfers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transfers = await storage.getBankTransfersByUser(userId);
      return res.json(transfers);
    } catch (error) {
      console.error("Error fetching bank transfers:", error);
      return res.status(500).json({ message: "Failed to fetch bank transfers" });
    }
  });

  app.get("/api/admin/bank-transfers", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const transfers = await storage.getAllBankTransfers(status);
      const transfersWithUserInfo = await Promise.all(transfers.map(async (transfer) => {
        const [user] = await db.select().from(users).where(eq(users.id, transfer.userId));
        return {
          ...transfer,
          userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username || "Unknown",
          userEmail: user?.email || "",
        };
      }));
      return res.json(transfersWithUserInfo);
    } catch (error) {
      console.error("Error fetching admin bank transfers:", error);
      return res.status(500).json({ message: "Failed to fetch bank transfers" });
    }
  });

  app.post("/api/admin/bank-transfers/:id/approve", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const transferId = req.params.id;

      const allTransfers = await storage.getAllBankTransfers();
      const transfer = allTransfers.find(t => t.id === transferId);
      if (!transfer) {
        return res.status(404).json({ message: "Bank transfer not found" });
      }

      if (transfer.status !== "pending" && transfer.status !== "processing") {
        return res.status(400).json({ message: `Cannot approve transfer with status: ${transfer.status}` });
      }

      const updated = await storage.updateBankTransferStatus(transferId, "completed", adminId);
      if (!updated) {
        return res.status(500).json({ message: "Failed to update transfer status" });
      }

      if (transfer.userRole === "rider") {
        await storage.updateRiderWalletBalance(transfer.userId, parseFloat(transfer.amount), "credit");
      } else if (transfer.userRole === "driver") {
        await storage.creditDriverWallet(transfer.userId, transfer.amount, "bank-transfer");
      }

      await storage.createAuditLog({
        action: "bank_transfer_approved",
        entityType: "bank_transfer",
        entityId: transferId,
        performedBy: adminId,
        details: `Approved bank transfer of ${transfer.amount} ${transfer.currency} for ${transfer.userRole} ${transfer.userId}. Reference: ${transfer.referenceCode}`,
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error approving bank transfer:", error);
      return res.status(500).json({ message: "Failed to approve bank transfer" });
    }
  });

  app.post("/api/admin/bank-transfers/:id/flag", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const transferId = req.params.id;
      const { notes } = req.body;

      const updated = await storage.updateBankTransferStatus(transferId, "flagged", adminId, notes);
      if (!updated) {
        return res.status(404).json({ message: "Bank transfer not found" });
      }

      await storage.createAuditLog({
        action: "bank_transfer_flagged",
        entityType: "bank_transfer",
        entityId: transferId,
        performedBy: adminId,
        details: `Flagged bank transfer as suspicious. Notes: ${notes || "N/A"}`,
      });

      return res.json(updated);
    } catch (error) {
      console.error("Error flagging bank transfer:", error);
      return res.status(500).json({ message: "Failed to flag bank transfer" });
    }
  });

  // =============================================
  // CORPORATE RIDE MANAGEMENT - Admin Routes
  // =============================================

  // 1. GET /api/admin/corporate/organizations - List all corporate organizations
  app.get("/api/admin/corporate/organizations", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const orgs = await db.select().from(tripCoordinatorProfiles);
      const result = await Promise.all(orgs.map(async (org) => {
        const [user] = await db.select().from(users).where(eq(users.id, org.userId));
        const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, org.userId));
        const [totalRidesResult] = await db.select({ count: count() }).from(rides).where(eq(rides.riderId, org.userId));
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const [monthlyRidesResult] = await db.select({ count: count() }).from(rides).where(and(eq(rides.riderId, org.userId), gte(rides.requestedAt, monthStart)));
        return {
          id: org.id,
          userId: org.userId,
          organizationName: org.organizationName,
          organizationType: org.organizationType,
          contactEmail: org.contactEmail,
          contactPhone: org.contactPhone,
          status: "Active",
          walletBalance: wallet?.balance || "0.00",
          currency: wallet?.currency || "NGN",
          totalRides: totalRidesResult?.count || 0,
          monthlyRides: monthlyRidesResult?.count || 0,
          createdAt: org.createdAt,
        };
      }));
      return res.json(result);
    } catch (error) {
      console.error("Error fetching corporate organizations:", error);
      return res.status(500).json({ message: "Failed to fetch corporate organizations" });
    }
  });

  // 2. POST /api/admin/corporate/organizations/:id/suspend - Suspend organization
  app.post("/api/admin/corporate/organizations/:id/suspend", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const performedBy = req.user.claims.sub;
      await storage.createAuditLog({
        action: "CORPORATE_ORG_SUSPENDED",
        entityType: "corporate_organization",
        entityId: id,
        performedByUserId: performedBy,
        performedByRole: req.userRole,
        metadata: JSON.stringify({ action: "suspend", timestamp: new Date().toISOString() }),
      });
      return res.json({ message: "Organization suspended successfully" });
    } catch (error) {
      console.error("Error suspending corporate organization:", error);
      return res.status(500).json({ message: "Failed to suspend organization" });
    }
  });

  // 3. POST /api/admin/corporate/organizations/:id/activate - Activate organization
  app.post("/api/admin/corporate/organizations/:id/activate", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const performedBy = req.user.claims.sub;
      await storage.createAuditLog({
        action: "CORPORATE_ORG_ACTIVATED",
        entityType: "corporate_organization",
        entityId: id,
        performedByUserId: performedBy,
        performedByRole: req.userRole,
        metadata: JSON.stringify({ action: "activate", timestamp: new Date().toISOString() }),
      });
      return res.json({ message: "Organization activated successfully" });
    } catch (error) {
      console.error("Error activating corporate organization:", error);
      return res.status(500).json({ message: "Failed to activate organization" });
    }
  });

  // 4. GET /api/admin/corporate/members - Returns corporate members
  app.get("/api/admin/corporate/members", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const coordinators = await db.select().from(tripCoordinatorProfiles);
      const coordinatorUserIds = coordinators.map(c => c.userId);
      if (coordinatorUserIds.length === 0) {
        return res.json([]);
      }
      const corporateRides = await db.select().from(rides).where(inArray(rides.riderId, coordinatorUserIds));
      const memberMap = new Map<string, { orgName: string; rideCount: number }>();
      for (const ride of corporateRides) {
        const coord = coordinators.find(c => c.userId === ride.riderId);
        if (coord) {
          const existing = memberMap.get(coord.userId) || { orgName: coord.organizationName, rideCount: 0 };
          existing.rideCount++;
          memberMap.set(coord.userId, existing);
        }
      }
      const result = await Promise.all(
        Array.from(memberMap.entries()).map(async ([userId, data]) => {
          const [user] = await db.select().from(users).where(eq(users.id, userId));
          return {
            id: userId,
            name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown",
            email: user?.email || "",
            organizationName: data.orgName,
            rideCount: data.rideCount,
            status: "Active",
          };
        })
      );
      return res.json(result);
    } catch (error) {
      console.error("Error fetching corporate members:", error);
      return res.status(500).json({ message: "Failed to fetch corporate members" });
    }
  });

  // 5. GET /api/admin/corporate/trips - Returns corporate trips
  app.get("/api/admin/corporate/trips", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const { status, organizationId, startDate, endDate } = req.query;
      const coordinators = await db.select().from(tripCoordinatorProfiles);
      let coordinatorUserIds = coordinators.map(c => c.userId);
      if (organizationId) {
        const filtered = coordinators.filter(c => c.id === organizationId);
        coordinatorUserIds = filtered.map(c => c.userId);
      }
      if (coordinatorUserIds.length === 0) {
        return res.json([]);
      }
      const conditions: any[] = [inArray(rides.riderId, coordinatorUserIds)];
      if (status) {
        conditions.push(eq(rides.status, status as any));
      }
      if (startDate) {
        conditions.push(gte(rides.requestedAt, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lt(rides.requestedAt, new Date(endDate as string)));
      }
      const corporateRides = await db.select().from(rides).where(and(...conditions)).orderBy(desc(rides.requestedAt));
      const result = await Promise.all(corporateRides.map(async (ride) => {
        const coord = coordinators.find(c => c.userId === ride.riderId);
        const [rider] = await db.select().from(users).where(eq(users.id, ride.riderId));
        return {
          id: ride.id,
          organizationName: coord?.organizationName || "Unknown",
          riderName: rider ? `${rider.firstName || ""} ${rider.lastName || ""}`.trim() : "Unknown",
          pickupAddress: ride.pickupAddress,
          dropoffAddress: ride.dropoffAddress,
          status: ride.status,
          fareAmount: ride.totalFare,
          hasCancellationFee: ride.cancellationFee !== null && parseFloat(ride.cancellationFee || "0") > 0,
          cancellationReason: ride.cancelReason,
          cancelledAt: ride.cancelledAt,
          createdAt: ride.requestedAt,
        };
      }));
      return res.json(result);
    } catch (error) {
      console.error("Error fetching corporate trips:", error);
      return res.status(500).json({ message: "Failed to fetch corporate trips" });
    }
  });

  // 6. GET /api/admin/corporate/scheduled-rides - Returns scheduled corporate rides
  app.get("/api/admin/corporate/scheduled-rides", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const { filter } = req.query;
      const coordinators = await db.select().from(tripCoordinatorProfiles);
      const coordinatorUserIds = coordinators.map(c => c.userId);
      if (coordinatorUserIds.length === 0) {
        return res.json([]);
      }
      const conditions: any[] = [
        inArray(rides.riderId, coordinatorUserIds),
        isNotNull(rides.scheduledPickupAt),
      ];
      const now = new Date();
      if (filter === "upcoming") {
        conditions.push(gte(rides.scheduledPickupAt, now));
      } else if (filter === "completed") {
        conditions.push(eq(rides.status, "completed"));
      }
      const scheduledRides = await db.select().from(rides).where(and(...conditions)).orderBy(desc(rides.scheduledPickupAt));
      const result = await Promise.all(scheduledRides.map(async (ride) => {
        const coord = coordinators.find(c => c.userId === ride.riderId);
        const [rider] = await db.select().from(users).where(eq(users.id, ride.riderId));
        return {
          id: ride.id,
          organizationName: coord?.organizationName || "Unknown",
          riderName: rider ? `${rider.firstName || ""} ${rider.lastName || ""}`.trim() : "Unknown",
          pickupLocation: ride.pickupAddress,
          dropoffLocation: ride.dropoffAddress,
          scheduledPickupAt: ride.scheduledPickupAt,
          status: ride.status,
          fareAmount: ride.totalFare,
        };
      }));
      return res.json(result);
    } catch (error) {
      console.error("Error fetching corporate scheduled rides:", error);
      return res.status(500).json({ message: "Failed to fetch corporate scheduled rides" });
    }
  });

  // 7. GET /api/admin/corporate/wallets - Returns corporate wallets
  app.get("/api/admin/corporate/wallets", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const coordinators = await db.select().from(tripCoordinatorProfiles);
      const result = await Promise.all(coordinators.map(async (coord) => {
        const [wallet] = await db.select().from(riderWallets).where(eq(riderWallets.userId, coord.userId));
        return {
          id: wallet?.id || coord.id,
          organizationName: coord.organizationName,
          balance: wallet?.balance || "0.00",
          currency: wallet?.currency || "NGN",
          isFrozen: wallet?.isFrozen || false,
          userId: coord.userId,
        };
      }));
      return res.json(result);
    } catch (error) {
      console.error("Error fetching corporate wallets:", error);
      return res.status(500).json({ message: "Failed to fetch corporate wallets" });
    }
  });

  // 8. POST /api/admin/corporate/wallets/:userId/freeze - Freeze corporate wallet
  app.post("/api/admin/corporate/wallets/:userId/freeze", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const performedBy = req.user.claims.sub;
      await db.update(riderWallets).set({ isFrozen: true, frozenAt: new Date(), frozenBy: performedBy }).where(eq(riderWallets.userId, userId));
      await storage.createAuditLog({
        action: "CORPORATE_WALLET_FROZEN",
        entityType: "corporate_organization",
        entityId: userId,
        performedByUserId: performedBy,
        performedByRole: req.userRole,
        metadata: JSON.stringify({ action: "freeze_wallet", userId, timestamp: new Date().toISOString() }),
      });
      return res.json({ message: "Corporate wallet frozen successfully" });
    } catch (error) {
      console.error("Error freezing corporate wallet:", error);
      return res.status(500).json({ message: "Failed to freeze corporate wallet" });
    }
  });

  // 9. POST /api/admin/corporate/wallets/:userId/unfreeze - Unfreeze corporate wallet
  app.post("/api/admin/corporate/wallets/:userId/unfreeze", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const performedBy = req.user.claims.sub;
      await db.update(riderWallets).set({ isFrozen: false, frozenAt: null, frozenBy: null, frozenReason: null }).where(eq(riderWallets.userId, userId));
      await storage.createAuditLog({
        action: "CORPORATE_WALLET_UNFROZEN",
        entityType: "corporate_organization",
        entityId: userId,
        performedByUserId: performedBy,
        performedByRole: req.userRole,
        metadata: JSON.stringify({ action: "unfreeze_wallet", userId, timestamp: new Date().toISOString() }),
      });
      return res.json({ message: "Corporate wallet unfrozen successfully" });
    } catch (error) {
      console.error("Error unfreezing corporate wallet:", error);
      return res.status(500).json({ message: "Failed to unfreeze corporate wallet" });
    }
  });

  // 10. GET /api/admin/corporate/wallets/:userId/transactions - Get wallet transaction history
  app.get("/api/admin/corporate/wallets/:userId/transactions", isAuthenticated, requireRole(["admin", "super_admin", "finance"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
      if (!wallet) {
        return res.json([]);
      }
      const transactions = await db.select().from(walletTransactions).where(eq(walletTransactions.walletId, wallet.id)).orderBy(desc(walletTransactions.createdAt));
      return res.json(transactions);
    } catch (error) {
      console.error("Error fetching corporate wallet transactions:", error);
      return res.status(500).json({ message: "Failed to fetch wallet transactions" });
    }
  });

  // 11. POST /api/admin/corporate/members/:id/revoke - Revoke member access
  app.post("/api/admin/corporate/members/:id/revoke", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const performedBy = req.user.claims.sub;
      await storage.createAuditLog({
        action: "CORPORATE_MEMBER_REVOKED",
        entityType: "corporate_member",
        entityId: id,
        performedByUserId: performedBy,
        performedByRole: req.userRole,
        metadata: JSON.stringify({ action: "revoke_access", memberId: id, timestamp: new Date().toISOString() }),
      });
      return res.json({ message: "Member access revoked successfully" });
    } catch (error) {
      console.error("Error revoking corporate member access:", error);
      return res.status(500).json({ message: "Failed to revoke member access" });
    }
  });

  // CANCELLATION FEE SETTINGS - Admin Routes
  app.get("/api/admin/cancellation-fee-settings", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const countryCode = (req.query.countryCode as string) || "NG";
      const [rule] = await db.select().from(countryPricingRules).where(eq(countryPricingRules.countryId, countryCode));
      if (!rule) {
        return res.json({
          countryCode,
          gracePeriodMinutes: 3,
          cancellationFee: "500.00",
          cancellationFeeArrivedMultiplier: "1.50",
          feeEnRoute: 500,
          feeArrived: 750,
          currency: "NGN",
        });
      }
      const fee = parseFloat(rule.cancellationFee);
      const multiplier = parseFloat(rule.cancellationFeeArrivedMultiplier);
      return res.json({
        countryCode,
        gracePeriodMinutes: 3,
        cancellationFee: rule.cancellationFee,
        cancellationFeeArrivedMultiplier: rule.cancellationFeeArrivedMultiplier,
        feeEnRoute: fee,
        feeArrived: fee * multiplier,
        currency: rule.currency,
      });
    } catch (error) {
      console.error("Error fetching cancellation fee settings:", error);
      return res.status(500).json({ message: "Failed to fetch cancellation fee settings" });
    }
  });

  app.post("/api/admin/cancellation-fee-settings", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { countryCode = "NG", cancellationFee, cancellationFeeArrivedMultiplier } = req.body;
      if (!cancellationFee || !cancellationFeeArrivedMultiplier) {
        return res.status(400).json({ message: "cancellationFee and cancellationFeeArrivedMultiplier are required" });
      }
      const performedBy = req.user.claims.sub;
      await db.update(countryPricingRules)
        .set({
          cancellationFee: String(cancellationFee),
          cancellationFeeArrivedMultiplier: String(cancellationFeeArrivedMultiplier),
          updatedAt: new Date(),
        })
        .where(eq(countryPricingRules.countryId, countryCode));
      await storage.createAuditLog({
        action: "CANCELLATION_FEE_UPDATED",
        entityType: "country_pricing_rules",
        entityId: countryCode,
        performedByUserId: performedBy,
        performedByRole: req.userRole,
        metadata: JSON.stringify({ countryCode, cancellationFee, cancellationFeeArrivedMultiplier }),
      });
      return res.json({ message: "Cancellation fee settings updated successfully" });
    } catch (error) {
      console.error("Error updating cancellation fee settings:", error);
      return res.status(500).json({ message: "Failed to update cancellation fee settings" });
    }
  });

  // 12. POST /api/admin/corporate/members/:id/restore - Restore member access
  app.post("/api/admin/corporate/members/:id/restore", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const performedBy = req.user.claims.sub;
      await storage.createAuditLog({
        action: "CORPORATE_MEMBER_RESTORED",
        entityType: "corporate_member",
        entityId: id,
        performedByUserId: performedBy,
        performedByRole: req.userRole,
        metadata: JSON.stringify({ action: "restore_access", memberId: id, timestamp: new Date().toISOString() }),
      });
      return res.json({ message: "Member access restored successfully" });
    } catch (error) {
      console.error("Error restoring corporate member access:", error);
      return res.status(500).json({ message: "Failed to restore member access" });
    }
  });

  // =============================================
  // CANCELLATION FEE CONFIG ROUTES
  // =============================================
  app.get("/api/admin/cancellation-fee-config", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const configs = await storage.getAllCancellationFeeConfigs();
      return res.json(configs);
    } catch (error) {
      console.error("Error getting cancellation fee configs:", error);
      return res.status(500).json({ message: "Failed to get cancellation fee configs" });
    }
  });

  app.put("/api/admin/cancellation-fee-config", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, updatedBy: userId };
      const config = await storage.upsertCancellationFeeConfig(data);
      return res.json(config);
    } catch (error) {
      console.error("Error updating cancellation fee config:", error);
      return res.status(500).json({ message: "Failed to update cancellation fee config" });
    }
  });

  // =============================================
  // RIDER INBOX MESSAGES ROUTES
  // =============================================
  app.get("/api/rider/inbox", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let messages = await storage.getRiderInboxMessages(userId);

      if (messages.length === 0) {
        await storage.createRiderInboxMessage({
          userId,
          title: "Welcome to ZIBA!",
          body: "We're so happy to have you here! ZIBA connects you with safe and reliable rides whenever you need them. Enjoy your journey with us.",
          type: "system_announcement",
          read: false,
        });
        messages = await storage.getRiderInboxMessages(userId);
      }

      return res.json(messages);
    } catch (error) {
      console.error("Error getting rider inbox:", error);
      return res.status(500).json({ message: "Failed to get inbox messages" });
    }
  });

  app.post("/api/rider/inbox/:messageId/read", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messageId } = req.params;
      const message = await storage.markRiderInboxMessageRead(messageId, userId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      return res.json(message);
    } catch (error) {
      console.error("Error marking message as read:", error);
      return res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.post("/api/rider/inbox/read-all", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllRiderInboxMessagesRead(userId);
      return res.json({ message: "All messages marked as read" });
    } catch (error) {
      console.error("Error marking all messages as read:", error);
      return res.status(500).json({ message: "Failed to mark all messages as read" });
    }
  });

  app.get("/api/rider/inbox/unread-count", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getRiderUnreadMessageCount(userId);
      return res.json({ count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      return res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  app.get("/api/admin/rider-inbox/:userId", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const messages = await storage.getRiderInboxMessages(userId);
      return res.json(messages);
    } catch (error) {
      console.error("Error getting rider inbox for admin:", error);
      return res.status(500).json({ message: "Failed to get rider inbox" });
    }
  });

  // =============================================
  // NOTIFICATION PREFERENCES ROUTES
  // =============================================
  app.get("/api/rider/notification-preferences", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const prefs = await storage.getNotificationPreferences(userId);
      return res.json(prefs);
    } catch (error) {
      console.error("Error getting notification preferences:", error);
      return res.status(500).json({ message: "Failed to get notification preferences" });
    }
  });

  app.put("/api/rider/notification-preferences", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      const prefs = await storage.updateNotificationPreferences(userId, updates);
      return res.json(prefs);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      return res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // =============================================
  // MARKETING MESSAGES ROUTE
  // =============================================
  app.get("/api/rider/marketing-tip", isAuthenticated, requireRole(["rider"]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const activeTrips = await storage.getActiveTripsByUser(userId);
      if (activeTrips && activeTrips.length > 0) {
        return res.json({ eligible: false, reason: "Active trip in progress" });
      }

      const lastMessage = await storage.getLastMarketingMessage(userId);
      if (lastMessage && lastMessage.sentAt) {
        const hoursSinceLast = (Date.now() - new Date(lastMessage.sentAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLast < 24) {
          return res.json({ eligible: false, reason: "Already received a tip today" });
        }
      }

      const tips = [
        { key: "wallet_topup", text: "Top up your wallet for faster checkouts and avoid payment delays during rides." },
        { key: "schedule_rides", text: "Schedule your rides in advance to guarantee a driver at your preferred time." },
        { key: "rate_drivers", text: "Rating your drivers helps us match you with the best rides every time." },
        { key: "trusted_contacts", text: "Add trusted contacts so they can track your trip in real time for safety." },
        { key: "promo_codes", text: "Check your inbox for promo codes and discounts on your next ride." },
        { key: "peak_hours", text: "Avoid peak hours (7-9 AM, 5-7 PM) for lower fares and faster pickups." },
      ];

      const tipIndex = Math.floor(Math.random() * tips.length);
      const tip = tips[tipIndex];

      const message = await storage.createMarketingMessage({
        userId,
        messageKey: tip.key,
        messageText: tip.text,
      });

      return res.json({ eligible: true, tip: tip.text, messageKey: tip.key, messageId: message.id });
    } catch (error) {
      console.error("Error getting marketing tip:", error);
      return res.status(500).json({ message: "Failed to get marketing tip" });
    }
  });

  // =============================================
  // SEED DEFAULT NG CANCELLATION FEE CONFIG
  // =============================================
  (async () => {
    try {
      const existingConfig = await storage.getCancellationFeeConfig("NG");
      if (!existingConfig) {
        await storage.upsertCancellationFeeConfig({
          countryCode: "NG",
          cancellationFeeAmount: "500.00",
          scheduledPenaltyAmount: "750.00",
          gracePeriodMinutes: 3,
          scheduledCancelWindowMinutes: 30,
          arrivedCancellationFeeAmount: "800.00",
          isActive: true,
        });
        console.log("[SEED] Default NG cancellation fee config created");
      }
    } catch (error) {
      console.error("[SEED] Error seeding cancellation fee config:", error);
    }
  })();

  // Saved Places
  app.get("/api/rider/saved-places", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const places = await storage.getSavedPlaces(userId);
      return res.json(places);
    } catch (error) {
      console.error("Error fetching saved places:", error);
      return res.status(500).json({ message: "Failed to fetch saved places" });
    }
  });

  app.put("/api/rider/saved-places/:type", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const { type } = req.params;
      if (type !== "home" && type !== "work") {
        return res.status(400).json({ message: "Type must be 'home' or 'work'" });
      }
      const { address, notes, lat, lng } = req.body;
      if (!address || !address.trim()) {
        return res.status(400).json({ message: "Address is required" });
      }
      const place = await storage.upsertSavedPlace(userId, type, {
        address: address.trim(),
        notes: notes?.trim() || null,
        lat: lat || null,
        lng: lng || null,
      });
      return res.json(place);
    } catch (error) {
      console.error("Error saving place:", error);
      return res.status(500).json({ message: "Failed to save place" });
    }
  });

  return httpServer;
}
