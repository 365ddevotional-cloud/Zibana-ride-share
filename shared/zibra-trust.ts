export type TrustChangeReason =
  | "cancellation_rate"
  | "rating_decline"
  | "dispute_outcome"
  | "fraud_flag"
  | "safety_incident"
  | "positive_history"
  | "completed_trips"
  | "account_verification"
  | "manual_adjustment";

export interface TrustScoreExplanation {
  reason: TrustChangeReason;
  direction: "up" | "down" | "neutral";
  summary: string;
  recoveryTip?: string;
}

const TRUST_EXPLANATIONS: Record<TrustChangeReason, { upMsg: string; downMsg: string; recoveryTip?: string }> = {
  cancellation_rate: {
    upMsg: "Your cancellation rate has improved. Keep it up!",
    downMsg: "Your cancellation rate has increased recently, which can affect your trust score.",
    recoveryTip: "Try to avoid cancelling after accepting a ride. Only accept rides you can complete.",
  },
  rating_decline: {
    upMsg: "Your ratings have been improving. Great work!",
    downMsg: "Recent ratings have been lower than usual, which affects your trust score.",
    recoveryTip: "Focus on providing a great experience: be on time, drive safely, and keep your vehicle clean.",
  },
  dispute_outcome: {
    upMsg: "A dispute was resolved in your favor, which positively impacts your score.",
    downMsg: "A dispute outcome affected your trust score.",
    recoveryTip: "If you believe a dispute was resolved unfairly, you can escalate through support.",
  },
  fraud_flag: {
    upMsg: "A previous fraud flag has been cleared.",
    downMsg: "A fraud-related flag was raised on your account.",
    recoveryTip: "Contact support if you believe this was raised in error. Fraud flags are reviewed carefully.",
  },
  safety_incident: {
    upMsg: "Your safety record is excellent.",
    downMsg: "A safety incident report affected your trust score.",
    recoveryTip: "Review safety guidelines and ensure your vehicle meets all requirements.",
  },
  positive_history: {
    upMsg: "Your consistent positive history is reflected in your trust score.",
    downMsg: "Your overall history has room for improvement.",
    recoveryTip: "Maintain consistent, reliable service to build your trust score over time.",
  },
  completed_trips: {
    upMsg: "Completing trips consistently builds your trust score.",
    downMsg: "Your completed trip count has decreased.",
    recoveryTip: "Stay active and complete rides regularly to maintain your score.",
  },
  account_verification: {
    upMsg: "Completing verification steps improves your trust score.",
    downMsg: "Incomplete verification affects your trust score.",
    recoveryTip: "Complete all verification steps in your profile to improve your score.",
  },
  manual_adjustment: {
    upMsg: "Your trust score was adjusted following a review.",
    downMsg: "Your trust score was adjusted following a review.",
    recoveryTip: "Contact support if you have questions about this adjustment.",
  },
};

export function explainTrustChange(reason: TrustChangeReason, direction: "up" | "down"): TrustScoreExplanation {
  const config = TRUST_EXPLANATIONS[reason];
  return {
    reason,
    direction,
    summary: direction === "up" ? config.upMsg : config.downMsg,
    recoveryTip: direction === "down" ? config.recoveryTip : undefined,
  };
}

export function suggestRecoveryActions(reasons: TrustChangeReason[]): string[] {
  const actions: string[] = [];
  const seen = new Set<string>();

  for (const reason of reasons) {
    const config = TRUST_EXPLANATIONS[reason];
    if (config.recoveryTip && !seen.has(config.recoveryTip)) {
      seen.add(config.recoveryTip);
      actions.push(config.recoveryTip);
    }
  }

  return actions;
}

export function getTrustTierLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Improvement";
  return "At Risk";
}

export function getTrustWarning(score: number, previousScore: number): string | null {
  if (score < 40 && previousScore >= 40) {
    return "Your trust score has dropped to the At Risk tier. Review the suggestions below to improve your standing.";
  }
  if (score < 60 && previousScore >= 60) {
    return "Your trust score has dropped. Following the recovery tips can help bring it back up.";
  }
  return null;
}

export const TRUST_GUARDRAILS = {
  neverAccuse: true,
  neverThreaten: true,
  neverPromiseReversals: true,
  alwaysSuggestRecovery: true,
  alwaysOfferEscalation: true,
};
