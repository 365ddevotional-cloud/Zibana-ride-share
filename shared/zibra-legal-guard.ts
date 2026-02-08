export type RiskKeyword =
  | "lawsuit"
  | "lawyer"
  | "legal_action"
  | "sue"
  | "court"
  | "attorney"
  | "liability"
  | "negligence"
  | "compensation"
  | "damages"
  | "police_report"
  | "assault"
  | "harassment"
  | "threat"
  | "blackmail";

export type EscalationLevel = "none" | "monitor" | "escalate" | "block";

export interface LegalGuardResult {
  level: EscalationLevel;
  matchedKeywords: string[];
  response: string;
  shouldLog: boolean;
  shouldNotifyAdmin: boolean;
}

const RISK_PATTERNS: { pattern: RegExp; keyword: RiskKeyword; level: EscalationLevel }[] = [
  { pattern: /\bsue\b|\bsuing\b|\blawsuit\b/i, keyword: "lawsuit", level: "escalate" },
  { pattern: /\blawyer\b|\battorney\b|\blegal\s+counsel\b/i, keyword: "lawyer", level: "escalate" },
  { pattern: /\blegal\s+action\b/i, keyword: "legal_action", level: "escalate" },
  { pattern: /\bcourt\b|\btribunal\b/i, keyword: "court", level: "escalate" },
  { pattern: /\bliabilit(y|ies)\b/i, keyword: "liability", level: "monitor" },
  { pattern: /\bnegligenc(e|t)\b/i, keyword: "negligence", level: "escalate" },
  { pattern: /\bcompensation\b|\bdamages\b/i, keyword: "compensation", level: "monitor" },
  { pattern: /\bpolice\s+report\b/i, keyword: "police_report", level: "escalate" },
  { pattern: /\bassault(ed|ing)?\b/i, keyword: "assault", level: "escalate" },
  { pattern: /\bharass(ment|ed|ing)?\b/i, keyword: "harassment", level: "escalate" },
  { pattern: /\bthreat(en|ened|ening|s)?\b/i, keyword: "threat", level: "escalate" },
  { pattern: /\bblackmail\b|\bextortion\b/i, keyword: "blackmail", level: "escalate" },
];

const LEGAL_REDIRECT_RESPONSE = "I understand this is a serious matter. For legal and safety concerns, I'm not able to provide legal advice. Please review our Terms of Service and Privacy Policy for relevant information. If you need further assistance, I'll connect you with our support team who can guide you through the proper process.";

const SAFETY_REDIRECT_RESPONSE = "Your safety is our priority. If you're in immediate danger, please contact local emergency services. I'm flagging this for our safety team to review. You can also use the SOS feature in the app for urgent help.";

const MONITOR_RESPONSE = "I understand your concern. Let me help you with the proper process for addressing this. Our support team is available to assist with formal inquiries.";

export function scanForLegalRisks(message: string): LegalGuardResult {
  const matchedKeywords: string[] = [];
  let highestLevel: EscalationLevel = "none";

  for (const { pattern, keyword, level } of RISK_PATTERNS) {
    if (pattern.test(message)) {
      matchedKeywords.push(keyword);
      if (level === "escalate" && highestLevel !== "block") {
        highestLevel = "escalate";
      } else if (level === "monitor" && highestLevel === "none") {
        highestLevel = "monitor";
      }
    }
  }

  const isSafetyRelated = matchedKeywords.some(k =>
    ["assault", "harassment", "threat", "blackmail", "police_report"].includes(k)
  );

  let response: string;
  if (highestLevel === "none") {
    response = "";
  } else if (isSafetyRelated) {
    response = SAFETY_REDIRECT_RESPONSE;
  } else if (highestLevel === "escalate") {
    response = LEGAL_REDIRECT_RESPONSE;
  } else {
    response = MONITOR_RESPONSE;
  }

  return {
    level: highestLevel,
    matchedKeywords,
    response,
    shouldLog: highestLevel !== "none",
    shouldNotifyAdmin: highestLevel === "escalate",
  };
}

export function isLegalContent(message: string): boolean {
  const legalPhrases = [
    /terms\s+(of\s+)?service/i,
    /privacy\s+policy/i,
    /data\s+protection/i,
    /user\s+agreement/i,
    /legal\s+disclaimer/i,
    /indemnif(y|ication)/i,
    /arbitration/i,
  ];
  return legalPhrases.some(p => p.test(message));
}

export function getAutoResolutionTarget(role: string): number {
  switch (role) {
    case "rider": return 0.70;
    case "driver": return 0.60;
    case "director": return 0.50;
    default: return 0.50;
  }
}

export function shouldEscalateToHuman(context: {
  isSafetyRisk: boolean;
  isLegalThreat: boolean;
  failedAttempts: number;
  userRequestedHuman: boolean;
}): boolean {
  if (context.isSafetyRisk) return true;
  if (context.isLegalThreat) return true;
  if (context.failedAttempts >= 3) return true;
  if (context.userRequestedHuman) return true;
  return false;
}

export const ZIBRA_RESPONSE_RULES = {
  neverAdmitLegalLiability: true,
  neverRephraseLegalDisclaimers: true,
  alwaysLogSensitiveConversations: true,
  silentEscalateRiskKeywords: true,
  redirectLawsuitsToPolicy: true,
};
