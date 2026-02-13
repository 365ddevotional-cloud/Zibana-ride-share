import { Link, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  ShieldCheck,
  Smartphone,
  HeartHandshake,
  Wallet,
  CheckCircle2,
} from "lucide-react";

interface TrainingModule {
  title: string;
  category: string;
  icon: typeof BookOpen;
  accent: string;
  overview: string;
  sections: {
    heading: string;
    points: string[];
  }[];
}

const modules: Record<string, TrainingModule> = {
  "driver-onboarding": {
    title: "Driver Onboarding",
    category: "Onboarding",
    icon: BookOpen,
    accent: "text-blue-600 dark:text-blue-400",
    overview:
      "This module covers everything a new driver needs to know to get started on the ZIBANA platform. From initial registration to completing your first trip, this guide walks through the full onboarding journey.",
    sections: [
      {
        heading: "Account Registration",
        points: [
          "Download the ZIBANA app and create your driver account using your phone number",
          "Complete your personal information including full legal name, address, and date of birth",
          "Upload a clear, recent passport-style photograph for your driver profile",
          "Provide your bank account details for earnings payouts (Nigerian bank accounts supported)",
          "Agree to ZIBANA\u2019s Terms of Service and Driver Partner Agreement",
        ],
      },
      {
        heading: "Vehicle Registration",
        points: [
          "Enter your vehicle details: make, model, year, colour, and license plate number",
          "Upload clear photographs of your vehicle (front, back, interior, and both sides)",
          "Ensure your vehicle meets ZIBANA\u2019s minimum requirements (year, condition, air conditioning)",
          "Vehicle inspection may be required before activation in your market",
          "You can manage multiple vehicles from your account settings",
        ],
      },
      {
        heading: "Document Submission",
        points: [
          "Upload your valid driver\u2019s licence (must not expire within 30 days)",
          "Provide your vehicle registration certificate (proof of ownership or authorisation)",
          "Submit proof of valid vehicle insurance covering commercial ride services",
          "Upload a police clearance certificate or equivalent background check document",
          "Documents are reviewed within 24\u201348 hours; you\u2019ll receive a notification once approved",
        ],
      },
      {
        heading: "First Trip Walkthrough",
        points: [
          "Once approved, go online by tapping the status toggle on your dashboard",
          "Ride requests will appear as pop-ups showing pickup location, estimated fare, and distance",
          "Accept a request to begin navigation to the rider\u2019s pickup point",
          "Confirm rider identity using the 4-digit verification code shown in the app",
          "Complete the trip, and your earnings are automatically credited to your ZIBANA wallet",
        ],
      },
    ],
  },
  "safety-protocols": {
    title: "Safety Protocols",
    category: "Safety",
    icon: ShieldCheck,
    accent: "text-red-600 dark:text-red-400",
    overview:
      "Safety is ZIBANA\u2019s highest priority. This module covers emergency procedures, safety features built into the app, and best practices for protecting yourself and your riders during every trip.",
    sections: [
      {
        heading: "Emergency SOS System",
        points: [
          "The SOS button is always accessible on the active trip screen \u2014 tap and hold for 3 seconds to activate",
          "Activating SOS immediately alerts ZIBANA\u2019s safety team and shares your live GPS location",
          "Emergency contacts you\u2019ve registered will receive an automated SMS with your location",
          "Local emergency services can be contacted directly through the SOS panel",
          "All SOS events are logged and reviewed by the safety team within minutes",
        ],
      },
      {
        heading: "Incident Reporting",
        points: [
          "Report any safety concern during or after a trip using the in-app incident form",
          "Incidents are categorised by severity: Low, Medium, High, and Critical",
          "Attach photos, audio recordings, or written descriptions as supporting evidence",
          "Critical incidents trigger an automatic escalation to a safety supervisor",
          "You will receive updates on your report\u2019s status through in-app notifications",
        ],
      },
      {
        heading: "Rider Verification",
        points: [
          "Always confirm the rider\u2019s identity by asking for their 4-digit trip verification code",
          "Never start a trip until the code matches what\u2019s displayed in your app",
          "For SafeTeen rides, additional guardian verification is required before pickup",
          "Report any riders who refuse to provide verification or behave suspiciously",
          "ZIBANA uses facial recognition checks for high-value and late-night trips",
        ],
      },
      {
        heading: "Vehicle Safety Standards",
        points: [
          "Maintain your vehicle in safe operating condition at all times",
          "Ensure working seatbelts for all passengers \u2014 riders may report non-compliance",
          "Keep a basic first aid kit and fire extinguisher accessible in your vehicle",
          "Report any vehicle issues that may affect passenger safety through the app",
          "Periodic vehicle inspections may be required to maintain your active status",
        ],
      },
    ],
  },
  "app-navigation": {
    title: "App Navigation",
    category: "Technical",
    icon: Smartphone,
    accent: "text-purple-600 dark:text-purple-400",
    overview:
      "Learn how to navigate and use every feature of the ZIBANA driver app. This module covers the dashboard, ride management, earnings tracking, settings, and troubleshooting common issues.",
    sections: [
      {
        heading: "Driver Dashboard",
        points: [
          "Your dashboard shows real-time status: online/offline toggle, current earnings, and ride queue",
          "The heat map overlay highlights high-demand areas to help you position strategically",
          "Quick stats cards display today\u2019s trips, earnings, acceptance rate, and average rating",
          "Notifications appear as banners at the top \u2014 tap to view full details in your inbox",
          "The dashboard automatically refreshes every 30 seconds when you\u2019re online",
        ],
      },
      {
        heading: "Ride Management",
        points: [
          "Incoming ride requests show pickup address, estimated fare, distance, and ride class",
          "You have 15 seconds to accept or decline each request before it moves to the next driver",
          "Once accepted, tap \u2018Navigate\u2019 to open turn-by-turn directions to the pickup point",
          "Use the in-trip panel to contact the rider, report issues, or cancel if necessary",
          "After drop-off, rate the rider and add optional feedback before accepting new rides",
        ],
      },
      {
        heading: "Earnings & Wallet",
        points: [
          "The Earnings tab shows a breakdown: base fare, per-km rate, per-minute rate, tips, and bonuses",
          "Weekly earnings summaries are generated every Monday and available for download",
          "Your wallet balance updates in real time as trips are completed",
          "Request instant cashouts or set up automatic weekly payouts to your bank account",
          "View detailed transaction history with filters for date range, type, and status",
        ],
      },
      {
        heading: "Settings & Preferences",
        points: [
          "Set your ride preferences: maximum trip distance, cash acceptance, and preferred areas",
          "Configure notification preferences for ride requests, earnings, and promotional alerts",
          "Update your personal information, vehicle details, and documents from the Account section",
          "Switch between light and dark mode, and choose your preferred language (12 supported)",
          "Access the Help Centre directly from settings for FAQs and live support",
        ],
      },
    ],
  },
  "customer-service": {
    title: "Customer Service",
    category: "Service",
    icon: HeartHandshake,
    accent: "text-green-600 dark:text-green-400",
    overview:
      "Exceptional customer service is what sets great drivers apart. This module covers communication best practices, handling difficult situations, and strategies for earning consistently high ratings.",
    sections: [
      {
        heading: "Communication Etiquette",
        points: [
          "Greet every rider with a warm, professional welcome when they enter your vehicle",
          "Confirm the destination displayed in the app and ask if the rider has a preferred route",
          "Keep conversation friendly but respect riders who prefer a quiet trip",
          "Use the in-app messaging feature for pre-arrival communication instead of personal calls",
          "Thank the rider at the end of every trip \u2014 a positive farewell encourages high ratings",
        ],
      },
      {
        heading: "Handling Complaints",
        points: [
          "Stay calm and professional when a rider raises a concern during or after a trip",
          "Acknowledge the issue without being defensive \u2014 listen first, then explain",
          "If you cannot resolve a situation, suggest the rider contact ZIBANA support through the app",
          "Never argue with a rider over fares \u2014 fare disputes are handled by the platform",
          "Document any issues using the post-trip reporting feature for your own protection",
        ],
      },
      {
        heading: "Earning High Ratings",
        points: [
          "Maintain a clean, comfortable vehicle interior with working air conditioning",
          "Arrive at the pickup location promptly and notify the rider through the app",
          "Follow the recommended navigation route unless the rider requests an alternative",
          "Offer to help with luggage and ensure the rider is comfortable before starting the trip",
          "Consistent 4.8+ ratings unlock priority ride matching and bonus incentives",
        ],
      },
      {
        heading: "Accessibility & Inclusivity",
        points: [
          "Be prepared to assist riders with mobility challenges \u2014 offer help entering and exiting",
          "PetRide and SafeTeen require additional care \u2014 review the specific guidelines for each",
          "Respect cultural and religious practices of all riders without judgement",
          "Ensure your vehicle is accessible and accommodating for diverse rider needs",
          "Report any discrimination or harassment incidents immediately through the safety channel",
        ],
      },
    ],
  },
  "earnings-payouts": {
    title: "Earnings & Payouts",
    category: "Finance",
    icon: Wallet,
    accent: "text-amber-600 dark:text-amber-400",
    overview:
      "Understand how you earn money on ZIBANA, how fares are calculated, and how to manage your payouts. This module covers the complete financial lifecycle from fare to bank account.",
    sections: [
      {
        heading: "Fare Breakdown",
        points: [
          "Every fare consists of: base fare + (per-km rate \u00D7 distance) + (per-minute rate \u00D7 duration)",
          "Ride class determines the rates \u2014 higher classes like Elite and Comfort have premium pricing",
          "Surge pricing may apply during peak hours, increasing the fare multiplier up to 2.5x",
          "A minimum fare applies to every ride class to ensure short trips remain worthwhile",
          "Platform commission (currently set by admin) is deducted before earnings reach your wallet",
        ],
      },
      {
        heading: "Payout Schedule",
        points: [
          "Automatic payouts are processed weekly on Mondays to your registered bank account",
          "Instant cashouts are available at any time for a small processing fee",
          "Bank transfers typically arrive within 1\u20132 business days depending on your bank",
          "Supported banks include GTBank, Access Bank, First Bank, Zenith Bank, and all major Nigerian banks",
          "Failed payouts are automatically retried \u2014 check your bank details if issues persist",
        ],
      },
      {
        heading: "Wallet Management",
        points: [
          "Your ZIBANA wallet holds your trip earnings, bonuses, and incentive payouts",
          "Wallet balance is updated in real time after each completed trip",
          "You can view a complete transaction history with filters for date, type, and amount",
          "Third-party funding from family or employers can be credited to your wallet",
          "Flagged transactions are reviewed by the finance team and you\u2019ll be notified of any holds",
        ],
      },
      {
        heading: "Tax Statements",
        points: [
          "Annual and quarterly tax statements are generated automatically in your account",
          "Statements are available in PDF and CSV formats for your records",
          "Earnings, deductions, and platform fees are itemised for tax filing purposes",
          "Download statements from the Earnings section under \u2018Tax Documents\u2019",
          "Consult a tax professional for guidance on reporting ride-hailing income in your jurisdiction",
        ],
      },
    ],
  },
};

