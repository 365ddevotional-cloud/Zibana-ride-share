import { storage } from "./storage";

export interface FraudSignalWeights {
  excessiveRefunds: number;
  frequentChargebacks: number;
  highCancellationRate: number;
  highDisputeInvolvement: number;
  payoutReversalHistory: number;
}

const SIGNAL_WEIGHTS: FraudSignalWeights = {
  excessiveRefunds: 15,
  frequentChargebacks: 25,
  highCancellationRate: 10,
  highDisputeInvolvement: 20,
  payoutReversalHistory: 30,
};

const THRESHOLDS = {
  refundsPerTrip: 0.2,
  chargebacksPerTrip: 0.1,
  cancellationRate: 0.3,
  disputeRate: 0.15,
  reversedPayoutRate: 0.1,
};

export function calculateRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score <= 20) return "low";
  if (score <= 50) return "medium";
  if (score <= 80) return "high";
  return "critical";
}

export async function evaluateUserRisk(userId: string, role: "rider" | "driver"): Promise<{
  score: number;
  level: "low" | "medium" | "high" | "critical";
  signals: string[];
}> {
  const signals = await storage.getUserFraudSignals(userId, role);
  let score = 0;
  const detectedSignals: string[] = [];

  const tripCount = signals.tripCount || 1;

  if (tripCount > 0 && signals.refundCount / tripCount > THRESHOLDS.refundsPerTrip) {
    score += SIGNAL_WEIGHTS.excessiveRefunds;
    detectedSignals.push(`Excessive refunds: ${signals.refundCount} refunds in ${tripCount} trips`);
  }

  if (tripCount > 0 && signals.chargebackCount / tripCount > THRESHOLDS.chargebacksPerTrip) {
    score += SIGNAL_WEIGHTS.frequentChargebacks;
    detectedSignals.push(`Frequent chargebacks: ${signals.chargebackCount} chargebacks in ${tripCount} trips`);
  }

  if (tripCount > 0 && signals.cancelledCount / tripCount > THRESHOLDS.cancellationRate) {
    score += SIGNAL_WEIGHTS.highCancellationRate;
    detectedSignals.push(`High cancellation rate: ${signals.cancelledCount} cancellations in ${tripCount} trips`);
  }

  if (tripCount > 0 && signals.disputeCount / tripCount > THRESHOLDS.disputeRate) {
    score += SIGNAL_WEIGHTS.highDisputeInvolvement;
    detectedSignals.push(`High dispute involvement: ${signals.disputeCount} disputes in ${tripCount} trips`);
  }

  if (role === "driver" && tripCount > 0 && signals.reversedPayoutCount / tripCount > THRESHOLDS.reversedPayoutRate) {
    score += SIGNAL_WEIGHTS.payoutReversalHistory;
    detectedSignals.push(`Payout reversal history: ${signals.reversedPayoutCount} reversed payouts`);
  }

  score = Math.min(score, 100);
  const level = calculateRiskLevel(score);

  await storage.getOrCreateRiskProfile(userId, role);
  await storage.updateRiskProfile(userId, score, level);

  return { score, level, signals: detectedSignals };
}

export async function evaluateAndRecordFraudEvents(
  userId: string,
  role: "rider" | "driver",
  triggerEvent: string
): Promise<void> {
  const result = await evaluateUserRisk(userId, role);

  if (result.signals.length > 0 && result.level !== "low") {
    for (const signal of result.signals) {
      const signalType = signal.split(":")[0].trim();
      const severity = result.level === "critical" ? "high" : result.level === "high" ? "medium" : "low";

      await storage.createFraudEvent({
        entityType: "user",
        entityId: userId,
        signalType: signalType,
        severity: severity as "low" | "medium" | "high",
        description: `${signal}. Triggered by: ${triggerEvent}`,
      });
    }
  }

  if (result.level === "critical") {
    await storage.notifyAdminsAndDirectors(
      "Critical Risk Alert",
      `User with ${role} role has reached CRITICAL risk level (score: ${result.score}). Manual review required.`,
      "warning"
    );
  }
}

export async function evaluateTripRisk(tripId: string): Promise<{
  score: number;
  signals: string[];
}> {
  const trip = await storage.getTripById(tripId);
  if (!trip) return { score: 0, signals: [] };

  let score = 0;
  const signals: string[] = [];

  if (trip.status === "completed" && trip.fareAmount) {
    const fareAmount = parseFloat(trip.fareAmount);
    if (fareAmount < 5 || fareAmount > 100) {
      score += 10;
      signals.push(`Unusual fare amount: $${fareAmount}`);
    }
  }

  return { score: Math.min(score, 100), signals };
}

export async function runFullEvaluation(): Promise<{
  evaluated: number;
  highRisk: number;
  critical: number;
}> {
  let evaluated = 0;
  let highRisk = 0;
  let critical = 0;

  const drivers = await storage.getAllDrivers();
  for (const driver of drivers) {
    const result = await evaluateUserRisk(driver.userId, "driver");
    evaluated++;
    if (result.level === "high") highRisk++;
    if (result.level === "critical") critical++;
  }

  const riders = await storage.getAllRidersWithDetails();
  for (const rider of riders) {
    const result = await evaluateUserRisk(rider.userId, "rider");
    evaluated++;
    if (result.level === "high") highRisk++;
    if (result.level === "critical") critical++;
  }

  return { evaluated, highRisk, critical };
}
