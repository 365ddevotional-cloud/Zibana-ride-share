export interface ComplianceItem {
  id: string;
  category: "automation_disclosure" | "permissions" | "safety_language" | "accessibility";
  title: string;
  description: string;
  requirement: string;
  status: "pass" | "needs_review";
}

export const storeComplianceChecklist: ComplianceItem[] = [
  {
    id: "auto-1",
    category: "automation_disclosure",
    title: "ZIBA Support Described as Automated",
    description: "ZIBA Support (in-app assistance) is clearly described as automated assistance throughout the platform",
    requirement: "All references to ZIBA Support must use terms like 'automated assistance' or 'automated support system'",
    status: "pass"
  },
  {
    id: "auto-2",
    category: "automation_disclosure",
    title: "No AI Deception Claims",
    description: "The platform does not claim ZIBA Support is a human agent or misrepresent its nature",
    requirement: "No language suggesting human interaction when communicating with ZIBA Support",
    status: "pass"
  },
  {
    id: "auto-3",
    category: "automation_disclosure",
    title: "Escalation Path Disclosed",
    description: "Users are informed they can escalate to human support when automated assistance is insufficient",
    requirement: "Clear escalation options visible in support interface",
    status: "pass"
  },
  {
    id: "perm-1",
    category: "permissions",
    title: "Notification Usage Explained",
    description: "Push notification permissions are requested with clear explanation of purpose",
    requirement: "Pre-permission dialog explains why notifications are needed (ride updates, safety alerts)",
    status: "pass"
  },
  {
    id: "perm-2",
    category: "permissions",
    title: "Location Usage Explained",
    description: "Location permission requests include clear purpose explanation",
    requirement: "Location is explained as necessary for ride matching, navigation, and safety features",
    status: "pass"
  },
  {
    id: "perm-3",
    category: "permissions",
    title: "No Dark Patterns",
    description: "No deceptive UI patterns that trick users into granting permissions or making purchases",
    requirement: "All permission requests are straightforward with clear accept/decline options",
    status: "pass"
  },
  {
    id: "safe-1",
    category: "safety_language",
    title: "ZIBA as Facilitator",
    description: "ZIBA is described as a ride-hailing facilitator, not a transportation provider",
    requirement: "Platform language clearly states ZIBA connects riders with independent drivers",
    status: "pass"
  },
  {
    id: "safe-2",
    category: "safety_language",
    title: "No Service Guarantees",
    description: "No guarantees of ride availability, timing, or specific outcomes",
    requirement: "Terms and in-app language avoid absolute guarantees about service delivery",
    status: "pass"
  },
  {
    id: "safe-3",
    category: "safety_language",
    title: "Responsibility Boundaries",
    description: "Clear delineation of responsibility between ZIBA, drivers, and riders",
    requirement: "Legal documents and in-app notices establish responsibility boundaries",
    status: "pass"
  },
  {
    id: "a11y-1",
    category: "accessibility",
    title: "Readable Font Sizes",
    description: "All text meets minimum readable font size requirements",
    requirement: "Body text minimum 14px, labels minimum 12px, headings appropriately sized",
    status: "pass"
  },
  {
    id: "a11y-2",
    category: "accessibility",
    title: "Acceptable Contrast",
    description: "Text and interactive elements meet WCAG contrast ratio requirements",
    requirement: "Minimum 4.5:1 contrast ratio for normal text, 3:1 for large text",
    status: "pass"
  },
  {
    id: "a11y-3",
    category: "accessibility",
    title: "No Blocked Navigation",
    description: "Users can navigate freely without being trapped in modal flows or dead ends",
    requirement: "All modals have close buttons, all flows have back navigation, error states have recovery paths",
    status: "pass"
  },
];

export const complianceCategoryLabels: Record<string, string> = {
  automation_disclosure: "Automation Disclosure",
  permissions: "Permissions",
  safety_language: "Safety Language",
  accessibility: "Accessibility",
};
