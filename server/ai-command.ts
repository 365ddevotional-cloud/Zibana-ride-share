import OpenAI from "openai";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { 
  trips, users, wallets, disputes, driverProfiles, riderProfiles,
  aiCommandAuditLogs, aiUsageLogs, platformSettings, tripRatings
} from "@shared/schema";
import { sql, eq, gte, and, count, avg, desc, sum } from "drizzle-orm";

let openaiClient: OpenAI | null = null;
try {
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
} catch (e) {
  console.warn("[AI COMMAND] OpenAI client initialization failed — AI queries will be unavailable");
}

let aiCommandOverride: boolean | null = null;
let budgetDisabled = false;

function isAiEnabled(): boolean {
  if (budgetDisabled) return false;
  if (aiCommandOverride !== null) return aiCommandOverride;
  return process.env.AI_COMMAND_ENABLED === "true";
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function getMonthlySpend(): Promise<number> {
  const monthKey = getCurrentMonthKey();
  const result = await db.select({
    total: sql<string>`COALESCE(SUM(${aiUsageLogs.estimatedCost}), 0)`
  }).from(aiUsageLogs).where(eq(aiUsageLogs.monthKey, monthKey));
  return parseFloat(result[0]?.total ?? "0");
}

function getMonthlyBudget(): number {
  return parseFloat(process.env.AI_MONTHLY_BUDGET_USD || "12");
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 0.00000015) + (outputTokens * 0.0000006);
}

const SYSTEM_PROMPT = `You are ZIBA AI Command Intelligence.
You analyze structured operational data for a ride-hailing platform operating in emerging markets.
CRITICAL RULES:
- Do NOT invent, fabricate, or estimate numbers. Only use data explicitly provided to you.
- If data is missing or unavailable, explicitly state: "This data is not available in the current snapshot."
- You provide advisory recommendations but do NOT execute any actions.
- Format responses with clear sections, bullet points, and actionable insights.
- Respond concisely and professionally. Keep answers focused and data-driven.
- Never include personal identifiable information (phone numbers, addresses, emails) in your responses.`;

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
      const monthlySpend = await getMonthlySpend();
      const budget = getMonthlyBudget();
      return res.json({
        enabled: isAiEnabled(),
        budgetLimitReached: budgetDisabled,
        monthlySpend: monthlySpend.toFixed(4),
        monthlyBudget: budget.toFixed(2),
        monthKey: getCurrentMonthKey(),
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get AI status" });
    }
  });

  app.get("/api/admin/ai/data-context", isAuthenticated, requireRole(["admin", "super_admin"]), async (_req: any, res) => {
    try {
      const context = await getDataContext();
      return res.json(context);
    } catch (error) {
      console.error("[AI COMMAND] Error getting data context:", error);
      return res.status(500).json({ message: "Failed to aggregate data context" });
    }
  });

  app.post("/api/admin/ai/query", isAuthenticated, requireRole(["admin", "super_admin"]), async (req: any, res) => {
    const adminId = req.user?.claims?.sub || "unknown";
    const { question, queryType = "ask" } = req.body;

    if (!isAiEnabled()) {
      const status = budgetDisabled ? "AI_BUDGET_LIMIT_REACHED" : "AI_DISABLED";
      const message = budgetDisabled
        ? "ZIBA AI monthly budget limit reached. AI is temporarily disabled."
        : "ZIBA AI Command Layer is currently offline.";

      console.log(`[AI COMMAND] AI disabled: skipping OpenAI call (reason: ${status})`);

      await db.insert(aiCommandAuditLogs).values({
        adminId,
        queryType,
        query: question,
        aiEnabled: false,
        responseStatus: status,
      });
      return res.json({ status, message });
    }

    if (!question || typeof question !== "string") {
      return res.status(400).json({ message: "Question is required" });
    }

    const monthlySpend = await getMonthlySpend();
    const budget = getMonthlyBudget();
    if (monthlySpend >= budget) {
      budgetDisabled = true;
      console.log(`[AI COMMAND] Monthly budget exceeded ($${monthlySpend.toFixed(4)} >= $${budget}). Auto-disabling AI.`);

      await db.insert(aiCommandAuditLogs).values({
        adminId,
        queryType,
        query: question,
        aiEnabled: false,
        responseStatus: "AI_BUDGET_LIMIT_REACHED",
      });
      return res.json({
        status: "AI_BUDGET_LIMIT_REACHED",
        message: "ZIBA AI monthly budget limit reached. AI is temporarily disabled.",
      });
    }

    if (!openaiClient) {
      console.log("[AI COMMAND] OpenAI client not available — skipping call");
      await db.insert(aiCommandAuditLogs).values({
        adminId,
        queryType,
        query: question,
        aiEnabled: true,
        responseStatus: "AI_TEMPORARILY_UNAVAILABLE",
      });
      return res.json({
        status: "AI_TEMPORARILY_UNAVAILABLE",
        message: "ZIBA AI is temporarily unavailable. The AI service is not configured.",
      });
    }

    try {
      const context = await getDataContext();
      const userMessage = `OPERATIONAL DATA:\n${JSON.stringify(context, null, 2)}\n\nADMIN QUESTION (${queryType}):\n${question}`;

      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      });

      const answer = completion.choices[0]?.message?.content || "No response generated.";

      const inputTokens = completion.usage?.prompt_tokens ?? estimateTokens(SYSTEM_PROMPT + userMessage);
      const outputTokens = completion.usage?.completion_tokens ?? estimateTokens(answer);
      const cost = estimateCost(inputTokens, outputTokens);

      await db.insert(aiUsageLogs).values({
        adminId,
        monthKey: getCurrentMonthKey(),
        inputTokens,
        outputTokens,
        estimatedCost: cost.toFixed(6),
      });

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
      console.error("[AI COMMAND] OpenAI query error:", error?.message || error);

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
    if (enabled) {
      const currentMonth = getCurrentMonthKey();
      const spend = await getMonthlySpend();
      const budget = getMonthlyBudget();
      if (spend < budget) {
        budgetDisabled = false;
      }
    }

    console.log(`[AI COMMAND] Toggle: AI ${enabled ? "ENABLED" : "DISABLED"} by admin ${adminId}`);

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
      console.error("[AI COMMAND] Error fetching audit logs:", error);
      return res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/admin/ai/usage", isAuthenticated, requireRole(["admin", "super_admin"]), async (_req: any, res) => {
    try {
      const monthKey = getCurrentMonthKey();
      const usage = await db.select().from(aiUsageLogs)
        .where(eq(aiUsageLogs.monthKey, monthKey))
        .orderBy(desc(aiUsageLogs.createdAt))
        .limit(50);
      const totalSpend = await getMonthlySpend();
      return res.json({
        monthKey,
        totalSpend: totalSpend.toFixed(4),
        budget: getMonthlyBudget().toFixed(2),
        entries: usage,
      });
    } catch (error) {
      console.error("[AI COMMAND] Error fetching usage data:", error);
      return res.status(500).json({ message: "Failed to fetch usage data" });
    }
  });
}
