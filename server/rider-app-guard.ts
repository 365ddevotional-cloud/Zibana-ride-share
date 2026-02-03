import type { RequestHandler } from "express";
import { storage } from "./storage";

const RIDER_APP_MODE = "RIDER" as const;
const ALLOWED_ROLE = "rider";

export const requireRiderRole: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userRole = await storage.getUserRole(userId);
    
    if (!userRole) {
      return next();
    }

    if (userRole.role !== ALLOWED_ROLE) {
      console.warn(`[RIDER APP SECURITY] Non-rider access blocked: userId=${userId}, role=${userRole.role}, appMode=${RIDER_APP_MODE}, timestamp=${new Date().toISOString()}`);
      return res.status(403).json({ 
        message: "This app is for Riders only",
        code: "ROLE_NOT_ALLOWED",
        appMode: RIDER_APP_MODE
      });
    }

    next();
  } catch (error) {
    console.error("Error in rider app guard:", error);
    return res.status(500).json({ message: "Failed to verify access" });
  }
};

export function logRiderAppSecurityEvent(userId: string, attemptedRole: string, action: string) {
  console.warn(`[RIDER APP SECURITY AUDIT] ${action}: userId=${userId}, attemptedRole=${attemptedRole}, appMode=${RIDER_APP_MODE}, timestamp=${new Date().toISOString()}`);
}
