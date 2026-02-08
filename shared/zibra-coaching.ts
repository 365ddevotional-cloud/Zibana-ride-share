export type CoachingCategory =
  | "cell_performance"
  | "driver_activity"
  | "commission_eligibility"
  | "corrective_action"
  | "contract_lifespan"
  | "benchmark_comparison"
  | "retention_strategy"
  | "onboarding_guidance";

export interface CoachingInsight {
  id: string;
  category: CoachingCategory;
  title: string;
  summary: string;
  details: string;
  priority: "low" | "medium" | "high";
  actionable: boolean;
  suggestedAction?: string;
  createdAt: Date;
}

export interface DirectorPerformanceSummary {
  totalDrivers: number;
  activeDrivers: number;
  inactiveDrivers: number;
  tripsThisPeriod: number;
  commissionEligible: boolean;
  performanceTrend: "improving" | "stable" | "declining";
  topConcerns: string[];
}

const COACHING_TEMPLATES: Record<CoachingCategory, { title: string; template: string }> = {
  cell_performance: {
    title: "Cell Performance Overview",
    template: "Your cell has {activeDrivers} active drivers out of {totalDrivers} total. Trip volume is {trend} compared to the last period.",
  },
  driver_activity: {
    title: "Driver Activity Status",
    template: "Some drivers in your cell may need attention. {inactiveCount} drivers have not completed a trip recently.",
  },
  commission_eligibility: {
    title: "Commission Eligibility",
    template: "Your commission eligibility depends on cell activity and compliance. Review the requirements to stay on track.",
  },
  corrective_action: {
    title: "Suggested Corrective Action",
    template: "Based on recent cell performance, consider reaching out to inactive drivers and reviewing trip completion patterns.",
  },
  contract_lifespan: {
    title: "Contract Status",
    template: "Your director contract is active. Keep your cell metrics healthy to maintain good standing.",
  },
  benchmark_comparison: {
    title: "Performance Benchmark",
    template: "Your cell's performance is {comparison} compared to the platform average. Focus on {focusArea} to improve.",
  },
  retention_strategy: {
    title: "Driver Retention",
    template: "Driver retention is key to your cell's success. Engage with drivers who haven't been active in the last {days} days.",
  },
  onboarding_guidance: {
    title: "Onboarding Support",
    template: "New drivers benefit from early engagement. Check in with recently onboarded drivers to help them succeed.",
  },
};

export function generateCoachingInsight(
  category: CoachingCategory,
  data: Record<string, any>
): CoachingInsight {
  const template = COACHING_TEMPLATES[category];

  let summary = template.template;
  for (const [key, value] of Object.entries(data)) {
    summary = summary.replace(`{${key}}`, String(value));
  }

  return {
    id: `coaching-${category}-${Date.now()}`,
    category,
    title: template.title,
    summary,
    details: summary,
    priority: data.priority || "medium",
    actionable: category !== "benchmark_comparison" && category !== "contract_lifespan",
    suggestedAction: data.suggestedAction,
    createdAt: new Date(),
  };
}

export function generateDirectorSummary(data: {
  totalDrivers: number;
  activeDrivers: number;
  tripsThisPeriod: number;
  previousTrips: number;
  commissionEligible: boolean;
}): DirectorPerformanceSummary {
  const inactiveDrivers = data.totalDrivers - data.activeDrivers;
  const trend: "improving" | "stable" | "declining" =
    data.tripsThisPeriod > data.previousTrips * 1.1
      ? "improving"
      : data.tripsThisPeriod < data.previousTrips * 0.9
        ? "declining"
        : "stable";

  const topConcerns: string[] = [];
  if (inactiveDrivers > data.totalDrivers * 0.3) {
    topConcerns.push("High driver inactivity rate");
  }
  if (trend === "declining") {
    topConcerns.push("Trip volume declining");
  }
  if (!data.commissionEligible) {
    topConcerns.push("Commission eligibility at risk");
  }

  return {
    totalDrivers: data.totalDrivers,
    activeDrivers: data.activeDrivers,
    inactiveDrivers,
    tripsThisPeriod: data.tripsThisPeriod,
    commissionEligible: data.commissionEligible,
    performanceTrend: trend,
    topConcerns,
  };
}

export const COACHING_GUARDRAILS = {
  noOtherDirectorData: true,
  noCommissionFormulas: true,
  noDriverPersonalData: true,
  noExactEarnings: true,
  anonymizeBenchmarks: true,
};

export function sanitizeCoachingResponse(response: string): string {
  const patterns = [
    /\$[\d,]+\.?\d*/g,
    /\b\d{10,}\b/g,
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ];

  let sanitized = response;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}
