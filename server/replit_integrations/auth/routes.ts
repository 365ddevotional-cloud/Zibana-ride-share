import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      if (req.user._isSimulated) {
        const sessionData = req.session as any;
        return res.json({
          id: userId,
          email: req.user.claims.email,
          firstName: req.user.claims.first_name || "Simulation",
          lastName: req.user.claims.last_name || "User",
          profileImageUrl: null,
          themePreference: "system",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _simulation: true,
          _simulationRole: sessionData?.simulatedRole || null,
          _simulationCountry: sessionData?.simulatedCountryCode || null,
        });
      }

      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
