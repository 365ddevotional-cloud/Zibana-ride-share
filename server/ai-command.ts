import OpenAI from "openai";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { 
  trips, users, wallets, disputes, driverProfiles, riderProfiles,
  aiCommandAuditLogs, platformSettings, tripRatings
} from "@shared/schema";
import { sql, eq, gte, and, count, avg, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

let aiCommandOverride: boolean | null = null;

function isAiEnabled(): boolean {
  if (aiCommandOverride !== null) return aiCommandOverride;
  return process.env.AI_COMMAND_ENABLED === "true";
}

const SYSTEM_PROMPT = `You are ZIBA AI Command Intelligence.
You analyze structured operational data for a ride-hailing platform operating in emerging markets.
You do not invent numbers. If data is missing, say so.
You provide recommendations but do not execute actions.
You format responses with clear sections, bullet points, and actionable insights.
You respond concisely and professionally. Keep answers focused and data-driven.`;

async function getDataContext() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    trips7d,
    trips30d,
    cancelledTrips7d,
    completedTrips7d,
    activeDriversResult,
    activeRidersResult,
    disputeCountResult,
    avgRatingResult,
    walletTotalResult,
    platformSettingsResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(trips).where(gte(trips.createdAt, sevenDaysAgo)),
    db.select({ count: count() }).from(trips).where(gte(trips.createdAt, thirtyDaysAgo)),
    db.select({ count: count() }).from(trips).where(
      and(gte(trips.createdAt, sevenDaysAgo), eq(trips.status, "cancelled"))
    ),
    db.select({ count: count() }).from(trips).where(
      and(gte(trips.createdAt, sevenDaysAgo), eq(trips.status, "completed"))
    ),
    db.select({ count: count() }).from(driverProfiles).where(eq(driverProfiles.status, "approved")),
    db.select({ count: count() }).from(riderProfiles),
    db.select({ count: count() }).from(disputes).where(eq(disputes.status, "open")),
    db.select({ avg: avg(tripRatings.score) }).from(tripRatings).where(
      and(gte(tripRatings.createdAt, thirtyDaysAgo), sql`${tripRatings.ratingRole} = 'rider_to_driver'`)
    ),
    db.select({ total: sql<string>`COALESCE(SUM(${wallets.balance}), 0)` }).from(wallets),
    db.select().from(platformSettings).limit(1),
  ]);

  const totalTrips7d = trips7d[0]?.count ?? 0;
  const totalTrips30d = trips30d[0]?.count ?? 0;
  const cancelled7d = cancelledTrips7d[0]?.count ?? 0;
  const completed7d = completedTrips7d[0]?.count ?? 0;
  const cancellationRate = totalTrips7d > 0 ? ((cancelled7d / totalTrips7d) * 100).toFixed(1) : "0";
  const acceptanceRate = totalTrips7d > 0 ? ((completed7d / totalTrips7d) * 100).toFixed(1) : "0";

  return {
    period: { from: sevenDaysAgo.toISOString(), to: now.toISOString() },
    trips: {
      total_7d: totalTrips7d,
      total_30d: totalTrips30d,
      cancelled_7d: cancelled7d,
      completed_7d: completed7d,
      cancellation_rate_7d: `${cancellationRate}%`,
      acceptance_rate_7d: `${acceptanceRate}%`,
    },
    users: {
      active_drivers: activeDriversResult[0]?.count ?? 0,
      active_riders: activeRidersResult[0]?.count ?? 0,
    },
    disputes: {
      open_count: disputeCountResult[0]?.count ?? 0,
    },
    ratings: {
      avg_driver_rating_30d: avgRatingResult[0]?.avg ? Number(avgRatingResult[0].avg).toFixed(2) : "N/A",
    },
    wallets: {
      total_balance: walletTotalResult[0]?.total ?? "0",
    },
    platform: {
      environment: platformSettingsResult[0]?.environment ?? "PRE_LAUNCH",
      isLive: platformSettingsResult[0]?.environment === "LIVE",
    },
  };
}

export function registerAiCommandRoutes(
  app: Express,
  isAuthenticated: RequestHandler,
  requireRole: (roles: string[]) => RequestHandler,
  requireSuperAdmin: RequestHandler
) {
  app.get("/api/admin/ai/status", isAuthenticated, requireRole(["admin", "super_admin"]), async (_req: any, res) => {
    try {
      return res.json({ enabled: isAiEnabled() });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get AI status" });
    }
  });

  app.get("/api/admin/ai/data-context", isAuthenticated, requireRole(["admin", "super_admin"]), async (_req: any, res) => {
    try {
      const context = await getDataContext();
      return res.json(context);
    } catch (error) {
      console.error("Error getting AI data context:", error);
      return res.status(500).json({ message: "Failed to aggregate data context" });
    }
  });

  app.post("/api/admin/ai/query", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    const adminId = req.user?.claims?.sub || "unknown";
    const { question, queryType = "ask" } = req.body;

    if (!isAiEnabled()) {
      await db.insert(aiCommandAuditLogs).values({
        adminId,
        queryType,
        query: question,
        aiEnabled: false,
        responseStatus: "AI_DISABLED",
      });
      return res.json({
        status: "AI_DISABLED",
        message: "ZIBA AI Command Layer is currently offline.",
      });
    }

    if (!question || typeof question !== "string") {
      return res.status(400).json({ message: "Question is required" });
    }

    try {
      const context = await getDataContext();

      const userMessage = `OPERATIONAL DATA:\n${JSON.stringify(context, null, 2)}\n\nADMIN QUESTION (${queryType}):\n${question}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      });

      const answer = completion.choices[0]?.message?.content || "No response generated.";

      await db.insert(aiCommandAuditLogs).values({
        adminId,
        queryType,
        query: question,
        aiEnabled: true,
        responseStatus: "SUCCESS",
      });

      return res.json({
        status: "SUCCESS",
        answer,
        dataSnapshot: {
          trips_7d: context.trips.total_7d,
          cancellation_rate: context.trips.cancellation_rate_7d,
          active_drivers: context.users.active_drivers,
          open_disputes: context.disputes.open_count,
        },
      });
    } catch (error: any) {
      console.error("AI query error:", error);

      await db.insert(aiCommandAuditLogs).values({
        adminId,
        queryType,
        query: question,
        aiEnabled: true,
        responseStatus: "AI_TEMPORARILY_UNAVAILABLE",
      });

      return res.json({
        status: "AI_TEMPORARILY_UNAVAILABLE",
        message: "ZIBA AI is temporarily unavailable. Please try again later.",
      });
    }
  });

  app.post("/api/admin/ai/toggle", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    const adminId = req.user?.claims?.sub || "unknown";
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "enabled (boolean) is required" });
    }

    aiCommandOverride = enabled;

    await db.insert(aiCommandAuditLogs).values({
      adminId,
      queryType: "TOGGLE",
      query: `AI Command Layer ${enabled ? "enabled" : "disabled"} by admin`,
      aiEnabled: enabled,
      responseStatus: "TOGGLE_SUCCESS",
    });

    return res.json({ enabled: aiCommandOverride, message: `AI Command Layer ${enabled ? "enabled" : "disabled"}` });
  });

  app.get("/api/admin/ai/audit-log", isAuthenticated, requireRole(["admin", "super_admin"]), async (_req: any, res) => {
    try {
      const logs = await db.select().from(aiCommandAuditLogs)
        .orderBy(desc(aiCommandAuditLogs.createdAt))
        .limit(100);
      return res.json(logs);
    } catch (error) {
      console.error("Error fetching AI audit logs:", error);
      return res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });
}
