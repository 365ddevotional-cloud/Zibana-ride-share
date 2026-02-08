export interface TrainingModule {
  id: string;
  title: string;
  role: "contract_director" | "employed_director" | "driver";
  category: string;
  bullets: string[];
}

export const trainingModules: TrainingModule[] = [
  {
    id: "cd-activity-eligibility",
    title: "How Driver Activity Affects Eligibility",
    role: "contract_director",
    category: "Eligibility",
    bullets: [
      "Daily active ratios are used to determine whether drivers in your cell meet platform-defined eligibility thresholds.",
      "Eligibility is not guaranteed and depends on consistent daily performance across all assigned drivers.",
      "The platform calculates activity using a ratio of active hours versus available hours each day.",
      "Drivers who fall below the platform-defined threshold on a given day may not count toward eligibility.",
      "Consistency across multiple days is more important than occasional spikes in activity.",
    ],
  },
  {
    id: "cd-daily-variability",
    title: "Understanding Daily Variability",
    role: "contract_director",
    category: "Operations",
    bullets: [
      "Each day is calculated independently based on driver activity and platform conditions.",
      "Some days may qualify while others do not, even with the same drivers active.",
      "Factors such as demand fluctuations, driver availability, and trip completion rates all affect daily outcomes.",
      "You cannot retroactively change a day's result once it has been calculated.",
      "Monitoring driver activity in real time helps you anticipate daily variability.",
    ],
  },
  {
    id: "cd-suspension-management",
    title: "Managing Suspensions Responsibly",
    role: "contract_director",
    category: "Compliance",
    bullets: [
      "Suspension should only be used when a driver violates platform policies or safety standards.",
      "All suspensions must be documented with a clear reason before they are applied.",
      "Drivers have the right to appeal any suspension through the platform's support system.",
      "Excessive or unjustified suspensions will trigger an abuse review on your account.",
      "Temporary suspensions are preferred over permanent removal unless the violation is severe.",
    ],
  },
  {
    id: "cd-driver-compliance",
    title: "Keeping Drivers Compliant",
    role: "contract_director",
    category: "Compliance",
    bullets: [
      "Verify that all drivers in your cell have up-to-date identity documents on file.",
      "Identity checks are performed at onboarding and must be renewed according to platform policy.",
      "Vehicles must meet the platform's minimum safety and cleanliness standards at all times.",
      "Professional conduct expectations include punctuality, respectful communication, and adherence to dress code if applicable.",
      "Non-compliant drivers may be automatically flagged or suspended by the platform.",
    ],
  },
  {
    id: "cd-authority-limits",
    title: "What Directors Can and Cannot Do",
    role: "contract_director",
    category: "Authority",
    bullets: [
      "You can suspend or activate drivers within your assigned cell.",
      "You cannot access financial data, earnings breakdowns, or payout details for any user.",
      "You cannot override decisions made by platform administrators or the automated system.",
      "All actions you take are logged and subject to audit at any time.",
      "You must follow all platform policies and cannot create exceptions for individual drivers.",
    ],
  },
  {
    id: "cd-abuse-prevention",
    title: "How to Avoid Abuse Flags",
    role: "contract_director",
    category: "Governance",
    bullets: [
      "The platform monitors suspension frequency, patterns, and justifications for signs of abuse.",
      "Treating all drivers fairly and consistently is a requirement, not a suggestion.",
      "Every action you take creates an audit trail that can be reviewed by administrators.",
      "Abuse flags can result in temporary restriction or permanent removal of director privileges.",
      "If you are unsure whether an action is appropriate, escalate to platform support first.",
    ],
  },
  {
    id: "ed-driver-oversight",
    title: "Driver Oversight",
    role: "employed_director",
    category: "Operations",
    bullets: [
      "Monitor driver activity levels and flag any unusual patterns to your supervisor.",
      "You have read-only access to driver data; you cannot modify driver profiles or status directly.",
      "Report concerns about driver behavior through the platform's official reporting channels.",
      "Regular check-ins with active drivers help maintain engagement and identify issues early.",
    ],
  },
  {
    id: "ed-reporting-issues",
    title: "Reporting Issues",
    role: "employed_director",
    category: "Communication",
    bullets: [
      "Use the platform's built-in support system to report all issues and incidents.",
      "Document incidents with as much detail as possible including dates, times, and involved parties.",
      "Escalate safety-related issues immediately rather than waiting for a scheduled review.",
      "Follow up on reported issues to ensure they are resolved within the expected timeframe.",
    ],
  },
  {
    id: "ed-performance",
    title: "Performance Expectations",
    role: "employed_director",
    category: "Standards",
    bullets: [
      "Employed directors are expected to be available during assigned working hours.",
      "Daily responsibilities include reviewing driver activity, responding to escalations, and updating reports.",
      "Communication with drivers and platform staff should be professional and timely.",
      "Performance is evaluated based on responsiveness, accuracy of reports, and adherence to protocols.",
    ],
  },
  {
    id: "ed-escalation-paths",
    title: "Escalation Paths",
    role: "employed_director",
    category: "Procedures",
    bullets: [
      "Handle routine driver inquiries and minor issues directly without escalation.",
      "Escalate safety incidents, fraud suspicions, and policy violations to platform administrators immediately.",
      "For technical platform issues, contact the support team through the designated channel.",
      "Emergency situations involving physical danger should be reported to local authorities first, then to the platform.",
    ],
  },
  {
    id: "dr-staying-active",
    title: "Staying Active",
    role: "driver",
    category: "Activity",
    bullets: [
      "Maintain consistent daily activity to remain eligible for ride assignments.",
      "Active status is determined by your availability and trip completion during operating hours.",
      "Prolonged inactivity may result in reduced ride offers or temporary deactivation.",
      "Set your availability status accurately to reflect when you are ready to accept rides.",
      "Regular activity helps build your reputation and increases your chances of receiving preferred assignments.",
    ],
  },
  {
    id: "dr-avoiding-suspension",
    title: "Avoiding Suspension",
    role: "driver",
    category: "Compliance",
    bullets: [
      "Common reasons for suspension include safety violations, repeated cancellations, and unprofessional behavior.",
      "Maintain a professional demeanor with all riders regardless of the circumstances.",
      "If you receive a warning, address the underlying issue promptly to prevent escalation.",
      "You have the right to appeal any suspension through the platform's support system.",
      "Review the platform's code of conduct regularly to stay informed of policy updates.",
    ],
  },
  {
    id: "dr-safety-protocols",
    title: "Lost Item & Safety Expectations",
    role: "driver",
    category: "Safety",
    bullets: [
      "Report any lost items found in your vehicle immediately through the platform's lost item system.",
      "Do not attempt to return items outside of the platform's official process.",
      "Passenger safety is your top priority during every trip.",
      "Familiarize yourself with the SOS button and emergency protocols before your first ride.",
      "Report any safety incidents or concerns to the platform as soon as it is safe to do so.",
    ],
  },
  {
    id: "dr-professional-conduct",
    title: "Professional Conduct",
    role: "driver",
    category: "Standards",
    bullets: [
      "Greet riders politely and confirm their destination before starting the trip.",
      "Keep your vehicle clean, well-maintained, and free of strong odors at all times.",
      "Arrive at pickup locations on time and communicate proactively if there are delays.",
      "Respect rider preferences regarding music, conversation, and temperature.",
      "Follow all local traffic laws and drive safely regardless of time pressure.",
    ],
  },
];
