export type SignalType =
  | "repeated_cancellations"
  | "wallet_low_balance"
  | "frequent_lost_items"
  | "driver_idle_long"
  | "director_performance_decline"
  | "admin_approval_backlog"
  | "inbox_unread_long"
  | "scheduled_ride_reminder"
  | "safety_reminder"
  | "inactivity_encouragement"
  | "cell_performance_alert"
  | "driver_churn_warning"
  | "commission_optimization"
  | "risk_summary"
  | "backlog_warning"
  | "fraud_trend_alert";

export type SignalSeverity = "info" | "warning" | "critical";
export type SignalRole = "rider" | "driver" | "director" | "admin" | "super_admin";

export interface ProactiveSignal {
  id: string;
  type: SignalType;
  severity: SignalSeverity;
  targetRole: SignalRole;
  targetUserId?: number;
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
  dismissed: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface SignalRule {
  type: SignalType;
  roles: SignalRole[];
  severity: SignalSeverity;
  enabled: boolean;
  cooldownMinutes: number;
  threshold?: number;
}

export const SIGNAL_RULES: SignalRule[] = [
  {
    type: "repeated_cancellations",
    roles: ["rider"],
    severity: "warning",
    enabled: true,
    cooldownMinutes: 1440,
    threshold: 3,
  },
  {
    type: "wallet_low_balance",
    roles: ["rider", "driver"],
    severity: "info",
    enabled: true,
    cooldownMinutes: 720,
    threshold: 500,
  },
  {
    type: "frequent_lost_items",
    roles: ["rider"],
    severity: "info",
    enabled: true,
    cooldownMinutes: 4320,
    threshold: 2,
  },
  {
    type: "driver_idle_long",
    roles: ["driver"],
    severity: "info",
    enabled: true,
    cooldownMinutes: 1440,
    threshold: 72,
  },
  {
    type: "director_performance_decline",
    roles: ["director"],
    severity: "warning",
    enabled: true,
    cooldownMinutes: 4320,
  },
  {
    type: "admin_approval_backlog",
    roles: ["admin", "super_admin"],
    severity: "warning",
    enabled: true,
    cooldownMinutes: 240,
    threshold: 10,
  },
  {
    type: "inbox_unread_long",
    roles: ["rider", "driver", "director"],
    severity: "info",
    enabled: true,
    cooldownMinutes: 2880,
    threshold: 48,
  },
  {
    type: "scheduled_ride_reminder",
    roles: ["rider"],
    severity: "info",
    enabled: true,
    cooldownMinutes: 60,
  },
  {
    type: "safety_reminder",
    roles: ["driver"],
    severity: "info",
    enabled: true,
    cooldownMinutes: 10080,
  },
  {
    type: "inactivity_encouragement",
    roles: ["driver"],
    severity: "info",
    enabled: true,
    cooldownMinutes: 4320,
  },
  {
    type: "cell_performance_alert",
    roles: ["director"],
    severity: "warning",
    enabled: true,
    cooldownMinutes: 1440,
  },
  {
    type: "driver_churn_warning",
    roles: ["director"],
    severity: "critical",
    enabled: true,
    cooldownMinutes: 4320,
  },
  {
    type: "commission_optimization",
    roles: ["director"],
    severity: "info",
    enabled: true,
    cooldownMinutes: 10080,
  },
  {
    type: "risk_summary",
    roles: ["admin", "super_admin"],
    severity: "warning",
    enabled: true,
    cooldownMinutes: 1440,
  },
  {
    type: "backlog_warning",
    roles: ["admin", "super_admin"],
    severity: "warning",
    enabled: true,
    cooldownMinutes: 480,
  },
  {
    type: "fraud_trend_alert",
    roles: ["admin", "super_admin"],
    severity: "critical",
    enabled: true,
    cooldownMinutes: 720,
  },
];

export function getSignalMessage(type: SignalType, data?: Record<string, any>): { title: string; message: string; actionLabel?: string } {
  switch (type) {
    case "repeated_cancellations":
      return {
        title: "Frequent cancellations noticed",
        message: "You've had a few cancellations recently. Top up your wallet to avoid delays, and double-check your pickup location before requesting.",
        actionLabel: "View wallet",
      };
    case "wallet_low_balance":
      return {
        title: "Wallet balance is getting low",
        message: "Top up to avoid delays on your next ride. A healthy balance ensures smooth trips.",
        actionLabel: "Top up now",
      };
    case "frequent_lost_items":
      return {
        title: "Lost item reports",
        message: "We noticed a few lost item reports. Remember to check your belongings before ending a trip.",
      };
    case "driver_idle_long":
      return {
        title: "Time to get back on the road",
        message: `You've been offline for a while. There may be ride requests in your area. Go online when you're ready.`,
        actionLabel: "Go online",
      };
    case "director_performance_decline":
      return {
        title: "Cell performance update",
        message: "Your cell's performance metrics have dipped recently. Review driver activity and consider outreach to inactive drivers.",
        actionLabel: "View cell",
      };
    case "admin_approval_backlog":
      return {
        title: "Pending approvals backlog",
        message: `There are ${data?.count || "several"} pending approvals waiting for review. Timely approvals improve driver onboarding experience.`,
        actionLabel: "Review approvals",
      };
    case "inbox_unread_long":
      return {
        title: "Unread messages",
        message: "You have messages that haven't been read in a while. Check your inbox to stay up to date.",
        actionLabel: "Open inbox",
      };
    case "scheduled_ride_reminder":
      return {
        title: "Upcoming scheduled ride",
        message: `You have a scheduled ride ${data?.timeUntil || "soon"}. Make sure you're ready at the pickup point.`,
      };
    case "safety_reminder":
      return {
        title: "Safety check-in",
        message: "A quick reminder to keep your vehicle inspection up to date and review your emergency contacts.",
        actionLabel: "Safety hub",
      };
    case "inactivity_encouragement":
      return {
        title: "We miss you on the road",
        message: "It's been a while since your last trip. Ride demand is active in your area. Go online when you're ready.",
        actionLabel: "Go online",
      };
    case "cell_performance_alert":
      return {
        title: "Cell activity alert",
        message: "Some drivers in your cell may need attention. Review their recent activity to maintain performance.",
        actionLabel: "My drivers",
      };
    case "driver_churn_warning":
      return {
        title: "Driver retention alert",
        message: "One or more drivers in your cell have been inactive. Consider reaching out to prevent churn.",
        actionLabel: "View inactive",
      };
    case "commission_optimization":
      return {
        title: "Commission insight",
        message: "Review your cell's trip volume and driver activity to optimize your commission eligibility.",
        actionLabel: "View performance",
      };
    case "risk_summary":
      return {
        title: "Daily risk summary",
        message: `There are ${data?.riskCount || "some"} flagged items requiring attention. Review fraud and safety signals.`,
        actionLabel: "View risks",
      };
    case "backlog_warning":
      return {
        title: "Operational backlog",
        message: "Several items across approvals, disputes, and refunds are pending. Prioritize to maintain service quality.",
        actionLabel: "View dashboard",
      };
    case "fraud_trend_alert":
      return {
        title: "Fraud trend detected",
        message: "An unusual pattern has been flagged by the fraud detection system. Review immediately.",
        actionLabel: "View fraud",
      };
  }
}

export function isSignalEnabled(type: SignalType): boolean {
  const rule = SIGNAL_RULES.find(r => r.type === type);
  return rule?.enabled ?? false;
}

export function getSignalCooldown(type: SignalType): number {
  const rule = SIGNAL_RULES.find(r => r.type === type);
  return rule?.cooldownMinutes ?? 1440;
}

export function isSignalExpired(signal: ProactiveSignal): boolean {
  if (signal.expiresAt && new Date() > signal.expiresAt) return true;
  return false;
}

export function filterSignalsForRole(signals: ProactiveSignal[], role: SignalRole): ProactiveSignal[] {
  return signals.filter(s => s.targetRole === role && !s.dismissed && !isSignalExpired(s));
}