export default function UsersTrainingDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const mod = modules[slug];

  if (!mod) {
    return (
      <div className="space-y-6 admin-fade-in">
        <Link href="/admin/users/training-center">
          <Button variant="ghost" size="sm" data-testid="button-back-training">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Training Center
          </Button>
        </Link>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Card className="rounded-xl border border-slate-200 dark:border-slate-700 max-w-md w-full">
            <CardContent className="flex flex-col items-center py-12 px-6 space-y-4">
              <BookOpen className="h-10 w-10 text-slate-400" />
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100" data-testid="text-module-not-found">
                Module Not Found
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                The training module you requested does not exist.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const Icon = mod.icon;

  return (
    <div className="space-y-6 admin-fade-in">
      <Link href="/admin/users/training-center">
        <Button variant="ghost" size="sm" data-testid="button-back-training">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Training Center
        </Button>
      </Link>

      <div className="border-b border-slate-200 dark:border-slate-700 pb-5">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <Icon className={`h-6 w-6 ${mod.accent}`} />
          <h1
            className="text-[28px] font-bold tracking-tight text-slate-800 dark:text-slate-100"
            data-testid="text-module-title"
          >
            {mod.title}
          </h1>
          <Badge variant="secondary" data-testid="badge-module-category">{mod.category}</Badge>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" data-testid="text-module-overview">
          {mod.overview}
        </p>
      </div>

      <div className="space-y-6">
        {mod.sections.map((sec, idx) => (
          <Card
            key={idx}
            className="rounded-xl border border-slate-200 dark:border-slate-700"
            data-testid={`card-section-${idx}`}
          >
            <CardContent className="pt-5 pb-5 px-5 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100" data-testid={`text-heading-${idx}`}>
                {sec.heading}
              </h2>
              <ul className="space-y-3">
                {sec.points.map((point, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-3" data-testid={`point-${idx}-${pIdx}`}>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
