export interface ZibraMetrics {
  totalConversations: number;
  resolvedWithoutEscalation: number;
  escalatedToHuman: number;
  autoResolutionRate: number;
  topResolvedTopics: TopicCount[];
  escalationsByRole: Record<string, number>;
  abuseAttemptsBlocked: number;
  languageUsageStats: LanguageUsage[];
  directorPerformanceDeltas: PerformanceDelta[];
  notificationEffectiveness: NotificationMetric[];
  averageResponseTime: number;
  peakHours: number[];
}

export interface TopicCount {
  topic: string;
  count: number;
  resolvedCount: number;
  escalatedCount: number;
}

export interface LanguageUsage {
  language: string;
  conversationCount: number;
  percentage: number;
}

export interface PerformanceDelta {
  directorId: number;
  previousScore: number;
  currentScore: number;
  delta: number;
  period: string;
}

export interface NotificationMetric {
  signalType: string;
  sentCount: number;
  dismissedCount: number;
  actedOnCount: number;
  effectivenessRate: number;
}

export interface ZibraInsightsSummary {
  period: string;
  totalInteractions: number;
  resolutionRate: number;
  topIssues: string[];
  riskFlags: number;
  healthScore: number;
}

export function calculateResolutionRate(resolved: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((resolved / total) * 100);
}

export function calculateHealthScore(metrics: ZibraMetrics): number {
  let score = 100;

  if (metrics.autoResolutionRate < 0.5) score -= 20;
  else if (metrics.autoResolutionRate < 0.7) score -= 10;

  if (metrics.abuseAttemptsBlocked > 10) score -= 10;

  if (metrics.averageResponseTime > 5000) score -= 10;
  else if (metrics.averageResponseTime > 3000) score -= 5;

  const escalationRate = metrics.totalConversations > 0
    ? metrics.escalatedToHuman / metrics.totalConversations
    : 0;
  if (escalationRate > 0.5) score -= 15;
  else if (escalationRate > 0.3) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export function generateInsightsSummary(metrics: ZibraMetrics, period: string): ZibraInsightsSummary {
  const topIssues = metrics.topResolvedTopics
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(t => t.topic);

  return {
    period,
    totalInteractions: metrics.totalConversations,
    resolutionRate: metrics.autoResolutionRate * 100,
    topIssues,
    riskFlags: metrics.abuseAttemptsBlocked,
    healthScore: calculateHealthScore(metrics),
  };
}

export function formatMetricForDisplay(value: number, type: "percentage" | "count" | "time"): string {
  switch (type) {
    case "percentage":
      return `${Math.round(value)}%`;
    case "count":
      return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
    case "time":
      return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
  }
}
