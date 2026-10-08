export function determineRiderTrustTier(score: number, weights: { platinumThreshold: number; goldThreshold: number; standardThreshold: number }): "platinum" | "gold" | "standard" | "limited" {
  if (score >= weights.platinumThreshold) return "platinum";
  if (score >= weights.goldThreshold) return "gold";
  if (score >= weights.standardThreshold) return "standard";
  return "limited";
}

export function determineDirectorPerformanceTier(score: number, weights: { goldThreshold: number; silverThreshold: number; bronzeThreshold: number }): "gold" | "silver" | "bronze" | "at_risk" {
  if (score >= weights.goldThreshold) return "gold";
  if (score >= weights.silverThreshold) return "silver";
  if (score >= weights.bronzeThreshold) return "bronze";
  return "at_risk";
}
